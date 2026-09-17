import type { LeaderboardEntry, LakshyaVertical } from '../types/lakshya';

export interface RankedEntry extends LeaderboardEntry {
  rank: number | null; // null if pending or DQ
  isRanked: boolean;
}

/**
 * Sorts and ranks leaderboard entries for a single vertical.
 * 
 * Rules:
 * 1. Exclude DQ and unscored (pending) from official positive ranks.
 * 2. Higher score comes first.
 * 3. Tie-breaker Logic:
 *    - Most count of 10s wins.
 *    - If still tied, most count of 9s wins.
 *    - If still tied, most count of 8s wins.
 *    - If still tied, earlier score update timestamp wins.
 * 4. Fallback: participant name ascending.
 * 5. Supports gender filtering (All / Male / Female).
 */
export function computeRankedLeaderboard(
  entries: LeaderboardEntry[],
  vertical: LakshyaVertical,
  genderFilter: 'All' | 'Male' | 'Female' = 'All'
): RankedEntry[] {
  // Filter by vertical
  let verticalEntries = entries.filter((e) => e.vertical === vertical);

  // Filter by gender if specified
  if (genderFilter !== 'All') {
    verticalEntries = verticalEntries.filter((e) => {
      const g = (e.gender || '').trim().toLowerCase();
      if (genderFilter === 'Male') return g === 'male' || g === 'm';
      if (genderFilter === 'Female') return g === 'female' || g === 'f';
      return true;
    });
  }

  // Partition into scoreable vs non-scoreable (pending or DQ)
  const scoredActive: LeaderboardEntry[] = [];
  const pendingOrDQ: LeaderboardEntry[] = [];

  for (const entry of verticalEntries) {
    if (entry.isDQ || entry.score === null || entry.scoreStatus === 'pending') {
      pendingOrDQ.push(entry);
    } else {
      scoredActive.push(entry);
    }
  }

  const extractTime = (val: any): number => {
    if (!val) return 0;
    if (typeof val.toMillis === 'function') return val.toMillis();
    if (typeof val.getTime === 'function') return val.getTime();
    if (typeof val === 'number') return val;
    const parsed = new Date(val).getTime();
    return isNaN(parsed) ? 0 : parsed;
  };

  // Sort scored active with tie breaker logic: score -> 10s -> 9s -> 8s -> time -> name
  scoredActive.sort((a, b) => {
    const scoreA = a.score ?? 0;
    const scoreB = b.score ?? 0;
    if (scoreB !== scoreA) {
      return scoreB - scoreA; // Descending score
    }

    // Tie-breaker 1: Count of 10s
    const tensA = a.count10s ?? 0;
    const tensB = b.count10s ?? 0;
    if (tensB !== tensA) {
      return tensB - tensA; // Higher count of 10s wins
    }

    // Tie-breaker 2: Count of 9s
    const ninesA = a.count9s ?? 0;
    const ninesB = b.count9s ?? 0;
    if (ninesB !== ninesA) {
      return ninesB - ninesA; // Higher count of 9s wins
    }

    // Tie-breaker 3: Count of 8s
    const eightsA = a.count8s ?? 0;
    const eightsB = b.count8s ?? 0;
    if (eightsB !== eightsA) {
      return eightsB - eightsA; // Higher count of 8s wins
    }

    // Tie-breaker 4: Earliest update wins
    const timeA = extractTime(a.lastScoreUpdatedAt);
    const timeB = extractTime(b.lastScoreUpdatedAt);
    if (timeA && timeB && timeA !== timeB) {
      return timeA - timeB; // Ascending (earlier is better)
    }

    // Fallback: alphabetical name
    return (a.participantName || '').localeCompare(b.participantName || '');
  });

  // Assign ranks (with tied rank handling)
  const rankedResults: RankedEntry[] = [];
  for (let index = 0; index < scoredActive.length; index++) {
    const entry = scoredActive[index];
    let rank = index + 1;
    if (index > 0) {
      const prev = scoredActive[index - 1];
      const sameScore = (prev.score ?? 0) === (entry.score ?? 0);
      const same10s = (prev.count10s ?? 0) === (entry.count10s ?? 0);
      const same9s = (prev.count9s ?? 0) === (entry.count9s ?? 0);
      const same8s = (prev.count8s ?? 0) === (entry.count8s ?? 0);
      const sameTime = extractTime(prev.lastScoreUpdatedAt) === extractTime(entry.lastScoreUpdatedAt);

      if (sameScore && same10s && same9s && same8s && sameTime) {
        rank = rankedResults[index - 1].rank!;
      }
    }
    rankedResults.push({
      ...entry,
      rank,
      isRanked: true,
    });
  }

  // Sort pending / DQ
  pendingOrDQ.sort((a, b) => {
    if (a.isDQ && !b.isDQ) return 1;
    if (!a.isDQ && b.isDQ) return -1;
    return (a.participantName || '').localeCompare(b.participantName || '');
  });

  const unrankedResults: RankedEntry[] = pendingOrDQ.map((entry) => ({
    ...entry,
    rank: null,
    isRanked: false,
  }));

  return [...rankedResults, ...unrankedResults];
}
