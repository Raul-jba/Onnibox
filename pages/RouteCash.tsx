
import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/Layout';
import { storage, getLocalDate, formatDateDisplay } from '../services/storageService';
import { RouteCash, Driver, Vehicle, RouteDef, ExpenseType, Line } from '../types';
import { GenericTableManager, Column } from '../components/GenericTableManager';
import { CheckCircle, Lock, DollarSign } from 'lucide-react';
import { CashExpensesManager } from '../components/CashExpensesManager';

const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// Standard Input Classes
const INPUT_CLASS = "w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-semibold shadow-sm";
const LABEL_CLASS = "block mb-1 text-xs font-bold text-slate-500 uppercase";

export const RouteCashPage: React.FC = () => {
  const [entries, setEntries] = useState<RouteCash[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<RouteDef[]>([]); 
  const [lines, setLines] = useState<Line[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: getLocalDate(),
    lineId: ''
  });

  const [formData, setFormData] = useState<Partial<RouteCash>>({ date: getLocalDate(), expenses: [] });
  const [selectedLineId, setSelectedLineId] = useState('');

  useEffect(() => { 
      setEntries(storage.getRouteCash()); setDrivers(storage.getDrivers()); 
      setVehicles(storage.getVehicles()); setRoutes(storage.getRoutes()); 
      setLines(storage.getLines()); setExpenseTypes(storage.getExpenseTypes());
  }, []);

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const lineMatch = filters.lineId ? routes.find(r => r.id === e.routeId)?.lineId === filters.lineId : true;
      return e.date >= filters.startDate && e.date <= filters.endDate && lineMatch;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, filters, routes]);

  const stats = useMemo(() => {
    return filteredEntries.reduce((acc, e) => ({
      rev: acc.rev + e.revenueInformed, exp: acc.exp + e.cashExpenses, handed: acc.handed + e.cashHanded, diff: acc.diff + e.diff
    }), { rev: 0, exp: 0, handed: 0, diff: 0 });
  }, [filteredEntries]);

  const handleSave = () => {
    if (!formData.date || isNaN(Date.parse(formData.date))) return alert("Data inválida.");
    if (storage.isDayClosed(formData.date)) return alert("Dia Fechado.");
    if (formData.date > getLocalDate() && !confirm("Data futura. Confirmar?")) return;
    if (!formData.routeId || !formData.driverId || !formData.vehicleId) return alert("Preencha Rota, Veículo e Motorista.");

    const revenue = Number(formData.revenueInformed) || 0;
    const totalCashExpenses = (formData.expenses || []).reduce((acc, curr) => acc + curr.amount, 0);
    const handed = Number(formData.cashHanded) || 0;

    storage.saveRouteCash({
        ...formData,
        id: formData.id || Date.now().toString(),
        passengers: Number(formData.passengers || 0),
        revenueInformed: revenue,
        cashExpenses: totalCashExpenses,
        netCashExpected: revenue - totalCashExpenses,
        cashHanded: handed,
        diff: handed - (revenue - totalCashExpenses),
        status: formData.status || 'OPEN'
    } as RouteCash);
    
    setIsModalOpen(false);
    setEntries(storage.getRouteCash());
  };

  const handleLock = (entry: RouteCash) => {
      if(storage.isDayClosed(entry.date)) return alert("Dia Fechado.");
      storage.saveRouteCash({...entry, status: 'CLOSED'});
      setEntries(storage.getRouteCash());
  }

  // Form helpers
  const formExp = (formData.expenses || []).reduce((a, b) => a + b.amount, 0);
  const formDiff = (Number(formData.cashHanded)||0) - ((Number(formData.revenueInformed)||0) - formExp);
  const formSchedules = selectedLineId ? routes.filter(r => r.lineId === selectedLineId && r.active) : [];

  const columns: Column<RouteCash>[] = [
    { header: "Data", render: (i) => formatDateDisplay(i.date) },
    { header: "Rota", render: (i) => {
        const r = routes.find(x => x.id === i.routeId);
        const l = lines.find(x => x.id === r?.lineId);
        return <div><div className="font-bold">{l?.name}</div><div className="text-xs text-slate-500">{r?.time} - {r?.destination}</div></div>;
    }},
    { header: "Resp.", render: (i) => <div><div className="font-bold">{drivers.find(d => d.id === i.driverId)?.name}</div><div className="text-xs text-slate-500">{vehicles.find(v => v.id === i.vehicleId)?.plate}</div></div> },
    { header: "Venda", render: (i) => formatMoney(i.revenueInformed), align: 'right' },
    { header: "Desp.", render: (i) => <span className="text-red-700 font-medium">{i.cashExpenses > 0 ? `-${formatMoney(i.cashExpenses)}` : '-'}</span>, align: 'right' },
    { header: "A Entregar", render: (i) => formatMoney(i.netCashExpected), align: 'right' },
    { header: "Entregue", render: (i) => <span className="font-black text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">{formatMoney(i.cashHanded)}</span>, align: 'right' },
    { header: "Dif.", render: (i) => <span className={`font-black ${i.diff < -0.1 ? 'text-red-600' : 'text-slate-300'}`}>{i.diff.toFixed(2)}</span>, align: 'right' },
  ];

  return (
    <GenericTableManager<RouteCash>
      title="Caixa de Linhas"
      subtitle="Conferência de viagens e arrecadação"
      items={filteredEntries}
      columns={columns}
      onNew={() => { setFormData({ date: getLocalDate(), expenses: [], status: 'OPEN' }); setSelectedLineId(''); setIsModalOpen(true); }}
      onEdit={(i) => { 
          if(storage.isDayClosed(i.date)) return alert("Dia Fechado.");
          setSelectedLineId(routes.find(r => r.id === i.routeId)?.lineId || '');
          setFormData(JSON.parse(JSON.stringify(i))); setIsModalOpen(true); 
      }}
      renderRowActions={(i) => !storage.isDayClosed(i.date) ? (
        <button onClick={() => handleLock(i)} className={`p-2.5 rounded-lg transition-colors ${i.status === 'CLOSED' ? 'bg-green-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400 hover:bg-green-600 hover:text-white'}`}><CheckCircle size={20}/></button>
      ) : <Lock size={20} className="text-slate-400 mt-2"/>}
      isModalOpen={isModalOpen}
      onCloseModal={() => setIsModalOpen(false)}
      onSave={handleSave}
      kpiContent={
        <>
            <Card className="p-4 border-l-4 border-blue-600 shadow-sm"><div><div className="text-xs font-bold uppercase text-slate-500">Vendas</div><div className="text-2xl font-bold text-slate-800">{formatMoney(stats.rev)}</div></div></Card>
            <Card className="p-4 border-l-4 border-red-500 shadow-sm"><div><div className="text-xs font-bold uppercase text-slate-500">Despesas</div><div className="text-2xl font-bold text-red-700">{formatMoney(stats.exp)}</div></div></Card>
            <Card className="p-4 border-l-4 border-green-600 shadow-sm"><div><div className="text-xs font-bold uppercase text-slate-500">Entregue</div><div className="text-2xl font-bold text-green-700">{formatMoney(stats.handed)}</div></div></Card>
            <Card className="p-4 border-l-4 border-slate-400 shadow-sm"><div><div className="text-xs font-bold uppercase text-slate-500">Diferença</div><div className={`text-2xl font-bold ${stats.diff < -1 ? 'text-red-600' : 'text-slate-600'}`}>{formatMoney(stats.diff)}</div></div></Card>
        </>
      }
      filters={
        <>
           <div className="w-full"><label className={LABEL_CLASS}>De</label><input type="date" className={INPUT_CLASS} value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} /></div>
           <div className="w-full"><label className={LABEL_CLASS}>Até</label><input type="date" className={INPUT_CLASS} value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} /></div>
           <div className="w-full flex-1"><label className={LABEL_CLASS}>Linha</label><select className={INPUT_CLASS} value={filters.lineId} onChange={e => setFilters({...filters, lineId: e.target.value})}><option value="">Todas</option>{lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
        </>
      }
      renderForm={() => (
        <div className="space-y-6">
            {/* Top Section: Route Details */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-4 border-b border-slate-100">
                <div><label className={LABEL_CLASS}>Data</label><input type="date" className={INPUT_CLASS} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
                <div><label className={LABEL_CLASS}>Linha</label><select className={INPUT_CLASS} value={selectedLineId} onChange={e => { setSelectedLineId(e.target.value); setFormData({...formData, routeId: ''}); }}><option value="">Selecione...</option>{lines.filter(l => l.active).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                <div><label className={LABEL_CLASS}>Horário</label><select className={INPUT_CLASS} value={formData.routeId || ''} onChange={e => setFormData({...formData, routeId: e.target.value})} disabled={!selectedLineId}><option value="">Selecione...</option>{formSchedules.map(r => <option key={r.id} value={r.id}>{r.time} - {r.destination}</option>)}</select></div>
                <div><label className={LABEL_CLASS}>Veículo</label><select className={INPUT_CLASS} value={formData.vehicleId || ''} onChange={e => setFormData({...formData, vehicleId: e.target.value})}><option value="">Selecione...</option>{vehicles.filter(v => v.active).map(v => <option key={v.id} value={v.id}>{v.plate}</option>)}</select></div>
                <div className="md:col-span-4"><label className={LABEL_CLASS}>Motorista</label><select className={INPUT_CLASS} value={formData.driverId || ''} onChange={e => setFormData({...formData, driverId: e.target.value})}><option value="">Selecione...</option>{drivers.filter(d => d.active).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
            </div>
            
            {/* Bottom Section: Split Financials and Expenses */}
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Left: Financials Inputs */}
                <div className="flex-1 space-y-4">
                    <h4 className="font-bold flex gap-2 items-center text-blue-800"><DollarSign size={20}/> Receita & Conferência</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={LABEL_CLASS}>Passageiros</label>
                          <input type="number" className={INPUT_CLASS} value={formData.passengers} onChange={e => setFormData({...formData, passengers: Number(e.target.value)})} />
                        </div>
                        <div>
                          <label className={LABEL_CLASS}>Venda Total R$</label>
                          <input type="number" step="0.01" className={`${INPUT_CLASS} font-bold text-lg text-blue-700`} value={formData.revenueInformed} onChange={e => setFormData({...formData, revenueInformed: Number(e.target.value)})} />
                        </div>
                    </div>
                    
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                       <label className="block text-sm font-bold text-green-800 mb-1 uppercase">Dinheiro Entregue R$</label>
                       <input type="number" step="0.01" className="w-full border border-green-400 focus:border-green-600 focus:ring-green-200 bg-white p-3 rounded-lg font-black text-2xl text-green-700 shadow-inner" value={formData.cashHanded} onChange={e => setFormData({...formData, cashHanded: Number(e.target.value)})} />
                    </div>

                    <div className={`p-3 rounded-lg font-bold border flex justify-between items-center text-lg shadow-sm ${formDiff < -0.1 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-slate-700 border-slate-200'}`}>
                       <span>Diferença:</span>
                       <span>{formatMoney(formDiff)}</span>
                    </div>
                </div>

                {/* Right: Expenses Manager */}
                <div className="flex-1 border-l pl-8 border-slate-200">
                    <CashExpensesManager 
                      expenses={formData.expenses || []}
                      onChange={(newExpenses) => setFormData({...formData, expenses: newExpenses})}
                      expenseTypes={expenseTypes}
                    />
                </div>
            </div>
        </div>
      )}
    />
  );
};
