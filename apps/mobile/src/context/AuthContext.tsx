import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@behav/domain';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, displayName: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default mock/offline user for initial offline-first workspace testing
const DEFAULT_OFFLINE_USER: User = {
  id: 'usr_local_default',
  email: 'user@behav.local',
  displayName: 'Behav Explorer',
  accountStatus: 'ACTIVE',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  deletedAt: null
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(DEFAULT_OFFLINE_USER);
  const [token, setToken] = useState<string | null>('offline_jwt_token_sample');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    // Restore persistent session if stored locally
    setIsLoading(false);
  }, []);

  const login = async (email: string, _password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // In production, calls backend POST /api/auth/login
      const loggedUser: User = {
        id: `usr_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
        email: email.toLowerCase(),
        displayName: email.split('@')[0],
        accountStatus: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null
      };
      setUser(loggedUser);
      setToken('jwt_access_token_active');
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    email: string,
    _password: string,
    displayName: string
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      const newUser: User = {
        id: `usr_${Date.now()}`,
        email: email.toLowerCase(),
        displayName,
        accountStatus: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null
      };
      setUser(newUser);
      setToken('jwt_access_token_active');
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setUser(null);
    setToken(null);
  };

  const updateUser = (patch: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...patch });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
