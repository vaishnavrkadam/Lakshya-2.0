import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDocRef, setDoc, serverTimestamp } from '../lib/firebase';
import { normalizeEmail } from '../config/lakshya';
import type { Booking, CertificateRequest } from '../types/lakshya';
import { 
  Award, 
  Upload, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Loader2, 
  ExternalLink,
  Sprout
} from 'lucide-react';

interface CertificateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkedInBooking: Booking;
  existingRequest?: CertificateRequest | null;
  onSuccess?: () => void;
}

export default function CertificateRequestModal({
  isOpen,
  onClose,
  checkedInBooking,
  existingRequest,
  onSuccess
}: CertificateRequestModalProps) {
  const { currentUser, registration } = useAuth();
  const [photoDataUrl, setPhotoDataUrl] = useState<string>(existingRequest?.photoUrl || '');
  const [driveLink, setDriveLink] = useState<string>(existingRequest?.driveLink || '');
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Compress image client-side to <80KB JPEG to guarantee zero extra cloud storage cost
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPEG, PNG, or WebP).');
      return;
    }

    setIsCompressing(true);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const maxDimension = 900;
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Could not get 2D canvas context');

          ctx.drawImage(img, 0, 0, width, height);

          // Compress as JPEG quality 0.72 (~40-70 KB data URL)
          const compressed = canvas.toDataURL('image/jpeg', 0.72);
          setPhotoDataUrl(compressed);
          setIsCompressing(false);
        } catch (err: any) {
          console.error('Image compression failed:', err);
          setErrorMsg('Failed to process image. Please try another photograph.');
          setIsCompressing(false);
        }
      };
      img.onerror = () => {
        setErrorMsg('Failed to read image file.');
        setIsCompressing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read file.');
      setIsCompressing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentUser.email) return;

    if (!photoDataUrl && !driveLink.trim()) {
      setErrorMsg('Please upload a photo of yourself planting the sapling, or provide a Google Drive link.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const cleanEmail = normalizeEmail(currentUser.email);
      const reqRef = getDocRef('certificate_requests', cleanEmail);

      const requestPayload: Partial<CertificateRequest> = {
        id: cleanEmail,
        participantEmail: cleanEmail,
        participantName: registration?.name || currentUser.displayName || 'Competitor',
        registrationId: cleanEmail,
        usn: registration?.usn || '',
        college: registration?.college || checkedInBooking.college || 'RVCE',
        vertical: checkedInBooking.vertical || registration?.vertical || 'Air Rifle',
        bookingId: checkedInBooking.id,
        ticketId: checkedInBooking.ticketId,
        checkedIn: true,
        checkedInAt: checkedInBooking.checkedInAt || serverTimestamp(),
        photoUrl: photoDataUrl || '',
        driveLink: driveLink.trim() || undefined,
        status: 'Request Submitted',
        rejectionReason: undefined,
        requestedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(reqRef, requestPayload, { merge: true });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to submit certificate request:', err);
      setErrorMsg(err.message || 'Failed to submit certificate request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#12131A] border border-[#282B3A] rounded-xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-[#282B3A] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#1A1C26] border border-[#DC2626] text-[#DC2626] rounded">
              <Sprout className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#DC2626] font-bold block">
                STEP 5: CERTIFICATE DISPATCH PROTOCOL
              </span>
              <h3 className="font-headline-sm text-xl text-[#F8FAFC] uppercase font-serif">
                Request Participation Certificate
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#64748B] hover:text-[#F8FAFC] hover:bg-[#1A1C26] rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Verification Badge */}
        <div className="p-3 bg-emerald-950/40 border border-emerald-800 text-emerald-300 font-mono text-xs rounded flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Range Check-In Verified ({checkedInBooking.vertical})</span>
          </div>
          <span className="text-[10px] font-bold text-emerald-400">
            {checkedInBooking.ticketId}
          </span>
        </div>

        {/* Previous Rejection Notice if resubmitting */}
        {existingRequest?.status === 'Rejected' && (
          <div className="p-3.5 bg-red-950/50 border border-red-800 text-red-200 font-mono text-xs rounded space-y-1">
            <div className="font-bold text-[#EF4444] flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" /> Previous Request Was Rejected
            </div>
            {existingRequest.rejectionReason && (
              <p className="text-[11px] text-red-300 pl-5">
                Reason: &quot;{existingRequest.rejectionReason}&quot;
              </p>
            )}
            <p className="text-[10px] text-[#94A3B8] pl-5">
              Please upload a clearer photograph of yourself planting the sapling below to resubmit.
            </p>
          </div>
        )}

        {/* Request Form */}
        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          {/* Competitor identity summary */}
          <div className="grid grid-cols-2 gap-3 bg-[#0B0C10] p-3 border border-[#282B3A] rounded text-[11px]">
            <div>
              <span className="text-[#64748B] uppercase block">Competitor</span>
              <strong className="text-[#F8FAFC]">
                {registration?.name || currentUser?.displayName || 'Competitor'}
              </strong>
            </div>
            <div>
              <span className="text-[#64748B] uppercase block">Discipline</span>
              <strong className="text-[#DC2626]">{checkedInBooking.vertical}</strong>
            </div>
          </div>

          {/* Step 4 Requirement Notice */}
          <div className="space-y-1 text-[#94A3B8] text-[11px] leading-relaxed">
            <span className="font-bold text-[#F8FAFC] uppercase block text-xs">
              Plant A Sapling Proof Requirement:
            </span>
            <p>
              In alignment with the green initiative of Lakshya 2.0, please upload a photograph of yourself planting the sapling provided during the championship.
            </p>
          </div>

          {/* Photo Upload Zone */}
          <div className="space-y-2">
            <label className="text-[#F8FAFC] font-semibold uppercase block text-[11px]">
              Sapling Planting Photograph *
            </label>

            {photoDataUrl ? (
              <div className="relative rounded-lg border border-[#282B3A] bg-[#0B0C10] overflow-hidden p-2">
                <div className="w-full h-48 bg-black flex items-center justify-center rounded overflow-hidden">
                  <img
                    src={photoDataUrl}
                    alt="Sapling planting proof"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Photo Optimized & Ready
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoDataUrl('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-[11px] text-[#EF4444] hover:underline"
                  >
                    Change Photo
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#282B3A] hover:border-[#DC2626] bg-[#0B0C10] hover:bg-[#1A1C26]/40 p-6 rounded-lg text-center cursor-pointer transition-colors space-y-2"
              >
                {isCompressing ? (
                  <div className="space-y-2 py-4">
                    <Loader2 className="w-8 h-8 text-[#DC2626] animate-spin mx-auto" />
                    <p className="text-xs text-[#94A3B8]">Optimizing photo for secure upload...</p>
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-[#1A1C26] border border-[#282B3A] flex items-center justify-center mx-auto text-[#DC2626]">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#F8FAFC] block">
                        Click to Upload Sapling Photo
                      </span>
                      <span className="text-[10px] text-[#64748B]">
                        JPEG, PNG, or WebP · Photo of you planting the sapling
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Optional Google Drive Link */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[#64748B] uppercase block text-[10px]">
              Optional: Google Drive Share Link (Alternative proof backup)
            </label>
            <input
              type="url"
              value={driveLink}
              onChange={(e) => setDriveLink(e.target.value)}
              placeholder="https://drive.google.com/file/d/..."
              className="w-full p-2.5 bg-[#0B0C10] border border-[#282B3A] text-xs text-[#F8FAFC] rounded placeholder:text-[#64748B] focus:outline-none focus:border-[#DC2626]"
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-950/40 border border-red-800 text-red-200 text-xs rounded flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#EF4444]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-[#282B3A] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#282B3A] hover:bg-[#1A1C26] text-[#64748B] hover:text-[#F8FAFC] rounded transition-colors text-xs uppercase"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isCompressing || (!photoDataUrl && !driveLink.trim())}
              className="px-5 py-2.5 bg-[#DC2626] hover:bg-[#E51A1A] disabled:opacity-50 text-[#F8FAFC] text-xs font-bold uppercase tracking-widest rounded shadow-lg transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <Award className="w-4 h-4" />
                  <span>[ Submit Certificate Request ]</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
