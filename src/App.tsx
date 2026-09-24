import React, { useState, useEffect, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import Overview from './components/Overview';
import OnboardingModal from './components/OnboardingModal';

// Code-split participant views
const SlotBooking = lazy(() => import('./components/SlotBooking'));
const DigitalPass = lazy(() => import('./components/DigitalPass'));
const LiveLeaderboard = lazy(() => import('./components/LiveLeaderboard'));
const Profile = lazy(() => import('./components/Profile'));

// Code-split Admin Suite components (loaded only when admin is authenticated)
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const AdminAllocations = lazy(() => import('./components/admin/AdminAllocations'));
const AdminSlots = lazy(() => import('./components/admin/AdminSlots'));
const AdminRegistrations = lazy(() => import('./components/admin/AdminRegistrations'));
const AdminCertificates = lazy(() => import('./components/admin/AdminCertificates'));
const AdminScan = lazy(() => import('./components/admin/AdminScan'));
const AdminLeaderboard = lazy(() => import('./components/admin/AdminLeaderboard'));
const AdminReports = lazy(() => import('./components/admin/AdminReports'));
const AdminAudit = lazy(() => import('./components/admin/AdminAudit'));

import { getColRef, onSnapshot, collection, db, APP_ID } from './lib/firebase';
import type { Registration, Slot, Booking } from './types/lakshya';

const ViewFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-[#DC2626] border-t-transparent rounded-full animate-spin"></div>
      <span className="font-mono text-xs text-[#64748B] uppercase tracking-wider">INITIALIZING INTERFACE...</span>
    </div>
  </div>
);

const VALID_VIEWS = ['overview', 'slot-booking', 'digital-pass', 'live-leaderboard', 'profile', 'admin'];

function getViewFromUrl(): string {
  if (typeof window === 'undefined') return 'overview';
  const hash = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
  if (VALID_VIEWS.includes(hash)) return hash;
  const path = window.location.pathname.replace(/^\//, '').trim().toLowerCase();
  if (VALID_VIEWS.includes(path)) return path;
  return 'overview';
}

function MainApp() {
  const { isAdmin, currentUser } = useAuth();
  const [currentView, setCurrentView] = useState<string>(getViewFromUrl);
  const [adminTab, setAdminTab] = useState<string>('dashboard');

  // Admin global data stores (strictly active only when admin is logged in)
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    // Only subscribe to full collections if user is an admin to avoid bandwidth wastage for normal visitors
    if (!isAdmin) {
      return;
    }

    const slotsCol = getColRef('slots');
    const unsubSlots = onSnapshot(slotsCol, (snapshot) => {
      const items: Slot[] = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setSlots(items);
    }, console.error);

    const primaryRegsCol = getColRef('registrations');
    const unsubRegs = onSnapshot(primaryRegsCol, (snapshot) => {
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
    const unsubBookings = onSnapshot(bookingsCol, (snapshot) => {
      const items: Booking[] = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setBookings(items);
    }, console.error);

    return () => {
      unsubSlots();
      unsubRegs();
      unsubBookings();
    };
  }, [isAdmin]);

  const setView = (newView: string) => {
    if (newView === currentView) return;
    setCurrentView(newView);
    if (window.location.hash.replace(/^#\/?/, '') !== newView) {
      window.location.hash = newView;
    }
  };

  // Sync URL hash changes (browser Back/Forward navigation and direct navigation)
  useEffect(() => {
    const handleUrlChange = () => {
      const v = getViewFromUrl();
      setCurrentView(v);
    };

    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  // Post-login redirect handler
  useEffect(() => {
    if (currentUser) {
      if (isAdmin) {
        setView('admin');
      } else {
        try {
          const intended = sessionStorage.getItem('lakshya_intended_view');
          if (intended && VALID_VIEWS.includes(intended)) {
            sessionStorage.removeItem('lakshya_intended_view');
            setView(intended);
          }
        } catch (_) {}
      }
    }
  }, [currentUser, isAdmin]);

  // If non-admin is currently on 'admin' view (e.g. after logout or direct URL nav), redirect to overview
  useEffect(() => {
    if (!isAdmin && currentView === 'admin') {
      setView('overview');
    }
  }, [isAdmin, currentView]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0C10] text-[#F8FAFC]">
      {/* Navigation Header */}
      <Header currentView={currentView} setView={setView} />

      {/* Main View Router */}
      <main className="flex-1 w-full">
        {isAdmin ? (
          /* When Admin is logged in, take directly to Admin Suite with no other page */
          <Suspense fallback={<ViewFallback />}>
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
          </Suspense>
        ) : (
          /* Public Competitor View Router */
          <Suspense fallback={<ViewFallback />}>
            {currentView === 'overview' && <Overview setView={setView} />}
            {currentView === 'slot-booking' && <SlotBooking setView={setView} />}
            {currentView === 'digital-pass' && <DigitalPass setView={setView} />}
            {currentView === 'live-leaderboard' && <LiveLeaderboard />}
            {currentView === 'profile' && <Profile setView={setView} />}
          </Suspense>
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
                  <img src="/assets/logos/RVCE Logo.webp" alt="RVCE" className="h-6 w-auto object-contain opacity-80" />
                  <img src="/assets/logos/NCC Logo.webp" alt="NCC" className="h-6 w-auto object-contain opacity-80" />
                  <img src="/assets/logos/GARE Logo.webp" alt="GARE" className="h-5 w-auto object-contain opacity-80" />
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