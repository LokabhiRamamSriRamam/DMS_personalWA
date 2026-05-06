import { Capacitor } from '@capacitor/core';

async function getPreferences() {
  const { Preferences } = await import('@capacitor/preferences');
  return Preferences;
}

export const storage = {
  async get(key) {
    if (Capacitor.isNativePlatform()) {
      const Preferences = await getPreferences();
      const { value } = await Preferences.get({ key });
      return value;
    }
    return localStorage.getItem(key);
  },

  async set(key, value) {
    // Always mirror to localStorage so the sync axios interceptor can read it
    localStorage.setItem(key, value);
    if (Capacitor.isNativePlatform()) {
      const Preferences = await getPreferences();
      await Preferences.set({ key, value: String(value) });
    }
  },

  async remove(key) {
    localStorage.removeItem(key);
    if (Capacitor.isNativePlatform()) {
      const Preferences = await getPreferences();
      await Preferences.remove({ key });
    }
  },
};
