import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Html5Qrcode } from 'html5-qrcode';
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
  RefreshCw 
} from 'lucide-react';

interface AdminScanProps {
  bookings: Booking[];
}

export default function AdminScan({ bookings }: AdminScanProps) {
  const { currentUser } = useAuth();
  const [isScanning, setIsScanning] = useState<boolean>(false);
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

  // Initialize camera scanner
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {}).finally(() => {
          scannerRef.current?.clear();
        });
      }
    };
  }, []);

  const startScanner = async () => {
    try {
      setScannedResult(null);
      setCheckInSuccess(null);
      const scanner = new Html5Qrcode('qr-reader-container');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleScannedText(decodedText);
          stopScanner();
        },
        (errorMessage) => {
          // ignore scan frame errors
        }
      );

      setIsScanning(true);
    } catch (err) {
      console.error("Camera start failed:", err);
      alert("Unable to access camera for scanning. Please check camera permissions.");
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        // already stopped
      }
      setIsScanning(false);
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

  // Manual ticket ID lookup fallback
  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    const queryCode = manualCode.trim().toUpperCase();
    const found = bookings.find(
      (b) => b.ticketId?.toUpperCase() === queryCode || b.participantEmail?.toLowerCase() === queryCode.toLowerCase()
    );

    if (found) {
      if (found.checkedIn) {
        setScannedResult({
          booking: found,
          isDuplicate: true,
        });
      } else {
        setScannedResult({
          booking: found,
        });
      }
    } else {
      setScannedResult({
        error: `No booking found for ticket/email identifier "${queryCode}".`,
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
      <div className="bg-[#FAF7F2] border border-[#CFC6B6] rounded-xl p-6 shadow-sm space-y-6">
        <div className="border-b border-[#E8E0D2] pb-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[#6F6A61] block">
              Range Reception & Gate Control
            </span>
            <h2 className="text-2xl font-serif font-bold text-[#171717]">QR Pass Scanner & Attendance</h2>
          </div>
          <div className="text-xs font-mono text-[#315D4C] flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> Live Verification
          </div>
        </div>

        {/* Camera Scanner Viewport */}
        <div className="space-y-4 text-center">
          <div
            id="qr-reader-container"
            className="w-full max-w-sm mx-auto overflow-hidden rounded-lg bg-black border-2 border-[#171717] aspect-square flex items-center justify-center relative"
          >
            {!isScanning && (
              <div className="p-6 text-[#F3EEE3] space-y-3">
                <Camera className="w-12 h-12 mx-auto text-[#E79A19]" />
                <p className="text-xs font-mono">Camera scanner idle</p>
                <button
                  onClick={startScanner}
                  className="px-4 py-2 bg-[#E79A19] text-[#171717] font-semibold text-xs rounded hover:bg-[#D48911]"
                >
                  Start Camera Scan
                </button>
              </div>
            )}
          </div>

          {isScanning && (
            <button
              onClick={stopScanner}
              className="px-4 py-2 bg-[#9B2C2C] text-white text-xs font-medium rounded flex items-center gap-1.5 mx-auto"
            >
              <CameraOff className="w-4 h-4" />
              <span>Stop Scanner</span>
            </button>
          )}
        </div>

        {/* Fallback Manual Entry */}
        <div className="border-t border-[#E8E0D2] pt-4">
          <form onSubmit={handleManualSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Or enter Ticket ID (e.g. TKT-7F2A9C) or participant email..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1 p-2.5 bg-white border border-[#CFC6B6] rounded-lg text-xs font-mono text-[#171717] focus:outline-none focus:border-[#171717]"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-[#171717] text-[#F3EEE3] hover:bg-[#333333] text-xs font-medium rounded-lg shrink-0 flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Lookup</span>
            </button>
          </form>
        </div>

        {/* Success Alert */}
        {checkInSuccess && (
          <div className="p-4 rounded-lg bg-[#315D4C]/15 border border-[#315D4C] text-[#315D4C] text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="font-semibold text-sm">{checkInSuccess}</span>
          </div>
        )}

        {/* Scan Result Cards */}
        {scannedResult && (
          <div className="animate-fade-in border-t border-[#E8E0D2] pt-4">
            {scannedResult.error ? (
              <div className="p-5 rounded-lg bg-red-50 border border-red-200 text-[#9B2C2C] space-y-2">
                <div className="flex items-center gap-2 font-bold font-serif text-lg">
                  <XCircle className="w-5 h-5" />
                  <span>INVALID PASS</span>
                </div>
                <p className="text-xs font-mono">{scannedResult.error}</p>
              </div>
            ) : scannedResult.isDuplicate ? (
              <div className="p-5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 space-y-3">
                <div className="flex items-center gap-2 font-bold font-serif text-lg text-amber-800">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span>ALREADY ATTENDED (DUPLICATE SCAN)</span>
                </div>
                <div className="text-xs font-mono space-y-1">
                  <p><strong>Shooter:</strong> {scannedResult.booking?.participantName}</p>
                  <p><strong>Ticket ID:</strong> {scannedResult.booking?.ticketId}</p>
                  <p><strong>Vertical:</strong> {scannedResult.booking?.vertical}</p>
                  <p><strong>Checked-in By:</strong> {scannedResult.booking?.checkedInBy || 'Officer'}</p>
                </div>
              </div>
            ) : scannedResult.booking ? (
              <div className="p-6 rounded-lg bg-white border-2 border-[#315D4C] space-y-4 shadow-md">
                <div className="flex items-center justify-between border-b border-[#E8E0D2] pb-3">
                  <div className="flex items-center gap-2 text-[#315D4C] font-serif font-bold text-lg">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Pass Verified Valid</span>
                  </div>
                  <span className="text-xs font-mono bg-[#E8E0D2] px-2 py-0.5 rounded text-[#171717] font-semibold">
                    {scannedResult.booking.vertical}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-[#6F6A61] block">Shooter Name:</span>
                    <strong className="text-[#171717] text-sm">{scannedResult.booking.participantName}</strong>
                  </div>
                  <div>
                    <span className="text-[#6F6A61] block">Ticket ID:</span>
                    <strong className="text-[#171717] text-sm">{scannedResult.booking.ticketId}</strong>
                  </div>
                  <div>
                    <span className="text-[#6F6A61] block">Slot Time:</span>
                    <span className="text-[#171717]">{scannedResult.booking.slotTimeLabel}</span>
                  </div>
                  <div>
                    <span className="text-[#6F6A61] block">Slot Date:</span>
                    <span className="text-[#171717]">{scannedResult.booking.slotDateLabel}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E8E0D2]">
                  <button
                    onClick={handleConfirmAttendance}
                    disabled={processingCheckIn}
                    className="w-full py-3 bg-[#315D4C] hover:bg-[#26483b] text-white font-bold text-xs rounded-lg shadow flex items-center justify-center gap-2 transition-colors"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>{processingCheckIn ? 'Recording in Ledger...' : 'MARK ATTENDED / ADMIT SHOOTER'}</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
