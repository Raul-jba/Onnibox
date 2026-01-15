
import React, { useState, useEffect, useMemo } from 'react';
import { storage } from '../services/storageService';
import { Driver, Vehicle, Agency, Line, RouteDef, ExpenseType, CommissionRule, Client, Supplier } from '../types';
import { GenericTableManager, Column } from '../components/GenericTableManager';
import { GenericForm, FieldConfig } from '../components/GenericForm';
import { 
  Users, Truck, Map, CalendarClock, Building2, Receipt, Percent,
  User, MapPin, ArrowRight, Clock, Gauge, Briefcase, Store,
  Database, Download, Upload, AlertCircle, Phone, FileText
} from 'lucide-react';
import { Button, Card } from '../components/Layout';
import { usePermission } from '../hooks/usePermission';

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
  const [activeTab, setActiveTab] = useState('suppliers');
  const { can } = usePermission();

  const tabs = [
    { id: 'suppliers', label: 'Fornecedores', icon: Store, desc: 'Gestão de parceiros' },
    { id: 'drivers', label: 'Motoristas', icon: Users, desc: 'Condutores da frota' },
    { id: 'vehicles', label: 'Veículos', icon: Truck, desc: 'Frota e manutenção' },
    { id: 'agencies', label: 'Agências', icon: Building2, desc: 'Pontos de venda' },
    { id: 'clients', label: 'Clientes', icon: Briefcase, desc: 'Fretamento/Turismo' },
    { id: 'lines', label: 'Linhas', icon: Map, desc: 'Rotas operacionais' },
    { id: 'schedules', label: 'Horários', icon: CalendarClock, desc: 'Quadro de horários' },
    { id: 'expenses', label: 'Tipos Despesa', icon: Receipt, desc: 'Categorias financeiras' },
  ];

  if (can('edit_commissions')) {
      tabs.push({ id: 'commissions', label: 'Comissões', icon: Percent, desc: 'Regras de repasse' });
  }

  if (can('manage_system')) {
      tabs.push({ id: 'backup', label: 'Dados & Backup', icon: Database, desc: 'Segurança da informação' });
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Section */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800">Cadastros Gerais</h2>
        <p className="text-sm text-slate-500">Gerencie todas as entidades do sistema em um só lugar.</p>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2">
        <div className="flex overflow-x-auto gap-2 pb-2 md:pb-0 custom-scrollbar">
            {tabs.map(tab => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 min-w-[160px] md:min-w-0 rounded-lg transition-all border ${
                activeTab === tab.id 
                    ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                    : 'bg-white border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
            >
                <div className={`p-2 rounded-md ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>
                    <tab.icon size={18} />
                </div>
                <div className="text-left">
                    <div className="text-sm font-bold leading-none mb-1">{tab.label}</div>
                    <div className="text-[10px] opacity-70 font-medium whitespace-nowrap">{tab.desc}</div>
                </div>
            </button>
            ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === 'suppliers' && <SuppliersManager />}
        {activeTab === 'clients' && <ClientsManager />}
        {activeTab === 'drivers' && <DriversManager />}
        {activeTab === 'vehicles' && <VehiclesManager />}
        {activeTab === 'lines' && <LinesManager />}
        {activeTab === 'schedules' && <SchedulesManager />}
        {activeTab === 'agencies' && <AgenciesManager />}
        {activeTab === 'expenses' && <ExpenseTypesManager />}
        {activeTab === 'commissions' && <CommissionsManager />}
        {activeTab === 'backup' && <BackupManager />}
      </div>
    </div>
  );
};

// --- SUB-MANAGERS ---

// 0. SUPPLIERS
const SuppliersManager = () => {
  const [items, setItems] = useState<Supplier[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Supplier>>({});
  const { can } = usePermission();

  useEffect(() => setItems(storage.getSuppliers()), []);

  const fields: FieldConfig<Supplier>[] = [
      { name: 'name', label: 'Razão Social', gridCols: 8, required: true, autoFocus: true, section: 'Dados da Empresa' },
      { name: 'tradeName', label: 'Nome Fantasia', gridCols: 4, section: 'Dados da Empresa' },
      { name: 'taxId', label: 'CNPJ / CPF', gridCols: 6, required: true, placeholder: '00.000.000/0000-00', section: 'Dados da Empresa' },
      { name: 'category', label: 'Categoria', gridCols: 6, placeholder: 'Ex: Combustível, Peças', section: 'Dados da Empresa' },
      
      { name: 'phone', label: 'Telefone / Zap', gridCols: 6, section: 'Contato & Endereço' },
      { name: 'email', label: 'Email', gridCols: 6, section: 'Contato & Endereço' },
      { name: 'address', label: 'Endereço', gridCols: 8, section: 'Contato & Endereço' },
      { name: 'city', label: 'Cidade', gridCols: 4, section: 'Contato & Endereço' },
  ];

  const handleSave = () => {
    if (!formData.name) return alert("Razão Social é obrigatório.");
    if (!formData.taxId) return alert("CNPJ/CPF é obrigatório.");
    
    storage.saveSupplier({
        ...formData,
        name: formData.name?.trim(),
        tradeName: formData.tradeName?.trim(),
        taxId: formData.taxId?.trim(),
        category: formData.category?.trim(),
        email: formData.email?.trim(),
        active: formData.active ?? true
    } as Supplier);

    setItems(storage.getSuppliers());
    setIsModalOpen(false);
  };

  const columns: Column<Supplier>[] = [
    { header: "Fornecedor", render: (i) => (
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${i.active ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-400'}`}><Store size={20}/></div>
            <div>
                <div className={`font-bold ${i.active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{i.name}</div>
                <div className="text-xs text-slate-500">{i.tradeName}</div>
            </div>
        </div>
    )},
    { header: "Categoria", render: (i) => <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold border border-slate-200">{i.category || 'Geral'}</span> },
    { header: "Contato", render: (i) => <div className="text-sm"><div className="font-medium">{i.phone}</div><div className="text-xs text-blue-600">{i.email}</div></div> },
    { header: "Localização", render: (i) => <div className="text-xs font-medium text-slate-600 flex items-center gap-1"><MapPin size={12}/> {i.city || '-'}</div> }
  ];

  return (
    <GenericTableManager<Supplier>
      title="Fornecedores"
      subtitle="Cadastro de prestadores de serviço e peças"
      items={items}
      columns={columns}
      onNew={() => { setFormData({ active: true }); setIsModalOpen(true); }}
      onEdit={(i) => { setFormData(i); setIsModalOpen(true); }}
      onDelete={can('delete_records') ? (i) => { if(confirm(i.active ? "Desativar este fornecedor? (Os dados históricos serão mantidos)" : "Reativar fornecedor?")) { storage.deleteSupplier(i.id); setItems(storage.getSuppliers()); } } : undefined}
      onToggleStatus={can('delete_records') ? (i) => { storage.saveSupplier({...i, active: !i.active}); setItems(storage.getSuppliers()); } : undefined}
      statusField="active"
      isModalOpen={isModalOpen}
      onCloseModal={() => setIsModalOpen(false)}
      onSave={handleSave}
      searchPlaceholder="Buscar fornecedor..."
      renderForm={() => <GenericForm fields={fields} data={formData} onChange={setFormData} />}
    />
  );
};

// 1. CLIENTS
const ClientsManager = () => {
  const [items, setItems] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Client>>({});
  const { can } = usePermission();

  useEffect(() => setItems(storage.getClients()), []);

  // Dynamic Fields based on Type (PF/PJ)
  const fields = useMemo((): FieldConfig<Client>[] => {
      const isPJ = formData.type === 'PJ';
      return [
          { name: 'name', label: isPJ ? 'Razão Social' : 'Nome Completo', required: true, gridCols: isPJ ? 12 : 8, section: 'Dados de Identificação' },
          ...(isPJ ? [{ name: 'tradeName', label: 'Nome Fantasia', gridCols: 12, section: 'Dados de Identificação' } as FieldConfig<Client>] : []),
          { name: 'taxId', label: isPJ ? 'CNPJ' : 'CPF', required: true, gridCols: isPJ ? 6 : 4, placeholder: isPJ ? '00.000.000/0001-00' : '000.000.000-00', section: 'Dados de Identificação' },
          { name: 'identityDoc', label: isPJ ? 'Inscrição Estadual' : 'RG', gridCols: 6, section: 'Dados de Identificação' },
          
          { name: 'phone', label: 'Telefone / WhatsApp', required: true, gridCols: 6, section: 'Contato' },
          { name: 'email', label: 'Email', gridCols: 6, section: 'Contato' },

          { name: 'zipCode', label: 'CEP', gridCols: 3, section: 'Endereço' },
          { name: 'city', label: 'Cidade', gridCols: 6, section: 'Endereço' },
          { name: 'state', label: 'UF', gridCols: 3, uppercase: true, section: 'Endereço' },
          { name: 'address', label: 'Logradouro (Rua/Av)', gridCols: 10, section: 'Endereço' },
          { name: 'number', label: 'Número', gridCols: 2, section: 'Endereço' },
          { name: 'neighborhood', label: 'Bairro', gridCols: 12, section: 'Endereço' },
      ];
  }, [formData.type]);

  const handleSave = () => {
    if (!formData.name) return alert("Nome é obrigatório.");
    if (!formData.taxId) return alert("Documento é obrigatório.");
    
    storage.saveClient({
        ...formData,
        name: formData.name?.trim(),
        tradeName: formData.tradeName?.trim(),
        taxId: formData.taxId?.trim(),
        email: formData.email?.trim(),
        city: formData.city?.trim(),
        active: formData.active ?? true
    } as Client);

    setItems(storage.getClients());
    setIsModalOpen(false);
  };

  const columns: Column<Client>[] = [
    { header: "Cliente", render: (i) => (
        <div className={i.active ? '' : 'opacity-50'}>
            <div className={`font-bold ${i.active ? 'text-slate-800' : 'text-slate-500 line-through'}`}>{i.name}</div>
            <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${i.type === 'PJ' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{i.type}</span>
                <span className="text-xs text-slate-500 font-mono">{i.taxId}</span>
            </div>
        </div>
    )},
    { header: "Local", render: (i) => <div className="text-sm font-medium">{i.city}/{i.state}</div> },
    { header: "Contato", render: (i) => <div className="text-sm">{i.phone}</div> }
  ];

  return (
    <GenericTableManager<Client>
      title="Clientes"
      subtitle="Cadastro de clientes para turismo e fretamento"
      items={items}
      columns={columns}
      onNew={() => { setFormData({ active: true, type: 'PF' }); setIsModalOpen(true); }}
      onEdit={(i) => { setFormData(i); setIsModalOpen(true); }}
      onDelete={can('delete_records') ? (i) => { if(confirm(i.active ? "Desativar este cliente? (Histórico mantido)" : "Reativar cliente?")) { storage.deleteClient(i.id); setItems(storage.getClients()); } } : undefined}
      onToggleStatus={can('delete_records') ? (i) => { storage.saveClient({...i, active: !i.active}); setItems(storage.getClients()); } : undefined}
      statusField="active"
      isModalOpen={isModalOpen}
      onCloseModal={() => setIsModalOpen(false)}
      onSave={handleSave}
      searchPlaceholder="Buscar cliente..."
      renderForm={() => (
        <div className="space-y-4">
             {/* Visual Toggle for PF/PJ */}
             <div className="grid grid-cols-2 gap-4 p-1 bg-slate-100 rounded-lg border border-slate-200">
                <button
                    type="button"
                    onClick={() => setFormData({...formData, type: 'PF'})}
                    className={`py-2.5 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 ${formData.type === 'PF' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <User size={16}/> Pessoa Física
                </button>
                <button
                    type="button"
                    onClick={() => setFormData({...formData, type: 'PJ'})}
                    className={`py-2.5 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 ${formData.type === 'PJ' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Store size={16}/> Pessoa Jurídica
                </button>
            </div>
            <GenericForm fields={fields} data={formData} onChange={setFormData} />
        </div>
      )}
    />
  );
};

// 2. DRIVERS
const DriversManager = () => {
  const [items, setItems] = useState<Driver[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Driver>>({});
  const { can } = usePermission();

  useEffect(() => setItems(storage.getDrivers()), []);

  const fields: FieldConfig<Driver>[] = [
      { name: 'name', label: 'Nome Completo', required: true, gridCols: 8, section: 'Dados Pessoais', autoFocus: true },
      { name: 'cpf', label: 'CPF', gridCols: 4, section: 'Dados Pessoais' },
      { name: 'phone', label: 'Telefone / Celular', gridCols: 6, section: 'Dados Pessoais' },
      
      { name: 'cnh', label: 'Número CNH', gridCols: 6, section: 'Habilitação & Contrato' },
      { name: 'cnhCategory', label: 'Categoria', type: 'select', gridCols: 3, options: [{value: 'B', label:'B'}, {value:'C', label:'C'}, {value:'D', label:'D'}, {value:'E', label:'E'}, {value:'AD', label:'AD'}, {value:'AE', label:'AE'}], section: 'Habilitação & Contrato' },
      { name: 'admissionDate', label: 'Data de Admissão', type: 'date', gridCols: 3, section: 'Habilitação & Contrato' },
  ];

  const handleSave = () => {
    if (!formData.name || formData.name.trim().length < 3) return alert("Nome é obrigatório.");
    if (formData.cpf && !isValidCPF(formData.cpf)) return alert("CPF Inválido.");
    
    storage.saveDriver({
        ...formData,
        name: formData.name?.trim(),
        cpf: formData.cpf?.trim(),
        cnh: formData.cnh?.trim(),
        active: formData.active ?? true
    } as Driver);

    setItems(storage.getDrivers());
    setIsModalOpen(false);
  };

  const columns: Column<Driver>[] = [
    { header: "Motorista", render: (i) => (
        <div className="flex items-center gap-3">
             <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border ${i.active ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-red-50 text-red-300 border-red-100'}`}>
                {i.name.substring(0,2).toUpperCase()}
             </div>
             <div>
                 <div className={`font-bold ${i.active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{i.name}</div>
                 <div className="text-xs text-slate-500 font-mono">{i.cpf || 'Sem CPF'}</div>
             </div>
        </div>
    )},
    { header: "CNH", render: (i) => (
        <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold text-xs border border-blue-200">{i.cnhCategory}</span>
            <span className="text-sm font-medium">{i.cnh}</span>
        </div>
    )},
    { header: "Contato", render: (i) => <span className="font-medium text-slate-600">{i.phone}</span> },
  ];

  return (
    <GenericTableManager<Driver>
      title="Motoristas"
      subtitle="Quadro de condutores"
      items={items}
      columns={columns}
      onNew={() => { setFormData({ active: true }); setIsModalOpen(true); }}
      onEdit={(i) => { setFormData(i); setIsModalOpen(true); }}
      onDelete={can('delete_records') ? (i) => { if(confirm(i.active ? "Desativar motorista? (Histórico mantido)" : "Reativar motorista?")) { storage.deleteDriver(i.id); setItems(storage.getDrivers()); } } : undefined}
      onToggleStatus={can('delete_records') ? (i) => { storage.saveDriver({...i, active: !i.active}); setItems(storage.getDrivers()); } : undefined}
      statusField="active"
      isModalOpen={isModalOpen}
      onCloseModal={() => setIsModalOpen(false)}
      onSave={handleSave}
      searchPlaceholder="Buscar motorista..."
      renderForm={() => <GenericForm fields={fields} data={formData} onChange={setFormData} />}
    />
  );
};

// 3. VEHICLES
const VehiclesManager = () => {
  const [items, setItems] = useState<Vehicle[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Vehicle>>({});
  const { can } = usePermission();

  useEffect(() => setItems(storage.getVehicles()), []);

  const fields: FieldConfig<Vehicle>[] = [
    { name: 'plate', label: 'Placa', required: true, uppercase: true, placeholder: 'ABC-1234', gridCols: 4, section: 'Identificação' },
    { name: 'brand', label: 'Marca/Fabricante', placeholder: 'Ex: Marcopolo', gridCols: 8, section: 'Identificação' },
    { name: 'description', label: 'Modelo / Descrição', required: true, placeholder: 'Ex: Paradiso 1200 G7', gridCols: 12, section: 'Identificação' },
    
    { name: 'year', label: 'Ano Fab.', type: 'number', gridCols: 4, section: 'Técnico' },
    { name: 'seats', label: 'Capacidade (Lugares)', type: 'number', gridCols: 4, section: 'Técnico' },
    { name: 'initialMileage', label: 'KM Atual (Hodômetro)', type: 'number', gridCols: 4, section: 'Técnico' },
  ];

  const handleSave = () => {
    // Specific Validation
    if (!formData.plate || !isValidPlate(formData.plate)) return alert("Placa inválida (Ex: ABC-1234).");
    if (!formData.description) return alert("Descrição do veículo é obrigatória.");

    storage.saveVehicle({
        ...formData,
        plate: formData.plate?.trim(),
        brand: formData.brand?.trim(),
        description: formData.description?.trim(),
        active: formData.active ?? true
    } as Vehicle);

    setItems(storage.getVehicles());
    setIsModalOpen(false);
  };

  const columns: Column<Vehicle>[] = [
    { header: "Veículo", render: (i) => (
        <div className="flex items-center gap-3">
             <div className={`p-2 rounded ${i.active ? 'bg-slate-100 text-slate-600' : 'bg-red-50 text-red-300'}`}><Truck size={24}/></div>
             <div>
                <div className={`font-extrabold text-lg leading-none ${i.active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{i.plate}</div>
                <div className="text-xs text-slate-500 uppercase font-medium mt-1">{i.brand} - {i.description}</div>
             </div>
        </div>
    )},
    { header: "Capacidade", render: (i) => <span className="font-bold text-slate-600">{i.seats} Lugares</span>, align: 'center' },
    { header: "Hodômetro Atual", render: (i) => (
        <div className="flex items-center gap-1 font-mono text-sm text-slate-700">
            <Gauge size={14} className="text-slate-400"/> {i.initialMileage?.toLocaleString()} km
        </div>
    )},
    { header: "Ano", render: (i) => i.year || '-', align: 'center'}
  ];

  return (
    <GenericTableManager<Vehicle>
      title="Veículos"
      subtitle="Gestão da frota"
      items={items}
      columns={columns}
      onNew={() => { setFormData({ active: true }); setIsModalOpen(true); }}
      onEdit={(i) => { setFormData(i); setIsModalOpen(true); }}
      onDelete={can('delete_records') ? (i) => { if(confirm(i.active ? "Desativar veículo? (Histórico mantido)" : "Reativar veículo?")) { storage.deleteVehicle(i.id); setItems(storage.getVehicles()); } } : undefined}
      onToggleStatus={can('delete_records') ? (i) => { storage.saveVehicle({...i, active: !i.active}); setItems(storage.getVehicles()); } : undefined}
      statusField="active"
      isModalOpen={isModalOpen}
      onCloseModal={() => setIsModalOpen(false)}
      onSave={handleSave}
      searchPlaceholder="Buscar placa..."
      renderForm={() => <GenericForm fields={fields} data={formData} onChange={setFormData} />}
    />
  );
};

// 4. LINES
const LinesManager = () => {
  const [items, setItems] = useState<Line[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Line>>({});
  const { can } = usePermission();

  useEffect(() => setItems(storage.getLines()), []);

  const handleSave = () => {
    if (!formData.name) return alert("Nome é obrigatório.");
    storage.saveLine({ ...formData, name: formData.name.trim(), active: formData.active ?? true } as Line);
    setItems(storage.getLines());
    setIsModalOpen(false);
  };

  const fields: FieldConfig<Line>[] = [
      { name: 'name', label: 'Nome da Linha', required: true, autoFocus: true, placeholder: 'Ex: São Paulo x Rio de Janeiro' }
  ];

  return (
    <GenericTableManager<Line>
      title="Linhas"
      subtitle="Definição de trajetos operacionais"
      items={items}
      columns={[{ header: "Descrição da Linha", render: (i) => <span className={`font-bold text-lg ${i.active ? 'text-slate-700' : 'text-slate-400 line-through'}`}>{i.name}</span> }]}
      onNew={() => { setFormData({ active: true }); setIsModalOpen(true); }}
      onEdit={(i) => { setFormData(i); setIsModalOpen(true); }}
      onDelete={can('delete_records') ? (i) => { if(confirm(i.active ? "Desativar linha? (Histórico mantido)" : "Reativar linha?")) { storage.deleteLine(i.id); setItems(storage.getLines()); } } : undefined}
      onToggleStatus={can('delete_records') ? (i) => { storage.saveLine({...i, active: !i.active}); setItems(storage.getLines()); } : undefined}
      statusField="active"
      isModalOpen={isModalOpen}
      onCloseModal={() => setIsModalOpen(false)}
      onSave={handleSave}
      renderForm={() => <GenericForm fields={fields} data={formData} onChange={setFormData} />}
    />
  );
};

// 5. SCHEDULES
const SchedulesManager = () => {
  const [items, setItems] = useState<RouteDef[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [filterLine, setFilterLine] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<RouteDef>>({});
  const { can } = usePermission();

  useEffect(() => { setItems(storage.getRoutes()); setLines(storage.getLines()); }, []);

  const fields: FieldConfig<RouteDef>[] = [
      { name: 'lineId', label: 'Linha Vinculada', type: 'select', required: true, options: lines.map(l => ({value: l.id, label: l.name})), gridCols: 12 },
      { name: 'time', label: 'Horário', type: 'time', required: true, gridCols: 6 },
      { name: 'origin', label: 'Cidade Origem', gridCols: 6, required: true },
      { name: 'destination', label: 'Cidade Destino', gridCols: 6, required: true },
  ];

  const handleSave = () => {
    if (!formData.lineId || !formData.time || !formData.origin || !formData.destination) return alert("Preencha todos os campos.");
    storage.saveRoute({ 
        ...formData, 
        origin: formData.origin?.trim(),
        destination: formData.destination?.trim(),
        active: formData.active ?? true 
    } as RouteDef);
    setItems(storage.getRoutes());
    setIsModalOpen(false);
  };

  const filteredItems = filterLine ? items.filter(i => i.lineId === filterLine) : items;

  return (
    <GenericTableManager<RouteDef>
      title="Quadro de Horários"
      subtitle="Itinerários e horários de partida"
      items={filteredItems}
      columns={[
        { header: "Linha", render: (i) => <span className="text-xs font-bold uppercase bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">{lines.find(l => l.id === i.lineId)?.name || 'Linha Excluída'}</span> },
        { header: "Horário", render: (i) => <div className="flex items-center gap-2 font-extrabold text-blue-700 bg-blue-50 px-3 py-1 rounded-full w-fit"><Clock size={16}/> {i.time}</div> },
        { header: "Itinerário", render: (i) => (
            <div className={`flex items-center gap-3 text-sm font-bold ${i.active ? 'text-slate-700' : 'text-slate-400 line-through'}`}>
                <span>{i.origin}</span> 
                <ArrowRight size={14} className="text-slate-400"/> 
                <span>{i.destination}</span>
            </div>
        )}
      ]}
      filters={
        <div className="w-full max-w-xs">
            <label className="block mb-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide">Filtrar por Linha</label>
            <select className="w-full bg-white border border-slate-300 text-slate-800 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-medium shadow-sm transition-all" value={filterLine} onChange={e => setFilterLine(e.target.value)}>
            <option value="">Todas as linhas</option>{lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
        </div>
      }
      onNew={() => { setFormData({ active: true, lineId: filterLine }); setIsModalOpen(true); }}
      onEdit={(i) => { setFormData(i); setIsModalOpen(true); }}
      onDelete={can('delete_records') ? (i) => { if(confirm(i.active ? "Desativar horário? (Histórico mantido)" : "Reativar horário?")) { storage.deleteRoute(i.id); setItems(storage.getRoutes()); } } : undefined}
      onToggleStatus={can('delete_records') ? (i) => { storage.saveRoute({...i, active: !i.active}); setItems(storage.getRoutes()); } : undefined}
      statusField="active"
      isModalOpen={isModalOpen}
      onCloseModal={() => setIsModalOpen(false)}
      onSave={handleSave}
      renderForm={() => <GenericForm fields={fields} data={formData} onChange={setFormData} />}
    />
  );
};

// 6. AGENCIES
const AgenciesManager = () => {
  const [items, setItems] = useState<Agency[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Agency>>({});
  const { can } = usePermission();

  useEffect(() => setItems(storage.getAgencies()), []);

  const fields: FieldConfig<Agency>[] = [
      { name: 'name', label: 'Nome da Agência', required: true, gridCols: 8, section: 'Dados da Agência', placeholder: 'Ex: Rodoviária Tietê - Box 10' },
      { name: 'city', label: 'Cidade', required: true, gridCols: 4, section: 'Dados da Agência' },
      { name: 'address', label: 'Endereço Completo', gridCols: 12, section: 'Dados da Agência' },
      
      { name: 'managerName', label: 'Nome Gerente', gridCols: 6, section: 'Contato do Responsável' },
      { name: 'phone', label: 'Telefone', gridCols: 6, section: 'Contato do Responsável' },
      { name: 'email', label: 'Email', gridCols: 12, section: 'Contato do Responsável' },
  ];

  const handleSave = () => {
    if (!formData.name || !formData.city) return alert("Preencha Nome e Cidade.");
    storage.saveAgency({ 
        ...formData, 
        name: formData.name.trim(),
        city: formData.city.trim(),
        address: formData.address?.trim(),
        managerName: formData.managerName?.trim(),
        active: formData.active ?? true 
    } as Agency);
    setItems(storage.getAgencies());
    setIsModalOpen(false);
  };

  const columns: Column<Agency>[] = [
    { header: "Agência", render: (i) => (
        <div className={`font-bold text-lg ${i.active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{i.name}</div>
    )},
    { header: "Localização", render: (i) => (
        <div>
            <div className="flex items-center gap-1 font-bold text-sm text-slate-700"><MapPin size={14} className="text-red-500"/> {i.city}</div>
            <div className="text-xs text-slate-500 ml-5">{i.address || 'Sem endereço'}</div>
        </div>
    )},
    { header: "Responsável", render: (i) => (
        <div className="text-sm">
            <div className="font-medium">{i.managerName}</div>
            <div className="text-xs text-slate-500">{i.phone}</div>
        </div>
    )}
  ];

  return (
    <GenericTableManager<Agency>
      title="Agências"
      subtitle="Pontos de venda e rodoviárias"
      items={items}
      columns={columns}
      onNew={() => { setFormData({ active: true }); setIsModalOpen(true); }}
      onEdit={(i) => { setFormData(i); setIsModalOpen(true); }}
      onDelete={can('delete_records') ? (i) => { if(confirm(i.active ? "Desativar agência? (Histórico mantido)" : "Reativar agência?")) { storage.deleteAgency(i.id); setItems(storage.getAgencies()); } } : undefined}
      onToggleStatus={can('delete_records') ? (i) => { storage.saveAgency({...i, active: !i.active}); setItems(storage.getAgencies()); } : undefined}
      statusField="active"
      isModalOpen={isModalOpen}
      onCloseModal={() => setIsModalOpen(false)}
      onSave={handleSave}
      renderForm={() => <GenericForm fields={fields} data={formData} onChange={setFormData} />}
    />
  );
};

// 7. EXPENSES
const ExpenseTypesManager = () => {
  const [items, setItems] = useState<ExpenseType[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<ExpenseType>>({});
  const { can } = usePermission();

  useEffect(() => setItems(storage.getExpenseTypes()), []);

  const handleSave = () => {
    if (!formData.name) return alert("Nome obrigatório.");
    storage.saveExpenseType({ 
        ...formData, 
        name: formData.name.trim(),
        active: formData.active ?? true 
    } as ExpenseType);
    setItems(storage.getExpenseTypes());
    setIsModalOpen(false);
  };

  const fields: FieldConfig<ExpenseType>[] = [
      { name: 'name', label: 'Nome da Categoria', required: true, autoFocus: true, placeholder: 'Ex: Combustível, Alimentação, Peças' }
  ];

  return (
    <GenericTableManager<ExpenseType>
      title="Tipos de Despesa"
      subtitle="Categorização para o fluxo de caixa"
      items={items}
      columns={[{ header: "Descrição da Categoria", render: (i) => <span className={`font-bold ${i.active ? 'text-slate-700' : 'text-slate-400 line-through'}`}>{i.name}</span> }]}
      onNew={() => { setFormData({ active: true }); setIsModalOpen(true); }}
      onEdit={(i) => { setFormData(i); setIsModalOpen(true); }}
      onDelete={can('delete_records') ? (i) => { if(confirm(i.active ? "Desativar categoria? (Histórico mantido)" : "Reativar categoria?")) { storage.deleteExpenseType(i.id); setItems(storage.getExpenseTypes()); } } : undefined}
      onToggleStatus={can('delete_records') ? (i) => { storage.saveExpenseType({...i, active: !i.active}); setItems(storage.getExpenseTypes()); } : undefined}
      statusField="active"
      isModalOpen={isModalOpen}
      onCloseModal={() => setIsModalOpen(false)}
      onSave={handleSave}
      renderForm={() => <GenericForm fields={fields} data={formData} onChange={setFormData} />}
    />
  );
};

// 8. COMMISSIONS
const CommissionsManager = () => {
  const [items, setItems] = useState<CommissionRule[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<CommissionRule>>({});
  const { can } = usePermission();

  useEffect(() => {
    setItems(storage.getCommissions());
    setDrivers(storage.getDrivers());
    setAgencies(storage.getAgencies());
  }, []);

  const handleSave = () => {
    if (!formData.targetId) return alert("Selecione beneficiário.");
    if (!formData.percentage || formData.percentage <= 0) return alert("Porcentagem inválida.");
    storage.saveCommission({ ...formData, active: formData.active ?? true } as CommissionRule);
    setItems(storage.getCommissions());
    setIsModalOpen(false);
  };

  const getEntityName = (rule: CommissionRule) => {
    if (rule.targetType === 'DRIVER') return drivers.find(d => d.id === rule.targetId)?.name || 'Removido';
    return agencies.find(a => a.id === rule.targetId)?.name || 'Removida';
  };

  // We only use GenericForm for the inputs, the Type Selection Cards remain custom logic in renderForm
  const fields: FieldConfig<CommissionRule>[] = [
      { name: 'targetId', label: 'Selecione o Beneficiário', type: 'select', required: true, gridCols: 8, options: (formData.targetType === 'DRIVER' ? drivers : agencies).filter(x => x.active).map(x => ({value: x.id, label: x.name})) },
      { name: 'percentage', label: 'Porcentagem (%)', type: 'number', required: true, gridCols: 4, placeholder: 'Ex: 10' }
  ];

  return (
    <GenericTableManager<CommissionRule>
      title="Regras de Comissão"
      subtitle="Configuração de repasses automáticos"
      items={items}
      columns={[
        { header: "Beneficiário", render: (i) => <div className="flex items-center gap-2"><div className={`p-1.5 rounded-lg ${i.targetType === 'DRIVER' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>{i.targetType === 'DRIVER' ? <User size={16}/> : <Building2 size={16}/>}</div><div><div className={`font-bold ${i.active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{getEntityName(i)}</div><div className="text-[10px] uppercase font-bold text-slate-400">{i.targetType === 'DRIVER' ? 'Motorista' : 'Agência'}</div></div></div> },
        { header: "Porcentagem", render: (i) => <span className="font-bold text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200">{i.percentage}%</span>, align: 'center' }
      ]}
      onNew={() => { setFormData({ active: true, targetType: 'AGENCY' }); setIsModalOpen(true); }}
      onEdit={(i) => { setFormData(i); setIsModalOpen(true); }}
      onDelete={can('delete_records') ? (i) => { if(confirm(i.active ? "Desativar regra? (Histórico mantido)" : "Reativar regra?")) { storage.deleteCommission(i.id); setItems(storage.getCommissions()); } } : undefined}
      onToggleStatus={can('delete_records') ? (i) => { storage.saveCommission({...i, active: !i.active}); setItems(storage.getCommissions()); } : undefined}
      statusField="active"
      isModalOpen={isModalOpen}
      onCloseModal={() => setIsModalOpen(false)}
      onSave={handleSave}
      renderForm={() => (
          <div className="space-y-6">
             <div className="grid grid-cols-2 gap-4">
                <div onClick={() => setFormData({...formData, targetType: 'AGENCY', targetId: ''})} className={`cursor-pointer border-2 rounded-xl p-4 text-center transition-all ${formData.targetType === 'AGENCY' ? 'bg-purple-50 border-purple-500 text-purple-700' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                    <Building2 size={24} className="mx-auto mb-2"/>
                    <span className="font-bold">Agência</span>
                </div>
                <div onClick={() => setFormData({...formData, targetType: 'DRIVER', targetId: ''})} className={`cursor-pointer border-2 rounded-xl p-4 text-center transition-all ${formData.targetType === 'DRIVER' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                    <User size={24} className="mx-auto mb-2"/>
                    <span className="font-bold">Motorista</span>
                </div>
             </div>
             
             <GenericForm fields={fields} data={formData} onChange={setFormData} />
          </div>
      )}
    />
  );
};

// 9. BACKUP MANAGER (Kept as is, custom UI)
const BackupManager = () => {
    const handleDownload = () => {
        const data = storage.exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `OnniBox_Backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if(!confirm("ATENÇÃO: Importar um backup substituirá TODOS os dados atuais. Deseja continuar?")) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            const success = storage.importData(content);
            if (success) {
                alert("Dados importados com sucesso! A página será recarregada.");
                window.location.reload();
            } else {
                alert("Erro ao importar dados. Verifique se o arquivo é válido.");
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <Card className="p-8 border-l-4 border-blue-600">
                <div className="flex gap-4 items-start">
                    <div className="bg-blue-100 p-3 rounded-full text-blue-600"><Database size={32}/></div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Cópia de Segurança (Backup)</h3>
                        <p className="text-slate-600 mt-2">
                            Como este sistema roda diretamente no seu navegador, é fundamental fazer backups regulares para evitar a perda de dados caso você limpe o cache ou troque de computador.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                        <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Download size={20}/> Exportar Dados</h4>
                        <p className="text-sm text-slate-500 mb-6">Baixe um arquivo contendo todos os cadastros, rotas e financeiro.</p>
                        <Button onClick={handleDownload} className="w-full justify-center py-3">
                            Baixar Backup Agora
                        </Button>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                         <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Upload size={20}/> Restaurar Dados</h4>
                         <p className="text-sm text-slate-500 mb-6">Carregue um arquivo de backup anterior para restaurar o sistema.</p>
                         <label className="block w-full">
                            <span className="sr-only">Escolher arquivo</span>
                            <input type="file" accept=".json" onChange={handleUpload} className="block w-full text-sm text-slate-500
                                file:mr-4 file:py-3 file:px-4
                                file:rounded-md file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100 cursor-pointer
                            "/>
                        </label>
                    </div>
                </div>
            </Card>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex gap-3">
                <AlertCircle className="text-amber-600 shrink-0" size={24}/>
                <div>
                    <h4 className="font-bold text-amber-800">Importante</h4>
                    <p className="text-sm text-amber-700 mt-1">
                        Recomendamos fazer o download do backup ao final de cada dia ou semana. Guarde o arquivo em um local seguro (Google Drive, E-mail ou Pen-drive).
                    </p>
                </div>
            </div>
        </div>
    );
};
