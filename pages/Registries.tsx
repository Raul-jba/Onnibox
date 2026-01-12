
import React, { useState, useEffect, ReactNode } from 'react';
import { storage } from '../services/storageService';
import { Driver, Vehicle, Agency, Line, RouteDef, ExpenseType, CommissionRule, Client } from '../types';
import { GenericTableManager, Column } from '../components/GenericTableManager';
import { 
  Users, Truck, Map, CalendarClock, Building2, Receipt, Percent,
  User, MapPin, ArrowRight, Clock, Gauge, Briefcase, Building
} from 'lucide-react';

// Standard Input Classes
const INPUT_CLASS = "w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-semibold shadow-sm";
const LABEL_CLASS = "block mb-1 text-xs font-bold text-slate-500 uppercase";

// --- VALIDATION HELPERS ---
const isValidCPF = (cpf: string) => {
  if (!cpf) return false;
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
  let soma = 0; let resto;
  for (let i = 1; i <= 9; i++) soma = soma + parseInt(cpf.substring(i-1, i)) * (11 - i);
  resto = (soma * 10) % 11;
  if ((resto === 10) || (resto === 11)) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;
  soma = 0;
  for (let i = 1; i <= 10; i++) soma = soma + parseInt(cpf.substring(i-1, i)) * (12 - i);
  resto = (soma * 10) % 11;
  if ((resto === 10) || (resto === 11)) resto = 0;
  if (resto !== parseInt(cpf.substring(10, 11))) return false;
  return true;
};

const isValidPlate = (plate: string) => {
  if (!plate) return false;
  const clean = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const regex = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;
  return regex.test(clean);
};

// --- MAIN COMPONENT ---
export const Registries: React.FC = () => {
  const [activeTab, setActiveTab] = useState('clients'); // Default to Clients for this update context

  const tabs = [
    { id: 'clients', label: 'Clientes (Turismo)', icon: Briefcase },
    { id: 'drivers', label: 'Motoristas', icon: Users },
    { id: 'vehicles', label: 'Veículos', icon: Truck },
    { id: 'lines', label: 'Linhas', icon: Map },
    { id: 'schedules', label: 'Horários', icon: CalendarClock },
    { id: 'agencies', label: 'Agências', icon: Building2 },
    { id: 'expenses', label: 'Despesas', icon: Receipt },
    { id: 'commissions', label: 'Comissões', icon: Percent },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1 flex overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === 'clients' && <ClientsManager />}
        {activeTab === 'drivers' && <DriversManager />}
        {activeTab === 'vehicles' && <VehiclesManager />}
        {activeTab === 'lines' && <LinesManager />}
        {activeTab === 'schedules' && <SchedulesManager />}
        {activeTab === 'agencies' && <AgenciesManager />}
        {activeTab === 'expenses' && <ExpenseTypesManager />}
        {activeTab === 'commissions' && <CommissionsManager />}
      </div>
    </div>
  );
};

// --- SUB-MANAGERS ---

// 0. CLIENTS (NEW)
const ClientsManager = () => {
  const [items, setItems] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Client>>({});

  useEffect(() => setItems(storage.getClients()), []);

  const handleSave = () => {
    if (!formData.name) return alert("Nome/Razão Social obrigatório.");
    if (!formData.taxId) return alert("CPF/CNPJ obrigatório.");
    if (formData.type === 'PF' && !isValidCPF(formData.taxId)) return alert("CPF Inválido.");
    
    storage.saveClient({ ...formData, id: formData.id || Date.now().toString(), active: formData.active ?? true } as Client);
    setItems(storage.getClients());
    setIsModalOpen(false);
  };

  const columns: Column<Client>[] = [
    { header: "Cliente", render: (i) => <div><div className="font-bold">{i.name}</div><div className="text-xs text-slate-500 uppercase">{i.tradeName || i.type}</div></div> },
    { header: "Documento", render: (i) => <div><div className="font-mono text-xs font-bold">{i.taxId}</div><div className="text-[10px] text-slate-400">{i.identityDoc}</div></div> },
    { header: "Contato", render: (i) => <div><div className="font-bold text-xs">{i.phone}</div><div className="text-xs text-blue-600 underline">{i.email}</div></div> },
    { header: "Cidade", render: (i) => <span className="text-xs font-bold">{i.city}/{i.state}</span> }
  ];

  return (
    <GenericTableManager<Client>
      title="Clientes de Turismo"
      subtitle="Pessoas Físicas e Jurídicas"
      items={items}
      columns={columns}
      onNew={() => { setFormData({ active: true, type: 'PF' }); setIsModalOpen(true); }}
      onEdit={(i) => { setFormData(i); setIsModalOpen(true); }}
      onDelete={(i) => { if(confirm("Excluir cliente?")) { storage.deleteClient(i.id); setItems(storage.getClients()); } }}
      onToggleStatus={(i) => { storage.saveClient({...i, active: !i.active}); setItems(storage.getClients()); }}
      statusField="active"
      isModalOpen={isModalOpen}
      onCloseModal={() => setIsModalOpen(false)}
      onSave={handleSave}
      searchPlaceholder="Buscar por nome ou documento..."
      renderForm={() => (
        <div className="space-y-4">
            {/* Type Selector */}
            <div className="flex gap-4 border-b border-slate-200 pb-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="clientType" className="w-5 h-5 accent-blue-600" checked={formData.type === 'PF'} onChange={() => setFormData({...formData, type: 'PF'})} />
                    <span className="font-bold text-slate-700">Pessoa Física</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="clientType" className="w-5 h-5 accent-blue-600" checked={formData.type === 'PJ'} onChange={() => setFormData({...formData, type: 'PJ'})} />
                    <span className="font-bold text-slate-700">Pessoa Jurídica</span>
                </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className={LABEL_CLASS}>{formData.type === 'PJ' ? 'Razão Social *' : 'Nome Completo *'}</label>
                    <input className={INPUT_CLASS} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} autoFocus />
                </div>
                
                {formData.type === 'PJ' && (
                    <div className="md:col-span-2">
                        <label className={LABEL_CLASS}>Nome Fantasia</label>
                        <input className={INPUT_CLASS} value={formData.tradeName || ''} onChange={e => setFormData({...formData, tradeName: e.target.value})} />
                    </div>
                )}

                <div>
                    <label className={LABEL_CLASS}>{formData.type === 'PJ' ? 'CNPJ *' : 'CPF *'}</label>
                    <input className={INPUT_CLASS} value={formData.taxId || ''} onChange={e => setFormData({...formData, taxId: e.target.value})} />
                </div>

                <div>
                    <label className={LABEL_CLASS}>{formData.type === 'PJ' ? 'Inscrição Estadual' : 'RG'}</label>
                    <input className={INPUT_CLASS} value={formData.identityDoc || ''} onChange={e => setFormData({...formData, identityDoc: e.target.value})} />
                </div>

                <div><label className={LABEL_CLASS}>Telefone / Whatsapp *</label><input className={INPUT_CLASS} value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                <div><label className={LABEL_CLASS}>Email</label><input className={INPUT_CLASS} value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
            </div>

            <div className="pt-4 border-t border-slate-200">
                <h4 className="text-sm font-bold text-slate-500 mb-3 uppercase flex items-center gap-2"><MapPin size={16}/> Endereço</h4>
                <div className="grid grid-cols-4 gap-4">
                    <div><label className={LABEL_CLASS}>CEP</label><input className={INPUT_CLASS} value={formData.zipCode || ''} onChange={e => setFormData({...formData, zipCode: e.target.value})} /></div>
                    <div className="col-span-3"><label className={LABEL_CLASS}>Rua / Logradouro</label><input className={INPUT_CLASS} value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
                    <div><label className={LABEL_CLASS}>Número</label><input className={INPUT_CLASS} value={formData.number || ''} onChange={e => setFormData({...formData, number: e.target.value})} /></div>
                    <div><label className={LABEL_CLASS}>Bairro</label><input className={INPUT_CLASS} value={formData.neighborhood || ''} onChange={e => setFormData({...formData, neighborhood: e.target.value})} /></div>
                    <div><label className={LABEL_CLASS}>Cidade</label><input className={INPUT_CLASS} value={formData.city || ''} onChange={e => setFormData({...formData, city: e.target.value})} /></div>
                    <div><label className={LABEL_CLASS}>Estado (UF)</label><input className={INPUT_CLASS} value={formData.state || ''} onChange={e => setFormData({...formData, state: e.target.value})} maxLength={2} /></div>
                </div>
            </div>
        </div>
      )}
    />
  );
};

// 1. DRIVERS
const DriversManager = () => {
  const [items, setItems] = useState<Driver[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Driver>>({});

  useEffect(() => setItems(storage.getDrivers()), []);

  const handleSave = () => {
    if (!formData.name || formData.name.trim().length < 3) return alert("Nome é obrigatório.");
    if (formData.cpf && !isValidCPF(formData.cpf)) return alert("CPF Inválido.");
    
    storage.saveDriver({ ...formData, id: formData.id || Date.now().toString(), active: formData.active ?? true } as Driver);
    setItems(storage.getDrivers());
    setIsModalOpen(false);
  };

  const columns: Column<Driver>[] = [
    { header: "Motorista", render: (i) => <div><div className="font-bold">{i.name}</div><div className="text-xs text-slate-500">{i.cpf || 'Sem CPF'}</div></div> },
    { header: "Contato", render: (i) => i.phone || '-' },
    { header: "CNH", render: (i) => <span><span className="font-bold bg-slate-100 px-1 rounded">{i.cnhCategory}</span> {i.cnh}</span> }
  ];

  return (
    <GenericTableManager<Driver>
      title="Motoristas"
      items={items}
      columns={columns}
      onNew={() => { setFormData({ active: true }); setIsModalOpen(true); }}
      onEdit={(i) => { setFormData(i); setIsModalOpen(true); }}
      onDelete={(i) => { if(confirm("Excluir?")) { storage.deleteDriver(i.id); setItems(storage.getDrivers()); } }}
      onToggleStatus={(i) => { storage.saveDriver({...i, active: !i.active}); setItems(storage.getDrivers()); }}
      statusField="active"
      isModalOpen={isModalOpen}
      onCloseModal={() => setIsModalOpen(false)}
      onSave={handleSave}
      searchPlaceholder="Buscar motorista..."
      renderForm={() => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="md:col-span-2">
               <label className={LABEL_CLASS}>Nome Completo *</label>
               <input className={INPUT_CLASS} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} autoFocus />
             </div>
             <div><label className={LABEL_CLASS}>CPF</label><input className={INPUT_CLASS} value={formData.cpf || ''} onChange={e => setFormData({...formData, cpf: e.target.value})} /></div>
             <div><label className={LABEL_CLASS}>Celular</label><input className={INPUT_CLASS} value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
             <div><label className={LABEL_CLASS}>CNH</label><input className={INPUT_CLASS} value={formData.cnh || ''} onChange={e => setFormData({...formData, cnh: e.target.value})} /></div>
             <div>
               <label className={LABEL_CLASS}>Categoria</label>
               <select className={INPUT_CLASS} value={formData.cnhCategory || ''} onChange={e => setFormData({...formData, cnhCategory: e.target.value})}>
                 <option value="">Selecione...</option>
                 <option value="D">D</option><option value="E">E</option><option value="AD">AD</option><option value="AE">AE</option>
               </select>
             </div>
             <div><label className={LABEL_CLASS}>Admissão</label><input type="date" className={INPUT_CLASS} value={formData.admissionDate || ''} onChange={e => setFormData({...formData, admissionDate: e.target.value})} /></div>
        </div>
      )}
    />
  );
};

// 2. VEHICLES
const VehiclesManager = () => {
  const [items, setItems] = useState<Vehicle[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Vehicle>>({});

  useEffect(() => setItems(storage.getVehicles()), []);

  const handleSave = () => {
    if (!formData.plate || !isValidPlate(formData.plate)) return alert("Placa inválida.");
    if (!formData.description) return alert("Modelo obrigatório.");
    storage.saveVehicle({ ...formData, id: formData.id || Date.now().toString(), active: formData.active ?? true } as Vehicle);
    setItems(storage.getVehicles());
    setIsModalOpen(false);
  };

  const columns: Column<Vehicle>[] = [
    { header: "Veículo", render: (i) => <div><div className="font-bold">{i.plate}</div><div className="text-xs uppercase">{i.description}</div></div> },
    { header: "KM Inicial", render: (i) => i.initialMileage?.toLocaleString() || '-' },
    { header: "Capacidade", render: (i) => `${i.seats} Lugares` }
  ];

  return (
    <GenericTableManager<Vehicle>
      title="Veículos"
      items={items}
      columns={columns}
      onNew={() => { setFormData({ active: true }); setIsModalOpen(true); }}
      onEdit={(i) => { setFormData(i); setIsModalOpen(true); }}
      onDelete={(i) => { if(confirm("Excluir?")) { storage.deleteVehicle(i.id); setItems(storage.getVehicles()); } }}
      onToggleStatus={(i) => { storage.saveVehicle({...i, active: !i.active}); setItems(storage.getVehicles()); }}
      statusField="active"
      isModalOpen={isModalOpen}
      onCloseModal={() => setIsModalOpen(false)}
      onSave={handleSave}
      searchPlaceholder="Buscar por placa ou modelo..."
      renderForm={() => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div><label className={LABEL_CLASS}>Placa *</label><input className={INPUT_CLASS} value={formData.plate || ''} onChange={e => setFormData({...formData, plate: e.target.value.toUpperCase()})} autoFocus /></div>
             <div><label className={LABEL_CLASS}>Montadora</label><input className={INPUT_CLASS} value={formData.brand || ''} onChange={e => setFormData({...formData, brand: e.target.value})} /></div>
             <div className="md:col-span-2"><label className={LABEL_CLASS}>Modelo/Descrição *</label><input className={INPUT_CLASS} value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
             <div><label className={LABEL_CLASS}>Ano</label><input type="number" className={INPUT_CLASS} value={formData.year || ''} onChange={e => setFormData({...formData, year: Number(e.target.value)})} /></div>
             <div><label className={LABEL_CLASS}>Assentos</label><input type="number" className={INPUT_CLASS} value={formData.seats || ''} onChange={e => setFormData({...formData, seats: Number(e.target.value)})} /></div>
             <div className="md:col-span-2 bg-slate-50 p-3 rounded border border-slate-200">
                <label className={`${LABEL_CLASS} flex items-center gap-1`}><Gauge size={14}/> KM Atual (Odômetro)</label>
                <input type="number" className={INPUT_CLASS} value={formData.initialMileage || ''} onChange={e => setFormData({...formData, initialMileage: Number(e.target.value)})} placeholder="0" />
             </div>
        </div>
      )}
    />
  );
};

// 3. LINES
const LinesManager = () => {
  const [items, setItems] = useState<Line[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Line>>({});

  useEffect(() => setItems(storage.getLines()), []);

  const handleSave = () => {
    if (!formData.name) return alert("Nome é obrigatório.");
    storage.saveLine({ ...formData, id: formData.id || Date.now().toString(), active: formData.active ?? true } as Line);
    setItems(storage.getLines());
    setIsModalOpen(false);
  };

  return (
    <GenericTableManager<Line>
      title="Linhas"
      items={items}
      columns={[{ header: "Linha", render: (i) => <span className="font-bold">{i.name}</span> }]}
      onNew={() => { setFormData({ active: true }); setIsModalOpen(true); }}
      onEdit={(i) => { setFormData(i); setIsModalOpen(true); }}
      onDelete={(i) => { if(confirm("Excluir?")) { storage.deleteLine(i.id); setItems(storage.getLines()); } }}
      onToggleStatus={(i) => { storage.saveLine({...i, active: !i.active}); setItems(storage.getLines()); }}
      statusField="active"
      isModalOpen={isModalOpen}
      onCloseModal={() => setIsModalOpen(false)}
      onSave={handleSave}
      renderForm={() => (
        <div><label className={LABEL_CLASS}>Nome da Linha</label><input className={INPUT_CLASS} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} autoFocus /></div>
      )}
    />
  );
};

// 4. SCHEDULES
const SchedulesManager = () => {
  const [items, setItems] = useState<RouteDef[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [filterLine, setFilterLine] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<RouteDef>>({});

  useEffect(() => { setItems(storage.getRoutes()); setLines(storage.getLines()); }, []);

  const handleSave = () => {
    if (!formData.lineId || !formData.time || !formData.origin || !formData.destination) return alert("Preencha todos os campos.");
    storage.saveRoute({ ...formData, id: formData.id || Date.now().toString(), active: formData.active ?? true } as RouteDef);
    setItems(storage.getRoutes());
    setIsModalOpen(false);
  };

  const filteredItems = filterLine ? items.filter(i => i.lineId === filterLine) : items;

  return (
    <GenericTableManager<RouteDef>
      title="Horários"
      items={filteredItems}
      columns={[
        { header: "Linha", render: (i) => <span className="text-xs font-bold uppercase bg-slate-100 px-1 rounded">{lines.find(l => l.id === i.lineId)?.name}</span> },
        { header: "Horário", render: (i) => <div className="flex items-center gap-1 font-bold text-blue-700"><Clock size={14}/> {i.time}</div> },
        { header: "Itinerário", render: (i) => <div className="flex items-center gap-2 text-sm font-bold">{i.origin} <ArrowRight size={12}/> {i.destination}</div> }
      ]}
      filters={
        <div className="w-full"><label className={LABEL_CLASS}>Filtrar Linha</label>
        <select className={INPUT_CLASS} value={filterLine} onChange={e => setFilterLine(e.target.value)}>
          <option value="">Todas</option>{lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select></div>
      }
      onNew={() => { setFormData({ active: true, lineId: filterLine }); setIsModalOpen(true); }}
      onEdit={(i) => { setFormData(i); setIsModalOpen(true); }}
      onDelete={(i) => { if(confirm("Excluir?")) { storage.deleteRoute(i.id); setItems(storage.getRoutes()); } }}
      onToggleStatus={(i) => { storage.saveRoute({...i, active: !i.active}); setItems(storage.getRoutes()); }}
      statusField="active"
      isModalOpen={isModalOpen}
      onCloseModal={() => setIsModalOpen(false)}
      onSave={handleSave}
      renderForm={() => (
        <div className="space-y-4">
           <div><label className={LABEL_CLASS}>Linha</label>
           <select className={INPUT_CLASS} value={formData.lineId || ''} onChange={e => setFormData({...formData, lineId: e.target.value})}>
              <option value="">Selecione...</option>{lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
           </select></div>
           <div><label className={LABEL_CLASS}>Horário</label><input type="time" className={INPUT_CLASS} value={formData.time || ''} onChange={e => setFormData({...formData, time: e.target.value})} /></div>
           <div className="grid grid-cols-2 gap-4">
              <div><label className={LABEL_CLASS}>Origem</label><input className={INPUT_CLASS} value={formData.origin || ''} onChange={e => setFormData({...formData, origin: e.target.value})} /></div>
              <div><label className={LABEL_CLASS}>Destino</label><input className={INPUT_CLASS} value={formData.destination || ''} onChange={e => setFormData({...formData, destination: e.target.value})} /></div>
           </div>
        </div>
      )}
    />
  );
};

// 5. AGENCIES
const AgenciesManager = () => {
  const [items, setItems] = useState<Agency[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Agency>>({});

  useEffect(() => setItems(storage.getAgencies()), []);

  const handleSave = () => {
    if (!formData.name || !formData.city) return alert("Preencha Nome e Cidade.");
    storage.saveAgency({ ...formData, id: formData.id || Date.now().toString(), active: formData.active ?? true } as Agency);
    setItems(storage.getAgencies());
    setIsModalOpen(false);
  };

  return (
    <GenericTableManager<Agency>
      title="Agências"
      items={items}
      columns={[
        { header: "Nome", render: (i) => <span className="font-bold">{i.name}</span> },
        { header: "Local", render: (i) => <div><div className="font-bold text-xs flex items-center gap-1"><MapPin size={10}/> {i.city}</div><div className="text-[10px]">{i.address}</div></div> },
        { header: "Contato", render: (i) => <div className="text-xs">{i.managerName} - {i.phone}</div> }
      ]}
      onNew={() => { setFormData({ active: true }); setIsModalOpen(true); }}
      onEdit={(i) => { setFormData(i); setIsModalOpen(true); }}
      onDelete={(i) => { if(confirm("Excluir?")) { storage.deleteAgency(i.id); setItems(storage.getAgencies()); } }}
      onToggleStatus={(i) => { storage.saveAgency({...i, active: !i.active}); setItems(storage.getAgencies()); }}
      statusField="active"
      isModalOpen={isModalOpen}
      onCloseModal={() => setIsModalOpen(false)}
      onSave={handleSave}
      renderForm={() => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="md:col-span-2"><label className={LABEL_CLASS}>Nome</label><input className={INPUT_CLASS} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
           <div><label className={LABEL_CLASS}>Gerente</label><input className={INPUT_CLASS} value={formData.managerName || ''} onChange={e => setFormData({...formData, managerName: e.target.value})} /></div>
           <div><label className={LABEL_CLASS}>Telefone</label><input className={INPUT_CLASS} value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
           <div><label className={LABEL_CLASS}>Cidade</label><input className={INPUT_CLASS} value={formData.city || ''} onChange={e => setFormData({...formData, city: e.target.value})} /></div>
           <div><label className={LABEL_CLASS}>Email</label><input className={INPUT_CLASS} value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
           <div className="md:col-span-2"><label className={LABEL_CLASS}>Endereço</label><input className={INPUT_CLASS} value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
        </div>
      )}
    />
  );
};

// 6. EXPENSES
const ExpenseTypesManager = () => {
  const [items, setItems] = useState<ExpenseType[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<ExpenseType>>({});

  useEffect(() => setItems(storage.getExpenseTypes()), []);

  const handleSave = () => {
    if (!formData.name) return alert("Nome obrigatório.");
    storage.saveExpenseType({ ...formData, id: formData.id || Date.now().toString(), active: formData.active ?? true } as ExpenseType);
    setItems(storage.getExpenseTypes());
    setIsModalOpen(false);
  };

  return (
    <GenericTableManager<ExpenseType>
      title="Tipos de Despesa"
      items={items}
      columns={[{ header: "Descrição", render: (i) => <span className="font-bold">{i.name}</span> }]}
      onNew={() => { setFormData({ active: true }); setIsModalOpen(true); }}
      onEdit={(i) => { setFormData(i); setIsModalOpen(true); }}
      onDelete={(i) => { if(confirm("Excluir?")) { storage.deleteExpenseType(i.id); setItems(storage.getExpenseTypes()); } }}
      onToggleStatus={(i) => { storage.saveExpenseType({...i, active: !i.active}); setItems(storage.getExpenseTypes()); }}
      statusField="active"
      isModalOpen={isModalOpen}
      onCloseModal={() => setIsModalOpen(false)}
      onSave={handleSave}
      renderForm={() => (
        <div><label className={LABEL_CLASS}>Nome</label><input className={INPUT_CLASS} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} autoFocus /></div>
      )}
    />
  );
};

// 7. COMMISSIONS
const CommissionsManager = () => {
  const [items, setItems] = useState<CommissionRule[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<CommissionRule>>({});

  useEffect(() => {
    setItems(storage.getCommissions());
    setDrivers(storage.getDrivers());
    setAgencies(storage.getAgencies());
  }, []);

  const handleSave = () => {
    if (!formData.targetId) return alert("Selecione beneficiário.");
    if (!formData.percentage || formData.percentage <= 0) return alert("Porcentagem inválida.");
    storage.saveCommission({ ...formData, id: formData.id || Date.now().toString(), active: formData.active ?? true } as CommissionRule);
    setItems(storage.getCommissions());
    setIsModalOpen(false);
  };

  const getEntityName = (rule: CommissionRule) => {
    if (rule.targetType === 'DRIVER') return drivers.find(d => d.id === rule.targetId)?.name || 'Removido';
    return agencies.find(a => a.id === rule.targetId)?.name || 'Removida';
  };

  return (
    <GenericTableManager<CommissionRule>
      title="Comissões"
      items={items}
      columns={[
        { header: "Beneficiário", render: (i) => <div className="flex items-center gap-2"><div className={`p-1 rounded ${i.targetType === 'DRIVER' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>{i.targetType === 'DRIVER' ? <User size={14}/> : <Building2 size={14}/>}</div><div><div className="font-bold">{getEntityName(i)}</div><div className="text-[10px] uppercase">{i.targetType === 'DRIVER' ? 'Motorista' : 'Agência'}</div></div></div> },
        { header: "Porcentagem", render: (i) => <span className="font-bold text-green-700 bg-green-50 px-2 rounded border border-green-100">{i.percentage}%</span> }
      ]}
      onNew={() => { setFormData({ active: true, targetType: 'AGENCY' }); setIsModalOpen(true); }}
      onEdit={(i) => { setFormData(i); setIsModalOpen(true); }}
      onDelete={(i) => { if(confirm("Excluir?")) { storage.deleteCommission(i.id); setItems(storage.getCommissions()); } }}
      onToggleStatus={(i) => { storage.saveCommission({...i, active: !i.active}); setItems(storage.getCommissions()); }}
      statusField="active"
      isModalOpen={isModalOpen}
      onCloseModal={() => setIsModalOpen(false)}
      onSave={handleSave}
      renderForm={() => {
        const options = formData.targetType === 'DRIVER' ? drivers.filter(d => d.active) : agencies.filter(a => a.active);
        return (
          <div className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
                <div onClick={() => setFormData({...formData, targetType: 'AGENCY', targetId: ''})} className={`cursor-pointer border rounded p-3 text-center ${formData.targetType === 'AGENCY' ? 'bg-purple-50 border-purple-500' : 'bg-white'}`}>Agência</div>
                <div onClick={() => setFormData({...formData, targetType: 'DRIVER', targetId: ''})} className={`cursor-pointer border rounded p-3 text-center ${formData.targetType === 'DRIVER' ? 'bg-blue-50 border-blue-500' : 'bg-white'}`}>Motorista</div>
             </div>
             <div>
                <label className={LABEL_CLASS}>Beneficiário</label>
                <select className={INPUT_CLASS} value={formData.targetId || ''} onChange={e => setFormData({...formData, targetId: e.target.value})}>
                   <option value="">Selecione...</option>
                   {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
             </div>
             <div><label className={LABEL_CLASS}>Porcentagem %</label><input type="number" className={INPUT_CLASS} value={formData.percentage || ''} onChange={e => setFormData({...formData, percentage: Number(e.target.value)})} /></div>
          </div>
        );
      }}
    />
  );
};
