
import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/Layout';
import { storage, getLocalDate, formatDateDisplay } from '../services/storageService';
import { GeneralExpense, ExpenseType, Supplier } from '../types';
import { GenericTableManager, Column } from '../components/GenericTableManager';
import { Receipt, Clock, CheckCircle2, DollarSign, Calendar, Filter, AlertCircle, CalendarClock, Ban, Plus, Store, Repeat, Calculator } from 'lucide-react';
import { usePermission } from '../hooks/usePermission';

const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// Standard Input Classes
const INPUT_CLASS = "w-full bg-white border border-slate-300 text-slate-800 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-medium shadow-sm transition-all";
const LABEL_CLASS = "block mb-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide";

export const GeneralExpensesPage: React.FC = () => {
  const { can } = usePermission();
  const [expenses, setExpenses] = useState<GeneralExpense[]>([]);
  const [types, setTypes] = useState<ExpenseType[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Installment Logic State
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(2);
  
  // State for Tabs
  const [viewMode, setViewMode] = useState<'pending' | 'paid'>('pending');

  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0).toISOString().split('T')[0], // Next 2 months by default for planning
    typeId: ''
  });
  const [formData, setFormData] = useState<Partial<GeneralExpense>>({});

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    setExpenses(storage.getGeneralExpenses());
    setTypes(storage.getExpenseTypes());
    setSuppliers(storage.getSuppliers());
  };

  // Logic: Split items
  const today = getLocalDate();

  const filteredItems = useMemo(() => {
    let items = expenses.filter(e => {
        // Filter by Date Range (Due Date for Pending, Paid Date for Paid)
        const dateToCheck = viewMode === 'paid' ? (e.paidAt || e.date) : e.date;
        return dateToCheck >= filters.startDate && dateToCheck <= filters.endDate &&
               (filters.typeId ? e.typeId === filters.typeId : true);
    });

    if (viewMode === 'pending') {
        return items.filter(e => e.status === 'PENDING').sort((a, b) => a.date.localeCompare(b.date)); // Sort by Due Date ASC
    } else {
        return items.filter(e => e.status === 'PAID').sort((a, b) => (b.paidAt || b.date).localeCompare(a.paidAt || a.date)); // Sort by Paid Date DESC
    }
  }, [expenses, filters, viewMode]);

  // KPIs
  const stats = useMemo(() => {
    const allPending = expenses.filter(e => e.status === 'PENDING');
    const overdue = allPending.filter(e => e.date < today);
    const totalOverdue = overdue.reduce((acc, curr) => acc + curr.amount, 0);
    const totalPending = allPending.reduce((acc, curr) => acc + curr.amount, 0);
    
    // Total Paid this month (regardless of filter, for KPI context)
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
    const paidThisMonth = expenses.filter(e => e.status === 'PAID' && (e.paidAt || e.date) >= startOfMonth && (e.paidAt || e.date) <= endOfMonth)
                                  .reduce((acc, curr) => acc + curr.amount, 0);

    return {
        overdueCount: overdue.length,
        totalOverdue,
        totalPending,
        paidThisMonth
    };
  }, [expenses, today]);

  const handleSave = () => {
    if (!formData.description || !formData.amount || !formData.date || !formData.typeId) return alert("Preencha campos obrigatórios.");
    if (formData.paymentMethod === 'CASH' && storage.isDayClosed(formData.date)) return alert("Dia fechado para pagamento em DINHEIRO.");

    // Installment Logic
    if (!formData.id && isInstallment && installmentCount > 1) {
        if (!confirm(`Confirma gerar ${installmentCount} parcelas mensais de ${formatMoney(Number(formData.amount))}?\nTotal: ${formatMoney(Number(formData.amount) * installmentCount)}`)) return;

        for (let i = 0; i < installmentCount; i++) {
            // Calculate next month date safely
            const [y, m, d] = formData.date.split('-').map(Number);
            const nextDate = new Date(y, (m - 1) + i, d); // JS handles month overflow (e.g. 12 -> Jan next year) automatically
            const isoDate = nextDate.toISOString().split('T')[0];

            storage.saveGeneralExpense({ 
                ...formData, 
                id: Date.now().toString() + i, // Unique ID per installment
                description: `${formData.description} (${i + 1}/${installmentCount})`,
                date: isoDate,
                amount: Number(formData.amount),
                status: 'PENDING',
            } as GeneralExpense);
        }
    } else {
        // Single Save
        storage.saveGeneralExpense({ 
            ...formData, 
            id: formData.id || Date.now().toString(), 
            amount: Number(formData.amount),
            status: formData.status || 'PENDING',
            paidAt: formData.status === 'PAID' ? (formData.paidAt || formData.date) : undefined
        } as GeneralExpense);
    }
    
    setIsModalOpen(false);
    loadData();
  };

  const handleMarkPaid = (item: GeneralExpense) => {
    if(confirm(`Confirmar pagamento de ${formatMoney(item.amount)}?`)) {
        storage.saveGeneralExpense({ ...item, status: 'PAID', paidAt: getLocalDate() });
        loadData();
    }
  };

  const columns: Column<GeneralExpense>[] = [
    { header: viewMode === 'pending' ? "Vencimento" : "Data Pagto", render: (i) => {
        const isOverdue = i.status === 'PENDING' && i.date < today;
        return (
            <div>
                <div className={`font-bold ${isOverdue ? 'text-red-600 flex items-center gap-1' : ''}`}>
                    {isOverdue && <AlertCircle size={14}/>}
                    {formatDateDisplay(viewMode === 'paid' ? (i.paidAt || i.date) : i.date)}
                </div>
                {viewMode === 'paid' && <div className="text-xs text-slate-400">Venc: {formatDateDisplay(i.date)}</div>}
            </div>
        );
    }},
    { header: "Descrição / Fornecedor", render: (i) => (
        <div>
            {i.supplierId && (
                <div className="font-bold text-slate-800 text-xs uppercase mb-0.5 flex items-center gap-1">
                    <Store size={10} className="text-slate-500"/>
                    {suppliers.find(s => s.id === i.supplierId)?.name || 'Fornecedor Excluído'}
                </div>
            )}
            <div className={`${i.supplierId ? 'text-sm' : 'font-bold text-slate-800'}`}>{i.description}</div>
            <div className="text-xs italic text-slate-500">{i.notes}</div>
        </div> 
    )},
    { header: "Categoria", render: (i) => <span className="bg-slate-200 px-2 py-1 rounded text-xs font-bold text-slate-600">{types.find(t => t.id === i.typeId)?.name || 'Geral'}</span> },
    { header: "Valor", render: (i) => <span className={`font-black text-lg ${i.status === 'PENDING' && i.date < today ? 'text-red-600' : 'text-slate-800'}`}>{formatMoney(i.amount)}</span>, align: 'right' },
    { header: "Método", render: (i) => (
        <span className="text-xs font-bold uppercase text-slate-500 border border-slate-300 px-2 py-1 rounded">
            {i.paymentMethod === 'CASH' ? 'Dinheiro' : i.paymentMethod}
        </span>
    ), align: 'center' }
  ];

  return (
    <GenericTableManager<GeneralExpense>
      title="Contas a Pagar"
      subtitle="Controle financeiro de despesas e obrigações"
      items={filteredItems}
      columns={columns}
      
      // Tabs for View Mode
      filters={
        <div className="w-full flex flex-col gap-4">
            <div className="flex bg-slate-200 p-1 rounded-lg w-full md:w-auto self-start">
                <button 
                    onClick={() => setViewMode('pending')}
                    className={`flex-1 flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-md transition-all ${viewMode === 'pending' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Clock size={16}/> Em Aberto
                </button>
                <button 
                    onClick={() => setViewMode('paid')}
                    className={`flex-1 flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-md transition-all ${viewMode === 'paid' ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <CheckCircle2 size={16}/> Pagas / Histórico
                </button>
            </div>
            
            <div className="flex gap-4 items-end">
                <div className="w-full md:w-auto"><label className={LABEL_CLASS}>De</label><input type="date" className={INPUT_CLASS} value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} /></div>
                <div className="w-full md:w-auto"><label className={LABEL_CLASS}>Até</label><input type="date" className={INPUT_CLASS} value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} /></div>
                <div className="w-full flex-1"><label className={LABEL_CLASS}>Categoria</label><select className={INPUT_CLASS} value={filters.typeId} onChange={e => setFilters({...filters, typeId: e.target.value})}><option value="">Todas</option>{types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            </div>
        </div>
      }

      onNew={() => { 
          setFormData({ date: getLocalDate(), status: 'PENDING', paymentMethod: 'TRANSFER' }); 
          setIsInstallment(false);
          setInstallmentCount(2);
          setIsModalOpen(true); 
      }}
      onEdit={(i) => { 
          if (i.paymentMethod === 'CASH' && storage.isDayClosed(i.date)) return alert("Edição bloqueada (Dia Fechado).");
          setFormData(i); 
          setIsInstallment(false); // Can't split on edit existing
          setIsModalOpen(true); 
      }}
      
      onDelete={can('manage_financials') ? (i) => {
          if (i.paymentMethod === 'CASH' && storage.isDayClosed(i.date)) return alert("Exclusão bloqueada (Dia Fechado).");
          if(confirm("Excluir conta?")) { storage.deleteGeneralExpense(i.id); loadData(); }
      } : undefined}
      
      renderRowActions={(item) => item.status === 'PENDING' ? (
        <button onClick={() => handleMarkPaid(item)} className="text-white bg-green-600 hover:bg-green-700 p-2.5 rounded-lg shadow-sm transition-colors flex items-center gap-2" title="Dar Baixa (Pagar)">
            <DollarSign size={20} /> <span className="font-bold text-xs hidden md:inline">PAGAR</span>
        </button>
      ) : (
          <div className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs font-bold border border-green-200">BAIXADO</div>
      )}

      isModalOpen={isModalOpen}
      onCloseModal={() => setIsModalOpen(false)}
      onSave={handleSave}
      modalTitle={formData.id ? "Editar Conta" : "Nova Conta a Pagar"}
      saveLabel={formData.status === 'PAID' ? 'Salvar' : 'Agendar / Salvar'}

      kpiContent={
        <>
            <Card className={`p-4 border-l-4 shadow-sm flex flex-col justify-between ${stats.totalOverdue > 0 ? 'border-red-600 bg-red-50' : 'border-slate-300 bg-white'}`}>
                <div className="flex justify-between items-start">
                    <div>
                        <div className={`text-xs font-bold uppercase ${stats.totalOverdue > 0 ? 'text-red-700' : 'text-slate-500'}`}>Vencidas</div>
                        <div className={`text-2xl font-extrabold ${stats.totalOverdue > 0 ? 'text-red-700' : 'text-slate-400'}`}>{formatMoney(stats.totalOverdue)}</div>
                    </div>
                    {stats.totalOverdue > 0 ? <AlertCircle size={24} className="text-red-500"/> : <CheckCircle2 size={24} className="text-slate-300"/>}
                </div>
                {stats.overdueCount > 0 && <div className="text-xs font-bold text-red-600 mt-2">{stats.overdueCount} contas em atraso!</div>}
            </Card>

            <Card className="p-4 border-l-4 border-blue-500 flex flex-col justify-between shadow-sm bg-white">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="text-xs font-bold uppercase text-slate-500">Total em Aberto</div>
                        <div className="text-2xl font-bold text-blue-700">{formatMoney(stats.totalPending)}</div>
                    </div>
                    <CalendarClock size={24} className="text-blue-300"/>
                </div>
                <div className="text-xs text-slate-400 mt-2 font-medium">Previsão futura</div>
            </Card>

            <Card className="p-4 border-l-4 border-green-600 flex flex-col justify-between shadow-sm bg-white">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="text-xs font-bold uppercase text-slate-500">Pago este Mês</div>
                        <div className="text-2xl font-bold text-green-800">{formatMoney(stats.paidThisMonth)}</div>
                    </div>
                    <Receipt size={24} className="text-green-300"/>
                </div>
                <div className="text-xs text-slate-400 mt-2 font-medium">Baixado no período atual</div>
            </Card>
        </>
      }

      renderForm={() => (
        <div className="space-y-4">
            {/* Status Toggle in Form */}
            <div className="flex justify-center pb-4 border-b border-slate-100">
                <div className="bg-slate-100 p-1 rounded-full flex">
                    <button 
                        onClick={() => setFormData({...formData, status: 'PENDING'})}
                        className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${formData.status !== 'PAID' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}
                    >
                        A Pagar
                    </button>
                    <button 
                        onClick={() => setFormData({...formData, status: 'PAID', paidAt: formData.paidAt || getLocalDate()})}
                        className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${formData.status === 'PAID' ? 'bg-green-600 text-white shadow-sm' : 'text-slate-500'}`}
                    >
                        Já Pago
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className={LABEL_CLASS}>{formData.status === 'PAID' ? 'Vencimento Original' : 'Data de Vencimento *'}</label>
                    <input type="date" className={INPUT_CLASS} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div>
                    <label className={LABEL_CLASS}>Valor da Parcela R$ *</label>
                    <input type="number" step="0.01" className={`${INPUT_CLASS} text-lg font-bold text-slate-800`} value={formData.amount || ''} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} autoFocus/>
                </div>
            </div>
            
            {/* INSTALLMENT SECTION - NEW */}
            {!formData.id && formData.status !== 'PAID' && (
                <div className={`p-4 rounded-lg border transition-all duration-300 ${isInstallment ? 'bg-blue-50 border-blue-200 shadow-inner' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                         <input 
                            type="checkbox" 
                            id="checkInstallment"
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                            checked={isInstallment}
                            onChange={e => setIsInstallment(e.target.checked)}
                         />
                         <label htmlFor="checkInstallment" className="font-bold text-slate-700 flex items-center gap-2 cursor-pointer select-none">
                             <Repeat size={18}/> Parcelar / Repetir Despesa
                         </label>
                    </div>
                    
                    {isInstallment && (
                        <div className="mt-4 flex items-end gap-4 animate-in slide-in-from-top-2">
                             <div className="flex-1">
                                <label className={LABEL_CLASS}>Qtd. Parcelas (Meses)</label>
                                <input 
                                    type="number" 
                                    min="2" max="60"
                                    className={INPUT_CLASS}
                                    value={installmentCount}
                                    onChange={e => setInstallmentCount(Math.max(2, Number(e.target.value)))}
                                />
                             </div>
                             <div className="flex-1 pb-3 text-sm text-blue-800 font-medium italic">
                                 Total: <strong>{formatMoney((Number(formData.amount) || 0) * installmentCount)}</strong>
                             </div>
                        </div>
                    )}
                </div>
            )}
            
            {/* SUPPLIER SELECT */}
            <div>
                <label className={LABEL_CLASS}>Fornecedor Cadastrado</label>
                <div className="flex gap-2">
                     <select className={INPUT_CLASS} value={formData.supplierId || ''} onChange={e => {
                         // Optional logic: if supplier is selected, we could auto-fill generic description but we let user type details
                         setFormData({...formData, supplierId: e.target.value}); 
                     }}>
                        <option value="">Outro / Avulso (Não Cadastrado)</option>
                        {suppliers.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.name} {s.tradeName ? `(${s.tradeName})` : ''}</option>)}
                     </select>
                     <a href="#/registries" className="bg-slate-200 p-2 rounded text-slate-600 hover:bg-slate-300 transition-colors flex items-center justify-center w-12" title="Cadastrar Novo Fornecedor">
                        <Plus size={20}/>
                     </a>
                </div>
            </div>

            <div>
                <label className={LABEL_CLASS}>Descrição / Detalhes *</label>
                <input className={INPUT_CLASS} value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Ex: Referente a Fatura #1234, Peças, etc."/>
                {isInstallment && <p className="text-xs text-slate-500 mt-1 italic">O sistema irá adicionar (1/X) na descrição automaticamente.</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className={LABEL_CLASS}>Categoria</label>
                    <select className={INPUT_CLASS} value={formData.typeId || ''} onChange={e => setFormData({...formData, typeId: e.target.value})}>
                        <option value="">Selecione...</option>{types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className={LABEL_CLASS}>Método de Pagamento</label>
                    <select className={INPUT_CLASS} value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value as any})}>
                        <option value="TRANSFER">Transferência Bancária</option>
                        <option value="PIX">PIX</option>
                        <option value="BOLETO">Boleto Bancário</option>
                        <option value="CASH">Dinheiro (Caixa)</option>
                        <option value="CREDIT">Cartão de Crédito</option>
                        <option value="DEBIT">Cartão de Débito</option>
                    </select>
                </div>
            </div>

            {formData.status === 'PAID' && (
                <div className="bg-green-50 p-4 rounded border border-green-200 animate-in fade-in slide-in-from-top-2">
                    <label className={LABEL_CLASS}>Data do Pagamento</label>
                    <input type="date" className={INPUT_CLASS} value={formData.paidAt || ''} onChange={e => setFormData({...formData, paidAt: e.target.value})} />
                </div>
            )}

            <div><label className={LABEL_CLASS}>Observações</label><textarea className={INPUT_CLASS} rows={2} value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} /></div>
        </div>
      )}
    />
  );
};
