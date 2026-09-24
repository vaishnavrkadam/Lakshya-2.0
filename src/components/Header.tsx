import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Menu, 
  X, 
  LogIn, 
  LogOut, 
  Shield, 
  Ticket, 
  Trophy, 
  Calendar, 
  User, 
  Home,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface HeaderProps {
  currentView: string;
  setView: (v: string) => void;
}

export default function Header({ currentView, setView }: HeaderProps) {
  const { currentUser, registration, isAdmin, loginWithGoogle, logout, setOnboardingOpen } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (id: string) => {
    setView(id);
    setMobileMenuOpen(false);
  };

  const isHomeActive = currentView === 'overview';
  const isSlotActive = currentView === 'slot-booking';
  const isPassActive = currentView === 'digital-pass';
  const isLeaderboardActive = currentView === 'live-leaderboard';
  const isProfileActive = currentView === 'profile';
  const isAdminActive = currentView === 'admin';

  return (
    <header className="sticky top-0 left-0 w-full z-50 bg-[#0B0C10] border-b border-[#282B3A]/80 shadow-[0_4px_20px_rgba(0,0,0,0.8)] backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="h-20 flex items-center justify-between gap-2 lg:gap-4 relative">
          
          {/* LEFT GROUP: RVCE Logo + Divider + Left Nav Items (HOME, SLOT ALLOCATION) */}
          <div className="flex items-center gap-3 xl:gap-5 min-w-0 pr-4">
            {/* RVCE Logo */}
            <button
              onClick={() => handleNavClick('overview')}
              className="flex items-center gap-2 text-left shrink-0 group focus:outline-none"
              title="RV College of Engineering"
            >
              <img 
                src="/assets/logos/RVCE Logo.webp" 
                alt="RV College of Engineering" 
                className="h-10 sm:h-12 w-auto object-contain brightness-110"
              />
            </button>

            {/* Red Vertical Divider */}
            <div className="hidden lg:block h-8 w-[1px] bg-[#DC2626]/70 shadow-[0_0_8px_rgba(220,38,38,0.5)] shrink-0" />

            {/* Left Nav: HOME, SLOT ALLOCATION, PARTICIPANT PASS */}
            <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2.5 shrink-0">
              <button
                onClick={() => handleNavClick('overview')}
                className={`font-mono text-[11px] xl:text-xs uppercase tracking-wider whitespace-nowrap transition-all px-2.5 xl:px-3 py-1.5 rounded ${
                  isHomeActive
                    ? 'border border-[#DC2626] text-[#F8FAFC] font-bold shadow-[0_0_12px_rgba(220,38,38,0.4)] bg-[#12131A]'
                    : 'text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-[#1A1C26]/60'
                }`}
              >
                HOME
              </button>

              <button
                onClick={() => handleNavClick('slot-booking')}
                className={`font-mono text-[11px] xl:text-xs uppercase tracking-wider whitespace-nowrap transition-all px-2.5 xl:px-3 py-1.5 rounded ${
                  isSlotActive
                    ? 'border border-[#DC2626] text-[#F8FAFC] font-bold shadow-[0_0_12px_rgba(220,38,38,0.4)] bg-[#12131A]'
                    : 'text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-[#1A1C26]/60'
                }`}
              >
                SLOT ALLOCATION
              </button>

              <button
                onClick={() => handleNavClick('digital-pass')}
                className={`font-mono text-[11px] xl:text-xs uppercase tracking-wider whitespace-nowrap transition-all px-2.5 xl:px-3 py-1.5 rounded ${
                  isPassActive
                    ? 'border border-[#DC2626] text-[#F8FAFC] font-bold shadow-[0_0_12px_rgba(220,38,38,0.4)] bg-[#12131A]'
                    : 'text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-[#1A1C26]/60'
                }`}
              >
                PARTICIPANT PASS
              </button>
            </nav>
          </div>

          {/* CENTER GROUP: GARE Logo (True Center of Navbar) */}
          <div className="hidden lg:flex items-center justify-center shrink-0 px-2 sm:px-4 absolute left-1/2 -translate-x-1/2 z-10">
            <button
              onClick={() => handleNavClick('overview')}
              className="flex items-center justify-center focus:outline-none transition-transform hover:scale-105"
              title="Gandiva Aero-pneumatic Research and Equipments"
            >
              <img 
                src="/assets/logos/GARE Logo.webp" 
                alt="GARE - Precision & Accuracy" 
                className="h-9 sm:h-11 md:h-12 w-auto object-contain filter drop-shadow-[0_0_10px_rgba(255,255,255,0.15)]"
              />
            </button>
          </div>

          {/* RIGHT GROUP: Right Nav Items (LEADERBOARD, PROFILE, ADMIN) + Divider + NCC Logo + Sign In */}
          <div className="flex items-center gap-2 xl:gap-3.5 shrink-0 pl-2">
            {/* Right Nav: LEADERBOARD, PROFILE, ADMIN */}
            <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2.5 shrink-0">
              <button
                onClick={() => handleNavClick('live-leaderboard')}
                className={`font-mono text-[11px] xl:text-xs uppercase tracking-wider whitespace-nowrap transition-all px-2.5 xl:px-3 py-1.5 rounded ${
                  isLeaderboardActive
                    ? 'border border-[#DC2626] text-[#F8FAFC] font-bold shadow-[0_0_12px_rgba(220,38,38,0.4)] bg-[#12131A]'
                    : 'text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-[#1A1C26]/60'
                }`}
              >
                LEADERBOARD
              </button>

              <button
                onClick={() => handleNavClick('profile')}
                className={`font-mono text-[11px] xl:text-xs uppercase tracking-wider whitespace-nowrap transition-all px-2.5 xl:px-3 py-1.5 rounded ${
                  isProfileActive
                    ? 'border border-[#DC2626] text-[#F8FAFC] font-bold shadow-[0_0_12px_rgba(220,38,38,0.4)] bg-[#12131A]'
                    : 'text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-[#1A1C26]/60'
                }`}
              >
                PROFILE
              </button>

              {isAdmin && (
                <button
                  onClick={() => handleNavClick('admin')}
                  className={`font-mono text-[11px] xl:text-xs uppercase tracking-wider whitespace-nowrap transition-all px-2.5 py-1.5 rounded flex items-center gap-1 text-[#F59E0B] border border-[#F59E0B]/50 hover:bg-[#F59E0B]/10 ${
                    isAdminActive ? 'bg-[#F59E0B]/20 font-bold' : ''
                  }`}
                  title="Admin Command Suite"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>ADMIN</span>
                </button>
              )}
            </nav>

            {/* Red Vertical Divider */}
            <div className="hidden lg:block h-8 w-[1px] bg-[#DC2626]/70 shadow-[0_0_8px_rgba(220,38,38,0.5)] shrink-0" />

            {/* NCC Crest Logo */}
            <div className="hidden sm:flex items-center shrink-0">
              <img 
                src="/assets/logos/NCC Logo.webp" 
                alt="NCC RVCE" 
                className="h-10 sm:h-12 w-auto object-contain filter drop-shadow-[0_0_8px_rgba(220,38,38,0.25)]"
              />
            </div>

            {/* Sign In / User Auth Controls */}
            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-[#282B3A]">
                <button
                  onClick={() => handleNavClick('profile')}
                  className="w-8 h-8 rounded-full bg-[#1A1C26] border border-[#DC2626]/80 flex items-center justify-center text-[#F8FAFC] text-xs font-bold font-mono hover:border-[#DC2626] shadow-sm transition-colors shrink-0"
                  title={`Logged in as ${registration?.name || currentUser.displayName || currentUser.email}`}
                >
                  {(registration?.name || currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                </button>

                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-1.5 text-[#64748B] hover:text-[#EF4444] hover:bg-[#12131A] rounded transition-colors shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (currentView === 'slot-booking' || currentView === 'digital-pass') {
                    loginWithGoogle(currentView);
                  } else {
                    loginWithGoogle();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[#DC2626] hover:text-[#F8FAFC] hover:bg-[#DC2626]/15 font-mono text-xs uppercase tracking-wider transition-colors rounded shrink-0 font-bold"
              >
                <LogIn className="w-4 h-4 text-[#DC2626]" />
                <span className="hidden sm:inline">SIGN IN</span>
              </button>
            )}

            {/* Mobile Hamburger Button */}
            <div className="lg:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-[#1A1C26] rounded transition-colors"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0E0F15] border-b border-[#282B3A] px-4 pt-3 pb-6 space-y-3 shadow-2xl animate-fade-in">
          {/* User Status Bar if logged in */}
          {currentUser && (
            <div className="py-2.5 px-3 bg-[#14151D] border border-[#282B3A] rounded flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#F8FAFC]">
                  {registration?.name || currentUser.displayName || currentUser.email}
                </div>
                <div className="text-[10px] font-mono text-[#64748B]">{currentUser.email}</div>
              </div>
              <button
                onClick={logout}
                className="text-xs font-mono text-[#EF4444] hover:underline flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          )}

          {/* Navigation Links */}
          <div className="grid grid-cols-1 gap-1.5 pt-1">
            <button
              onClick={() => handleNavClick('overview')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-mono uppercase tracking-wider rounded text-left ${
                isHomeActive
                  ? 'border border-[#DC2626] bg-[#1A1C26] text-[#F8FAFC] font-bold'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1A1C26]'
              }`}
            >
              <Home className="w-4 h-4 text-[#DC2626]" />
              <span>Home</span>
            </button>

            <button
              onClick={() => handleNavClick('slot-booking')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-mono uppercase tracking-wider rounded text-left ${
                isSlotActive
                  ? 'border border-[#DC2626] bg-[#1A1C26] text-[#F8FAFC] font-bold'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1A1C26]'
              }`}
            >
              <Calendar className="w-4 h-4 text-[#DC2626]" />
              <span>Slot Allocation</span>
            </button>

            <button
              onClick={() => handleNavClick('digital-pass')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-mono uppercase tracking-wider rounded text-left ${
                isPassActive
                  ? 'border border-[#DC2626] bg-[#1A1C26] text-[#F8FAFC] font-bold'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1A1C26]'
              }`}
            >
              <Ticket className="w-4 h-4 text-[#DC2626]" />
              <span>Participant Pass</span>
            </button>

            <button
              onClick={() => handleNavClick('live-leaderboard')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-mono uppercase tracking-wider rounded text-left ${
                isLeaderboardActive
                  ? 'border border-[#DC2626] bg-[#1A1C26] text-[#F8FAFC] font-bold'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1A1C26]'
              }`}
            >
              <Trophy className="w-4 h-4 text-[#DC2626]" />
              <span>Leaderboard</span>
            </button>

            <button
              onClick={() => handleNavClick('profile')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-mono uppercase tracking-wider rounded text-left ${
                isProfileActive
                  ? 'border border-[#DC2626] bg-[#1A1C26] text-[#F8FAFC] font-bold'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1A1C26]'
              }`}
            >
              <User className="w-4 h-4 text-[#DC2626]" />
              <span>Profile</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => handleNavClick('admin')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-mono uppercase tracking-wider rounded text-left ${
                  isAdminActive
                    ? 'border border-[#F59E0B] bg-[#F59E0B]/20 text-[#F59E0B] font-bold'
                    : 'text-[#F59E0B] hover:bg-[#F59E0B]/10'
                }`}
              >
                <Shield className="w-4 h-4 text-[#F59E0B]" />
                <span>Admin Command Suite</span>
              </button>
            )}
          </div>

          {/* Quick Action Button */}
          <div className="pt-2 border-t border-[#282B3A] flex flex-col gap-2">
            {!currentUser && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (currentView === 'slot-booking' || currentView === 'digital-pass') {
                    loginWithGoogle(currentView);
                  } else {
                    loginWithGoogle();
                  }
                }}
                className="w-full py-2 bg-[#1A1C26] hover:bg-[#282B3A] border border-[#282B3A] text-[#F8FAFC] font-mono text-xs uppercase tracking-wider text-center rounded flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4 text-[#DC2626]" />
                <span>Sign In with Google</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
