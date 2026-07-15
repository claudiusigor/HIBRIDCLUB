export const PROFILE_DISPLAY_NAME_MAX_LENGTH = 80;
export const PROFILE_BIO_MAX_LENGTH = 120;
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_INPUT_TYPES = Object.freeze(['image/jpeg', 'image/png', 'image/webp']);

export const TRAINING_FOCUS_VALUES = Object.freeze(['hybrid', 'strength', 'running']);
export const PRIMARY_GOAL_VALUES = Object.freeze([
  'performance',
  'consistency',
  'fat_loss',
  'strength',
  'endurance',
]);
export const AVATAR_FRAME_CATALOG = Object.freeze([
  { value: 'minimal', label: 'Minimal', detail: 'Essencial e discreta', rewardBadge: null },
  { value: 'blue', label: 'Azul', detail: 'Azul oficial Hybrid Club', rewardBadge: null },
  { value: 'glass', label: 'Glass', detail: 'Translúcida e luminosa', rewardBadge: null },
  { value: 'rhythm', label: 'Ritmo Azul', detail: 'Medalha Consistência', rewardBadge: 'consistency_10' },
  { value: 'prism', label: 'Prisma Híbrido', detail: 'Medalha Híbrido completo', rewardBadge: 'hybrid_complete' },
  { value: 'pulse', label: 'Pulso', detail: 'Medalha Em sequência', rewardBadge: 'streak_7' },
  { value: 'elite', label: 'Elite', detail: 'Medalha Top 10', rewardBadge: 'top_10' },
  { value: 'podium', label: 'Pódio', detail: 'Medalha Finalista', rewardBadge: 'podium' },
  { value: 'gold', label: 'Lenda Dourada', detail: 'Medalha Lenda', rewardBadge: 'champion' },
]);
export const AVATAR_FRAME_VALUES = Object.freeze(AVATAR_FRAME_CATALOG.map(({ value }) => value));
export const PRIMARY_GOAL_LABELS = Object.freeze({
  performance: 'Performance',
  consistency: 'Consistência',
  fat_loss: 'Redução de gordura',
  strength: 'Ganho de força',
  endurance: 'Resistência',
});
export const AVATAR_FRAME_REWARDS = Object.freeze(Object.fromEntries(
  AVATAR_FRAME_CATALOG.map(({ value, rewardBadge }) => [value, rewardBadge])
));
export const AVATAR_FRAME_BY_BADGE = Object.freeze(Object.fromEntries(
  AVATAR_FRAME_CATALOG
    .filter(({ rewardBadge }) => rewardBadge)
    .map(({ value, label, rewardBadge }) => [rewardBadge, { value, label }])
));

const normalizeText = (value) => String(value || '').trim();

const normalizeOption = (value, allowedValues, fallback = null) => {
  const normalized = normalizeText(value);
  return allowedValues.includes(normalized) ? normalized : fallback;
};

export function normalizeProfileCustomization(input = {}) {
  return {
    display_name: normalizeText(input.display_name).replace(/\s+/g, ' '),
    bio: normalizeText(input.bio),
    training_focus: normalizeOption(input.training_focus, TRAINING_FOCUS_VALUES),
    primary_goal: normalizeOption(input.primary_goal, PRIMARY_GOAL_VALUES),
    avatar_frame: normalizeOption(input.avatar_frame, AVATAR_FRAME_VALUES, 'minimal'),
  };
}

export function validateProfileCustomization(input = {}) {
  const rawTrainingFocus = normalizeText(input.training_focus);
  const rawPrimaryGoal = normalizeText(input.primary_goal);
  const rawAvatarFrame = normalizeText(input.avatar_frame);
  const profile = normalizeProfileCustomization(input);

  if (!profile.display_name) {
    throw new Error('Digite o nome que você quer ver no app.');
  }

  if (profile.display_name.length > PROFILE_DISPLAY_NAME_MAX_LENGTH) {
    throw new Error(`O nome precisa ter até ${PROFILE_DISPLAY_NAME_MAX_LENGTH} caracteres.`);
  }

  if (profile.bio.length > PROFILE_BIO_MAX_LENGTH) {
    throw new Error(`A bio precisa ter até ${PROFILE_BIO_MAX_LENGTH} caracteres.`);
  }

  if (rawTrainingFocus && !TRAINING_FOCUS_VALUES.includes(rawTrainingFocus)) {
    throw new Error('Escolha um foco de treino válido.');
  }

  if (rawPrimaryGoal && !PRIMARY_GOAL_VALUES.includes(rawPrimaryGoal)) {
    throw new Error('Escolha um objetivo principal válido.');
  }

  if (rawAvatarFrame && !AVATAR_FRAME_VALUES.includes(rawAvatarFrame)) {
    throw new Error('Escolha uma moldura de avatar válida.');
  }

  return profile;
}

export function getProfileCustomization(profile = {}) {
  return normalizeProfileCustomization({
    display_name: profile.display_name,
    bio: profile.bio,
    training_focus: profile.training_focus,
    primary_goal: profile.primary_goal,
    avatar_frame: profile.avatar_frame,
  });
}

export function getPrimaryGoalLabel(value, fallback = 'Não definido') {
  return PRIMARY_GOAL_LABELS[value] || fallback;
}

export function getAvatarFrameReward(badgeKey) {
  return AVATAR_FRAME_BY_BADGE[badgeKey] || null;
}

export function getUnlockedAvatarFrames(badgeKeys = []) {
  const earnedBadges = new Set(Array.isArray(badgeKeys) ? badgeKeys : []);
  return AVATAR_FRAME_VALUES.filter((frame) => {
    const rewardBadge = AVATAR_FRAME_REWARDS[frame];
    return !rewardBadge || earnedBadges.has(rewardBadge);
  });
}

export function isAvatarFrameUnlocked(frame, badgeKeys = []) {
  return getUnlockedAvatarFrames(badgeKeys).includes(frame);
}

export function validateAvatarSourceFile(file) {
  if (!file) {
    throw new Error('Escolha uma imagem para usar como foto.');
  }

  if (!AVATAR_INPUT_TYPES.includes(file.type)) {
    throw new Error('Use uma imagem JPG, PNG ou WEBP.');
  }

  if (file.size > AVATAR_MAX_BYTES) {
    throw new Error('A foto precisa ter até 5 MB.');
  }

  return file;
}
