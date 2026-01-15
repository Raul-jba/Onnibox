
import React, { useState, useEffect, useMemo } from 'react';
import { storage } from '../services/storageService';
import { Driver, Vehicle, Agency, Line, RouteDef, ExpenseType, CommissionRule, Client, Supplier } from '../types';
import { GenericTableManager, Column } from '../components/GenericTableManager';
import { GenericForm, FieldConfig } from '../components/GenericForm';
import { 
  Users, Truck, Map, CalendarClock, Building2, Receipt, Percent,
  User, MapPin, ArrowRight, Clock, Gauge, Briefcase, Store,
  Database, Download, Upload, AlertCircle, Phone, FileText,
  CreditCard, CheckCircle2, ShieldCheck, Settings
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
    { id: 'suppliers', label: 'Fornecedores', icon: Store, desc: 'Parceiros e Serviços' },
    { id: 'clients', label: 'Clientes', icon: Briefcase, desc: 'Fretamento' },
    { id: 'drivers', label: 'Motoristas', icon: Users, desc: 'Equipe' },
    { id: 'vehicles', label: 'Veículos', icon: Truck, desc: 'Frota' },
    { id: 'agencies', label: 'Agências', icon: Building2, desc: 'Vendas' },
    { id: 'lines', label: 'Linhas', icon: Map, desc: 'Rotas' },
    { id: 'schedules', label: 'Horários', icon: CalendarClock, desc: 'Quadro' },
    { id: 'expenses', label: 'Despesas', icon: Receipt, desc: 'Categorias' },
  ];

  if (can('edit_commissions')) {
      tabs.push({ id: 'commissions', label: 'Comissões', icon: Percent, desc: 'Regras' });
  }

  if (can('manage_system')) {
      tabs.push({ id: 'backup', label: 'Sistema', icon: Settings, desc: 'Dados' });
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-6">
        <div>
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Cadastros Gerais</h2>
            <p className="text-sm text-slate-500 mt-1">Gestão centralizada de entidades e parâmetros do sistema.</p>
        </div>
      </div>

      {/* Modern Tabs */}
      <div className="bg-white rounded-t-xl border-b border-slate-200 sticky top-0 z-10 shadow-sm mx-1">
        <div className="flex overflow-x-auto custom-scrollbar">
            {tabs.map(tab => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group flex items-center gap-3 px-6 py-4 min-w-max transition-all border-b-2 ${
                activeTab === tab.id 
                    ? 'border-blue-600 bg-blue-50/50' 
                    : 'border-transparent hover:bg-slate-50 hover:border-slate-300'
                }`}
            >
                <div className={`transition-colors ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                    <tab.icon size={20} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                </div>
                <div className="text-left">
                    <div className={`text-sm font-bold leading-none ${activeTab === tab.id ? 'text-blue-700' : 'text-slate-600'}`}>{tab.label}</div>
                    <div className="text-[10px] text-slate-400 font-medium mt-1 group-hover:text-slate-500">{tab.desc}</div>
                </div>
            </button>
            ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
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

  // Layout Otimizado: Dados principais -> Contato -> Endereço
  const fields: FieldConfig<Supplier>[] = [
      // Identificação
      { name: 'name', label: 'Razão Social', gridCols: 7, required: true, autoFocus: true, section: 'Identificação da Empresa', placeholder: 'Nome oficial da empresa' },
      { name: 'taxId', label: 'CNPJ / CPF', gridCols: 5, required: true, placeholder: '00.000.000/0000-00', section: 'Identificação da Empresa' },
      { name: 'tradeName', label: 'Nome Fantasia', gridCols: 6, section: 'Identificação da Empresa', placeholder: 'Como é conhecido' },
      { name: 'category', label: 'Categoria de Serviço', gridCols: 6, placeholder: 'Ex: Oficina, Peças, Combustível', section: 'Identificação da Empresa' },
      
      // Contato
      { name: 'phone', label: 'Telefone / WhatsApp', gridCols: 4, section: 'Contato & Endereço', icon: Phone },
      { name: 'email', label: 'E-mail Comercial', gridCols: 8, section: 'Contato & Endereço' },
      
      // Endereço (Fluxo Lógico)
      { name: 'address', label: 'Logradouro (Rua, Av.)', gridCols: 8, section: 'Contato & Endereço' },
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
    { header: "Empresa / Fornecedor", render: (i) => (
        <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${i.active ? 'bg-white border-slate-200 text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-300'}`}>
                <Store size={20}/>
            </div>
            <div>
                <div className={`font-bold text-sm ${i.active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{i.name}</div>
                <div className="text-xs text-slate-500">{i.tradeName || i.taxId}</div>
            </div>
        </div>
    )},
    { header: "Categoria", render: (i) => i.category ? <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded text-xs font-bold border border-blue-100 uppercase tracking-wide">{i.category}</span> : <span className="text-slate-400 text-xs">-</span> },
    { header: "Contato", render: (i) => (
        <div className="text-sm text-slate-600">
            <div className="font-medium flex items-center gap-1">{i.phone}</div>
            <div className="text-xs text-slate-400">{i.email}</div>
        </div> 
    )},
    { header: "Cidade", render: (i) => <div className="text-xs font-bold text-slate-600">{i.city || '-'}</div> }
  ];

  return (
    <GenericTableManager<Supplier>
      title="Fornecedores"
      subtitle="Centros de custo e prestadores de serviço"
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
      searchPlaceholder="Buscar por nome, CNPJ ou categoria..."
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

  // Campos dinâmicos otimizados
  const fields = useMemo((): FieldConfig<Client>[] => {
      const isPJ = formData.type === 'PJ';
      return [
          // Seção Principal
          { name: 'name', label: isPJ ? 'Razão Social' : 'Nome Completo', required: true, gridCols: isPJ ? 8 : 8, section: 'Dados do Cliente', autoFocus: true },
          ...(isPJ ? [{ name: 'tradeName', label: 'Nome Fantasia', gridCols: 4, section: 'Dados do Cliente' } as FieldConfig<Client>] : []),
          { name: 'taxId', label: isPJ ? 'CNPJ' : 'CPF', required: true, gridCols: isPJ ? 4 : 4, placeholder: isPJ ? '00.000.000/0001-00' : '000.000.000-00', section: 'Dados do Cliente' },
          
          // Contato Compacto
          { name: 'phone', label: 'Celular / WhatsApp', required: true, gridCols: 4, section: 'Dados do Cliente', icon: Phone },
          { name: 'email', label: 'E-mail', gridCols: 4, section: 'Dados do Cliente' },

          // Endereço Lógico
          { name: 'zipCode', label: 'CEP', gridCols: 3, section: 'Localização', placeholder: '00000-000' },
          { name: 'city', label: 'Cidade', gridCols: 6, section: 'Localização' },
          { name: 'state', label: 'UF', gridCols: 3, uppercase: true, section: 'Localização', placeholder: 'SP' },
          
          { name: 'address', label: 'Logradouro', gridCols: 9, section: 'Localização' },
          { name: 'number', label: 'Nº', gridCols: 3, section: 'Localização' },
          { name: 'neighborhood', label: 'Bairro', gridCols: 6, section: 'Localização' },
          { name: 'identityDoc', label: isPJ ? 'Inscrição Est.' : 'RG', gridCols: 6, section: 'Localização' },
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
    { header: "Cliente / Razão Social", render: (i) => (
        <div className={i.active ? '' : 'opacity-50'}>
            <div className="flex items-center gap-2 mb-1">
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${i.type === 'PJ' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-teal-50 text-teal-700 border-teal-100'}`}>
                    {i.type}
                </span>
                <span className="text-xs text-slate-400 font-mono tracking-wide">{i.taxId}</span>
            </div>
            <div className={`font-bold text-sm ${i.active ? 'text-slate-800' : 'text-slate-500 line-through'}`}>{i.name}</div>
            {i.type === 'PJ' && i.tradeName && <div className="text-xs text-slate-500">{i.tradeName}</div>}
        </div>
    )},
    { header: "Localização", render: (i) => (
        <div className="text-sm text-slate-600 flex items-center gap-1">
            <MapPin size={12} className="text-slate-400"/> {i.city}/{i.state}
        </div> 
    )},
    { header: "Contato", render: (i) => <div className="text-sm font-medium text-slate-700">{i.phone}</div> }
  ];

  return (
    <GenericTableManager<Client>
      title="Clientes"
      subtitle="Contratantes para fretamento e turismo"
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
      searchPlaceholder="Buscar por nome ou documento..."
      renderForm={() => (
        <div className="space-y-6">
             {/* Tipo de Cliente Switch - Estilo Segmented Control */}
             <div className="flex justify-center">
                 <div className="bg-slate-100 p-1 rounded-lg inline-flex border border-slate-200">
                    <button
                        type="button"
                        onClick={() => setFormData({...formData, type: 'PF'})}
                        className={`px-6 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${formData.type === 'PF' ? 'bg-white text-teal-700 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <User size={16}/> Pessoa Física
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormData({...formData, type: 'PJ'})}
                        className={`px-6 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${formData.type === 'PJ' ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Store size={16}/> Pessoa Jurídica
                    </button>
                </div>
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
      // Pessoal
      { name: 'name', label: 'Nome Completo', required: true, gridCols: 8, section: 'Dados Pessoais', autoFocus: true },
      { name: 'cpf', label: 'CPF', gridCols: 4, section: 'Dados Pessoais', placeholder: '000.000.000-00' },
      { name: 'phone', label: 'Celular / WhatsApp', gridCols: 6, section: 'Dados Pessoais', icon: Phone },
      { name: 'admissionDate', label: 'Data de Admissão', type: 'date', gridCols: 6, section: 'Dados Pessoais' },
      
      // Profissional
      { name: 'cnh', label: 'Número da CNH', gridCols: 8, section: 'Habilitação Profissional (CNH)', icon: CreditCard },
      { name: 'cnhCategory', label: 'Categoria', type: 'select', gridCols: 4, options: [{value: 'B', label:'B'}, {value:'C', label:'C'}, {value:'D', label:'D'}, {value:'E', label:'E'}, {value:'AD', label:'AD'}, {value:'AE', label:'AE'}], section: 'Habilitação Profissional (CNH)' },
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
             <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border text-sm ${i.active ? 'bg-white text-slate-600 border-slate-200 shadow-sm' : 'bg-slate-50 text-slate-300 border-slate-100'}`}>
                {i.name.substring(0,2).toUpperCase()}
             </div>
             <div>
                 <div className={`font-bold text-sm ${i.active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{i.name}</div>
                 <div className="text-xs text-slate-500 font-mono tracking-wide">{i.cpf || 'Sem CPF'}</div>
             </div>
        </div>
    )},
    { header: "CNH", render: (i) => (
        <div className="flex items-center gap-2">
            <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-bold text-xs border border-slate-200">{i.cnhCategory || '?'}</span>
            <span className="text-sm font-medium text-slate-600 font-mono">{i.cnh}</span>
        </div>
    )},
    { header: "Contato", render: (i) => <span className="font-medium text-sm text-slate-600">{i.phone}</span> },
  ];

  return (
    <GenericTableManager<Driver>
      title="Motoristas"
      subtitle="Quadro de condutores e documentação"
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
    // Identificação
    { name: 'plate', label: 'Placa', required: true, uppercase: true, placeholder: 'ABC-1234', gridCols: 4, section: 'Identificação da Frota', autoFocus: true },
    { name: 'brand', label: 'Marca/Chassi', placeholder: 'Ex: Marcopolo / Volvo', gridCols: 8, section: 'Identificação da Frota' },
    { name: 'description', label: 'Modelo / Descrição (Apelido)', required: true, placeholder: 'Ex: Paradiso 1200 G7', gridCols: 12, section: 'Identificação da Frota' },
    
    // Dados Técnicos
    { name: 'year', label: 'Ano Fabricação', type: 'number', gridCols: 4, section: 'Dados Técnicos', icon: Gauge },
    { name: 'seats', label: 'Capacidade (Lugares)', type: 'number', gridCols: 4, section: 'Dados Técnicos' },
    { name: 'initialMileage', label: 'KM Atual (Hodômetro)', type: 'number', gridCols: 4, section: 'Dados Técnicos' },
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
    { header: "Veículo / Placa", render: (i) => (
        <div className="flex items-center gap-4">
             <div className={`p-2.5 rounded-lg border ${i.active ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-300'}`}>
                 <Truck size={20}/>
             </div>
             <div>
                <div className={`font-black text-base leading-none tracking-tight ${i.active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{i.plate}</div>
                <div className="text-xs text-slate-500 font-medium mt-1">{i.brand} • {i.description}</div>
             </div>
        </div>
    )},
    { header: "Lotação", render: (i) => <span className="font-bold text-slate-600 text-sm bg-slate-100 px-2 py-1 rounded">{i.seats || '?'} Lug.</span>, align: 'center' },
    { header: "KM Atual", render: (i) => (
        <div className="flex items-center gap-1 font-mono text-sm text-slate-700 font-bold">
            <Gauge size={14} className="text-slate-400"/> {i.initialMileage?.toLocaleString()} km
        </div>
    )},
    { header: "Ano", render: (i) => <span className="text-sm font-medium text-slate-600">{i.year || '-'}</span>, align: 'center'}
  ];

  return (
    <GenericTableManager<Vehicle>
      title="Veículos"
      subtitle="Cadastro e controle da frota"
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
      searchPlaceholder="Buscar por placa ou modelo..."
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
      { name: 'name', label: 'Descrição da Linha', required: true, autoFocus: true, placeholder: 'Ex: São Paulo x Rio de Janeiro' }
  ];

  return (
    <GenericTableManager<Line>
      title="Linhas"
      subtitle="Itinerários macro do sistema"
      items={items}
      columns={[{ header: "Descrição da Linha", render: (i) => <span className={`font-bold text-base ${i.active ? 'text-slate-700' : 'text-slate-400 line-through'}`}>{i.name}</span> }]}
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
      { name: 'lineId', label: 'Linha Vinculada', type: 'select', required: true, options: lines.map(l => ({value: l.id, label: l.name})), gridCols: 12, autoFocus: true },
      { name: 'time', label: 'Horário de Saída', type: 'time', required: true, gridCols: 12, section: 'Detalhes da Viagem', icon: Clock },
      { name: 'origin', label: 'Cidade Origem', gridCols: 6, required: true, section: 'Detalhes da Viagem' },
      { name: 'destination', label: 'Cidade Destino', gridCols: 6, required: true, section: 'Detalhes da Viagem' },
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
      subtitle="Definição de partidas e itinerários detalhados"
      items={filteredItems}
      columns={[
        { header: "Linha", render: (i) => <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">{lines.find(l => l.id === i.lineId)?.name || 'Linha Excluída'}</span> },
        { header: "Partida", render: (i) => <div className="font-black text-slate-800 text-lg flex items-center gap-1">{i.time} <span className="text-xs font-normal text-slate-400">h</span></div> },
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
      { name: 'name', label: 'Nome da Agência', required: true, gridCols: 8, section: 'Dados da Agência', placeholder: 'Ex: Rodoviária Tietê - Box 10', autoFocus: true },
      { name: 'city', label: 'Cidade', required: true, gridCols: 4, section: 'Dados da Agência' },
      { name: 'address', label: 'Endereço Completo', gridCols: 12, section: 'Dados da Agência' },
      
      { name: 'managerName', label: 'Nome do Responsável', gridCols: 6, section: 'Contato', icon: User },
      { name: 'phone', label: 'Telefone / WhatsApp', gridCols: 6, section: 'Contato' },
      { name: 'email', label: 'Email para Relatórios', gridCols: 12, section: 'Contato' },
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
        <div className={`font-bold text-sm ${i.active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{i.name}</div>
    )},
    { header: "Localização", render: (i) => (
        <div>
            <div className="flex items-center gap-1 font-bold text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded w-fit"><MapPin size={12} className="text-red-500"/> {i.city}</div>
            <div className="text-xs text-slate-400 mt-1">{i.address || 'Sem endereço'}</div>
        </div>
    )},
    { header: "Responsável", render: (i) => (
        <div className="text-sm">
            <div className="font-medium text-slate-700">{i.managerName}</div>
            <div className="text-xs text-slate-500">{i.phone}</div>
        </div>
    )}
  ];

  return (
    <GenericTableManager<Agency>
      title="Agências"
      subtitle="Pontos de venda, rodoviárias e parceiros comerciais"
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
      subtitle="Categorização para o plano de contas"
      items={items}
      columns={[{ header: "Descrição da Categoria", render: (i) => <span className={`font-bold text-sm ${i.active ? 'text-slate-700' : 'text-slate-400 line-through'}`}>{i.name}</span> }]}
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
      subtitle="Configuração de repasses automáticos sobre vendas"
      items={items}
      columns={[
        { header: "Beneficiário", render: (i) => <div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${i.targetType === 'DRIVER' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-purple-50 text-purple-600 border border-purple-100'}`}>{i.targetType === 'DRIVER' ? <User size={18}/> : <Building2 size={18}/>}</div><div><div className={`font-bold text-sm ${i.active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{getEntityName(i)}</div><div className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">{i.targetType === 'DRIVER' ? 'Motorista' : 'Agência'}</div></div></div> },
        { header: "Comissão Fixa", render: (i) => <span className="font-bold text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200 text-sm">{i.percentage}%</span>, align: 'center' }
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
                <button 
                    type="button"
                    onClick={() => setFormData({...formData, targetType: 'AGENCY', targetId: ''})} 
                    className={`cursor-pointer border-2 rounded-xl p-4 text-center transition-all flex flex-col items-center gap-2 ${formData.targetType === 'AGENCY' ? 'bg-purple-50 border-purple-500 text-purple-700 ring-2 ring-purple-200 ring-offset-2' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                >
                    <Building2 size={32} />
                    <span className="font-bold text-sm">Agência / Rodoviária</span>
                </button>
                <button 
                    type="button"
                    onClick={() => setFormData({...formData, targetType: 'DRIVER', targetId: ''})} 
                    className={`cursor-pointer border-2 rounded-xl p-4 text-center transition-all flex flex-col items-center gap-2 ${formData.targetType === 'DRIVER' ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-200 ring-offset-2' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                >
                    <User size={32} />
                    <span className="font-bold text-sm">Motorista</span>
                </button>
             </div>
             
             <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <GenericForm fields={fields} data={formData} onChange={setFormData} />
             </div>
          </div>
      )}
    />
  );
};

// 9. BACKUP MANAGER
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
        <div className="space-y-6 max-w-4xl mx-auto pt-4">
            <Card className="p-8 border-l-4 border-blue-600 bg-white shadow-md">
                <div className="flex gap-5 items-start">
                    <div className="bg-blue-50 p-4 rounded-full text-blue-600 border border-blue-100"><Database size={32}/></div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Cópia de Segurança (Backup)</h3>
                        <p className="text-slate-600 mt-2 leading-relaxed">
                            O sistema armazena os dados no seu navegador. Realize backups frequentes para garantir a segurança das informações.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors">
                        <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2 text-lg"><Download size={20} className="text-blue-600"/> Exportar Dados</h4>
                        <p className="text-sm text-slate-500 mb-6 min-h-[40px]">Baixe um arquivo JSON contendo todos os cadastros e lançamentos financeiros.</p>
                        <Button onClick={handleDownload} className="w-full justify-center py-3 text-sm font-bold shadow-sm">
                            Baixar Backup Agora
                        </Button>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors">
                         <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2 text-lg"><Upload size={20} className="text-blue-600"/> Restaurar Dados</h4>
                         <p className="text-sm text-slate-500 mb-6 min-h-[40px]">Recupere o sistema a partir de um arquivo salvo anteriormente.</p>
                         <label className="block w-full">
                            <span className="sr-only">Escolher arquivo</span>
                            <input type="file" accept=".json" onChange={handleUpload} className="block w-full text-sm text-slate-500
                                file:mr-4 file:py-3 file:px-6
                                file:rounded-lg file:border-0
                                file:text-sm file:font-bold
                                file:bg-white file:text-blue-700
                                file:shadow-sm file:ring-1 file:ring-slate-200
                                hover:file:bg-blue-50 cursor-pointer
                            "/>
                        </label>
                    </div>
                </div>
            </Card>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex gap-4 items-start">
                <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20}/>
                <div>
                    <h4 className="font-bold text-amber-800 text-sm">Política de Segurança</h4>
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                        Recomendamos fazer o download do backup ao final de cada dia ou semana. Guarde o arquivo em um local seguro (Google Drive, E-mail ou Pen-drive).
                    </p>
                </div>
            </div>
        </div>
    );
};
