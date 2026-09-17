import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getDocRef, runTransaction, serverTimestamp } from '../../lib/firebase';
import type { Booking, LakshyaVertical } from '../../types/lakshya';
import { 
  Trophy, 
  Search, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Ban, 
  Clock, 
  Target 
} from 'lucide-react';

interface AdminLeaderboardProps {
  bookings: Booking[];
}

export default function AdminLeaderboard({ bookings }: AdminLeaderboardProps) {
  const { currentUser } = useAuth();
  const [selectedVertical, setSelectedVertical] = useState<LakshyaVertical>('Air Rifle');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  
  // Scorecard state for expanded participant
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [shots, setShots] = useState<string[]>(Array(10).fill(''));
  const [penalty, setPenalty] = useState<string>('0');
  const [isDQ, setIsDQ] = useState<boolean>(false);
  const [scoreNotes, setScoreNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [statusAlert, setStatusAlert] = useState<string | null>(null);

  // Filter bookings for scoring
  const verticalBookings = bookings.filter(
    (b) => b.vertical === selectedVertical && b.status === 'confirmed'
  );

  const filteredBookings = verticalBookings.filter((b) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      b.participantName?.toLowerCase().includes(q) ||
      b.participantEmail?.toLowerCase().includes(q) ||
      b.ticketId?.toLowerCase().includes(q)
    );
  });

  const handleExpandBooking = (booking: Booking) => {
    if (expandedBookingId === booking.id) {
      setExpandedBookingId(null);
      return;
    }

    setExpandedBookingId(booking.id);
    setCurrentRound(booking.roundNumber || 1);
    
    // Load existing shots or initialize 10 blanks
    if (booking.shots && booking.shots.length === 10) {
      setShots(booking.shots.map((s) => s.toString()));
    } else if (booking.totalScore !== null && booking.totalScore !== undefined) {
      // If legacy single score exists, populate shot 1 with score and rest 0
      const initial = Array(10).fill('0');
      initial[0] = booking.totalScore.toString();
      setShots(initial);
    } else {
      setShots(Array(10).fill(''));
    }

    setPenalty(booking.penalty !== undefined && booking.penalty !== null ? booking.penalty.toString() : '0');
    setIsDQ(booking.isDQ || false);
    setStatusAlert(null);
  };

  const handleShotChange = (index: number, val: string) => {
    const updated = [...shots];
    updated[index] = val;
    setShots(updated);
  };

  // Calculations for current 10-shot scorecard
  const parsedShots = shots.map((s) => {
    const num = parseFloat(s);
    return isNaN(num) ? 0 : num;
  });

  const hasAnyShots = shots.some((s) => s.trim() !== '');
  const shotsSum = parsedShots.reduce((acc, curr) => acc + curr, 0);
  const penaltyNum = parseFloat(penalty) || 0;
  const netScore = Math.max(0, shotsSum - penaltyNum);
  const count10s = parsedShots.filter((s) => s >= 10).length;
  const count9s = parsedShots.filter((s) => s >= 9 && s < 10).length;
  const count8s = parsedShots.filter((s) => s >= 8 && s < 9).length;

  const handleSaveScorecard = async (booking: Booking) => {
    // Validate shots
    for (let i = 0; i < 10; i++) {
      const val = parsedShots[i];
      if (val < 0 || val > 10.9) {
        alert(`Shot #${i + 1} must be between 0.0 and 10.9`);
        return;
      }
    }

    setSubmitting(true);
    setStatusAlert(null);

    const bookingRef = getDocRef('bookings', booking.id);
    const leaderboardRef = getDocRef('leaderboard_entries', booking.id);
    const scorecardDocId = `${booking.id}_round_${currentRound}`;
    const scorecardRef = getDocRef('scorecards', scorecardDocId);
    const auditRef = getDocRef('audit_logs', `audit_score_${Date.now()}`);

    try {
      await runTransaction(bookingRef.firestore, async (tx) => {
        const snap = await tx.get(bookingRef);
        if (!snap.exists()) throw new Error("Booking does not exist.");

        const now = serverTimestamp();
        const scoreStatus = hasAnyShots ? 'published' : 'pending';
        const finalScore = hasAnyShots ? netScore : null;

        // Update booking summary
        tx.update(bookingRef, {
          totalScore: finalScore,
          shots: parsedShots,
          penalty: penaltyNum,
          count10s,
          count9s,
          count8s,
          roundNumber: currentRound,
          scoreStatus,
          isDQ,
          updatedAt: now,
        });

        // Save round scorecard
        tx.set(scorecardRef, {
          id: scorecardDocId,
          bookingId: booking.id,
          roundNumber: currentRound,
          shots: parsedShots,
          penalty: penaltyNum,
          shotsSum,
          totalScore: finalScore || 0,
          count10s,
          count9s,
          count8s,
          isDQ,
          notes: scoreNotes,
          createdAt: now,
          updatedAt: now,
        }, { merge: true });

        // Update leaderboard entry with tie breaker stats
        tx.set(leaderboardRef, {
          id: booking.id,
          bookingId: booking.id,
          participantEmail: booking.participantEmail,
          participantName: booking.participantName,
          gender: booking.participantGender || null,
          vertical: booking.vertical,
          score: finalScore,
          shots: parsedShots,
          penalty: penaltyNum,
          count10s,
          count9s,
          count8s,
          roundNumber: currentRound,
          scoreStatus,
          isDQ,
          lastScoreUpdatedAt: finalScore !== null ? now : null,
          updatedAt: now,
        }, { merge: true });

        // Audit Log
        tx.set(auditRef, {
          id: auditRef.id,
          action: '10_SHOT_SCORECARD_SAVED',
          entityType: 'scorecard',
          entityId: scorecardDocId,
          actorEmail: currentUser?.email || 'admin',
          vertical: booking.vertical,
          metadata: {
            roundNumber: currentRound,
            shots: parsedShots,
            shotsSum,
            penalty: penaltyNum,
            totalScore: finalScore,
            count10s,
            count9s,
            isDQ,
            ticketId: booking.ticketId,
            participantName: booking.participantName,
          },
          createdAt: now,
        });
      });

      setStatusAlert(`10-Shot scorecard for Round ${currentRound} saved for ${booking.participantName}!`);
      setExpandedBookingId(null);
    } catch (err: any) {
      console.error("Scorecard save failed:", err);
      alert(err.message || "Failed to save scorecard.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-[#F8FAFC]">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Vertical switcher tabs */}
        <div className="inline-flex p-1 bg-[#12131A] rounded-lg border border-[#282B3A]">
          <button
            onClick={() => {
              setSelectedVertical('Air Rifle');
              setExpandedBookingId(null);
            }}
            className={`px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
              selectedVertical === 'Air Rifle'
                ? 'bg-[#DC2626] text-white shadow-sm'
                : 'text-[#8E909E] hover:text-white'
            }`}
          >
            Air Rifle (10-Shot)
          </button>
          <button
            onClick={() => {
              setSelectedVertical('Air Pistol');
              setExpandedBookingId(null);
            }}
            className={`px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
              selectedVertical === 'Air Pistol'
                ? 'bg-[#DC2626] text-white shadow-sm'
                : 'text-[#8E909E] hover:text-white'
            }`}
          >
            Air Pistol (10-Shot)
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#8E909E] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search competitor, ticket or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#12131A] border border-[#282B3A] rounded-lg text-xs font-mono text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:border-[#DC2626]"
          />
        </div>
      </div>

      {statusAlert && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-mono rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{statusAlert}</span>
        </div>
      )}

      {/* Expandable Participant Cards */}
      <div className="space-y-3">
        {filteredBookings.length === 0 ? (
          <div className="p-12 text-center space-y-2 bg-[#12131A] border border-[#282B3A] rounded-xl">
            <Target className="w-8 h-8 text-[#64748B] mx-auto opacity-50" />
            <p className="font-sans font-bold text-lg text-[#F8FAFC]">No bookings found for {selectedVertical}</p>
            <p className="text-xs font-mono text-[#8E909E]">Competitors will appear here as slots are booked.</p>
          </div>
        ) : (
          filteredBookings.map((booking) => {
            const isExpanded = expandedBookingId === booking.id;
            const current10s = booking.count10s ?? (booking.shots ? booking.shots.filter(s => s >= 10).length : 0);
            const current9s = booking.count9s ?? (booking.shots ? booking.shots.filter(s => s >= 9 && s < 10).length : 0);

            return (
              <div
                key={booking.id}
                className="bg-[#12131A] border border-[#282B3A] hover:border-[#3E4256] rounded-xl overflow-hidden shadow-lg transition-all"
              >
                {/* Collapsed Card Header */}
                <div
                  onClick={() => handleExpandBooking(booking)}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-[#181A24] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 bg-[#0B0C10] border border-[#282B3A] text-[#DC2626] rounded">
                      {booking.ticketId}
                    </span>
                    <div>
                      <div className="font-sans text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                        <span>{booking.participantName}</span>
                        {booking.participantGender && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#1F202B] rounded text-[#8E909E] border border-[#2E3040]">
                            {booking.participantGender}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-[#8E909E] block">
                        {booking.participantEmail} · {booking.slotTimeLabel} ({booking.slotDateLabel})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end md:self-auto">
                    {/* Attendance Pill */}
                    <span
                      className={`text-[10px] font-mono px-2.5 py-0.5 rounded font-semibold border ${
                        booking.checkedIn 
                          ? 'bg-emerald-950/70 border-emerald-800 text-emerald-400' 
                          : 'bg-amber-950/60 border-amber-800 text-amber-400'
                      }`}
                    >
                      {booking.checkedIn ? 'Checked In' : 'Pending Check-In'}
                    </span>

                    {/* Score summary */}
                    <div className="text-right font-mono">
                      {booking.isDQ ? (
                        <span className="text-red-400 font-bold text-xs bg-red-950/70 border border-red-800 px-2 py-0.5 rounded">
                          DISQUALIFIED
                        </span>
                      ) : booking.totalScore !== null && booking.totalScore !== undefined ? (
                        <div>
                          <span className="text-lg font-bold text-[#F8FAFC]">
                            {booking.totalScore.toFixed(1)} <span className="text-xs text-[#8E909E]">PTS</span>
                          </span>
                          <span className="text-[10px] text-[#8E909E] block">
                            {current10s}× 10s · {current9s}× 9s {booking.penalty ? `(-${booking.penalty}p)` : ''}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-[#64748B] italic">Not Scored</span>
                      )}
                    </div>

                    {/* Action Button */}
                    <button
                      type="button"
                      className={`px-3 py-1.5 border rounded text-xs font-mono font-semibold transition-colors ${
                        isExpanded
                          ? 'bg-[#DC2626] border-[#DC2626] text-white'
                          : 'border-[#282B3A] text-[#F8FAFC] hover:bg-[#282B3A]'
                      }`}
                    >
                      {isExpanded ? 'Close Scorecard' : 'Enter Scores'}
                    </button>
                  </div>
                </div>

                {/* Expanded Official 10-Shot Scorecard Form */}
                {isExpanded && (
                  <div className="border-t border-[#282B3A] bg-[#0E0F15] p-6 space-y-6 animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#282B3A] pb-4">
                      <div>
                        <h4 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2 font-sans">
                          <Target className="w-5 h-5 text-[#DC2626]" />
                          <span>Official 10-Shot Scorecard Entry</span>
                        </h4>
                        <p className="text-xs font-mono text-[#8E909E] mt-0.5">
                          Enter verified shot decimal values (0.0 to 10.9) according to ISSF target ring values.
                        </p>
                      </div>

                      {/* Multi-Scorecard Round Selector */}
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-[#8E909E] uppercase">Round:</span>
                        <select
                          value={currentRound}
                          onChange={(e) => setCurrentRound(Number(e.target.value))}
                          className="p-1.5 bg-[#0B0C10] border border-[#282B3A] rounded font-semibold text-[#F8FAFC] focus:outline-none focus:border-[#DC2626]"
                        >
                          <option value={1}>Round 1 (Official)</option>
                          <option value={2}>Round 2 (Re-Entry)</option>
                          <option value={3}>Round 3 (Re-Entry)</option>
                          <option value={4}>Round 4 (Finals)</option>
                        </select>
                      </div>
                    </div>

                    {/* 10 Individual Shot Inputs */}
                    <div>
                      <label className="text-xs font-mono uppercase text-[#8E909E] block mb-2 font-semibold">
                        Individual Target Shots (1 to 10)
                      </label>
                      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                        {shots.map((shotVal, idx) => {
                          const num = parseFloat(shotVal);
                          const isTen = !isNaN(num) && num >= 10;
                          return (
                            <div key={idx} className="space-y-1 text-center">
                              <span className="text-[10px] font-mono text-[#8E909E] block">
                                Shot {idx + 1}
                              </span>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="10.9"
                                value={shotVal}
                                onChange={(e) => handleShotChange(idx, e.target.value)}
                                placeholder="0"
                                className={`w-full p-2.5 text-center font-mono font-bold text-base rounded focus:outline-none transition-all ${
                                  isTen
                                    ? 'bg-amber-950/30 border-2 border-amber-400 text-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.3)]'
                                    : 'bg-[#0B0C10] border border-[#282B3A] text-[#F8FAFC] focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]'
                                }`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Scoring Metrics & Penalty Adjustment */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#0B0C10] p-4 rounded-xl border border-[#282B3A]">
                      {/* Shot Points Sum */}
                      <div>
                        <span className="text-[10px] font-mono uppercase text-[#8E909E] block">Shots Sum</span>
                        <span className="text-xl font-mono font-bold text-[#F8FAFC]">
                          {shotsSum.toFixed(1)}
                        </span>
                      </div>

                      {/* Penalty Deductions */}
                      <div>
                        <label className="text-[10px] font-mono uppercase text-[#8E909E] block">
                          Penalty Points
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={penalty}
                          onChange={(e) => setPenalty(e.target.value)}
                          className="w-24 p-1.5 bg-[#12131A] border border-[#282B3A] rounded font-mono text-sm font-bold text-red-400 focus:outline-none focus:border-[#DC2626]"
                        />
                      </div>

                      {/* Tie-breaker statistics */}
                      <div>
                        <span className="text-[10px] font-mono uppercase text-[#8E909E] block">Tie-Breakers</span>
                        <span className="text-xs font-mono font-semibold text-[#F8FAFC]">
                          <span className="text-amber-400">{count10s}× 10s</span> · <span className="text-[#8E909E]">{count9s}× 9s</span>
                        </span>
                      </div>

                      {/* Final Net Score */}
                      <div className="text-right">
                        <span className="text-[10px] font-mono uppercase text-[#8E909E] block">Net Final Score</span>
                        <span className="text-2xl font-mono font-black text-[#DC2626]">
                          {netScore.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {/* Disqualification & Actions */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-red-400 font-semibold">
                        <input
                          type="checkbox"
                          checked={isDQ}
                          onChange={(e) => setIsDQ(e.target.checked)}
                          className="w-4 h-4 rounded bg-[#0B0C10] border-[#282B3A] text-[#DC2626] focus:ring-[#DC2626]"
                        />
                        <span>Mark this Scorecard as Disqualified (DQ)</span>
                      </label>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => setExpandedBookingId(null)}
                          className="px-4 py-2 border border-[#282B3A] bg-[#12131A] text-[#8E909E] hover:text-[#F8FAFC] rounded text-xs font-mono font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleSaveScorecard(booking)}
                          className="px-6 py-2 bg-[#DC2626] hover:bg-[#E51A1A] text-white text-xs font-mono font-bold uppercase tracking-wider rounded shadow flex items-center gap-2 transition-all"
                        >
                          <Save className="w-4 h-4 text-white" />
                          <span>{submitting ? 'Saving...' : `Save Round ${currentRound} Score`}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
