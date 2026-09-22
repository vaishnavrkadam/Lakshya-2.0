import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  UserPlus, 
  Calendar, 
  Users, 
  ScanLine, 
  Trophy, 
  FileText, 
  History, 
  ShieldAlert,
  ShieldCheck,
  Award
} from 'lucide-react';

interface AdminLayoutProps {
  currentTab: string;
  setTab: (t: string) => void;
  children: React.ReactNode;
}

export default function AdminLayout({ currentTab, setTab, children }: AdminLayoutProps) {
  const { currentUser, isAdmin } = useAuth();

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'allocations', label: 'Manual Allocation', icon: UserPlus },
    { id: 'slots', label: 'Slot Schedules', icon: Calendar },
    { id: 'registrations', label: 'Registrations', icon: Users },
    { id: 'certificates', label: 'Grant Certificates', icon: Award },
    { id: 'scan', label: 'QR Scan Check-in', icon: ScanLine },
    { id: 'scoring', label: 'Live Scoring', icon: Trophy },
    { id: 'reports', label: 'PDF Reports', icon: FileText },
    { id: 'audit', label: 'Audit Trail', icon: History },
  ];

  if (!currentUser || !isAdmin) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-[#12131A] border border-[#282B3A] text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-[#EF4444] mx-auto" />
        <h2 className="font-headline-sm text-2xl text-[#F8FAFC] uppercase font-serif">Restricted Range Terminal</h2>
        <p className="font-mono text-xs text-[#64748B] leading-relaxed">
          Access to this command suite requires verified NCC RVCE administrative credentials.
          Logged account: <span className="text-[#F8FAFC]">{currentUser?.email || 'None'}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Header Bar */}
      <div className="border-b border-[#282B3A] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#1A1C26] border border-[#DC2626] text-[#DC2626]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#DC2626] block">
              COMMAND & CONTROL SYSTEM
            </span>
            <h1 className="font-headline-lg text-2xl sm:text-3xl text-[#F8FAFC] uppercase font-serif">
              Range Administration Suite
            </h1>
          </div>
        </div>

        <div className="font-mono text-xs text-[#64748B] bg-[#12131A] px-3.5 py-1.5 border border-[#282B3A] self-start md:self-auto">
          Logged Officer: <strong className="text-[#F8FAFC]">{currentUser.email}</strong>
        </div>
      </div>

      {/* Admin Tabs Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[#282B3A]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 font-mono text-xs uppercase tracking-wider whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#DC2626] text-[#F8FAFC] font-bold shadow-sm'
                  : 'bg-[#12131A] text-[#64748B] border border-[#282B3A] hover:text-[#F8FAFC] hover:bg-[#1A1C26]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Tab Content */}
      <div>{children}</div>
    </div>
  );
}
