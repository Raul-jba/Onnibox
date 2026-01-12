
import React, { useEffect, useState, useMemo } from 'react';
import { Card } from '../components/Layout';
import { storage, getLocalDate } from '../services/storageService';
import { RouteCash, AgencyCash, DailyClose, Vehicle, FuelEntry } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertCircle, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Bus,
  Wallet,
  CheckCircle2,
  Calendar,
  Fuel,
  Search
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

const formatMoney = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const DARK_INPUT_CLASS = "input-dark bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none";

export const Dashboard: React.FC = () => {
  const [routes, setRoutes] = useState<RouteCash[]>([]);
  const [agencies, setAgencies] = useState<AgencyCash[]>([]);
  const [closes, setCloses] = useState<DailyClose[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>([]);

  const [dateRange, setDateRange] = useState({
    start: getLocalDate(),
    end: getLocalDate()
  });

  useEffect(() => {
    storage.init();
    setRoutes(storage.getRouteCash());
    setAgencies(storage.getAgencyCash());
    setCloses(storage.getDailyCloses());
    setVehicles(storage.getVehicles());
    setFuelEntries(storage.getFuelEntries());
  }, []);

  const getDayStats = (date: string) => {
    const closedData = closes.find(c => c.date === date);
    
    // Fuel calculation
    const dayFuelCost = fuelEntries
      .filter(f => f.date === date)
      .reduce((acc, curr) => acc + curr.amount, 0);

    if (closedData) {
        return {
            revenue: closedData.totalRouteRevenue + closedData.totalAgencyRevenue,
            expenses: closedData.totalExpenses,
            net: closedData.netResult,
            diff: closedData.totalDiff,
            fuel: dayFuelCost,
            count: 0
        };
    }

    const dayRoutes = routes.filter(r => r.date === date);
    const dayAgencies = agencies.filter(a => a.date === date);

    const grossRevenue = dayRoutes.reduce((acc, r) => acc + r.revenueInformed, 0) + 
                         dayAgencies.reduce((acc, a) => acc + a.valueInformed, 0);
    
    const cashExpenses = dayRoutes.reduce((acc, r) => acc + r.cashExpenses, 0);
    
    const cashHanded = dayRoutes.reduce((acc, r) => acc + r.cashHanded, 0) +
                       dayAgencies.reduce((acc, a) => acc + a.valueReceived, 0);

    const diff = dayRoutes.reduce((acc, r) => acc + r.diff, 0) +
                 dayAgencies.reduce((acc, a) => acc + a.diff, 0);

    return { 
        revenue: grossRevenue, 
        expenses: cashExpenses, 
        net: cashHanded,
        diff, 
        fuel: dayFuelCost,
        count: dayRoutes.length + dayAgencies.length 
    };
  };

  const getDatesInRange = (start: string, end: string) => {
    const arr = [];
    const dt = new Date(start + 'T12:00:00');
    const endDt = new Date(end + 'T12:00:00');
    while (dt <= endDt) {
      arr.push(dt.toISOString().split('T')[0]);
      dt.setDate(dt.getDate() + 1);
    }
    return arr;
  };

  const periodStats = useMemo(() => {
    const dates = getDatesInRange(dateRange.start, dateRange.end);
    return dates.reduce((acc, date) => {
      const s = getDayStats(date);
      return {
        revenue: acc.revenue + s.revenue,
        expenses: acc.expenses + s.expenses,
        net: acc.net + s.net,
        diff: acc.diff + s.diff,
        fuel: acc.fuel + s.fuel
      };
    }, { revenue: 0, expenses: 0, net: 0, diff: 0, fuel: 0 });
  }, [routes, agencies, closes, fuelEntries, dateRange]);

  const isSingleDay = dateRange.start === dateRange.end;
  
  const comparisonStats = useMemo(() => {
    if (!isSingleDay) return null;
    const prevDate = new Date(dateRange.start);
    prevDate.setDate(prevDate.getDate() - 1);
    return getDayStats(prevDate.toISOString().split('T')[0]);
  }, [dateRange, routes, agencies, closes, fuelEntries]);

  const calcTrend = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };

  const revenueTrend = comparisonStats ? calcTrend(periodStats.revenue, comparisonStats.revenue) : 0;

  const chartData = useMemo(() => {
    let datesToShow = [];
    
    if (isSingleDay) {
       for (let i = 6; i >= 0; i--) {
          const d = new Date(dateRange.start);
          d.setDate(d.getDate() - i);
          datesToShow.push(d.toISOString().split('T')[0]);
       }
    } else {
       datesToShow = getDatesInRange(dateRange.start, dateRange.end);
    }

    return datesToShow.map(dateStr => {
      const stats = getDayStats(dateStr);
      return {
         name: dateStr.split('-').slice(1).join('/'),
         receita: stats.revenue,
         liquido: stats.net,
         fuel: stats.fuel
      };
    });
  }, [routes, agencies, closes, fuelEntries, dateRange]);

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      
      {/* Header with Date Filter */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
           <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Visão Geral</h2>
           <p className="text-slate-600 font-bold text-base flex items-center gap-2 mt-1">
             <Activity size={20} className="text-blue-700"/> 
             Fluxo de Caixa e Operacional
           </p>
        </div>
        
        {/* Date Filter Card - High Contrast Black */}
        <div className="bg-slate-900 p-4 rounded-xl shadow-lg border-2 border-slate-800 flex items-center gap-4 text-white">
           <div className="flex items-center gap-3">
              <Calendar size={24} className="text-blue-400"/>
              <div className="flex flex-col">
                  <span className="text-xs text-slate-400 font-extrabold uppercase leading-none mb-1">Início</span>
                  <input 
                    type="date" 
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className={DARK_INPUT_CLASS}
                  />
              </div>
           </div>
           <span className="text-slate-600 font-extrabold text-xl">/</span>
           <div className="flex items-center gap-3">
              <div className="flex flex-col text-right">
                  <span className="text-xs text-slate-400 font-extrabold uppercase leading-none mb-1">Fim</span>
                  <input 
                    type="date" 
                    value={dateRange.end}
                    min={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className={DARK_INPUT_CLASS}
                  />
              </div>
           </div>
        </div>
      </div>

      {/* Hero Cards - Big Numbers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        
        {/* Gross Revenue */}
        <Card className="relative overflow-hidden border-none shadow-xl bg-gradient-to-br from-blue-700 to-blue-900 text-white">
           <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={120}/></div>
           <div className="p-2 relative z-10">
              <div className="flex justify-between items-start mb-6">
                 <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm"><TrendingUp size={28} className="text-white"/></div>
                 {isSingleDay && comparisonStats && comparisonStats.revenue > 0 && (
                   <div className={`flex items-center gap-1 text-sm font-bold px-3 py-1 rounded-full ${revenueTrend >= 0 ? 'bg-green-400/30 text-white' : 'bg-red-400/30 text-white'}`}>
                      {revenueTrend >= 0 ? <ArrowUpRight size={16}/> : <ArrowDownRight size={16}/>}
                      {Math.abs(revenueTrend).toFixed(0)}%
                   </div>
                 )}
              </div>
              <p className="text-blue-100 text-sm font-bold uppercase tracking-wider">Vendas Totais</p>
              <h3 className="text-4xl font-extrabold mt-2">{formatMoney(periodStats.revenue)}</h3>
           </div>
        </Card>

        {/* Expenses (Cash) */}
        <Card className="relative overflow-hidden border-none shadow-lg bg-white border-l-8 border-red-600">
           <div className="flex flex-col justify-between h-full">
              <div className="flex justify-between items-start">
                 <div>
                    <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Saídas (Dinheiro)</p>
                    <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{formatMoney(periodStats.expenses)}</h3>
                    <p className="text-xs text-slate-500 font-bold mt-2">Pagas em rota</p>
                 </div>
                 <div className="p-3 bg-red-100 rounded-xl text-red-700"><TrendingDown size={28}/></div>
              </div>
           </div>
        </Card>

        {/* Fuel Cost */}
        <Card className="relative overflow-hidden border-none shadow-lg bg-white border-l-8 border-indigo-600">
           <div className="flex flex-col justify-between h-full">
              <div className="flex justify-between items-start">
                 <div>
                    <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Combustível</p>
                    <h3 className="text-3xl font-extrabold text-indigo-800 mt-2">{formatMoney(periodStats.fuel)}</h3>
                    <p className="text-xs text-slate-500 font-bold mt-2">Custo total frota</p>
                 </div>
                 <div className="p-3 bg-indigo-100 rounded-xl text-indigo-700"><Fuel size={28}/></div>
              </div>
           </div>
        </Card>

        {/* Net Cash (Collected) */}
        <Card className="relative overflow-hidden border-none shadow-lg bg-white border-l-8 border-emerald-600">
           <div className="flex flex-col justify-between h-full">
              <div className="flex justify-between items-start">
                 <div>
                    <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Dinheiro em Caixa</p>
                    <h3 className="text-3xl font-extrabold text-emerald-800 mt-2">{formatMoney(periodStats.net)}</h3>
                 </div>
                 <div className="p-3 bg-emerald-100 rounded-xl text-emerald-700"><Wallet size={28}/></div>
              </div>
           </div>
        </Card>

        {/* Diff */}
        <Card className={`relative overflow-hidden border-none shadow-lg transition-all ${Math.abs(periodStats.diff) > 1 ? 'bg-red-100 ring-4 ring-red-300' : 'bg-white'}`}>
           <div className="flex flex-col justify-between h-full">
              <div className="flex justify-between items-start">
                 <div>
                    <p className={`${Math.abs(periodStats.diff) > 1 ? 'text-red-800' : 'text-slate-500'} text-sm font-bold uppercase tracking-wider flex items-center gap-1`}>
                       {Math.abs(periodStats.diff) > 1 && <AlertCircle size={16}/>} Diferença
                    </p>
                    <h3 className={`text-3xl font-extrabold mt-2 ${Math.abs(periodStats.diff) > 1 ? 'text-red-800' : 'text-slate-400'}`}>
                       {formatMoney(periodStats.diff)}
                    </h3>
                 </div>
                 <div className={`p-3 rounded-xl ${Math.abs(periodStats.diff) > 1 ? 'bg-red-200 text-red-800' : 'bg-slate-200 text-slate-500'}`}>
                    {Math.abs(periodStats.diff) > 1 ? <AlertCircle size={28}/> : <CheckCircle2 size={28}/>}
                 </div>
              </div>
           </div>
        </Card>
      </div>

      {/* Chart */}
      <Card className="p-6 shadow-md border border-slate-300">
        <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-3">
                <TrendingUp className="text-blue-700" size={24}/> 
                {isSingleDay ? 'Evolução Recente (7 Dias)' : 'Evolução no Período Selecionado'}
            </h3>
        </div>
        <div className="h-96 text-lg">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tickMargin={15} fontSize={14} stroke="#475569" fontWeight="bold"/>
                <YAxis axisLine={false} tickLine={false} fontSize={14} stroke="#475569" fontWeight="bold" tickFormatter={(val) => `R$${val/1000}k`}/>
                <CartesianGrid vertical={false} stroke="#cbd5e1" strokeDasharray="3 3"/>
                <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '2px solid #e2e8f0', padding: '12px' }}
                    itemStyle={{ fontSize: '16px', fontWeight: 'bold' }}
                    formatter={(value: number) => formatMoney(value)}
                />
                <Area type="monotone" dataKey="receita" stroke="#1d4ed8" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" name="Vendas (Bruta)" />
                <Area type="monotone" dataKey="liquido" stroke="#059669" strokeWidth={4} fillOpacity={1} fill="url(#colorNet)" name="Caixa (Líquido)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
      </Card>

    </div>
  );
};
