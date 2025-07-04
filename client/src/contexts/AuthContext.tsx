import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { User } from '../types';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('token') !== null;
  });
  const [user, setUser] = useState<User | null>(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        return { 
          _id: decoded.userId || '',
          email: decoded.email,
          name: decoded.name,
          bio: decoded.bio,
          createdAt: decoded.createdAt,
          lastLogin: decoded.lastLogin,
          googleId: decoded.googleId
        };
      } catch (error) {
        console.error("Failed to decode token from localStorage:", error);
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem('token');
      setIsAuthenticated(token !== null);
      if (token) {
        try {
          const decoded: any = jwtDecode(token);
          setUser({ 
            _id: decoded.userId || '',
            email: decoded.email,
            name: decoded.name,
            bio: decoded.bio,
            createdAt: decoded.createdAt,
            lastLogin: decoded.lastLogin,
            googleId: decoded.googleId
          });
        } catch (error) {
          console.error("Failed to decode token on storage change:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const login = (token: string) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
    try {
      const decoded: any = jwtDecode(token);
      setUser({ 
        _id: decoded.userId || '',
        email: decoded.email,
        name: decoded.name,
        bio: decoded.bio,
        createdAt: decoded.createdAt,
        lastLogin: decoded.lastLogin,
        googleId: decoded.googleId
      });
    } catch (error) {
      console.error("Failed to decode token on login:", error);
      setUser(null);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null); // Clear user data on logout
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 