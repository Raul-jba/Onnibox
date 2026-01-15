
import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { storage, createAuditLog } from '../services/storageService';

interface AuthContextData {
  user: UserProfile | null;
  login: (email: string, pass: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  
  // Load from session storage to persist refresh, but clear on close
  useEffect(() => {
      // Ensure storage is init (creates default admin if empty)
      storage.init();
      const saved = sessionStorage.getItem('onnibox_auth');
      if (saved) setUser(JSON.parse(saved));
  }, []);

  const login = (email: string, pass: string) => {
    // Force init to ensure admin exists
    storage.init();
    const users = storage.getUsers();
    
    // Find user
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.active);
    
    if (found && found.password === pass) {
        // Build Session Profile
        const profile: UserProfile = { 
            id: found.id,
            name: found.name, 
            email: found.email,
            role: found.role, 
            companyName: 'Minha Transportadora' 
        };
        
        setUser(profile);
        sessionStorage.setItem('onnibox_auth', JSON.stringify(profile));
        
        // Audit
        createAuditLog('User', { id: found.id }, null, 'LOGIN');
        
        // Update Last Login (Optional enhancement)
        // storage.saveUser({ ...found, lastLogin: new Date().toISOString() }); 
        
        return true;
    }
    return false;
  };

  const logout = () => {
    if (user) {
        createAuditLog('User', { id: user.id }, null, 'LOGOUT');
    }
    setUser(null);
    sessionStorage.removeItem('onnibox_auth');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
