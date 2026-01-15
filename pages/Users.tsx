
import React, { useState, useEffect } from 'react';
import { storage } from '../services/storageService';
import { User, UserRole } from '../types';
import { GenericTableManager, Column } from '../components/GenericTableManager';
import { GenericForm, FieldConfig } from '../components/GenericForm';
import { ShieldCheck, UserCheck, Lock, Clock, Database, AlertTriangle } from 'lucide-react';
import { usePermission } from '../hooks/usePermission';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({});
  const { can } = usePermission();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    // [BACKEND-MIGRATION] UI doesn't know this is LocalStorage. It asks the Service.
    setUsers(storage.users.getAll());
  };

  const roleOptions = [
      { value: 'ADMIN', label: 'Administrador (Acesso Total)' },
      { value: 'MANAGER', label: 'Gestor de Frota (Operacional + Relatórios)' },
      { value: 'FINANCIAL', label: 'Financeiro (Contas + Fechamento)' },
      { value: 'OPERATOR', label: 'Operador (Lançamento de Caixa)' },
      { value: 'AUDITOR', label: 'Auditor (Somente Leitura)' },
  ];

  const fields: FieldConfig<User>[] = [
      { name: 'name', label: 'Nome Completo', required: true, gridCols: 8, section: 'Identificação', autoFocus: true },
      { name: 'active', label: 'Status', type: 'select', options: [{value: 'true', label: 'Ativo'}, {value: 'false', label: 'Inativo'}], gridCols: 4, section: 'Identificação' },
      
      { name: 'email', label: 'E-mail de Acesso (Login)', type: 'email', required: true, gridCols: 6, section: 'Acesso & Segurança', icon: Lock },
      { name: 'role', label: 'Perfil de Acesso', type: 'select', required: true, options: roleOptions, gridCols: 6, section: 'Acesso & Segurança' },
      { name: 'password', label: 'Senha', type: 'password', required: !formData.id, gridCols: 6, section: 'Acesso & Segurança', placeholder: formData.id ? 'Deixe em branco para não alterar' : 'Senha inicial' },
  ];

  const handleSave = () => {
    if (!formData.name || !formData.email || !formData.role) return alert("Preencha campos obrigatórios.");
    if (!formData.id && !formData.password) return alert("Senha é obrigatória para novos usuários.");
    
    // [BACKEND-MIGRATION] Validation logic inside repo/service would be better, but simple check here is fine for UI feedback.
    const existing = storage.users.getByEmail(formData.email);
    if (existing && existing.id !== formData.id) return alert("E-mail já cadastrado para outro usuário.");

    storage.users.save({
        ...formData,
        active: String(formData.active) === 'true' || formData.active === true,
        // UI logic: if editing and password is blank, don't send it. 
        // Logic handled in Repo to preserve old pass if null.
        password: formData.password ? formData.password : undefined 
    });

    loadUsers();
    setIsModalOpen(false);
  };

  const getRoleBadge = (role: UserRole) => {
      const styles: Record<UserRole, string> = {
          'ADMIN': 'bg-rose-100 text-rose-800 border-rose-200',
          'MANAGER': 'bg-purple-100 text-purple-800 border-purple-200',
          'FINANCIAL': 'bg-emerald-100 text-emerald-800 border-emerald-200',
          'OPERATOR': 'bg-blue-100 text-blue-800 border-blue-200',
          'AUDITOR': 'bg-slate-100 text-slate-800 border-slate-200',
      };
      return <span className={`px-2 py-1 rounded text-xs font-bold border uppercase tracking-wider ${styles[role]}`}>{role}</span>;
  };

  const columns: Column<User>[] = [
    { header: "Usuário", render: (i) => (
        <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-sm ${i.active ? 'bg-slate-700' : 'bg-slate-300'}`}>
                {i.name.substring(0,2).toUpperCase()}
            </div>
            <div>
                <div className={`font-bold text-sm ${i.active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{i.name}</div>
                <div className="text-xs text-slate-500 font-medium">{i.email}</div>
            </div>
        </div>
    )},
    { header: "Perfil", render: (i) => getRoleBadge(i.role) },
    { header: "Último Acesso", render: (i) => (
        <div className="text-xs text-slate-500 flex items-center gap-1">
            <Clock size={12}/>
            {i.lastLogin ? new Date(i.lastLogin).toLocaleString('pt-BR') : 'Nunca acessou'}
        </div>
    )},
    { header: "Status", render: (i) => i.active ? <span className="text-green-600 text-xs font-bold flex items-center gap-1"><UserCheck size={14}/> Ativo</span> : <span className="text-slate-400 text-xs font-bold">Inativo</span> },
  ];

  if (!can('manage_system')) {
      return (
          <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
              <Lock size={64} className="mb-4 opacity-20"/>
              <h2 className="text-xl font-bold">Acesso Restrito</h2>
              <p>Apenas Administradores podem gerenciar usuários.</p>
          </div>
      );
  }

  return (
    <GenericTableManager<User>
      title="Controle de Acesso"
      subtitle="Gestão de operadores e permissões de segurança"
      items={users}
      columns={columns}
      onNew={() => { setFormData({ active: true, role: 'OPERATOR' }); setIsModalOpen(true); }}
      onEdit={(i) => { setFormData({...i, password: ''}); setIsModalOpen(true); }} // Clear password field on edit
      onDelete={(i) => { 
          if(i.role === 'ADMIN' && users.filter(u => u.role === 'ADMIN' && u.active).length <= 1) {
              return alert("Não é possível desativar o único Administrador.");
          }
          if(confirm(i.active ? "Desativar usuário? Ele perderá acesso imediato." : "Reativar usuário?")) { 
              storage.users.save({...i, active: !i.active}); 
              loadUsers(); 
          } 
      }}
      renderRowActions={(i) => (
          <div title={i.active ? "Usuário Ativo" : "Usuário Inativo"}>
              <ShieldCheck size={18} className={i.active ? 'text-green-500' : 'text-slate-300'}/>
          </div>
      )}
      isModalOpen={isModalOpen}
      onCloseModal={() => setIsModalOpen(false)}
      onSave={handleSave}
      modalTitle={formData.id ? "Editar Perfil" : "Novo Usuário"}
      saveLabel="Salvar Usuário"
      searchPlaceholder="Buscar por nome ou email..."
      
      kpiContent={
          <div className="col-span-full bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <Database size={20} className="text-blue-600 mt-1 shrink-0"/>
              <div>
                  <h4 className="font-bold text-blue-900 text-sm">Arquitetura de Segurança Local</h4>
                  <p className="text-xs text-blue-700 mt-1 leading-relaxed max-w-2xl">
                      Este módulo gerencia o acesso ao banco de dados local. As senhas são armazenadas localmente. 
                      Para um ambiente de produção seguro, recomenda-se a migração para autenticação em nuvem (Firebase Auth / Supabase Auth).
                  </p>
              </div>
          </div>
      }

      renderForm={() => (
          <div className="space-y-6">
              {!formData.id && (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded text-xs text-amber-800 flex gap-2">
                      <AlertTriangle size={16} className="shrink-0"/>
                      <span>A senha será necessária para o primeiro acesso. Guarde-a em local seguro.</span>
                  </div>
              )}
              <GenericForm fields={fields} data={formData} onChange={setFormData} />
          </div>
      )}
    />
  );
};
