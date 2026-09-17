import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getDocRef, setDoc, updateDoc, serverTimestamp } from '../../lib/firebase';
import { normalizeEmail } from '../../config/lakshya';
import type { Registration, Booking } from '../../types/lakshya';
import { 
  Users, 
  Search, 
  UserPlus, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Filter, 
  UserX, 
  Check, 
  Upload 
} from 'lucide-react';

interface AdminRegistrationsProps {
  registrations: Registration[];
  bookings: Booking[];
}

export default function AdminRegistrations({ registrations, bookings }: AdminRegistrationsProps) {
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unbooked' | 'rifle' | 'pistol' | 'both'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New registration form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newGender, setNewGender] = useState('Male');
  const [newCadetType, setNewCadetType] = useState('SD/SW Cadet');
  const [submitting, setSubmitting] = useState(false);

  // Bulk import allowlist state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);

  // Map bookings to emails
  const activeBookings = bookings.filter((b) => b.status === 'confirmed');
  const rifleBooked = useMemo(
    () => new Set(activeBookings.filter((b) => b.vertical === 'Air Rifle').map((b) => b.participantEmail.toLowerCase())),
    [activeBookings]
  );
  const pistolBooked = useMemo(
    () => new Set(activeBookings.filter((b) => b.vertical === 'Air Pistol').map((b) => b.participantEmail.toLowerCase())),
    [activeBookings]
  );

  // Filtered registrations
  const filteredList = useMemo(() => {
    return registrations.filter((r) => {
      const email = r.email?.toLowerCase() || '';
      const name = r.name?.toLowerCase() || '';
      const q = searchQuery.toLowerCase();

      // Search match
      if (q && !email.includes(q) && !name.includes(q)) {
        return false;
      }

      const hasRifle = rifleBooked.has(email);
      const hasPistol = pistolBooked.has(email);

      if (activeFilter === 'unbooked') {
        return !hasRifle && !hasPistol;
      }
      if (activeFilter === 'rifle') {
        return hasRifle;
      }
      if (activeFilter === 'pistol') {
        return hasPistol;
      }
      if (activeFilter === 'both') {
        return hasRifle && hasPistol;
      }

      return true;
    });
  }, [registrations, searchQuery, activeFilter, rifleBooked, pistolBooked]);

  const handleToggleEligibility = async (reg: Registration) => {
    try {
      const regRef = getDocRef('registrations', normalizeEmail(reg.email));
      await updateDoc(regRef, {
        eligible: !reg.eligible,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Failed to update eligibility:", err);
      alert("Error updating participant eligibility.");
    }
  };

  const handleCreateRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newName.trim()) return;

    setSubmitting(true);
    const cleanEmail = normalizeEmail(newEmail);
    const regRef = getDocRef('registrations', cleanEmail);

    try {
      await setDoc(regRef, {
        id: cleanEmail,
        name: newName.trim(),
        email: cleanEmail,
        googleUid: null,
        gender: newGender,
        cadetType: newCadetType,
        source: 'manual',
        eligible: true,
        registeredAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setShowAddModal(false);
      setNewName('');
      setNewEmail('');
    } catch (err) {
      console.error("Failed to add registration:", err);
      alert("Error adding registration document.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim()) return;

    setBulkProcessing(true);
    setBulkMessage(null);

    const lines = bulkText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let count = 0;
    let errors = 0;

    for (const line of lines) {
      // Parse formats: email OR name, email OR name, email, gender
      let name = 'Participant';
      let email = '';
      let gender = 'Male';

      if (line.includes(',')) {
        const parts = line.split(',').map((p) => p.trim());
        if (parts[0].includes('@')) {
          email = normalizeEmail(parts[0]);
          if (parts[1]) name = parts[1];
          if (parts[2]) gender = parts[2];
        } else {
          name = parts[0];
          email = normalizeEmail(parts[1] || '');
          if (parts[2]) gender = parts[2];
        }
      } else {
        email = normalizeEmail(line);
        name = email.split('@')[0].replace(/[._]/g, ' ');
      }

      if (email && email.includes('@')) {
        try {
          const regRef = getDocRef('registrations', email);
          await setDoc(regRef, {
            id: email,
            name,
            email,
            gender,
            cadetType: 'SD/SW Cadet',
            source: 'imported',
            eligible: true,
            registeredAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true });
          count++;
        } catch (err) {
          console.error("Failed to import row:", line, err);
          errors++;
        }
      }
    }

    setBulkProcessing(false);
    setBulkMessage(`Successfully imported and allowlisted ${count} emails${errors > 0 ? ` (${errors} failed)` : ''}!`);
    if (errors === 0) {
      setBulkText('');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Filter and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#6F6A61] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search roster by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#FAF7F2] border border-[#CFC6B6] rounded-lg text-xs font-medium text-[#171717] focus:outline-none focus:border-[#171717]"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-4 py-2 bg-[#FAF7F2] border border-[#CFC6B6] hover:bg-[#E8E0D2] text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm text-[#171717]"
          >
            <Upload className="w-4 h-4 text-[#E79A19]" />
            <span>Bulk Import Allowlist</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-[#171717] text-[#F3EEE3] hover:bg-[#333333] text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm"
          >
            <UserPlus className="w-4 h-4 text-[#E79A19]" />
            <span>Add Single Shooter</span>
          </button>
        </div>
      </div>

      {/* Segmented Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeFilter === 'all'
              ? 'bg-[#171717] text-[#F3EEE3]'
              : 'bg-[#FAF7F2] border border-[#CFC6B6] text-[#6F6A61] hover:bg-[#E8E0D2]'
          }`}
        >
          All Registrations ({registrations.length})
        </button>

        <button
          onClick={() => setActiveFilter('unbooked')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
            activeFilter === 'unbooked'
              ? 'bg-[#9B2C2C] text-white shadow-sm'
              : 'bg-[#FAF7F2] border border-[#CFC6B6] text-[#9B2C2C] hover:bg-red-50'
          }`}
        >
          <UserX className="w-3.5 h-3.5" />
          <span>Registered but Unbooked</span>
        </button>

        <button
          onClick={() => setActiveFilter('rifle')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeFilter === 'rifle'
              ? 'bg-[#171717] text-[#F3EEE3]'
              : 'bg-[#FAF7F2] border border-[#CFC6B6] text-[#6F6A61] hover:bg-[#E8E0D2]'
          }`}
        >
          Air Rifle Booked ({rifleBooked.size})
        </button>

        <button
          onClick={() => setActiveFilter('pistol')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeFilter === 'pistol'
              ? 'bg-[#171717] text-[#F3EEE3]'
              : 'bg-[#FAF7F2] border border-[#CFC6B6] text-[#6F6A61] hover:bg-[#E8E0D2]'
          }`}
        >
          Air Pistol Booked ({pistolBooked.size})
        </button>

        <button
          onClick={() => setActiveFilter('both')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeFilter === 'both'
              ? 'bg-[#171717] text-[#F3EEE3]'
              : 'bg-[#FAF7F2] border border-[#CFC6B6] text-[#6F6A61] hover:bg-[#E8E0D2]'
          }`}
        >
          Dual Discipline Booked
        </button>
      </div>

      {/* Registrations Table */}
      <div className="bg-[#FAF7F2] border border-[#CFC6B6] rounded-xl overflow-hidden shadow-sm">
        {filteredList.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Users className="w-8 h-8 text-[#6F6A61] mx-auto opacity-50" />
            <p className="font-serif text-lg text-[#171717]">No participants found</p>
            <p className="text-xs text-[#6F6A61]">Try adjusting your search query or filter mode.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#E8E0D2] border-b border-[#CFC6B6] font-mono text-[#6F6A61] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Shooter Details</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Discipline Bookings</th>
                  <th className="py-3 px-4">Eligibility</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E0D2]">
                {filteredList.map((reg, idx) => {
                  const email = reg.email.toLowerCase();
                  const hasRifle = rifleBooked.has(email);
                  const hasPistol = pistolBooked.has(email);

                  return (
                    <tr key={reg.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                      <td className="py-3 px-4 font-mono text-[#6F6A61]">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#171717] font-serif text-sm">
                          {reg.name}
                        </div>
                        <span className="text-[11px] font-mono text-[#6F6A61] block">
                          {reg.email}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-[#E8E0D2] rounded text-[#171717]">
                          {reg.cadetType || 'Standard'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {hasRifle ? (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#315D4C] text-white">
                              Air Rifle
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#E8E0D2] text-[#6F6A61]">
                              No Rifle
                            </span>
                          )}

                          {hasPistol ? (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#315D4C] text-white">
                              Air Pistol
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#E8E0D2] text-[#6F6A61]">
                              No Pistol
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded inline-flex items-center gap-1 ${
                          reg.eligible ? 'bg-[#315D4C]/15 text-[#315D4C]' : 'bg-red-100 text-red-700'
                        }`}>
                          {reg.eligible ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          <span>{reg.eligible ? 'Eligible' : 'Blocked'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleToggleEligibility(reg)}
                          className="text-[11px] font-mono text-[#6F6A61] hover:text-[#171717] underline"
                        >
                          {reg.eligible ? 'Revoke' : 'Authorize'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add Shooter */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#FAF7F2] border border-[#CFC6B6] rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E0D2] pb-3">
              <h3 className="font-serif text-xl font-bold text-[#171717]">Add Shooter to Intake Roster</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#6F6A61] hover:text-[#171717]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRegistration} className="space-y-4 text-xs">
              <div>
                <label className="font-mono text-[#6F6A61] uppercase block mb-1">Full Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Cadet Rahul Sharma"
                  className="w-full p-2.5 bg-white border border-[#CFC6B6] rounded font-medium text-[#171717]"
                  required
                />
              </div>

              <div>
                <label className="font-mono text-[#6F6A61] uppercase block mb-1">Google Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. rahul.sharma@example.com"
                  className="w-full p-2.5 bg-white border border-[#CFC6B6] rounded font-medium text-[#171717]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-mono text-[#6F6A61] uppercase block mb-1">Gender</label>
                  <select
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#CFC6B6] rounded font-medium"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="font-mono text-[#6F6A61] uppercase block mb-1">Cadet Category</label>
                  <select
                    value={newCadetType}
                    onChange={(e) => setNewCadetType(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#CFC6B6] rounded font-medium"
                  >
                    <option value="SD/SW Cadet">SD/SW Cadet</option>
                    <option value="JD/JW Cadet">JD/JW Cadet</option>
                    <option value="Civilian/Student">Civilian/Student</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E8E0D2] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-[#CFC6B6] rounded hover:bg-[#E8E0D2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#171717] text-[#F3EEE3] rounded font-semibold hover:bg-[#333333]"
                >
                  {submitting ? 'Registering...' : 'Add Shooter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Bulk Import Allowlist */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#FAF7F2] border border-[#CFC6B6] rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E0D2] pb-3">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#171717]">Bulk Import Email Allowlist</h3>
                <p className="text-xs text-[#6F6A61]">Paste verified participant emails to permit slot booking.</p>
              </div>
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkMessage(null);
                }}
                className="text-[#6F6A61] hover:text-[#171717]"
              >
                ✕
              </button>
            </div>

            {bulkMessage && (
              <div className="p-3 bg-[#315D4C]/15 border border-[#315D4C] text-[#315D4C] text-xs font-mono rounded flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{bulkMessage}</span>
              </div>
            )}

            <form onSubmit={handleBulkImport} className="space-y-4 text-xs">
              <div>
                <label className="font-mono text-[#6F6A61] uppercase block mb-1">
                  Emails List (One per line, or Name, Email, Gender)
                </label>
                <textarea
                  rows={8}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`cadet.rahul@rvce.edu.in\ncadet.ananya@gmail.com\nVikram Singh, vikram@rvce.edu.in, Male\nPooja Hegde, pooja@rvce.edu.in, Female`}
                  className="w-full p-3 bg-white border border-[#CFC6B6] rounded font-mono text-xs text-[#171717] focus:outline-none focus:border-[#171717]"
                  required
                />
                <span className="text-[11px] text-[#6F6A61] block mt-1">
                  Supports plain emails or CSV rows (`Name, Email, Gender`). All imported emails will be marked as eligible for slot booking.
                </span>
              </div>

              <div className="pt-3 border-t border-[#E8E0D2] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkModal(false);
                    setBulkMessage(null);
                  }}
                  className="px-4 py-2 border border-[#CFC6B6] rounded hover:bg-[#E8E0D2]"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={bulkProcessing}
                  className="px-5 py-2 bg-[#171717] text-[#F3EEE3] rounded font-semibold hover:bg-[#333333] flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4 text-[#E79A19]" />
                  <span>{bulkProcessing ? 'Importing...' : 'Authorize & Import List'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
