import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  AVATAR_FRAME_CATALOG,
  AVATAR_FRAME_VALUES,
  AVATAR_FRAME_REWARDS,
  AVATAR_MAX_BYTES,
  PRIMARY_GOAL_VALUES,
  PROFILE_BIO_MAX_LENGTH,
  PROFILE_DISPLAY_NAME_MAX_LENGTH,
  TRAINING_FOCUS_VALUES,
  normalizeProfileCustomization,
  getUnlockedAvatarFrames,
  isAvatarFrameUnlocked,
  validateAvatarSourceFile,
  validateProfileCustomization,
} from '../src/domain/profile.js';

const profileRewardsSql = readFileSync(
  new URL('../supabase/setup_profile_rewards.sql', import.meta.url),
  'utf8'
);

test('normalizes profile text and preserves supported personalization values', () => {
  assert.deepEqual(
    normalizeProfileCustomization({
      display_name: '  Ana   Souza  ',
      bio: '  Treino antes do trabalho.  ',
      training_focus: 'hybrid',
      primary_goal: 'consistency',
      avatar_frame: 'glass',
    }),
    {
      display_name: 'Ana Souza',
      bio: 'Treino antes do trabalho.',
      training_focus: 'hybrid',
      primary_goal: 'consistency',
      avatar_frame: 'glass',
    }
  );
});

test('falls back safely when optional enum values are unsupported', () => {
  const profile = normalizeProfileCustomization({
    display_name: 'Ana',
    training_focus: 'cycling',
    primary_goal: 'speed',
    avatar_frame: 'neon',
  });

  assert.equal(profile.training_focus, null);
  assert.equal(profile.primary_goal, null);
  assert.equal(profile.avatar_frame, 'minimal');
});

test('exposes only the supported personalization enums', () => {
  assert.deepEqual(TRAINING_FOCUS_VALUES, ['hybrid', 'strength', 'running']);
  assert.deepEqual(PRIMARY_GOAL_VALUES, ['performance', 'consistency', 'fat_loss', 'strength', 'endurance']);
  assert.deepEqual(AVATAR_FRAME_VALUES, [
    'minimal', 'blue', 'glass', 'rhythm', 'prism', 'pulse', 'elite', 'podium', 'gold',
  ]);
  assert.equal(AVATAR_FRAME_CATALOG.length, AVATAR_FRAME_VALUES.length);
});

test('keeps a visual frame style for every supported avatar frame', () => {
  const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  for (const frame of AVATAR_FRAME_VALUES) {
    assert.match(css, new RegExp(`\\.hc-profile-photo--${frame}\\s*\\{`));
  }
});

test('keeps current frames free and unlocks every premium frame through a badge', () => {
  assert.deepEqual(AVATAR_FRAME_REWARDS, {
    minimal: null,
    blue: null,
    glass: null,
    rhythm: 'consistency_10',
    prism: 'hybrid_complete',
    pulse: 'streak_7',
    elite: 'top_10',
    podium: 'podium',
    gold: 'champion',
  });
  assert.deepEqual(getUnlockedAvatarFrames([]), ['minimal', 'blue', 'glass']);
  assert.deepEqual(getUnlockedAvatarFrames(['consistency_10']), ['minimal', 'blue', 'glass', 'rhythm']);
  assert.deepEqual(
    getUnlockedAvatarFrames(['consistency_10', 'hybrid_complete', 'streak_7', 'top_10', 'podium', 'champion']),
    AVATAR_FRAME_VALUES
  );
  assert.equal(isAvatarFrameUnlocked('glass', []), true);
  assert.equal(isAvatarFrameUnlocked('gold', ['champion']), true);
  assert.equal(isAvatarFrameUnlocked('gold', ['podium']), false);
});

test('animates reward frames with a reduced-motion fallback', () => {
  const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  assert.match(css, /@keyframes hc-avatar-frame-shift/);
  assert.match(css, /\.hc-profile-photo--gold\s*\{[^}]*hc-avatar-frame-gold/s);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.hc-profile-photo--gold[\s\S]*animation: none/);
});

test('protects exclusive frames in the Supabase script', () => {
  assert.match(profileRewardsSql, /profiles_avatar_frame_reward_guard/);
  assert.match(profileRewardsSql, /when 'gold' then 'champion'/);
  assert.match(profileRewardsSql, /when 'podium' then 'podium'/);
  assert.match(profileRewardsSql, /when 'rhythm' then 'consistency_10'/);
  assert.match(profileRewardsSql, /raise exception 'A moldura % exige a conquista %\.'/);
  assert.match(profileRewardsSql, /derive_ranking_badges/);
  assert.match(profileRewardsSql, /required_badge = any\(public\.derive_ranking_badges/);
  for (const frame of AVATAR_FRAME_VALUES) {
    assert.match(profileRewardsSql, new RegExp(`'${frame}'`));
  }
});

test('keeps personalization locally until the profile migration is available', () => {
  const service = readFileSync(new URL('../src/services/profile.js', import.meta.url), 'utf8');
  assert.match(service, /PROFILE_CUSTOMIZATION_CACHE_PREFIX/);
  assert.match(service, /writeCachedCustomization\(userId, normalized\)/);
  assert.match(service, /_uses_local_customization: true/);
});

test('harmonizes native objective options with the dark theme', () => {
  const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  assert.match(css, /\.dark \.hc-profile-field select\s*\{[^}]*color-scheme: dark/s);
  assert.match(css, /\.dark \.hc-profile-field select option\s*\{[^}]*background: #171b24/s);
});

test('validates required display name and profile length limits', () => {
  assert.throws(() => validateProfileCustomization({ display_name: '   ' }), /nome/i);
  assert.throws(
    () => validateProfileCustomization({ display_name: 'x'.repeat(PROFILE_DISPLAY_NAME_MAX_LENGTH + 1) }),
    /80/
  );
  assert.throws(
    () => validateProfileCustomization({ display_name: 'Ana', bio: 'x'.repeat(PROFILE_BIO_MAX_LENGTH + 1) }),
    /120/
  );
  assert.equal(
    validateProfileCustomization({ display_name: 'Ana', bio: 'x'.repeat(PROFILE_BIO_MAX_LENGTH) }).bio.length,
    PROFILE_BIO_MAX_LENGTH
  );
});

test('rejects unsupported enum values when saving', () => {
  assert.throws(() => validateProfileCustomization({ display_name: 'Ana', training_focus: 'cycling' }), /foco/i);
  assert.throws(() => validateProfileCustomization({ display_name: 'Ana', primary_goal: 'speed' }), /objetivo/i);
  assert.throws(() => validateProfileCustomization({ display_name: 'Ana', avatar_frame: 'neon' }), /moldura/i);
});

test('accepts JPG, PNG and WEBP avatar sources up to 5 MB', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
    const file = { type, size: AVATAR_MAX_BYTES };
    assert.equal(validateAvatarSourceFile(file), file);
  }
});

test('rejects unsupported and oversized avatar sources', () => {
  assert.throws(() => validateAvatarSourceFile({ type: 'image/gif', size: 100 }), /JPG, PNG ou WEBP/);
  assert.throws(
    () => validateAvatarSourceFile({ type: 'image/jpeg', size: AVATAR_MAX_BYTES + 1 }),
    /5 MB/
  );
});
