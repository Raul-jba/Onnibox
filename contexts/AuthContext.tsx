
import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';

interface AuthContextData {
  user: UserProfile | null;
  login: (pin: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  
  // Load from session storage to persist refresh, but clear on close
  useEffect(() => {
      const saved = sessionStorage.getItem('onnibox_auth');
      if (saved) setUser(JSON.parse(saved));
  }, []);

  const login = (pin: string) => {
    let role: UserRole | null = null;
    let name = '';

    // MOCK LOGIN MATRIX
    switch (pin) {
        case '1111': // ADMIN
            role = 'ADMIN';
            name = 'Administrador';
            break;
        case '2222': // GESTOR
            role = 'MANAGER';
            name = 'Gestor de Frota';
            break;
        case '3333': // FINANCEIRO
            role = 'FINANCIAL';
            name = 'Assistente Financeiro';
            break;
        case '4444': // OPERADOR
            role = 'OPERATOR';
            name = 'Operador de Caixa';
            break;
        default:
            return false;
    }

    if (role) {
        const u: UserProfile = { name, role, companyName: 'Minha Transportadora' };
        setUser(u);
        sessionStorage.setItem('onnibox_auth', JSON.stringify(u));
        return true;
    }
    return false;
  };

  const logout = () => {
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
