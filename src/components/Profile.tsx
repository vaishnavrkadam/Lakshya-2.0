import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  User, 
  Mail, 
  Calendar, 
  Ticket, 
  Trophy, 
  CheckCircle2, 
  Clock, 
  LogOut, 
  ExternalLink,
  PlusCircle,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { REGISTRATION_FORM_URL } from '../config/lakshya';

export default function Profile({ setView }: { setView: (v: string) => void }) {
  const { currentUser, registration, userBookings, logout, loginWithGoogle, setOnboardingOpen } = useAuth();

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-[#12131A] border border-[#282B3A] text-center space-y-4">
        <User className="w-12 h-12 text-[#DC2626] mx-auto opacity-80" />
        <h2 className="font-headline-sm text-2xl text-[#F8FAFC] uppercase font-serif">Sign In Required</h2>
        <p className="font-mono text-xs text-[#64748B]">
          Log in with your Google account to access your registration profile and firing schedule records.
        </p>
        <button
          onClick={loginWithGoogle}
          className="px-6 py-2.5 bg-[#DC2626] hover:bg-[#E51A1A] text-[#F8FAFC] font-mono text-xs uppercase tracking-widest font-semibold transition-colors"
        >
          [ Sign In with Google ]
        </button>
      </div>
    );
  }

  const rifleBooking = userBookings.find((b) => b.vertical === 'Air Rifle' && b.status === 'confirmed');
  const pistolBooking = userBookings.find((b) => b.vertical === 'Air Pistol' && b.status === 'confirmed');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Logout */}
      <div className="border-b border-[#282B3A] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#DC2626] block">
            SHOOTER IDENTITY & DOSSIER
          </span>
          <h1 className="font-headline-lg text-3xl sm:text-4xl text-[#F8FAFC] uppercase tracking-wide font-serif">
            Competitor Profile
          </h1>
        </div>

        <button
          onClick={logout}
          className="px-4 py-2 border border-[#282B3A] bg-[#12131A] hover:bg-red-950/40 hover:text-red-400 hover:border-red-900/60 text-[#64748B] font-mono text-xs uppercase tracking-wider rounded transition-colors self-start sm:self-auto flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-[#12131A] border border-[#282B3A] p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#282B3A] pb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#1A1C26] border border-[#DC2626] text-[#F8FAFC] flex items-center justify-center font-mono text-2xl font-bold">
              {(registration?.name || currentUser.displayName || currentUser.email || '?')[0].toUpperCase()}
            </div>
            <div>
              <h2 className="font-headline-sm text-xl text-[#F8FAFC] uppercase font-serif">
                {registration?.name || currentUser.displayName || 'Shooter'}
              </h2>
              <div className="flex items-center gap-2 text-xs font-mono text-[#64748B] mt-0.5">
                <Mail className="w-3.5 h-3.5 text-[#DC2626]" />
                <span>{currentUser.email}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {registration?.eligible ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-950/50 border border-emerald-800 text-emerald-400 text-xs font-mono font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                VERIFIED ROSTER
              </span>
            ) : (
              <button
                onClick={() => setOnboardingOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-950/50 border border-red-800 text-red-400 text-xs font-mono font-semibold hover:bg-red-900/50"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                UNROSTERED — COMPLETE FORM
              </button>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-[#0B0C10] border border-[#282B3A]">
            <span className="font-mono text-[10px] text-[#64748B] uppercase block">CADET CATEGORY</span>
            <span className="font-mono font-bold text-[#F8FAFC] mt-0.5 block">{registration?.cadetType || 'Standard Competitor'}</span>
          </div>
          <div className="p-3 bg-[#0B0C10] border border-[#282B3A]">
            <span className="font-mono text-[10px] text-[#64748B] uppercase block">GENDER DIVISION</span>
            <span className="font-mono font-bold text-[#F8FAFC] mt-0.5 block">{registration?.gender || 'Unspecified'}</span>
          </div>
          <div className="p-3 bg-[#0B0C10] border border-[#282B3A]">
            <span className="font-mono text-[10px] text-[#64748B] uppercase block">INSTITUTION</span>
            <span className="font-mono font-bold text-[#F8FAFC] mt-0.5 block">{registration?.college || 'RVCE'}</span>
          </div>
          <div className="p-3 bg-[#0B0C10] border border-[#282B3A]">
            <span className="font-mono text-[10px] text-[#64748B] uppercase block">ALLOCATED SLOTS</span>
            <span className="font-mono font-bold text-[#DC2626] mt-0.5 block">{userBookings.length} of 2 Verticals</span>
          </div>
        </div>
      </div>

      {/* Disciplines & Bookings Dossier */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-headline-sm text-lg text-[#F8FAFC] uppercase font-serif">Dual Discipline Allocations</h3>
          <span className="font-mono text-xs text-[#64748B]">Max 1 slot per discipline</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Air Rifle Section */}
          <div className="bg-[#12131A] border border-[#282B3A] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#282B3A] pb-3">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#DC2626] font-bold block">
                  DISCIPLINE 01
                </span>
                <h4 className="font-headline-sm text-base text-[#F8FAFC] uppercase font-serif">10m Air Rifle Precision</h4>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 bg-[#1A1C26] border border-[#282B3A] text-[#64748B]">
                18 Lanes
              </span>
            </div>

            {rifleBooking ? (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-[#64748B]">Ticket ID:</span>
                  <span className="font-bold text-[#F8FAFC]">{rifleBooking.ticketId}</span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span className="text-[#64748B]">Scheduled Slot:</span>
                  <span className="font-medium text-[#F8FAFC]">{rifleBooking.slotDateLabel} · {rifleBooking.slotTimeLabel}</span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span className="text-[#64748B]">Attendance:</span>
                  <span className={`px-2 py-0.5 text-[10px] font-semibold ${
                    rifleBooking.checkedIn ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800' : 'bg-amber-950/60 text-amber-400 border border-amber-800'
                  }`}>
                    {rifleBooking.checkedIn ? 'CHECKED IN' : 'PENDING CHECK-IN'}
                  </span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span className="text-[#64748B]">Official Score:</span>
                  <span className="font-bold text-[#DC2626]">
                    {rifleBooking.totalScore !== null && rifleBooking.totalScore !== undefined && rifleBooking.totalScore > 0 ? `${rifleBooking.totalScore.toFixed(1)} PTS` : 'Pending Match'}
                  </span>
                </div>
                <div className="pt-2 border-t border-[#282B3A]">
                  <button
                    onClick={() => setView('digital-pass')}
                    className="w-full py-2 bg-[#DC2626] hover:bg-[#E51A1A] text-[#F8FAFC] font-mono text-xs uppercase tracking-widest font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Ticket className="w-3.5 h-3.5" />
                    <span>[ View Air Rifle Cadet Pass ]</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center space-y-3">
                <p className="font-mono text-xs text-[#64748B]">No confirmed Air Rifle allocation found.</p>
                <button
                  onClick={() => setView('slot-booking')}
                  className="px-4 py-2 bg-[#DC2626] hover:bg-[#E51A1A] text-[#F8FAFC] font-mono text-xs uppercase tracking-widest font-semibold inline-flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>[ Book Air Rifle Slot ]</span>
                </button>
              </div>
            )}
          </div>

          {/* Air Pistol Section */}
          <div className="bg-[#12131A] border border-[#282B3A] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#282B3A] pb-3">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#DC2626] font-bold block">
                  DISCIPLINE 02
                </span>
                <h4 className="font-headline-sm text-base text-[#F8FAFC] uppercase font-serif">10m Air Pistol Match</h4>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 bg-[#1A1C26] border border-[#282B3A] text-[#64748B]">
                6 Lanes
              </span>
            </div>

            {pistolBooking ? (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-[#64748B]">Ticket ID:</span>
                  <span className="font-bold text-[#F8FAFC]">{pistolBooking.ticketId}</span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span className="text-[#64748B]">Scheduled Slot:</span>
                  <span className="font-medium text-[#F8FAFC]">{pistolBooking.slotDateLabel} · {pistolBooking.slotTimeLabel}</span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span className="text-[#64748B]">Attendance:</span>
                  <span className={`px-2 py-0.5 text-[10px] font-semibold ${
                    pistolBooking.checkedIn ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800' : 'bg-amber-950/60 text-amber-400 border border-amber-800'
                  }`}>
                    {pistolBooking.checkedIn ? 'CHECKED IN' : 'PENDING CHECK-IN'}
                  </span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span className="text-[#64748B]">Official Score:</span>
                  <span className="font-bold text-[#DC2626]">
                    {pistolBooking.totalScore !== null && pistolBooking.totalScore !== undefined && pistolBooking.totalScore > 0 ? `${pistolBooking.totalScore.toFixed(1)} PTS` : 'Pending Match'}
                  </span>
                </div>
                <div className="pt-2 border-t border-[#282B3A]">
                  <button
                    onClick={() => setView('digital-pass')}
                    className="w-full py-2 bg-[#DC2626] hover:bg-[#E51A1A] text-[#F8FAFC] font-mono text-xs uppercase tracking-widest font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Ticket className="w-3.5 h-3.5" />
                    <span>[ View Air Pistol Cadet Pass ]</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center space-y-3">
                <p className="font-mono text-xs text-[#64748B]">No confirmed Air Pistol allocation found.</p>
                <button
                  onClick={() => setView('slot-booking')}
                  className="px-4 py-2 bg-[#DC2626] hover:bg-[#E51A1A] text-[#F8FAFC] font-mono text-xs uppercase tracking-widest font-semibold inline-flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>[ Book Air Pistol Slot ]</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
