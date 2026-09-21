import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  getDocRef, 
  getColRef, 
  runTransaction, 
  serverTimestamp 
} from '../../lib/firebase';
import { 
  LAKSHYA_EVENT_ID, 
  DEFAULT_SLOT_CAPACITY,
  normalizeEmail, 
  deterministicBookingId,
  generateTicketId,
  generateQrToken 
} from '../../config/lakshya';
import type { Registration, Slot, Booking, LakshyaVertical } from '../../types/lakshya';
import { 
  UserPlus, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert, 
  Calendar, 
  Ticket 
} from 'lucide-react';

interface AdminAllocationsProps {
  registrations: Registration[];
  slots: Slot[];
  bookings: Booking[];
}

export default function AdminAllocations({ registrations, slots, bookings }: AdminAllocationsProps) {
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShooter, setSelectedShooter] = useState<Registration | null>(null);
  const [selectedVertical, setSelectedVertical] = useState<LakshyaVertical>('Air Rifle');
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [allowCapacityOverride, setAllowCapacityOverride] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter registrations based on search
  const filteredShooters = searchQuery.trim()
    ? registrations.filter((r) => 
        r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.email?.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 8)
    : [];

  // Available slots for the chosen vertical
  const availableSlots = slots.filter((s) => s.vertical === selectedVertical && s.isActive);

  // Registered verticals for selected shooter
  const allowedVerticals: LakshyaVertical[] = selectedShooter?.verticals && selectedShooter.verticals.length > 0
    ? selectedShooter.verticals
    : selectedShooter?.vertical === 'Both'
    ? ['Air Rifle', 'Air Pistol']
    : selectedShooter?.vertical
    ? [selectedShooter.vertical as LakshyaVertical]
    : ['Air Rifle', 'Air Pistol'];

  const isVerticalRegistered = !selectedShooter || allowedVerticals.includes(selectedVertical);

  // Check if selected shooter already has booking in chosen vertical
  const existingBooking = selectedShooter
    ? bookings.find(
        (b) => b.participantEmail.toLowerCase() === selectedShooter.email.toLowerCase() &&
               b.vertical === selectedVertical &&
               b.status === 'confirmed'
      )
    : null;

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShooter) {
      setStatusMessage({ type: 'error', text: 'Please search and select a registered participant.' });
      return;
    }
    if (!isVerticalRegistered) {
      setStatusMessage({ 
        type: 'error', 
        text: `Participant ${selectedShooter.name} is only registered for ${allowedVerticals.join(' & ')}.` 
      });
      return;
    }
    if (!selectedSlotId) {
      setStatusMessage({ type: 'error', text: 'Please select a firing slot.' });
      return;
    }

    setSubmitting(true);
    setStatusMessage(null);

    const cleanEmail = normalizeEmail(selectedShooter.email);
    const chosenSlot = slots.find((s) => s.id === selectedSlotId);
    if (!chosenSlot) {
      setStatusMessage({ type: 'error', text: 'Selected slot not found.' });
      setSubmitting(false);
      return;
    }

    const bookingId = deterministicBookingId(LAKSHYA_EVENT_ID, cleanEmail, selectedVertical);
    const regRef = getDocRef('registrations', cleanEmail);
    const slotRef = getDocRef('slots', selectedSlotId);
    const bookingRef = getDocRef('bookings', bookingId);
    const leaderboardRef = getDocRef('leaderboard_entries', bookingId);
    const auditRef = getDocRef('audit_logs', `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);

    try {
      await runTransaction(regRef.firestore, async (tx) => {
        const [regSnap, slotSnap, bookingSnap] = await Promise.all([
          tx.get(regRef),
          tx.get(slotRef),
          tx.get(bookingRef),
        ]);

        if (!regSnap.exists()) {
          throw new Error('Participant registration record not found in Firestore.');
        }

        if (!slotSnap.exists()) {
          throw new Error('Slot does not exist.');
        }

        if (bookingSnap.exists() && bookingSnap.data().status === 'confirmed') {
          throw new Error(`Participant already has a confirmed booking for ${selectedVertical}.`);
        }

        const slotData = slotSnap.data() as Slot;
        const currentBooked = slotData.booked ?? 0;
        const cap = slotData.capacity ?? DEFAULT_SLOT_CAPACITY[selectedVertical];

        if (!allowCapacityOverride && currentBooked >= cap) {
          throw new Error('This slot is full. Enable "Allow Capacity Override" if authorized to add an emergency lane.');
        }

        const ticketId = generateTicketId();
        const qrToken = generateQrToken();
        const now = serverTimestamp();

        const bookingDoc: any = {
          id: bookingId,
          eventId: LAKSHYA_EVENT_ID,
          participantEmail: cleanEmail,
          participantName: selectedShooter.name,
          vertical: selectedVertical,
          slotId: selectedSlotId,
          slotDateKey: slotData.dateKey,
          slotDateLabel: slotData.dateLabel,
          slotTimeLabel: slotData.timeLabel,
          ticketId,
          qrToken,
          bookingSource: 'admin',
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

        const leaderboardDoc: any = {
          id: bookingId,
          bookingId,
          participantEmail: cleanEmail,
          participantName: selectedShooter.name,
          vertical: selectedVertical,
          score: null,
          scoreStatus: 'pending',
          isDQ: false,
          lastScoreUpdatedAt: null,
          createdAt: now,
          updatedAt: now,
        };

        const auditDoc: any = {
          id: auditRef.id,
          action: 'MANUAL_ALLOCATION',
          entityType: 'booking',
          entityId: bookingId,
          actorEmail: currentUser?.email || 'admin',
          vertical: selectedVertical,
          metadata: {
            slotId: selectedSlotId,
            participantEmail: cleanEmail,
            allowCapacityOverride,
            ticketId,
          },
          createdAt: now,
        };

        tx.set(bookingRef, bookingDoc);
        tx.set(leaderboardRef, leaderboardDoc);
        tx.update(slotRef, {
          booked: currentBooked + 1,
          updatedAt: now,
        });
        tx.set(auditRef, auditDoc);
      });

      setStatusMessage({
        type: 'success',
        text: `Slot successfully allocated for ${selectedShooter.name} (${selectedVertical})!`,
      });
      setSelectedSlotId('');
      setAllowCapacityOverride(false);
    } catch (err: any) {
      console.error('Manual allocation failed:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Allocation failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-[#FAF7F2] border border-[#CFC6B6] rounded-xl p-6 shadow-sm space-y-6">
        <div className="border-b border-[#E8E0D2] pb-4">
          <span className="text-xs font-mono uppercase tracking-widest text-[#6F6A61] block">
            Administrative Range Override
          </span>
          <h2 className="text-2xl font-serif font-bold text-[#171717]">Manual Slot Allocation</h2>
        </div>

        {statusMessage && (
          <div
            className={`p-4 rounded-lg text-xs font-mono flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-[#315D4C]/10 border border-[#315D4C]/30 text-[#315D4C]'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleAllocate} className="space-y-6">
          {/* 1. Shooter Search */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase text-[#6F6A61] font-semibold block">
              1. Search Registered Competitor
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-[#6F6A61] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Type competitor name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#CFC6B6] rounded-lg text-xs font-medium text-[#171717] focus:outline-none focus:border-[#171717]"
              />
            </div>

            {/* Results dropdown */}
            {filteredShooters.length > 0 && (
              <div className="border border-[#CFC6B6] rounded-lg bg-white overflow-hidden shadow-md divide-y divide-[#E8E0D2]">
                {filteredShooters.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedShooter(s);
                      setSearchQuery('');
                      setStatusMessage(null);
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs hover:bg-[#E8E0D2]/50 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-[#171717]">{s.name}</span>
                      <span className="text-[11px] font-mono text-[#6F6A61] block">{s.email}</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-[#E8E0D2] rounded">
                      {s.cadetType || 'Participant'}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Selected Shooter Pill */}
            {selectedShooter && (
              <div className="p-3 bg-[#E8E0D2]/50 border border-[#CFC6B6] rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#6F6A61] block">Selected Shooter</span>
                  <div className="font-serif text-base font-bold text-[#171717]">{selectedShooter.name}</div>
                  <div className="text-xs font-mono text-[#6F6A61]">{selectedShooter.email}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedShooter(null)}
                  className="text-xs text-[#9B2C2C] hover:underline"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* 2. Choose Vertical */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase text-[#6F6A61] font-semibold block">
              2. Competition Discipline
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedVertical('Air Rifle');
                  setSelectedSlotId('');
                }}
                className={`py-2.5 px-4 rounded-lg text-xs font-semibold border transition-all text-center ${
                  selectedVertical === 'Air Rifle'
                    ? 'bg-[#171717] text-[#F3EEE3] border-[#171717]'
                    : 'bg-white border-[#CFC6B6] text-[#6F6A61] hover:bg-[#E8E0D2]'
                }`}
              >
                Air Rifle (40 Lanes)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedVertical('Air Pistol');
                  setSelectedSlotId('');
                }}
                className={`py-2.5 px-4 rounded-lg text-xs font-semibold border transition-all text-center ${
                  selectedVertical === 'Air Pistol'
                    ? 'bg-[#171717] text-[#F3EEE3] border-[#171717]'
                    : 'bg-white border-[#CFC6B6] text-[#6F6A61] hover:bg-[#E8E0D2]'
                }`}
              >
                Air Pistol (16 Lanes)
              </button>
            </div>

            {selectedShooter && !isVerticalRegistered && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Participant is NOT registered for {selectedVertical}. Registered vertical(s): {allowedVerticals.join(' & ')}.
                </span>
              </div>
            )}

            {existingBooking && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Notice: This shooter already holds an active booking in {selectedVertical} ({existingBooking.ticketId}).
                </span>
              </div>
            )}
          </div>

          {/* 3. Choose Slot */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase text-[#6F6A61] font-semibold block">
              3. Target Firing Slot
            </label>
            <select
              value={selectedSlotId}
              onChange={(e) => setSelectedSlotId(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-[#CFC6B6] rounded-lg text-xs font-medium text-[#171717] focus:outline-none focus:border-[#171717]"
            >
              <option value="">-- Choose active firing slot --</option>
              {availableSlots.map((s) => {
                const booked = s.booked ?? 0;
                const cap = s.capacity ?? DEFAULT_SLOT_CAPACITY[selectedVertical];
                const isFull = booked >= cap;
                return (
                  <option key={s.id} value={s.id}>
                    {s.dateLabel} | {s.timeLabel} ({booked}/{cap} booked) {isFull ? '[FULL]' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* 4. Capacity Override Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowCapacityOverride}
                onChange={(e) => setAllowCapacityOverride(e.target.checked)}
                className="mt-0.5 rounded border-[#CFC6B6] text-[#171717] focus:ring-0"
              />
              <span className="text-xs text-[#6F6A61]">
                <strong className="text-[#171717]">Allow Capacity Override:</strong> Check this if authorizing an emergency lane on a full slot. This action will be logged in the audit trail.
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-[#E8E0D2]">
            <button
              type="submit"
              disabled={submitting || !selectedShooter || !selectedSlotId || !!existingBooking}
              className="w-full py-3 bg-[#171717] hover:bg-[#333333] disabled:opacity-50 text-[#F3EEE3] font-semibold text-xs rounded-lg shadow transition-all flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4 text-[#E79A19]" />
              <span>{submitting ? 'Allocating Slot in Ledger...' : 'Confirm Manual Allocation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
