
import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermission } from '../hooks/usePermission';
import { 
  LayoutDashboard, 
  Bus, 
  Building2, 
  FileText, 
  Settings, 
  Fuel,
  Lock,
  Map,
  ChevronLeft,
  ChevronRight,
  MapPinned,
  Banknote,
  Menu,
  Bell,
  UserCircle,
  LogOut,
  ShieldCheck,
  Eye,
  Network,
  User
} from 'lucide-react';

const NavItem = ({ to, icon: Icon, label, collapsed }: { to: string; icon: any; label: string; collapsed: boolean }) => {
  return (
    <NavLink
      to={to}
      title={collapsed ? label : ''}
      className={({ isActive }) =>
        `flex items-center gap-3 py-3 px-4 rounded-lg transition-all duration-200 mb-1 text-sm font-medium ${
          isActive 
            ? 'bg-blue-50 text-blue-700 font-bold border-l-4 border-blue-600 shadow-sm' 
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        } ${collapsed ? 'justify-center px-2' : ''}`
      }
    >
      <Icon size={20} className={collapsed ? '' : 'shrink-0'} />
      <span className={`transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden ${collapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
        {label}
      </span>
    </NavLink>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const { can, roleName } = usePermission();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Visão Geral';
    if (path.includes('routes')) return 'Caixa de Linhas';
    if (path.includes('agencies')) return 'Caixa de Agências';
    if (path.includes('fuel')) return 'Combustível';
    if (path.includes('expenses')) return 'Contas a Pagar';
    if (path.includes('driver-ledger')) return 'Conta Motoristas';
    if (path.includes('tourism')) return 'Turismo';
    if (path.includes('closing')) return 'Fechamento';
    if (path.includes('reports')) return 'Relatórios';
    if (path.includes('audit')) return 'Auditoria';
    if (path.includes('evolution')) return 'Roadmap Sistema';
    if (path.includes('registries')) return 'Cadastros';
    return 'OnniBox';
  };

  return (
    <div className="flex h-screen bg-[#f3f4f6] overflow-hidden text-slate-900 font-sans">
      
      {/* HEADER (Top Bar - Dark Blue like Inspiration) */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-[#0f172a] text-white flex items-center justify-between px-4 z-50 shadow-md">
        <div className="flex items-center gap-4">
            <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors md:hidden"
            >
                <Menu size={24} />
            </button>
            <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-1.5 rounded-lg">
                    <Bus className="text-white" size={20} />
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight leading-none">OnniBox <span className="font-light opacity-70">Suíte</span></h1>
                </div>
            </div>
            <div className="h-6 w-px bg-white/20 mx-2 hidden md:block"></div>
            <span className="text-sm font-medium text-slate-300 hidden md:block">{getPageTitle()}</span>
        </div>

        <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 pl-6 border-l border-white/10">
                <div className="text-right hidden md:block">
                    <p className="text-sm font-bold leading-none">{user?.name || 'Usuário'}</p>
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                        <ShieldCheck size={10} className="text-blue-400"/>
                        <p className="text-[10px] uppercase text-blue-200 font-bold tracking-wider">{roleName}</p>
                    </div>
                </div>
                <div className="bg-white/10 p-1 rounded-full">
                    <UserCircle size={32} className="text-slate-300" />
                </div>
                <button onClick={logout} className="ml-2 p-2 hover:bg-white/10 rounded-full text-red-400 transition-colors" title="Sair">
                    <LogOut size={20} />
                </button>
            </div>
        </div>
      </header>

      {/* SIDEBAR (Left - White/Light) */}
      <aside 
        className={`bg-white border-r border-slate-200 flex-shrink-0 flex flex-col pt-20 transition-all duration-300 ease-in-out z-40 ${isCollapsed ? 'w-20' : 'w-64'}`}
      >
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1 custom-scrollbar">
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" collapsed={isCollapsed} />
          
          <div className={`mt-6 mb-2 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider transition-opacity duration-300 ${isCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
            Operacional
          </div>
          <NavItem to="/routes" icon={Map} label="Caixa de Linhas" collapsed={isCollapsed} />
          <NavItem to="/agencies" icon={Building2} label="Caixa de Agências" collapsed={isCollapsed} />
          <NavItem to="/tourism" icon={MapPinned} label="Turismo" collapsed={isCollapsed} />
          
          <div className={`mt-6 mb-2 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider transition-opacity duration-300 ${isCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
            Financeiro
          </div>
          <NavItem to="/fuel" icon={Fuel} label="Combustível" collapsed={isCollapsed} />
          
          {can('manage_financials') && (
            <>
                <NavItem to="/driver-ledger" icon={User} label="Conta Motoristas" collapsed={isCollapsed} />
                <NavItem to="/expenses" icon={Banknote} label="Contas a Pagar" collapsed={isCollapsed} />
                <NavItem to="/closing" icon={Lock} label="Fechamento Diário" collapsed={isCollapsed} />
            </>
          )}
          
          <div className={`mt-6 mb-2 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider transition-opacity duration-300 ${isCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
            Gestão
          </div>
          {can('view_reports') && (
            <>
                <NavItem to="/reports" icon={FileText} label="Relatórios" collapsed={isCollapsed} />
                <NavItem to="/audit" icon={Eye} label="Auditoria" collapsed={isCollapsed} />
            </>
          )}
          
          {can('manage_system') && (
            <NavItem to="/evolution" icon={Network} label="Roadmap Sistema" collapsed={isCollapsed} />
          )}

          {/* Operator can access registries to View Drivers/Vehicles/Lines but not Edit System */}
          <NavItem to="/registries" icon={Settings} label="Cadastros" collapsed={isCollapsed} />
        </nav>

        {/* Sidebar Footer Toggle */}
        <div className="p-3 border-t border-slate-100 mt-auto">
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`w-full flex items-center gap-3 py-2 px-3 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all duration-200 ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? "Expandir Menu" : "Recolher Menu"}
            >
                {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                <span className={`text-sm font-medium transition-all duration-300 whitespace-nowrap overflow-hidden ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                    Recolher Menu
                </span>
            </button>
        </div>

        <div className={`p-4 text-xs text-slate-400 text-center whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'opacity-0 h-0 p-0' : 'opacity-100'}`}>
          OnniBox System © 2024
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col pt-16 h-screen overflow-hidden bg-[#f3f4f6]">
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
};

export const Card = ({ children, className = '' }: { children?: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-lg shadow-sm border border-slate-200 p-6 ${className}`}>
    {children}
  </div>
);

export const Button = ({ 
  children, onClick, variant = 'primary', className = '', type = 'button', disabled = false 
}: { 
  children?: React.ReactNode, 
  onClick?: () => void, 
  variant?: 'primary' | 'secondary' | 'danger' | 'success', 
  className?: string,
  type?: 'button' | 'submit',
  disabled?: boolean
}) => {
  const baseStyle = "px-4 py-2 rounded-md font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 border border-transparent active:bg-blue-800",
    secondary: "bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 hover:border-blue-300",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 border border-transparent"
  };

  return (
    <button 
      type={type}
      className={`${baseStyle} ${variants[variant]} ${className}`} 
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
