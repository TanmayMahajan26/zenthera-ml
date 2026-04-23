import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('zenthera_token'));

  useEffect(() => {
    if (token) {
      axios.get(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => setUser(res.data))
        .catch(() => { setToken(null); localStorage.removeItem('zenthera_token'); });
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await axios.post(`${BACKEND_URL}/api/auth/login`, { email, password });
    setToken(res.data.token);
    setUser(res.data.user);
    localStorage.setItem('zenthera_token', res.data.token);
  };

  const register = async (name: string, email: string, password: string, role: string) => {
    const res = await axios.post(`${BACKEND_URL}/api/auth/register`, { name, email, password, role });
    setToken(res.data.token);
    setUser(res.data.user);
    localStorage.setItem('zenthera_token', res.data.token);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('zenthera_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const getAuthHeaders = () => {
  const token = localStorage.getItem('zenthera_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const backendApi = axios.create({ baseURL: BACKEND_URL });
