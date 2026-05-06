import { Capacitor } from '@capacitor/core';

export async function openExternal(url) {
  if (!url) return;
  if (Capacitor.isNativePlatform()) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url });
  } else {
    window.open(url, '_blank', 'noreferrer');
  }
}
