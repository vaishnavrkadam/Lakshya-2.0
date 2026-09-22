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

  // Compute rankings with tie breaker logic (scored only)
  const rankedData: RankedEntry[] = useMemo(() => {
    return computeRankedLeaderboard(rawEntries, selectedVertical, 'All');
  }, [rawEntries, selectedVertical]);

  // Top 5 competitors for podium highlight
  const top5Entries = useMemo(() => {
    return rankedData.slice(0, 5);
  }, [rankedData]);

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
      <div className="border-b border-[#282B3A] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
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
            Live ISSF 10-shot verified standings with Olympic tie-breaker adjudication.
          </p>
        </div>

        {/* Vertical switcher: Air Rifle vs Air Pistol */}
        <div className="inline-flex p-1 bg-[#12131A] rounded-lg border border-[#282B3A] shrink-0">
          <button
            onClick={() => setSelectedVertical('Air Rifle')}
            className={`px-5 py-2 font-mono text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
              selectedVertical === 'Air Rifle'
                ? 'bg-[#DC2626] text-white shadow-sm'
                : 'text-[#8E909E] hover:text-white'
            }`}
          >
            Air Rifle
          </button>
          <button
            onClick={() => setSelectedVertical('Air Pistol')}
            className={`px-5 py-2 font-mono text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
              selectedVertical === 'Air Pistol'
                ? 'bg-[#DC2626] text-white shadow-sm'
                : 'text-[#8E909E] hover:text-white'
            }`}
          >
            Air Pistol
          </button>
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

      {/* Top 5 Podium Showcase Cards */}
      {top5Entries.length > 0 && !searchQuery && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#F8FAFC] flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Top 5 Leaders · {selectedVertical}</span>
            </span>
            <span className="font-mono text-[11px] text-[#DC2626] font-semibold">
              OFFICIAL FINALISTS
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {top5Entries.map((topEntry) => {
              const r = topEntry.rank;
              const isRank1 = r === 1;
              const isRank2 = r === 2;
              const isRank3 = r === 3;
              const borderStyle = isRank1
                ? 'border-amber-400/80 bg-gradient-to-b from-amber-500/10 to-[#12131A]'
                : isRank2
                ? 'border-slate-300/80 bg-gradient-to-b from-slate-400/10 to-[#12131A]'
                : isRank3
                ? 'border-amber-600/80 bg-gradient-to-b from-amber-700/10 to-[#12131A]'
                : 'border-[#DC2626]/60 bg-gradient-to-b from-red-900/15 to-[#12131A]';

              const badgeColor = isRank1
                ? 'from-amber-500 to-yellow-300 text-black shadow-[0_0_12px_rgba(234,179,8,0.4)]'
                : isRank2
                ? 'from-slate-400 to-slate-200 text-black shadow-[0_0_12px_rgba(148,163,184,0.4)]'
                : isRank3
                ? 'from-amber-700 to-amber-500 text-white shadow-[0_0_12px_rgba(180,83,9,0.4)]'
                : 'from-red-800 to-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.3)]';

              const rankLabel = isRank1
                ? '1ST PLACE · GOLD'
                : isRank2
                ? '2ND PLACE · SILVER'
                : isRank3
                ? '3RD PLACE · BRONZE'
                : `RANK #${r} · TOP 5`;

              const count10 = topEntry.count10s ?? (Array.isArray(topEntry.shots) ? topEntry.shots.filter((s: any) => typeof s === 'number' && s >= 10).length : 0);

              return (
                <div
                  key={topEntry.id || topEntry.bookingId}
                  className={`border-2 rounded-xl p-4 flex flex-col justify-between transition-all hover:scale-[1.02] shadow-xl ${borderStyle}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr font-black font-mono text-sm ${badgeColor}`}>
                      {r}
                    </span>
                    <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded bg-[#0B0C10] border border-[#282B3A] text-[#F8FAFC]">
                      {rankLabel}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-white truncate" title={topEntry.participantName}>
                      {topEntry.participantName || 'Competitor'}
                    </h4>
                    <p className="font-mono text-[10px] text-[#8E909E] truncate">
                      {topEntry.participantEmail}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-[#282B3A]/60 flex items-center justify-between font-mono">
                    <span className="text-[10px] text-[#8E909E]">{count10}× 10s</span>
                    <span className="text-lg font-black text-white">
                      {topEntry.score !== null && topEntry.score !== undefined ? topEntry.score.toFixed(1) : '—'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#8E909E] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search competitor by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#12131A] border border-[#282B3A] rounded-lg text-xs font-mono text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:border-[#DC2626]"
          />
        </div>

        <div className="text-xs font-mono text-[#8E909E] flex items-center gap-4">
          <span>Ranked Competitors: {rankedData.length}</span>
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
              Leaderboard will update dynamically in real time as Admins record verified 10-shot rounds.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B0C10] border-b border-[#282B3A] font-mono text-[10px] text-[#8E909E] uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 w-16 text-center">Rank</th>
                  <th className="py-3.5 px-4">Shooter Dossier</th>
                  <th className="py-3.5 px-4">Discipline</th>
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
                  const isTop5 = entry.rank !== null && entry.rank <= 5;

                  const top5RowClass = entry.rank === 1
                    ? 'bg-gradient-to-r from-amber-500/10 via-[#12131A] to-[#12131A] border-l-4 border-l-amber-400'
                    : entry.rank === 2
                    ? 'bg-gradient-to-r from-slate-400/10 via-[#12131A] to-[#12131A] border-l-4 border-l-slate-300'
                    : entry.rank === 3
                    ? 'bg-gradient-to-r from-amber-700/10 via-[#12131A] to-[#12131A] border-l-4 border-l-amber-600'
                    : isTop5
                    ? 'bg-gradient-to-r from-red-600/10 via-[#12131A] to-[#12131A] border-l-4 border-l-[#DC2626]'
                    : '';

                  return (
                    <tr
                      key={entry.id || entry.bookingId}
                      className={`transition-colors ${
                        isUser
                          ? 'bg-[#DC2626]/20 font-semibold'
                          : top5RowClass || 'hover:bg-[#181A24]'
                      }`}
                    >
                      {/* Rank Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {entry.rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-black font-black font-mono text-xs shadow-[0_0_10px_rgba(234,179,8,0.5)]">
                            1
                          </span>
                        ) : entry.rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-tr from-slate-400 to-slate-200 text-black font-black font-mono text-xs shadow-[0_0_10px_rgba(148,163,184,0.4)]">
                            2
                          </span>
                        ) : entry.rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-tr from-amber-700 to-amber-500 text-white font-black font-mono text-xs shadow-[0_0_10px_rgba(180,83,9,0.4)]">
                            3
                          </span>
                        ) : entry.rank === 4 || entry.rank === 5 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-tr from-red-800 to-red-600 text-white font-black font-mono text-xs shadow-[0_0_8px_rgba(220,38,38,0.4)] border border-red-500/40">
                            {entry.rank}
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
                          {isTop5 && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#DC2626]/20 border border-[#DC2626]/60 text-[#F8FAFC]">
                              TOP 5
                            </span>
                          )}
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

                      {/* Discipline */}
                      <td className="py-3.5 px-4 font-mono text-[#8E909E]">
                        <span className="px-2 py-0.5 rounded bg-[#1E202B] border border-[#2E3040] text-[#F8FAFC] text-[11px] font-bold">
                          {entry.vertical}
                        </span>
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
