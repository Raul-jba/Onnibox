
import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/Layout';
import { storage, getLocalDate, formatDateDisplay } from '../services/storageService';
import { AgencyCash, Agency, CommissionRule, ExpenseType } from '../types';
import { GenericTableManager, Column } from '../components/GenericTableManager';
import { CheckCircle, Lock, Wallet } from 'lucide-react';
import { CashExpensesManager } from '../components/CashExpensesManager';

const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// Standard Input Classes
const INPUT_CLASS = "w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-semibold shadow-sm";
const LABEL_CLASS = "block mb-1 text-xs font-bold text-slate-500 uppercase";

export const AgencyCashPage: React.FC = () => {
  const [entries, setEntries] = useState<AgencyCash[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [commissions, setCommissions] = useState<CommissionRule[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: getLocalDate(), agencyId: ''
  });
  const [formData, setFormData] = useState<Partial<AgencyCash>>({ date: getLocalDate(), expenses: [] });

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    setEntries(storage.getAgencyCash()); setAgencies(storage.getAgencies());
    setCommissions(storage.getCommissions()); setExpenseTypes(storage.getExpenseTypes());
  };

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      return e.date >= filters.startDate && e.date <= filters.endDate && (filters.agencyId ? e.agencyId === filters.agencyId : true);
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, filters]);

  const getCalc = (agencyId: string, val: number, exps: any[]) => {
    const pct = commissions.find(c => c.targetType === 'AGENCY' && c.targetId === agencyId && c.active)?.percentage || 0;
    const comm = val * (pct / 100);
    const expTotal = exps.reduce((a, b) => a + b.amount, 0);
    return { pct, comm, expTotal, net: val - comm - expTotal };
  };

  const stats = useMemo(() => {
    return filteredEntries.reduce((acc, e) => {
      const c = getCalc(e.agencyId, e.valueInformed, e.expenses || []);
      return { inf: acc.inf + e.valueInformed, rec: acc.rec + e.valueReceived, comm: acc.comm + c.comm, exp: acc.exp + c.expTotal, diff: acc.diff + (e.status === 'CLOSED' ? e.diff : (e.valueReceived - c.net)) };
    }, { inf: 0, rec: 0, comm: 0, exp: 0, diff: 0 });
  }, [filteredEntries, commissions]);

  const handleSave = () => {
    if (!formData.date || isNaN(Date.parse(formData.date))) return alert("Data inválida.");
    if (storage.isDayClosed(formData.date)) return alert("Dia Fechado.");
    if (!formData.agencyId) return alert("Selecione Agência.");
    
    const val = Number(formData.valueInformed || 0);
    const rec = Number(formData.valueReceived || 0);
    const calc = getCalc(formData.agencyId, val, formData.expenses || []);
    
    storage.saveAgencyCash({
      ...formData,
      id: formData.id || Date.now().toString(),
      valueInformed: val, valueReceived: rec,
      diff: rec - calc.net,
      status: formData.status || 'OPEN'
    } as AgencyCash);
    
    setIsModalOpen(false);
    loadData();
  };

  const formCalc = getCalc(formData.agencyId || '', Number(formData.valueInformed)||0, formData.expenses || []);
  const formDiff = (Number(formData.valueReceived)||0) - formCalc.net;

  const columns: Column<AgencyCash>[] = [
    { header: "Data", render: (i) => formatDateDisplay(i.date) },
    { header: "Agência", render: (i) => agencies.find(a => a.id === i.agencyId)?.name },
    { header: "Bruto", render: (i) => formatMoney(i.valueInformed), align: 'right' },
    { header: "Comissão", render: (i) => { const c = getCalc(i.agencyId, i.valueInformed, i.expenses||[]); return <span className="text-purple-700">-{formatMoney(c.comm)}</span> }, align: 'right' },
    { header: "Despesas", render: (i) => { const c = getCalc(i.agencyId, i.valueInformed, i.expenses||[]); return <span className="text-red-600">-{formatMoney(c.expTotal)}</span> }, align: 'right' },
    { header: "Líquido", render: (i) => formatMoney(getCalc(i.agencyId, i.valueInformed, i.expenses||[]).net), align: 'right' },
    { header: "Recebido", render: (i) => <span className="font-bold text-green-700">{formatMoney(i.valueReceived)}</span>, align: 'right' },
    { header: "Dif.", render: (i) => { const d = i.status === 'CLOSED' ? i.diff : (i.valueReceived - getCalc(i.agencyId, i.valueInformed, i.expenses||[]).net); return <span className={d < -0.1 ? 'text-red-600 font-bold' : 'text-slate-400'}>{d.toFixed(2)}</span> }, align: 'right' },
  ];

  return (
    <GenericTableManager<AgencyCash>
      title="Caixa de Agências"
      subtitle="Controle de repasses e comissões"
      items={filteredEntries}
      columns={columns}
      onNew={() => { setFormData({ date: getLocalDate(), expenses: [], status: 'OPEN' }); setIsModalOpen(true); }}
      onEdit={(i) => { if(storage.isDayClosed(i.date)) return alert("Dia Fechado."); setFormData(JSON.parse(JSON.stringify(i))); setIsModalOpen(true); }}
      renderRowActions={(i) => !storage.isDayClosed(i.date) ? (
        <button onClick={() => { if(storage.isDayClosed(i.date)) return; storage.saveAgencyCash({...i, status: 'CLOSED'}); loadData(); }} className={`p-2.5 rounded-lg shadow-sm ${i.status === 'CLOSED' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-green-600 hover:text-white'}`}><CheckCircle size={20}/></button>
      ) : <Lock size={20} className="text-slate-400 mt-2"/>}
      isModalOpen={isModalOpen}
      onCloseModal={() => setIsModalOpen(false)}
      onSave={handleSave}
      kpiContent={
        <>
           <Card className="p-4 border-l-4 border-blue-600 shadow-sm"><div><div className="text-xs font-bold uppercase text-slate-500">Vendas</div><div className="text-2xl font-bold text-slate-800">{formatMoney(stats.inf)}</div></div></Card>
           <Card className="p-4 border-l-4 border-purple-500 shadow-sm"><div><div className="text-xs font-bold uppercase text-slate-500">Comissões</div><div className="text-2xl font-bold text-purple-700">{formatMoney(stats.comm)}</div></div></Card>
           <Card className="p-4 border-l-4 border-green-600 shadow-sm"><div><div className="text-xs font-bold uppercase text-slate-500">Recebido</div><div className="text-2xl font-bold text-green-700">{formatMoney(stats.rec)}</div></div></Card>
           <Card className="p-4 border-l-4 border-slate-400 shadow-sm"><div><div className="text-xs font-bold uppercase text-slate-500">Diferença</div><div className={`text-2xl font-bold ${stats.diff < -1 ? 'text-red-600' : 'text-slate-600'}`}>{formatMoney(stats.diff)}</div></div></Card>
        </>
      }
      filters={
        <>
            <div className="w-full"><label className={LABEL_CLASS}>De</label><input type="date" className={INPUT_CLASS} value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} /></div>
            <div className="w-full"><label className={LABEL_CLASS}>Até</label><input type="date" className={INPUT_CLASS} value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} /></div>
            <div className="w-full flex-1"><label className={LABEL_CLASS}>Agência</label><select className={INPUT_CLASS} value={filters.agencyId} onChange={e => setFilters({...filters, agencyId: e.target.value})}><option value="">Todas</option>{agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
        </>
      }
      renderForm={() => (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                <div><label className={LABEL_CLASS}>Data</label><input type="date" className={INPUT_CLASS} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
                <div><label className={LABEL_CLASS}>Agência</label><select className={INPUT_CLASS} value={formData.agencyId || ''} onChange={e => setFormData({...formData, agencyId: e.target.value})}><option value="">Selecione...</option>{agencies.filter(a => a.active).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
            </div>
            
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Left: Financials */}
                <div className="flex-1 space-y-4">
                    <h4 className="font-bold flex gap-2 items-center text-blue-800"><Wallet size={20}/> Valores</h4>
                    <div>
                        <label className={LABEL_CLASS}>Venda Bruta R$</label>
                        <input type="number" step="0.01" className={`${INPUT_CLASS} text-lg`} value={formData.valueInformed} onChange={e => setFormData({...formData, valueInformed: Number(e.target.value)})} />
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-lg text-sm space-y-2 border border-slate-200">
                        <div className="flex justify-between text-purple-700 font-medium">
                            <span>(-) Comissão ({formCalc.pct}%)</span>
                            <span>{formatMoney(formCalc.comm)}</span>
                        </div>
                        <div className="flex justify-between text-red-600 font-medium">
                            <span>(-) Despesas</span>
                            <span>{formatMoney(formCalc.expTotal)}</span>
                        </div>
                        <div className="flex justify-between font-extrabold border-t pt-2 text-slate-800 text-lg">
                            <span>(=) Líquido Esperado</span>
                            <span>{formatMoney(formCalc.net)}</span>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-green-800 mb-1 uppercase">Recebido R$</label>
                        <input type="number" step="0.01" className="w-full border border-green-400 focus:border-green-600 focus:ring-green-200 bg-white p-3 rounded-lg font-black text-2xl text-green-700 shadow-inner" value={formData.valueReceived} onChange={e => setFormData({...formData, valueReceived: Number(e.target.value)})} />
                    </div>
                    
                    <div className={`p-3 rounded-lg font-bold border flex justify-between items-center text-lg ${formDiff < -0.1 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-slate-700 border-slate-200'}`}>
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
