import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../services/api';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await API.get('/users/profile');
      setUser(res.data.user);
      setTenant(res.data.tenant);
    } catch (err) {
      console.error('Failed to load user profile:', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserContext.Provider value={{ user, tenant, loading, reload: loadProfile }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}
