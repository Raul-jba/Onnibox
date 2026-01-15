
import React, { useEffect, useState, useMemo } from 'react';
import { Card } from '../components/Layout';
import { storage, getLocalDate } from '../services/storageService';
import { RouteCash, AgencyCash, DailyClose, FuelEntry, TourismService, Vehicle } from '../types';
import { useNavigate } from 'react-router-dom';
import { usePermission } from '../hooks/usePermission';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Wallet,
  Map,
  Building2,
  Banknote,
  Lock,
  Database,
  ArrowUpRight,
  ArrowDownRight,
  Droplets,
  Target,
  ShieldAlert,
  ChevronRight,
  LayoutDashboard
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell 
} from 'recharts';

const formatMoney = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatPercent = (val: number) => `${Math.abs(val).toFixed(1)}%`;

// --- COMPONENTS ---

const TrendIndicator = ({ current, previous, invertColor = false }: { current: number, previous: number, invertColor?: boolean }) => {
    if (!previous) return <span className="text-xs text-slate-400 font-medium">-</span>;
    const delta = ((current - previous) / Math.abs(previous)) * 100;
    const isPositive = delta >= 0;
    const isGood = invertColor ? !isPositive : isPositive;
    
    return (
        <div className={`flex items-center text-xs font-bold px-1.5 py-0.5 rounded-full ${isGood ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
            {isPositive ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
            {formatPercent(delta)}
        </div>
    );
};

const KPICard = ({ title, value, previous, icon: Icon, color, prefix = '', suffix = '', invertTrend = false }: any) => (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
        <div className={`absolute -right-4 -top-4 opacity-5 rotate-12 transition-transform group-hover:scale-110 ${color}`}>
            <Icon size={100} />
        </div>
        <div className="relative z-10 flex justify-between items-start mb-2">
            <div className={`p-2.5 rounded-lg ${color} bg-opacity-10 text-opacity-100`}>
                <Icon size={20} className={color.replace('bg-', 'text-').replace('-50', '-600')} />
            </div>
            <TrendIndicator current={value} previous={previous} invertColor={invertTrend}/>
        </div>
        <div className="relative z-10">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-1">
                {prefix}{typeof value === 'number' ? (prefix === 'R$' ? formatMoney(value).replace('R$', '').trim() : value) : value}{suffix}
            </h3>
            {previous !== undefined && (
                <p className="text-[10px] text-slate-400 mt-1 font-medium">
                    Anterior: {prefix}{typeof previous === 'number' ? (prefix === 'R$' ? formatMoney(previous).replace('R$', '').trim() : previous) : previous}{suffix}
                </p>
            )}
        </div>
    </div>
);

const AlertBanner = ({ alerts }: { alerts: {title: string, msg: string, type: 'danger'|'warning'}[] }) => {
    if (alerts.length === 0) return null;
    return (
        <div className="grid gap-3">
            {alerts.map((alert, idx) => (
                <div key={idx} className={`p-4 rounded-lg border-l-4 shadow-sm flex items-start gap-3 animate-in slide-in-from-top-2 ${alert.type === 'danger' ? 'bg-rose-50 border-rose-500 text-rose-900' : 'bg-amber-50 border-amber-500 text-amber-900'}`}>
                    {alert.type === 'danger' ? <ShieldAlert size={20} className="shrink-0"/> : <AlertTriangle size={20} className="shrink-0"/>}
                    <div>
                        <h4 className="font-bold text-sm">{alert.title}</h4>
                        <p className="text-xs opacity-90 mt-0.5">{alert.msg}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

const ShortcutButton = ({ label, icon: Icon, onClick, color = 'blue' }: any) => {
    const colors: any = {
        blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100',
        purple: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-100',
        green: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100',
        slate: 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
    };
    return (
        <button onClick={onClick} className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${colors[color]} min-w-[100px]`}>
            <Icon size={24} className="mb-2"/>
            <span className="text-xs font-bold">{label}</span>
        </button>
    );
};

// --- MAIN PAGE ---

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { can } = usePermission();
  const [routes, setRoutes] = useState<RouteCash[]>([]);
  const [agencies, setAgencies] = useState<AgencyCash[]>([]);
  const [tourism, setTourism] = useState<TourismService[]>([]);
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Default: Current Month
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const [dateRange, setDateRange] = useState({ start: firstDay, end: lastDay });

  useEffect(() => {
    storage.init();
    setRoutes(storage.getRouteCash());
    setAgencies(storage.getAgencyCash());
    setTourism(storage.getTourismServices());
    setFuelEntries(storage.getFuelEntries());
    setVehicles(storage.getVehicles());
  }, []);

  // --- ENGINE ---

  const calculateStats = (start: string, end: string) => {
      const dateFilter = (d: string) => d >= start && d <= end;
      
      const fRoutes = routes.filter(r => dateFilter(r.date));
      const fAgencies = agencies.filter(a => dateFilter(a.date));
      const fTourism = tourism.filter(t => dateFilter(t.departureDate) && t.status !== 'CANCELED');
      const fFuel = fuelEntries.filter(f => dateFilter(f.date));

      const revRoutes = fRoutes.reduce((a,b) => a + b.revenueInformed, 0);
      const revAgencies = fAgencies.reduce((a,b) => a + b.valueInformed, 0);
      const revTourism = fTourism.reduce((a,b) => a + b.contractValue, 0);
      const totalRev = revRoutes + revAgencies + revTourism;

      const expRoutes = fRoutes.reduce((a,b) => a + b.cashExpenses, 0);
      const expAgencies = fAgencies.reduce((a,b) => a + (b.expenses||[]).reduce((s,e)=>s+e.amount,0), 0);
      const expTourism = fTourism.reduce((a,b) => a + (b.expenses||[]).reduce((s,e)=>s+e.amount,0), 0);
      const costFuel = fFuel.reduce((a,b) => a + b.amount, 0);
      const totalCost = expRoutes + expAgencies + expTourism + costFuel;

      const netResult = totalRev - totalCost;
      const margin = totalRev > 0 ? (netResult / totalRev) * 100 : 0;
      const fuelRatio = totalRev > 0 ? (costFuel / totalRev) * 100 : 0;

      // Ranking Vehicles (Quick calc)
      const vehicleStats: Record<string, number> = {};
      fRoutes.forEach(r => { if(r.vehicleId) vehicleStats[r.vehicleId] = (vehicleStats[r.vehicleId] || 0) + (r.revenueInformed - r.cashExpenses); });
      fTourism.forEach(t => { if(t.vehicleId) vehicleStats[t.vehicleId] = (vehicleStats[t.vehicleId] || 0) + (t.contractValue - (t.expenses||[]).reduce((x,y)=>x+y.amount,0)); });
      fFuel.forEach(f => { if(f.vehicleId) vehicleStats[f.vehicleId] = (vehicleStats[f.vehicleId] || 0) - f.amount; });

      return { totalRev, totalCost, netResult, margin, fuelRatio, costFuel, vehicleStats };
  };

  const currentStats = useMemo(() => calculateStats(dateRange.start, dateRange.end), [routes, agencies, tourism, fuelEntries, dateRange]);
  
  const previousStats = useMemo(() => {
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      const prevEnd = new Date(start);
      prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - days + 1);
      
      return calculateStats(prevStart.toISOString().split('T')[0], prevEnd.toISOString().split('T')[0]);
  }, [routes, agencies, tourism, fuelEntries, dateRange]);

  // --- ALERTS & RANKINGS ---
  const alerts = useMemo(() => {
      const list: {title: string, msg: string, type: 'danger'|'warning'}[] = [];
      
      if (currentStats.netResult < 0) {
          list.push({ title: "Operação no Vermelho", msg: `Prejuízo de ${formatMoney(currentStats.netResult)} no período selecionado.`, type: 'danger' });
      }
      if (currentStats.fuelRatio > 35) {
          list.push({ title: "Consumo de Combustível Crítico", msg: `Diesel consome ${currentStats.fuelRatio.toFixed(1)}% da receita (Meta: <35%).`, type: 'danger' });
      }
      if (currentStats.margin > 0 && currentStats.margin < 10) {
          list.push({ title: "Margem Baixa", msg: `Lucratividade de apenas ${currentStats.margin.toFixed(1)}%. Risco operacional.`, type: 'warning' });
      }
      return list;
  }, [currentStats]);

  const vehicleRanking = useMemo(() => {
      const sorted = Object.entries(currentStats.vehicleStats)
        .map(([id, profit]) => ({
            id, 
            profit: Number(profit), 
            plate: vehicles.find(v => v.id === id)?.plate || '???',
            desc: vehicles.find(v => v.id === id)?.description || ''
        }))
        .sort((a,b) => b.profit - a.profit);
      
      return {
          top: sorted.slice(0, 3),
          bottom: sorted.filter(v => v.profit < 0).sort((a,b) => a.profit - b.profit).slice(0, 3)
      };
  }, [currentStats, vehicles]);

  // --- CHART DATA ---
  const chartData = useMemo(() => {
      // Simplified daily trend for the selected range
      const data = [];
      const dt = new Date(dateRange.start + 'T12:00:00');
      const endDt = new Date(dateRange.end + 'T12:00:00');
      
      while (dt <= endDt) {
          const iso = dt.toISOString().split('T')[0];
          const dayStats = calculateStats(iso, iso);
          data.push({
              name: iso.split('-')[2] + '/' + iso.split('-')[1],
              receita: dayStats.totalRev,
              custo: dayStats.totalCost
          });
          dt.setDate(dt.getDate() + 1);
      }
      return data;
  }, [dateRange, routes, agencies, tourism, fuelEntries]);

  // Persist Warning
  const isLocalStorage = true; // Assuming typical use case, can be refined

  return (
    <div className="pb-12 space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER EXECUTIVO */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-200 pb-6">
          <div>
              <div className="flex items-center gap-2 text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">
                  <LayoutDashboard size={16}/> Visão Geral
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900">Dashboard Executivo</h1>
              <p className="text-slate-500">Acompanhamento de performance e saúde financeira.</p>
          </div>
          
          <div className="flex items-center bg-white p-1.5 rounded-xl border border-slate-300 shadow-sm">
               <span className="px-3 text-xs font-bold text-slate-500 uppercase">Período:</span>
               <input 
                  type="date" 
                  className="bg-transparent border-none font-bold text-slate-700 text-sm outline-none"
                  value={dateRange.start}
                  onChange={e => setDateRange({...dateRange, start: e.target.value})}
               />
               <span className="text-slate-400 mx-2">até</span>
               <input 
                  type="date" 
                  className="bg-transparent border-none font-bold text-slate-700 text-sm outline-none"
                  value={dateRange.end}
                  onChange={e => setDateRange({...dateRange, end: e.target.value})}
               />
          </div>
      </div>

      {/* DASHBOARD CONTENT - PERMISSION GATED */}
      {can('view_dashboard_full') ? (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            
            {/* LEFT COLUMN - KPIS & CHARTS (3/4 Width) */}
            <div className="xl:col-span-3 space-y-8">
                
                {/* 1. KPI CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KPICard 
                        title="Receita Bruta" 
                        value={currentStats.totalRev} 
                        previous={previousStats.totalRev} 
                        prefix="R$ " 
                        icon={Wallet} 
                        color="bg-blue-50 text-blue-600"
                    />
                    <KPICard 
                        title="Resultado Líquido" 
                        value={currentStats.netResult} 
                        previous={previousStats.netResult} 
                        prefix="R$ " 
                        icon={Banknote} 
                        color={currentStats.netResult >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}
                    />
                    <KPICard 
                        title="Margem de Lucro" 
                        value={currentStats.margin.toFixed(1)} 
                        previous={previousStats.margin} 
                        suffix="%" 
                        icon={Target} 
                        color="bg-purple-50 text-purple-600"
                    />
                    <KPICard 
                        title="Impacto Combustível" 
                        value={currentStats.fuelRatio.toFixed(1)} 
                        previous={previousStats.fuelRatio} 
                        suffix="%" 
                        icon={Droplets} 
                        color="bg-amber-50 text-amber-600"
                        invertTrend={true} // Lower is better
                    />
                </div>

                {/* 2. MAIN CHART */}
                <Card className="p-6 border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <TrendingUp size={20} className="text-blue-600"/> Evolução Financeira Diária
                        </h3>
                        <div className="flex gap-4 text-xs font-bold">
                            <span className="flex items-center gap-1 text-blue-600"><div className="w-3 h-3 bg-blue-500 rounded-full"></div> Receita</span>
                            <span className="flex items-center gap-1 text-amber-600"><div className="w-3 h-3 bg-amber-500 rounded-full"></div> Custos</span>
                        </div>
                    </div>
                    <div className="h-72 w-full text-xs">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tickMargin={10} stroke="#64748b"/>
                                <YAxis axisLine={false} tickLine={false} stroke="#64748b" tickFormatter={(val) => `R$${val/1000}k`}/>
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    formatter={(value: number) => formatMoney(value)}
                                />
                                <Area type="monotone" dataKey="receita" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" name="Receita"/>
                                <Area type="monotone" dataKey="custo" stroke="#f59e0b" strokeWidth={3} fill="none" name="Despesas"/>
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

            </div>

            {/* RIGHT COLUMN - INSIGHTS & RANKINGS (1/4 Width) */}
            <div className="space-y-6">
                
                {/* 3. ALERTS */}
                {alerts.length > 0 ? (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
                            <ShieldAlert size={16} className="text-rose-500"/> Atenção Necessária
                        </h3>
                        <AlertBanner alerts={alerts} />
                    </div>
                ) : (
                    <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 text-center">
                        <div className="bg-emerald-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-600">
                            <Target size={24}/>
                        </div>
                        <h4 className="font-bold text-emerald-900 text-sm">Operação Saudável</h4>
                        <p className="text-emerald-700 text-xs mt-1">Nenhum alerta crítico detectado neste período.</p>
                    </div>
                )}

                {/* 4. TOP VEHICLES */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wide flex justify-between items-center">
                        <span>Ranking Veículos</span>
                    </h3>
                    
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs font-bold text-emerald-600 mb-2 flex items-center gap-1"><TrendingUp size={14}/> Mais Rentáveis</p>
                            {vehicleRanking.top.length > 0 ? vehicleRanking.top.map((v, i) => (
                                <div key={i} className="flex justify-between items-center text-sm py-1 border-b border-slate-50 last:border-0">
                                    <div className="flex items-center gap-2">
                                        <div className="font-bold text-slate-700 w-6 text-center text-xs bg-slate-100 rounded">#{i+1}</div>
                                        <div>
                                            <div className="font-bold text-slate-800">{v.plate}</div>
                                            <div className="text-[10px] text-slate-400 truncate w-24">{v.desc}</div>
                                        </div>
                                    </div>
                                    <div className="font-bold text-emerald-600">{formatMoney(v.profit)}</div>
                                </div>
                            )) : <div className="text-xs text-slate-400 italic">Sem dados.</div>}
                        </div>

                        {vehicleRanking.bottom.length > 0 && (
                            <div>
                                <p className="text-xs font-bold text-rose-600 mb-2 flex items-center gap-1 mt-4"><TrendingDown size={14}/> Prejuízo / Menor Margem</p>
                                {vehicleRanking.bottom.map((v, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm py-1 border-b border-slate-50 last:border-0">
                                        <div className="flex items-center gap-2">
                                            <div className="font-bold text-slate-700 text-xs bg-slate-100 rounded w-6 text-center">!</div>
                                            <div className="font-bold text-slate-800">{v.plate}</div>
                                        </div>
                                        <div className="font-bold text-rose-600">{formatMoney(v.profit)}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 5. SHORTCUTS */}
                <div className="grid grid-cols-2 gap-3">
                    <ShortcutButton label="Novo Caixa" icon={Map} color="blue" onClick={() => navigate('/routes')} />
                    <ShortcutButton label="Lançar Agência" icon={Building2} color="purple" onClick={() => navigate('/agencies')} />
                    <ShortcutButton label="Fechamento" icon={Lock} color="slate" onClick={() => navigate('/closing')} />
                    <ShortcutButton label="Relatórios" icon={TrendingUp} color="green" onClick={() => navigate('/reports')} />
                </div>

            </div>
        </div>
      ) : (
        <div className="bg-slate-100 p-12 rounded-xl border border-slate-200 text-center flex flex-col items-center">
            <Lock size={64} className="text-slate-300 mb-4"/>
            <h3 className="font-bold text-xl text-slate-700">Acesso Restrito</h3>
            <p className="text-slate-500 max-w-md mx-auto mt-2">
                Este dashboard executivo contém informações financeiras sensíveis disponíveis apenas para Administradores e Gestores.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4">
                <button onClick={() => navigate('/routes')} className="bg-white border border-slate-300 px-6 py-3 rounded-lg font-bold text-slate-600 hover:bg-slate-50">Ir para Operacional</button>
            </div>
        </div>
      )}

      {/* STORAGE WARNING */}
      {isLocalStorage && can('manage_system') && (
          <div className="mt-12 pt-6 border-t border-slate-200 flex justify-center">
              <button onClick={() => navigate('/registries')} className="flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 px-4 py-2 rounded-full hover:bg-amber-100 transition-colors">
                  <Database size={14}/> Backup de Segurança Recomendado
              </button>
          </div>
      )}
    </div>
  );
};
