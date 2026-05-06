import { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '../utils/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser]   = useState(null);
  const [ready, setReady] = useState(false);

  // On mount, restore persisted auth from storage (async on native, sync on web)
  useEffect(() => {
    async function restore() {
      try {
        const [t, u] = await Promise.all([
          storage.get('dms_token'),
          storage.get('dms_user'),
        ]);
        if (t) setToken(t);
        if (u) {
          try { setUser(JSON.parse(u)); } catch {}
        }
      } finally {
        setReady(true);
      }
    }
    restore();
  }, []);

  async function login(newToken, userData) {
    await Promise.all([
      storage.set('dms_token', newToken),
      storage.set('dms_user', JSON.stringify(userData)),
    ]);
    setToken(newToken);
    setUser(userData);
  }

  async function logout() {
    await Promise.all([
      storage.remove('dms_token'),
      storage.remove('dms_user'),
    ]);
    setToken(null);
    setUser(null);
  }

  // Show nothing while restoring persisted state (avoids flash-of-unauthenticated)
  if (!ready) return null;

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
