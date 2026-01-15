
import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/Layout';
import { storage, getLocalDate, formatDateDisplay } from '../services/storageService';
import { AgencyCash, Agency, CommissionRule, ExpenseType } from '../types';
import { GenericTableManager, Column } from '../components/GenericTableManager';
import { CheckCircle, Lock, Wallet, Unlock } from 'lucide-react';
import { CashExpensesManager } from '../components/CashExpensesManager';
import { usePermission } from '../hooks/usePermission';

const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// Standard Input Classes
const INPUT_CLASS = "w-full bg-white border border-slate-300 text-slate-800 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-medium shadow-sm transition-all";
const LABEL_CLASS = "block mb-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide";

export const AgencyCashPage: React.FC = () => {
  const { can } = usePermission();
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

  // FIXED: Logic to use snapshot if available, ensuring historical integrity
  const getCalc = (item: Partial<AgencyCash>) => {
    let pct = 0;
    
    // Priority 1: Use saved snapshot (Historical)
    if (item.commissionPctSnapshot !== undefined && item.commissionPctSnapshot !== null) {
        pct = item.commissionPctSnapshot;
    } 
    // Priority 2: Use current rule (New Entry or Legacy Data)
    else {
        pct = commissions.find(c => c.targetType === 'AGENCY' && c.targetId === item.agencyId && c.active)?.percentage || 0;
    }

    const val = item.valueInformed || 0;
    const comm = val * (pct / 100);
    const expTotal = (item.expenses || []).reduce((a, b) => a + b.amount, 0);
    return { pct, comm, expTotal, net: val - comm - expTotal };
  };

  const stats = useMemo(() => {
    return filteredEntries.reduce((acc, e) => {
      const c = getCalc(e);
      return { inf: acc.inf + e.valueInformed, rec: acc.rec + e.valueReceived, comm: acc.comm + c.comm, exp: acc.exp + c.expTotal, diff: acc.diff + (e.status === 'CLOSED' ? e.diff : (e.valueReceived - c.net)) };
    }, { inf: 0, rec: 0, comm: 0, exp: 0, diff: 0 });
  }, [filteredEntries, commissions]);

  const handleSave = () => {
    if (!formData.date || isNaN(Date.parse(formData.date))) return alert("Data inválida.");
    if (storage.isDayClosed(formData.date)) return alert("Dia Fechado.");
    if (!formData.agencyId) return alert("Selecione Agência.");
    
    // Validate Negatives
    if ((formData.valueInformed || 0) < 0) return alert("Valor bruto não pode ser negativo.");
    if ((formData.valueReceived || 0) < 0) return alert("Valor recebido não pode ser negativo.");

    // Determine the commission percentage to SNAPSHOT
    const currentRulePct = commissions.find(c => c.targetType === 'AGENCY' && c.targetId === formData.agencyId && c.active)?.percentage || 0;
    const pctToSave = currentRulePct; 

    const val = Number(formData.valueInformed || 0);
    const rec = Number(formData.valueReceived || 0);
    const expTotal = (formData.expenses || []).reduce((a, b) => a + b.amount, 0);
    
    const commVal = val * (pctToSave / 100);
    const net = val - commVal - expTotal;

    storage.saveAgencyCash({
      ...formData,
      id: formData.id || Date.now().toString(),
      valueInformed: val, valueReceived: rec,
      diff: rec - net,
      status: formData.status || 'OPEN',
      commissionPctSnapshot: pctToSave // SAVE THE SNAPSHOT
    } as AgencyCash);
    
    setIsModalOpen(false);
    loadData();
  };

  const handleUnlock = (item: AgencyCash) => {
      if (storage.isDayClosed(item.date)) {
          alert("Não é possível reabrir este caixa pois o dia (Fechamento Geral) já foi encerrado. Exclua o Fechamento Diário primeiro.");
          return;
      }
      if (confirm("Deseja reabrir este caixa para correção?")) {
          storage.saveAgencyCash({ ...item, status: 'OPEN' });
          loadData();
      }
  };

  const formCalc = getCalc(formData);
  const formDiff = (Number(formData.valueReceived)||0) - formCalc.net;

  const columns: Column<AgencyCash>[] = [
    { header: "Data", render: (i) => formatDateDisplay(i.date) },
    { header: "Agência", render: (i) => agencies.find(a => a.id === i.agencyId)?.name },
    { header: "Bruto", render: (i) => formatMoney(i.valueInformed), align: 'right' },
    { header: "Comissão", render: (i) => { const c = getCalc(i); return <span className="text-purple-700">-{formatMoney(c.comm)} ({c.pct}%)</span> }, align: 'right' },
    { header: "Despesas", render: (i) => { const c = getCalc(i); return <span className="text-red-600">-{formatMoney(c.expTotal)}</span> }, align: 'right' },
    { header: "Líquido", render: (i) => formatMoney(getCalc(i).net), align: 'right' },
    { header: "Recebido", render: (i) => <span className="font-bold text-green-700">{formatMoney(i.valueReceived)}</span>, align: 'right' },
    { header: "Dif.", render: (i) => { const d = i.status === 'CLOSED' ? i.diff : (i.valueReceived - getCalc(i).net); return <span className={d < -0.1 ? 'text-red-600 font-bold' : 'text-slate-400'}>{d.toFixed(2)}</span> }, align: 'right' },
  ];

  return (
    <GenericTableManager<AgencyCash>
      title="Caixa de Agências"
      subtitle="Controle de repasses e comissões"
      items={filteredEntries}
      columns={columns}
      onNew={() => { setFormData({ date: getLocalDate(), expenses: [], status: 'OPEN' }); setIsModalOpen(true); }}
      onEdit={(i) => { 
          // Allow viewing even if closed, logic inside renderForm handles read-only
          setFormData(JSON.parse(JSON.stringify(i))); 
          setIsModalOpen(true); 
      }}
      
      renderRowActions={(i) => {
        const isDayLocked = storage.isDayClosed(i.date);
        
        if (i.status === 'CLOSED') {
            if (!can('reopen_cash')) {
                return (
                    <div title="Fechado (Apenas Gerente pode reabrir)" className="p-2.5 rounded-lg bg-slate-100 text-slate-300 cursor-not-allowed">
                        <Lock size={20}/>
                    </div>
                );
            }
            return (
                <button onClick={() => handleUnlock(i)} className={`p-2.5 rounded-lg shadow-sm ${isDayLocked ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-amber-100 text-amber-600 hover:bg-amber-200'}`} title={isDayLocked ? "Bloqueado pelo Fechamento Diário" : "Reabrir Caixa"}>
                    {isDayLocked ? <Lock size={20}/> : <Unlock size={20}/>}
                </button>
            );
        }

        return (
            <button onClick={() => { if(isDayLocked) return; storage.saveAgencyCash({...i, status: 'CLOSED'}); loadData(); }} className="p-2.5 rounded-lg shadow-sm bg-slate-100 text-slate-400 hover:bg-green-600 hover:text-white" title="Fechar Caixa">
                <CheckCircle size={20}/>
            </button>
        );
      }}

      isModalOpen={isModalOpen}
      onCloseModal={() => setIsModalOpen(false)}
      onSave={formData.status === 'CLOSED' ? undefined : handleSave} // Hide save if closed
      modalTitle={formData.status === 'CLOSED' ? "Visualizar Caixa (Fechado)" : (formData.id ? "Editar Caixa" : "Novo Caixa")}
      
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
            {formData.status === 'CLOSED' && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-center gap-2 mb-4">
                    <Lock size={18} />
                    <span className="text-sm font-bold">Registro fechado. Reabra na listagem para editar.</span>
                </div>
            )}
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                <div><label className={LABEL_CLASS}>Data</label><input type="date" className={INPUT_CLASS} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} disabled={formData.status === 'CLOSED'} /></div>
                <div><label className={LABEL_CLASS}>Agência</label><select className={INPUT_CLASS} value={formData.agencyId || ''} onChange={e => setFormData({...formData, agencyId: e.target.value})} disabled={formData.status === 'CLOSED'}><option value="">Selecione...</option>{agencies.filter(a => a.active).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
            </div>
            
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Left: Financials */}
                <div className="flex-1 space-y-4">
                    <h4 className="font-bold flex gap-2 items-center text-blue-800"><Wallet size={20}/> Valores</h4>
                    <div>
                        <label className={LABEL_CLASS}>Venda Bruta R$</label>
                        <input type="number" min="0" step="0.01" className={`${INPUT_CLASS} text-lg`} value={formData.valueInformed} onChange={e => setFormData({...formData, valueInformed: Number(e.target.value)})} disabled={formData.status === 'CLOSED'} />
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
                        <input type="number" min="0" step="0.01" className={`w-full border border-green-400 focus:border-green-600 focus:ring-green-200 bg-white p-3 rounded-lg font-black text-2xl text-green-700 shadow-inner ${formData.status === 'CLOSED' ? 'bg-slate-100 text-slate-500' : ''}`} value={formData.valueReceived} onChange={e => setFormData({...formData, valueReceived: Number(e.target.value)})} disabled={formData.status === 'CLOSED'} />
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
                      readOnly={formData.status === 'CLOSED'}
                    />
                </div>
            </div>
        </div>
      )}
    />
  );
};
