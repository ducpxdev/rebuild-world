import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../lib/api';
import { secureLog, cleanupTokensFromURL } from '../lib/security';

interface User {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  is_admin?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<string>;
  logout: () => Promise<void>;
  loading: boolean;
  updateUser: (u: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Initialize authentication on app load
   * SECURITY: Tokens are in httpOnly cookies, not in state
   */
  useEffect(() => {
    // SECURITY: Clean up any tokens that might be in URL
    cleanupTokensFromURL();

    // Verify authentication with backend
    // If we have a valid httpOnly cookie, this will succeed
    const verifyAuth = async () => {
      try {
        const res = await api.get('/auth/me');
        // Ensure is_admin is a boolean
        const userData = { ...res.data, is_admin: !!res.data.is_admin };
        setUser(userData);
      } catch (error) {
        // SECURITY: Clear any potentially stored tokens
        localStorage.removeItem('token');
        localStorage.removeItem('jwt');
        sessionStorage.removeItem('token');
        setUser(null);
        
        secureLog.debug('Not authenticated');
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();
  }, []);

  /**
   * Login with email and password
   * SECURITY: 
   * - Backend sets httpOnly cookie with token
   * - Frontend never receives token
   * - Frontend never stores token
   */
  const login = async (email: string, password: string) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      
      // SECURITY: Ignore any token in response (should be in httpOnly cookie instead)
      if (res.data.token) {
        secureLog.warn('Token received in response. It should be in httpOnly cookie.');
      }
      
      // User data is safe to store
      const userData = { ...res.data.user, is_admin: !!res.data.user.is_admin };
      setUser(userData);
    } catch (error) {
      // SECURITY: Clear any stored tokens on login failure
      localStorage.removeItem('token');
      localStorage.removeItem('jwt');
      sessionStorage.removeItem('token');
      throw error;
    }
  };

  /**
   * Register new user
   */
  const register = async (username: string, email: string, password: string) => {
    const res = await api.post('/auth/register', { username, email, password });
    return res.data.message;
  };

  /**
   * Logout user
   * SECURITY: Backend clears httpOnly cookie
   */
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      secureLog.debug('Logout request failed');
    } finally {
      // SECURITY: Clear any potentially stored tokens
      localStorage.removeItem('token');
      localStorage.removeItem('jwt');
      localStorage.removeItem('user');
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('jwt');
      
      setUser(null);
    }
  };

  const updateUser = (u: User) => {
    // SECURITY: Never store sensitive user data that shouldn't be exposed
    setUser(u);
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, register, logout, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
