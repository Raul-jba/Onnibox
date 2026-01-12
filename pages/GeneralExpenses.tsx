
import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/Layout';
import { storage, getLocalDate, formatDateDisplay } from '../services/storageService';
import { GeneralExpense, ExpenseType } from '../types';
import { GenericTableManager, Column } from '../components/GenericTableManager';
import { Receipt, Clock, CheckCircle2, DollarSign, Calendar, Filter } from 'lucide-react';

const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// Standard Input Classes
const INPUT_CLASS = "w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-semibold shadow-sm";
const LABEL_CLASS = "block mb-1 text-xs font-bold text-slate-500 uppercase";

export const GeneralExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<GeneralExpense[]>([]);
  const [types, setTypes] = useState<ExpenseType[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: getLocalDate(),
    typeId: '',
    status: ''
  });
  const [formData, setFormData] = useState<Partial<GeneralExpense>>({});

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    setExpenses(storage.getGeneralExpenses());
    setTypes(storage.getExpenseTypes());
  };

  const filteredItems = useMemo(() => {
    return expenses.filter(e => {
      return e.date >= filters.startDate && e.date <= filters.endDate &&
             (filters.typeId ? e.typeId === filters.typeId : true) &&
             (filters.status ? e.status === filters.status : true);
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, filters]);

  const stats = useMemo(() => {
    return {
        total: filteredItems.reduce((acc, curr) => acc + curr.amount, 0),
        paid: filteredItems.filter(e => e.status === 'PAID').reduce((acc, curr) => acc + curr.amount, 0),
        pending: filteredItems.filter(e => e.status === 'PENDING').reduce((acc, curr) => acc + curr.amount, 0)
    };
  }, [filteredItems]);

  const handleSave = () => {
    if (!formData.description || !formData.amount || !formData.date || !formData.typeId) return alert("Preencha campos obrigatórios.");
    if (formData.paymentMethod === 'CASH' && storage.isDayClosed(formData.date)) return alert("Dia fechado para pagamento em DINHEIRO.");

    storage.saveGeneralExpense({ 
        ...formData, 
        id: formData.id || Date.now().toString(), 
        amount: Number(formData.amount),
        status: formData.status || 'PENDING',
        paidAt: formData.status === 'PAID' ? (formData.paidAt || formData.date) : undefined
    } as GeneralExpense);
    
    setIsModalOpen(false);
    loadData();
  };

  const handleMarkPaid = (item: GeneralExpense) => {
    storage.saveGeneralExpense({ ...item, status: 'PAID', paidAt: getLocalDate() });
    loadData();
  };

  const columns: Column<GeneralExpense>[] = [
    { header: "Vencimento", render: (i) => <div><div>{formatDateDisplay(i.date)}</div>{i.status === 'PAID' && i.paidAt && <div className="text-xs text-green-700 font-bold">PG: {formatDateDisplay(i.paidAt)}</div>}</div> },
    { header: "Descrição", render: (i) => <div><div className="font-bold">{i.description}</div><div className="text-xs italic">{i.notes}</div></div> },
    { header: "Categoria", render: (i) => <span className="bg-slate-200 px-2 py-1 rounded text-xs font-bold">{types.find(t => t.id === i.typeId)?.name || 'Outros'}</span> },
    { header: "Valor", render: (i) => <span className="font-black text-lg">{formatMoney(i.amount)}</span>, align: 'right' },
    { header: "Status", render: (i) => <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${i.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>{i.status === 'PAID' ? 'PAGO' : 'PENDENTE'}</span>, align: 'center' },
    { header: "Método", render: (i) => i.paymentMethod }
  ];

  return (
    <GenericTableManager<GeneralExpense>
      title="Despesas Diversas"
      subtitle="Contas a pagar e despesas administrativas"
      items={filteredItems}
      columns={columns}
      onNew={() => { setFormData({ date: getLocalDate(), status: 'PENDING', paymentMethod: 'TRANSFER' }); setIsModalOpen(true); }}
      onEdit={(i) => { 
          if (i.paymentMethod === 'CASH' && storage.isDayClosed(i.date)) return alert("Edição bloqueada (Dia Fechado).");
          setFormData(i); setIsModalOpen(true); 
      }}
      onDelete={(i) => {
          if (i.paymentMethod === 'CASH' && storage.isDayClosed(i.date)) return alert("Exclusão bloqueada (Dia Fechado).");
          if(confirm("Excluir?")) { storage.deleteGeneralExpense(i.id); loadData(); }
      }}
      renderRowActions={(item) => item.status !== 'PAID' && (
        <button onClick={() => handleMarkPaid(item)} className="text-white bg-green-600 hover:bg-green-700 p-2.5 rounded-lg shadow-sm" title="Marcar Pago">
            <DollarSign size={20} />
        </button>
      )}
      isModalOpen={isModalOpen}
      onCloseModal={() => setIsModalOpen(false)}
      onSave={handleSave}
      kpiContent={
        <>
            <Card className="p-4 border-l-4 border-slate-600 flex justify-between shadow-sm"><div><div className="text-xs font-bold uppercase text-slate-500">Total</div><div className="text-xl font-bold text-slate-800">{formatMoney(stats.total)}</div></div><Receipt size={24} className="text-slate-400"/></Card>
            <Card className="p-4 border-l-4 border-amber-500 flex justify-between shadow-sm"><div><div className="text-xs font-bold uppercase text-slate-500">Pendente</div><div className="text-xl font-bold text-amber-700">{formatMoney(stats.pending)}</div></div><Clock size={24} className="text-amber-400"/></Card>
            <Card className="p-4 border-l-4 border-green-600 flex justify-between shadow-sm"><div><div className="text-xs font-bold uppercase text-slate-500">Pago</div><div className="text-xl font-bold text-green-800">{formatMoney(stats.paid)}</div></div><CheckCircle2 size={24} className="text-green-400"/></Card>
        </>
      }
      filters={
        <>
            <div className="w-full"><label className={LABEL_CLASS}>De</label><input type="date" className={INPUT_CLASS} value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} /></div>
            <div className="w-full"><label className={LABEL_CLASS}>Até</label><input type="date" className={INPUT_CLASS} value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} /></div>
            <div className="w-full"><label className={LABEL_CLASS}>Categoria</label><select className={INPUT_CLASS} value={filters.typeId} onChange={e => setFilters({...filters, typeId: e.target.value})}><option value="">Todas</option>{types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            <div className="w-full"><label className={LABEL_CLASS}>Status</label><select className={INPUT_CLASS} value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}><option value="">Todos</option><option value="PAID">Pago</option><option value="PENDING">Pendente</option></select></div>
        </>
      }
      renderForm={() => (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div><label className={LABEL_CLASS}>Vencimento</label><input type="date" className={INPUT_CLASS} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
                <div><label className={LABEL_CLASS}>Valor R$</label><input type="number" step="0.01" className={`${INPUT_CLASS} text-lg font-bold`} value={formData.amount || ''} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} /></div>
            </div>
            <div><label className={LABEL_CLASS}>Descrição</label><input className={INPUT_CLASS} value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
            <div><label className={LABEL_CLASS}>Categoria</label><select className={INPUT_CLASS} value={formData.typeId || ''} onChange={e => setFormData({...formData, typeId: e.target.value})}><option value="">Selecione...</option>{types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            <div className="grid grid-cols-3 gap-4">
                <div><label className={LABEL_CLASS}>Método</label><select className={INPUT_CLASS} value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value as any})}><option value="TRANSFER">Transf.</option><option value="PIX">PIX</option><option value="BOLETO">Boleto</option><option value="CASH">Dinheiro</option><option value="CREDIT">Crédito</option></select></div>
                <div><label className={LABEL_CLASS}>Status</label><select className={INPUT_CLASS} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any, paidAt: e.target.value === 'PAID' ? (formData.paidAt || getLocalDate()) : ''})}><option value="PENDING">Pendente</option><option value="PAID">Pago</option></select></div>
                <div><label className={LABEL_CLASS}>Data Pagto</label><input type="date" className={INPUT_CLASS} value={formData.paidAt || ''} onChange={e => setFormData({...formData, paidAt: e.target.value, status: e.target.value ? 'PAID' : 'PENDING'})} /></div>
            </div>
            <div><label className={LABEL_CLASS}>Obs</label><textarea className={INPUT_CLASS} rows={2} value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} /></div>
        </div>
      )}
    />
  );
};
