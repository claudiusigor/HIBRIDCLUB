import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

const PROFILE_SELECT = 'id, display_name, provider, first_name, has_completed_setup, profile_completed_at, created_at, updated_at';

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
    return existingProfile;
  }

  const displayName = deriveDisplayNameFromUser(user);
  const payload = {
    id: user.id,
    display_name: displayName,
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
