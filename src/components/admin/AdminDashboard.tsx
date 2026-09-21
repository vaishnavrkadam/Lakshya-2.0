import React from 'react';
import { DEFAULT_SLOT_CAPACITY } from '../../config/lakshya';
import type { Registration, Slot, Booking } from '../../types/lakshya';
import { 
  Users, 
  Target, 
  CheckCircle2, 
  UserX, 
  Calendar, 
  TrendingUp, 
  Activity,
  AlertCircle 
} from 'lucide-react';

interface AdminDashboardProps {
  registrations: Registration[];
  slots: Slot[];
  bookings: Booking[];
}

export default function AdminDashboard({ registrations, slots, bookings }: AdminDashboardProps) {
  const activeBookings = bookings.filter((b) => b.status === 'confirmed');

  const rifleBookings = activeBookings.filter((b) => b.vertical === 'Air Rifle');
  const pistolBookings = activeBookings.filter((b) => b.vertical === 'Air Pistol');

  const rifleCheckedIn = rifleBookings.filter((b) => b.checkedIn).length;
  const pistolCheckedIn = pistolBookings.filter((b) => b.checkedIn).length;

  // Unbooked count: registered people with 0 bookings in either vertical
  const bookedEmails = new Set(activeBookings.map((b) => b.participantEmail.toLowerCase()));
  const unbookedCount = registrations.filter((r) => !bookedEmails.has(r.email.toLowerCase())).length;

  // Capacity calculations
  const rifleSlots = slots.filter((s) => s.vertical === 'Air Rifle' && s.isActive);
  const pistolSlots = slots.filter((s) => s.vertical === 'Air Pistol' && s.isActive);

  const rifleTotalCapacity = rifleSlots.reduce((acc, s) => acc + (s.capacity || DEFAULT_SLOT_CAPACITY['Air Rifle']), 0);
  const pistolTotalCapacity = pistolSlots.reduce((acc, s) => acc + (s.capacity || DEFAULT_SLOT_CAPACITY['Air Pistol']), 0);

  const rifleRemaining = Math.max(0, rifleTotalCapacity - rifleBookings.length);
  const pistolRemaining = Math.max(0, pistolTotalCapacity - pistolBookings.length);

  const rifleOccupancy = rifleTotalCapacity > 0 ? Math.round((rifleBookings.length / rifleTotalCapacity) * 100) : 0;
  const pistolOccupancy = pistolTotalCapacity > 0 ? Math.round((pistolBookings.length / pistolTotalCapacity) * 100) : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Registrations */}
        <div className="bg-[#12131A] border border-[#282B3A] p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-mono uppercase tracking-wider">Registered Roster</span>
            <Users className="w-4 h-4 text-[#DC2626]" />
          </div>
          <div className="text-3xl font-mono font-bold text-[#F8FAFC]">{registrations.length}</div>
          <div className="text-[11px] font-mono text-[#64748B]">
            {registrations.filter((r) => r.eligible).length} eligible shooters
          </div>
        </div>

        {/* Air Rifle Bookings */}
        <div className="bg-[#12131A] border border-[#282B3A] p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-mono uppercase tracking-wider">Air Rifle Bookings</span>
            <Target className="w-4 h-4 text-[#DC2626]" />
          </div>
          <div className="text-3xl font-mono font-bold text-[#F8FAFC]">{rifleBookings.length}</div>
          <div className="text-[11px] font-mono text-emerald-400 font-medium">
            {rifleCheckedIn} checked in ({rifleOccupancy}% filled)
          </div>
        </div>

        {/* Air Pistol Bookings */}
        <div className="bg-[#12131A] border border-[#282B3A] p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-mono uppercase tracking-wider">Air Pistol Bookings</span>
            <Target className="w-4 h-4 text-[#DC2626]" />
          </div>
          <div className="text-3xl font-mono font-bold text-[#F8FAFC]">{pistolBookings.length}</div>
          <div className="text-[11px] font-mono text-emerald-400 font-medium">
            {pistolCheckedIn} checked in ({pistolOccupancy}% filled)
          </div>
        </div>

        {/* Unbooked Registrants */}
        <div className="bg-[#12131A] border border-[#282B3A] p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-mono uppercase tracking-wider">Unbooked Shooters</span>
            <UserX className="w-4 h-4 text-[#EF4444]" />
          </div>
          <div className="text-3xl font-mono font-bold text-[#EF4444]">{unbookedCount}</div>
          <div className="text-[11px] font-mono text-[#64748B]">
            Registered but no slots selected
          </div>
        </div>
      </div>

      {/* Range Capacity Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Air Rifle Capacity Bar */}
        <div className="bg-[#12131A] border border-[#282B3A] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#282B3A] pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#DC2626] font-bold block">Discipline 01</span>
              <h3 className="font-headline-sm text-lg font-serif text-[#F8FAFC] uppercase">Air Rifle Range Occupancy</h3>
            </div>
            <span className="text-xs font-mono font-bold text-[#F8FAFC]">
              {rifleBookings.length} / {rifleTotalCapacity} Lanes
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono text-[#64748B]">
              <span>Occupancy: {rifleOccupancy}%</span>
              <span>Remaining: {rifleRemaining} Lanes</span>
            </div>
            <div className="w-full bg-[#0B0C10] h-2.5 border border-[#282B3A] overflow-hidden">
              <div
                className="h-full bg-[#DC2626] transition-all"
                style={{ width: `${Math.min(100, rifleOccupancy)}%` }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono text-[#64748B] pt-2">
            <div className="p-2 bg-[#0B0C10] border border-[#282B3A]">
              Active Slots: <strong className="text-[#F8FAFC]">{rifleSlots.length}</strong>
            </div>
            <div className="p-2 bg-[#0B0C10] border border-[#282B3A]">
              Checked-in Rate: <strong className="text-[#F8FAFC]">
                {rifleBookings.length > 0 ? Math.round((rifleCheckedIn / rifleBookings.length) * 100) : 0}%
              </strong>
            </div>
          </div>
        </div>

        {/* Air Pistol Capacity Bar */}
        <div className="bg-[#12131A] border border-[#282B3A] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#282B3A] pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#DC2626] font-bold block">Discipline 02</span>
              <h3 className="font-headline-sm text-lg font-serif text-[#F8FAFC] uppercase">Air Pistol Range Occupancy</h3>
            </div>
            <span className="text-xs font-mono font-bold text-[#F8FAFC]">
              {pistolBookings.length} / {pistolTotalCapacity} Lanes
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono text-[#64748B]">
              <span>Occupancy: {pistolOccupancy}%</span>
              <span>Remaining: {pistolRemaining} Lanes</span>
            </div>
            <div className="w-full bg-[#0B0C10] h-2.5 border border-[#282B3A] overflow-hidden">
              <div
                className="h-full bg-[#DC2626] transition-all"
                style={{ width: `${Math.min(100, pistolOccupancy)}%` }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono text-[#64748B] pt-2">
            <div className="p-2 bg-[#0B0C10] border border-[#282B3A]">
              Active Slots: <strong className="text-[#F8FAFC]">{pistolSlots.length}</strong>
            </div>
            <div className="p-2 bg-[#0B0C10] border border-[#282B3A]">
              Checked-in Rate: <strong className="text-[#F8FAFC]">
                {pistolBookings.length > 0 ? Math.round((pistolCheckedIn / pistolBookings.length) * 100) : 0}%
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
