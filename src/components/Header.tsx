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

interface NavItem {
  id: string;
  label: string;
  icon: any;
  adminOnly?: boolean;
}

export default function Header({ currentView, setView }: HeaderProps) {
  const { currentUser, registration, isAdmin, loginWithGoogle, logout, setOnboardingOpen } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: NavItem[] = [
    { id: 'overview', label: 'Home', icon: Home },
    { id: 'slot-booking', label: 'Slot Allocation', icon: Calendar },
    { id: 'digital-pass', label: 'Cadet Pass', icon: Ticket },
    { id: 'live-leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Admin Panel', icon: Shield, adminOnly: true });
  }

  const handleNavClick = (id: string) => {
    setView(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 left-0 w-full z-50 bg-[#0B0C10]/95 backdrop-blur-xl border-b border-[#282B3A] shadow-[0_1px_8px_rgba(0,0,0,0.6)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          {/* Brand & Logos */}
          <div className="flex items-center gap-3 sm:gap-6">
            <button 
              onClick={() => handleNavClick('overview')}
              className="flex items-center gap-2.5 text-left group"
            >
              <span className="w-2 h-2 rounded-full bg-[#E51A1A] animate-pulse"></span>
              <div className="flex flex-col">
                <span className="font-headline-md text-xl sm:text-2xl text-[#F8FAFC] tracking-wider leading-none uppercase font-serif">
                  LAKSHYA <span className="text-[#E51A1A]">2.0</span>
                </span>
                <span className="font-mono text-[9px] text-[#64748B] tracking-widest uppercase mt-0.5">
                  NCC RVCE × GARE
                </span>
              </div>
            </button>

            {/* Official Partner Logos */}
            <div className="hidden md:flex items-center gap-2 pl-4 border-l border-[#282B3A]">
              <img 
                src="/assets/logos/RVCE Logo.png" 
                alt="RVCE Logo" 
                className="h-8 w-auto object-contain opacity-90"
              />
              <img 
                src="/assets/logos/NCC Logo.png" 
                alt="NCC Logo" 
                className="h-8 w-auto object-contain opacity-90"
              />
              <img 
                src="/assets/logos/Precihole Logo.png" 
                alt="Precihole Logo" 
                className="h-6 w-auto object-contain opacity-85 pl-1.5 border-l border-[#282B3A]"
              />
              <div className="pl-2 border-l border-[#282B3A] flex items-center" title="Gandiva Aero-pneumatic Research and Equipments">
                <span className="text-[10px] font-mono font-bold text-[#E51A1A] tracking-wider">GARE</span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Strip */}
          {isAdmin ? (
            <div className="hidden lg:flex items-center gap-2">
              <span className="font-mono text-xs px-3 py-1 bg-red-950/40 border border-red-800 text-red-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#DC2626]" />
                <span>OFFICER COMMAND TERMINAL ACTIVE</span>
              </span>
            </div>
          ) : (
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-all rounded ${
                      isActive
                        ? 'bg-[#12131A] text-[#F8FAFC] border border-[#282B3A] font-semibold shadow-sm'
                        : 'text-[#64748B] hover:text-[#F8FAFC] hover:bg-[#12131A]/60'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Action Trigger & User Profile */}
          <div className="flex items-center gap-3">
            {/* Quick Register Trigger for Non-Admin */}
            {!isAdmin && (
              <button
                onClick={() => {
                  if (!currentUser) {
                    loginWithGoogle();
                  } else if (!registration) {
                    setOnboardingOpen(true);
                  } else {
                    handleNavClick('slot-booking');
                  }
                }}
                className="hidden sm:inline-flex items-center justify-center px-3.5 py-1.5 bg-[#DC2626] hover:bg-[#E51A1A] text-[#F8FAFC] font-mono text-xs uppercase tracking-widest transition-all shadow-sm font-semibold"
              >
                [ Register Now ]
              </button>
            )}

            {/* User State */}
            {currentUser ? (
              <div className="flex items-center gap-2.5 pl-3 border-l border-[#282B3A]">
                <button
                  onClick={() => handleNavClick('profile')}
                  className="text-right hidden sm:block hover:opacity-90 transition-opacity"
                >
                  <div className="text-xs font-medium text-[#F8FAFC] truncate max-w-[130px]">
                    {registration?.name || currentUser.displayName || currentUser.email}
                  </div>
                  <div className="flex items-center justify-end gap-1 text-[10px] font-mono">
                    {registration ? (
                      <span className="text-[#10B981] flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" /> ELIGIBLE
                      </span>
                    ) : (
                      <span className="text-[#EF4444] flex items-center gap-0.5">
                        <AlertCircle className="w-2.5 h-2.5" /> UNROSTERED
                      </span>
                    )}
                  </div>
                </button>

                <button
                  onClick={() => handleNavClick('profile')}
                  className="w-8 h-8 rounded-full bg-[#1A1C26] border border-[#282B3A] flex items-center justify-center text-[#F8FAFC] text-xs font-bold font-mono hover:border-[#DC2626] transition-colors"
                  title="View Profile"
                >
                  {(registration?.name || currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                </button>

                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-1.5 text-[#64748B] hover:text-[#EF4444] hover:bg-[#12131A] rounded transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={loginWithGoogle}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#12131A] hover:bg-[#1A1C26] border border-[#282B3A] text-[#F8FAFC] text-xs font-mono uppercase tracking-wider rounded transition-colors"
              >
                <LogIn className="w-3.5 h-3.5 text-[#DC2626]" />
                <span>Sign In</span>
              </button>
            )}

            {/* Mobile menu hamburger */}
            <div className="lg:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1.5 text-[#64748B] hover:text-[#F8FAFC] hover:bg-[#12131A] rounded"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6 text-[#F8FAFC]" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#12131A] border-b border-[#282B3A] px-4 pt-3 pb-5 space-y-2">
          {currentUser && (
            <div className="py-2 border-b border-[#282B3A] mb-2 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-[#F8FAFC]">
                  {registration?.name || currentUser.displayName || currentUser.email}
                </div>
                <div className="text-[10px] font-mono text-[#64748B]">{currentUser.email}</div>
              </div>
              <button
                onClick={logout}
                className="text-xs text-[#EF4444] flex items-center gap-1 px-2 py-1 bg-red-950/40 rounded border border-red-900/40"
              >
                <LogOut className="w-3 h-3" /> Logout
              </button>
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-mono uppercase tracking-wider rounded ${
                  isActive
                    ? 'bg-[#1A1C26] text-[#F8FAFC] border border-[#282B3A]'
                    : 'text-[#64748B] hover:text-[#F8FAFC] hover:bg-[#1A1C26]/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#DC2626]' : 'text-[#64748B]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-2 border-t border-[#282B3A] flex flex-col gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (!currentUser) loginWithGoogle();
                else if (!registration) setOnboardingOpen(true);
                else setView('slot-booking');
              }}
              className="w-full py-2 bg-[#DC2626] hover:bg-[#E51A1A] text-[#F8FAFC] font-mono text-xs uppercase tracking-widest text-center font-semibold"
            >
              [ Register Now ]
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
