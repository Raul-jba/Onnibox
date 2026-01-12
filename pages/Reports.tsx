
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button } from '../components/Layout';
import { storage, formatDateDisplay } from '../services/storageService';
import { DailyClose, RouteCash, Driver, Line, RouteDef, FuelEntry, Vehicle, TourismService } from '../types';
import { 
  Printer, 
  Calendar, 
  Search, 
  TrendingUp, 
  Users, 
  Bus, 
  Fuel, 
  DollarSign,
  Gauge,
  Activity,
  Droplets,
  MapPinned,
  Briefcase
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line as RechartsLine } from 'recharts';

// Format Helper
const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatNumber = (val: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(val);

const DARK_INPUT_CLASS = "input-dark bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none";

export const ReportsPage: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState<'financial' | 'lines' | 'drivers' | 'fuel' | 'tourism'>('financial');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Raw Data
  const [closes, setCloses] = useState<DailyClose[]>([]);
  const [routes, setRoutes] = useState<RouteCash[]>([]);
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>([]);
  const [tourismServices, setTourismServices] = useState<TourismService[]>([]);
  
  // Aux Data
  const [lines, setLines] = useState<Line[]>([]);
  const [routeDefs, setRouteDefs] = useState<RouteDef[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    // Load all data
    setCloses(storage.getDailyCloses());
    setRoutes(storage.getRouteCash());
    setFuelEntries(storage.getFuelEntries());
    setTourismServices(storage.getTourismServices());
    setLines(storage.getLines());
    setRouteDefs(storage.getRoutes());
    setDrivers(storage.getDrivers());
    setVehicles(storage.getVehicles());
  }, []);

  const handlePrint = () => window.print();

  // --- Aggregations ---

  // 1. Financial (Daily Closes within Range)
  const filteredCloses = useMemo(() => {
    return closes
      .filter(c => c.date >= dateRange.start && c.date <= dateRange.end)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [closes, dateRange]);

  const financialTotals = useMemo(() => {
    return filteredCloses.reduce((acc, curr) => ({
      rev: acc.rev + (curr.totalRouteRevenue + curr.totalAgencyRevenue),
      exp: acc.exp + curr.totalExpenses + (curr.totalAgencyExpenses || 0), // Include Agency Expenses
      comm: acc.comm + (curr.totalCommissions || 0), 
      net: acc.net + curr.netResult,
      diff: acc.diff + curr.totalDiff
    }), { rev: 0, exp: 0, comm: 0, net: 0, diff: 0 });
  }, [filteredCloses]);

  // 2. Operational by Line
  const lineStats = useMemo(() => {
    const relevantRoutes = routes.filter(r => r.date >= dateRange.start && r.date <= dateRange.end);
    const stats: Record<string, { name: string, trips: number, passengers: number, revenue: number, expenses: number }> = {};

    relevantRoutes.forEach(r => {
      const def = routeDefs.find(rd => rd.id === r.routeId);
      const line = lines.find(l => l.id === def?.lineId);
      const lineName = line?.name || 'Indefinida';
      const lineId = line?.id || 'unknown';

      if (!stats[lineId]) {
        stats[lineId] = { name: lineName, trips: 0, passengers: 0, revenue: 0, expenses: 0 };
      }
      
      const rExp = r.expenses.reduce((s, e) => s + e.amount, 0);
      stats[lineId].trips += 1;
      stats[lineId].passengers += r.passengers;
      stats[lineId].revenue += r.revenueInformed; // Use informed revenue for performance
      stats[lineId].expenses += rExp;
    });

    return Object.values(stats).sort((a,b) => b.revenue - a.revenue);
  }, [routes, dateRange, routeDefs, lines]);

  // 3. Performance by Driver
  const driverStats = useMemo(() => {
    const relevantRoutes = routes.filter(r => r.date >= dateRange.start && r.date <= dateRange.end);
    const stats: Record<string, { name: string, trips: number, passengers: number, revenue: number }> = {};

    relevantRoutes.forEach(r => {
      const driver = drivers.find(d => d.id === r.driverId);
      const name = driver?.name || 'Desconhecido';
      const id = r.driverId;

      if (!stats[id]) {
        stats[id] = { name, trips: 0, passengers: 0, revenue: 0 };
      }

      stats[id].trips += 1;
      stats[id].passengers += r.passengers;
      stats[id].revenue += r.revenueInformed;
    });

    return Object.values(stats).sort((a,b) => b.revenue - a.revenue);
  }, [routes, dateRange, drivers]);

  // 4. Advanced Fuel Analytics
  const fuelAnalytics = useMemo(() => {
    // We need to calculate stats for all vehicles first to get mileage deltas, then filter by date
    const statsByVehicle: Record<string, { 
      plate: string, 
      desc: string,
      liters: number, 
      cost: number, 
      count: number,
      distance: number,
      paymentMethods: Record<string, number>
    }> = {};

    vehicles.forEach(vehicle => {
        // Get all entries for this vehicle sorted by date/mileage ASC
        const vEntries = fuelEntries
          .filter(f => f.vehicleId === vehicle.id)
          .sort((a, b) => a.date.localeCompare(b.date) || (a.mileage || 0) - (b.mileage || 0));
        
        // Initialize stats
        statsByVehicle[vehicle.id] = {
            plate: vehicle.plate,
            desc: vehicle.description,
            liters: 0,
            cost: 0,
            count: 0,
            distance: 0,
            paymentMethods: { 'CASH': 0, 'CARD': 0, 'CREDIT': 0 }
        };

        // Iterate to find entries WITHIN range and calculate distance based on previous entry
        vEntries.forEach((entry, idx) => {
            // Check if entry is within Report Date Range
            const inRange = entry.date >= dateRange.start && entry.date <= dateRange.end;
            
            if (inRange) {
                const s = statsByVehicle[vehicle.id];
                s.cost += entry.amount;
                s.liters += (entry.liters || 0);
                s.count += 1;
                s.paymentMethods[entry.paymentMethod] = (s.paymentMethods[entry.paymentMethod] || 0) + entry.amount;

                // Calculate Distance
                // Look at previous entry (even if outside range) to determine distance traveled FOR this fill-up
                if (idx > 0) {
                    const prev = vEntries[idx - 1];
                    if (entry.mileage && prev.mileage) {
                        const dist = entry.mileage - prev.mileage;
                        if (dist > 0) s.distance += dist;
                    }
                }
            }
        });
    });

    const list = Object.values(statsByVehicle)
        .filter(s => s.count > 0) // Remove vehicles with no activity in range
        .map(s => ({
            ...s,
            kmPerLiter: s.distance > 0 && s.liters > 0 ? s.distance / s.liters : 0,
            costPerKm: s.distance > 0 ? s.cost / s.distance : 0,
            avgPrice: s.liters > 0 ? s.cost / s.liters : 0
        }))
        .sort((a, b) => b.cost - a.cost);

    const totalCost = list.reduce((acc, curr) => acc + curr.cost, 0);
    const totalLiters = list.reduce((acc, curr) => acc + curr.liters, 0);
    const totalDist = list.reduce((acc, curr) => acc + curr.distance, 0);
    
    // Weighted Averages
    const fleetKmL = totalLiters > 0 ? totalDist / totalLiters : 0;
    const fleetCostKm = totalDist > 0 ? totalCost / totalDist : 0;

    return { list, totalCost, totalLiters, totalDist, fleetKmL, fleetCostKm };
  }, [fuelEntries, dateRange, vehicles]);

  // 5. Tourism Analytics
  const tourismAnalytics = useMemo(() => {
    const list = tourismServices
        .filter(t => t.departureDate >= dateRange.start && t.departureDate <= dateRange.end)
        .sort((a,b) => b.departureDate.localeCompare(a.departureDate));
    
    const stats = list.reduce((acc, curr) => {
        const expenses = (curr.expenses || []).reduce((a,b) => a + b.amount, 0);
        return {
            revenue: acc.revenue + curr.contractValue,
            expenses: acc.expenses + expenses,
            count: acc.count + 1,
            completed: acc.completed + (curr.status === 'COMPLETED' ? 1 : 0)
        };
    }, { revenue: 0, expenses: 0, count: 0, completed: 0 });

    const profit = stats.revenue - stats.expenses;
    const margin = stats.revenue > 0 ? (profit / stats.revenue) * 100 : 0;

    const chartData = list.slice(0, 10).map(t => ({
        name: t.destination.substring(0, 12) + '...',
        revenue: t.contractValue,
        expenses: (t.expenses || []).reduce((a,b) => a + b.amount, 0),
        profit: t.contractValue - (t.expenses || []).reduce((a,b) => a + b.amount, 0)
    }));

    return { list, stats, profit, margin, chartData };
  }, [tourismServices, dateRange]);


  return (
    <div className="space-y-6">
       {/* Styles for Printing */}
       <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-full { width: 100% !important; margin: 0 !important; padding: 0 !important; }
          body { background: white; }
          .card-print { box-shadow: none; border: 1px solid #ccc; }
        }
      `}</style>

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
         <div>
            <h2 className="text-xl font-extrabold text-slate-800">Central de Relatórios</h2>
            <p className="text-sm text-slate-500 font-medium">Análise de desempenho e resultados financeiros</p>
         </div>
         <Button onClick={handlePrint} variant="secondary" className="shadow-sm">
            <Printer size={18} /> Imprimir Relatório
         </Button>
      </div>

      {/* Filters - Dark Mode Date */}
      <Card className="bg-slate-900 border-slate-800 p-4 no-print shadow-md">
         <div className="flex flex-col md:flex-row gap-4 items-end">
            <div>
               <label className="block text-xs font-bold text-slate-400 mb-1">Início</label>
               <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className={DARK_INPUT_CLASS}/>
            </div>
            <div>
               <label className="block text-xs font-bold text-slate-400 mb-1">Fim</label>
               <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className={DARK_INPUT_CLASS}/>
            </div>
            <div className="flex-1 overflow-x-auto">
               <label className="block text-xs font-bold text-slate-400 mb-1">Tipo de Relatório</label>
               <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 shadow-sm min-w-max">
                  {[
                    {id: 'financial', label: 'Fechamento de Caixa', icon: DollarSign},
                    {id: 'lines', label: 'Por Linha', icon: TrendingUp},
                    {id: 'drivers', label: 'Motoristas', icon: Users},
                    {id: 'fuel', label: 'Combustível', icon: Fuel},
                    {id: 'tourism', label: 'Turismo', icon: MapPinned},
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                    >
                      <tab.icon size={14}/> {tab.label}
                    </button>
                  ))}
               </div>
            </div>
         </div>
      </Card>

      {/* --- REPORT VIEW: FINANCIAL --- */}
      {activeTab === 'financial' && (
        <div className="space-y-6 animate-in fade-in duration-300">
           {/* Summary Cards */}
           <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="p-4 bg-white border-l-4 border-blue-600">
                 <p className="text-xs text-slate-500 uppercase font-bold">Receita Bruta</p>
                 <p className="text-xl font-extrabold text-slate-800">{formatMoney(financialTotals.rev)}</p>
              </Card>
              <Card className="p-4 bg-white border-l-4 border-red-500">
                 <p className="text-xs text-slate-500 uppercase font-bold">Total Despesas</p>
                 <p className="text-xl font-extrabold text-red-600">{formatMoney(financialTotals.exp)}</p>
              </Card>
              <Card className="p-4 bg-white border-l-4 border-purple-500">
                 <p className="text-xs text-slate-500 uppercase font-bold">Comissões</p>
                 <p className="text-xl font-extrabold text-purple-700">{formatMoney(financialTotals.comm)}</p>
              </Card>
              <Card className="p-4 bg-white border-l-4 border-green-600">
                 <p className="text-xs text-slate-500 uppercase font-bold">Resultado Líquido</p>
                 <p className="text-xl font-extrabold text-green-700">{formatMoney(financialTotals.net)}</p>
              </Card>
              <Card className="p-4 bg-white border-l-4 border-amber-500">
                 <p className="text-xs text-slate-500 uppercase font-bold">Diferenças</p>
                 <p className={`text-xl font-extrabold ${financialTotals.diff < 0 ? 'text-red-600' : 'text-slate-600'}`}>{formatMoney(financialTotals.diff)}</p>
              </Card>
           </div>

           <Card className="card-print">
              <div className="flex justify-between items-center mb-4 p-2 border-b">
                 <h3 className="text-lg font-bold text-slate-800">Extrato de Fechamentos Diários</h3>
                 <span className="text-xs font-bold text-slate-500">Período: {new Date(dateRange.start).toLocaleDateString()} à {new Date(dateRange.end).toLocaleDateString()}</span>
              </div>
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-2">Data</th>
                      <th className="px-4 py-2 text-right">Venda Bruta</th>
                      <th className="px-4 py-2 text-right">Despesas</th>
                      <th className="px-4 py-2 text-right">Comissões</th>
                      <th className="px-4 py-2 text-right">Líquido</th>
                      <th className="px-4 py-2 text-right">Diferença</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCloses.map(c => (
                       <tr key={c.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-medium">{formatDateDisplay(c.date)}</td>
                          <td className="px-4 py-2 text-right">{formatMoney(c.totalRouteRevenue + c.totalAgencyRevenue)}</td>
                          <td className="px-4 py-2 text-right text-red-600">{formatMoney(c.totalExpenses + (c.totalAgencyExpenses || 0))}</td>
                          <td className="px-4 py-2 text-right text-purple-600">
                             {c.totalCommissions > 0 ? `-${formatMoney(c.totalCommissions)}` : '-'}
                          </td>
                          <td className="px-4 py-2 text-right font-bold text-green-700">{formatMoney(c.netResult)}</td>
                          <td className={`px-4 py-2 text-right font-bold text-xs ${c.totalDiff < -1 ? 'text-red-500' : 'text-slate-400'}`}>
                             {formatMoney(c.totalDiff)}
                          </td>
                       </tr>
                    ))}
                    {filteredCloses.length === 0 && <tr><td colSpan={6} className="p-4 text-center italic text-slate-500">Nenhum fechamento neste período.</td></tr>}
                  </tbody>
              </table>
           </Card>
        </div>
      )}

      {/* --- REPORT VIEW: LINES --- */}
      {activeTab === 'lines' && (
         <div className="space-y-6 animate-in fade-in duration-300">
            <div className="h-64 no-print">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={lineStats.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={10} tickFormatter={(val) => val.substr(0, 15)+'...'} />
                    <YAxis fontSize={10} />
                    <Tooltip formatter={(val: number) => formatMoney(val)} />
                    <Legend />
                    <Bar dataKey="revenue" name="Receita" fill="#2563eb" radius={[4,4,0,0]} />
                    <Bar dataKey="expenses" name="Despesas" fill="#ef4444" radius={[4,4,0,0]} />
                  </BarChart>
               </ResponsiveContainer>
            </div>

            <Card className="card-print">
              <h3 className="text-lg font-bold text-slate-800 mb-4 px-2">Desempenho por Linha</h3>
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-2">Linha</th>
                      <th className="px-4 py-2 text-center">Viagens</th>
                      <th className="px-4 py-2 text-center">Passageiros</th>
                      <th className="px-4 py-2 text-right">Receita Total</th>
                      <th className="px-4 py-2 text-right">Despesas</th>
                      <th className="px-4 py-2 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lineStats.map((l, idx) => (
                       <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-bold text-slate-700">{l.name}</td>
                          <td className="px-4 py-2 text-center">{l.trips}</td>
                          <td className="px-4 py-2 text-center">{l.passengers}</td>
                          <td className="px-4 py-2 text-right text-blue-700 font-medium">{formatMoney(l.revenue)}</td>
                          <td className="px-4 py-2 text-right text-red-600 font-medium">{formatMoney(l.expenses)}</td>
                          <td className="px-4 py-2 text-right font-extrabold text-slate-800">{formatMoney(l.revenue - l.expenses)}</td>
                       </tr>
                    ))}
                    {lineStats.length === 0 && <tr><td colSpan={6} className="p-4 text-center italic text-slate-500">Sem dados operacionais.</td></tr>}
                  </tbody>
              </table>
            </Card>
         </div>
      )}

      {/* --- REPORT VIEW: DRIVERS --- */}
      {activeTab === 'drivers' && (
         <div className="space-y-6 animate-in fade-in duration-300">
            <Card className="card-print">
              <h3 className="text-lg font-bold text-slate-800 mb-4 px-2">Produtividade por Motorista</h3>
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-2">Motorista</th>
                      <th className="px-4 py-2 text-center">Viagens Realizadas</th>
                      <th className="px-4 py-2 text-center">Total Passageiros</th>
                      <th className="px-4 py-2 text-right">Receita Gerada</th>
                      <th className="px-4 py-2 text-right">Média/Viagem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {driverStats.map((d, idx) => (
                       <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-bold text-slate-700">{d.name}</td>
                          <td className="px-4 py-2 text-center">{d.trips}</td>
                          <td className="px-4 py-2 text-center">{d.passengers}</td>
                          <td className="px-4 py-2 text-right text-blue-700 font-bold">{formatMoney(d.revenue)}</td>
                          <td className="px-4 py-2 text-right text-slate-500">
                             {d.trips > 0 ? formatMoney(d.revenue / d.trips) : '-'}
                          </td>
                       </tr>
                    ))}
                    {driverStats.length === 0 && <tr><td colSpan={5} className="p-4 text-center italic text-slate-500">Sem dados.</td></tr>}
                  </tbody>
              </table>
            </Card>
         </div>
      )}

      {/* --- REPORT VIEW: FUEL (ADVANCED) --- */}
      {activeTab === 'fuel' && (
         <div className="space-y-6 animate-in fade-in duration-300">
            {/* 1. KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 bg-white border-l-4 border-blue-600 shadow-sm">
                   <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Custo Total</p>
                   <p className="text-2xl font-extrabold text-slate-800">{formatMoney(fuelAnalytics.totalCost)}</p>
                   <p className="text-xs text-slate-400 mt-1">{formatNumber(fuelAnalytics.totalLiters)} litros consumidos</p>
                </Card>
                <Card className="p-4 bg-white border-l-4 border-green-600 shadow-sm">
                   <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Eficiência Global</p>
                   <p className="text-2xl font-extrabold text-green-700">{fuelAnalytics.fleetKmL.toFixed(2)} <span className="text-sm">km/l</span></p>
                   <p className="text-xs text-slate-400 mt-1">Média ponderada da frota</p>
                </Card>
                <Card className="p-4 bg-white border-l-4 border-amber-500 shadow-sm">
                   <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Custo por KM</p>
                   <p className="text-2xl font-extrabold text-amber-700">R$ {fuelAnalytics.fleetCostKm.toFixed(2)}</p>
                   <p className="text-xs text-slate-400 mt-1">Custo médio de rodagem</p>
                </Card>
                <Card className="p-4 bg-white border-l-4 border-indigo-500 shadow-sm">
                   <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Distância Percorrida</p>
                   <p className="text-2xl font-extrabold text-indigo-700">{formatNumber(fuelAnalytics.totalDist)} <span className="text-sm">km</span></p>
                   <p className="text-xs text-slate-400 mt-1">Total acumulado no período</p>
                </Card>
            </div>

            {/* 2. Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 no-print">
               <Card className="h-80 p-4">
                   <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                       <Gauge size={16} className="text-green-600"/> Eficiência por Veículo (Km/L)
                   </h4>
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={fuelAnalytics.list} layout="vertical" margin={{left: 40}}>
                         <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false}/>
                         <XAxis type="number" fontSize={10} />
                         <YAxis dataKey="plate" type="category" fontSize={10} width={60} fontWeight="bold"/>
                         <Tooltip 
                            formatter={(val: number) => val.toFixed(2) + ' km/l'}
                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                         />
                         <Bar dataKey="kmPerLiter" fill="#16a34a" radius={[0, 4, 4, 0]} barSize={20} name="Km/L"/>
                      </BarChart>
                   </ResponsiveContainer>
               </Card>
               <Card className="h-80 p-4">
                   <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                       <DollarSign size={16} className="text-blue-600"/> Custo Total por Veículo
                   </h4>
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={fuelAnalytics.list} layout="vertical" margin={{left: 40}}>
                         <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false}/>
                         <XAxis type="number" fontSize={10} tickFormatter={(val) => `R$${val/1000}k`} />
                         <YAxis dataKey="plate" type="category" fontSize={10} width={60} fontWeight="bold"/>
                         <Tooltip 
                            formatter={(val: number) => formatMoney(val)}
                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                         />
                         <Bar dataKey="cost" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={20} name="Custo Total"/>
                      </BarChart>
                   </ResponsiveContainer>
               </Card>
            </div>

            {/* 3. Detailed Table */}
            <Card className="card-print">
              <div className="flex justify-between items-end mb-4 px-2">
                 <div>
                    <h3 className="text-lg font-bold text-slate-800">Detalhamento de Frotas</h3>
                    <p className="text-xs text-slate-500">Análise detalhada de consumo e eficiência por veículo</p>
                 </div>
              </div>
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-2">Veículo</th>
                      <th className="px-4 py-2 text-center">Abast.</th>
                      <th className="px-4 py-2 text-right">Km Rodados</th>
                      <th className="px-4 py-2 text-right">Litros</th>
                      <th className="px-4 py-2 text-right bg-green-50 text-green-800 border-l border-green-100">Km/L Médio</th>
                      <th className="px-4 py-2 text-right bg-amber-50 text-amber-800 border-l border-amber-100">R$/Km</th>
                      <th className="px-4 py-2 text-right">Custo Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fuelAnalytics.list.map((f, idx) => (
                       <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-2">
                              <div className="font-bold text-slate-800">{f.plate}</div>
                              <div className="text-[10px] text-slate-500 uppercase">{f.desc}</div>
                          </td>
                          <td className="px-4 py-2 text-center text-slate-500">{f.count}</td>
                          <td className="px-4 py-2 text-right font-medium">{formatNumber(f.distance)} km</td>
                          <td className="px-4 py-2 text-right text-slate-600">{formatNumber(f.liters)} L</td>
                          
                          {/* Efficiency */}
                          <td className="px-4 py-2 text-right font-bold text-green-700 bg-green-50/30 border-l border-green-50">
                             {f.kmPerLiter > 0 ? f.kmPerLiter.toFixed(2) : '-'}
                          </td>

                          {/* Cost Per Km */}
                          <td className="px-4 py-2 text-right font-bold text-amber-700 bg-amber-50/30 border-l border-amber-50">
                             {f.costPerKm > 0 ? `R$ ${f.costPerKm.toFixed(2)}` : '-'}
                          </td>

                          <td className="px-4 py-2 text-right font-extrabold text-slate-800">{formatMoney(f.cost)}</td>
                       </tr>
                    ))}
                    {fuelAnalytics.list.length === 0 && <tr><td colSpan={7} className="p-4 text-center italic text-slate-500">Sem registros no período.</td></tr>}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                     <tr>
                        <td className="px-4 py-3 font-extrabold text-slate-800 uppercase text-xs">Totais da Frota</td>
                        <td className="px-4 py-3 text-center font-bold">{fuelAnalytics.list.reduce((a,b)=>a+b.count,0)}</td>
                        <td className="px-4 py-3 text-right font-bold">{formatNumber(fuelAnalytics.totalDist)} km</td>
                        <td className="px-4 py-3 text-right font-bold">{formatNumber(fuelAnalytics.totalLiters)} L</td>
                        <td className="px-4 py-3 text-right font-extrabold text-green-700">{fuelAnalytics.fleetKmL.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-extrabold text-amber-700">R$ {fuelAnalytics.fleetCostKm.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-extrabold text-blue-800">{formatMoney(fuelAnalytics.totalCost)}</td>
                     </tr>
                  </tfoot>
              </table>
            </Card>
         </div>
      )}

      {/* --- REPORT VIEW: TOURISM --- */}
      {activeTab === 'tourism' && (
         <div className="space-y-6 animate-in fade-in duration-300">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 bg-white border-l-4 border-blue-600 shadow-sm">
                   <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Faturamento Total</p>
                   <p className="text-2xl font-extrabold text-slate-800">{formatMoney(tourismAnalytics.stats.revenue)}</p>
                   <p className="text-xs text-slate-400 mt-1">{tourismAnalytics.stats.count} viagens no período</p>
                </Card>
                <Card className="p-4 bg-white border-l-4 border-red-500 shadow-sm">
                   <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Custos de Viagem</p>
                   <p className="text-2xl font-extrabold text-red-700">{formatMoney(tourismAnalytics.stats.expenses)}</p>
                   <p className="text-xs text-slate-400 mt-1">Pedágios, alimentação, etc</p>
                </Card>
                <Card className="p-4 bg-white border-l-4 border-green-600 shadow-sm">
                   <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Lucro Líquido</p>
                   <p className="text-2xl font-extrabold text-green-700">{formatMoney(tourismAnalytics.profit)}</p>
                   <p className="text-xs text-slate-400 mt-1">Margem de {tourismAnalytics.margin.toFixed(1)}%</p>
                </Card>
                <Card className="p-4 bg-white border-l-4 border-indigo-500 shadow-sm">
                   <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Viagens Realizadas</p>
                   <p className="text-2xl font-extrabold text-indigo-700">{tourismAnalytics.stats.completed}</p>
                   <p className="text-xs text-slate-400 mt-1">Status 'Concluído'</p>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 gap-6 no-print">
               <Card className="h-96 p-4">
                   <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                       <Briefcase size={16} className="text-blue-600"/> Rentabilidade por Viagem (Top 10 Recentes)
                   </h4>
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={tourismAnalytics.chartData} margin={{bottom: 20}}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                         <XAxis dataKey="name" fontSize={10} tick={{dy: 10}} height={40} />
                         <YAxis fontSize={10} tickFormatter={(val) => `R$${val/1000}k`}/>
                         <Tooltip 
                            formatter={(val: number) => formatMoney(val)}
                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                         />
                         <Legend verticalAlign="top" height={36}/>
                         <Bar dataKey="revenue" name="Receita" fill="#2563eb" radius={[4,4,0,0]} barSize={30} />
                         <Bar dataKey="expenses" name="Despesas" fill="#ef4444" radius={[4,4,0,0]} barSize={30} />
                         <Bar dataKey="profit" name="Lucro" fill="#16a34a" radius={[4,4,0,0]} barSize={30} />
                      </BarChart>
                   </ResponsiveContainer>
               </Card>
            </div>

            {/* Table */}
            <Card className="card-print">
              <div className="flex justify-between items-end mb-4 px-2">
                 <div>
                    <h3 className="text-lg font-bold text-slate-800">Relatório de Fretamentos</h3>
                    <p className="text-xs text-slate-500">Histórico de viagens e rentabilidade</p>
                 </div>
              </div>
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-2">Data</th>
                      <th className="px-4 py-2">Cliente / Destino</th>
                      <th className="px-4 py-2">Motorista</th>
                      <th className="px-4 py-2 text-right">Contrato</th>
                      <th className="px-4 py-2 text-right">Despesas</th>
                      <th className="px-4 py-2 text-right">Lucro</th>
                      <th className="px-4 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tourismAnalytics.list.map((t, idx) => {
                       const exp = (t.expenses || []).reduce((a,b)=>a+b.amount,0);
                       const profit = t.contractValue - exp;
                       return (
                       <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-medium">{formatDateDisplay(t.departureDate)}</td>
                          <td className="px-4 py-2">
                              <div className="font-bold text-slate-800">{t.contractorName}</div>
                              <div className="text-[10px] text-slate-500">{t.destination}</div>
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-600">
                             {drivers.find(d => d.id === t.driverId)?.name || '-'}
                          </td>
                          <td className="px-4 py-2 text-right font-medium text-blue-700">{formatMoney(t.contractValue)}</td>
                          <td className="px-4 py-2 text-right text-red-600">{formatMoney(exp)}</td>
                          <td className={`px-4 py-2 text-right font-extrabold ${profit > 0 ? 'text-green-700' : 'text-slate-500'}`}>{formatMoney(profit)}</td>
                          <td className="px-4 py-2 text-center text-[10px] font-bold uppercase text-slate-500">{t.status}</td>
                       </tr>
                    )})}
                    {tourismAnalytics.list.length === 0 && <tr><td colSpan={7} className="p-4 text-center italic text-slate-500">Sem registros no período.</td></tr>}
                  </tbody>
              </table>
            </Card>
         </div>
      )}
    </div>
  );
};
