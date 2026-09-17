import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getColRef, query, where, onSnapshot } from '../lib/firebase';
import { computeRankedLeaderboard, type RankedEntry } from '../lib/ranking';
import type { LakshyaVertical, LeaderboardEntry } from '../types/lakshya';
import { normalizeEmail } from '../config/lakshya';
import { 
  Trophy, 
  Search, 
  Medal, 
  Clock, 
  User, 
  AlertCircle, 
  RefreshCw,
  Sparkles
} from 'lucide-react';

export default function LiveLeaderboard() {
  const { currentUser } = useAuth();
  const [selectedVertical, setSelectedVertical] = useState<LakshyaVertical>('Air Rifle');
  const [selectedGender, setSelectedGender] = useState<'All' | 'Male' | 'Female'>('All');
  const [rawEntries, setRawEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const cleanUserEmail = currentUser?.email ? normalizeEmail(currentUser.email) : null;

  // Real-time listener for leaderboard entries in selected vertical
  useEffect(() => {
    setLoading(true);
    const colRef = getColRef('leaderboard_entries');
    const q = query(colRef, where('vertical', '==', selectedVertical));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries: LeaderboardEntry[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setRawEntries(entries);
      setLoading(false);
    }, (err) => {
      console.error("Error loading leaderboard:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedVertical]);

  // Compute rankings with tie breaker logic and gender filtering
  const rankedData: RankedEntry[] = useMemo(() => {
    return computeRankedLeaderboard(rawEntries, selectedVertical, selectedGender);
  }, [rawEntries, selectedVertical, selectedGender]);

  // Filter by search query
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return rankedData;
    const q = searchQuery.toLowerCase();
    return rankedData.filter((item) => 
      item.participantName?.toLowerCase().includes(q) ||
      item.participantEmail?.toLowerCase().includes(q)
    );
  }, [rankedData, searchQuery]);

  // Find current user's entry if present
  const userEntry = useMemo(() => {
    if (!cleanUserEmail) return null;
    return rankedData.find((item) => item.participantEmail?.toLowerCase() === cleanUserEmail);
  }, [rankedData, cleanUserEmail]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title & Vertical / Gender Tabs */}
      <div className="border-b border-[#CFC6B6] pb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#6F6A61]">
            <span className="w-2 h-2 rounded-full bg-[#315D4C] animate-ping"></span>
            Live Range Broadcast · Real-Time Sync
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif text-[#171717]">Competition Leaderboard</h1>
        </div>

        {/* Tab switchers: Vertical + Gender */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Vertical switcher */}
          <div className="inline-flex p-1 bg-[#E8E0D2] rounded-lg border border-[#CFC6B6]">
            <button
              onClick={() => setSelectedVertical('Air Rifle')}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-all ${
                selectedVertical === 'Air Rifle'
                  ? 'bg-[#171717] text-[#F3EEE3] shadow-sm'
                  : 'text-[#6F6A61] hover:text-[#171717]'
              }`}
            >
              Air Rifle
            </button>
            <button
              onClick={() => setSelectedVertical('Air Pistol')}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-all ${
                selectedVertical === 'Air Pistol'
                  ? 'bg-[#171717] text-[#F3EEE3] shadow-sm'
                  : 'text-[#6F6A61] hover:text-[#171717]'
              }`}
            >
              Air Pistol
            </button>
          </div>

          {/* Gender Filter Tabs */}
          <div className="inline-flex p-1 bg-[#E8E0D2] rounded-lg border border-[#CFC6B6]">
            <button
              onClick={() => setSelectedGender('All')}
              className={`px-3 py-2 text-xs font-semibold rounded-md transition-all ${
                selectedGender === 'All'
                  ? 'bg-[#171717] text-[#F3EEE3] shadow-sm'
                  : 'text-[#6F6A61] hover:text-[#171717]'
              }`}
            >
              All Categories
            </button>
            <button
              onClick={() => setSelectedGender('Male')}
              className={`px-3 py-2 text-xs font-semibold rounded-md transition-all ${
                selectedGender === 'Male'
                  ? 'bg-[#171717] text-[#F3EEE3] shadow-sm'
                  : 'text-[#6F6A61] hover:text-[#171717]'
              }`}
            >
              Male
            </button>
            <button
              onClick={() => setSelectedGender('Female')}
              className={`px-3 py-2 text-xs font-semibold rounded-md transition-all ${
                selectedGender === 'Female'
                  ? 'bg-[#171717] text-[#F3EEE3] shadow-sm'
                  : 'text-[#6F6A61] hover:text-[#171717]'
              }`}
            >
              Female
            </button>
          </div>
        </div>
      </div>

      {/* User's highlighted standing card (if participating) */}
      {userEntry && (
        <div className="bg-[#171717] text-[#F3EEE3] rounded-xl p-5 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in border border-[#E79A19]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#E79A19] text-[#171717] flex items-center justify-center font-serif text-xl font-bold shrink-0">
              {userEntry.rank ? `#${userEntry.rank}` : '—'}
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest uppercase text-[#E79A19] block">
                Your Official Standing ({selectedVertical})
              </span>
              <h3 className="font-serif text-xl font-bold">{userEntry.participantName}</h3>
              <p className="text-xs font-mono text-[#6F6A61]">{userEntry.participantEmail}</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono uppercase text-[#6F6A61] block">Match Score</span>
            {userEntry.isDQ ? (
              <span className="text-sm font-mono font-bold text-red-400">DISQUALIFIED</span>
            ) : userEntry.score !== null ? (
              <span className="text-2xl font-mono font-bold text-[#E79A19]">
                {userEntry.score.toFixed(1)} / 10.0
              </span>
            ) : (
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#333333] text-amber-300">
                SCORE NOT UPDATED
              </span>
            )}
          </div>
        </div>
      )}

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#6F6A61] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search competitor by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#FAF7F2] border border-[#CFC6B6] rounded-lg text-xs font-medium text-[#171717] placeholder:text-[#6F6A61] focus:outline-none focus:border-[#171717]"
          />
        </div>

        <div className="text-xs font-mono text-[#6F6A61] flex items-center gap-4">
          <span>Total Entries: {rankedData.length}</span>
          <span>Scored: {rankedData.filter((r) => r.score !== null).length}</span>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-[#FAF7F2] border border-[#CFC6B6] rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-xs font-mono text-[#6F6A61] space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#E79A19]" />
            <p>Syncing live range scores...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Trophy className="w-8 h-8 text-[#6F6A61] mx-auto opacity-50" />
            <p className="font-serif text-lg text-[#171717]">No competitors found</p>
            <p className="text-xs text-[#6F6A61]">
              Leaderboard will populate as participants complete their firing rounds.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#E8E0D2] border-b border-[#CFC6B6] font-mono text-[#6F6A61] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-16 text-center">Rank</th>
                  <th className="py-3 px-4">Shooter Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Tie-Breaker (10s / 9s)</th>
                  <th className="py-3 px-4 text-right">Score</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E0D2]">
                {filteredList.map((entry) => {
                  const isUser = cleanUserEmail && entry.participantEmail?.toLowerCase() === cleanUserEmail;
                  const count10 = entry.count10s ?? (entry.shots ? entry.shots.filter(s => s >= 10).length : 0);
                  const count9 = entry.count9s ?? (entry.shots ? entry.shots.filter(s => s >= 9 && s < 10).length : 0);

                  return (
                    <tr
                      key={entry.id}
                      className={`transition-colors ${
                        isUser
                          ? 'bg-[#E79A19]/15 font-semibold text-[#171717]'
                          : 'hover:bg-[#E8E0D2]/50 text-[#171717]'
                      }`}
                    >
                      {/* Rank Cell */}
                      <td className="py-3 px-4 text-center">
                        {entry.rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#E79A19] text-[#171717] font-bold font-mono text-xs shadow-sm">
                            1
                          </span>
                        ) : entry.rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300 text-[#171717] font-bold font-mono text-xs shadow-sm">
                            2
                          </span>
                        ) : entry.rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/80 text-white font-bold font-mono text-xs shadow-sm">
                            3
                          </span>
                        ) : entry.rank ? (
                          <span className="font-mono text-xs text-[#6F6A61]">
                            #{entry.rank}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-[#6F6A61]">—</span>
                        )}
                      </td>

                      {/* Participant Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-serif text-sm font-bold text-[#171717]">
                            {entry.participantName}
                          </span>
                          {isUser && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#171717] text-[#F3EEE3] rounded">
                              YOU
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-[#6F6A61] block">
                          {entry.participantEmail}
                        </span>
                      </td>

                      {/* Gender & Vertical */}
                      <td className="py-3 px-4 font-mono text-[#6F6A61]">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-[#E8E0D2] text-[#171717] text-[10px]">
                            {entry.gender || 'Shooter'}
                          </span>
                          <span className="hidden sm:inline text-[11px]">
                            {entry.vertical}
                          </span>
                        </div>
                      </td>

                      {/* Tie-Breaker Stats (10s & 9s) */}
                      <td className="py-3 px-4 text-center font-mono">
                        {entry.score !== null && !entry.isDQ ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-[#FAF7F2] border border-[#CFC6B6] rounded text-[#171717]">
                            <span className="font-bold text-[#E79A19]">{count10}× 10s</span>
                            <span className="text-[#6F6A61]">·</span>
                            <span className="text-[#6F6A61]">{count9}× 9s</span>
                          </span>
                        ) : (
                          <span className="text-[#6F6A61] italic text-[11px]">—</span>
                        )}
                      </td>

                      {/* Score */}
                      <td className="py-3 px-4 text-right font-mono">
                        {entry.isDQ ? (
                          <span className="text-[#9B2C2C] font-bold">DQ</span>
                        ) : entry.score !== null ? (
                          <span className="text-base font-bold text-[#171717]">
                            {entry.score.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-[#6F6A61] italic">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-right font-mono">
                        {entry.isDQ ? (
                          <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-semibold">
                            Disqualified
                          </span>
                        ) : entry.score !== null ? (
                          <span className="px-2 py-0.5 rounded bg-[#315D4C]/15 text-[#315D4C] text-[10px] font-semibold">
                            Verified
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-[#E8E0D2] text-[#6F6A61] text-[10px] font-medium">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
