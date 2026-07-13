import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

const PROFILE_SELECT = 'id, display_name, avatar_url, provider, first_name, has_completed_setup, profile_completed_at, created_at, updated_at';
const PROFILE_AVATARS_BUCKET = 'profile-avatars';
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
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

  const isMissingColumnError =
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    /column/i.test(error?.message || '') ||
    /schema cache/i.test(error?.message || '');

  if (error && !isMissingColumnError) {
    throw error;
  }

  if (isMissingColumnError) {
    const fallback = await supabase
      .from('profiles')
      .select('id, display_name, provider, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (fallback.error) {
      throw fallback.error;
    }

    return fallback.data
      ? {
          ...fallback.data,
          first_name: deriveFirstName(fallback.data.display_name),
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

export async function ensureUserProfile(user) {
  assertSupabaseReady();

  const existingProfile = await selectProfile(user.id);
  if (existingProfile) {
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
    return primary.data;
  }

  const isMissingColumnError =
    primary.error?.code === '42703' ||
    primary.error?.code === 'PGRST204' ||
    /column/i.test(primary.error?.message || '') ||
    /schema cache/i.test(primary.error?.message || '');

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

  if (error) {
    throw error;
  }

  return data;
}

export async function uploadProfileAvatar(userId, file) {
  assertSupabaseReady();

  if (!userId) {
    throw new Error('Usuário não encontrado para salvar a foto.');
  }

  if (!file) {
    throw new Error('Escolha uma imagem para usar como foto.');
  }

  const extension = AVATAR_MIME_EXTENSIONS[file.type];
  if (!extension) {
    throw new Error('Use uma imagem JPG, PNG, WEBP ou GIF.');
  }

  if (file.size > AVATAR_MAX_BYTES) {
    throw new Error('A foto precisa ter até 5 MB.');
  }

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

  return updateProfileAvatarUrl(userId, publicUrl);
}
