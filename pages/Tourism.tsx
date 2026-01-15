
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button } from '../components/Layout';
import { storage, getLocalDate, formatDateDisplay } from '../services/storageService';
import { TourismService, Driver, Vehicle, ExpenseType, Client } from '../types';
import { GenericTableManager, Column } from '../components/GenericTableManager';
import { 
  MapPinned, Users, CheckCircle, Calendar, DollarSign, AlertCircle, Calculator, 
  PlusCircle, Printer, ThumbsUp, ThumbsDown, XCircle, User, Bus 
} from 'lucide-react';
import { CashExpensesManager } from '../components/CashExpensesManager';
import { usePermission } from '../hooks/usePermission';

const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// Standard Input Classes
const INPUT_CLASS = "w-full bg-white border border-slate-300 text-slate-800 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-semibold shadow-sm";
const LABEL_CLASS = "block mb-1 text-xs font-bold text-slate-500 uppercase";

export const TourismPage: React.FC = () => {
  const { can } = usePermission();
  const [entries, setEntries] = useState<TourismService[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printData, setPrintData] = useState<TourismService | null>(null);
  
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: getLocalDate(),
    status: ''
  });

  const [formData, setFormData] = useState<Partial<TourismService>>({ 
    departureDate: getLocalDate(), 
    returnDate: getLocalDate(),
    expenses: [],
    status: 'QUOTE',
    pricingType: 'FIXED',
    days: 1,
    clientId: ''
  });

  useEffect(() => { 
      setEntries(storage.getTourismServices()); 
      setDrivers(storage.getDrivers()); 
      setVehicles(storage.getVehicles()); 
      setClients(storage.getClients());
      setExpenseTypes(storage.getExpenseTypes());
  }, []);

  // --- AUTO CALCULATION LOGIC ---
  useEffect(() => {
    if (isModalOpen && formData.pricingType === 'CALCULATED') {
        const priceKm = Number(formData.pricePerKm) || 0;
        const dist = Number(formData.totalKm) || 0;
        const rate = Number(formData.dailyRate) || 0;
        const daysCount = Number(formData.days) || 0;

        const kmCost = dist * priceKm;
        const dailyCost = daysCount * rate;
        
        const total = Number((kmCost + dailyCost).toFixed(2));
        
        if (formData.contractValue !== total) {
            setFormData(prev => ({ ...prev, contractValue: total }));
        }
    }
  }, [
      formData.pricingType, 
      formData.totalKm, 
      formData.pricePerKm, 
      formData.days, 
      formData.dailyRate, 
      isModalOpen
  ]);

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      return e.departureDate >= filters.startDate && e.departureDate <= filters.endDate && 
             (filters.status ? e.status === filters.status : true);
    }).sort((a, b) => b.departureDate.localeCompare(a.departureDate));
  }, [entries, filters]);

  const stats = useMemo(() => {
    return filteredEntries.reduce((acc, e) => {
        const totalExpenses = (e.expenses || []).reduce((sum, exp) => sum + exp.amount, 0);
        return {
            totalValue: acc.totalValue + (e.contractValue || 0),
            totalExpenses: acc.totalExpenses + totalExpenses,
            count: acc.count + 1,
            completed: acc.completed + (e.status === 'COMPLETED' ? 1 : 0)
        };
    }, { totalValue: 0, totalExpenses: 0, count: 0, completed: 0 });
  }, [filteredEntries]);

  const handleSave = () => {
    if (!formData.contractorName) return alert("O nome do Contratante é obrigatório (Selecione um cliente ou digite manualmente).");
    if (!formData.destination) return alert("Preencha o Destino.");
    if (!formData.departureDate || !formData.returnDate) return alert("Datas obrigatórias.");
    
    // Auto-set receivedValue if not set and status is COMPLETED (Assuming cash in hand for legacy behavior)
    // Actually, better to let user define. If undefined, we can default to 0 in new records, but keep legacy logic in reports.
    // For now, save as is.

    storage.saveTourismService({
        ...formData,
        id: formData.id || Date.now().toString(),
        contractValue: Number(formData.contractValue || 0),
        receivedValue: formData.receivedValue !== undefined ? Number(formData.receivedValue) : undefined,
        status: formData.status || 'QUOTE'
    } as TourismService);
    
    setIsModalOpen(false);
    setEntries(storage.getTourismServices());
  };

  const handleChangeStatus = (item: TourismService, newStatus: TourismService['status']) => {
      if(!confirm(`Deseja alterar o status para ${newStatus === 'CONFIRMED' ? 'ACEITO/CONFIRMADO' : 'RECUSADO'}?`)) return;
      storage.saveTourismService({ ...item, status: newStatus });
      setEntries(storage.getTourismServices());
  };

  const handlePrintQuote = (item: TourismService) => {
    setPrintData(item);
    setIsPrintModalOpen(true);
  };

  const getStatusLabel = (status: string) => {
      const map: Record<string, any> = {
          'QUOTE': { label: 'Orç.', class: 'bg-slate-200 text-slate-700' },
          'CONFIRMED': { label: 'Conf.', class: 'bg-blue-100 text-blue-700' },
          'COMPLETED': { label: 'OK', class: 'bg-green-100 text-green-700' },
          'CANCELED': { label: 'Canc.', class: 'bg-red-100 text-red-700' },
          'REJECTED': { label: 'Rec.', class: 'bg-slate-300 text-slate-600 line-through' }
      };
      const s = map[status] || map['QUOTE'];
      return <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border border-transparent ${s.class}`}>{s.label}</span>;
  };

  const columns: Column<TourismService>[] = [
    { 
        header: "Data / Status", 
        render: (i) => (
            <div className="flex flex-col gap-1 items-start w-24">
                <span className="font-bold text-slate-800 text-sm leading-none">{formatDateDisplay(i.departureDate).substring(0,5)}</span>
                <span className="text-[10px] text-slate-500">{formatDateDisplay(i.departureDate).substring(6)}</span>
                {getStatusLabel(i.status)}
            </div>
        ),
        align: 'center'
    },
    { 
        header: "Viagem & Cliente", 
        render: (i) => (
            <div className="max-w-[180px] lg:max-w-[250px]">
                <div className="font-bold text-slate-800 text-sm leading-tight truncate" title={i.destination}>
                    {i.destination}
                </div>
                <div className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5" title={i.contractorName}>
                    {i.clientId ? <User size={10} className="text-blue-500 shrink-0"/> : <User size={10} className="text-slate-300 shrink-0"/>}
                    {i.contractorName}
                </div>
                <div className="mt-1">
                    {i.pricingType === 'CALCULATED' ? 
                        <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 px-1 py-0.5 rounded border border-indigo-100">VIAGEM</span> : 
                        <span className="text-[9px] font-bold bg-slate-50 text-slate-500 px-1 py-0.5 rounded border border-slate-200">URBANO</span>
                    }
                </div>
            </div> 
        )
    },
    { 
        header: "Financeiro", 
        render: (i) => {
            const totalExp = (i.expenses || []).reduce((a,b) => a + b.amount, 0);
            const received = i.receivedValue !== undefined ? i.receivedValue : (i.status === 'COMPLETED' ? i.contractValue : 0);
            const pending = i.contractValue - received;
            
            return (
                <div className="text-right">
                    <div className="font-extrabold text-blue-700 text-sm">{formatMoney(i.contractValue)}</div>
                    
                    {pending > 0 && i.status === 'CONFIRMED' && (
                        <div className="text-[10px] text-red-500 font-bold">Falta: {formatMoney(pending)}</div>
                    )}
                    
                    {received > 0 && (
                        <div className="text-[10px] text-green-600 font-bold">Recebido: {formatMoney(received)}</div>
                    )}
                </div>
            );
        }, 
        align: 'right' 
    },
  ];

  return (
    <>
    <GenericTableManager<TourismService>
      title="Turismo & Fretamento"
      subtitle="Gestão de excursões e viagens contratadas"
      items={filteredEntries}
      columns={columns}
      onNew={() => { setFormData({ departureDate: getLocalDate(), returnDate: getLocalDate(), expenses: [], status: 'QUOTE', pricingType: 'FIXED', days: 1, clientId: '' }); setIsModalOpen(true); }}
      onEdit={(i) => { setFormData(JSON.parse(JSON.stringify(i))); setIsModalOpen(true); }}
      onDelete={can('delete_records') ? (i) => { if(confirm("Excluir serviço?")) { storage.deleteTourismService(i.id); setEntries(storage.getTourismServices()); } } : undefined}
      
      renderRowActions={(i) => (
          <>
            {i.status === 'QUOTE' && can('approve_tourism') && (
                <>
                    <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleChangeStatus(i, 'CONFIRMED'); }} 
                        className="text-white bg-green-600 hover:bg-green-700 p-2.5 rounded-lg shadow-sm transition-colors" 
                        title="Aprovar (Confirmar)"
                    >
                        <ThumbsUp size={20} />
                    </button>
                    <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleChangeStatus(i, 'REJECTED'); }} 
                        className="text-white bg-red-600 hover:bg-red-700 p-2.5 rounded-lg shadow-sm transition-colors" 
                        title="Recusar"
                    >
                        <ThumbsDown size={20} />
                    </button>
                </>
            )}
            <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); handlePrintQuote(i); }} 
                className="text-white bg-slate-600 hover:bg-slate-700 p-2.5 rounded-lg shadow-sm transition-colors" 
                title="Imprimir Orçamento"
            >
                <Printer size={20} />
            </button>
          </>
      )}

      isModalOpen={isModalOpen}
      onCloseModal={() => setIsModalOpen(false)}
      onSave={handleSave}
      kpiContent={
        <>
            <Card className="p-4 border-l-4 border-blue-600 shadow-sm"><div><div className="text-xs font-bold uppercase text-slate-500">Receita Total</div><div className="text-2xl font-bold text-slate-800">{formatMoney(stats.totalValue)}</div></div></Card>
            <Card className="p-4 border-l-4 border-red-500 shadow-sm"><div><div className="text-xs font-bold uppercase text-slate-500">Despesas Viagem</div><div className="text-2xl font-bold text-red-700">{formatMoney(stats.totalExpenses)}</div></div></Card>
            <Card className="p-4 border-l-4 border-green-600 shadow-sm"><div><div className="text-xs font-bold uppercase text-slate-500">Lucro Operacional</div><div className="text-2xl font-bold text-green-700">{formatMoney(stats.totalValue - stats.totalExpenses)}</div></div></Card>
            <Card className="p-4 border-l-4 border-slate-400 shadow-sm"><div><div className="text-xs font-bold uppercase text-slate-500">Viagens</div><div className="text-2xl font-bold text-slate-700">{stats.completed} <span className="text-sm text-slate-400">/ {stats.count}</span></div></div></Card>
        </>
      }
      filters={
        <>
           <div className="w-full"><label className={LABEL_CLASS}>De</label><input type="date" className={INPUT_CLASS} value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} /></div>
           <div className="w-full"><label className={LABEL_CLASS}>Até</label><input type="date" className={INPUT_CLASS} value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} /></div>
           <div className="w-full flex-1"><label className={LABEL_CLASS}>Status</label>
             <select className={INPUT_CLASS} value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
                 <option value="">Todos</option>
                 <option value="QUOTE">Orçamento</option>
                 <option value="CONFIRMED">Confirmado</option>
                 <option value="COMPLETED">Realizado</option>
                 <option value="CANCELED">Cancelado</option>
                 <option value="REJECTED">Recusado</option>
             </select>
           </div>
        </>
      }
      renderForm={() => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                <div className="md:col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <label className={LABEL_CLASS}>Identificação do Contratante</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                             <span className="text-[10px] text-slate-500 block mb-1">Selecionar Cadastro (Preenchimento Automático)</span>
                             <div className="flex gap-2">
                                <select 
                                    className={INPUT_CLASS} 
                                    value={formData.clientId || ''} 
                                    onChange={e => {
                                        const selectedClient = clients.find(c => c.id === e.target.value);
                                        setFormData({
                                            ...formData, 
                                            clientId: e.target.value,
                                            contractorName: selectedClient ? selectedClient.name : (formData.contractorName || '')
                                        });
                                    }}
                                >
                                    <option value="">-- Cliente Avulso / Manual --</option>
                                    {clients.filter(c => c.active).map(c => (
                                        <option key={c.id} value={c.id}>{c.name} {c.type === 'PJ' ? `(${c.tradeName})` : ''}</option>
                                    ))}
                                </select>
                                <a href="#/registries" title="Cadastrar Novo Cliente" className="bg-white border border-slate-300 text-slate-600 p-2.5 rounded-lg hover:bg-slate-100 transition-colors flex items-center justify-center">
                                    <PlusCircle size={20}/>
                                </a>
                            </div>
                        </div>
                        <div>
                             <span className="text-[10px] text-slate-500 block mb-1">Nome no Contrato (Salvo no Orçamento)</span>
                             <div className="relative">
                                <User className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                                <input 
                                    className={`${INPUT_CLASS} pl-10`}
                                    value={formData.contractorName || ''} 
                                    onChange={e => setFormData({...formData, contractorName: e.target.value})} 
                                    placeholder="Nome do Cliente" 
                                />
                             </div>
                        </div>
                    </div>
                </div>
                
                <div className="md:col-span-2"><label className={LABEL_CLASS}>Destino / Itinerário</label><input className={INPUT_CLASS} value={formData.destination || ''} onChange={e => setFormData({...formData, destination: e.target.value})} placeholder="Ex: Aparecida do Norte - SP" /></div>

                <div><label className={LABEL_CLASS}>Data Saída</label><input type="date" className={INPUT_CLASS} value={formData.departureDate} onChange={e => setFormData({...formData, departureDate: e.target.value})} /></div>
                <div><label className={LABEL_CLASS}>Data Retorno</label><input type="date" className={INPUT_CLASS} value={formData.returnDate} onChange={e => setFormData({...formData, returnDate: e.target.value})} /></div>

                <div><label className={LABEL_CLASS}>Veículo</label><select className={INPUT_CLASS} value={formData.vehicleId || ''} onChange={e => setFormData({...formData, vehicleId: e.target.value})}><option value="">Selecione...</option>{vehicles.filter(v => v.active).map(v => <option key={v.id} value={v.id}>{v.plate}</option>)}</select></div>
                <div><label className={LABEL_CLASS}>Motorista</label><select className={INPUT_CLASS} value={formData.driverId || ''} onChange={e => setFormData({...formData, driverId: e.target.value})}><option value="">Selecione...</option>{drivers.filter(d => d.active).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                
                <div>
                    <label className={LABEL_CLASS}>Status</label>
                    <select className={`${INPUT_CLASS} font-bold`} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                        <option value="QUOTE">Orçamento</option>
                        <option value="CONFIRMED">Confirmado</option>
                        <option value="COMPLETED">Realizado</option>
                        <option value="CANCELED">Cancelado</option>
                        <option value="REJECTED">Recusado</option>
                    </select>
                </div>
            </div>
            
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Left: Pricing & Financials */}
                <div className="flex-1 space-y-4">
                    <h4 className="font-bold flex gap-2 items-center text-blue-800"><DollarSign size={20}/> Precificação</h4>
                    
                    {/* Pricing Selector */}
                    <div className="bg-slate-100 p-1 rounded-lg flex text-sm font-bold mb-4">
                        <button 
                            className={`flex-1 py-2 rounded-md transition-all ${formData.pricingType === 'FIXED' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            onClick={() => setFormData({...formData, pricingType: 'FIXED'})}
                        >
                            Urbano / Fixo
                        </button>
                        <button 
                            className={`flex-1 py-2 rounded-md transition-all ${formData.pricingType === 'CALCULATED' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            onClick={() => setFormData({...formData, pricingType: 'CALCULATED'})}
                        >
                            Viagem (KM + Diária)
                        </button>
                    </div>

                    {formData.pricingType === 'CALCULATED' && (
                        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 grid grid-cols-2 gap-3 animate-in slide-in-from-top-2">
                            <div>
                                <label className={LABEL_CLASS}>Preço por KM</label>
                                <input type="number" step="0.10" className={INPUT_CLASS} placeholder="Ex: 5.00" value={formData.pricePerKm || ''} onChange={e => setFormData({...formData, pricePerKm: Number(e.target.value)})}/>
                            </div>
                            <div>
                                <label className={LABEL_CLASS}>KM Total</label>
                                <input type="number" className={INPUT_CLASS} placeholder="Distância total" value={formData.totalKm || ''} onChange={e => setFormData({...formData, totalKm: Number(e.target.value)})}/>
                            </div>
                            <div>
                                <label className={LABEL_CLASS}>Valor da Diária</label>
                                <input type="number" step="0.10" className={INPUT_CLASS} placeholder="Ex: 300.00" value={formData.dailyRate || ''} onChange={e => setFormData({...formData, dailyRate: Number(e.target.value)})}/>
                            </div>
                            <div>
                                <label className={LABEL_CLASS}>Qtd. Diárias</label>
                                <input type="number" className={INPUT_CLASS} placeholder="Dias parados" value={formData.days || ''} onChange={e => setFormData({...formData, days: Number(e.target.value)})}/>
                            </div>
                            <div className="col-span-2 text-center text-xs text-indigo-700 font-medium italic border-t border-indigo-200 pt-2 mt-1">
                                Cálculo: ({formData.totalKm || 0}km × R${formData.pricePerKm || 0}) + ({formData.days || 0} dias × R${formData.dailyRate || 0})
                            </div>
                        </div>
                    )}

                    <div>
                        <label className={LABEL_CLASS}>Valor Total do Contrato R$</label>
                        <div className="relative">
                            {formData.pricingType === 'CALCULATED' && <Calculator className="absolute right-3 top-3 text-indigo-400" size={20}/>}
                            <input 
                                type="number" 
                                step="0.01" 
                                className={`${INPUT_CLASS} font-bold text-lg ${formData.pricingType === 'CALCULATED' ? 'text-indigo-700 bg-indigo-50 border-indigo-200' : 'text-blue-700'}`} 
                                value={formData.contractValue} 
                                onChange={e => setFormData({...formData, contractValue: Number(e.target.value)})} 
                                readOnly={formData.pricingType === 'CALCULATED'}
                            />
                        </div>
                    </div>

                    {/* NEW RECEIVED VALUE FIELD */}
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <label className="block text-sm font-bold text-green-800 mb-1 uppercase">Valor Recebido (Sinal/Total)</label>
                        <input 
                            type="number" 
                            step="0.01" 
                            className="w-full border border-green-400 focus:border-green-600 focus:ring-green-200 bg-white p-3 rounded-lg font-black text-2xl text-green-700 shadow-inner"
                            value={formData.receivedValue || ''} 
                            onChange={e => setFormData({...formData, receivedValue: Number(e.target.value)})}
                            placeholder="0.00"
                        />
                        <div className="mt-2 text-xs font-bold text-green-700">
                            Falta Receber: {formatMoney((formData.contractValue || 0) - (formData.receivedValue || 0))}
                        </div>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-lg text-sm space-y-2 border border-slate-200">
                        <div className="flex justify-between text-slate-700 font-medium">
                            <span>(+) Contrato</span>
                            <span>{formatMoney(formData.contractValue || 0)}</span>
                        </div>
                        <div className="flex justify-between text-red-600 font-medium">
                            <span>(-) Despesas</span>
                            <span>{formatMoney((formData.expenses || []).reduce((a,b)=>a+b.amount,0))}</span>
                        </div>
                        <div className="flex justify-between font-extrabold border-t pt-2 text-slate-800 text-lg">
                            <span>(=) Resultado (Lucro)</span>
                            <span>{formatMoney((formData.contractValue || 0) - (formData.expenses || []).reduce((a,b)=>a+b.amount,0))}</span>
                        </div>
                    </div>
                    <div><label className={LABEL_CLASS}>Observações</label><textarea className={INPUT_CLASS} rows={3} value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} /></div>
                </div>

                {/* Right: Expenses Manager */}
                <div className="flex-1 border-l pl-8 border-slate-200">
                    <CashExpensesManager 
                      expenses={formData.expenses || []}
                      onChange={(newExpenses) => setFormData({...formData, expenses: newExpenses})}
                      expenseTypes={expenseTypes}
                    />
                    <p className="text-xs text-slate-400 mt-2 italic">Lance aqui pedágios, alimentação do motorista, estacionamento e outros custos da viagem.</p>
                </div>
            </div>
        </div>
      )}
    />
    </>
  );
};
