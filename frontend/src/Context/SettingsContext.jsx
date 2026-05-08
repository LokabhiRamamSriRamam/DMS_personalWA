import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API from '../services/api';
import { useAuth } from './AuthContext';

const SettingsContext = createContext(null);

const DEFAULTS = { medicineEnabled: true, consumableEnabled: true };

export function SettingsProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [inventorySettings, setInventorySettings] = useState(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  const refreshInventorySettings = useCallback(async () => {
    try {
      const res = await API.get('/inventory/settings');
      setInventorySettings({
        medicineEnabled: res.data?.medicineEnabled ?? true,
        consumableEnabled: res.data?.consumableEnabled ?? true,
      });
    } catch (err) {
      console.warn('Failed to load inventory settings, using defaults:', err.message);
      setInventorySettings(DEFAULTS);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) refreshInventorySettings();
    else { setInventorySettings(DEFAULTS); setLoaded(false); }
  }, [isAuthenticated, refreshInventorySettings]);

  return (
    <SettingsContext.Provider value={{ inventorySettings, refreshInventorySettings, settingsLoaded: loaded }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useInventorySettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) return { inventorySettings: DEFAULTS, refreshInventorySettings: () => {}, settingsLoaded: false };
  return ctx;
}
