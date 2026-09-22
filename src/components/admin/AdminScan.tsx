import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import jsQR from 'jsqr';
import { parseQrPayload } from '../../lib/bookingPayload';
import { 
  getDocRef, 
  getColRef, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  setDoc, 
  runTransaction, 
  serverTimestamp 
} from '../../lib/firebase';
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
  UploadCloud,
  FileText,
  Loader2,
  RefreshCw,
  Zap,
  Check
} from 'lucide-react';

export type ScannerStatus = 
  | 'IDLE'
  | 'Initializing camera...'
  | 'Camera permission required'
  | 'Camera unavailable'
  | 'Scanning...'
  | 'QR detected'
  | 'QR invalid'
  | 'Participant not found'
  | 'Already checked in'
  | 'Check-in successful';

interface AdminScanProps {
  bookings: Booking[];
}

export default function AdminScan({ bookings }: AdminScanProps) {
  const { currentUser } = useAuth();
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>('IDLE');
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [manualCode, setManualCode] = useState<string>('');
  const [scannedResult, setScannedResult] = useState<{
    booking?: Booking;
    payload?: LakshyaQrPayload;
    error?: string;
    isDuplicate?: boolean;
  } | null>(null);
  const [processingCheckIn, setProcessingCheckIn] = useState<boolean>(false);
  const [checkInSuccess, setCheckInSuccess] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Discover available cameras
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices()
        .then((devices) => {
          const videoInputs = devices.filter((d) => d.kind === 'videoinput');
          setCameras(videoInputs);
          if (videoInputs.length > 0) {
            const backCam = videoInputs.find(
              (d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment')
            );
            setSelectedCameraId(backCam ? backCam.deviceId : videoInputs[0].deviceId);
          }
        })
        .catch((err) => {
          console.warn('Could not enumerate media devices:', err);
        });
    }

    return () => {
      stopScanner();
    };
  }, []);

  // Multi-pass QR decoder helper
  const decodeImageData = (imageData: ImageData): string | null => {
    // Pass 1: Standard unaltered
    let code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });
    if (code && code.data) return code.data;

    // Pass 2: High contrast thresholding (helps with glares / phone screen reflections)
    const data = new Uint8ClampedArray(imageData.data);
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const val = avg > 128 ? 255 : 0;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
    code = jsQR(data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });
    if (code && code.data) return code.data;

    return null;
  };

  // Method A: Start Real-time live camera stream scan
  const startScanner = async () => {
    try {
      setScannedResult(null);
      setCheckInSuccess(null);
      setScannerStatus('Initializing camera...');

      stopScanner();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setScannerStatus('Camera unavailable');
        alert('Camera access is not supported on this browser or environment.');
        return;
      }

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: selectedCameraId
          ? { deviceId: { exact: selectedCameraId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err: any) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setScannerStatus('Camera permission required');
          alert('Camera permission denied. Please enable camera access in your browser settings.');
          return;
        }
        // Fallback to basic video constraint
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } catch (fallbackErr) {
          setScannerStatus('Camera unavailable');
          alert('Unable to access camera: ' + (err.message || err));
          return;
        }
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      setIsScanning(true);
      setScannerStatus('Scanning...');

      // Update camera enumeration now that permission is granted
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        if (videoInputs.length > 0) setCameras(videoInputs);
      }).catch(() => {});

      // Start processing frames
      scanFrameLoop();
    } catch (err: any) {
      console.error('Camera initialization error:', err);
      setScannerStatus('Camera unavailable');
      setIsScanning(false);
    }
  };

  // Real-time animation loop for Method A
  const scanFrameLoop = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const decoded = decodeImageData(imageData);

        if (decoded) {
          try {
            if (navigator.vibrate) navigator.vibrate(100);
          } catch (_) {}

          setScannerStatus('QR detected');
          handleScannedText(decoded);
          stopScanner();
          return;
        }
      }
    }

    animationFrameId.current = requestAnimationFrame(scanFrameLoop);
  };

  // Stop camera stream
  const stopScanner = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    if (scannerStatus === 'Scanning...' || scannerStatus === 'Initializing camera...') {
      setScannerStatus('IDLE');
    }
  };

  // Method B: "Capture QR" snapshot from active stream or direct file
  const handleCaptureFrame = () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) {
      // If camera isn't currently streaming, open native photo capture / file picker
      fileInputRef.current?.click();
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const decoded = decodeImageData(imageData);

    if (decoded) {
      try {
        if (navigator.vibrate) navigator.vibrate(100);
      } catch (_) {}
      setScannerStatus('QR detected');
      handleScannedText(decoded);
      stopScanner();
    } else {
      setScannerStatus('QR invalid');
      alert('No valid QR code detected in the captured snapshot. Please position the code squarely in view.');
    }
  };

  // Handle uploaded/captured photo file
  const handleFileCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScannerStatus('Scanning...');
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current || document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          setScannerStatus('QR invalid');
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const decoded = decodeImageData(imageData);

        if (decoded) {
          try {
            if (navigator.vibrate) navigator.vibrate(100);
          } catch (_) {}
          setScannerStatus('QR detected');
          handleScannedText(decoded);
        } else {
          setScannerStatus('QR invalid');
          setScannedResult({
            error: 'Could not detect a valid QR code in the captured image. Ensure the entire QR matrix is sharply focused.'
          });
        }
      };
      img.onerror = () => {
        setScannerStatus('QR invalid');
        setScannedResult({ error: 'Failed to read image file.' });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Process decoded QR payload string
  const handleScannedText = async (rawString: string) => {
    setScannedResult(null);
    setCheckInSuccess(null);

    const clean = (rawString || '').trim();
    if (!clean) {
      setScannerStatus('QR invalid');
      return;
    }

    let payload: LakshyaQrPayload | null = null;
    try {
      payload = parseQrPayload(clean);
    } catch {
      payload = null;
    }

    let bookingData: Booking | null = null;

    if (payload?.bookingId) {
      try {
        const bookingRef = getDocRef('bookings', payload.bookingId);
        const snap = await getDoc(bookingRef);
        if (snap.exists()) {
          bookingData = snap.data() as Booking;
        }
      } catch (e) {
        console.warn('Direct bookingId lookup failed:', e);
      }
    }

    // Fallback: match from bookings prop or query Firestore by ticketId or bookingId
    if (!bookingData) {
      const searchTarget = (payload?.ticketId || clean).toUpperCase();
      const foundInProps = bookings.find(
        (b) => b.ticketId?.toUpperCase() === searchTarget ||
               b.id?.toUpperCase() === searchTarget ||
               b.participantEmail?.toLowerCase() === clean.toLowerCase()
      );
      if (foundInProps) {
        bookingData = foundInProps;
      } else {
        try {
          const qTicket = query(getColRef('bookings'), where('ticketId', '==', searchTarget));
          const snap = await getDocs(qTicket);
          if (!snap.empty) {
            bookingData = snap.docs[0].data() as Booking;
          }
        } catch (e) {
          console.warn('Ticket query failed:', e);
        }
      }
    }

    if (!bookingData) {
      setScannerStatus('Participant not found');
      setScannedResult({
        payload: payload || undefined,
        error: `Pass record not found in official ledger (code: "${clean.length > 30 ? clean.substring(0, 30) + '...' : clean}"). Check registration status or search manually below.`,
      });
      return;
    }

    // Check if already checked in
    if (bookingData.checkedIn) {
      setScannerStatus('Already checked in');
      setScannedResult({
        booking: bookingData,
        payload: payload || undefined,
        isDuplicate: true,
      });

      // Audit duplicate attempt
      const auditRef = getDocRef('audit_logs', `audit_dup_${Date.now()}`);
      setDoc(auditRef, {
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
      }).catch(console.error);

      return;
    }

    // Valid booking ready for check-in
    setScannedResult({
      booking: bookingData,
      payload: payload || undefined,
    });
  };

  // Manual search by Ticket ID / Email / Name
  const handleManualSearch = async (e: React.FormEvent) => {
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
      if (found.checkedIn) setScannerStatus('Already checked in');
      return;
    }

    // Direct Firestore lookup
    try {
      const qTicket = query(getColRef('bookings'), where('ticketId', '==', queryCode));
      const snap = await getDocs(qTicket);
      if (!snap.empty) {
        const bData = snap.docs[0].data() as Booking;
        setScannedResult({
          booking: bData,
          isDuplicate: bData.checkedIn,
        });
        if (bData.checkedIn) setScannerStatus('Already checked in');
        return;
      }
    } catch (_) {}

    setScannerStatus('Participant not found');
    setScannedResult({
      error: `No booking record found matching "${queryCode}". Check spelling or verify allowlist.`,
    });
  };

  // Atomic Firestore Check-In Transaction
  const handleConfirmAttendance = async () => {
    if (!scannedResult?.booking) return;

    const booking = scannedResult.booking;
    setProcessingCheckIn(true);

    const bookingRef = getDocRef('bookings', booking.id);
    const auditRef = getDocRef('audit_logs', `audit_checkin_${Date.now()}`);

    try {
      await runTransaction(bookingRef.firestore, async (tx) => {
        const snap = await tx.get(bookingRef);
        if (!snap.exists()) throw new Error('Booking not found in database.');
        const current = snap.data() as Booking;

        if (current.checkedIn) {
          throw new Error('Shooter was already checked in!');
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

      setScannerStatus('Check-in successful');
      setCheckInSuccess(`Check-in verified: ${booking.participantName} (${booking.vertical})!`);
      setScannedResult(null);
    } catch (err: any) {
      console.error('Check-in transaction error:', err);
      alert(err.message || 'Failed to record attendance.');
    } finally {
      setProcessingCheckIn(false);
    }
  };

  // Helper for status badge styling
  const getStatusColor = () => {
    switch (scannerStatus) {
      case 'Scanning...':
        return 'text-cyan-400 border-cyan-800/80 bg-cyan-950/40';
      case 'QR detected':
        return 'text-emerald-400 border-emerald-800 bg-emerald-950/40';
      case 'Check-in successful':
        return 'text-emerald-300 border-emerald-700 bg-emerald-950/60';
      case 'Already checked in':
        return 'text-amber-400 border-amber-800 bg-amber-950/40';
      case 'Participant not found':
      case 'QR invalid':
      case 'Camera unavailable':
      case 'Camera permission required':
        return 'text-red-400 border-red-800 bg-red-950/40';
      default:
        return 'text-[#64748B] border-[#282B3A] bg-[#12131A]';
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-[#12131A] border border-[#282B3A] p-6 shadow-sm space-y-6">
        {/* Header */}
        <div className="border-b border-[#282B3A] pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-[#DC2626] block">
              RANGE RECEPTION & GATE CONTROL
            </span>
            <h2 className="font-headline-sm text-2xl font-serif text-[#F8FAFC] uppercase">
              Dual-Mode QR Pass Scanner
            </h2>
          </div>
          <div className="font-mono text-xs text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Live Range Ledger
          </div>
        </div>

        {/* Status Bar */}
        <div className={`p-3 rounded border font-mono text-xs flex items-center justify-between transition-colors ${getStatusColor()}`}>
          <div className="flex items-center gap-2">
            {scannerStatus === 'Scanning...' ? (
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            ) : scannerStatus === 'Check-in successful' || scannerStatus === 'QR detected' ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : scannerStatus === 'Already checked in' ? (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            ) : scannerStatus.includes('Camera') || scannerStatus.includes('invalid') || scannerStatus.includes('not found') ? (
              <XCircle className="w-4 h-4 text-red-400" />
            ) : (
              <ScanLine className="w-4 h-4 text-[#64748B]" />
            )}
            <span className="font-bold uppercase tracking-wider">
              {scannerStatus === 'IDLE' ? 'Ready to Scan' : scannerStatus}
            </span>
          </div>

          <div className="text-[11px] opacity-80">
            {isScanning ? 'Method A: Live Stream' : 'Method A & B Standby'}
          </div>
        </div>

        {/* Camera Sensor Selection Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0B0C10] p-3 border border-[#282B3A] rounded">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase text-[#64748B]">Active Sensor:</span>
            {cameras.length > 0 ? (
              <select
                disabled={isScanning}
                value={selectedCameraId}
                onChange={(e) => setSelectedCameraId(e.target.value)}
                className="bg-[#12131A] border border-[#282B3A] text-xs font-mono text-[#F8FAFC] px-2.5 py-1 rounded focus:outline-none"
              >
                {cameras.map((c, idx) => (
                  <option key={c.deviceId || idx} value={c.deviceId}>
                    {c.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-mono text-xs text-[#64748B]">Default Back Camera</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-[#1A1C26] hover:bg-[#282B3A] border border-[#282B3A] text-[#F8FAFC] font-mono text-xs uppercase tracking-wider flex items-center gap-1.5 rounded transition-colors"
              title="Upload QR code image or photo"
            >
              <UploadCloud className="w-3.5 h-3.5 text-[#DC2626]" />
              <span>[ Snap / Upload Photo ]</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileCapture}
            />
          </div>
        </div>

        {/* Dual Mode Viewfinder Display */}
        <div className="space-y-4 text-center">
          <div className="relative w-full max-w-sm mx-auto overflow-hidden bg-black border-2 border-[#282B3A] aspect-square rounded-lg flex items-center justify-center shadow-inner">
            {/* Live Video element for Method A */}
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className={`w-full h-full object-cover ${isScanning ? 'block' : 'hidden'}`}
            />

            {/* Target reticle crosshairs during scan */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-56 h-56 border-2 border-[#DC2626]/80 rounded-lg relative animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.4)]">
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-[#DC2626]" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-[#DC2626]" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-[#DC2626]" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-[#DC2626]" />
                </div>
              </div>
            )}

            {/* Standby Viewport Display */}
            {!isScanning && (
              <div className="absolute inset-0 bg-[#0B0C10] flex flex-col items-center justify-center p-6 text-center space-y-3 pointer-events-auto">
                <Camera className="w-12 h-12 mx-auto text-[#DC2626] opacity-80" />
                <div className="space-y-1">
                  <p className="font-mono text-xs text-[#F8FAFC] font-semibold uppercase">Scanner Offline</p>
                  <p className="font-mono text-[11px] text-[#64748B]">Choose Live Scan or Capture QR below</p>
                </div>
              </div>
            )}
          </div>

          {/* Explicit Scanner Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {!isScanning ? (
              <>
                <button
                  onClick={startScanner}
                  className="px-6 py-3 bg-[#DC2626] hover:bg-[#E51A1A] text-[#F8FAFC] font-mono text-xs uppercase tracking-widest font-bold shadow-lg transition-all flex items-center gap-2 rounded"
                >
                  <ScanLine className="w-4 h-4" />
                  <span>[ Live Scan ]</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-[#1A1C26] hover:bg-[#282B3A] border border-[#282B3A] text-[#F8FAFC] font-mono text-xs uppercase tracking-widest font-bold shadow-md transition-all flex items-center gap-2 rounded"
                >
                  <Camera className="w-4 h-4 text-[#DC2626]" />
                  <span>[ Capture QR ]</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleCaptureFrame}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs uppercase tracking-wider font-bold shadow-md transition-all flex items-center gap-2 rounded"
                >
                  <Zap className="w-4 h-4" />
                  <span>Capture Frame (Method B)</span>
                </button>

                <button
                  onClick={stopScanner}
                  className="px-5 py-2.5 bg-red-950 border border-red-800 text-red-300 hover:text-white font-mono text-xs uppercase tracking-wider font-bold flex items-center gap-2 rounded transition-colors"
                >
                  <CameraOff className="w-4 h-4" />
                  <span>Stop Camera</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Fallback Manual Search by Ticket ID / Email */}
        <div className="border-t border-[#282B3A] pt-5">
          <span className="font-mono text-[10px] uppercase text-[#64748B] block mb-2 font-semibold">
            Manual Backup Lookup (Ticket ID / Email / Competitor Name)
          </span>
          <form onSubmit={handleManualSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. TKT-B4E9 or 1RV22CS001 or rahul@rvce.edu.in..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1 p-2.5 bg-[#0B0C10] border border-[#282B3A] font-mono text-xs text-[#F8FAFC] rounded placeholder:text-[#64748B] focus:outline-none focus:border-[#DC2626]"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#DC2626] hover:bg-[#E51A1A] text-[#F8FAFC] font-mono text-xs uppercase tracking-wider font-bold shrink-0 flex items-center gap-1.5 rounded transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Lookup</span>
            </button>
          </form>
        </div>

        {/* Check-in Success Alert */}
        {checkInSuccess && (
          <div className="p-4 bg-emerald-950/40 border border-emerald-800 text-emerald-300 font-mono text-xs flex items-center gap-2 rounded animate-fade-in">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            <span className="font-bold text-sm">{checkInSuccess}</span>
          </div>
        )}

        {/* Scan Result Cards */}
        {scannedResult && (
          <div className="animate-fade-in border-t border-[#282B3A] pt-4">
            {scannedResult.error ? (
              <div className="p-5 bg-red-950/40 border border-red-800 text-red-200 rounded space-y-2">
                <div className="flex items-center gap-2 font-bold font-mono text-base text-red-400">
                  <XCircle className="w-5 h-5" />
                  <span>INVALID OR UNVERIFIED PASS</span>
                </div>
                <p className="font-mono text-xs">{scannedResult.error}</p>
              </div>
            ) : scannedResult.isDuplicate ? (
              <div className="p-5 bg-amber-950/40 border border-amber-800 text-amber-200 rounded space-y-3">
                <div className="flex items-center gap-2 font-bold font-mono text-base text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                  <span>PASS ALREADY CHECKED IN (DUPLICATE)</span>
                </div>
                <p className="font-mono text-xs">
                  This digital pass has already been validated for range entry.
                </p>
                {scannedResult.booking && (
                  <div className="bg-[#0B0C10] p-3 border border-[#282B3A] rounded font-mono text-xs space-y-1">
                    <div>Competitor: <strong className="text-[#F8FAFC]">{scannedResult.booking.participantName}</strong></div>
                    <div>Vertical: <span className="text-[#DC2626] font-bold">{scannedResult.booking.vertical}</span></div>
                    <div>Checked in at: <span className="text-[#64748B]">{scannedResult.booking.checkedInAt ? new Date(scannedResult.booking.checkedInAt.seconds * 1000).toLocaleString() : 'Previously'}</span></div>
                  </div>
                )}
              </div>
            ) : scannedResult.booking ? (
              <div className="p-5 bg-emerald-950/30 border border-emerald-600/70 text-emerald-100 rounded space-y-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold font-mono text-base text-emerald-400">
                    <UserCheck className="w-5 h-5" />
                    <span>AUTHENTICATED PASS IDENTIFIED</span>
                  </div>
                  <span className="font-mono text-xs bg-[#DC2626] text-white px-2.5 py-0.5 font-bold uppercase rounded">
                    {scannedResult.booking.vertical}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#0B0C10] p-3 border border-[#282B3A] rounded font-mono text-xs">
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
                    className="px-4 py-2 border border-[#282B3A] hover:bg-[#1A1C26] font-mono text-xs text-[#64748B] uppercase tracking-wider rounded transition-colors"
                  >
                    Dismiss
                  </button>
                  <button
                    disabled={processingCheckIn}
                    onClick={handleConfirmAttendance}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-mono text-xs uppercase tracking-widest font-bold shadow-lg flex items-center gap-2 rounded transition-colors"
                  >
                    {processingCheckIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>{processingCheckIn ? 'VERIFYING CHECK-IN...' : '[ ADMIT SHOOTER TO RANGE ]'}</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Offscreen Canvas for Frame Capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
