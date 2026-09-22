import React, { useState, useEffect, useMemo } from 'react';
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
  DEFAULT_SLOT_CAPACITY,
  normalizeEmail, 
  deterministicBookingId,
  generateTicketId,
  generateQrToken
} from '../config/lakshya';
import type { Slot, LakshyaVertical, Booking } from '../types/lakshya';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Ticket, 
  Lock, 
  ArrowRight,
  ShieldAlert,
  AlertTriangle,
  X
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
  const [showCrossVerticalWarning, setShowCrossVerticalWarning] = useState<boolean>(false);

  // Determine registered verticals from the participant's intake record
  const registeredVerticals = useMemo<LakshyaVertical[]>(() => {
    if (!registration) return ['Air Rifle', 'Air Pistol'];
    if (Array.isArray(registration.verticals) && registration.verticals.length > 0) {
      return registration.verticals;
    }
    if (registration.vertical === 'Air Rifle') return ['Air Rifle'];
    if (registration.vertical === 'Air Pistol') return ['Air Pistol'];
    if (registration.vertical === 'Both') return ['Air Rifle', 'Air Pistol'];
    return ['Air Rifle'];
  }, [registration]);

  // 1 Registration = 1 Slot Booking rule
  // Each registered vertical represents 1 registration unit
  const maxAllowedBookings = registeredVerticals.length;

  // Active confirmed bookings
  const confirmedBookings = useMemo(() => {
    return userBookings.filter((b) => b.status === 'confirmed');
  }, [userBookings]);

  const hasReachedBookingLimit = confirmedBookings.length >= maxAllowedBookings;

  // Check if current user already has a booking in selected vertical
  const existingVerticalBooking = confirmedBookings.find(
    (b) => b.vertical === selectedVertical
  );

  // Check other vertical booking status
  const otherVertical: LakshyaVertical = selectedVertical === 'Air Rifle' ? 'Air Pistol' : 'Air Rifle';
  const existingOtherBooking = confirmedBookings.find(
    (b) => b.vertical === otherVertical
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

  // Trigger booking confirmation flow
  const handleInitiateBooking = () => {
    if (!currentUser || !currentUser.email) {
      loginWithGoogle();
      return;
    }

    if (!registration || !registration.eligible) {
      setOnboardingOpen(true);
      return;
    }

    if (!selectedSlotId) return;

    // Check if vertical differs from registered vertical: show confirmation warning
    const isDifferentVertical = !registeredVerticals.includes(selectedVertical);
    if (isDifferentVertical) {
      setShowCrossVerticalWarning(true);
      return;
    }

    executeBookingTransaction();
  };

  // Execute atomic booking transaction with backend validations
  const executeBookingTransaction = async () => {
    setShowCrossVerticalWarning(false);
    setIsSubmitting(true);
    setBookingError(null);

    const emailKey = normalizeEmail(currentUser?.email || '');
    const bookingId = deterministicBookingId(LAKSHYA_EVENT_ID, emailKey, selectedVertical);
    const otherBookingId = deterministicBookingId(LAKSHYA_EVENT_ID, emailKey, otherVertical);

    const slotRef = getDocRef('slots', selectedSlotId!);
    const bookingRef = getDocRef('bookings', bookingId);
    const otherBookingRef = getDocRef('bookings', otherBookingId);
    const regRef = getDocRef('registrations', emailKey);
    const leaderboardRef = getDocRef('leaderboard_entries', bookingId);

    try {
      const createdBooking = await runTransaction(db, async (transaction) => {
        // 1. Read existing bookings for both disciplines
        const [bookingSnap, otherBookingSnap, slotSnap, regSnap] = await Promise.all([
          transaction.get(bookingRef),
          transaction.get(otherBookingRef),
          transaction.get(slotRef),
          transaction.get(regRef),
        ]);

        if (bookingSnap.exists()) {
          const data = bookingSnap.data();
          if (data && data.status === 'confirmed') {
            throw new Error("ALREADY_BOOKED_VERTICAL");
          }
        }

        // Count current confirmed bookings
        let activeBookingsCount = 0;
        if (otherBookingSnap.exists() && otherBookingSnap.data()?.status === 'confirmed') {
          activeBookingsCount++;
        }

        // 2. Read participant registration
        let regData = regSnap.exists() ? regSnap.data() : (registration as any);
        if (!regData) {
          throw new Error("REGISTRATION_NOT_FOUND");
        }
        if (!regData.eligible) {
          throw new Error("REGISTRATION_NOT_ELIGIBLE");
        }

        // Determine allowed count: 1 Registration = 1 Slot Booking
        const userVerts: LakshyaVertical[] = Array.isArray(regData.verticals) && regData.verticals.length > 0
          ? regData.verticals
          : (regData.vertical === 'Both' ? ['Air Rifle', 'Air Pistol'] : [regData.vertical || 'Air Rifle']);
        const allowedBookingsLimit = userVerts.length;

        if (activeBookingsCount >= allowedBookingsLimit) {
          throw new Error("BOOKING_LIMIT_REACHED");
        }

        // 3. Read target slot document and verify capacity
        if (!slotSnap.exists()) {
          throw new Error("SLOT_NOT_FOUND");
        }
        const slotData = slotSnap.data() as Slot;
        const currentBooked = slotData.booked ?? 0;
        const capacity = slotData.capacity ?? DEFAULT_SLOT_CAPACITY[selectedVertical];

        if (currentBooked >= capacity) {
          throw new Error("SLOT_FULL");
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
          participantEmail: emailKey,
          participantName: regData.name || currentUser?.displayName || 'Competitor',
          participantGender: (regData.gender as any) || (registration?.gender as any) || 'Male',
          college: regData.college || 'RVCE',
          cadetStatus: regData.cadetStatus || 'Student',
          vertical: selectedVertical,
          slotId: selectedSlotId!,
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
          gender: newBooking.participantGender,
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
      } else if (err.message === "BOOKING_LIMIT_REACHED") {
        setBookingError(`Booking limit reached. Each registration permits only 1 slot booking. You have already used your allocated slot.`);
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
            Official 10M electronic target range · 60-minute firing relay sessions · First-Come, First-Served
          </p>
        </div>

        {/* Vertical Switcher Tabs - Both Verticals Always Selectable */}
        <div className="inline-flex p-1 bg-[#12131A] rounded border border-[#282B3A]">
          <button
            onClick={() => {
              setSelectedVertical('Air Rifle');
              setBookingSuccess(null);
              setBookingError(null);
            }}
            className={`px-4 py-2 font-mono text-xs uppercase tracking-wider transition-all rounded ${
              selectedVertical === 'Air Rifle'
                ? 'bg-[#DC2626] text-[#F8FAFC] font-bold shadow-sm'
                : 'text-[#64748B] hover:text-[#F8FAFC]'
            }`}
          >
            Air Rifle (40 Lanes)
          </button>
          <button
            onClick={() => {
              setSelectedVertical('Air Pistol');
              setBookingSuccess(null);
              setBookingError(null);
            }}
            className={`px-4 py-2 font-mono text-xs uppercase tracking-wider transition-all rounded ${
              selectedVertical === 'Air Pistol'
                ? 'bg-[#DC2626] text-[#F8FAFC] font-bold shadow-sm'
                : 'text-[#64748B] hover:text-[#F8FAFC]'
            }`}
          >
            Air Pistol (16 Lanes)
          </button>
        </div>
      </div>

      {/* Registered discipline status notice */}
      {currentUser && registration && (
        <div className="bg-[#12131A] border border-[#282B3A] p-4 text-xs font-mono text-[#94A3B8] rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <span className="text-[#64748B] uppercase font-bold">[ REGISTRATION STATUS ]:</span>{' '}
            Registered for{' '}
            <strong className="text-[#DC2626]">
              {registeredVerticals.join(' and ')}
            </strong>.
            <span className="ml-2 text-[#CBD5E1]">
              You may book any available vertical ({confirmedBookings.length} of {maxAllowedBookings} slot bookings used).
            </span>
          </div>
          <span className="text-[11px] font-semibold text-[#DC2626]">
            Rule: 1 Registration = 1 Slot Booking
          </span>
        </div>
      )}

      {/* Limit Reached Banner */}
      {hasReachedBookingLimit && !bookingSuccess && (
        <div className="bg-[#12131A] border border-amber-500/50 p-5 rounded space-y-3">
          <div className="flex items-center gap-2.5 text-amber-400 font-mono text-xs font-bold uppercase">
            <AlertCircle className="w-4 h-4" />
            <span>Allocation Quota Consumed</span>
          </div>
          <p className="font-mono text-xs text-[#94A3B8]">
            You have already confirmed your allocated slot ({confirmedBookings.length} of {maxAllowedBookings} booking limit). 
            Each registration permits exactly 1 slot booking.
          </p>
          <div className="pt-1">
            <button
              onClick={() => setView('digital-pass')}
              className="px-4 py-2 bg-[#DC2626] hover:bg-[#E51A1A] text-[#F8FAFC] font-mono text-xs uppercase tracking-widest font-semibold flex items-center gap-2 rounded"
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>[ View My Participant Pass ]</span>
            </button>
          </div>
        </div>
      )}

      {/* Auth / Eligibility Alerts */}
      {!currentUser && (
        <div className="bg-[#12131A] border border-[#282B3A] p-5 flex flex-col sm:flex-row items-center justify-between gap-4 rounded">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-[#F59E0B]" />
            <div className="text-xs text-[#F8FAFC]/90">
              Sign in with your registered Google account to view available range slots and book your firing ticket.
            </div>
          </div>
          <button
            onClick={loginWithGoogle}
            className="px-4 py-2 bg-[#DC2626] hover:bg-[#E51A1A] text-[#F8FAFC] font-mono text-xs uppercase tracking-widest font-semibold transition-colors shrink-0 rounded"
          >
            [ Sign In with Google ]
          </button>
        </div>
      )}

      {currentUser && !registration && (
        <div className="bg-red-950/40 border border-red-800/60 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 rounded">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
            <div className="text-xs text-red-200 space-y-1">
              <p className="font-bold text-sm text-[#F8FAFC]">Pre-Registration Record Required</p>
              <p>Your signed-in email (<span className="font-mono text-[#F8FAFC]">{currentUser.email}</span>) is not yet on the approved participant roster.</p>
            </div>
          </div>
          <button
            onClick={() => setOnboardingOpen(true)}
            className="px-4 py-2 bg-[#DC2626] hover:bg-[#E51A1A] text-[#F8FAFC] font-mono text-xs uppercase tracking-widest font-semibold shrink-0 rounded"
          >
            [ Complete Intake Form ]
          </button>
        </div>
      )}

      {/* Success Notification Banner */}
      {bookingSuccess && (
        <div className="bg-[#12131A] border border-emerald-500/50 p-6 space-y-4 rounded">
          <div className="flex items-center gap-3 text-emerald-400">
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <div>
              <h3 className="font-headline-sm text-xl text-[#F8FAFC] uppercase font-serif">Allocation Confirmed</h3>
              <p className="font-mono text-xs text-[#64748B]">
                {bookingSuccess.vertical} slot confirmed for {bookingSuccess.slotDateLabel} at {bookingSuccess.slotTimeLabel}
              </p>
            </div>
          </div>

          <div className="bg-[#0B0C10] p-4 border border-[#282B3A] flex flex-wrap items-center justify-between gap-4 rounded">
            <div>
              <span className="font-mono text-[10px] uppercase text-[#64748B] block">Assigned Ticket ID</span>
              <span className="font-mono text-xl font-bold text-[#F8FAFC]">{bookingSuccess.ticketId}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView('digital-pass')}
                className="px-4 py-2 bg-[#DC2626] hover:bg-[#E51A1A] text-[#F8FAFC] font-mono text-xs uppercase tracking-widest font-semibold flex items-center gap-2 rounded"
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>[ View Participant Pass ]</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Existing Booking in this Vertical */}
      {existingVerticalBooking && !bookingSuccess && (
        <div className="bg-[#12131A] border border-[#282B3A] p-6 space-y-4 rounded">
          <div className="flex items-center justify-between border-b border-[#282B3A] pb-3">
            <span className="font-mono text-xs uppercase text-emerald-400 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Active Allocation in {selectedVertical}
            </span>
            <span className="font-mono text-[11px] bg-[#1A1C26] px-2.5 py-0.5 border border-[#282B3A] text-[#64748B] rounded">
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
              <span className={`font-mono text-xs px-2 py-0.5 inline-block mt-0.5 rounded ${
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
              className="px-4 py-2 bg-[#DC2626] hover:bg-[#E51A1A] text-[#F8FAFC] font-mono text-xs uppercase tracking-widest font-semibold flex items-center gap-2 rounded"
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>[ Open Participant Pass ]</span>
            </button>
          </div>
        </div>
      )}

      {/* Available Slots Grid (Only when not already booked in this vertical and quota not exceeded) */}
      {!existingVerticalBooking && !hasReachedBookingLimit && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-[#64748B]">
              Scheduled {selectedVertical} Firing Relays
            </span>
            <span className="font-mono text-xs text-[#DC2626]">
              Capacity: {selectedVertical === 'Air Rifle' ? '40' : '16'} competitors / relay
            </span>
          </div>

          {loadingSlots ? (
            <div className="py-16 text-center font-mono text-xs text-[#64748B] tracking-wider">
              TELEMETRY: SYNCHRONIZING FIRING SCHEDULES...
            </div>
          ) : slots.length === 0 ? (
            <div className="bg-[#12131A] border border-[#282B3A] p-10 text-center space-y-3 rounded">
              <Calendar className="w-10 h-10 text-[#64748B] mx-auto opacity-40" />
              <p className="font-headline-sm text-lg text-[#F8FAFC] uppercase">No Range Slots Published Yet</p>
              <p className="font-mono text-xs text-[#64748B] max-w-md mx-auto">
                Firing schedules for {selectedVertical} are being calibrated by admins. Check back shortly.
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
                      const cap = slot.capacity ?? DEFAULT_SLOT_CAPACITY[selectedVertical];
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
                          className={`p-4 border text-left transition-all relative rounded ${
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
                            <span className={`font-mono text-[10px] px-1.5 py-0.5 uppercase tracking-wider font-semibold rounded ${
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
                            <div className="w-full bg-[#0B0C10] h-1.5 border border-[#282B3A] overflow-hidden rounded-full">
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
            <div className="sticky bottom-4 z-30 bg-[#12131A]/95 backdrop-blur-xl border border-[#DC2626] p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 rounded animate-fade-in">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-[#DC2626] font-bold">
                  TARGET RELAY SELECTED
                </div>
                <div className="font-mono text-base font-bold text-[#F8FAFC]">
                  {slots.find((s) => s.id === selectedSlotId)?.vertical} — {slots.find((s) => s.id === selectedSlotId)?.dateLabel} ({slots.find((s) => s.id === selectedSlotId)?.timeLabel})
                </div>
              </div>

              {bookingError && (
                <div className="font-mono text-xs text-[#EF4444] flex items-center gap-1.5 bg-red-950/40 px-3 py-1.5 border border-red-800 rounded">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{bookingError}</span>
                </div>
              )}

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setSelectedSlotId(null)}
                  className="px-4 py-2 border border-[#282B3A] hover:bg-[#1A1C26] font-mono text-xs text-[#64748B] hover:text-[#F8FAFC] uppercase tracking-wider transition-colors rounded"
                >
                  Cancel
                </button>
                <button
                  disabled={isSubmitting}
                  onClick={handleInitiateBooking}
                  className="px-6 py-2 bg-[#DC2626] hover:bg-[#E51A1A] text-[#F8FAFC] font-mono text-xs uppercase tracking-widest font-bold shadow-lg transition-all flex items-center gap-2 rounded"
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

      {/* Confirmation Warning Modal when booking a vertical different from registered vertical */}
      {showCrossVerticalWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#12131A] border-2 border-[#DC2626] max-w-lg w-full p-6 space-y-5 rounded shadow-2xl relative">
            <div className="flex items-start justify-between gap-3 border-b border-[#282B3A] pb-3">
              <div className="flex items-center gap-2.5 text-[#F59E0B]">
                <AlertTriangle className="w-6 h-6 text-[#DC2626]" />
                <h3 className="font-headline-sm text-lg font-serif text-[#F8FAFC] uppercase">
                  Discipline Switch Warning
                </h3>
              </div>
              <button
                onClick={() => setShowCrossVerticalWarning(false)}
                className="text-[#64748B] hover:text-[#F8FAFC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-[#0B0C10] border border-[#282B3A] space-y-3 font-mono text-xs rounded">
              <p className="text-[#F8FAFC] leading-relaxed text-sm">
                You registered for <strong className="text-[#DC2626]">{registeredVerticals.join(' / ')}</strong>, but you are attempting to book an <strong className="text-[#DC2626]">{selectedVertical}</strong> slot.
              </p>
              <p className="text-[#94A3B8] leading-relaxed">
                Are you sure you want to continue?
              </p>
              <div className="text-[11px] text-[#64748B] border-t border-[#282B3A] pt-2">
                Note: 1 Registration = 1 Slot Booking. Confirming this slot will use your registration quota.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCrossVerticalWarning(false)}
                className="px-4 py-2 border border-[#282B3A] hover:bg-[#1A1C26] font-mono text-xs uppercase tracking-wider text-[#64748B] hover:text-[#F8FAFC] rounded"
              >
                Go Back / Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={executeBookingTransaction}
                className="px-5 py-2 bg-[#DC2626] hover:bg-[#E51A1A] text-[#F8FAFC] font-mono text-xs uppercase tracking-widest font-bold shadow-lg transition-colors rounded"
              >
                {isSubmitting ? 'Confirming...' : 'Yes, Continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
