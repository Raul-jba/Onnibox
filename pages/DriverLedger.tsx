
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button } from '../components/Layout';
import { storage, formatDateDisplay, money, getLocalDate } from '../services/storageService';
import { Driver, DriverLedgerEntry } from '../types';
import { 
  User, Wallet, TrendingUp, TrendingDown, 
  PlusCircle, MinusCircle, FileText, Calendar, Search 
} from 'lucide-react';

const formatMoney = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// Components Typed Correctly
interface DriverCardProps {
    driver: Driver;
    balance: number;
    onClick: () => void;
    isSelected: boolean;
}

const DriverCard: React.FC<DriverCardProps> = ({ driver, balance, onClick, isSelected }) => (
    <div 
        onClick={onClick}
        className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${isSelected ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-100' : 'bg-white border-slate-200 hover:border-blue-200'}`}
    >
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border ${isSelected ? 'bg-blue-200 text-blue-700 border-blue-300' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {driver.name.substring(0,2).toUpperCase()}
                </div>
                <div>
                    <div className="font-bold text-slate-800 text-sm leading-tight">{driver.name}</div>
                    <div className="text-[10px] text-slate-500">{driver.phone || 'Sem telefone'}</div>
                </div>
            </div>
            <div className={`text-right ${balance < 0 ? 'text-red-600' : (balance > 0 ? 'text-green-600' : 'text-slate-400')}`}>
                <div className="text-[10px] font-bold uppercase mb-0.5">Saldo</div>
                <div className="font-extrabold text-sm">{formatMoney(balance)}</div>
            </div>
        </div>
    </div>
);

interface TransactionRowProps {
    entry: DriverLedgerEntry;
    onDelete: (id: string) => void;
}

const TransactionRow: React.FC<TransactionRowProps> = ({ entry, onDelete }) => (
    <div className="flex items-center justify-between p-4 bg-white border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-4">
            <div className={`p-2 rounded-lg ${entry.type === 'DEBIT' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                {entry.type === 'DEBIT' ? <TrendingDown size={18}/> : <TrendingUp size={18}/>}
            </div>
            <div>
                <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">{entry.description}</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">{entry.category}</span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <Calendar size={10}/> {formatDateDisplay(entry.date)}
                </div>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <span className={`font-bold ${entry.type === 'DEBIT' ? 'text-red-600' : 'text-green-600'}`}>
                {entry.type === 'DEBIT' ? '-' : '+'}{formatMoney(entry.amount)}
            </span>
            <button onClick={() => onDelete(entry.id)} className="text-slate-300 hover:text-red-500 transition-colors" title="Excluir Lançamento">
                <FileText size={16} />
            </button>
        </div>
    </div>
);

export const DriverLedgerPage: React.FC = () => {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [ledger, setLedger] = useState<DriverLedgerEntry[]>([]);
    const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Form
    const [formData, setFormData] = useState<Partial<DriverLedgerEntry>>({
        date: getLocalDate(),
        category: 'SHORTAGE',
        type: 'DEBIT'
    });

    useEffect(() => {
        setDrivers(storage.getDrivers().filter(d => d.active));
        setLedger(storage.getDriverLedger());
    }, []);

    // Derived Data
    const driverBalances = useMemo(() => {
        const balances: Record<string, number> = {};
        drivers.forEach(d => balances[d.id] = 0);
        
        ledger.forEach(entry => {
            if (balances[entry.driverId] !== undefined) {
                if (entry.type === 'CREDIT') balances[entry.driverId] += entry.amount;
                else balances[entry.driverId] -= entry.amount;
            }
        });
        return balances;
    }, [drivers, ledger]);

    const currentLedger = useMemo(() => {
        if (!selectedDriverId) return [];
        return ledger.filter(l => l.driverId === selectedDriverId).sort((a,b) => b.date.localeCompare(a.date));
    }, [ledger, selectedDriverId]);

    const filteredDrivers = useMemo(() => {
        return drivers.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [drivers, searchTerm]);

    const handleAddEntry = () => {
        if (!formData.amount || !formData.description || !selectedDriverId) return alert("Preencha todos os campos.");
        
        storage.saveLedgerEntry({
            ...formData,
            driverId: selectedDriverId,
            amount: Number(formData.amount),
            id: Date.now().toString()
        } as DriverLedgerEntry);

        setLedger(storage.getDriverLedger());
        setIsModalOpen(false);
        setFormData({ date: getLocalDate(), category: 'SHORTAGE', type: 'DEBIT', amount: undefined, description: '' });
    };

    const handleDelete = (id: string) => {
        if (confirm("Tem certeza que deseja excluir este lançamento?")) {
            storage.deleteLedgerEntry(id);
            setLedger(storage.getDriverLedger());
        }
    };

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row gap-6">
            
            {/* Left Column: Drivers List */}
            <div className="w-full md:w-1/3 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                        <User size={20} className="text-blue-600"/> Motoristas
                    </h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                        <input 
                            type="text" 
                            placeholder="Buscar motorista..." 
                            className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="overflow-y-auto flex-1 p-3 space-y-2 custom-scrollbar">
                    {filteredDrivers.map(driver => (
                        <DriverCard 
                            key={driver.id} 
                            driver={driver} 
                            balance={driverBalances[driver.id]} 
                            isSelected={selectedDriverId === driver.id}
                            onClick={() => setSelectedDriverId(driver.id)}
                        />
                    ))}
                </div>
            </div>

            {/* Right Column: Statement */}
            <div className="w-full md:w-2/3 flex flex-col">
                {selectedDriverId ? (
                    <Card className="flex-1 flex flex-col p-0 overflow-hidden border-0 shadow-lg">
                        {/* Header */}
                        <div className="p-6 bg-slate-800 text-white flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold">{drivers.find(d => d.id === selectedDriverId)?.name}</h2>
                                <p className="text-blue-200 text-sm">Extrato de Conta Corrente</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs uppercase font-bold text-blue-300">Saldo Atual</p>
                                <div className={`text-3xl font-extrabold ${driverBalances[selectedDriverId] < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {formatMoney(driverBalances[selectedDriverId])}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-4 bg-slate-100 border-b border-slate-200 flex gap-3">
                            <button 
                                onClick={() => { setFormData({ ...formData, type: 'DEBIT', category: 'SHORTAGE' }); setIsModalOpen(true); }}
                                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-bold text-sm hover:bg-red-200 transition-colors"
                            >
                                <MinusCircle size={18}/> Lançar Débito / Vale
                            </button>
                            <button 
                                onClick={() => { setFormData({ ...formData, type: 'CREDIT', category: 'PAYMENT' }); setIsModalOpen(true); }}
                                className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-bold text-sm hover:bg-green-200 transition-colors"
                            >
                                <PlusCircle size={18}/> Lançar Pagamento / Crédito
                            </button>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50">
                            {currentLedger.length > 0 ? (
                                currentLedger.map(entry => (
                                    <TransactionRow key={entry.id} entry={entry} onDelete={handleDelete} />
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                    <Wallet size={48} className="mb-4 opacity-50"/>
                                    <p>Nenhum lançamento registrado.</p>
                                </div>
                            )}
                        </div>
                    </Card>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
                        <User size={64} className="mb-4 opacity-20"/>
                        <h3 className="text-xl font-bold text-slate-500">Selecione um Motorista</h3>
                        <p>Para visualizar o extrato e lançar valores.</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md bg-white p-6 animate-in fade-in zoom-in duration-200">
                        <h3 className={`text-xl font-bold mb-6 flex items-center gap-2 ${formData.type === 'DEBIT' ? 'text-red-600' : 'text-green-600'}`}>
                            {formData.type === 'DEBIT' ? <TrendingDown/> : <TrendingUp/>}
                            {formData.type === 'DEBIT' ? 'Novo Débito' : 'Novo Crédito'}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Lançamento</label>
                                <select 
                                    className="w-full border p-2.5 rounded-lg"
                                    value={formData.category}
                                    onChange={e => setFormData({...formData, category: e.target.value as any})}
                                >
                                    {formData.type === 'DEBIT' ? (
                                        <>
                                            <option value="SHORTAGE">Diferença de Caixa (Falta)</option>
                                            <option value="ADVANCE">Vale / Adiantamento</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="PAYMENT">Pagamento de Dívida</option>
                                            <option value="BONUS">Bônus / Premiação</option>
                                            <option value="REFUND">Reembolso de Despesa</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label>
                                <input type="date" className="w-full border p-2.5 rounded-lg" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor R$</label>
                                <input type="number" step="0.01" className="w-full border p-2.5 rounded-lg text-lg font-bold" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} autoFocus />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
                                <input type="text" className="w-full border p-2.5 rounded-lg" placeholder="Ex: Referente a viagem X..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                            <Button onClick={handleAddEntry} className={formData.type === 'DEBIT' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}>
                                Confirmar Lançamento
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};
