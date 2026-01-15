
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Bus, ArrowRight, Lock, Mail, AlertCircle } from 'lucide-react';
import { notificationService } from '../services/notificationService';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (login(email, password)) {
        notificationService.success("Bem-vindo ao OnniBox!");
    } else {
        setError("Credenciais inválidas. Verifique e tente novamente.");
        notificationService.error("Erro de autenticação.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full flex flex-col md:flex-row">
        
        {/* Left Side - Brand */}
        <div className="bg-blue-600 p-12 flex flex-col justify-between md:w-1/2 text-white relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=2069&auto=format&fit=crop')] bg-cover opacity-10"></div>
           <div className="relative z-10">
               <div className="bg-white/20 p-3 rounded-xl w-fit backdrop-blur-sm mb-6 shadow-lg">
                   <Bus size={32} className="text-white"/>
               </div>
               <h1 className="text-4xl font-extrabold tracking-tight mb-2">OnniBox</h1>
               <p className="text-blue-100 text-lg font-medium leading-relaxed">Gestão Financeira Inteligente para Transportes.</p>
           </div>
           <div className="relative z-10 text-xs text-blue-200 mt-12 border-t border-blue-500 pt-4">
               &copy; 2024 OnniBox Systems v1.3 • Enterprise Edition
           </div>
        </div>

        {/* Right Side - Form */}
        <div className="p-12 md:w-1/2 flex flex-col justify-center">
            <h2 className="text-2xl font-bold text-slate-800 mb-1">Acesso ao Sistema</h2>
            <p className="text-slate-500 mb-8 text-sm">Entre com suas credenciais corporativas.</p>

            {error && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-3 flex items-start gap-3 rounded-r">
                    <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5"/>
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">E-mail</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3.5 text-slate-400" size={20}/>
                        <input 
                            type="email" 
                            autoFocus
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 pl-10 font-medium text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none"
                            placeholder="seu.email@empresa.com"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Senha</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3.5 text-slate-400" size={20}/>
                        <input 
                            type="password" 
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 pl-10 font-medium text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                <button 
                    type="submit" 
                    className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 mt-4"
                >
                    Entrar <ArrowRight size={20}/>
                </button>
            </form>
            
            <div className="mt-8 text-center border-t border-slate-100 pt-6">
                <p className="text-xs text-slate-400 mb-2">Acesso Padrão (Demonstração):</p>
                <code className="bg-slate-100 px-2 py-1 rounded text-xs text-slate-600 font-mono">admin@onnibox.com / admin</code>
            </div>
        </div>
      </div>
    </div>
  );
};
