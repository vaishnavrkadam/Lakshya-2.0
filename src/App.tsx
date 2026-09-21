import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import Overview from './components/Overview';
import SlotBooking from './components/SlotBooking';
import DigitalPass from './components/DigitalPass';
import LiveLeaderboard from './components/LiveLeaderboard';
import Profile from './components/Profile';
import OnboardingModal from './components/OnboardingModal';

// Admin Components
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminAllocations from './components/admin/AdminAllocations';
import AdminSlots from './components/admin/AdminSlots';
import AdminRegistrations from './components/admin/AdminRegistrations';
import AdminCertificates from './components/admin/AdminCertificates';
import AdminScan from './components/admin/AdminScan';
import AdminLeaderboard from './components/admin/AdminLeaderboard';
import AdminReports from './components/admin/AdminReports';
import AdminAudit from './components/admin/AdminAudit';

import { getColRef, onSnapshot, collection, db, APP_ID } from './lib/firebase';
import type { Registration, Slot, Booking } from './types/lakshya';

function MainApp() {
  const { isAdmin } = useAuth();
  const [currentView, setView] = useState<string>('overview');
  const [adminTab, setAdminTab] = useState<string>('dashboard');

  // Admin global data stores (only active when needed)
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    // Listen to slots for booking counts and capacity
    const slotsCol = getColRef('slots');
    const unsubSlots = onSnapshot(slotsCol, (snapshot) => {
      const items: Slot[] = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setSlots(items);
    }, console.error);

    // If admin, also listen to all registrations and all bookings for reports & dashboards
    let unsubRegs: (() => void) | null = null;
    let unsubBookings: (() => void) | null = null;

    if (isAdmin) {
      // Direct real-time listener to canonical registrations collection (no stale caching)
      const primaryRegsCol = getColRef('registrations');
      unsubRegs = onSnapshot(primaryRegsCol, (snapshot) => {
        const items: Registration[] = snapshot.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            email: data.email || d.id,
            ...data,
          };
        });
        setRegistrations(items);
      }, console.error);

      const bookingsCol = getColRef('bookings');
      unsubBookings = onSnapshot(bookingsCol, (snapshot) => {
        const items: Booking[] = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setBookings(items);
      }, console.error);
    }

    return () => {
      unsubSlots();
      if (unsubRegs) unsubRegs();
      if (unsubBookings) unsubBookings();
    };
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      setView('admin');
    }
  }, [isAdmin]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0C10] text-[#F8FAFC]">
      {/* Navigation Header */}
      <Header currentView={currentView} setView={setView} />

      {/* Main View Router */}
      <main className="flex-1 w-full">
        {isAdmin ? (
          /* When Admin is logged in, take directly to Admin Suite with no other page */
          <AdminLayout currentTab={adminTab} setTab={setAdminTab}>
            {adminTab === 'dashboard' && (
              <AdminDashboard registrations={registrations} slots={slots} bookings={bookings} />
            )}
            {adminTab === 'allocations' && (
              <AdminAllocations registrations={registrations} slots={slots} bookings={bookings} />
            )}
            {adminTab === 'slots' && (
              <AdminSlots slots={slots} bookings={bookings} />
            )}
            {adminTab === 'registrations' && (
              <AdminRegistrations registrations={registrations} bookings={bookings} />
            )}
            {adminTab === 'certificates' && (
              <AdminCertificates registrations={registrations} bookings={bookings} />
            )}
            {adminTab === 'scan' && (
              <AdminScan bookings={bookings} />
            )}
            {adminTab === 'scoring' && (
              <AdminLeaderboard bookings={bookings} />
            )}
            {adminTab === 'reports' && (
              <AdminReports slots={slots} bookings={bookings} registrations={registrations} />
            )}
            {adminTab === 'audit' && (
              <AdminAudit />
            )}
          </AdminLayout>
        ) : (
          /* Public Competitor View Router */
          <>
            {currentView === 'overview' && <Overview setView={setView} />}
            {currentView === 'slot-booking' && <SlotBooking setView={setView} />}
            {currentView === 'digital-pass' && <DigitalPass setView={setView} />}
            {currentView === 'live-leaderboard' && <LiveLeaderboard />}
            {currentView === 'profile' && <Profile setView={setView} />}
          </>
        )}
      </main>

      {/* Global Modals */}
      <OnboardingModal />

      {/* Dark Tactical Footer matching Sample Design.html */}
      <footer className="w-full bg-[#12131A] border-t border-[#282B3A] no-print mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col items-center md:items-start gap-1">
              <div className="flex items-center gap-3">
                <span className="font-headline-sm text-xl text-[#F8FAFC] tracking-wider uppercase font-serif">
                  LAKSHYA <span className="text-[#DC2626]">2.0</span>
                </span>
                <span className="text-xs text-[#282B3A]">|</span>
                <div className="flex items-center gap-2">
                  <img src="/assets/logos/RVCE Logo.png" alt="RVCE" className="h-6 w-auto object-contain opacity-80" />
                  <img src="/assets/logos/NCC Logo.png" alt="NCC" className="h-6 w-auto object-contain opacity-80" />
                  <img src="/assets/logos/Precihole Logo.png" alt="Precihole" className="h-5 w-auto object-contain opacity-80" />
                </div>
              </div>
              <span className="font-mono text-xs text-[#64748B]">
                10M RIFLE & PISTOL SHOOTING CHAMPIONSHIP · NCC RVCE × GARE
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6">
              <button 
                onClick={() => setView('slot-booking')} 
                className="font-mono text-xs uppercase tracking-wider text-[#64748B] hover:text-[#F8FAFC] transition-colors"
              >
                Range Schedule
              </button>
              <button 
                onClick={() => setView('live-leaderboard')} 
                className="font-mono text-xs uppercase tracking-wider text-[#64748B] hover:text-[#F8FAFC] transition-colors"
              >
                Live Standings
              </button>
              <button 
                onClick={() => setView('digital-pass')} 
                className="font-mono text-xs uppercase tracking-wider text-[#64748B] hover:text-[#F8FAFC] transition-colors"
              >
                Participant Pass
              </button>
              {isAdmin && (
                <button 
                  onClick={() => setView('admin')} 
                  className="font-mono text-xs uppercase tracking-wider text-[#F59E0B] hover:underline"
                >
                  Command Portal
                </button>
              )}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[#282B3A] flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <span className="font-mono text-[10px] text-[#64748B]">
              © 2026 LAKSHYA 2.0. GANDIVA AERO-PNEUMATIC RANGE & NCC RVCE. ALL RIGHTS RESERVED.
            </span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-[#64748B]">PRECISION TARGET PROTOCOL</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]"></span>
              <span className="font-mono text-[10px] text-[#64748B]">10M ELECTRONIC TARGETRY</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}