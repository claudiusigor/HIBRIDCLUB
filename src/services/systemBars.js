import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';

export async function syncSystemBarsTheme(isDark) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await SystemBars.setStyle({
      style: isDark ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
    });
  } catch {
    // The web experience must remain usable if a native system bar call fails.
  }
}
