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
    <div className="space-y-6 animate-fade-in">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Vertical switcher tabs */}
        <div className="inline-flex p-1 bg-[#E8E0D2] rounded-lg border border-[#CFC6B6]">
          <button
            onClick={() => {
              setSelectedVertical('Air Rifle');
              setExpandedBookingId(null);
            }}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
              selectedVertical === 'Air Rifle'
                ? 'bg-[#171717] text-[#F3EEE3] shadow-sm'
                : 'text-[#6F6A61] hover:text-[#171717]'
            }`}
          >
            Air Rifle Scoring (10-Shot)
          </button>
          <button
            onClick={() => {
              setSelectedVertical('Air Pistol');
              setExpandedBookingId(null);
            }}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
              selectedVertical === 'Air Pistol'
                ? 'bg-[#171717] text-[#F3EEE3] shadow-sm'
                : 'text-[#6F6A61] hover:text-[#171717]'
            }`}
          >
            Air Pistol Scoring (10-Shot)
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#6F6A61] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search competitor, ticket or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#FAF7F2] border border-[#CFC6B6] rounded-lg text-xs font-medium text-[#171717] focus:outline-none focus:border-[#171717]"
          />
        </div>
      </div>

      {statusAlert && (
        <div className="p-3 bg-[#315D4C]/15 border border-[#315D4C] text-[#315D4C] text-xs font-mono rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusAlert}</span>
        </div>
      )}

      {/* Expandable Participant Cards */}
      <div className="space-y-3">
        {filteredBookings.length === 0 ? (
          <div className="p-12 text-center space-y-2 bg-[#FAF7F2] border border-[#CFC6B6] rounded-xl">
            <Target className="w-8 h-8 text-[#6F6A61] mx-auto opacity-50" />
            <p className="font-serif text-lg text-[#171717]">No bookings found for {selectedVertical}</p>
            <p className="text-xs text-[#6F6A61]">Competitors will appear here as slots are booked.</p>
          </div>
        ) : (
          filteredBookings.map((booking) => {
            const isExpanded = expandedBookingId === booking.id;
            const current10s = booking.count10s ?? (booking.shots ? booking.shots.filter(s => s >= 10).length : 0);
            const current9s = booking.count9s ?? (booking.shots ? booking.shots.filter(s => s >= 9 && s < 10).length : 0);

            return (
              <div
                key={booking.id}
                className="bg-[#FAF7F2] border border-[#CFC6B6] rounded-xl overflow-hidden shadow-sm transition-all"
              >
                {/* Collapsed Card Header */}
                <div
                  onClick={() => handleExpandBooking(booking)}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-[#E8E0D2]/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold px-2 py-1 bg-[#171717] text-[#F3EEE3] rounded">
                      {booking.ticketId}
                    </span>
                    <div>
                      <div className="font-serif text-base font-bold text-[#171717] flex items-center gap-2">
                        <span>{booking.participantName}</span>
                        {booking.participantGender && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#E8E0D2] rounded text-[#6F6A61]">
                            {booking.participantGender}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-[#6F6A61] block">
                        {booking.participantEmail} · {booking.slotTimeLabel} ({booking.slotDateLabel})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end md:self-auto">
                    {/* Attendance Pill */}
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                        booking.checkedIn ? 'bg-[#315D4C] text-white' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {booking.checkedIn ? 'Checked In' : 'Pending'}
                    </span>

                    {/* Score summary */}
                    <div className="text-right font-mono">
                      {booking.isDQ ? (
                        <span className="text-[#9B2C2C] font-bold text-xs bg-red-100 px-2 py-0.5 rounded">
                          DISQUALIFIED
                        </span>
                      ) : booking.totalScore !== null ? (
                        <div>
                          <span className="text-lg font-bold text-[#171717]">
                            {booking.totalScore.toFixed(1)}
                          </span>
                          <span className="text-[10px] text-[#6F6A61] block">
                            {current10s}× 10s · {current9s}× 9s {booking.penalty ? `(-${booking.penalty}p)` : ''}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-[#6F6A61] italic">Not Scored</span>
                      )}
                    </div>

                    {/* Action Chevron */}
                    <button
                      type="button"
                      className="px-3 py-1.5 border border-[#CFC6B6] rounded text-xs font-medium text-[#171717] hover:bg-[#171717] hover:text-[#F3EEE3] transition-colors"
                    >
                      {isExpanded ? 'Collapse' : 'Scorecard'}
                    </button>
                  </div>
                </div>

                {/* Expanded Official 10-Shot Scorecard Form */}
                {isExpanded && (
                  <div className="border-t border-[#CFC6B6] bg-white p-6 space-y-6 animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E0D2] pb-3">
                      <div>
                        <h4 className="font-serif text-lg font-bold text-[#171717] flex items-center gap-2">
                          <Target className="w-5 h-5 text-[#E79A19]" />
                          <span>Official 10-Shot Scorecard Entry</span>
                        </h4>
                        <p className="text-xs text-[#6F6A61]">
                          Enter score value (0.0 to 10.9) for each target round shot.
                        </p>
                      </div>

                      {/* Multi-Scorecard Round Selector */}
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-[#6F6A61] uppercase">Round / Re-entry:</span>
                        <select
                          value={currentRound}
                          onChange={(e) => setCurrentRound(Number(e.target.value))}
                          className="p-1.5 bg-[#FAF7F2] border border-[#CFC6B6] rounded font-semibold text-[#171717]"
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
                      <label className="text-xs font-mono uppercase text-[#6F6A61] block mb-2 font-semibold">
                        Individual Target Shots (1 to 10)
                      </label>
                      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                        {shots.map((shotVal, idx) => (
                          <div key={idx} className="space-y-1 text-center">
                            <span className="text-[10px] font-mono text-[#6F6A61] block">
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
                              className={`w-full p-2 text-center font-mono font-bold text-sm bg-[#FAF7F2] border rounded focus:outline-none focus:border-[#171717] ${
                                parseFloat(shotVal) >= 10
                                  ? 'border-[#E79A19] bg-amber-50 text-[#171717]'
                                  : 'border-[#CFC6B6]'
                              }`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Scoring Metrics & Penalty Adjustment */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#FAF7F2] p-4 rounded-xl border border-[#CFC6B6]">
                      {/* Shot Points Sum */}
                      <div>
                        <span className="text-[10px] font-mono uppercase text-[#6F6A61] block">Shots Sum</span>
                        <span className="text-xl font-mono font-bold text-[#171717]">
                          {shotsSum.toFixed(1)}
                        </span>
                      </div>

                      {/* Penalty Deductions */}
                      <div>
                        <label className="text-[10px] font-mono uppercase text-[#6F6A61] block">
                          Penalty Points
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={penalty}
                          onChange={(e) => setPenalty(e.target.value)}
                          className="w-24 p-1.5 bg-white border border-[#CFC6B6] rounded font-mono text-sm font-bold text-red-600 focus:outline-none"
                        />
                      </div>

                      {/* Tie-breaker statistics */}
                      <div>
                        <span className="text-[10px] font-mono uppercase text-[#6F6A61] block">Tie-Breakers</span>
                        <span className="text-xs font-mono font-semibold text-[#171717]">
                          {count10s} Tens (10s) · {count9s} Nines (9s)
                        </span>
                      </div>

                      {/* Final Net Score */}
                      <div className="text-right">
                        <span className="text-[10px] font-mono uppercase text-[#6F6A61] block">Net Final Score</span>
                        <span className="text-2xl font-mono font-black text-[#E79A19]">
                          {netScore.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {/* Disqualification & Notes */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-red-700 font-semibold">
                        <input
                          type="checkbox"
                          checked={isDQ}
                          onChange={(e) => setIsDQ(e.target.checked)}
                          className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                        />
                        <span>Mark this Scorecard as Disqualified (DQ)</span>
                      </label>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => setExpandedBookingId(null)}
                          className="px-4 py-2 border border-[#CFC6B6] rounded hover:bg-[#E8E0D2] text-xs font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleSaveScorecard(booking)}
                          className="px-6 py-2 bg-[#171717] hover:bg-[#333333] text-[#F3EEE3] text-xs font-semibold rounded shadow flex items-center gap-1.5 transition-all"
                        >
                          <Save className="w-4 h-4 text-[#E79A19]" />
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
