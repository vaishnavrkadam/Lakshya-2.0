import React, { useState } from 'react';
import { 
  generateSlotRostersPdf, 
  generateUnbookedRegistrationsPdf, 
  generateOccupancyPdf 
} from '../../lib/reports';
import type { Slot, Booking, Registration } from '../../types/lakshya';
import { 
  FileText, 
  Download, 
  Users, 
  Target, 
  Calendar, 
  CheckCircle2 
} from 'lucide-react';

interface AdminReportsProps {
  slots: Slot[];
  bookings: Booking[];
  registrations: Registration[];
}

function downloadCsvFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function AdminReports({ slots, bookings, registrations }: AdminReportsProps) {
  const [selectedVerticalRoster, setSelectedVerticalRoster] = useState<string>('All');
  const [unbookedFilter, setUnbookedFilter] = useState<'all' | 'Air Rifle' | 'Air Pistol'>('all');

  const handleDownloadRoster = () => {
    generateSlotRostersPdf(slots, bookings, selectedVerticalRoster);
  };

  const handleDownloadUnbooked = () => {
    generateUnbookedRegistrationsPdf(registrations, bookings, unbookedFilter);
  };

  const handleDownloadOccupancy = () => {
    generateOccupancyPdf(slots, bookings);
  };

  // CSV Data Exports
  const handleExportRegistrationsCsv = () => {
    const headers = ['Full Name', 'Email Address', 'Gender', 'Cadet Category', 'Eligible', 'Source'];
    const rows = registrations.map((r) => [
      `"${(r.name || '').replace(/"/g, '""')}"`,
      `"${r.email}"`,
      `"${r.gender || 'Male'}"`,
      `"${r.cadetType || 'Standard'}"`,
      r.eligible ? 'YES' : 'NO',
      `"${r.source || 'manual'}"`,
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    downloadCsvFile(`lakshya_registrations_roster_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  const handleExportBookingsCsv = () => {
    const headers = [
      'Ticket ID',
      'Discipline',
      'Competitor Name',
      'Email',
      'Gender',
      'Slot Date',
      'Slot Time',
      'Checked In',
      'Final Score',
      'Disqualified',
      'Booking Status',
    ];

    const rows = bookings.map((b) => [
      `"${b.ticketId}"`,
      `"${b.vertical}"`,
      `"${(b.participantName || '').replace(/"/g, '""')}"`,
      `"${b.participantEmail}"`,
      `"${b.participantGender || 'Male'}"`,
      `"${b.slotDateLabel}"`,
      `"${b.slotTimeLabel}"`,
      b.checkedIn ? 'YES' : 'NO',
      b.totalScore !== null && b.totalScore !== undefined ? b.totalScore.toFixed(1) : 'N/A',
      b.isDQ ? 'YES' : 'NO',
      `"${b.status}"`,
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    downloadCsvFile(`lakshya_bookings_attendance_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  const handleExportScoresCsv = () => {
    const headers = [
      'Ticket ID',
      'Discipline',
      'Competitor Name',
      'Email',
      'Round',
      'Shot 1',
      'Shot 2',
      'Shot 3',
      'Shot 4',
      'Shot 5',
      'Shot 6',
      'Shot 7',
      'Shot 8',
      'Shot 9',
      'Shot 10',
      'Penalty Deduction',
      'Final Net Score',
      'Count 10s',
      'Count 9s',
      'Count 8s',
      'Disqualified',
    ];

    const rows = bookings
      .filter((b) => b.totalScore !== null || b.isDQ || (b.shots && b.shots.length > 0))
      .map((b) => {
        const s = b.shots || [];
        return [
          `"${b.ticketId}"`,
          `"${b.vertical}"`,
          `"${(b.participantName || '').replace(/"/g, '""')}"`,
          `"${b.participantEmail}"`,
          b.roundNumber || 1,
          s[0] ?? 0,
          s[1] ?? 0,
          s[2] ?? 0,
          s[3] ?? 0,
          s[4] ?? 0,
          s[5] ?? 0,
          s[6] ?? 0,
          s[7] ?? 0,
          s[8] ?? 0,
          s[9] ?? 0,
          b.penalty || 0,
          b.totalScore !== null && b.totalScore !== undefined ? b.totalScore.toFixed(1) : 0,
          b.count10s || 0,
          b.count9s || 0,
          b.count8s || 0,
          b.isDQ ? 'YES' : 'NO',
        ];
      });

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    downloadCsvFile(`lakshya_official_scores_10shot_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="border-b border-[#E8E0D2] pb-4">
        <span className="text-xs font-mono uppercase tracking-widest text-[#6F6A61] block">
          Official Documentation & Export
        </span>
        <h2 className="text-2xl font-serif font-bold text-[#171717]">Range Dispatch & Printable PDF Reports</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Report 1: Slot Rosters */}
        <div className="bg-[#FAF7F2] border border-[#CFC6B6] rounded-xl p-6 flex flex-col justify-between space-y-5 shadow-sm">
          <div className="space-y-3">
            <div className="p-3 bg-[#171717] text-[#E79A19] rounded-lg w-fit">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#171717]">Slot Rosters PDF</h3>
              <p className="text-xs text-[#6F6A61] leading-relaxed mt-1">
                Full chronological participant rosters with ticket IDs, lane allocations, and attendance statuses.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-[#6F6A61] block">Filter Vertical</label>
              <select
                value={selectedVerticalRoster}
                onChange={(e) => setSelectedVerticalRoster(e.target.value)}
                className="w-full p-2 bg-white border border-[#CFC6B6] rounded text-xs font-medium"
              >
                <option value="All">All Verticals (Rifle & Pistol)</option>
                <option value="Air Rifle">Air Rifle Only</option>
                <option value="Air Pistol">Air Pistol Only</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleDownloadRoster}
            className="w-full py-2.5 bg-[#171717] hover:bg-[#333333] text-[#F3EEE3] text-xs font-semibold rounded-lg flex items-center justify-center gap-2 shadow transition-colors"
          >
            <Download className="w-4 h-4 text-[#E79A19]" />
            <span>Download Roster PDF</span>
          </button>
        </div>

        {/* Report 2: Unbooked Shooters */}
        <div className="bg-[#FAF7F2] border border-[#CFC6B6] rounded-xl p-6 flex flex-col justify-between space-y-5 shadow-sm">
          <div className="space-y-3">
            <div className="p-3 bg-[#9B2C2C] text-white rounded-lg w-fit">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#171717]">Unbooked Shooters PDF</h3>
              <p className="text-xs text-[#6F6A61] leading-relaxed mt-1">
                Official alphabetical list of unbooked shooters containing strictly Serial Number and Name.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-[#6F6A61] block">Scope</label>
              <select
                value={unbookedFilter}
                onChange={(e) => setUnbookedFilter(e.target.value as any)}
                className="w-full p-2 bg-white border border-[#CFC6B6] rounded text-xs font-medium"
              >
                <option value="all">Zero Bookings (Both Verticals)</option>
                <option value="Air Rifle">Missing Air Rifle Slot</option>
                <option value="Air Pistol">Missing Air Pistol Slot</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleDownloadUnbooked}
            className="w-full py-2.5 bg-[#171717] hover:bg-[#333333] text-[#F3EEE3] text-xs font-semibold rounded-lg flex items-center justify-center gap-2 shadow transition-colors"
          >
            <Download className="w-4 h-4 text-[#E79A19]" />
            <span>Download Unbooked PDF</span>
          </button>
        </div>

        {/* Report 3: Range Occupancy */}
        <div className="bg-[#FAF7F2] border border-[#CFC6B6] rounded-xl p-6 flex flex-col justify-between space-y-5 shadow-sm">
          <div className="space-y-3">
            <div className="p-3 bg-[#315D4C] text-white rounded-lg w-fit">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#171717]">Occupancy & Capacity PDF</h3>
              <p className="text-xs text-[#6F6A61] leading-relaxed mt-1">
                Comprehensive lane availability summary showing capacity, booked lanes, remaining spots, and percentage occupancy.
              </p>
            </div>
          </div>

          <button
            onClick={handleDownloadOccupancy}
            className="w-full py-2.5 bg-[#171717] hover:bg-[#333333] text-[#F3EEE3] text-xs font-semibold rounded-lg flex items-center justify-center gap-2 shadow transition-colors"
          >
            <Download className="w-4 h-4 text-[#E79A19]" />
            <span>Download Occupancy PDF</span>
          </button>
        </div>
      </div>

      {/* CSV Raw Data Exports Section */}
      <div className="pt-6 border-t border-[#E8E0D2] space-y-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-[#6F6A61] block">
            Spreadsheet & Analytics Export
          </span>
          <h3 className="text-xl font-serif font-bold text-[#171717]">Direct CSV Data Downloads</h3>
          <p className="text-xs text-[#6F6A61]">
            Export complete raw data tables formatted for Microsoft Excel, Google Sheets, or custom statistical analysis.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleExportRegistrationsCsv}
            className="p-4 bg-[#FAF7F2] border border-[#CFC6B6] hover:border-[#171717] rounded-xl text-left space-y-2 group transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#171717]">Registrations CSV</span>
              <Download className="w-4 h-4 text-[#E79A19] group-hover:translate-y-0.5 transition-transform" />
            </div>
            <p className="text-[11px] text-[#6F6A61]">
              Download full participant intake list ({registrations.length} shooters) with contact & eligibility.
            </p>
          </button>

          <button
            onClick={handleExportBookingsCsv}
            className="p-4 bg-[#FAF7F2] border border-[#CFC6B6] hover:border-[#171717] rounded-xl text-left space-y-2 group transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#171717]">Bookings & Attendance CSV</span>
              <Download className="w-4 h-4 text-[#E79A19] group-hover:translate-y-0.5 transition-transform" />
            </div>
            <p className="text-[11px] text-[#6F6A61]">
              Download all slot allocations ({bookings.length} passes) with ticket IDs & check-in timestamps.
            </p>
          </button>

          <button
            onClick={handleExportScoresCsv}
            className="p-4 bg-[#FAF7F2] border border-[#CFC6B6] hover:border-[#171717] rounded-xl text-left space-y-2 group transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#171717]">10-Shot Scores & Leaderboard CSV</span>
              <Download className="w-4 h-4 text-[#E79A19] group-hover:translate-y-0.5 transition-transform" />
            </div>
            <p className="text-[11px] text-[#6F6A61]">
              Export 10-shot breakdown, penalties, 10s count, 9s count, and DQ records for all rounds.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
