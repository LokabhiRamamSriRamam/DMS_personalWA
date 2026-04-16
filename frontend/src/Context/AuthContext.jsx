import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('dms_token'));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('dms_user');
    return stored ? JSON.parse(stored) : null;
  });

  function login(token, userData) {
    localStorage.setItem('dms_token', token);
    localStorage.setItem('dms_user', JSON.stringify(userData));
    setToken(token);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem('dms_token');
    localStorage.removeItem('dms_user');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
