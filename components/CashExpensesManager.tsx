
import React, { useState } from 'react';
import { Expense, ExpenseType } from '../types';
import { Plus, Trash2, Receipt } from 'lucide-react';

const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

interface CashExpensesManagerProps {
  expenses: Expense[];
  onChange: (expenses: Expense[]) => void;
  expenseTypes: ExpenseType[];
  className?: string;
}

export const CashExpensesManager: React.FC<CashExpensesManagerProps> = ({ 
  expenses, 
  onChange, 
  expenseTypes,
  className = ''
}) => {
  const [tempType, setTempType] = useState('');
  const [tempAmount, setTempAmount] = useState('');

  const handleAdd = () => {
    if (!tempType || !tempAmount || Number(tempAmount) <= 0) return;
    
    const newExpense: Expense = {
      typeId: tempType,
      amount: Number(tempAmount)
    };

    onChange([...expenses, newExpense]);
    setTempAmount('');
    // Keep type selected for quicker entry or clear it? Let's clear to force conscious choice
    // setTempType(''); 
  };

  const handleRemove = (index: number) => {
    const newExpenses = expenses.filter((_, i) => i !== index);
    onChange(newExpenses);
  };

  const total = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className={`space-y-4 ${className}`}>
      <h4 className="font-bold flex gap-2 text-red-700 items-center border-b pb-2 mb-3">
        <Receipt size={20}/> 
        Saídas (Dinheiro)
      </h4>
      
      {/* Input Area */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
             <label className="block text-xs font-bold text-slate-500 mb-1">Tipo de Despesa</label>
             <select 
                className="w-full border p-2 rounded text-sm" 
                value={tempType} 
                onChange={e => setTempType(e.target.value)}
            >
                <option value="">Selecione...</option>
                {expenseTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
        </div>
        <div className="w-24">
             <label className="block text-xs font-bold text-slate-500 mb-1">Valor</label>
             <input 
                type="number" 
                className="w-full border p-2 rounded text-sm" 
                placeholder="0.00" 
                value={tempAmount} 
                onChange={e => setTempAmount(e.target.value)} 
            />
        </div>
        <button 
            type="button"
            onClick={handleAdd} 
            className="bg-slate-800 text-white p-2.5 rounded hover:bg-slate-700 transition-colors mb-[1px]"
            title="Adicionar Despesa"
        >
            <Plus size={18}/>
        </button>
      </div>

      {/* List */}
      <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden flex flex-col h-40">
        <div className="overflow-y-auto flex-1 p-2 space-y-2">
            {expenses.length === 0 && (
                <div className="text-center text-slate-400 text-sm italic py-4">Nenhuma despesa lançada.</div>
            )}
            {expenses.map((ex, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white border p-2 rounded text-sm shadow-sm">
                    <span className="font-medium text-slate-700">{expenseTypes.find(t => t.id === ex.typeId)?.name || 'Desconhecido'}</span>
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-red-700">-{formatMoney(ex.amount)}</span>
                        <button 
                            type="button"
                            onClick={() => handleRemove(idx)}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                        >
                            <Trash2 size={14}/>
                        </button>
                    </div>
                </div>
            ))}
        </div>
        
        {/* Total Footer */}
        <div className="bg-slate-100 p-2 border-t border-slate-200 flex justify-between items-center">
            <span className="text-xs font-bold uppercase text-slate-500">Total Despesas</span>
            <span className="font-bold text-red-700">{formatMoney(total)}</span>
        </div>
      </div>
    </div>
  );
};
