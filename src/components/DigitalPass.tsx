import React from 'react';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { buildQrPayload, encodeQrPayload } from '../lib/bookingPayload';
import { 
  Ticket, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Printer, 
  Download, 
  ArrowRight, 
  ShieldCheck, 
  Award,
  AlertCircle 
} from 'lucide-react';
import type { Booking } from '../types/lakshya';

export default function DigitalPass({ setView }: { setView: (v: string) => void }) {
  const { currentUser, userBookings, registration, loginWithGoogle } = useAuth();

  const confirmedBookings = userBookings.filter((b) => b.status === 'confirmed');
  const hasRifle = confirmedBookings.some((b) => b.vertical === 'Air Rifle');
  const hasPistol = confirmedBookings.some((b) => b.vertical === 'Air Pistol');

  const handlePrint = () => {
    window.print();
  };

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-[#12131A] border border-[#282B3A] text-center space-y-4">
        <Ticket className="w-12 h-12 text-[#DC2626] mx-auto opacity-80" />
        <h2 className="font-headline-sm text-2xl text-[#F8FAFC] uppercase font-serif">Sign In Required</h2>
        <p className="font-mono text-xs text-[#64748B]">
          Log in with your registered Google account to retrieve and display your official firing range digital pass.
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

  if (confirmedBookings.length === 0) {
    return (
      <div className="max-w-xl mx-auto my-20 p-8 bg-[#12131A] border border-[#282B3A] text-center space-y-5">
        <div className="w-14 h-14 rounded-full bg-[#1A1C26] border border-[#282B3A] flex items-center justify-center mx-auto text-[#64748B]">
          <Ticket className="w-7 h-7 text-[#DC2626]" />
        </div>
        <div className="space-y-1">
          <h2 className="font-headline-sm text-2xl text-[#F8FAFC] uppercase font-serif">No Digital Passes Found</h2>
          <p className="font-mono text-xs text-[#64748B]">
            You have not confirmed any firing slots yet for Lakshya 2.0.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => setView('slot-booking')}
            className="px-6 py-3 bg-[#DC2626] hover:bg-[#E51A1A] text-[#F8FAFC] font-mono text-xs uppercase tracking-widest font-bold shadow-lg flex items-center gap-2 mx-auto"
          >
            <span>[ Book Your Firing Slot ]</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Print Actions */}
      <div className="border-b border-[#282B3A] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#DC2626] block">
            OFFICIAL PARTICIPANT CREDENTIALS
          </span>
          <h1 className="font-headline-lg text-3xl sm:text-4xl text-[#F8FAFC] uppercase tracking-wide font-serif">
            Digital Range Passes
          </h1>
          <p className="font-mono text-xs text-[#64748B] mt-1">
            Present this credential at the armory check-in desk for live electronic verification
          </p>
        </div>

        <div className="flex items-center gap-3 no-print">
          <button
            onClick={handlePrint}
            className="px-4 py-2 border border-[#282B3A] bg-[#12131A] hover:bg-[#1A1C26] text-[#F8FAFC] font-mono text-xs uppercase tracking-wider flex items-center gap-2 transition-colors"
          >
            <Printer className="w-4 h-4 text-[#DC2626]" />
            <span>[ Print / Save PDF ]</span>
          </button>
        </div>
      </div>

      {/* Cross-sell banner if participant only booked one discipline */}
      {(!hasRifle || !hasPistol) && (
        <div className="bg-[#12131A] border border-[#282B3A] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
          <div className="font-mono text-xs text-[#64748B]">
            <span className="font-bold text-[#F8FAFC]">[ DUAL DISCIPLINE OPPORTUNITY ]:</span>{' '}
            You are registered for <strong>{hasRifle ? 'Air Rifle' : 'Air Pistol'}</strong>. 
            Compete in both events by booking your <strong>{hasRifle ? 'Air Pistol' : 'Air Rifle'}</strong> slot!
          </div>
          <button
            onClick={() => setView('slot-booking')}
            className="px-3.5 py-1.5 bg-[#DC2626] hover:bg-[#E51A1A] text-[#F8FAFC] font-mono text-xs uppercase tracking-widest font-semibold shrink-0"
          >
            Book {hasRifle ? 'Air Pistol' : 'Air Rifle'}
          </button>
        </div>
      )}

      {/* Digital Pass Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {confirmedBookings.map((booking) => {
          // Construct canonical QR payload
          const payload = buildQrPayload({
            eventId: booking.eventId,
            bookingId: booking.id,
            ticketId: booking.ticketId,
            vertical: booking.vertical,
            qrToken: booking.qrToken,
            issuedAt: booking.bookedAt ? new Date(booking.bookedAt.seconds * 1000 || Date.now()).toISOString() : new Date().toISOString(),
          });
          const qrString = encodeQrPayload(payload);

          return (
            <div
              key={booking.id}
              className="bg-[#12131A] border-2 border-[#282B3A] hover:border-[#DC2626]/70 shadow-2xl flex flex-col justify-between relative transition-all"
            >
              {/* Card Top Strip */}
              <div className="bg-[#1A1C26] text-[#F8FAFC] px-6 py-4 flex items-center justify-between border-b border-[#282B3A]">
                <div>
                  <span className="font-mono text-[10px] tracking-widest uppercase text-[#DC2626] block">
                    AUTHENTICATED ENTRY PASS
                  </span>
                  <div className="font-headline-sm text-xl tracking-wide font-serif text-[#F8FAFC]">
                    LAKSHYA <span className="text-[#DC2626]">2.0</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-[10px] uppercase bg-[#DC2626] px-2 py-0.5 text-[#F8FAFC] font-bold tracking-wider">
                    {booking.vertical}
                  </span>
                  <div className="font-mono text-xs text-[#F8FAFC] font-bold mt-1">
                    {booking.ticketId}
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-6">
                {/* Participant Details */}
                <div className="border-b border-[#282B3A] pb-4 flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[10px] uppercase text-[#64748B] block">COMPETITOR</span>
                    <h3 className="font-mono text-lg font-bold text-[#F8FAFC]">
                      {booking.participantName || registration?.name || currentUser.displayName}
                    </h3>
                    <p className="font-mono text-xs text-[#64748B]">{booking.participantEmail}</p>
                    <p className="font-mono text-[11px] text-[#64748B] mt-0.5">
                      {booking.college || 'RVCE'} · Participant
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-[10px] uppercase text-[#64748B] block">DISCIPLINE</span>
                    <span className="font-mono text-xs font-bold text-[#DC2626]">{booking.vertical}</span>
                  </div>
                </div>

                {/* Slot Details */}
                <div className="grid grid-cols-2 gap-4 bg-[#0B0C10] p-3 border border-[#282B3A]">
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] uppercase text-[#64748B] flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#DC2626]" />
                      DATE
                    </span>
                    <div className="font-mono text-xs font-bold text-[#F8FAFC]">{booking.slotDateLabel}</div>
                  </div>
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] uppercase text-[#64748B] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#DC2626]" />
                      REPORTING WINDOW
                    </span>
                    <div className="font-mono text-xs font-bold text-[#F8FAFC]">{booking.slotTimeLabel}</div>
                  </div>
                </div>

                {/* QR Code Section */}
                <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
                  <div className="p-3 bg-white border border-[#282B3A] shadow-md shrink-0">
                    <QRCodeSVG
                      value={qrString}
                      size={135}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <div className="space-y-2 text-center sm:text-left">
                    <div className="font-mono text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                      Range Scanner Authenticator
                    </div>
                    <p className="font-mono text-[11px] text-[#64748B] leading-relaxed">
                      Present this encrypted matrix code to the Range Safety Officer at the armory desk for digital check-in.
                    </p>
                    <div className="font-mono text-[10px] text-[#64748B]">
                      TOKEN: <span className="text-[#F8FAFC]">{booking.qrToken ? booking.qrToken.substring(0, 12) : 'AUTH_SECURE'}...</span>
                    </div>
                  </div>
                </div>

                {/* Attendance & Live Score State */}
                <div className="border-t border-[#282B3A] pt-4 flex items-center justify-between">
                  <div>
                    <span className="font-mono text-[10px] uppercase text-[#64748B] block">RANGE ADMISSION</span>
                    {booking.checkedIn ? (
                      <span className="font-mono text-xs font-semibold text-emerald-400 flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> ATTENDED / CHECKED IN
                      </span>
                    ) : (
                      <span className="font-mono text-xs font-semibold text-amber-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3.5 h-3.5" /> PENDING RANGE ENTRY
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-[10px] uppercase text-[#64748B] block">OFFICIAL SCORE</span>
                    {booking.isDQ ? (
                      <span className="font-mono text-xs font-bold text-red-500">DISQUALIFIED</span>
                    ) : booking.totalScore !== null && booking.totalScore !== undefined && booking.totalScore > 0 ? (
                      <span className="font-mono text-sm font-bold text-[#F8FAFC]">
                        {booking.totalScore.toFixed(1)} PTS
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-[#64748B] italic">AWAITING RELAY</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Security Footer */}
              <div className="bg-[#1A1C26] px-6 py-2.5 border-t border-[#282B3A] flex items-center justify-between font-mono text-[10px] text-[#64748B]">
                <span>2/2 COY 6 KARNATAKA BATTALION NCC · RVCE</span>
                <span className="text-[#DC2626] font-bold">NON-TRANSFERABLE</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
