export const RANKING_SCORING = Object.freeze({
  trainingDay: 100,
  activeStreakDay: 25,
  workoutVariety: 10,
});

export const RANKING_BADGES = Object.freeze([
  'consistency_10',
  'hybrid_complete',
  'streak_7',
  'top_10',
  'podium',
  'champion',
]);

export const FINAL_PLACEMENT_BADGES = Object.freeze(['top_10', 'podium', 'champion']);

const nonNegativeInteger = (value) => Math.max(0, Math.trunc(Number(value) || 0));

export function normalizeRankingProfile(profile = {}) {
  const bio = String(profile.bio || '').trim().slice(0, 120);
  const primaryGoal = PRIMARY_GOAL_VALUES.includes(profile.primary_goal) ? profile.primary_goal : null;
  const avatarFrame = AVATAR_FRAME_VALUES.includes(profile.avatar_frame) ? profile.avatar_frame : 'minimal';
  return {
    bio,
    primary_goal: primaryGoal,
    avatar_frame: avatarFrame,
  };
}

export function getWorkoutVariety(entry) {
  if (entry?.workout_variety != null) return nonNegativeInteger(entry.workout_variety);
  return nonNegativeInteger(entry?.month_days) > 0 ? 1 : 0;
}

export function calculateRankPoints(entry) {
  if (entry?.points != null) return nonNegativeInteger(entry.points);
  return (
    nonNegativeInteger(entry?.month_days) * RANKING_SCORING.trainingDay
    + nonNegativeInteger(entry?.streak) * RANKING_SCORING.activeStreakDay
    + getWorkoutVariety(entry) * RANKING_SCORING.workoutVariety
  );
}

export function getRankPercentile(rank, totalAthletes) {
  const total = Math.max(1, nonNegativeInteger(totalAthletes));
  const position = Math.min(total, Math.max(1, nonNegativeInteger(rank) || total));
  return Math.max(1, Math.ceil((position / total) * 100));
}

export function getDivision(rank, totalAthletes) {
  const percentile = getRankPercentile(rank, totalAthletes);
  const position = Math.max(1, nonNegativeInteger(rank));
  if (position === 1 || percentile <= 5) return 'Elite';
  if (position <= 3 || percentile <= 20) return 'Pro';
  if (percentile <= 50) return 'Competidor';
  return 'Desafiante';
}

export function getCurrentTitle(entry) {
  if (nonNegativeInteger(entry?.streak) >= 14) return 'Atleta consistente';
  if (getWorkoutVariety(entry) >= 4) return 'Híbrido completo';
  return null;
}

export function getCurrentBadges(entry) {
  const seasonFinalized = Boolean(entry?.season_finalized || entry?.final_rank);
  if (Array.isArray(entry?.badges)) {
    return [...new Set(entry.badges.filter((badge) => (
      RANKING_BADGES.includes(badge)
      && (seasonFinalized || !FINAL_PLACEMENT_BADGES.includes(badge))
    )))];
  }

  const badges = [];
  if (nonNegativeInteger(entry?.month_days) >= 10) badges.push('consistency_10');
  if (getWorkoutVariety(entry) >= 4) badges.push('hybrid_complete');
  if (nonNegativeInteger(entry?.streak) >= 7) badges.push('streak_7');
  if (seasonFinalized && nonNegativeInteger(entry?.rank) > 0 && nonNegativeInteger(entry.rank) <= 10) badges.push('top_10');
  if (seasonFinalized && nonNegativeInteger(entry?.rank) > 0 && nonNegativeInteger(entry.rank) <= 3) badges.push('podium');
  if (seasonFinalized && nonNegativeInteger(entry?.rank) === 1) badges.push('champion');
  return badges;
}

export function getPointsToAdvance(viewer, athleteAhead) {
  if (!viewer || nonNegativeInteger(viewer.rank) <= 1 || !athleteAhead) return 0;
  return Math.max(1, calculateRankPoints(athleteAhead) - calculateRankPoints(viewer) + 1);
}

export function normalizeRanking(data = [], userId, viewerAvatarUrl = '', viewerProfile = {}) {
  const total = data.length;
  return data.map((raw, index) => {
    const rank = nonNegativeInteger(raw.rank) || index + 1;
    const isViewer = Boolean(raw.is_viewer || raw.user_id === userId);
    const publicProfile = normalizeRankingProfile({
      ...raw,
      ...(isViewer ? viewerProfile : {}),
    });
    return {
      ...raw,
      ...publicProfile,
      rank,
      is_viewer: isViewer,
      month_days: nonNegativeInteger(raw.month_days),
      streak: nonNegativeInteger(raw.streak),
      points: calculateRankPoints(raw),
      workout_variety: getWorkoutVariety(raw),
      avatar_url: isViewer && viewerAvatarUrl && !raw.avatar_url ? viewerAvatarUrl : raw.avatar_url,
      percentile: nonNegativeInteger(raw.percentile) || getRankPercentile(rank, total),
      division: raw.division || getDivision(rank, total),
      title: getCurrentTitle(raw),
      badges: getCurrentBadges({ ...raw, rank }),
    };
  });
}
import { AVATAR_FRAME_VALUES, PRIMARY_GOAL_VALUES } from './profile.js';
