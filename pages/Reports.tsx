
import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/Layout';
import { storage, formatDateDisplay, money } from '../services/storageService';
import { DailyClose, RouteCash, AgencyCash, GeneralExpense, FuelEntry, Vehicle, Line, RouteDef, Supplier, ExpenseType, TourismService } from '../types';
import { 
  Printer, Calendar, TrendingUp, TrendingDown, 
  ArrowUpRight, ArrowDownRight, Wallet, Receipt, 
  Lightbulb, Activity, Truck, AlertTriangle, Target, MapPinned, PieChart as PieChartIcon, CheckCircle2, AlertCircle
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';

// --- UTILS ---
const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatPercent = (val: number) => `${val > 0 ? '+' : ''}${val.toFixed(1)}%`;

// --- COMPONENTES AUXILIARES ---

// 1. Card de Insight Inteligente
const InsightCard = ({ type, title, message, action }: { type: 'success' | 'warning' | 'danger' | 'info', title: string, message: string, action?: string }) => {
    const styles = {
        success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
        warning: 'bg-amber-50 border-amber-200 text-amber-900',
        danger: 'bg-rose-50 border-rose-200 text-rose-900',
        info: 'bg-blue-50 border-blue-200 text-blue-900'
    };
    const icons = {
        success: <TrendingUp size={24} className="text-emerald-600"/>,
        warning: <AlertTriangle size={24} className="text-amber-600"/>,
        danger: <AlertCircle size={24} className="text-rose-600"/>,
        info: <Lightbulb size={24} className="text-blue-600"/>
    };

    return (
        <div className={`p-5 rounded-xl border shadow-sm flex gap-4 items-start animate-in fade-in slide-in-from-bottom-2 ${styles[type]}`}>
            <div className="shrink-0 mt-1 bg-white/60 p-2 rounded-full backdrop-blur-sm">{icons[type]}</div>
            <div className="flex-1">
                <h4 className="font-bold text-sm uppercase tracking-wide opacity-80 mb-1">{title}</h4>
                <p className="font-semibold text-base leading-relaxed">{message}</p>
                {action && (
                    <div className="mt-3 text-sm font-medium bg-white/50 p-2 rounded-lg border border-white/20 flex items-center gap-2">
                        <Target size={16} /> 
                        <span>Sugestão: {action}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

// 2. Card de KPI com Tendência
const KpiCard = ({ title, value, subtext, icon: Icon, color, comparisonValue }: any) => {
  let calculatedTrend = 0;
  if (comparisonValue !== undefined && comparisonValue !== 0) {
      calculatedTrend = ((value - comparisonValue) / Math.abs(comparisonValue)) * 100;
  } else if (comparisonValue === 0 && value > 0) {
      calculatedTrend = 100;
  }

  const isPositive = calculatedTrend >= 0;
  const isNeutral = comparisonValue === undefined;

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden group">
      <div className={`absolute -right-6 -top-6 opacity-5 group-hover:opacity-10 transition-opacity rotate-12 ${color === 'green' ? 'text-emerald-600' : color === 'red' ? 'text-rose-600' : 'text-blue-600'}`}>
          <Icon size={120} />
      </div>
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={`p-3 rounded-xl ${color === 'green' ? 'bg-emerald-50 text-emerald-600' : color === 'red' ? 'bg-rose-50 text-rose-600' : color === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
          <Icon size={24} />
        </div>
        {!isNeutral && (
          <span className={`flex items-center text-xs font-bold px-2.5 py-1 rounded-full border ${isPositive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
            {isPositive ? <ArrowUpRight size={14} className="mr-1"/> : <ArrowDownRight size={14} className="mr-1"/>}
            {Math.abs(calculatedTrend).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="relative z-10">
        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</h3>
        <div className="text-3xl font-black text-slate-800 tracking-tight">{typeof value === 'number' ? formatMoney(value) : value}</div>
        {comparisonValue !== undefined && (
            <p className="text-xs text-slate-400 mt-2 font-medium">
                Anterior: {formatMoney(comparisonValue)}
            </p>
        )}
      </div>
    </div>
  );
};

// --- PÁGINA PRINCIPAL ---

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'profitability' | 'operational'>('overview');
  
  // Data State - Padrão: Mês Atual
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const [dateRange, setDateRange] = useState({ start: firstDay, end: lastDay });

  // Dados Brutos
  const [data, setData] = useState<{
    routes: RouteCash[],
    agencies: AgencyCash[],
    generalExpenses: GeneralExpense[],
    fuel: FuelEntry[],
    vehicles: Vehicle[],
    lines: Line[],
    routeDefs: RouteDef[],
    tourism: TourismService[],
  }>({ routes: [], agencies: [], generalExpenses: [], fuel: [], vehicles: [], lines: [], routeDefs: [], tourism: [] });

  useEffect(() => {
    setData({
      routes: storage.getRouteCash(),
      agencies: storage.getAgencyCash(),
      generalExpenses: storage.getGeneralExpenses(),
      fuel: storage.getFuelEntries(),
      vehicles: storage.getVehicles(),
      lines: storage.getLines(),
      routeDefs: storage.getRoutes(),
      tourism: storage.getTourismServices(),
    });
  }, []);

  // --- LÓGICA DE INTELIGÊNCIA ---

  // 1. Calcular Período Anterior para Comparação
  const previousPeriod = useMemo(() => {
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
      
      const prevEnd = new Date(start);
      prevEnd.setDate(prevEnd.getDate() - 1);
      
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - diffDays + 1);

      return {
          start: prevStart.toISOString().split('T')[0],
          end: prevEnd.toISOString().split('T')[0]
      };
  }, [dateRange]);

  const filterByDate = (items: any[], dateField: string, range: {start: string, end: string}) => {
      return items.filter(i => i[dateField] >= range.start && i[dateField] <= range.end);
  };

  // 2. Métricas Financeiras (DRE) - FIXED: Precision Math with money()
  const financialMetrics = useMemo(() => {
      const calculateMetrics = (range: {start: string, end: string}) => {
          // Receita
          const routesRev = filterByDate(data.routes, 'date', range).reduce((a,b) => money(a + b.revenueInformed), 0);
          const agenciesRev = filterByDate(data.agencies, 'date', range).reduce((a,b) => money(a + b.valueInformed), 0);
          const tourismRev = filterByDate(data.tourism, 'departureDate', range).filter(t => t.status !== 'CANCELED' && t.status !== 'REJECTED').reduce((a,b) => money(a + b.contractValue), 0);
          const totalRevenue = money(routesRev + agenciesRev + tourismRev);

          // Custos Variáveis
          const fuelCost = filterByDate(data.fuel, 'date', range).reduce((a,b) => money(a + b.amount), 0);
          const routeExp = filterByDate(data.routes, 'date', range).reduce((a,b) => money(a + b.cashExpenses), 0);
          const agencyExp = filterByDate(data.agencies, 'date', range).reduce((a,b) => money(a + (b.expenses || []).reduce((s,e)=>money(s+e.amount),0)), 0);
          const tourismExp = filterByDate(data.tourism, 'departureDate', range).reduce((a,b) => money(a + (b.expenses || []).reduce((s,e)=>money(s+e.amount),0)), 0);
          const variableCosts = money(fuelCost + routeExp + agencyExp + tourismExp);

          // Despesas Fixas
          const generalExp = filterByDate(data.generalExpenses, 'date', range).reduce((a,b) => money(a + b.amount), 0);

          // Resultados
          const contributionMargin = money(totalRevenue - variableCosts);
          const netResult = money(contributionMargin - generalExp);

          return { totalRevenue, variableCosts, generalExp, netResult, contributionMargin, fuelCost };
      };

      return { 
          current: calculateMetrics(dateRange), 
          previous: calculateMetrics(previousPeriod) 
      };
  }, [data, dateRange, previousPeriod]);

  // 3. Lucratividade por Veículo (Ranking)
  const fleetProfitability = useMemo(() => {
      const activeVehicles = data.vehicles.filter(v => v.active);
      return activeVehicles.map(v => {
          // Receitas
          const vRoutes = filterByDate(data.routes, 'date', dateRange).filter(r => r.vehicleId === v.id);
          const vTourism = filterByDate(data.tourism, 'departureDate', dateRange).filter(t => t.vehicleId === v.id && t.status !== 'CANCELED');
          const totalRev = money(vRoutes.reduce((a,b) => money(a + b.revenueInformed), 0) + vTourism.reduce((a,b) => money(a + b.contractValue), 0));

          // Custos Específicos
          const vFuel = filterByDate(data.fuel, 'date', dateRange).filter(f => f.vehicleId === v.id);
          const costFuel = vFuel.reduce((a,b) => money(a + b.amount), 0);
          const costOther = money(vRoutes.reduce((a,b) => money(a + b.cashExpenses), 0) + vTourism.reduce((a,b) => money(a + (b.expenses||[]).reduce((s,e)=>money(s+e.amount),0)), 0));
          
          const margin = money(totalRev - (costFuel + costOther));
          
          return {
              id: v.id,
              plate: v.plate,
              desc: v.description,
              revenue: totalRev,
              fuel: costFuel,
              margin: margin,
              marginPct: totalRev > 0 ? (margin / totalRev) * 100 : 0
          };
      }).sort((a,b) => b.margin - a.margin);
  }, [data, dateRange]);

  // 4. Performance das Linhas
  const linePerformance = useMemo(() => {
      const filteredRoutes = filterByDate(data.routes, 'date', dateRange);
      const byLine: Record<string, { name: string, revenue: number, passengers: number }> = {};
      
      filteredRoutes.forEach(r => {
          const def = data.routeDefs.find(rd => rd.id === r.routeId);
          const line = data.lines.find(l => l.id === def?.lineId);
          const name = line?.name || 'Desconhecida';
          
          if (!byLine[name]) byLine[name] = { name, revenue: 0, passengers: 0 };
          byLine[name].revenue = money(byLine[name].revenue + r.revenueInformed);
          byLine[name].passengers += r.passengers;
      });

      return Object.values(byLine).sort((a,b) => b.revenue - a.revenue);
  }, [data, dateRange]);

  // --- MOTOR DE INSIGHTS (IA SIMBÓLICA) ---
  const insights = useMemo(() => {
      const list: { type: 'success'|'warning'|'danger'|'info', title: string, message: string, action?: string }[] = [];
      const { current, previous } = financialMetrics;

      // Insight 1: Tendência de Receita e Prejuízo
      if (current.netResult < 0) {
          list.push({ 
              type: 'danger', 
              title: 'Alerta de Prejuízo Operacional', 
              message: `A operação está com saldo negativo de ${formatMoney(current.netResult)}. As despesas superaram as receitas.`,
              action: 'Revise custos fixos e corte gastos não essenciais imediatamente.' 
          });
      } else if (current.totalRevenue > previous.totalRevenue * 1.15) {
          list.push({ 
              type: 'success', 
              title: 'Crescimento de Receita', 
              message: `A receita aumentou ${formatPercent(((current.totalRevenue - previous.totalRevenue)/previous.totalRevenue)*100)} comparado ao período anterior.`,
              action: 'Identifique qual linha puxou esse crescimento e considere aumentar horários.' 
          });
      } else if (current.totalRevenue < previous.totalRevenue * 0.9 && previous.totalRevenue > 0) {
          list.push({
              type: 'warning',
              title: 'Queda na Arrecadação',
              message: `Houve uma retração de ${formatPercent(((current.totalRevenue - previous.totalRevenue)/previous.totalRevenue)*100)} nas vendas.`,
              action: 'Verifique se houve perda de viagens ou redução na demanda de passageiros.'
          });
      }

      // Insight 2: Anomalia de Combustível (Regra de Ouro: Max 35-40% da Receita)
      const fuelRatio = current.totalRevenue > 0 ? (current.fuelCost / current.totalRevenue) : 0;
      if (fuelRatio > 0.45) {
          list.push({ 
              type: 'danger', 
              title: 'Custo de Combustível Crítico', 
              message: `O diesel está consumindo ${(fuelRatio*100).toFixed(1)}% de toda a sua receita. (Ideal de mercado: < 35%)`,
              action: 'Agende manutenção da frota ou verifique a condução dos motoristas.'
          });
      }

      // Insight 3: Veículo "Ladrão de Lucro"
      const loserVehicle = fleetProfitability.find(v => v.margin < 0 && v.revenue > 0);
      if (loserVehicle) {
          list.push({ 
              type: 'warning', 
              title: 'Veículo Deficitário Identificado', 
              message: `O ônibus ${loserVehicle.plate} (${loserVehicle.desc}) está gerando prejuízo de ${formatMoney(loserVehicle.margin)}.`,
              action: 'Avalie se este veículo está consumindo muito combustível ou rodando em linhas de baixa demanda.' 
          });
      }

      // Insight 4: Campeão de Vendas
      const topVehicle = fleetProfitability[0];
      if (topVehicle && topVehicle.margin > 0) {
           list.push({ 
              type: 'info', 
              title: 'Destaque da Frota', 
              message: `O veículo ${topVehicle.plate} é o mais rentável, gerando ${formatMoney(topVehicle.margin)} de lucro líquido.`,
          });
      }

      return list.slice(0, 4); // Limitar aos 4 mais importantes
  }, [financialMetrics, fleetProfitability]);


  return (
    <div className="pb-12 space-y-8">
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                  <Activity className="text-blue-600"/> Inteligência Gerencial
              </h2>
              <p className="text-slate-500 text-sm">Painel de decisão estratégica e análise financeira.</p>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-lg">
                 {[
                   { id: 'overview', label: 'Visão Geral (DRE)' },
                   { id: 'profitability', label: 'Lucratividade da Frota' },
                   { id: 'operational', label: 'Linhas e Rotas' },
                 ].map(tab => (
                   <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === tab.id ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                      {tab.label}
                   </button>
                 ))}
            </div>

            <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg p-1.5 px-3 shadow-sm">
              <Calendar size={16} className="text-slate-400"/>
              <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="bg-transparent border-none text-sm font-bold text-slate-700 outline-none w-32"/>
              <span className="text-slate-300">até</span>
              <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="bg-transparent border-none text-sm font-bold text-slate-700 outline-none w-32"/>
            </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        
        {/* SECTION: SMART INSIGHTS */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.length > 0 ? insights.map((insight, idx) => (
                <InsightCard key={idx} {...insight} />
            )) : (
                <div className="col-span-2 bg-slate-50 p-6 rounded-xl border border-slate-200 text-center flex flex-col items-center justify-center text-slate-500">
                    <CheckCircle2 size={32} className="mb-2 text-slate-400"/>
                    <p className="font-medium">Nenhuma anomalia crítica detectada neste período.</p>
                    <p className="text-sm">Sua operação está rodando dentro dos padrões esperados.</p>
                </div>
            )}
        </div>

        {/* TAB 1: OVERVIEW (DRE) */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <KpiCard title="Receita Bruta" value={financialMetrics.current.totalRevenue} comparisonValue={financialMetrics.previous.totalRevenue} icon={Wallet} color="blue"/>
                <KpiCard title="Custos Variáveis" value={financialMetrics.current.variableCosts} comparisonValue={financialMetrics.previous.variableCosts} subtext="Combustível + Viagens" icon={TrendingDown} color="red"/>
                <KpiCard title="Despesas Fixas" value={financialMetrics.current.generalExp} comparisonValue={financialMetrics.previous.generalExp} subtext="Administrativo / Manutenção" icon={Receipt} color="purple"/>
                <KpiCard title="Resultado Líquido" value={financialMetrics.current.netResult} comparisonValue={financialMetrics.previous.netResult} subtext="Lucro/Prejuízo Real" icon={Target} color={financialMetrics.current.netResult >= 0 ? 'green' : 'red'}/>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><PieChartIcon size={18}/> Estrutura de Resultados (Waterfall)</h3>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                                { name: 'Receita', valor: financialMetrics.current.totalRevenue, fill: '#2563eb' },
                                { name: 'Custos Var.', valor: financialMetrics.current.variableCosts, fill: '#f59e0b' },
                                { name: 'Desp. Fixas', valor: financialMetrics.current.generalExp, fill: '#ef4444' },
                                { name: 'Lucro Líq.', valor: financialMetrics.current.netResult, fill: financialMetrics.current.netResult >= 0 ? '#10b981' : '#b91c1c' },
                            ]} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false}/>
                                <XAxis type="number" tickFormatter={(val) => `R$${val/1000}k`}/>
                                <YAxis dataKey="name" type="category" width={80} style={{fontWeight: 'bold', fontSize: '12px'}}/>
                                <Tooltip cursor={{fill: 'transparent'}} formatter={(val: number) => formatMoney(val)}/>
                                <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={40}/>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                 </div>

                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-slate-50 p-4 border-b border-slate-200"><h3 className="font-bold text-slate-800">D.R.E. Sintético</h3></div>
                    <table className="w-full text-sm">
                        <tbody className="divide-y divide-slate-100">
                            <tr><td className="px-4 py-3 font-medium text-slate-600">(=) Receita Bruta</td><td className="px-4 py-3 text-right font-bold text-blue-700">{formatMoney(financialMetrics.current.totalRevenue)}</td></tr>
                            <tr className="bg-slate-50/50"><td className="px-4 py-3 font-medium text-slate-600">(-) Combustível</td><td className="px-4 py-3 text-right text-red-600">{formatMoney(financialMetrics.current.fuelCost)}</td></tr>
                            <tr><td className="px-4 py-3 font-medium text-slate-600">(-) Desp. Variáveis</td><td className="px-4 py-3 text-right text-red-600">{formatMoney(financialMetrics.current.variableCosts - financialMetrics.current.fuelCost)}</td></tr>
                            <tr className="bg-blue-50 border-t border-blue-100"><td className="px-4 py-3 font-bold text-blue-900">(=) Margem Contrib.</td><td className="px-4 py-3 text-right font-bold text-blue-900">{formatMoney(financialMetrics.current.contributionMargin)}</td></tr>
                            <tr><td className="px-4 py-3 font-medium text-slate-600">(-) Desp. Fixas</td><td className="px-4 py-3 text-right text-red-600">{formatMoney(financialMetrics.current.generalExp)}</td></tr>
                            <tr className={`border-t-2 ${financialMetrics.current.netResult >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <td className="px-4 py-4 font-extrabold text-slate-800 text-lg">RESULTADO</td>
                                <td className={`px-4 py-4 text-right font-extrabold text-lg ${financialMetrics.current.netResult >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatMoney(financialMetrics.current.netResult)}</td>
                            </tr>
                        </tbody>
                    </table>
                 </div>
             </div>
          </div>
        )}

        {/* TAB 2: PROFITABILITY */}
        {activeTab === 'profitability' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-200">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Truck size={20}/> Lucratividade Real por Veículo</h3>
                        <p className="text-sm text-slate-500 mt-1">Margem calculada subtraindo o combustível e despesas específicas da receita gerada pelo veículo.</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-4">Veículo</th>
                                    <th className="px-6 py-4 text-right">Receita</th>
                                    <th className="px-6 py-4 text-right">Combustível</th>
                                    <th className="px-6 py-4 text-right">Margem R$</th>
                                    <th className="px-6 py-4 text-center">Margem %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {fleetProfitability.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">{item.plate}</div>
                                            <div className="text-xs text-slate-500">{item.desc}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-blue-700">{formatMoney(item.revenue)}</td>
                                        <td className="px-6 py-4 text-right text-red-600">{formatMoney(item.fuel)}</td>
                                        <td className={`px-6 py-4 text-right font-bold ${item.margin >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatMoney(item.margin)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${item.marginPct >= 20 ? 'bg-green-100 text-green-700' : item.marginPct > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                {formatPercent(item.marginPct)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {/* TAB 3: OPERATIONAL */}
        {activeTab === 'operational' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4">Top 5 Linhas (Receita)</h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={linePerformance.slice(0,5)} layout="vertical" margin={{ left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false}/>
                                <XAxis type="number" hide/>
                                <YAxis dataKey="name" type="category" width={100} style={{fontSize: '11px', fontWeight: 'bold'}}/>
                                <Tooltip formatter={(val: number) => formatMoney(val)} cursor={{fill: 'transparent'}}/>
                                <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={30}/>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-200"><h3 className="font-bold text-slate-800">Performance Detalhada</h3></div>
                    <div className="overflow-x-auto max-h-[400px]">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs sticky top-0">
                                <tr>
                                    <th className="px-6 py-4">Linha</th>
                                    <th className="px-6 py-4 text-right">Receita</th>
                                    <th className="px-6 py-4 text-right">Passageiros</th>
                                    <th className="px-6 py-4 text-right">Ticket Médio</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {linePerformance.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-bold text-slate-700">{item.name}</td>
                                        <td className="px-6 py-4 text-right font-bold text-blue-700">{formatMoney(item.revenue)}</td>
                                        <td className="px-6 py-4 text-right text-slate-600">{item.passengers}</td>
                                        <td className="px-6 py-4 text-right text-slate-500">{item.passengers > 0 ? formatMoney(item.revenue / item.passengers) : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};
