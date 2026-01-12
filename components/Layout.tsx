
import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Bus, 
  Building2, 
  Wallet, 
  FileText, 
  Settings, 
  Fuel,
  Lock,
  Map,
  Receipt,
  ChevronLeft,
  ChevronRight,
  MapPinned
} from 'lucide-react';

const NavItem = ({ to, icon: Icon, label, collapsed }: { to: string; icon: any; label: string; collapsed: boolean }) => {
  return (
    <NavLink
      to={to}
      title={collapsed ? label : ''}
      className={({ isActive }) =>
        `flex items-center gap-4 py-4 rounded-xl transition-all duration-300 mb-2 text-lg overflow-hidden whitespace-nowrap ${
          isActive 
            ? 'bg-blue-800 text-white shadow-lg font-bold border-l-8 border-blue-400' 
            : 'text-slate-300 hover:bg-slate-800 hover:text-white font-medium'
        } ${collapsed ? 'justify-center px-0 mx-2' : 'px-6'}`
      }
    >
      <Icon size={28} className="shrink-0" />
      <span className={`transition-opacity duration-300 ${collapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
        {label}
      </span>
    </NavLink>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path.includes('routes')) return 'Caixa de Linhas';
    if (path.includes('agencies')) return 'Caixa de Agências';
    if (path.includes('fuel')) return 'Combustível';
    if (path.includes('expenses')) return 'Despesas Diversas';
    if (path.includes('tourism')) return 'Turismo & Fretamento';
    if (path.includes('closing')) return 'Fechamento Diário';
    if (path.includes('reports')) return 'Relatórios';
    if (path.includes('registries')) return 'Cadastros';
    return 'OnniBox';
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden text-slate-900">
      {/* Sidebar */}
      <aside 
        className={`${isCollapsed ? 'w-24' : 'w-80'} bg-slate-900 text-white flex-shrink-0 hidden md:flex flex-col shadow-2xl z-20 transition-all duration-300 ease-in-out relative`}
      >
        {/* Toggle Button */}
        <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-20 bg-blue-600 text-white p-1.5 rounded-full shadow-lg border-2 border-slate-800 hover:bg-blue-500 z-50 transition-transform hover:scale-110"
            title={isCollapsed ? "Expandir Menu" : "Recolher Menu"}
        >
            {isCollapsed ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
        </button>

        {/* Logo Header */}
        <div className={`p-6 border-b border-slate-800 bg-slate-950 flex items-center h-28 ${isCollapsed ? 'justify-center px-2' : 'gap-4'}`}>
          <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-900/50 shrink-0 transition-all duration-300">
            <Bus className="text-white" size={32} />
          </div>
          <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            <h1 className="text-3xl font-extrabold tracking-tight text-white leading-none whitespace-nowrap">OnniBox</h1>
            <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-2 whitespace-nowrap">Gestão Financeira</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-2 scrollbar-thin scrollbar-thumb-slate-700">
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" collapsed={isCollapsed} />
          
          <div className={`pt-6 pb-2 text-sm font-extrabold text-slate-400 uppercase tracking-wider pl-4 transition-all duration-300 ${isCollapsed ? 'opacity-0 h-0 p-0 overflow-hidden' : 'opacity-100'}`}>
            Lançamentos
          </div>
          {isCollapsed && <div className="h-4 border-t border-slate-800 my-2 mx-4"></div>}
          
          <NavItem to="/routes" icon={Map} label="Caixa de Linhas" collapsed={isCollapsed} />
          <NavItem to="/agencies" icon={Building2} label="Caixa de Agências" collapsed={isCollapsed} />
          <NavItem to="/tourism" icon={MapPinned} label="Turismo" collapsed={isCollapsed} />
          <NavItem to="/fuel" icon={Fuel} label="Combustível" collapsed={isCollapsed} />
          <NavItem to="/expenses" icon={Receipt} label="Despesas Gerais" collapsed={isCollapsed} />

          <div className={`pt-6 pb-2 text-sm font-extrabold text-slate-400 uppercase tracking-wider pl-4 transition-all duration-300 ${isCollapsed ? 'opacity-0 h-0 p-0 overflow-hidden' : 'opacity-100'}`}>
            Controle
          </div>
          {isCollapsed && <div className="h-4 border-t border-slate-800 my-2 mx-4"></div>}
          
          <NavItem to="/closing" icon={Lock} label="Fechamento Diário" collapsed={isCollapsed} />
          <NavItem to="/reports" icon={FileText} label="Relatórios" collapsed={isCollapsed} />
          
          <div className={`pt-6 pb-2 text-sm font-extrabold text-slate-400 uppercase tracking-wider pl-4 transition-all duration-300 ${isCollapsed ? 'opacity-0 h-0 p-0 overflow-hidden' : 'opacity-100'}`}>
            Sistema
          </div>
          {isCollapsed && <div className="h-4 border-t border-slate-800 my-2 mx-4"></div>}
          
          <NavItem to="/registries" icon={Settings} label="Cadastros" collapsed={isCollapsed} />
        </nav>
        
        <div className="p-4 border-t border-slate-800 text-sm text-slate-500 text-center bg-slate-950 font-bold whitespace-nowrap overflow-hidden">
          {isCollapsed ? 'v1.2' : 'OnniBox System v1.2'}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-100">
        {/* Mobile Header */}
        <header className="bg-white shadow-md border-b border-slate-200 h-20 flex items-center px-6 md:hidden justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Bus className="text-blue-800" size={32} />
            <span className="font-extrabold text-slate-900 text-xl">OnniBox</span>
          </div>
        </header>

        {/* Desktop Header area */}
        <header className="hidden md:flex bg-white shadow-md border-b border-slate-200 h-24 items-center justify-between px-10 z-10 shrink-0">
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">{getPageTitle()}</h2>
          <div className="flex items-center gap-4">
             <div className="text-right">
                <p className="text-base font-bold text-slate-900">Financeiro</p>
                <p className="text-sm text-slate-600 font-semibold">Administrador</p>
             </div>
             <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-900 font-extrabold border-2 border-blue-200 shadow-sm text-lg">
               FN
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          {children}
        </div>
      </main>
    </div>
  );
};

export const Card = ({ children, className = '' }: { children?: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-xl shadow-md border border-slate-300 p-6 ${className}`}>
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
  // Increased padding (py-3 px-6) and font size (text-base) for accessibility
  const baseStyle = "px-6 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-base shadow-sm tracking-wide border-2";
  const variants = {
    primary: "bg-blue-800 text-white hover:bg-blue-900 active:bg-blue-950 border-transparent shadow-blue-900/20 focus:ring-4 focus:ring-blue-500/50",
    secondary: "bg-white text-slate-800 border-slate-400 hover:bg-slate-100 hover:text-slate-950 hover:border-slate-500 focus:ring-4 focus:ring-slate-300",
    danger: "bg-red-50 text-red-800 hover:bg-red-100 border-red-200 hover:border-red-400",
    success: "bg-green-700 text-white hover:bg-green-800 border-transparent shadow-green-900/20"
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
