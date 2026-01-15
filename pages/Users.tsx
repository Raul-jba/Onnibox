
import React, { useState, useEffect } from 'react';
import { storage } from '../services/storageService';
import { User, UserRole } from '../types';
import { GenericTableManager, Column } from '../components/GenericTableManager';
import { GenericForm, FieldConfig } from '../components/GenericForm';
import { ShieldCheck, UserCheck, Lock } from 'lucide-react';
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
    setUsers(storage.getUsers());
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
    
    // Validate Duplicate Email
    const existing = users.find(u => u.email.toLowerCase() === formData.email?.toLowerCase() && u.id !== formData.id);
    if (existing) return alert("E-mail já cadastrado para outro usuário.");

    const payload: User = {
        ...formData,
        active: String(formData.active) === 'true' || formData.active === true, // Handle select string 'true'
        // Keep old password if not changed
        password: formData.password ? formData.password : (users.find(u => u.id === formData.id)?.password),
        createdAt: formData.createdAt || new Date().toISOString()
    } as User;

    storage.saveUser(payload);
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
    { header: "Nome / E-mail", render: (i) => (
        <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${i.active ? 'bg-slate-800' : 'bg-slate-300'}`}>
                {i.name.substring(0,2).toUpperCase()}
            </div>
            <div>
                <div className={`font-bold text-sm ${i.active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{i.name}</div>
                <div className="text-xs text-slate-500">{i.email}</div>
            </div>
        </div>
    )},
    { header: "Perfil", render: (i) => getRoleBadge(i.role) },
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
      title="Gestão de Usuários"
      subtitle="Controle de acesso e permissões do sistema"
      items={users}
      columns={columns}
      onNew={() => { setFormData({ active: true, role: 'OPERATOR' }); setIsModalOpen(true); }}
      onEdit={(i) => { setFormData({...i, password: ''}); setIsModalOpen(true); }} // Clear password field on edit
      onDelete={(i) => { 
          if(i.role === 'ADMIN' && users.filter(u => u.role === 'ADMIN' && u.active).length <= 1) {
              return alert("Não é possível desativar o único Administrador.");
          }
          if(confirm(i.active ? "Desativar usuário? Ele perderá acesso imediato." : "Reativar usuário?")) { 
              storage.saveUser({...i, active: !i.active}); 
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
      modalTitle={formData.id ? "Editar Usuário" : "Novo Usuário"}
      saveLabel="Salvar Usuário"
      searchPlaceholder="Buscar por nome ou email..."
      renderForm={() => (
          <div className="space-y-6">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                  <h4 className="text-sm font-bold text-blue-900 mb-1">Nota de Segurança</h4>
                  <p className="text-xs text-blue-800 leading-relaxed">
                      O sistema utiliza autenticação local. Para maior segurança, utilize senhas fortes e não compartilhe credenciais.
                      Em caso de esquecimento de senha, um Administrador pode redefinir editando o usuário aqui.
                  </p>
              </div>
              <GenericForm fields={fields} data={formData} onChange={setFormData} />
          </div>
      )}
    />
  );
};
