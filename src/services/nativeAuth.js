import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabaseClient';

function getAuthParamsFromUrl(url) {
  try {
    const parsedUrl = new URL(url);
    const paramsText = parsedUrl.hash ? parsedUrl.hash.slice(1) : parsedUrl.search.slice(1);
    return new URLSearchParams(paramsText);
  } catch {
    const paramsText = url.includes('#') ? url.split('#')[1] : url.split('?')[1] || '';
    return new URLSearchParams(paramsText);
  }
}

async function completeSupabaseAuth(url) {
  if (!url?.startsWith('hibridclub://auth') || !supabase) {
    return;
  }

  const params = getAuthParamsFromUrl(url);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (accessToken && refreshToken) {
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }
}

export async function registerNativeAuthListener() {
  if (!Capacitor.isNativePlatform()) {
    return undefined;
  }

  const launchUrl = await App.getLaunchUrl();
  await completeSupabaseAuth(launchUrl?.url);

  const listener = await App.addListener('appUrlOpen', ({ url }) => {
    completeSupabaseAuth(url);
  });

  return () => listener.remove();
}
