/**
 * =============================================================================
 * AUTH CONTEXT - Authentication with Central Auth Service
 * =============================================================================
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { API_URLS } from '@/lib/api-config';

const AUTH_API = API_URLS.AUTH;

interface User {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
}

interface Role {
  id: string;
  name: string;
  color: string;
  priority: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  roles: Role[];
  permissions: string[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
  hasPermission: (perm: string) => boolean;
  login: () => void;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`${AUTH_API}/auth/me`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          setRoles(data.roles || []);
          setPermissions(data.permissions || []);
          setIsSuperAdmin(data.is_super_admin || false);
        } else {
          setUser(null);
          setRoles([]);
          setPermissions([]);
          setIsSuperAdmin(false);
        }
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      setUser(null);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = () => {
    const returnUrl = window.location.href;
    window.location.href = `${AUTH_API}/auth/login?return_url=${encodeURIComponent(returnUrl)}`;
  };

  const logout = () => {
    const returnUrl = window.location.origin;
    window.location.href = `${AUTH_API}/auth/logout?return_url=${encodeURIComponent(returnUrl)}`;
  };

  const refresh = async () => {
    await checkAuth();
  };

  const hasPermission = useCallback((perm: string): boolean => {
    if (isSuperAdmin) return true;
    return permissions.includes(perm);
  }, [permissions, isSuperAdmin]);

  const isAdmin = isSuperAdmin || hasPermission('view_admin');

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      roles,
      permissions,
      isAdmin,
      isSuperAdmin,
      hasPermission,
      login,
      logout,
      refresh,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

