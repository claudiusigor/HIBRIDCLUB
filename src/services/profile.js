import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { getProfileCustomization, validateAvatarSourceFile, validateProfileCustomization } from '../domain/profile';

const PROFILE_SELECT = 'id, display_name, avatar_url, provider, first_name, bio, training_focus, primary_goal, avatar_frame, has_completed_setup, profile_completed_at, created_at, updated_at';
const PROFILE_LEGACY_SELECT = 'id, display_name, avatar_url, provider, first_name, has_completed_setup, profile_completed_at, created_at, updated_at';
const PROFILE_AVATARS_BUCKET = 'profile-avatars';
const PROFILE_CUSTOMIZATION_CACHE_PREFIX = 'hibrid-profile-customization:';
const AVATAR_MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const isMissingProfileColumnError = (error) => (
  error?.code === '42703'
  || error?.code === 'PGRST204'
  || /column/i.test(error?.message || '')
  || /schema cache/i.test(error?.message || '')
);

const readCachedCustomization = (userId) => {
  if (!userId || typeof window === 'undefined') return null;
  try {
    const cached = JSON.parse(window.localStorage.getItem(`${PROFILE_CUSTOMIZATION_CACHE_PREFIX}${userId}`) || 'null');
    return cached ? getProfileCustomization(cached) : null;
  } catch {
    return null;
  }
};

const writeCachedCustomization = (userId, customization) => {
  if (!userId || typeof window === 'undefined') return;
  window.localStorage.setItem(
    `${PROFILE_CUSTOMIZATION_CACHE_PREFIX}${userId}`,
    JSON.stringify(getProfileCustomization(customization))
  );
};

const clearCachedCustomization = (userId) => {
  if (!userId || typeof window === 'undefined') return;
  window.localStorage.removeItem(`${PROFILE_CUSTOMIZATION_CACHE_PREFIX}${userId}`);
};

function assertSupabaseReady() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase não configurado para carregar o perfil do usuário.');
  }
}

export function deriveDisplayNameFromUser(user) {
  return (
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.display_name ||
    user?.email?.split('@')[0] ||
    'Novo atleta'
  );
}

export function deriveFirstName(displayName) {
  return String(displayName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)[0] || '';
}

export function getProviderName(user) {
  return user?.app_metadata?.provider || 'magic_link';
}

export function deriveAvatarUrlFromUser(user) {
  return (
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    user?.user_metadata?.photoURL ||
    ''
  );
}

export function isProfileSetupComplete(profile) {
  if (!profile) {
    return false;
  }

  if (typeof profile.has_completed_setup === 'boolean') {
    return profile.has_completed_setup;
  }

  return Boolean(String(profile.display_name || '').trim());
}

async function selectProfile(userId) {
  const { data, error } = await supabase.from('profiles').select(PROFILE_SELECT).eq('id', userId).maybeSingle();

  const isMissingColumnError = isMissingProfileColumnError(error);

  if (error && !isMissingColumnError) {
    throw error;
  }

  if (isMissingColumnError) {
    const fallback = await supabase
      .from('profiles')
      .select(PROFILE_LEGACY_SELECT)
      .eq('id', userId)
      .maybeSingle();

    if (fallback.error) {
      throw fallback.error;
    }

    const cachedCustomization = readCachedCustomization(userId);
    return fallback.data
      ? {
          ...fallback.data,
          first_name: deriveFirstName(fallback.data.display_name),
          ...getProfileCustomization({
            display_name: fallback.data.display_name,
            ...cachedCustomization,
          }),
          _uses_local_customization: true,
          has_completed_setup: Boolean(String(fallback.data.display_name || '').trim()),
          profile_completed_at: null,
        }
      : null;
  }

  return data;
}

export async function getProfile(userId) {
  assertSupabaseReady();
  return selectProfile(userId);
}

export async function getProfileBadgeKeys(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) return [];

  try {
    const { data, error } = await supabase.rpc('get_athlete_achievement_showcase', { p_user_id: userId });
    if (error) return [];
    return [...new Set((data || []).map((row) => String(row.badge_key || '')).filter(Boolean))];
  } catch {
    return [];
  }
}

export async function ensureUserProfile(user) {
  assertSupabaseReady();

  const existingProfile = await selectProfile(user.id);
  if (existingProfile) {
    const cachedCustomization = readCachedCustomization(user.id);
    if (!existingProfile._uses_local_customization && cachedCustomization) {
      return updateUserProfile(user.id, {
        ...getProfileCustomization(existingProfile),
        ...cachedCustomization,
      });
    }
    const providerAvatarUrl = deriveAvatarUrlFromUser(user);
    if (!existingProfile.avatar_url && providerAvatarUrl) {
      return updateProfileAvatarUrl(user.id, providerAvatarUrl);
    }
    return existingProfile;
  }

  const displayName = deriveDisplayNameFromUser(user);
  const payload = {
    id: user.id,
    display_name: displayName,
    avatar_url: deriveAvatarUrlFromUser(user) || null,
    provider: getProviderName(user),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
  if (error) {
    throw error;
  }

  return {
    ...payload,
    first_name: deriveFirstName(displayName),
    bio: '',
    training_focus: null,
    primary_goal: null,
    avatar_frame: 'minimal',
    has_completed_setup: false,
    profile_completed_at: null,
  };
}

export async function completeUserProfile(userId, displayName) {
  assertSupabaseReady();

  const trimmedName = String(displayName || '').trim();
  if (!trimmedName) {
    throw new Error('Escolha um nome para continuar.');
  }

  const now = new Date().toISOString();
  const fullPayload = {
    display_name: trimmedName,
    first_name: deriveFirstName(trimmedName),
    has_completed_setup: true,
    profile_completed_at: now,
    updated_at: now,
  };

  const primary = await supabase
    .from('profiles')
    .update(fullPayload)
    .eq('id', userId)
    .select(PROFILE_SELECT)
    .maybeSingle();

  if (!primary.error) {
    clearCachedCustomization(userId);
    return primary.data;
  }

  const isMissingColumnError = isMissingProfileColumnError(primary.error);

  if (!isMissingColumnError) {
    throw primary.error;
  }

  const fallbackPayload = {
    display_name: trimmedName,
    updated_at: now,
  };

  const fallback = await supabase
    .from('profiles')
    .update(fallbackPayload)
    .eq('id', userId)
    .select('id, display_name, provider, created_at, updated_at')
    .maybeSingle();

  if (fallback.error) {
    throw fallback.error;
  }

  return {
    ...fallback.data,
    first_name: deriveFirstName(trimmedName),
    ...getProfileCustomization({
      display_name: trimmedName,
      ...readCachedCustomization(userId),
    }),
    _uses_local_customization: true,
    has_completed_setup: true,
    profile_completed_at: now,
  };
}

export async function updateProfileAvatarUrl(userId, avatarUrl) {
  assertSupabaseReady();

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl, updated_at: now })
    .eq('id', userId)
    .select(PROFILE_SELECT)
    .maybeSingle();

  if (!error) {
    return data;
  }

  if (!isMissingProfileColumnError(error)) {
    throw error;
  }

  const fallback = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl, updated_at: now })
    .eq('id', userId)
    .select(PROFILE_LEGACY_SELECT)
    .maybeSingle();

  if (fallback.error) {
    throw fallback.error;
  }

  return {
    ...fallback.data,
    ...getProfileCustomization({
      display_name: fallback.data.display_name,
      ...readCachedCustomization(userId),
    }),
    _uses_local_customization: true,
  };
}

export async function updateUserProfile(userId, payload) {
  assertSupabaseReady();

  if (!userId) {
    throw new Error('Usuário não encontrado para salvar o perfil.');
  }

  const normalized = validateProfileCustomization(payload);
  const now = new Date().toISOString();
  const updatePayload = {
    ...normalized,
    bio: normalized.bio || null,
    first_name: deriveFirstName(normalized.display_name),
    updated_at: now,
  };

  const primary = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', userId)
    .select(PROFILE_SELECT)
    .maybeSingle();

  if (!primary.error) {
    clearCachedCustomization(userId);
    return primary.data;
  }

  const isMissingColumnError = isMissingProfileColumnError(primary.error);

  if (isMissingColumnError) {
    const fallback = await supabase
      .from('profiles')
      .update({
        display_name: normalized.display_name,
        first_name: deriveFirstName(normalized.display_name),
        updated_at: now,
      })
      .eq('id', userId)
      .select(PROFILE_LEGACY_SELECT)
      .maybeSingle();

    if (fallback.error) {
      throw fallback.error;
    }

    writeCachedCustomization(userId, normalized);
    return {
      ...fallback.data,
      ...normalized,
      _uses_local_customization: true,
    };
  }

  throw primary.error;
}

const getOwnedAvatarObjectPath = (userId, avatarUrl) => {
  if (!userId || !avatarUrl) return '';

  try {
    const url = new URL(avatarUrl);
    const marker = `/storage/v1/object/public/${PROFILE_AVATARS_BUCKET}/`;
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex < 0) return '';
    const objectPath = decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
    return objectPath.startsWith(`${userId}/`) ? objectPath : '';
  } catch {
    return '';
  }
};

export async function uploadProfileAvatar(userId, file, { previousAvatarUrl = '' } = {}) {
  assertSupabaseReady();

  if (!userId) {
    throw new Error('Usuário não encontrado para salvar a foto.');
  }

  validateAvatarSourceFile(file);
  const extension = AVATAR_MIME_EXTENSIONS[file.type];

  const objectPath = `${userId}/avatar-${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(PROFILE_AVATARS_BUCKET)
    .upload(objectPath, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(PROFILE_AVATARS_BUCKET).getPublicUrl(objectPath);
  const publicUrl = data?.publicUrl || '';

  if (!publicUrl) {
    throw new Error('Não foi possível gerar a URL pública da foto.');
  }

  try {
    const updatedProfile = await updateProfileAvatarUrl(userId, publicUrl);
    const previousObjectPath = getOwnedAvatarObjectPath(userId, previousAvatarUrl);
    if (previousObjectPath && previousObjectPath !== objectPath) {
      await supabase.storage.from(PROFILE_AVATARS_BUCKET).remove([previousObjectPath]);
    }
    return updatedProfile;
  } catch (error) {
    await supabase.storage.from(PROFILE_AVATARS_BUCKET).remove([objectPath]);
    throw error;
  }
}
