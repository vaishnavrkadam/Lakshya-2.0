import React from 'react';
import { useAuth } from '../context/AuthContext';
import { REGISTRATION_FORM_URL } from '../config/lakshya';
import { AlertCircle, ExternalLink, X, ShieldAlert } from 'lucide-react';

export default function OnboardingModal() {
  const { currentUser, onboardingOpen, setOnboardingOpen } = useAuth();

  if (!onboardingOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0C10]/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#12131A] border border-[#282B3A] shadow-2xl max-w-lg w-full p-6 relative">
        <button
          onClick={() => setOnboardingOpen(false)}
          className="absolute top-4 right-4 text-[#64748B] hover:text-[#F8FAFC] p-1 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 bg-[#DC2626]/20 border border-[#DC2626]/40 text-[#DC2626] shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#DC2626] block">
              OFFICIAL RANGE PROTOCOL
            </span>
            <h2 className="font-headline-sm text-xl text-[#F8FAFC] uppercase font-serif">
              Pre-Registration Required
            </h2>
          </div>
        </div>

        <div className="space-y-3 text-xs font-mono text-[#64748B] mb-6">
          <p>
            Authenticated as: <strong className="text-[#F8FAFC]">{currentUser?.email}</strong>.
          </p>
          <p className="text-white/80">
            To book firing slots for <strong>Air Rifle</strong> or <strong>Air Pistol</strong>, your email must be verified in the official Lakshya 2.0 intake roster.
          </p>
          <div className="p-3 bg-[#0B0C10] border border-[#282B3A] space-y-1.5">
            <p className="font-bold text-[#DC2626] uppercase">Action Steps:</p>
            <ol className="list-decimal pl-4 space-y-1 text-[#64748B]">
              <li>Submit the official Google Form intake registration.</li>
              <li>Provide the identical Google account email (<span className="text-[#F8FAFC]">{currentUser?.email}</span>).</li>
              <li>Upon roster sync by admins, return here to pick your firing slots.</li>
            </ol>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={REGISTRATION_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#DC2626] hover:bg-[#E51A1A] text-[#F8FAFC] font-mono font-bold text-xs uppercase tracking-widest transition-colors shadow-sm"
          >
            <span>[ Complete Intake Form ]</span>
            <ExternalLink className="w-4 h-4" />
          </a>
          <button
            onClick={() => setOnboardingOpen(false)}
            className="px-4 py-2.5 border border-[#282B3A] text-[#64748B] hover:text-[#F8FAFC] hover:bg-[#1A1C26] font-mono text-xs uppercase tracking-wider transition-colors"
          >
            Close Terminal
          </button>
        </div>
      </div>
    </div>
  );
}
