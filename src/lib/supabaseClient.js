import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const nativeAuthRedirectUrl = 'hibridclub://auth';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function getAuthRedirectUrl() {
  if (typeof window === 'undefined') {
    return undefined;
  }

  if (Capacitor.isNativePlatform()) {
    return nativeAuthRedirectUrl;
  }

  return `${window.location.origin}${import.meta.env.BASE_URL}`;
}
