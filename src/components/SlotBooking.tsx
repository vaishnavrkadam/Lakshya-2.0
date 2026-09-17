import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  db,
  getColRef, 
  getDocRef, 
  query, 
  where, 
  onSnapshot, 
  runTransaction, 
  serverTimestamp 
} from '../lib/firebase';
import { 
  LAKSHYA_EVENT_ID, 
  normalizeEmail, 
  verticalSlug, 
  deterministicBookingId,
  generateTicketId,
  generateQrToken
} from '../config/lakshya';
import type { Slot, LakshyaVertical, Booking } from '../types/lakshya';
import { 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Ticket, 
  Lock, 
  ArrowRight,
  ShieldAlert,
  Flame
} from 'lucide-react';

export default function SlotBooking({ setView }: { setView: (v: string) => void }) {
  const { currentUser, registration, userBookings, loginWithGoogle, setOnboardingOpen } = useAuth();
  
  const [selectedVertical, setSelectedVertical] = useState<LakshyaVertical>('Air Rifle');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<Booking | null>(null);
  const [selectedGender, setSelectedGender] = useState<'Male' | 'Female' | null>(
    (registration?.gender === 'Male' || registration?.gender === 'Female') ? registration.gender : null
  );

  useEffect(() => {
    if (registration?.gender === 'Male' || registration?.gender === 'Female') {
      setSelectedGender(registration.gender as 'Male' | 'Female');
    }
  }, [registration]);

  // Check if current user already has a booking in selected vertical
  const existingVerticalBooking = userBookings.find(
    (b) => b.vertical === selectedVertical && b.status === 'confirmed'
  );

  // Check other vertical booking status
  const otherVertical: LakshyaVertical = selectedVertical === 'Air Rifle' ? 'Air Pistol' : 'Air Rifle';
  const existingOtherBooking = userBookings.find(
    (b) => b.vertical === otherVertical && b.status === 'confirmed'
  );

  // Real-time listener for slots in the selected vertical
  useEffect(() => {
    setLoadingSlots(true);
    const slotsCol = getColRef('slots');
    const q = query(
      slotsCol, 
      where('vertical', '==', selectedVertical),
      where('isActive', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Slot[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as any),
      }));

      // Sort chronologically by dateKey and startMinutes/sortOrder
      items.sort((a, b) => {
        if (a.dateKey !== b.dateKey) {
          return a.dateKey.localeCompare(b.dateKey);
        }
        return (a.sortOrder ?? a.startMinutes ?? 0) - (b.sortOrder ?? b.startMinutes ?? 0);
      });

      setSlots(items);
      setLoadingSlots(false);
    }, (err) => {
      console.error("Error loading slots:", err);
      setLoadingSlots(false);
    });

    return () => unsubscribe();
  }, [selectedVertical]);

  // Execute atomic booking transaction
  const handleConfirmBooking = async () => {
    if (!currentUser || !currentUser.email) {
      loginWithGoogle();
      return;
    }

    if (!registration || !registration.eligible) {
      setOnboardingOpen(true);
      return;
    }

    if (!selectedSlotId) return;

    if (!selectedGender) {
      setBookingError("Please select your Gender Division (Male or Female) before confirming your slot.");
      return;
    }

    setIsSubmitting(true);
    setBookingError(null);

    const emailKey = normalizeEmail(currentUser.email);
    const bookingId = deterministicBookingId(LAKSHYA_EVENT_ID, emailKey, selectedVertical);

    const slotRef = getDocRef('slots', selectedSlotId);
    const bookingRef = getDocRef('bookings', bookingId);
    const regRef = getDocRef('registrations', emailKey);
    const leaderboardRef = getDocRef('leaderboard_entries', bookingId);

    try {
      const createdBooking = await runTransaction(db, async (transaction) => {
        // 1. Read existing booking document
        const bookingSnap = await transaction.get(bookingRef);
        if (bookingSnap.exists()) {
          const data = bookingSnap.data();
          if (data && data.status === 'confirmed') {
            throw new Error("ALREADY_BOOKED_VERTICAL");
          }
        }

        // 2. Read target slot document
        const slotSnap = await transaction.get(slotRef);
        if (!slotSnap.exists()) {
          throw new Error("SLOT_NOT_FOUND");
        }
        const slotData = slotSnap.data() as Slot;
        const currentBooked = slotData.booked ?? 0;
        const capacity = slotData.capacity ?? (selectedVertical === 'Air Rifle' ? 18 : 6);

        if (currentBooked >= capacity) {
          throw new Error("SLOT_FULL");
        }

        // 3. Read participant registration
        const regSnap = await transaction.get(regRef);
        if (!regSnap.exists()) {
          throw new Error("REGISTRATION_NOT_FOUND");
        }
        const regData = regSnap.data();
        if (!regData.eligible) {
          throw new Error("REGISTRATION_NOT_ELIGIBLE");
        }

        // 4. Generate unique tokens
        const ticketId = generateTicketId();
        const qrToken = generateQrToken();
        const now = serverTimestamp();

        const newBooking: Omit<Booking, 'id'> = {
          eventId: LAKSHYA_EVENT_ID,
          ticketId,
          qrToken,
          registrationId: emailKey,
          emailKey,
          participantEmail: currentUser.email!,
          participantName: regData.name || currentUser.displayName || 'Competitor',
          participantGender: selectedGender,
          college: regData.college || 'RVCE',
          cadetStatus: regData.cadetStatus || 'Student',
          vertical: selectedVertical,
          slotId: selectedSlotId,
          slotDateKey: slotData.dateKey,
          slotDateLabel: slotData.dateLabel || slotData.dateKey,
          slotTimeLabel: slotData.timeLabel || '',
          slotStartMinutes: slotData.startMinutes ?? 0,
          bookingSource: 'self',
          status: 'confirmed',
          checkedIn: false,
          checkedInAt: null,
          checkedInBy: null,
          totalScore: null,
          scoreStatus: 'pending',
          isDQ: false,
          bookedAt: now,
          updatedAt: now,
        };

        const newLeaderboardEntry = {
          eventId: LAKSHYA_EVENT_ID,
          bookingId,
          ticketId,
          participantName: newBooking.participantName,
          college: newBooking.college,
          gender: selectedGender,
          cadetStatus: newBooking.cadetStatus,
          vertical: selectedVertical,
          slotId: selectedSlotId,
          slotDateKey: slotData.dateKey,
          slotTimeLabel: slotData.timeLabel,
          bestScore: 0,
          totalScore: 0,
          count10s: 0,
          count9s: 0,
          count8s: 0,
          attempts: 0,
          disqualified: false,
          updatedAt: now,
        };

        // 5. Commit mutations atomically
        transaction.set(bookingRef, newBooking);
        transaction.set(leaderboardRef, newLeaderboardEntry);
        transaction.update(slotRef, {
          booked: currentBooked + 1,
          updatedAt: now,
        });

        return newBooking;
      });

      setBookingSuccess(createdBooking as Booking);
      setSelectedSlotId(null);
    } catch (err: any) {
      console.error("Booking transaction failed:", err);
      if (err.message === "SLOT_FULL") {
        setBookingError("This slot just filled up! Please select another time slot.");
      } else if (err.message === "ALREADY_BOOKED_VERTICAL") {
        setBookingError(`You already have an active confirmed booking for ${selectedVertical}.`);
      } else if (err.message === "REGISTRATION_NOT_FOUND") {
        setBookingError("Your email was not found in the approved registrations roster.");
      } else if (err.message === "REGISTRATION_NOT_ELIGIBLE") {
        setBookingError("Your registration record is currently marked as ineligible.");
      } else {
        setBookingError(err.message || "Failed to confirm booking. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group slots by date
  const slotsByDate: Record<string, Slot[]> = {};
  slots.forEach((s) => {
    const key = s.dateLabel || s.dateKey;
    if (!slotsByDate[key]) slotsByDate[key] = [];
    slotsByDate[key].push(s);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title & Range Selector Header */}
      <div className="border-b border-[#282B3A] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#DC2626] block">
            FIRING RANGE ALLOCATION PROTOCOL
          </span>
          <h1 className="font-headline-lg text-3xl sm:text-4xl text-[#F8FAFC] uppercase tracking-wide font-serif">
            Select Competition Slot
          </h1>
          <p className="font-mono text-xs text-[#64748B] mt-1">
            Official 10M electronic target range · 60-minute firing relay sessions
          </p>
        </div>

        {/* Vertical Switcher Tabs */}
        <div className="inline-flex p-1 bg-[#12131A] rounded-none border border-[#282B3A]">
          <button
            onClick={() => {
              setSelectedVertical('Air Rifle');
              setBookingSuccess(null);
              setBookingError(null);
            }}
            className={`px-4 py-2 font-mono text-xs uppercase tracking-wider transition-all ${
              selectedVertical === 'Air Rifle'
                ? 'bg-[#DC2626] text-[#F8FAFC] font-bold shadow-sm'
                : 'text-[#64748B] hover:text-[#F8FAFC]'
            }`}
          >
            Air Rifle (18 Lanes)
          </button>
          <button
            onClick={() => {
              setSelectedVertical('Air Pistol');
              setBookingSuccess(null);
              setBookingError(null);
            }}
            className={`px-4 py-2 font-mono text-xs uppercase tracking-wider transition-all ${
              selectedVertical === 'Air Pistol'
                ? 'bg-[#DC2626] text-[#F8FAFC] font-bold shadow-sm'
                : 'text-[#64748B] hover:text-[#F8FAFC]'
            }`}
          >
            Air Pistol (6 Lanes)
          </button>
        </div>
      </div>

      {/* Auth / Eligibility Alerts */}
      {!currentUser && (
        <div className="bg-[#12131A] border border-[#282B3A] p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-[#F59E0B]" />
            <div className="text-xs text-[#F8FAFC]/90">
              Sign in with your registered Google account to view available range slots and book your firing ticket.
            </div>
          </div>
          <button
            onClick={loginWithGoogle}
            className="px-4 py-2 bg-[#DC2626] hover:bg-[#E51A1A] text-[#F8FAFC] font-mono text-xs uppercase tracking-widest font-semibold transition-colors shrink-0"
          >
            [ Sign In with Google ]
          </button>
        </div>
      )}

      {currentUser && !registration && (
        <div className="bg-red-950/40 border border-red-800/60 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
            <div className="text-xs text-red-200 space-y-1">
              <p className="font-bold text-sm text-[#F8FAFC]">Pre-Registration Record Required</p>
              <p>Your signed-in email (<span className="font-mono text-[#F8FAFC]">{currentUser.email}</span>) is not yet on the approved participant roster.</p>
            </div>
          </div>
          <button
            onClick={() => setOnboardingOpen(true)}
            className="px-4 py-2 bg-[#DC2626] hover:bg-[#E51A1A] text-[#F8FAFC] font-mono text-xs uppercase tracking-widest font-semibold shrink-0"
          >
            [ Complete Intake Form ]
          </button>
        </div>
      )}

      {/* Success Notification Banner */}
      {bookingSuccess && (
        <div className="bg-[#12131A] border border-emerald-500/50 p-6 space-y-4">
          <div className="flex items-center gap-3 text-emerald-400">
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <div>
              <h3 className="font-headline-sm text-xl text-[#F8FAFC] uppercase font-serif">Allocation Confirmed</h3>
              <p className="font-mono text-xs text-[#64748B]">
                {bookingSuccess.vertical} slot confirmed for {bookingSuccess.slotDateLabel} at {bookingSuccess.slotTimeLabel}
              </p>
            </div>
          </div>

          <div className="bg-[#0B0C10] p-4 border border-[#282B3A] flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="font-mono text-[10px] uppercase text-[#64748B] block">Assigned Ticket ID</span>
              <span className="font-mono text-xl font-bold text-[#F8FAFC]">{bookingSuccess.ticketId}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView('digital-pass')}
                className="px-4 py-2 bg-[#DC2626] hover:bg-[#E51A1A] text-[#F8FAFC] font-mono text-xs uppercase tracking-widest font-semibold flex items-center gap-2"
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>[ View Cadet Pass ]</span>
              </button>
              {!existingOtherBooking && (
                <button
                  onClick={() => {
                    setSelectedVertical(otherVertical);
                    setBookingSuccess(null);
                  }}
                  className="px-4 py-2 bg-[#1A1C26] hover:bg-[#282B3A] border border-[#282B3A] text-[#F8FAFC] font-mono text-xs uppercase tracking-wider"
                >
                  Book {otherVertical} Slot
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Existing Booking in this Vertical */}
      {existingVerticalBooking && !bookingSuccess && (
        <div className="bg-[#12131A] border border-[#282B3A] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#282B3A] pb-3">
            <span className="font-mono text-xs uppercase text-emerald-400 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Active Allocation in {selectedVertical}
            </span>
            <span className="font-mono text-[11px] bg-[#1A1C26] px-2.5 py-0.5 border border-[#282B3A] text-[#64748B]">
              Max 1 Booking / Vertical
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-mono text-[10px] uppercase text-[#64748B] block">Assigned Schedule</span>
              <span className="font-mono font-bold text-[#F8FAFC]">{existingVerticalBooking.slotDateLabel}</span>
              <span className="font-mono text-xs text-[#DC2626] block">{existingVerticalBooking.slotTimeLabel}</span>
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase text-[#64748B] block">Ticket Identifier</span>
              <span className="font-mono text-lg font-bold text-[#F8FAFC]">{existingVerticalBooking.ticketId}</span>
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase text-[#64748B] block">Range Status</span>
              <span className={`font-mono text-xs px-2 py-0.5 inline-block mt-0.5 ${
                existingVerticalBooking.checkedIn 
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800' 
                  : 'bg-amber-950/60 text-amber-400 border border-amber-800'
              }`}>
                {existingVerticalBooking.checkedIn ? 'CHECKED IN (ATTENDED)' : 'PASS ACTIVE / PENDING CHECK-IN'}
              </span>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={() => setView('digital-pass')}
              className="px-4 py-2 bg-[#DC2626] hover:bg-[#E51A1A] text-[#F8FAFC] font-mono text-xs uppercase tracking-widest font-semibold flex items-center gap-2"
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>[ Open Cadet Pass ]</span>
            </button>
            {!existingOtherBooking && (
              <button
                onClick={() => setSelectedVertical(otherVertical)}
                className="px-4 py-2 bg-[#1A1C26] hover:bg-[#282B3A] border border-[#282B3A] text-[#F8FAFC] font-mono text-xs uppercase tracking-wider"
              >
                Book {otherVertical} Slot
              </button>
            )}
          </div>
        </div>
      )}

      {/* Available Slots Grid (Only when not already booked in this vertical) */}
      {!existingVerticalBooking && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-[#64748B]">
              Scheduled {selectedVertical} Firing Relays
            </span>
            <span className="font-mono text-xs text-[#DC2626]">
              Capacity: {selectedVertical === 'Air Rifle' ? '18' : '6'} competitors / relay
            </span>
          </div>

          {loadingSlots ? (
            <div className="py-16 text-center font-mono text-xs text-[#64748B] tracking-wider">
              TELEMETRY: SYNCHRONIZING FIRING SCHEDULES...
            </div>
          ) : slots.length === 0 ? (
            <div className="bg-[#12131A] border border-[#282B3A] p-10 text-center space-y-3">
              <Calendar className="w-10 h-10 text-[#64748B] mx-auto opacity-40" />
              <p className="font-headline-sm text-lg text-[#F8FAFC] uppercase">No Range Slots Published Yet</p>
              <p className="font-mono text-xs text-[#64748B] max-w-md mx-auto">
                Firing schedules for {selectedVertical} are being calibrated by range safety officers. Check back shortly.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(slotsByDate).map(([dateLabel, dateSlots]) => (
                <div key={dateLabel} className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-[#282B3A] pb-2">
                    <span className="w-2 h-2 rounded-full bg-[#DC2626]"></span>
                    <h3 className="font-mono text-sm uppercase tracking-wider text-[#F8FAFC] font-bold">
                      {dateLabel}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {dateSlots.map((slot) => {
                      const booked = slot.booked ?? 0;
                      const cap = slot.capacity ?? (selectedVertical === 'Air Rifle' ? 18 : 6);
                      const available = Math.max(0, cap - booked);
                      const isFull = available <= 0;
                      const isSelected = selectedSlotId === slot.id;
                      const fillPercentage = Math.min(100, Math.round((booked / cap) * 100));

                      return (
                        <button
                          key={slot.id}
                          disabled={isFull || !currentUser || (registration ? !registration.eligible : false)}
                          onClick={() => {
                            setSelectedSlotId(slot.id);
                            setBookingError(null);
                          }}
                          className={`p-4 border text-left transition-all relative ${
                            isSelected
                              ? 'bg-[#1A1C26] border-[#DC2626] shadow-[0_0_15px_rgba(220,38,38,0.3)] scale-[1.01]'
                              : isFull
                              ? 'bg-[#0B0C10] border-[#282B3A]/40 opacity-40 cursor-not-allowed'
                              : 'bg-[#12131A] border-[#282B3A] hover:border-[#DC2626]/80 hover:bg-[#1A1C26]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className={`font-mono text-xs font-bold flex items-center gap-1.5 ${
                              isSelected ? 'text-[#DC2626]' : 'text-[#F8FAFC]'
                            }`}>
                              <Clock className="w-3.5 h-3.5" />
                              {slot.timeLabel}
                            </span>
                            <span className={`font-mono text-[10px] px-1.5 py-0.5 uppercase tracking-wider font-semibold ${
                              isFull 
                                ? 'bg-red-950/60 text-red-400 border border-red-800' 
                                : isSelected 
                                ? 'bg-[#DC2626] text-[#F8FAFC]' 
                                : fillPercentage > 75
                                ? 'bg-amber-950/60 text-amber-400 border border-amber-800'
                                : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                            }`}>
                              {isFull ? 'FULL' : `${available} Left`}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center font-mono text-[10px] text-[#64748B]">
                              <span>CAPACITY OCCUPANCY</span>
                              <span className="text-[#F8FAFC]">{booked} / {cap}</span>
                            </div>

                            {/* Tactical progress bar */}
                            <div className="w-full bg-[#0B0C10] h-1.5 border border-[#282B3A] overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  isFull ? 'bg-[#EF4444]' : isSelected ? 'bg-[#DC2626]' : 'bg-[#E51A1A]'
                                }`}
                                style={{ width: `${fillPercentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action confirmation bottom bar */}
          {selectedSlotId && (
            <div className="sticky bottom-4 z-30 bg-[#12131A]/95 backdrop-blur-xl border border-[#DC2626] p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-[#DC2626]">
                  TARGET RELAY SELECTED
                </div>
                <div className="font-mono text-base font-bold text-[#F8FAFC]">
                  {slots.find((s) => s.id === selectedSlotId)?.vertical} — {slots.find((s) => s.id === selectedSlotId)?.dateLabel} ({slots.find((s) => s.id === selectedSlotId)?.timeLabel})
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Gender division required selector */}
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[#DC2626] font-bold">
                    Gender Division * (For Leaderboard)
                  </span>
                  <div className="inline-flex p-0.5 bg-[#0B0C10] border border-[#282B3A] rounded">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGender('Male');
                        setBookingError(null);
                      }}
                      className={`px-3 py-1 font-mono text-xs uppercase tracking-wider transition-all rounded ${
                        selectedGender === 'Male'
                          ? 'bg-[#DC2626] text-[#F8FAFC] font-bold shadow'
                          : 'text-[#64748B] hover:text-[#F8FAFC]'
                      }`}
                    >
                      Male
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGender('Female');
                        setBookingError(null);
                      }}
                      className={`px-3 py-1 font-mono text-xs uppercase tracking-wider transition-all rounded ${
                        selectedGender === 'Female'
                          ? 'bg-[#DC2626] text-[#F8FAFC] font-bold shadow'
                          : 'text-[#64748B] hover:text-[#F8FAFC]'
                      }`}
                    >
                      Female
                    </button>
                  </div>
                </div>

                {bookingError && (
                  <div className="font-mono text-xs text-[#EF4444] flex items-center gap-1.5 bg-red-950/40 px-3 py-1.5 border border-red-800">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{bookingError}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setSelectedSlotId(null)}
                  className="px-4 py-2 border border-[#282B3A] hover:bg-[#1A1C26] font-mono text-xs text-[#64748B] hover:text-[#F8FAFC] uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={isSubmitting}
                  onClick={handleConfirmBooking}
                  className="px-6 py-2 bg-[#DC2626] hover:bg-[#E51A1A] text-[#F8FAFC] font-mono text-xs uppercase tracking-widest font-bold shadow-lg transition-all flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <span>CONFIRMING TRANSACTION...</span>
                  ) : (
                    <>
                      <span>[ CONFIRM ALLOCATION ]</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
