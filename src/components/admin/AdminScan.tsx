import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Html5Qrcode, type CameraDevice } from 'html5-qrcode';
import { parseQrPayload } from '../../lib/bookingPayload';
import { getDocRef, runTransaction, serverTimestamp } from '../../lib/firebase';
import type { Booking, LakshyaQrPayload } from '../../types/lakshya';
import { 
  ScanLine, 
  Camera, 
  CameraOff, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  UserCheck, 
  Ticket, 
  Search, 
  RefreshCw,
  UploadCloud,
  FileText
} from 'lucide-react';

interface AdminScanProps {
  bookings: Booking[];
}

export default function AdminScan({ bookings }: AdminScanProps) {
  const { currentUser } = useAuth();
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [scannerStatus, setScannerStatus] = useState<string>('IDLE');
  const [manualCode, setManualCode] = useState<string>('');
  const [scannedResult, setScannedResult] = useState<{
    booking?: Booking;
    payload?: LakshyaQrPayload;
    error?: string;
    isDuplicate?: boolean;
  } | null>(null);
  const [processingCheckIn, setProcessingCheckIn] = useState<boolean>(false);
  const [checkInSuccess, setCheckInSuccess] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Discover available cameras on mount
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera if available, otherwise first camera
          const backCam = devices.find((d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        }
      })
      .catch((err) => {
        console.warn("Could not enumerate cameras upfront:", err);
      });

    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      setScannedResult(null);
      setCheckInSuccess(null);
      setScannerStatus('INITIALIZING CAMERA...');

      // Clean up previous instance if any
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch (_) {}
        scannerRef.current.clear();
        scannerRef.current = null;
      }

      const html5QrCode = new Html5Qrcode('qr-reader-target');
      scannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      const onSuccess = (decodedText: string) => {
        handleScannedText(decodedText);
        stopScanner();
      };

      const onError = (_errorMessage: string) => {
        // frame decode ignore
      };

      // Try camera by deviceId first if chosen, otherwise fallback to generic facingMode
      if (selectedCameraId) {
        await html5QrCode.start(selectedCameraId, config, onSuccess, onError);
      } else {
        try {
          await html5QrCode.start({ facingMode: 'environment' }, config, onSuccess, onError);
        } catch (envErr) {
          console.warn("Environment camera failed, falling back to user facing camera...", envErr);
          await html5QrCode.start({ facingMode: 'user' }, config, onSuccess, onError);
        }
      }

      setIsScanning(true);
      setScannerStatus('LIVE SCANNING ACTIVE');
    } catch (err: any) {
      console.error("Camera start failed:", err);
      setScannerStatus('CAMERA INITIALIZATION ERROR');
      alert(`Camera Access Error: ${err.message || 'Please verify browser camera permissions and refresh.'}`);
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        // already stopped
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
    setScannerStatus('IDLE');
  };

  // Image file upload QR scanner fallback
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setScannerStatus('PROCESSING PASS IMAGE...');
      const tempScanner = new Html5Qrcode('qr-file-dummy');
      const decodedText = await tempScanner.scanFile(file, true);
      tempScanner.clear();
      handleScannedText(decodedText);
      setScannerStatus('IDLE');
    } catch (err: any) {
      console.error("File QR scan failed:", err);
      setScannedResult({
        error: "Could not detect a valid QR code in the uploaded image file. Please upload a clear photo or screenshot.",
      });
      setScannerStatus('IDLE');
    }
  };

  const handleScannedText = async (rawString: string) => {
    setScannedResult(null);
    setCheckInSuccess(null);

    let payload: LakshyaQrPayload;
    try {
      payload = parseQrPayload(rawString);
    } catch (err) {
      setScannedResult({
        error: "Invalid QR format. This is not an official Lakshya 2.0 digital pass.",
      });
      return;
    }

    // Lookup booking in Firestore
    try {
      const bookingRef = getDocRef('bookings', payload.bookingId);
      const snapshot = await runTransaction(bookingRef.firestore, async (tx) => {
        return await tx.get(bookingRef);
      });

      if (!snapshot.exists()) {
        setScannedResult({
          payload,
          error: "Pass record does not exist in the official ledger.",
        });
        return;
      }

      const bookingData = snapshot.data() as Booking;

      // Verify token integrity
      if (bookingData.qrToken !== payload.qrToken || bookingData.ticketId !== payload.ticketId) {
        setScannedResult({
          payload,
          error: "SECURITY VERIFICATION FAILED. Token mismatch with database record.",
        });
        return;
      }

      // Check if already checked in
      if (bookingData.checkedIn) {
        setScannedResult({
          booking: bookingData,
          payload,
          isDuplicate: true,
        });

        // Audit duplicate attempt
        const auditRef = getDocRef('audit_logs', `audit_dup_${Date.now()}`);
        runTransaction(bookingRef.firestore, async (tx) => {
          tx.set(auditRef, {
            id: auditRef.id,
            action: 'CHECK_IN_DUPLICATE_ATTEMPT',
            entityType: 'booking',
            entityId: bookingData.id,
            actorEmail: currentUser?.email || 'officer',
            vertical: bookingData.vertical,
            metadata: {
              ticketId: bookingData.ticketId,
              originalCheckInAt: bookingData.checkedInAt,
              originalCheckedInBy: bookingData.checkedInBy,
            },
            createdAt: serverTimestamp(),
          });
        }).catch(console.error);

        return;
      }

      // Valid and pending check-in
      setScannedResult({
        booking: bookingData,
        payload,
      });

    } catch (err: any) {
      console.error("Error validating pass:", err);
      setScannedResult({
        error: err.message || "Failed to query database for pass verification.",
      });
    }
  };

  // Manual search by Ticket ID / Email / Name
  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    const queryCode = manualCode.trim().toUpperCase();
    const found = bookings.find(
      (b) => b.ticketId?.toUpperCase() === queryCode || 
             b.participantEmail?.toLowerCase() === queryCode.toLowerCase() ||
             b.participantName?.toLowerCase().includes(queryCode.toLowerCase())
    );

    if (found) {
      setScannedResult({
        booking: found,
        isDuplicate: found.checkedIn,
      });
    } else {
      setScannedResult({
        error: `No booking record found matching "${queryCode}". Check spelling or verify allowlist.`,
      });
    }
  };

  // Confirm Check-in
  const handleConfirmAttendance = async () => {
    if (!scannedResult?.booking) return;

    const booking = scannedResult.booking;
    setProcessingCheckIn(true);

    const bookingRef = getDocRef('bookings', booking.id);
    const auditRef = getDocRef('audit_logs', `audit_checkin_${Date.now()}`);

    try {
      await runTransaction(bookingRef.firestore, async (tx) => {
        const snap = await tx.get(bookingRef);
        if (!snap.exists()) throw new Error("Booking not found.");
        const current = snap.data() as Booking;

        if (current.checkedIn) {
          throw new Error("Shooter was already checked in!");
        }

        const now = serverTimestamp();
        tx.update(bookingRef, {
          checkedIn: true,
          checkedInAt: now,
          checkedInBy: currentUser?.email || 'range_officer',
          updatedAt: now,
        });

        tx.set(auditRef, {
          id: auditRef.id,
          action: 'CHECK_IN',
          entityType: 'booking',
          entityId: booking.id,
          actorEmail: currentUser?.email || 'range_officer',
          vertical: booking.vertical,
          metadata: {
            ticketId: booking.ticketId,
            participantName: booking.participantName,
          },
          createdAt: now,
        });
      });

      setCheckInSuccess(`Check-in verified for ${booking.participantName} (${booking.vertical})!`);
      setScannedResult(null);
    } catch (err: any) {
      console.error("Check-in failed:", err);
      alert(err.message || "Failed to record attendance.");
    } finally {
      setProcessingCheckIn(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-[#12131A] border border-[#282B3A] p-6 shadow-sm space-y-6">
        <div className="border-b border-[#282B3A] pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-[#DC2626] block">
              RANGE RECEPTION & GATE CONTROL
            </span>
            <h2 className="font-headline-sm text-2xl font-serif text-[#F8FAFC] uppercase">
              QR Pass Scanner & Attendance
            </h2>
          </div>
          <div className="font-mono text-xs text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Live Range Ledger
          </div>
        </div>

        {/* Camera Selector and Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0B0C10] p-3 border border-[#282B3A]">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase text-[#64748B]">Active Sensor:</span>
            {cameras.length > 0 ? (
              <select
                disabled={isScanning}
                value={selectedCameraId}
                onChange={(e) => setSelectedCameraId(e.target.value)}
                className="bg-[#12131A] border border-[#282B3A] text-xs font-mono text-[#F8FAFC] px-2.5 py-1 rounded focus:outline-none"
              >
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label || `Camera ${c.id.substring(0, 5)}...`}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-mono text-xs text-[#64748B]">Auto-detecting...</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-[#1A1C26] hover:bg-[#282B3A] border border-[#282B3A] text-[#F8FAFC] font-mono text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors"
              title="Upload QR code image"
            >
              <UploadCloud className="w-3.5 h-3.5 text-[#DC2626]" />
              <span>Upload Pass Image</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </div>

        {/* Camera Scanner Viewport */}
        <div className="space-y-4 text-center">
          <div className="relative w-full max-w-sm mx-auto overflow-hidden bg-black border-2 border-[#282B3A] aspect-square flex items-center justify-center">
            {/* Pure isolated target container for Html5Qrcode (NO React child elements inside this DOM node) */}
            <div id="qr-reader-target" className="w-full h-full"></div>

            {/* Overlay placeholder displayed only when NOT scanning */}
            {!isScanning && (
              <div className="absolute inset-0 bg-[#0B0C10] flex flex-col items-center justify-center p-6 text-center space-y-3 pointer-events-auto">
                <Camera className="w-12 h-12 mx-auto text-[#DC2626] opacity-80" />
                <p className="font-mono text-xs text-[#64748B]">{scannerStatus}</p>
                <button
                  onClick={startScanner}
                  className="px-6 py-2.5 bg-[#DC2626] hover:bg-[#E51A1A] text-[#F8FAFC] font-mono text-xs uppercase tracking-widest font-bold shadow-lg transition-all"
                >
                  [ Start Camera Scan ]
                </button>
              </div>
            )}
          </div>

          {/* Stop scanner button */}
          {isScanning && (
            <button
              onClick={stopScanner}
              className="px-4 py-2 bg-red-950 border border-red-800 text-red-300 hover:text-white font-mono text-xs uppercase tracking-wider flex items-center gap-1.5 mx-auto transition-colors"
            >
              <CameraOff className="w-4 h-4" />
              <span>Stop Scanner</span>
            </button>
          )}
        </div>

        {/* Fallback Manual Search by Ticket ID / Email */}
        <div className="border-t border-[#282B3A] pt-5">
          <span className="font-mono text-[10px] uppercase text-[#64748B] block mb-2">
            Instant Manual Lookup (Ticket ID / Email / Competitor Name)
          </span>
          <form onSubmit={handleManualSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. TKT-B4E9 or 1RV22CS001 or rahul@rvce.edu.in..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1 p-2.5 bg-[#0B0C10] border border-[#282B3A] font-mono text-xs text-[#F8FAFC] focus:outline-none focus:border-[#DC2626]"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#DC2626] hover:bg-[#E51A1A] text-[#F8FAFC] font-mono text-xs uppercase tracking-wider font-bold shrink-0 flex items-center gap-1.5 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Lookup</span>
            </button>
          </form>
        </div>

        {/* Success Alert */}
        {checkInSuccess && (
          <div className="p-4 bg-emerald-950/40 border border-emerald-800 text-emerald-300 font-mono text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            <span className="font-bold text-sm">{checkInSuccess}</span>
          </div>
        )}

        {/* Scan Result Cards */}
        {scannedResult && (
          <div className="animate-fade-in border-t border-[#282B3A] pt-4">
            {scannedResult.error ? (
              <div className="p-5 bg-red-950/40 border border-red-800 text-red-200 space-y-2">
                <div className="flex items-center gap-2 font-bold font-mono text-base text-red-400">
                  <XCircle className="w-5 h-5" />
                  <span>INVALID OR UNVERIFIED PASS</span>
                </div>
                <p className="font-mono text-xs">{scannedResult.error}</p>
              </div>
            ) : scannedResult.isDuplicate ? (
              <div className="p-5 bg-amber-950/40 border border-amber-800 text-amber-200 space-y-3">
                <div className="flex items-center gap-2 font-bold font-mono text-base text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                  <span>PASS ALREADY CHECKED IN (DUPLICATE)</span>
                </div>
                <p className="font-mono text-xs">
                  This digital pass was already validated for range entry.
                </p>
                {scannedResult.booking && (
                  <div className="bg-[#0B0C10] p-3 border border-[#282B3A] font-mono text-xs space-y-1">
                    <div>Competitor: <strong className="text-[#F8FAFC]">{scannedResult.booking.participantName}</strong></div>
                    <div>Vertical: <span className="text-[#DC2626] font-bold">{scannedResult.booking.vertical}</span></div>
                    <div>Checked in at: <span className="text-[#64748B]">{scannedResult.booking.checkedInAt ? new Date(scannedResult.booking.checkedInAt.seconds * 1000).toLocaleString() : 'Previously'}</span></div>
                  </div>
                )}
              </div>
            ) : scannedResult.booking ? (
              <div className="p-5 bg-emerald-950/30 border border-emerald-600/70 text-emerald-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold font-mono text-base text-emerald-400">
                    <UserCheck className="w-5 h-5" />
                    <span>AUTHENTICATED PASS IDENTIFIED</span>
                  </div>
                  <span className="font-mono text-xs bg-[#DC2626] text-white px-2.5 py-0.5 font-bold uppercase">
                    {scannedResult.booking.vertical}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#0B0C10] p-3 border border-[#282B3A] font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-[#64748B] uppercase block">Competitor</span>
                    <strong className="text-[#F8FAFC] text-sm">{scannedResult.booking.participantName}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#64748B] uppercase block">Ticket ID</span>
                    <strong className="text-[#F8FAFC]">{scannedResult.booking.ticketId}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#64748B] uppercase block">Date & Relay</span>
                    <span className="text-[#F8FAFC]">{scannedResult.booking.slotDateLabel} ({scannedResult.booking.slotTimeLabel})</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#64748B] uppercase block">Division</span>
                    <span className="text-[#DC2626] font-bold">{scannedResult.booking.participantGender || scannedResult.booking.gender || 'Standard'}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setScannedResult(null)}
                    className="px-4 py-2 border border-[#282B3A] hover:bg-[#1A1C26] font-mono text-xs text-[#64748B] uppercase tracking-wider"
                  >
                    Dismiss
                  </button>
                  <button
                    disabled={processingCheckIn}
                    onClick={handleConfirmAttendance}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs uppercase tracking-widest font-bold shadow-lg flex items-center gap-2 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{processingCheckIn ? 'VERIFYING...' : '[ ADMIT SHOOTER TO RANGE ]'}</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Hidden container for image file scanning */}
      <div id="qr-file-dummy" className="hidden"></div>
    </div>
  );
}
