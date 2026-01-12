
import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/Layout';
import { storage, getLocalDate, formatDateDisplay } from '../services/storageService';
import { TourismService, Driver, Vehicle, ExpenseType, Client } from '../types';
import { GenericTableManager, Column } from '../components/GenericTableManager';
import { MapPinned, Users, CheckCircle, Calendar, DollarSign, AlertCircle, Calculator, PlusCircle } from 'lucide-react';
import { CashExpensesManager } from '../components/CashExpensesManager';

const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// Standard Input Classes
const INPUT_CLASS = "w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-semibold shadow-sm";
const LABEL_CLASS = "block mb-1 text-xs font-bold text-slate-500 uppercase";

export const TourismPage: React.FC = () => {
  const [entries, setEntries] = useState<TourismService[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
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
        const kmCost = (formData.totalKm || 0) * (formData.pricePerKm || 0);
        const dailyCost = (formData.days || 0) * (formData.dailyRate || 0);
        const total = kmCost + dailyCost;
        
        // Only update if value is different to avoid loops, though strict mode might trigger twice
        if (formData.contractValue !== total) {
            setFormData(prev => ({ ...prev, contractValue: total }));
        }
    }
  }, [formData.pricingType, formData.totalKm, formData.pricePerKm, formData.days, formData.dailyRate, isModalOpen]);

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
    // Basic validation: Must have a name manually typed OR a selected client
    if (!formData.contractorName && !formData.clientId) return alert("Selecione um Cliente ou digite o nome do Contratante.");
    if (!formData.destination) return alert("Preencha o Destino.");
    if (!formData.departureDate || !formData.returnDate) return alert("Datas obrigatórias.");
    
    // Ensure contractorName matches selected client if clientId is present (for consistency)
    let finalContractorName = formData.contractorName;
    if (formData.clientId) {
        const client = clients.find(c => c.id === formData.clientId);
        if (client) finalContractorName = client.name;
    }

    storage.saveTourismService({
        ...formData,
        id: formData.id || Date.now().toString(),
        contractValue: Number(formData.contractValue || 0),
        contractorName: finalContractorName || 'Desconhecido',
        status: formData.status || 'QUOTE'
    } as TourismService);
    
    setIsModalOpen(false);
    setEntries(storage.getTourismServices());
  };

  const getStatusLabel = (status: string) => {
      const map: Record<string, any> = {
          'QUOTE': { label: 'Orçamento', class: 'bg-slate-200 text-slate-700' },
          'CONFIRMED': { label: 'Confirmado', class: 'bg-blue-100 text-blue-700' },
          'COMPLETED': { label: 'Realizado', class: 'bg-green-100 text-green-700' },
          'CANCELED': { label: 'Cancelado', class: 'bg-red-100 text-red-700' }
      };
      const s = map[status] || map['QUOTE'];
      return <span className={`px-2 py-1 rounded text-xs font-bold ${s.class}`}>{s.label}</span>;
  };

  const columns: Column<TourismService>[] = [
    { header: "Data Saída", render: (i) => formatDateDisplay(i.departureDate) },
    { header: "Contratante", render: (i) => <div><div className="font-bold">{i.contractorName}</div><div className="text-xs text-slate-500">{i.destination}</div></div> },
    { header: "Motorista/Veículo", render: (i) => {
        const drv = drivers.find(d => d.id === i.driverId)?.name || '-';
        const veh = vehicles.find(v => v.id === i.vehicleId)?.plate || '-';
        return <div className="text-sm"><div>{drv}</div><div className="text-slate-500 text-xs">{veh}</div></div>;
    }},
    { header: "Tipo", render: (i) => i.pricingType === 'CALCULATED' ? <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">VIAGEM</span> : <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">URBANO</span>, align: 'center'},
    { header: "Valor", render: (i) => formatMoney(i.contractValue), align: 'right' },
    { header: "Despesas", render: (i) => {
        const total = (i.expenses || []).reduce((a,b) => a + b.amount, 0);
        return <span className="text-red-600">-{formatMoney(total)}</span>;
    }, align: 'right' },
    { header: "Lucro", render: (i) => {
        const totalExp = (i.expenses || []).reduce((a,b) => a + b.amount, 0);
        const profit = i.contractValue - totalExp;
        return <span className={`font-bold ${profit > 0 ? 'text-green-700' : 'text-slate-500'}`}>{formatMoney(profit)}</span>;
    }, align: 'right' },
    { header: "Status", render: (i) => getStatusLabel(i.status), align: 'center' },
  ];

  return (
    <GenericTableManager<TourismService>
      title="Turismo & Fretamento"
      subtitle="Gestão de excursões e viagens contratadas"
      items={filteredEntries}
      columns={columns}
      onNew={() => { setFormData({ departureDate: getLocalDate(), returnDate: getLocalDate(), expenses: [], status: 'QUOTE', pricingType: 'FIXED', days: 1, clientId: '' }); setIsModalOpen(true); }}
      onEdit={(i) => { setFormData(JSON.parse(JSON.stringify(i))); setIsModalOpen(true); }}
      onDelete={(i) => { if(confirm("Excluir serviço?")) { storage.deleteTourismService(i.id); setEntries(storage.getTourismServices()); } }}
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
             </select>
           </div>
        </>
      }
      renderForm={() => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                <div className="md:col-span-2">
                    <label className={LABEL_CLASS}>Cliente / Contratante</label>
                    <div className="flex gap-2">
                        <select 
                            className={INPUT_CLASS} 
                            value={formData.clientId || ''} 
                            onChange={e => {
                                const selectedClient = clients.find(c => c.id === e.target.value);
                                setFormData({
                                    ...formData, 
                                    clientId: e.target.value,
                                    contractorName: selectedClient ? selectedClient.name : ''
                                });
                            }}
                        >
                            <option value="">Selecione um Cliente Cadastrado...</option>
                            {clients.filter(c => c.active).map(c => (
                                <option key={c.id} value={c.id}>{c.name} {c.tradeName ? `(${c.tradeName})` : ''}</option>
                            ))}
                        </select>
                        <a href="#/registries" title="Cadastrar Novo Cliente" className="bg-slate-200 text-slate-600 p-2.5 rounded-lg hover:bg-slate-300 transition-colors flex items-center justify-center">
                            <PlusCircle size={20}/>
                        </a>
                    </div>
                    {/* Fallback for manual entry if no client selected (or legacy data) */}
                    {!formData.clientId && (
                        <input 
                            className={`${INPUT_CLASS} mt-2 bg-yellow-50 border-yellow-200 text-yellow-800 placeholder-yellow-400`} 
                            value={formData.contractorName || ''} 
                            onChange={e => setFormData({...formData, contractorName: e.target.value})} 
                            placeholder="Ou digite o nome manualmente (Não recomendado)" 
                        />
                    )}
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
                    
                    <div className="bg-slate-50 p-4 rounded-lg text-sm space-y-2 border border-slate-200">
                        <div className="flex justify-between text-slate-700 font-medium">
                            <span>(+) Contrato</span>
                            <span>{formatMoney(formData.contractValue || 0)}</span>
                        </div>
                        <div className="flex justify-between text-red-600 font-medium">
                            <span>(-) Despesas</span>
                            <span>{formatMoney((formData.expenses || []).reduce((a,b)=>a+b.amount,0))}</span>
                        </div>
                        <div className="flex justify-between font-extrabold border-t pt-2 text-green-800 text-lg">
                            <span>(=) Resultado</span>
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
  );
};
