import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getColRef, query, where, onSnapshot, collection, db, APP_ID } from '../lib/firebase';
import { computeRankedLeaderboard, type RankedEntry } from '../lib/ranking';
import type { LakshyaVertical, LeaderboardEntry } from '../types/lakshya';
import { normalizeEmail } from '../config/lakshya';
import { 
  Trophy, 
  Search, 
  RefreshCw,
  Crosshair,
  Shield,
  Clock,
  Target
} from 'lucide-react';

export default function LiveLeaderboard() {
  const { currentUser } = useAuth();
  const [selectedVertical, setSelectedVertical] = useState<LakshyaVertical>('Air Rifle');
  const [selectedGender, setSelectedGender] = useState<'All' | 'Male' | 'Female'>('All');
  const [rawEntries, setRawEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const cleanUserEmail = currentUser?.email ? normalizeEmail(currentUser.email) : null;

  // Real-time dual-path listener for leaderboard entries in selected vertical
  useEffect(() => {
    setLoading(true);
    const entriesMap = new Map<string, LeaderboardEntry>();

    const updateCombined = () => {
      setRawEntries(Array.from(entriesMap.values()));
      setLoading(false);
    };

    // 1. Primary path based on APP_ID
    const colRef = getColRef('leaderboard_entries');
    const q1 = query(colRef, where('vertical', '==', selectedVertical));
    const unsub1 = onSnapshot(q1, (snapshot) => {
      snapshot.docs.forEach((d) => {
        entriesMap.set(d.id, { id: d.id, ...(d.data() as any) });
      });
      updateCombined();
    }, (err) => {
      console.error("Error loading primary leaderboard:", err);
      setLoading(false);
    });

    // 2. Fallback alternate path
    const altAppId = APP_ID === 'lakshya-02' 
      ? '1:205566133235:web:691e34c3cd87d984980886' 
      : 'lakshya-02';
    const altColRef = collection(db, `artifacts/${altAppId}/public/data/leaderboard_entries`);
    const q2 = query(altColRef, where('vertical', '==', selectedVertical));
    const unsub2 = onSnapshot(q2, (snapshot) => {
      snapshot.docs.forEach((d) => {
        entriesMap.set(d.id, { id: d.id, ...(d.data() as any) });
      });
      updateCombined();
    }, () => {
      // Alternate collection might be empty/unused; ignore
    });

    return () => {
      unsub1();
      unsub2();
    };
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
      (item.participantName || '').toLowerCase().includes(q) ||
      (item.participantEmail || '').toLowerCase().includes(q)
    );
  }, [rankedData, searchQuery]);

  // Find current user's entry if logged in
  const userEntry = useMemo(() => {
    if (!cleanUserEmail) return null;
    return rankedData.find((item) => (item.participantEmail || '').toLowerCase() === cleanUserEmail);
  }, [rankedData, cleanUserEmail]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in text-[#F8FAFC]">
      {/* Title & Filter Header */}
      <div className="border-b border-[#282B3A] pb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#DC2626]">
            <span className="w-2 h-2 rounded-full bg-[#DC2626] animate-pulse"></span>
            <Crosshair className="w-3.5 h-3.5 inline" />
            <span>Official Range Broadcast · Real-Time Sync</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white mt-1 font-sans">
            Competition Leaderboard
          </h1>
          <p className="text-xs font-mono text-[#8E909E] mt-0.5">
            Live ISSF 10-shot standings with Olympic tie-breaker adjudication.
          </p>
        </div>

        {/* Tab switchers: Vertical + Gender */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Vertical switcher */}
          <div className="inline-flex p-1 bg-[#12131A] rounded-lg border border-[#282B3A]">
            <button
              onClick={() => setSelectedVertical('Air Rifle')}
              className={`px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                selectedVertical === 'Air Rifle'
                  ? 'bg-[#DC2626] text-white shadow-sm'
                  : 'text-[#8E909E] hover:text-white'
              }`}
            >
              Air Rifle
            </button>
            <button
              onClick={() => setSelectedVertical('Air Pistol')}
              className={`px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                selectedVertical === 'Air Pistol'
                  ? 'bg-[#DC2626] text-white shadow-sm'
                  : 'text-[#8E909E] hover:text-white'
              }`}
            >
              Air Pistol
            </button>
          </div>

          {/* Gender Filter Tabs */}
          <div className="inline-flex p-1 bg-[#12131A] rounded-lg border border-[#282B3A]">
            <button
              onClick={() => setSelectedGender('All')}
              className={`px-3 py-2 font-mono text-xs font-semibold uppercase tracking-wider rounded-md transition-all ${
                selectedGender === 'All'
                  ? 'bg-[#282B3A] text-white'
                  : 'text-[#8E909E] hover:text-white'
              }`}
            >
              All Divisions
            </button>
            <button
              onClick={() => setSelectedGender('Male')}
              className={`px-3 py-2 font-mono text-xs font-semibold uppercase tracking-wider rounded-md transition-all ${
                selectedGender === 'Male'
                  ? 'bg-[#282B3A] text-white'
                  : 'text-[#8E909E] hover:text-white'
              }`}
            >
              Men
            </button>
            <button
              onClick={() => setSelectedGender('Female')}
              className={`px-3 py-2 font-mono text-xs font-semibold uppercase tracking-wider rounded-md transition-all ${
                selectedGender === 'Female'
                  ? 'bg-[#282B3A] text-white'
                  : 'text-[#8E909E] hover:text-white'
              }`}
            >
              Women
            </button>
          </div>
        </div>
      </div>

      {/* User's highlighted standing card (if logged in and present) */}
      {userEntry && (
        <div className="bg-[#12131A] border-2 border-[#DC2626] rounded-xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#DC2626]/20 border border-[#DC2626] text-[#DC2626] flex items-center justify-center font-mono text-xl font-black shrink-0">
              {userEntry.rank ? `#${userEntry.rank}` : '—'}
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest uppercase text-[#DC2626] font-bold block">
                Your Official Standing ({selectedVertical})
              </span>
              <h3 className="font-bold text-lg text-white">{userEntry.participantName}</h3>
              <p className="text-xs font-mono text-[#8E909E]">{userEntry.participantEmail}</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono uppercase text-[#8E909E] block">Match Score</span>
            {userEntry.isDQ ? (
              <span className="text-sm font-mono font-bold text-red-500">DISQUALIFIED</span>
            ) : typeof userEntry.score === 'number' && !isNaN(userEntry.score) ? (
              <span className="text-2xl font-mono font-black text-[#F8FAFC]">
                {userEntry.score.toFixed(1)} <span className="text-xs text-[#8E909E]">/ 109.0</span>
              </span>
            ) : (
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#1F202B] text-amber-400 font-semibold">
                SCORE PENDING
              </span>
            )}
          </div>
        </div>
      )}

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#8E909E] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search competitor by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#12131A] border border-[#282B3A] rounded-lg text-xs font-mono text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:border-[#DC2626]"
          />
        </div>

        <div className="text-xs font-mono text-[#8E909E] flex items-center gap-4">
          <span>Total Competitors: {rankedData.length}</span>
          <span>Verified Scores: {rankedData.filter((r) => typeof r.score === 'number' && !isNaN(r.score)).length}</span>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-[#12131A] border border-[#282B3A] rounded-xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="py-20 text-center text-xs font-mono text-[#8E909E] space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#DC2626]" />
            <p className="uppercase tracking-widest">Syncing live range scores...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <Trophy className="w-10 h-10 text-[#282B3A] mx-auto" />
            <p className="font-bold text-lg text-white font-sans uppercase tracking-tight">No Scores Published Yet</p>
            <p className="text-xs font-mono text-[#8E909E] max-w-sm mx-auto">
              Leaderboard will update dynamically in real time as Range Safety Officers record verified 10-shot rounds.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B0C10] border-b border-[#282B3A] font-mono text-[10px] text-[#8E909E] uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 w-16 text-center">Rank</th>
                  <th className="py-3.5 px-4">Shooter Dossier</th>
                  <th className="py-3.5 px-4">Division</th>
                  <th className="py-3.5 px-4 text-center">Tie-Breakers (10s / 9s)</th>
                  <th className="py-3.5 px-4 text-right">Score</th>
                  <th className="py-3.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F202B]">
                {filteredList.map((entry) => {
                  const isUser = cleanUserEmail && (entry.participantEmail || '').toLowerCase() === cleanUserEmail;
                  const count10 = entry.count10s ?? (Array.isArray(entry.shots) ? entry.shots.filter((s: any) => typeof s === 'number' && s >= 10).length : 0);
                  const count9 = entry.count9s ?? (Array.isArray(entry.shots) ? entry.shots.filter((s: any) => typeof s === 'number' && s >= 9 && s < 10).length : 0);
                  const hasValidScore = typeof entry.score === 'number' && !isNaN(entry.score);

                  return (
                    <tr
                      key={entry.id || entry.bookingId}
                      className={`transition-colors ${
                        isUser
                          ? 'bg-[#DC2626]/10 font-semibold'
                          : 'hover:bg-[#181A24]'
                      }`}
                    >
                      {/* Rank Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {entry.rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-400 text-black font-black font-mono text-xs shadow">
                            1
                          </span>
                        ) : entry.rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-tr from-slate-400 to-slate-200 text-black font-black font-mono text-xs shadow">
                            2
                          </span>
                        ) : entry.rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-tr from-amber-800 to-amber-600 text-white font-black font-mono text-xs shadow">
                            3
                          </span>
                        ) : entry.rank ? (
                          <span className="font-mono text-xs font-bold text-[#8E909E]">
                            #{entry.rank}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-[#555666]">—</span>
                        )}
                      </td>

                      {/* Participant Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">
                            {entry.participantName || 'Competitor'}
                          </span>
                          {isUser && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-[#DC2626] text-white rounded">
                              YOU
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-[#8E909E] block">
                          {entry.participantEmail || ''}
                        </span>
                      </td>

                      {/* Division & Vertical */}
                      <td className="py-3.5 px-4 font-mono text-[#8E909E]">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-[#1E202B] border border-[#2E3040] text-white text-[10px] uppercase font-bold">
                            {entry.gender || 'OPEN'}
                          </span>
                          <span className="hidden sm:inline text-[11px] text-[#64748B]">
                            {entry.vertical}
                          </span>
                        </div>
                      </td>

                      {/* Tie-Breaker Stats (10s & 9s) */}
                      <td className="py-3.5 px-4 text-center font-mono">
                        {hasValidScore && !entry.isDQ ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 bg-[#0B0C10] border border-[#282B3A] rounded">
                            <span className="font-bold text-[#EAB308]">{count10}× 10s</span>
                            <span className="text-[#555666]">·</span>
                            <span className="text-[#8E909E]">{count9}× 9s</span>
                          </span>
                        ) : (
                          <span className="text-[#555666] italic text-[11px]">—</span>
                        )}
                      </td>

                      {/* Score Display */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        {entry.isDQ ? (
                          <span className="text-red-500 font-black">DQ</span>
                        ) : hasValidScore ? (
                          <span className="text-base font-black text-white">
                            {entry.score!.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-[#555666] italic">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        {entry.isDQ ? (
                          <span className="px-2.5 py-1 rounded bg-red-950/70 border border-red-800 text-red-400 text-[10px] font-bold uppercase">
                            Disqualified
                          </span>
                        ) : hasValidScore ? (
                          <span className="px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-[10px] font-bold uppercase">
                            Verified
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded bg-[#181922] border border-[#282B3A] text-[#8E909E] text-[10px] uppercase">
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
