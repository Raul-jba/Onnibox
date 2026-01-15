
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Bus, ArrowRight, Lock } from 'lucide-react';
import { notificationService } from '../services/notificationService';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [pin, setPin] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(pin)) {
        notificationService.success("Bem-vindo ao OnniBox!");
    } else {
        notificationService.error("PIN Incorreto. Tente 1234.");
        setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full flex flex-col md:flex-row">
        
        {/* Left Side - Brand */}
        <div className="bg-blue-600 p-12 flex flex-col justify-between md:w-1/2 text-white relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=2069&auto=format&fit=crop')] bg-cover opacity-10"></div>
           <div className="relative z-10">
               <div className="bg-white/20 p-3 rounded-xl w-fit backdrop-blur-sm mb-6">
                   <Bus size={32} className="text-white"/>
               </div>
               <h1 className="text-4xl font-extrabold tracking-tight mb-2">OnniBox</h1>
               <p className="text-blue-100 text-lg">Sistema de Controle Financeiro para Transporte de Passageiros.</p>
           </div>
           <div className="relative z-10 text-xs text-blue-200 mt-12">
               &copy; 2024 OnniBox Systems v1.0
           </div>
        </div>

        {/* Right Side - Form */}
        <div className="p-12 md:w-1/2 flex flex-col justify-center">
            <h2 className="text-2xl font-bold text-slate-800 mb-1">Acesso ao Sistema</h2>
            <p className="text-slate-500 mb-8 text-sm">Digite seu PIN de segurança para continuar.</p>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">PIN de Acesso</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3.5 text-slate-400" size={20}/>
                        <input 
                            type="password" 
                            autoFocus
                            maxLength={4}
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 pl-10 text-xl font-bold text-slate-800 tracking-widest focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none text-center"
                            placeholder="••••"
                        />
                    </div>
                </div>

                <button 
                    type="submit" 
                    className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
                >
                    Entrar <ArrowRight size={20}/>
                </button>
            </form>
            
            <div className="mt-8 text-center bg-blue-50 p-4 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-800 font-medium">Dica para Demonstração:</p>
                <p className="text-sm font-bold text-blue-900">PIN: 1234</p>
            </div>
        </div>
      </div>
    </div>
  );
};
