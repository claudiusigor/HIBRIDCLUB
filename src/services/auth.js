import { getAuthRedirectUrl, isSupabaseConfigured, supabase } from '../lib/supabaseClient';

function assertSupabaseReady() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase não configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
  }
}

export async function getCurrentSession() {
  assertSupabaseReady();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onAuthStateChange(callback) {
  assertSupabaseReady();
  return supabase.auth.onAuthStateChange(callback);
}

export async function signInWithGoogle() {
  assertSupabaseReady();

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getAuthRedirectUrl(),
    },
  });

  if (error) throw error;
}

export async function signInWithMagicLink(email) {
  assertSupabaseReady();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: getAuthRedirectUrl(),
    },
  });

  if (error) throw error;
}

export async function signOutUser() {
  assertSupabaseReady();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function clearLocalSession() {
  assertSupabaseReady();
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;
}
