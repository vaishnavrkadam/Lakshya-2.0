import React, { useState, useMemo } from 'react';
import { getDocRef, setDoc, updateDoc, deleteDoc, runTransaction, serverTimestamp } from '../../lib/firebase';
import { normalizeEmail } from '../../config/lakshya';
import { useAuth } from '../../context/AuthContext';
import type { Registration, Booking, LakshyaVertical } from '../../types/lakshya';
import { 
  Users, 
  Search, 
  Upload, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  UserCheck, 
  UserX, 
  Filter, 
  Download,
  AlertCircle,
  GraduationCap,
  Award,
  Trash2
} from 'lucide-react';
import { downloadCertificatePdf } from '../../lib/certificates';

interface AdminRegistrationsProps {
  registrations: Registration[];
  bookings: Booking[];
}

export default function AdminRegistrations({ registrations, bookings }: AdminRegistrationsProps) {
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unbooked' | 'rifle' | 'pistol' | 'both'>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);

  // Add individual shooter form
  const [newName, setNewName] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newRvceEmail, setNewRvceEmail] = useState<string>('');
  const [newUsn, setNewUsn] = useState<string>('');
  const [newBranch, setNewBranch] = useState<string>('');
  const [newYear, setNewYear] = useState<string>('1st Year');
  const [newGender, setNewGender] = useState<string>('Male');
  const [newVertical, setNewVertical] = useState<'Air Rifle' | 'Air Pistol' | 'Both'>('Air Rifle');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Bulk import form
  const [bulkText, setBulkText] = useState<string>('');
  const [bulkProcessing, setBulkProcessing] = useState<boolean>(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);

  // Map participant bookings
  const { rifleBooked, pistolBooked } = useMemo(() => {
    const rifle = new Set<string>();
    const pistol = new Set<string>();

    bookings.forEach((b) => {
      if (b.status === 'confirmed') {
        const em = b.participantEmail.toLowerCase();
        if (b.vertical === 'Air Rifle') rifle.add(em);
        if (b.vertical === 'Air Pistol') pistol.add(em);
      }
    });

    return { rifleBooked: rifle, pistolBooked: pistol };
  }, [bookings]);

  // Genuine distinct registrations (excluding alias pointer docs)
  const distinctRegistrations = useMemo(() => {
    const seenEmails = new Set<string>();
    return registrations.filter((reg) => {
      // Exclude alias documents created as secondary pointers
      if ((reg as any).isAlias) return false;
      const em = (reg.email || reg.id || '').toLowerCase().trim();
      if (!em || seenEmails.has(em)) return false;
      seenEmails.add(em);
      return true;
    });
  }, [registrations]);

  // Filtered registrations list by search query and active tab
  const filteredList = useMemo(() => {
    return distinctRegistrations.filter((reg) => {
      const email = (reg.email || reg.id || '').toLowerCase().trim();
      const name = (reg.name || '').toLowerCase().trim();
      const usn = (reg.usn || '').toLowerCase().trim();
      const branch = (reg.branch || '').toLowerCase().trim();
      const q = searchQuery.toLowerCase().trim();

      if (q && !email.includes(q) && !name.includes(q) && !usn.includes(q) && !branch.includes(q)) {
        return false;
      }

      const hasRifle = rifleBooked.has(email) || (reg.rvceEmail && rifleBooked.has(reg.rvceEmail.toLowerCase()));
      const hasPistol = pistolBooked.has(email) || (reg.rvceEmail && pistolBooked.has(reg.rvceEmail.toLowerCase()));

      if (activeFilter === 'unbooked' && (hasRifle || hasPistol)) return false;
      if (activeFilter === 'rifle' && !hasRifle) return false;
      if (activeFilter === 'pistol' && !hasPistol) return false;
      if (activeFilter === 'both' && (!hasRifle || !hasPistol)) return false;

      return true;
    });
  }, [distinctRegistrations, searchQuery, activeFilter, rifleBooked, pistolBooked]);

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

  const handleAddVertical = async (reg: Registration, verticalToAdd: LakshyaVertical) => {
    try {
      const cleanEmail = normalizeEmail(reg.email);
      const regRef = getDocRef('registrations', cleanEmail);
      const currentVerts = new Set<LakshyaVertical>(
        Array.isArray(reg.verticals) && reg.verticals.length > 0
          ? (reg.verticals as LakshyaVertical[])
          : (reg.vertical === 'Both' ? ['Air Rifle', 'Air Pistol'] : [reg.vertical === 'Air Pistol' ? 'Air Pistol' : 'Air Rifle'])
      );
      currentVerts.add(verticalToAdd);
      const finalVerts = Array.from(currentVerts);
      await updateDoc(regRef, {
        verticals: finalVerts,
        vertical: finalVerts.length > 1 ? 'Both' : finalVerts[0],
        updatedAt: serverTimestamp(),
      });
    } catch (err: any) {
      alert("Failed to update verticals: " + (err.message || err));
    }
  };

  const handleCreateRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newName.trim()) return;

    setSubmitting(true);
    const cleanEmail = normalizeEmail(newEmail);
    const cleanRvce = newRvceEmail.trim() ? normalizeEmail(newRvceEmail) : '';
    const regRef = getDocRef('registrations', cleanEmail);

    const existingShooter = registrations.find(
      (r) => r.email.toLowerCase() === cleanEmail || r.id.toLowerCase() === cleanEmail
    );
    const combinedVerts = new Set<LakshyaVertical>();
    if (existingShooter) {
      if (Array.isArray(existingShooter.verticals) && existingShooter.verticals.length > 0) {
        existingShooter.verticals.forEach((v) => combinedVerts.add(v));
      } else if (existingShooter.vertical === 'Both') {
        combinedVerts.add('Air Rifle');
        combinedVerts.add('Air Pistol');
      } else if (existingShooter.vertical) {
        combinedVerts.add(existingShooter.vertical as LakshyaVertical);
      }
    }

    if (newVertical === 'Both') {
      combinedVerts.add('Air Rifle');
      combinedVerts.add('Air Pistol');
    } else {
      combinedVerts.add(newVertical);
    }

    const verts: LakshyaVertical[] = Array.from(combinedVerts);
    const resolvedVertical: 'Air Rifle' | 'Air Pistol' | 'Both' =
      verts.length > 1 ? 'Both' : (verts[0] || 'Air Rifle');

    const regData: Partial<Registration> = {
      id: cleanEmail,
      name: newName.trim(),
      email: cleanEmail,
      rvceEmail: cleanRvce || cleanEmail,
      usn: newUsn.trim().toUpperCase() || '',
      branch: newBranch.trim().toUpperCase() || '',
      yearOfStudy: newYear || '1st Year',
      gender: newGender,
      vertical: resolvedVertical,
      verticals: verts,
      college: 'RVCE',
      source: 'manual',
      eligible: true,
      registeredAt: existingShooter?.registeredAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(regRef, regData, { merge: true });

      setShowAddModal(false);
      setNewName('');
      setNewEmail('');
      setNewRvceEmail('');
      setNewUsn('');
      setNewBranch('');
      setNewVertical('Air Rifle');
    } catch (err) {
      console.error("Failed to add registration:", err);
      alert("Error adding registration document.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRegistration = async (reg: Registration) => {
    const cleanEmail = normalizeEmail(reg.email);
    if (!window.confirm(`Are you sure you want to permanently delete competitor "${reg.name}" (${cleanEmail})? This will cancel their bookings, restore slot availability, and revoke their access.`)) {
      return;
    }

    try {
      // 1. Delete main registration doc
      await deleteDoc(getDocRef('registrations', cleanEmail));

      // 2. Delete alternate alias doc if present
      if (reg.rvceEmail && normalizeEmail(reg.rvceEmail) !== cleanEmail) {
        try {
          await deleteDoc(getDocRef('registrations', normalizeEmail(reg.rvceEmail)));
        } catch (_) {}
      }

      // 3. Cancel and delete all user bookings and restore slot capacities
      const userBookings = bookings.filter(
        (b) => b.participantEmail.toLowerCase() === cleanEmail && b.status === 'confirmed'
      );

      for (const b of userBookings) {
        try {
          await deleteDoc(getDocRef('bookings', b.id));
          await deleteDoc(getDocRef('leaderboard_entries', b.id));
          if (b.slotId) {
            const slotRef = getDocRef('slots', b.slotId);
            runTransaction(slotRef.firestore, async (tx) => {
              const snap = await tx.get(slotRef);
              if (snap.exists()) {
                const currentBooked = snap.data().booked ?? 0;
                tx.update(slotRef, {
                  booked: Math.max(0, currentBooked - 1),
                  updatedAt: serverTimestamp(),
                });
              }
            }).catch(console.error);
          }
        } catch (err) {
          console.error("Error cleaning up booking for deleted user:", err);
        }
      }

      // 4. Record audit log
      const auditRef = getDocRef('audit_logs', `audit_del_reg_${Date.now()}`);
      await setDoc(auditRef, {
        id: auditRef.id,
        action: 'REGISTRATION_DELETED',
        entityType: 'registration',
        entityId: cleanEmail,
        actorEmail: currentUser?.email || 'admin',
        metadata: {
          name: reg.name,
          email: cleanEmail,
          cancelledBookingsCount: userBookings.length,
        },
        createdAt: serverTimestamp(),
      });
    } catch (err: any) {
      console.error("Failed to delete competitor:", err);
      alert("Error deleting competitor: " + (err.message || err));
    }
  };

  // CSV parsing helper handling quoted cells
  const parseCsvLine = (line: string): string[] => {
    const pattern = /(".*?"|[^",\r\n]*)(?:,|\r?\n|$)/g;
    const result: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(line)) !== null) {
      if (match.index === pattern.lastIndex) pattern.lastIndex++;
      if (match[1] !== undefined) {
        let val = match[1].trim();
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1).replace(/""/g, '"').trim();
        }
        result.push(val);
      }
    }
    if (result.length > 0 && result[result.length - 1] === '') {
      result.pop();
    }
    return result;
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim()) return;

    setBulkProcessing(true);
    setBulkMessage(null);

    const lines = bulkText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    interface AggregatedShooter {
      primaryEmail: string;
      name: string;
      rvceEmail: string;
      dob: string;
      phone: string;
      usn: string;
      branch: string;
      yearOfStudy: string;
      verticals: Set<LakshyaVertical>;
    }

    const shooterMap = new Map<string, AggregatedShooter>();

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      // Skip header row if pasted
      if (lowerLine.includes('timestamp') && (lowerLine.includes('email') || lowerLine.includes('name') || lowerLine.includes('category'))) {
        continue;
      }

      const parts = parseCsvLine(line);

      // Detect email index
      let emailIdx = 1;
      if (!parts[emailIdx]?.includes('@')) {
        const found = parts.findIndex((p) => p.includes('@'));
        if (found !== -1) emailIdx = found;
      }

      const rawEmail = parts[emailIdx] || '';
      if (!rawEmail.includes('@')) continue;

      const primaryEmail = normalizeEmail(rawEmail);
      const name = parts[2] || primaryEmail.split('@')[0];
      const rvceEmail = parts[3] ? normalizeEmail(parts[3]) : '';
      const dob = parts[4] || '';
      const phone = parts[5] || '';
      const usn = parts[6] ? parts[6].toUpperCase() : '';
      const branch = parts[7] ? parts[7].toUpperCase() : '';
      const yearOfStudy = parts[8] || '';

      // Locate Category / Vertical from parts[9] or by searching all columns
      let categoryRaw = (parts[9] || '').toLowerCase();
      if (!categoryRaw.includes('pistol') && !categoryRaw.includes('rifle') && !categoryRaw.includes('both')) {
        const foundPart = parts.find((p) => {
          const l = p.toLowerCase();
          return l.includes('pistol') || l.includes('rifle') || l.includes('both');
        });
        if (foundPart) {
          categoryRaw = foundPart.toLowerCase();
        }
      }

      const detectedVerticals: LakshyaVertical[] = [];
      if (categoryRaw.includes('pistol')) detectedVerticals.push('Air Pistol');
      if (categoryRaw.includes('rifle')) detectedVerticals.push('Air Rifle');
      if (categoryRaw.includes('both')) {
        if (!detectedVerticals.includes('Air Rifle')) detectedVerticals.push('Air Rifle');
        if (!detectedVerticals.includes('Air Pistol')) detectedVerticals.push('Air Pistol');
      }
      if (detectedVerticals.length === 0) detectedVerticals.push('Air Rifle');

      const existing = shooterMap.get(primaryEmail);
      if (existing) {
        detectedVerticals.forEach((v) => existing.verticals.add(v));
        if (!existing.name && name) existing.name = name;
        if (!existing.usn && usn) existing.usn = usn;
        if (!existing.branch && branch) existing.branch = branch;
        if (!existing.phone && phone) existing.phone = phone;
      } else {
        // Pre-populate with existing verticals from current roster if already registered
        const dbShooter = registrations.find((r) => r.email.toLowerCase() === primaryEmail);
        const initialVerts = new Set<LakshyaVertical>(detectedVerticals);
        if (dbShooter) {
          if (Array.isArray(dbShooter.verticals) && dbShooter.verticals.length > 0) {
            dbShooter.verticals.forEach((v) => initialVerts.add(v));
          } else if (dbShooter.vertical === 'Both') {
            initialVerts.add('Air Rifle');
            initialVerts.add('Air Pistol');
          } else if (dbShooter.vertical === 'Air Rifle' || dbShooter.vertical === 'Air Pistol') {
            initialVerts.add(dbShooter.vertical as LakshyaVertical);
          }
        }
        shooterMap.set(primaryEmail, {
          primaryEmail,
          name,
          rvceEmail: rvceEmail || primaryEmail,
          dob,
          phone,
          usn,
          branch,
          yearOfStudy,
          verticals: initialVerts,
        });
      }
    }

    let count = 0;
    let errors = 0;

    for (const shooter of shooterMap.values()) {
      const verticalsArray = Array.from(shooter.verticals);
      const vertical = verticalsArray.length > 1 ? 'Both' : (verticalsArray[0] || 'Air Rifle');

      const record: Partial<Registration> = {
        id: shooter.primaryEmail,
        name: shooter.name,
        email: shooter.primaryEmail,
        rvceEmail: shooter.rvceEmail || shooter.primaryEmail,
        dob: shooter.dob,
        phone: shooter.phone,
        usn: shooter.usn,
        branch: shooter.branch,
        yearOfStudy: shooter.yearOfStudy,
        vertical,
        verticals: verticalsArray,
        college: 'RVCE',
        source: 'google_form',
        eligible: true,
        registeredAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        await setDoc(getDocRef('registrations', shooter.primaryEmail), record, { merge: true });
        count++;
      } catch (err) {
        console.error("Failed importing competitor:", shooter.primaryEmail, err);
        errors++;
      }
    }

    setBulkProcessing(false);
    setBulkMessage(`Roster Import Complete: Successfully allowlisted ${count} competitor records${errors > 0 ? ` (${errors} failed)` : ''}.`);
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
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search roster by name, email, USN, branch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#12131A] border border-[#282B3A] font-mono text-xs text-[#F8FAFC] focus:outline-none focus:border-[#DC2626]"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-4 py-2 bg-[#12131A] border border-[#282B3A] hover:bg-[#1A1C26] font-mono text-xs uppercase tracking-wider font-semibold rounded flex items-center gap-2 shadow-sm text-[#F8FAFC] transition-colors"
          >
            <Upload className="w-4 h-4 text-[#DC2626]" />
            <span>[ Bulk Allowlist Import ]</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-[#DC2626] hover:bg-[#E51A1A] font-mono text-xs uppercase tracking-widest font-bold text-[#F8FAFC] rounded flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Single Competitor</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 uppercase tracking-wider rounded transition-all ${
            activeFilter === 'all'
              ? 'bg-[#DC2626] text-[#F8FAFC] font-bold'
              : 'bg-[#12131A] border border-[#282B3A] text-[#64748B] hover:text-[#F8FAFC]'
          }`}
        >
          All Roster ({distinctRegistrations.length})
        </button>
        <button
          onClick={() => setActiveFilter('unbooked')}
          className={`px-3 py-1.5 uppercase tracking-wider rounded transition-all ${
            activeFilter === 'unbooked'
              ? 'bg-[#DC2626] text-[#F8FAFC] font-bold'
              : 'bg-[#12131A] border border-[#282B3A] text-[#64748B] hover:text-[#F8FAFC]'
          }`}
        >
          Unallocated Slots
        </button>
        <button
          onClick={() => setActiveFilter('rifle')}
          className={`px-3 py-1.5 uppercase tracking-wider rounded transition-all ${
            activeFilter === 'rifle'
              ? 'bg-[#DC2626] text-[#F8FAFC] font-bold'
              : 'bg-[#12131A] border border-[#282B3A] text-[#64748B] hover:text-[#F8FAFC]'
          }`}
        >
          Air Rifle ({rifleBooked.size})
        </button>
        <button
          onClick={() => setActiveFilter('pistol')}
          className={`px-3 py-1.5 uppercase tracking-wider rounded transition-all ${
            activeFilter === 'pistol'
              ? 'bg-[#DC2626] text-[#F8FAFC] font-bold'
              : 'bg-[#12131A] border border-[#282B3A] text-[#64748B] hover:text-[#F8FAFC]'
          }`}
        >
          Air Pistol ({pistolBooked.size})
        </button>
        <button
          onClick={() => setActiveFilter('both')}
          className={`px-3 py-1.5 uppercase tracking-wider rounded transition-all ${
            activeFilter === 'both'
              ? 'bg-[#DC2626] text-[#F8FAFC] font-bold'
              : 'bg-[#12131A] border border-[#282B3A] text-[#64748B] hover:text-[#F8FAFC]'
          }`}
        >
          Dual Competitors
        </button>
      </div>

      {/* Registrations Table */}
      <div className="bg-[#12131A] border border-[#282B3A] overflow-hidden shadow-sm">
        {filteredList.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Users className="w-8 h-8 text-[#64748B] mx-auto opacity-50" />
            <p className="font-headline-sm text-lg text-[#F8FAFC] uppercase font-serif">No Competitors Found</p>
            <p className="font-mono text-xs text-[#64748B]">Try adjusting your search query or importing approved Google Form submissions.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0B0C10] border-b border-[#282B3A] text-[#64748B] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Competitor Details</th>
                  <th className="py-3 px-4">Academic Dossier</th>
                  <th className="py-3 px-4">Discipline Bookings</th>
                  <th className="py-3 px-4">Roster Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#282B3A]">
                {filteredList.map((reg, idx) => {
                  const email = reg.email.toLowerCase();
                  const hasRifle = rifleBooked.has(email);
                  const hasPistol = pistolBooked.has(email);

                  return (
                    <tr key={reg.id} className="hover:bg-[#1A1C26]/60 transition-colors">
                      <td className="py-3 px-4 text-[#64748B]">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#F8FAFC] text-sm">
                          {reg.name}
                        </div>
                        <span className="text-[11px] text-[#64748B] block">
                          {reg.email}
                        </span>
                        {reg.rvceEmail && reg.rvceEmail !== reg.email && (
                          <span className="text-[10px] text-[#DC2626] block">
                            RVCE ID: {reg.rvceEmail}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">
                        {reg.usn ? (
                          <div>
                            <span className="text-[#F8FAFC] font-bold block">{reg.usn}</span>
                            <span className="text-[10px] text-[#64748B]">{reg.branch || 'Branch N/A'} · {reg.yearOfStudy || ''}</span>
                          </div>
                        ) : (
                          <span className="italic text-[#64748B]">Direct Entry</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1.5">
                          {/* Registered Discipline Badge */}
                          <div>
                            {(Array.isArray(reg.verticals) && reg.verticals.length > 1) || reg.vertical === 'Both' ? (
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="text-[10px] px-2 py-0.5 bg-sky-950/70 text-sky-300 border border-sky-800 font-bold">
                                  AIR RIFLE
                                </span>
                                <span className="text-[10px] px-2 py-0.5 bg-amber-950/70 text-amber-300 border border-amber-800 font-bold">
                                  AIR PISTOL
                                </span>
                                <span className="text-[10px] px-2 py-0.5 bg-purple-950/80 text-purple-300 border border-purple-700 font-bold">
                                  DUAL (2 SLOTS)
                                </span>
                              </div>
                            ) : reg.vertical === 'Air Pistol' || (reg.verticals && reg.verticals.includes('Air Pistol')) ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] px-2 py-0.5 bg-amber-950/70 text-amber-300 border border-amber-800 font-bold">
                                  REG: AIR PISTOL
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAddVertical(reg, 'Air Rifle')}
                                  className="text-[9px] px-1.5 py-0.5 bg-[#1A1C26] hover:bg-sky-950/70 text-sky-400 border border-sky-800/60 rounded flex items-center gap-0.5"
                                  title="Add Air Rifle to this participant so they can book 2 slots"
                                >
                                  + Allow Rifle (2 Slots)
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] px-2 py-0.5 bg-sky-950/70 text-sky-300 border border-sky-800 font-bold">
                                  REG: AIR RIFLE
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAddVertical(reg, 'Air Pistol')}
                                  className="text-[9px] px-1.5 py-0.5 bg-[#1A1C26] hover:bg-amber-950/70 text-amber-400 border border-amber-800/60 rounded flex items-center gap-0.5"
                                  title="Add Air Pistol to this participant so they can book 2 slots"
                                >
                                  + Allow Pistol (2 Slots)
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Bookings pills */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {hasRifle && (
                              <span className="text-[10px] px-2 py-0.5 bg-emerald-950/60 text-emerald-400 border border-emerald-800 font-bold">
                                RIFLE BOOKED
                              </span>
                            )}

                            {hasPistol && (
                              <span className="text-[10px] px-2 py-0.5 bg-emerald-950/60 text-emerald-400 border border-emerald-800 font-bold">
                                PISTOL BOOKED
                              </span>
                            )}

                            {!hasRifle && !hasPistol && (
                              <span className="text-[10px] px-2 py-0.5 bg-[#0B0C10] border border-[#282B3A] text-[#64748B]">
                                No Booking
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] px-2 py-0.5 inline-flex items-center gap-1 font-bold ${
                          reg.eligible ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800' : 'bg-red-950/60 text-red-400 border border-red-800'
                        }`}>
                          {reg.eligible ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          <span>{reg.eligible ? 'AUTHORIZED' : 'LOCKED'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => downloadCertificatePdf(reg.name)}
                            title={`Download Certificate for ${reg.name}`}
                            className="p-1.5 bg-[#1A1C26] hover:bg-[#282B3A] border border-[#282B3A] text-[#DC2626] rounded transition-colors inline-flex items-center gap-1 text-[11px] font-mono"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Cert</span>
                          </button>
                          <button
                            onClick={() => handleToggleEligibility(reg)}
                            className="text-[11px] text-[#64748B] hover:text-[#DC2626] underline uppercase tracking-wider"
                          >
                            {reg.eligible ? 'Lock' : 'Authorize'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRegistration(reg)}
                            title={`Permanently delete ${reg.name}`}
                            className="p-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800 text-red-400 rounded transition-colors inline-flex items-center gap-1 text-[11px] font-mono"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Delete</span>
                          </button>
                        </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0C10]/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#12131A] border border-[#282B3A] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#282B3A] pb-3">
              <h3 className="font-headline-sm text-lg font-serif text-[#F8FAFC] uppercase">Add Competitor to Roster</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#64748B] hover:text-[#F8FAFC]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRegistration} className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-[#64748B] uppercase block mb-1">Competitor Full Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full p-2 bg-[#0B0C10] border border-[#282B3A] text-[#F8FAFC] focus:outline-none focus:border-[#DC2626]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#64748B] uppercase block mb-1">Primary Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="student@gmail.com"
                    className="w-full p-2 bg-[#0B0C10] border border-[#282B3A] text-[#F8FAFC] focus:outline-none focus:border-[#DC2626]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[#64748B] uppercase block mb-1">RVCE Email ID</label>
                  <input
                    type="email"
                    value={newRvceEmail}
                    onChange={(e) => setNewRvceEmail(e.target.value)}
                    placeholder="student.cs24@rvce.edu.in"
                    className="w-full p-2 bg-[#0B0C10] border border-[#282B3A] text-[#F8FAFC] focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[#64748B] uppercase block mb-1">USN</label>
                  <input
                    type="text"
                    value={newUsn}
                    onChange={(e) => setNewUsn(e.target.value)}
                    placeholder="1RV22CS001"
                    className="w-full p-2 bg-[#0B0C10] border border-[#282B3A] text-[#F8FAFC] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#64748B] uppercase block mb-1">Branch</label>
                  <input
                    type="text"
                    value={newBranch}
                    onChange={(e) => setNewBranch(e.target.value)}
                    placeholder="CSE / ECE"
                    className="w-full p-2 bg-[#0B0C10] border border-[#282B3A] text-[#F8FAFC] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#64748B] uppercase block mb-1">Year</label>
                  <select
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    className="w-full p-2 bg-[#0B0C10] border border-[#282B3A] text-[#F8FAFC] focus:outline-none"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[#64748B] uppercase block mb-1">Registered Discipline / Category</label>
                <select
                  value={newVertical}
                  onChange={(e) => setNewVertical(e.target.value as any)}
                  className="w-full p-2 bg-[#0B0C10] border border-[#282B3A] text-[#F8FAFC] focus:outline-none"
                >
                  <option value="Air Rifle">Air Rifle</option>
                  <option value="Air Pistol">Air Pistol</option>
                  <option value="Both">Both (Dual Competitor)</option>
                </select>
              </div>

              <div>
                <label className="text-[#64748B] uppercase block mb-1">Gender</label>
                <select
                  value={newGender}
                  onChange={(e) => setNewGender(e.target.value)}
                  className="w-full p-2 bg-[#0B0C10] border border-[#282B3A] text-[#F8FAFC] focus:outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div className="pt-3 border-t border-[#282B3A] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-[#282B3A] hover:bg-[#1A1C26] text-[#64748B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#DC2626] hover:bg-[#E51A1A] text-white font-bold"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0C10]/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#12131A] border border-[#282B3A] shadow-2xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#282B3A] pb-3">
              <div>
                <h3 className="font-headline-sm text-lg font-serif text-[#F8FAFC] uppercase">Google Form Intake CSV Import</h3>
                <p className="font-mono text-xs text-[#64748B]">Paste Google Sheets responses to authorize participant slot booking.</p>
              </div>
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkMessage(null);
                }}
                className="text-[#64748B] hover:text-[#F8FAFC]"
              >
                ✕
              </button>
            </div>

            {bulkMessage && (
              <div className="p-3 bg-emerald-950/50 border border-emerald-800 text-emerald-300 font-mono text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{bulkMessage}</span>
              </div>
            )}

            <form onSubmit={handleBulkImport} className="space-y-4 font-mono text-xs">
              <div>
                <label className="text-[#64748B] uppercase block mb-1">
                  Google Sheet CSV Rows (Header row will be automatically ignored):
                </label>
                <div className="p-2 bg-[#0B0C10] border border-[#282B3A] text-[11px] text-[#64748B] mb-2">
                  <span className="text-[#DC2626] font-bold">Columns Detected:</span> Timestamp, Email Address, Name, RVCE Email ID, Date of Birth, Phone Number, USN, Branch, Year of Study, and <strong className="text-white">Preferred Shooting Category</strong> (Air Rifle / Air Pistol)
                </div>
                <textarea
                  rows={9}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`2026/09/20 10:15:00 AM GMT+5:30, rahul@gmail.com, Rahul Sharma, rahul.cs24@rvce.edu.in, 15/04/2004, 9876543210, 1RV22CS001, CSE, 2nd Year`}
                  className="w-full p-3 bg-[#0B0C10] border border-[#282B3A] text-xs text-[#F8FAFC] focus:outline-none focus:border-[#DC2626]"
                  required
                />
                <span className="text-[11px] text-[#64748B] block mt-1">
                  Tip: If personal and RVCE emails are different, both are allowlisted so the competitor can log into the website with either Google account.
                </span>
              </div>

              <div className="pt-3 border-t border-[#282B3A] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkModal(false);
                    setBulkMessage(null);
                  }}
                  className="px-4 py-2 border border-[#282B3A] hover:bg-[#1A1C26] text-[#64748B]"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={bulkProcessing}
                  className="px-5 py-2 bg-[#DC2626] hover:bg-[#E51A1A] text-white font-bold flex items-center gap-1.5 shadow"
                >
                  <Upload className="w-4 h-4" />
                  <span>{bulkProcessing ? 'Processing Batch...' : 'Process & Authorize Roster'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
