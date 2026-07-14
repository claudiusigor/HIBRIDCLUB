import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  calculateRankPoints,
  getCurrentBadges,
  getDivision,
  getPointsToAdvance,
  getRankPercentile,
  normalizeRanking,
  RANKING_SCORING,
} from '../src/domain/ranking.js';

const rankingMigration = readFileSync(
  new URL('../supabase/migrations/20260713_ranking_seasons_arena.sql', import.meta.url),
  'utf8',
);
const rankingHotfix = readFileSync(
  new URL('../supabase/migrations/20260713_fix_ranking_user_id_ambiguity.sql', import.meta.url),
  'utf8',
);
const publicAchievementsMigration = readFileSync(
  new URL('../supabase/migrations/20260714_public_athlete_achievements.sql', import.meta.url),
  'utf8',
);
const seasonTrophyMigration = readFileSync(
  new URL('../supabase/migrations/20260714_season_trophy_rewards.sql', import.meta.url),
  'utf8',
);

test('calcula a pontuacao oficial sem divergencia', () => {
  assert.equal(RANKING_SCORING.trainingDay, 100);
  assert.equal(RANKING_SCORING.activeStreakDay, 25);
  assert.equal(RANKING_SCORING.workoutVariety, 10);
  assert.equal(calculateRankPoints({ month_days: 8, streak: 4, workout_variety: 3 }), 930);
});

test('mantem o contrato de pontuacao alinhado entre cliente e Supabase', () => {
  assert.match(rankingMigration, /values \('official', 100, 25, 10\)/);
  assert.match(rankingMigration, /month_days, 0\) \* rules\.training_day_points/);
  assert.match(rankingMigration, /st\.streak, 0\) \* rules\.active_streak_day_points/);
  assert.match(rankingMigration, /mv\.workout_variety, 0\) \* rules\.workout_variety_points/);
});

test('evita referencia ambigua a user_id nos conflitos da RPC', () => {
  for (const sql of [rankingMigration, rankingHotfix]) {
    assert.doesNotMatch(sql, /on conflict \(season_id, user_id/);
    assert.match(sql, /on conflict on constraint ranking_season_results_season_id_user_id_key/);
    assert.match(sql, /on conflict on constraint ranking_position_snapshots_pkey/);
  }
});

test('nao permite pontuacao ou metricas negativas no cliente', () => {
  assert.equal(calculateRankPoints({ month_days: -8, streak: -2, workout_variety: -1 }), 0);
  assert.equal(calculateRankPoints({ points: -500 }), 0);
});

test('preserva a pontuacao oficial devolvida pelo Supabase', () => {
  assert.equal(calculateRankPoints({ points: 1210, month_days: 1, streak: 1, workout_variety: 1 }), 1210);
});

test('classifica percentis nos limites das quatro divisoes', () => {
  assert.equal(getRankPercentile(5, 100), 5);
  assert.equal(getDivision(5, 100), 'Elite');
  assert.equal(getDivision(20, 100), 'Pro');
  assert.equal(getDivision(50, 100), 'Competidor');
  assert.equal(getDivision(51, 100), 'Desafiante');
  assert.equal(getDivision(1, 6), 'Elite');
  assert.equal(getDivision(2, 6), 'Pro');
  assert.equal(getDivision(3, 6), 'Pro');
});

test('entrega conquistas apenas ao atingir o limite real', () => {
  assert.deepEqual(getCurrentBadges({ rank: 11, month_days: 9, streak: 6, workout_variety: 3 }), []);
  assert.deepEqual(
    getCurrentBadges({ rank: 1, month_days: 10, streak: 7, workout_variety: 4 }),
    ['consistency_10', 'hybrid_complete', 'streak_7'],
  );
  assert.deepEqual(
    getCurrentBadges({ rank: 1, final_rank: 1, month_days: 10, streak: 7, workout_variety: 4 }),
    ['consistency_10', 'hybrid_complete', 'streak_7', 'top_10', 'podium', 'champion'],
  );
});

test('remove recompensas de colocacao devolvidas prematuramente pela RPC ao vivo', () => {
  assert.deepEqual(
    getCurrentBadges({ badges: ['streak_7', 'top_10', 'podium', 'champion'] }),
    ['streak_7'],
  );
  for (const sql of [rankingMigration, rankingHotfix]) {
    const liveResult = sql.slice(sql.indexOf('return query'));
    assert.doesNotMatch(liveResult, /case when snap\.rank <= 10 then 'top_10'/);
    assert.doesNotMatch(liveResult, /case when snap\.rank <= 3 then 'podium'/);
    assert.doesNotMatch(liveResult, /case when snap\.rank = 1 then 'champion'/);
  }
});

test('calcula o ponto minimo necessario para ultrapassar', () => {
  assert.equal(getPointsToAdvance({ rank: 2, points: 110 }, { rank: 1, points: 440 }), 331);
  assert.equal(getPointsToAdvance({ rank: 1, points: 440 }, null), 0);
});

test('normaliza dados antigos da RPC sem quebrar o ranking', () => {
  const result = normalizeRanking([
    { user_id: 'a', month_days: 2, streak: 2, workout_variety: 1, title: 'Campeão da temporada' },
    { user_id: 'b', month_days: 1, streak: 0, workout_variety: 1 },
  ], 'b', 'avatar.jpg');

  assert.equal(result[0].rank, 1);
  assert.equal(result[0].points, 260);
  assert.equal(result[0].title, null);
  assert.equal(result[1].rank, 2);
  assert.equal(result[1].is_viewer, true);
  assert.equal(result[1].avatar_url, 'avatar.jpg');
});

test('expoe somente a vitrine agregada de medalhas para atletas autenticados', () => {
  assert.match(publicAchievementsMigration, /security definer/);
  assert.match(publicAchievementsMigration, /auth\.uid\(\) is not null/);
  assert.match(publicAchievementsMigration, /count\(\*\)::integer as times_earned/);
  assert.match(publicAchievementsMigration, /revoke execute .* from anon, public/);
  assert.match(publicAchievementsMigration, /grant execute .* to authenticated/);
  assert.doesNotMatch(publicAchievementsMigration, /daily_logs/);
  assert.doesNotMatch(publicAchievementsMigration, /snapshot\.rank <= 10/);
  assert.doesNotMatch(publicAchievementsMigration, /snapshot\.rank = 1/);
});

test('entrega o trofeu apenas a campeoes de temporadas arquivadas', () => {
  assert.match(seasonTrophyMigration, /ranking_season_results/);
  assert.match(seasonTrophyMigration, /result\.final_rank = 1/);
  assert.match(seasonTrophyMigration, /'champion' = any\(result\.badges\)/);
  assert.match(seasonTrophyMigration, /security definer/);
  assert.match(seasonTrophyMigration, /grant execute .* to authenticated/);
});
