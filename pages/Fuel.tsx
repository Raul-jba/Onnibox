
import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/Layout';
import { storage, getLocalDate, formatDateDisplay } from '../services/storageService';
import { FuelEntry, Vehicle } from '../types';
import { GenericTableManager, Column } from '../components/GenericTableManager';
import { DollarSign, Gauge, Activity, Droplets, ArrowRight, Lock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// Standard Input Classes
const INPUT_CLASS = "w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-semibold shadow-sm";
const LABEL_CLASS = "block mb-1 text-xs font-bold text-slate-500 uppercase";

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
  const [rawEntries, setRawEntries] = useState<FuelEntry[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterVehicle, setFilterVehicle] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: getLocalDate()
  });
  const [formData, setFormData] = useState<Partial<FuelEntry>>({
    date: getLocalDate(), paymentMethod: 'CARD', isFullTank: true
  });

  useEffect(() => { setRawEntries(storage.getFuelEntries()); setVehicles(storage.getVehicles()); }, []);

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

  const chartData = useMemo(() => {
    if (!filterVehicle) return [];
    return [...enrichedData].reverse().map(e => ({
      date: e.date.split('-').slice(1).reverse().join('/'), 
      kmPerLiter: e.kmPerLiter ? Number(e.kmPerLiter.toFixed(2)) : null,
      pricePerLiter: e.pricePerLiter ? Number(e.pricePerLiter.toFixed(2)) : null
    })).filter(e => e.kmPerLiter !== null || e.pricePerLiter !== null);
  }, [enrichedData, filterVehicle]);

  const formStats = useMemo(() => {
    if (!formData.vehicleId) return { lastKm: 0, distance: 0 };
    const vEntries = rawEntries.filter(e => e.vehicleId === formData.vehicleId && e.id !== formData.id)
       .sort((a, b) => b.date.localeCompare(a.date) || (b.mileage || 0) - (a.mileage || 0));
    let lastKm = vEntries.length > 0 ? vEntries[0].mileage : (vehicles.find(v => v.id === formData.vehicleId)?.initialMileage || 0);
    const distance = (formData.mileage || 0) > lastKm ? (formData.mileage || 0) - lastKm : 0;
    return { lastKm, distance };
  }, [formData.vehicleId, formData.mileage, rawEntries, vehicles]);

  const handleSave = () => {
    if (!formData.date || isNaN(Date.parse(formData.date))) return alert("Data inválida.");
    if (storage.isDayClosed(formData.date)) return alert("Dia Fechado.");
    if(!formData.vehicleId || !formData.amount || !formData.liters || !formData.mileage) return alert("Preencha todos os campos.");
    if ((formData.mileage || 0) <= 0) return alert("Erro: O KM Atual deve ser maior que zero.");
    
    if (!formData.id && formStats.lastKm > 0 && (formData.mileage || 0) < formStats.lastKm) {
        if(!confirm(`ATENÇÃO: KM informado menor que o anterior. Salvar?`)) return;
    }

    storage.saveFuel({ ...formData, id: formData.id || Date.now().toString(), amount: Number(formData.amount), liters: Number(formData.liters), mileage: Number(formData.mileage), paymentMethod: formData.paymentMethod as any } as FuelEntry);
    setIsModalOpen(false);
    setRawEntries(storage.getFuelEntries());
  };

  const columns: Column<EnrichedFuelEntry>[] = [
    { header: "Data", render: (i) => formatDateDisplay(i.date) },
    { header: "Veículo", render: (i) => <div><div className="font-bold">{i.vehiclePlate}</div><div className="text-xs uppercase">{i.vehicleDesc}</div></div> },
    { header: "KM", render: (i) => i.mileage?.toLocaleString() },
    { header: "Rodou", render: (i) => i.distTraveled ? <span className="flex items-center gap-1 font-bold text-blue-700"><ArrowRight size={14}/> {i.distTraveled} km</span> : '-' },
    { header: "Litros", render: (i) => <span>{i.liters?.toFixed(1)} {i.isFullTank === false && '*'}</span> },
    { header: "R$/L", render: (i) => i.pricePerLiter?.toFixed(3) },
    { header: "Total", render: (i) => formatMoney(i.amount) },
    { header: "Km/L", render: (i) => i.kmPerLiter ? <span className={`font-bold ${i.kmPerLiter < 2 ? 'text-red-600' : 'text-green-600'}`}>{i.kmPerLiter.toFixed(2)}</span> : '-' },
    { header: "R$/Km", render: (i) => i.costPerKm ? `R$ ${i.costPerKm.toFixed(2)}` : '-' },
  ];

  return (
    <GenericTableManager<EnrichedFuelEntry>
      title="Gestão de Combustível"
      subtitle="Controle de abastecimentos e eficiência"
      items={enrichedData}
      columns={columns}
      onNew={() => { setFormData({ date: getLocalDate(), paymentMethod: 'CARD', isFullTank: true }); setIsModalOpen(true); }}
      onEdit={(i) => { if (storage.isDayClosed(i.date)) return alert("Dia Fechado."); setFormData(i); setIsModalOpen(true); }}
      onDelete={(i) => { if (storage.isDayClosed(i.date)) return alert("Dia Fechado."); if(confirm("Excluir?")) { storage.deleteFuel(i.id); setRawEntries(storage.getFuelEntries()); } }}
      isModalOpen={isModalOpen}
      onCloseModal={() => setIsModalOpen(false)}
      onSave={handleSave}
      renderRowActions={(i) => storage.isDayClosed(i.date) && <div title="Fechado"><Lock size={16} className="text-slate-400"/></div>}
      kpiContent={
        <>
           <Card className="p-4 border-l-4 border-blue-600 shadow-sm"><div><div className="text-xs font-bold uppercase text-slate-500">Total</div><div className="text-2xl font-bold text-slate-800">{formatMoney(stats.totalSpent)}</div></div></Card>
           <Card className="p-4 border-l-4 border-green-500 shadow-sm"><div><div className="text-xs font-bold uppercase text-slate-500">Km/L Médio</div><div className="text-2xl font-bold text-green-700">{stats.avgKmPerLiter.toFixed(2)}</div></div></Card>
           <Card className="p-4 border-l-4 border-amber-500 shadow-sm"><div><div className="text-xs font-bold uppercase text-slate-500">R$ / Km</div><div className="text-2xl font-bold text-amber-700">{stats.avgCostPerKm.toFixed(2)}</div></div></Card>
           <Card className="p-4 border-l-4 border-indigo-500 shadow-sm"><div><div className="text-xs font-bold uppercase text-slate-500">Preço Médio</div><div className="text-2xl font-bold text-indigo-700">R$ {stats.avgPrice.toFixed(3)}</div></div></Card>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div><label className={LABEL_CLASS}>Data</label><input type="date" className={INPUT_CLASS} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
            <div className="md:col-span-2"><label className={LABEL_CLASS}>Veículo</label><select className={INPUT_CLASS} value={formData.vehicleId || ''} onChange={e => setFormData({...formData, vehicleId: e.target.value})}><option value="">Selecione...</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.plate}</option>)}</select></div>
            
            <div className="md:col-span-3 bg-slate-50 p-4 rounded border border-slate-200 grid grid-cols-3 gap-4 text-center">
                <div><div className="text-xs font-bold uppercase text-slate-500">Último KM</div><div className="font-mono text-xl">{formStats.lastKm.toLocaleString()}</div></div>
                <div><div className="text-xs font-bold uppercase text-slate-500">KM Atual</div><input type="number" className="w-full text-center border-b-2 bg-transparent font-bold text-xl focus:border-blue-500 outline-none" value={formData.mileage || ''} onChange={e => setFormData({...formData, mileage: Number(e.target.value)})} placeholder="0"/></div>
                <div><div className="text-xs font-bold uppercase text-slate-500">Percorrido</div><div className="font-bold text-xl text-green-700">{formStats.distance.toLocaleString()} km</div></div>
            </div>

            <div><label className={LABEL_CLASS}>Valor R$</label><input type="number" step="0.01" className={INPUT_CLASS} value={formData.amount || ''} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} /></div>
            <div><label className={LABEL_CLASS}>Litros</label><input type="number" step="0.1" className={INPUT_CLASS} value={formData.liters || ''} onChange={e => setFormData({...formData, liters: Number(e.target.value)})} /></div>
            <div className="flex items-center gap-2 pt-6"><input type="checkbox" className="w-5 h-5 accent-blue-600 rounded" checked={formData.isFullTank ?? true} onChange={e => setFormData({...formData, isFullTank: e.target.checked})} /><label className="font-bold text-slate-700">Tanque Cheio?</label></div>
            <div><label className={LABEL_CLASS}>Pagamento</label><select className={INPUT_CLASS} value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value as any})}><option value="CARD">Cartão</option><option value="CASH">Dinheiro</option><option value="CREDIT">Crédito</option></select></div>
            <div className="md:col-span-2"><label className={LABEL_CLASS}>Obs</label><input className={INPUT_CLASS} value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} /></div>
        </div>
      )}
    />
  );
};
