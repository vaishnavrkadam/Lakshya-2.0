import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  getDocRef, 
  getColRef, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp 
} from '../../lib/firebase';
import { 
  LAKSHYA_EVENT_ID, 
  DEFAULT_SLOT_CAPACITY, 
  EVENT_DATES, 
  OFFICIAL_SCHEDULE_BY_DATE 
} from '../../config/lakshya';
import type { Slot, Booking, LakshyaVertical } from '../../types/lakshya';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Users, 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  AlertCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

interface AdminSlotsProps {
  slots: Slot[];
  bookings: Booking[];
}

export default function AdminSlots({ slots, bookings }: AdminSlotsProps) {
  const { currentUser } = useAuth();
  const [selectedVertical, setSelectedVertical] = useState<string>('All');
  const [expandedSlotId, setExpandedSlotId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // New slot form state
  const [newVertical, setNewVertical] = useState<LakshyaVertical>('Air Rifle');
  const [newDateKey, setNewDateKey] = useState<string>('2026-09-26');
  const [newDateLabel, setNewDateLabel] = useState<string>('26 September 2026');
  const [newTimeLabel, setNewTimeLabel] = useState<string>('07:30–09:00');
  const [newCapacity, setNewCapacity] = useState<number>(DEFAULT_SLOT_CAPACITY['Air Rifle']);
  const [newStartMinutes, setNewStartMinutes] = useState<number>(450);
  const [savingSlot, setSavingSlot] = useState<boolean>(false);

  // Filter slots
  const filteredSlots = slots.filter((s) => 
    selectedVertical === 'All' ? true : s.vertical === selectedVertical
  );

  // Sort slots
  filteredSlots.sort((a, b) => {
    if (a.dateKey !== b.dateKey) return a.dateKey.localeCompare(b.dateKey);
    return (a.sortOrder ?? a.startMinutes ?? 0) - (b.sortOrder ?? b.startMinutes ?? 0);
  });

  const handleToggleActive = async (slot: Slot) => {
    try {
      const slotRef = getDocRef('slots', slot.id);
      await updateDoc(slotRef, {
        isActive: !slot.isActive,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Failed to toggle slot:", err);
      alert("Error updating slot state.");
    }
  };

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSlot(true);

    const verticalKey = newVertical.toLowerCase().replace(/\s+/g, '-');
    const slotId = `${LAKSHYA_EVENT_ID}_${newDateKey}_${verticalKey}_${newStartMinutes}`;
    const slotRef = getDocRef('slots', slotId);

    try {
      await setDoc(slotRef, {
        id: slotId,
        eventId: LAKSHYA_EVENT_ID,
        vertical: newVertical,
        dateKey: newDateKey,
        dateLabel: newDateLabel,
        timeLabel: newTimeLabel,
        startMinutes: Number(newStartMinutes),
        endMinutes: Number(newStartMinutes) + 60,
        capacity: Number(newCapacity),
        booked: 0,
        isActive: true,
        sortOrder: Number(newStartMinutes),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setShowCreateModal(false);
    } catch (err) {
      console.error("Error creating slot:", err);
      alert("Failed to create slot document.");
    } finally {
      setSavingSlot(false);
    }
  };

  // Official Seed helper for 2-day schedule (26th Sept: 7 slots, 27th Sept: 6 slots; Rifle: 40, Pistol: 16)
  const handleSeedStandardSlots = async () => {
    if (!window.confirm("Initialize official 2-day schedule for 26th & 27th September?\n- 26 Sept: 7 slots (07:30–16:00, lunch omitted)\n- 27 Sept: 6 slots (07:30–15:00, lunch omitted, finals excluded)\n- Air Rifle Capacity: 40 lanes | Air Pistol Capacity: 16 lanes")) {
      return;
    }

    try {
      for (const day of EVENT_DATES) {
        const daySlots = OFFICIAL_SCHEDULE_BY_DATE[day.dateKey] || [];
        for (const t of daySlots) {
          // Air Rifle slot (Capacity 40)
          const rifleCap = DEFAULT_SLOT_CAPACITY['Air Rifle'];
          const rifleId = `${LAKSHYA_EVENT_ID}_${day.dateKey}_air-rifle_${t.startMinutes}`;
          await setDoc(getDocRef('slots', rifleId), {
            id: rifleId,
            eventId: LAKSHYA_EVENT_ID,
            vertical: 'Air Rifle',
            dateKey: day.dateKey,
            dateLabel: day.dateLabel,
            timeLabel: t.timeLabel,
            startMinutes: t.startMinutes,
            endMinutes: t.endMinutes,
            capacity: rifleCap,
            booked: 0,
            isActive: true,
            sortOrder: t.startMinutes,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true });

          // Air Pistol slot (Capacity 16)
          const pistolCap = DEFAULT_SLOT_CAPACITY['Air Pistol'];
          const pistolId = `${LAKSHYA_EVENT_ID}_${day.dateKey}_air-pistol_${t.startMinutes}`;
          await setDoc(getDocRef('slots', pistolId), {
            id: pistolId,
            eventId: LAKSHYA_EVENT_ID,
            vertical: 'Air Pistol',
            dateKey: day.dateKey,
            dateLabel: day.dateLabel,
            timeLabel: t.timeLabel,
            startMinutes: t.startMinutes,
            endMinutes: t.endMinutes,
            capacity: pistolCap,
            booked: 0,
            isActive: true,
            sortOrder: t.startMinutes,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
      }

      alert("Official 2-day schedule generated successfully! (Air Rifle: 40 lanes, Air Pistol: 16 lanes)");
    } catch (err) {
      console.error("Failed to seed slots:", err);
      alert("Error seeding slots.");
    }
  };

  const handleDeleteSlot = async (slot: Slot) => {
    if (slot.booked > 0) {
      if (!window.confirm(`Caution: This slot currently has ${slot.booked} booking(s). Deleting it may orphan bookings. Continue?`)) {
        return;
      }
    } else if (!window.confirm(`Are you sure you want to delete ${slot.vertical} - ${slot.timeLabel} (${slot.dateLabel})?`)) {
      return;
    }

    try {
      await deleteDoc(getDocRef('slots', slot.id));
      alert("Slot deleted successfully.");
    } catch (err) {
      console.error("Failed to delete slot:", err);
      alert("Failed to delete slot.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Filter buttons */}
        <div className="inline-flex p-1 bg-[#E8E0D2] rounded-lg border border-[#CFC6B6]">
          {['All', 'Air Rifle', 'Air Pistol'].map((v) => (
            <button
              key={v}
              onClick={() => setSelectedVertical(v)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                selectedVertical === v
                  ? 'bg-[#171717] text-[#F3EEE3] shadow-sm'
                  : 'text-[#6F6A61] hover:text-[#171717]'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {slots.length === 0 && (
            <button
              onClick={handleSeedStandardSlots}
              className="px-3.5 py-2 border border-[#CFC6B6] bg-[#FAF7F2] hover:bg-[#E8E0D2] text-xs font-medium rounded-lg text-[#171717]"
            >
              Seed Standard Schedule
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-[#171717] text-[#F3EEE3] hover:bg-[#333333] text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4 text-[#E79A19]" />
            <span>Create New Slot</span>
          </button>
        </div>
      </div>

      {/* Slots Table */}
      <div className="bg-[#FAF7F2] border border-[#CFC6B6] rounded-xl overflow-hidden shadow-sm">
        {filteredSlots.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Calendar className="w-8 h-8 text-[#6F6A61] mx-auto opacity-50" />
            <p className="font-serif text-lg text-[#171717]">No slots match your selection</p>
            <p className="text-xs text-[#6F6A61]">
              Click "Create New Slot" or "Seed Standard Schedule" to establish firing windows.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E8E0D2]">
            {filteredSlots.map((slot) => {
              const slotBookings = bookings.filter(
                (b) => b.slotId === slot.id && b.status === 'confirmed'
              );
              const bookedCount = slotBookings.length;
              const cap = slot.capacity || DEFAULT_SLOT_CAPACITY[slot.vertical as LakshyaVertical] || 40;
              const isExpanded = expandedSlotId === slot.id;
              const pct = cap > 0 ? Math.round((bookedCount / cap) * 100) : 0;

              return (
                <div key={slot.id} className="transition-colors hover:bg-[#FAF7F2]/50">
                  <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Time & Vertical */}
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-[#E8E0D2] flex items-center justify-center font-mono text-xs font-bold text-[#171717] shrink-0">
                        {slot.vertical === 'Air Rifle' ? 'AR' : 'AP'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-serif text-base font-bold text-[#171717]">
                            {slot.timeLabel}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-[#E8E0D2] rounded text-[#171717]">
                            {slot.vertical}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-[#6F6A61] block">
                          {slot.dateLabel}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Occupancy Bar */}
                    <div className="w-full md:w-64 space-y-1.5">
                      <div className="flex justify-between text-xs font-mono text-[#6F6A61]">
                        <span>Booked: {bookedCount} / {cap}</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full bg-[#E8E0D2] h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            pct >= 100 ? 'bg-red-500' : 'bg-[#315D4C]'
                          }`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Right: State & Actions */}
                    <div className="flex items-center gap-3 self-end md:self-auto">
                      <button
                        onClick={() => handleToggleActive(slot)}
                        title={slot.isActive ? 'Disable Slot' : 'Enable Slot'}
                        className={`text-xs font-mono px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
                          slot.isActive
                            ? 'bg-[#315D4C]/15 text-[#315D4C]'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {slot.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        <span>{slot.isActive ? 'Active' : 'Disabled'}</span>
                      </button>

                      <button
                        onClick={() => handleDeleteSlot(slot)}
                        title="Delete Slot"
                        className="px-2.5 py-1 text-xs font-mono text-red-600 hover:bg-red-50 hover:border-red-400 rounded border border-red-200 transition-colors"
                      >
                        Delete
                      </button>

                      <button
                        onClick={() => setExpandedSlotId(isExpanded ? null : slot.id)}
                        className="px-3 py-1 border border-[#CFC6B6] bg-white hover:bg-[#E8E0D2] text-xs font-medium rounded flex items-center gap-1"
                      >
                        <Users className="w-3.5 h-3.5 text-[#E79A19]" />
                        <span>Roster ({slotBookings.length})</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Roster Accordion */}
                  {isExpanded && (
                    <div className="bg-[#E8E0D2]/40 p-4 border-t border-[#E8E0D2] space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between text-xs font-mono uppercase text-[#6F6A61] font-semibold">
                        <span>Slot Roster — {slot.timeLabel} ({slot.vertical})</span>
                        <span>Total Shooters: {slotBookings.length}</span>
                      </div>

                      {slotBookings.length === 0 ? (
                        <p className="text-xs text-[#6F6A61] italic py-2">
                          No shooters have booked this slot yet.
                        </p>
                      ) : (
                        <div className="bg-white border border-[#CFC6B6] rounded-lg overflow-hidden">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-[#FAF7F2] border-b border-[#E8E0D2] font-mono text-[#6F6A61]">
                              <tr>
                                <th className="py-2 px-3">#</th>
                                <th className="py-2 px-3">Shooter Name</th>
                                <th className="py-2 px-3">Email</th>
                                <th className="py-2 px-3">Ticket ID</th>
                                <th className="py-2 px-3 text-right">Attendance</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E8E0D2]">
                              {slotBookings.map((b, idx) => (
                                <tr key={b.id} className="hover:bg-[#FAF7F2]">
                                  <td className="py-2 px-3 font-mono text-[#6F6A61]">{idx + 1}</td>
                                  <td className="py-2 px-3 font-semibold text-[#171717]">{b.participantName}</td>
                                  <td className="py-2 px-3 font-mono text-[#6F6A61]">{b.participantEmail}</td>
                                  <td className="py-2 px-3 font-mono font-bold text-[#171717]">{b.ticketId}</td>
                                  <td className="py-2 px-3 text-right">
                                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                                      b.checkedIn ? 'bg-[#315D4C] text-white' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {b.checkedIn ? 'Checked In' : 'Pending'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Create New Slot */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#FAF7F2] border border-[#CFC6B6] rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E0D2] pb-3">
              <h3 className="font-serif text-xl font-bold text-[#171717]">Create New Firing Slot</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#6F6A61] hover:text-[#171717]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSlot} className="space-y-4 text-xs">
              <div>
                <label className="font-mono text-[#6F6A61] uppercase block mb-1">Discipline Vertical</label>
                <select
                  value={newVertical}
                  onChange={(e) => {
                    const v = e.target.value as LakshyaVertical;
                    setNewVertical(v);
                    setNewCapacity(DEFAULT_SLOT_CAPACITY[v]);
                  }}
                  className="w-full p-2 bg-white border border-[#CFC6B6] rounded font-medium"
                >
                  <option value="Air Rifle">Air Rifle</option>
                  <option value="Air Pistol">Air Pistol</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-mono text-[#6F6A61] uppercase block mb-1">Date Key (YYYY-MM-DD)</label>
                  <input
                    type="date"
                    value={newDateKey}
                    onChange={(e) => setNewDateKey(e.target.value)}
                    className="w-full p-2 bg-white border border-[#CFC6B6] rounded font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="font-mono text-[#6F6A61] uppercase block mb-1">Date Label</label>
                  <input
                    type="text"
                    value={newDateLabel}
                    onChange={(e) => setNewDateLabel(e.target.value)}
                    className="w-full p-2 bg-white border border-[#CFC6B6] rounded font-medium"
                    placeholder="26 September 2026"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-mono text-[#6F6A61] uppercase block mb-1">Time Label</label>
                  <input
                    type="text"
                    value={newTimeLabel}
                    onChange={(e) => setNewTimeLabel(e.target.value)}
                    className="w-full p-2 bg-white border border-[#CFC6B6] rounded font-medium"
                    placeholder="08:00 - 09:00 HRS"
                    required
                  />
                </div>
                <div>
                  <label className="font-mono text-[#6F6A61] uppercase block mb-1">Start (Minutes from 00:00)</label>
                  <input
                    type="number"
                    value={newStartMinutes}
                    onChange={(e) => setNewStartMinutes(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-[#CFC6B6] rounded font-medium"
                    placeholder="480 (for 08:00)"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-mono text-[#6F6A61] uppercase block mb-1">Lane Capacity</label>
                <input
                  type="number"
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(Number(e.target.value))}
                  className="w-full p-2 bg-white border border-[#CFC6B6] rounded font-medium"
                  required
                />
              </div>

              <div className="pt-3 border-t border-[#E8E0D2] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-[#CFC6B6] rounded hover:bg-[#E8E0D2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSlot}
                  className="px-5 py-2 bg-[#171717] text-[#F3EEE3] rounded font-semibold hover:bg-[#333333]"
                >
                  {savingSlot ? 'Saving...' : 'Save Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
