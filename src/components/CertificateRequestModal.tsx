import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDocRef, setDoc, serverTimestamp } from '../lib/firebase';
import { normalizeEmail } from '../config/lakshya';
import type { Booking, CertificateRequest } from '../types/lakshya';
import { 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  X, 
  Loader2,
  ExternalLink,
  Sprout,
  Link as LinkIcon
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
  const [driveLink, setDriveLink] = useState<string>(existingRequest?.driveLink || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentUser.email) return;

    const link = driveLink.trim();
    if (!link) {
      setErrorMsg('Please provide your Google Drive link for sapling planting proof.');
      return;
    }

    // Basic URL validation
    if (!link.startsWith('http://') && !link.startsWith('https://')) {
      setErrorMsg('Please enter a valid URL starting with https:// (e.g., https://drive.google.com/...)');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const cleanEmail = normalizeEmail(currentUser.email);
      const reqRef = getDocRef('certificate_requests', cleanEmail);

      // Safe payload: explicitly ensure NO property is ever undefined!
      const requestPayload: Record<string, any> = {
        id: cleanEmail,
        participantEmail: cleanEmail,
        participantName: registration?.name || currentUser.displayName || 'Competitor',
        registrationId: cleanEmail,
        usn: registration?.usn || '',
        college: registration?.college || checkedInBooking.college || 'RVCE',
        vertical: checkedInBooking.vertical || registration?.vertical || 'Air Rifle',
        bookingId: checkedInBooking.id || '',
        ticketId: checkedInBooking.ticketId || '',
        checkedIn: true,
        checkedInAt: checkedInBooking.checkedInAt || serverTimestamp(),
        photoUrl: existingRequest?.photoUrl || '',
        driveLink: link,
        status: 'Request Submitted',
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

        {/* Range Check-In Verified Badge */}
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
              Please update your Google Drive link below and ensure it is publicly accessible.
            </p>
          </div>
        )}

        {/* Public Sharing Warning Callout */}
        <div className="p-3.5 bg-amber-950/50 border border-amber-700/80 rounded-lg text-amber-200 font-mono text-xs space-y-1.5 shadow-sm">
          <div className="flex items-center gap-2 font-bold text-amber-400 uppercase tracking-wider text-[11px]">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>IMPORTANT: PUBLIC SHARING REQUIRED</span>
          </div>
          <p className="text-[11px] text-amber-200/90 leading-relaxed">
            Ensure your Google Drive link sharing setting is set to{' '}
            <strong className="text-white underline">&quot;Anyone with the link can view&quot; (Public)</strong>.
            If the link is private or restricted, admins will not be able to verify your sapling planting proof and your certificate request will be rejected.
          </p>
        </div>

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

          {/* Primary Input: Google Drive Link */}
          <div className="space-y-1.5">
            <label className="text-[#F8FAFC] font-semibold uppercase block text-xs flex items-center justify-between">
              <span>Google Drive Link (Sapling Proof)</span>
              <span className="text-[10px] text-amber-400 font-normal">Must be viewable by anyone</span>
            </label>
            <div className="relative">
              <LinkIcon className="w-4 h-4 text-[#64748B] absolute left-3 top-3" />
              <input
                type="url"
                required
                value={driveLink}
                onChange={(e) => setDriveLink(e.target.value)}
                placeholder="https://drive.google.com/file/d/... or folder link"
                className="w-full pl-9 pr-3 py-2.5 bg-[#0B0C10] border border-[#282B3A] text-xs text-[#F8FAFC] rounded placeholder:text-[#64748B] focus:outline-none focus:border-[#DC2626]"
              />
            </div>
            <p className="text-[10px] text-[#64748B] leading-relaxed">
              Upload your sapling planting photo to Google Drive, set access to &quot;Anyone with the link can view&quot;, and paste the link here.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-950/40 border border-red-800 text-red-200 text-xs rounded flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#EF4444]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form Actions */}
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
              disabled={isSubmitting || !driveLink.trim()}
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
