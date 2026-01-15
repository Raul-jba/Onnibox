
import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/Layout';
import { storage, getLocalDate, formatDateDisplay } from '../services/storageService';
import { FuelEntry, Vehicle } from '../types';
import { GenericTableManager, Column } from '../components/GenericTableManager';
import { DollarSign, Gauge, ArrowRight, Lock, Calendar, Truck, Droplets, CreditCard, FileText, CheckCircle2 } from 'lucide-react';
import { usePermission } from '../hooks/usePermission';

const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// --- STYLES (Standardized with Registries) ---
const INPUT_CLASS = "w-full bg-white border border-slate-300 text-slate-800 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-medium shadow-sm transition-all";
const LABEL_CLASS = "block mb-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide";
const SECTION_TITLE = "text-sm font-bold text-blue-900 border-b border-blue-100 pb-2 mb-4 mt-2 flex items-center gap-2";

interface EnrichedFuelEntry extends FuelEntry {
  vehiclePlate: string;
  vehicleDesc: string;
  pricePerLiter: number | null;
  previousMileage: number | null;
  distTraveled: number | null;
  kmPerLiter: number | null;
  costPerKm: number | null;
}

export const FuelPage: React.FC = () => {
  const { can } = usePermission();
  const [rawEntries, setRawEntries] = useState<FuelEntry[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Filters
  const [filterVehicle, setFilterVehicle] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: getLocalDate()
  });

  // Form State
  const [formData, setFormData] = useState<Partial<FuelEntry>>({
    date: getLocalDate(), paymentMethod: 'CARD', isFullTank: true
  });

  useEffect(() => { setRawEntries(storage.getFuelEntries()); setVehicles(storage.getVehicles()); }, []);

  // --- CALCULATION LOGIC ---
  const enrichedData = useMemo(() => {
    const sorted = [...rawEntries].sort((a, b) => {
      if (a.vehicleId !== b.vehicleId) return a.vehicleId.localeCompare(b.vehicleId);
      return a.date.localeCompare(b.date) || (a.mileage || 0) - (b.mileage || 0);
    });

    const processed: EnrichedFuelEntry[] = sorted.map((entry, idx) => {
      const vehicle = vehicles.find(v => v.id === entry.vehicleId);
      const pricePerLiter = (entry.liters && entry.amount) ? entry.amount / entry.liters : null;
      
      let previousMileage: number | null = null;
      if (idx > 0) {
        const prev = sorted[idx - 1];
        if (prev.vehicleId === entry.vehicleId && prev.mileage) previousMileage = prev.mileage;
      }
      if (previousMileage === null && vehicle?.initialMileage && entry.mileage > vehicle.initialMileage) {
          previousMileage = vehicle.initialMileage;
      }

      let distTraveled = null, kmPerLiter = null, costPerKm = null;
      if (previousMileage !== null && entry.mileage) {
          const dist = entry.mileage - previousMileage;
          if (dist > 0) {
            distTraveled = dist;
            if (entry.liters && entry.isFullTank !== false) {
              kmPerLiter = dist / entry.liters;
              costPerKm = entry.amount / dist;
            }
          }
      }

      return {
        ...entry,
        vehiclePlate: vehicle?.plate || '???',
        vehicleDesc: vehicle?.description || 'Desconhecido',
        pricePerLiter, previousMileage, distTraveled, kmPerLiter, costPerKm
      };
    });

    return processed.filter(e => {
      return (filterVehicle ? e.vehicleId === filterVehicle : true) && 
             (e.date >= dateRange.start && e.date <= dateRange.end);
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [rawEntries, vehicles, filterVehicle, dateRange]);

  const stats = useMemo(() => {
    const totalSpent = enrichedData.reduce((acc, curr) => acc + curr.amount, 0);
    const totalLiters = enrichedData.reduce((acc, curr) => acc + (curr.liters || 0), 0);
    const validEff = enrichedData.filter(e => e.kmPerLiter !== null);
    const avgKmPerLiter = validEff.length ? validEff.reduce((a, c) => a + (c.kmPerLiter || 0), 0) / validEff.length : 0;
    const validCost = enrichedData.filter(e => e.costPerKm !== null);
    const avgCostPerKm = validCost.length ? validCost.reduce((a, c) => a + (c.costPerKm || 0), 0) / validCost.length : 0;
    const avgPrice = totalLiters ? totalSpent / totalLiters : 0;
    return { totalSpent, totalLiters, avgKmPerLiter, avgPrice, avgCostPerKm };
  }, [enrichedData]);

  // Real-time Calculation for Form (Last Mileage)
  const formStats = useMemo(() => {
    if (!formData.vehicleId) return { lastKm: 0, distance: 0 };
    const vEntries = rawEntries.filter(e => e.vehicleId === formData.vehicleId && e.id !== formData.id)
       .sort((a, b) => b.date.localeCompare(a.date) || (b.mileage || 0) - (a.mileage || 0));
    let lastKm = vEntries.length > 0 ? vEntries[0].mileage : (vehicles.find(v => v.id === formData.vehicleId)?.initialMileage || 0);
    const distance = (formData.mileage || 0) > lastKm ? (formData.mileage || 0) - lastKm : 0;
    return { lastKm, distance };
  }, [formData.vehicleId, formData.mileage, rawEntries, vehicles]);

  // --- ACTIONS ---
  const handleSave = () => {
    if (!formData.date || isNaN(Date.parse(formData.date))) return alert("Data inválida.");
    if (storage.isDayClosed(formData.date)) return alert("Dia Fechado.");
    if(!formData.vehicleId || !formData.amount || !formData.liters || !formData.mileage) return alert("Preencha todos os campos.");
    if ((formData.mileage || 0) <= 0) return alert("Erro: O KM Atual deve ser maior que zero.");
    
    if (!formData.id && formStats.lastKm > 0 && (formData.mileage || 0) < formStats.lastKm) {
        if(!confirm(`ATENÇÃO: KM informado menor que o anterior (${formStats.lastKm}). Salvar mesmo assim?`)) return;
    }

    storage.saveFuel({ ...formData, id: formData.id || Date.now().toString(), amount: Number(formData.amount), liters: Number(formData.liters), mileage: Number(formData.mileage), paymentMethod: formData.paymentMethod as any } as FuelEntry);
    setIsModalOpen(false);
    setRawEntries(storage.getFuelEntries());
  };

  const columns: Column<EnrichedFuelEntry>[] = [
    { header: "Data", render: (i) => formatDateDisplay(i.date) },
    { header: "Veículo", render: (i) => <div><div className="font-bold text-slate-800">{i.vehiclePlate}</div><div className="text-xs uppercase text-slate-500 font-semibold">{i.vehicleDesc}</div></div> },
    { header: "KM", render: (i) => <span className="font-mono text-slate-600">{i.mileage?.toLocaleString()}</span> },
    { header: "Rodou", render: (i) => i.distTraveled ? <span className="flex items-center gap-1 font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 text-xs w-fit"><ArrowRight size={12}/> {i.distTraveled} km</span> : '-' },
    { header: "Litros", render: (i) => <span className="text-slate-700 font-medium">{i.liters?.toFixed(1)} {i.isFullTank === false && '*'}</span> },
    { header: "R$/L", render: (i) => <span className="text-slate-500 text-xs">{i.pricePerLiter?.toFixed(3)}</span> },
    { header: "Total", render: (i) => <span className="font-bold text-slate-800">{formatMoney(i.amount)}</span> },
    { header: "Km/L", render: (i) => i.kmPerLiter ? <span className={`font-bold ${i.kmPerLiter < 2.5 ? 'text-red-600' : 'text-emerald-600'}`}>{i.kmPerLiter.toFixed(2)}</span> : '-' },
    { header: "R$/Km", render: (i) => i.costPerKm ? <span className="text-xs font-bold text-slate-500">R$ {i.costPerKm.toFixed(2)}</span> : '-' },
  ];

  return (
    <GenericTableManager<EnrichedFuelEntry>
      title="Gestão de Combustível"
      subtitle="Controle de abastecimentos e eficiência"
      items={enrichedData}
      columns={columns}
      
      // Actions
      onNew={() => { setFormData({ date: getLocalDate(), paymentMethod: 'CARD', isFullTank: true }); setIsModalOpen(true); }}
      onEdit={(i) => { if (storage.isDayClosed(i.date)) return alert("Dia Fechado."); setFormData(i); setIsModalOpen(true); }}
      onDelete={can('delete_records') ? (i) => { if (storage.isDayClosed(i.date)) return alert("Dia Fechado."); if(confirm("Excluir?")) { storage.deleteFuel(i.id); setRawEntries(storage.getFuelEntries()); } } : undefined}
      
      // Row Extras
      renderRowActions={(i) => storage.isDayClosed(i.date) && <div title="Dia Fechado"><Lock size={16} className="text-slate-400"/></div>}
      
      // Modal
      isModalOpen={isModalOpen}
      onCloseModal={() => setIsModalOpen(false)}
      onSave={handleSave}
      modalTitle={formData.id ? "Editar Abastecimento" : "Lançar Abastecimento"}
      saveLabel="Salvar Registro"
      
      // Layout
      kpiContent={
        <>
           <Card className="p-4 border-l-4 border-blue-600 shadow-sm"><div><div className="text-xs font-bold uppercase text-slate-500">Total Gasto</div><div className="text-2xl font-bold text-slate-800">{formatMoney(stats.totalSpent)}</div></div></Card>
           <Card className="p-4 border-l-4 border-emerald-500 shadow-sm"><div><div className="text-xs font-bold uppercase text-slate-500">Km/L Médio</div><div className="text-2xl font-bold text-emerald-700">{stats.avgKmPerLiter.toFixed(2)}</div></div></Card>
           <Card className="p-4 border-l-4 border-amber-500 shadow-sm"><div><div className="text-xs font-bold uppercase text-slate-500">Custo por Km</div><div className="text-2xl font-bold text-amber-700">{formatMoney(stats.avgCostPerKm)}</div></div></Card>
           <Card className="p-4 border-l-4 border-indigo-500 shadow-sm"><div><div className="text-xs font-bold uppercase text-slate-500">Preço Médio Litro</div><div className="text-2xl font-bold text-indigo-700">R$ {stats.avgPrice.toFixed(3)}</div></div></Card>
        </>
      }
      
      filters={
        <>
            <div className="w-full"><label className={LABEL_CLASS}>Início</label><input type="date" className={INPUT_CLASS} value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} /></div>
            <div className="w-full"><label className={LABEL_CLASS}>Fim</label><input type="date" className={INPUT_CLASS} value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} /></div>
            <div className="w-full flex-1"><label className={LABEL_CLASS}>Veículo</label><select className={INPUT_CLASS} value={filterVehicle} onChange={e => setFilterVehicle(e.target.value)}><option value="">Todos</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} - {v.description}</option>)}</select></div>
        </>
      }
      
      renderForm={() => (
        <div className="space-y-6">
            {/* SECTION 1 */}
            <div>
                <h4 className={SECTION_TITLE}><Calendar size={16}/> Dados do Registro</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={LABEL_CLASS}>Data</label>
                        <input type="date" className={INPUT_CLASS} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>Veículo</label>
                        <select className={INPUT_CLASS} value={formData.vehicleId || ''} onChange={e => setFormData({...formData, vehicleId: e.target.value})} autoFocus>
                            <option value="">Selecione...</option>
                            {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} - {v.description}</option>)}
                        </select>
                    </div>
                </div>
            </div>
            
            {/* SECTION 2 */}
            <div>
                <h4 className={SECTION_TITLE}><Gauge size={16}/> Hodômetro & Quilometragem</h4>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">Último KM</div>
                        <div className="font-mono text-xl text-slate-600">{formStats.lastKm.toLocaleString()}</div>
                    </div>
                    <div className="border-x border-slate-200 px-2">
                        <div className="text-[10px] font-bold uppercase text-blue-600 mb-1">KM Atual (Bomba)</div>
                        <input 
                            type="number" 
                            className="w-full text-center bg-white border border-blue-200 rounded p-1 font-bold text-xl text-blue-800 focus:border-blue-500 outline-none shadow-inner" 
                            value={formData.mileage || ''} 
                            onChange={e => setFormData({...formData, mileage: Number(e.target.value)})} 
                            placeholder="0"
                        />
                    </div>
                    <div>
                        <div className="text-[10px] font-bold uppercase text-emerald-600 mb-1">Percorrido</div>
                        <div className="font-bold text-xl text-emerald-700 flex items-center justify-center gap-1">
                            <Truck size={16} />
                            {formStats.distance.toLocaleString()} <span className="text-xs">km</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 3 */}
            <div>
                <h4 className={SECTION_TITLE}><DollarSign size={16}/> Valores & Abastecimento</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className={LABEL_CLASS}>Valor Total R$</label>
                        <input type="number" step="0.01" className={`${INPUT_CLASS} text-lg`} value={formData.amount || ''} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} placeholder="0.00" />
                     </div>
                     <div>
                        <label className={LABEL_CLASS}>Litros</label>
                        <div className="relative">
                            <Droplets size={16} className="absolute left-3 top-3 text-slate-400"/>
                            <input type="number" step="0.1" className={`${INPUT_CLASS} pl-9`} value={formData.liters || ''} onChange={e => setFormData({...formData, liters: Number(e.target.value)})} placeholder="0.0" />
                        </div>
                     </div>
                     
                     <div>
                        <label className={LABEL_CLASS}>Forma de Pagamento</label>
                        <div className="relative">
                            <CreditCard size={16} className="absolute left-3 top-3 text-slate-400"/>
                            <select className={`${INPUT_CLASS} pl-9`} value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value as any})}>
                                <option value="CARD">Cartão da Empresa</option>
                                <option value="CASH">Dinheiro (Motorista)</option>
                                <option value="CREDIT">Conta Crédito (Posto)</option>
                            </select>
                        </div>
                     </div>
                     
                     <div className="flex items-end pb-3">
                         <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg border border-slate-200 hover:bg-slate-50 w-full transition-colors">
                            <div className={`w-5 h-5 rounded flex items-center justify-center border ${formData.isFullTank !== false ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}>
                                {formData.isFullTank !== false && <CheckCircle2 size={14} className="text-white"/>}
                            </div>
                            <input type="checkbox" className="hidden" checked={formData.isFullTank ?? true} onChange={e => setFormData({...formData, isFullTank: e.target.checked})} />
                            <span className="font-bold text-sm text-slate-700">Tanque Completo?</span>
                         </label>
                     </div>

                     <div className="md:col-span-2">
                        <label className={LABEL_CLASS}>Observações</label>
                        <div className="relative">
                            <FileText size={16} className="absolute left-3 top-3 text-slate-400"/>
                            <input className={`${INPUT_CLASS} pl-9`} value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Ex: Posto X, Bomba 2..." />
                        </div>
                     </div>
                </div>
            </div>
        </div>
      )}
    />
  );
};
