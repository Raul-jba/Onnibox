
import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/Layout';
import { storage } from '../services/storageService';
import { AuditLog } from '../types';
import { GenericTableManager, Column } from '../components/GenericTableManager';
import { ShieldCheck, User, Calendar, FileText, Activity, Code, Filter } from 'lucide-react';
import { usePermission } from '../hooks/usePermission';

const ActionBadge = ({ action }: { action: string }) => {
    const styles: Record<string, string> = {
        'CREATE': 'bg-green-100 text-green-700 border-green-200',
        'UPDATE': 'bg-blue-100 text-blue-700 border-blue-200',
        'DELETE': 'bg-red-100 text-red-700 border-red-200',
        'CLOSE': 'bg-purple-100 text-purple-700 border-purple-200',
        'REOPEN': 'bg-amber-100 text-amber-700 border-amber-200',
    };
    return (
        <span className={`px-2 py-1 rounded text-xs font-bold border uppercase tracking-wider ${styles[action] || 'bg-slate-100 text-slate-600'}`}>
            {action}
        </span>
    );
};

export const AuditPage: React.FC = () => {
    const { can } = usePermission();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    
    // Filters
    const [filterUser, setFilterUser] = useState('');
    const [filterEntity, setFilterEntity] = useState('');
    const [filterAction, setFilterAction] = useState('');

    useEffect(() => {
        setLogs(storage.getAuditLogs());
    }, []);

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            return (
                (!filterUser || log.userName.includes(filterUser)) &&
                (!filterEntity || log.entity === filterEntity) &&
                (!filterAction || log.action === filterAction)
            );
        });
    }, [logs, filterUser, filterEntity, filterAction]);

    const handleViewDetails = (log: AuditLog) => {
        setSelectedLog(log);
        setIsDetailsOpen(true);
    };

    const columns: Column<AuditLog>[] = [
        { header: "Data/Hora", render: (i) => <div className="text-xs font-mono">{new Date(i.timestamp).toLocaleString('pt-BR')}</div> },
        { header: "Usuário", render: (i) => (
            <div className="flex items-center gap-2">
                <User size={14} className="text-slate-400"/>
                <div>
                    <div className="font-bold text-slate-700 text-xs">{i.userName}</div>
                    <div className="text-[10px] text-slate-400 uppercase">{i.userRole}</div>
                </div>
            </div>
        )},
        { header: "Ação", render: (i) => <ActionBadge action={i.action} /> },
        { header: "Entidade", render: (i) => <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">{i.entity}</span> },
        { header: "Detalhes", render: (i) => <span className="text-xs text-slate-600 truncate max-w-xs block">{i.details}</span> }
    ];

    const uniqueUsers = Array.from(new Set(logs.map(l => l.userName)));
    const uniqueEntities = Array.from(new Set(logs.map(l => l.entity)));

    if (!can('view_reports')) { // Reusing permissions for now, usually audit is restricted
        return <div className="p-8 text-center text-red-500 font-bold">Acesso restrito a administradores.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                        <ShieldCheck className="text-blue-600" /> Auditoria & Histórico
                    </h2>
                    <p className="text-sm text-slate-500">Rastreabilidade completa de todas as operações do sistema.</p>
                </div>
            </div>

            <GenericTableManager<AuditLog>
                title="Logs do Sistema"
                items={filteredLogs}
                columns={columns}
                headless={false}
                searchPlaceholder="Buscar nos detalhes..."
                filters={
                    <div className="flex gap-2 w-full">
                        <div className="relative flex-1">
                            <User size={14} className="absolute left-3 top-3 text-slate-400"/>
                            <select className="w-full bg-white border border-slate-300 rounded-lg py-2 pl-8 pr-2 text-sm" value={filterUser} onChange={e => setFilterUser(e.target.value)}>
                                <option value="">Todos Usuários</option>
                                {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                        <div className="relative flex-1">
                            <Filter size={14} className="absolute left-3 top-3 text-slate-400"/>
                            <select className="w-full bg-white border border-slate-300 rounded-lg py-2 pl-8 pr-2 text-sm" value={filterAction} onChange={e => setFilterAction(e.target.value)}>
                                <option value="">Todas Ações</option>
                                <option value="CREATE">Criação</option>
                                <option value="UPDATE">Edição</option>
                                <option value="DELETE">Exclusão</option>
                                <option value="CLOSE">Fechamento</option>
                                <option value="REOPEN">Reabertura</option>
                            </select>
                        </div>
                        <div className="relative flex-1">
                            <Activity size={14} className="absolute left-3 top-3 text-slate-400"/>
                            <select className="w-full bg-white border border-slate-300 rounded-lg py-2 pl-8 pr-2 text-sm" value={filterEntity} onChange={e => setFilterEntity(e.target.value)}>
                                <option value="">Todos Módulos</option>
                                {uniqueEntities.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                        </div>
                    </div>
                }
                renderRowActions={(item) => (
                    <button onClick={() => handleViewDetails(item)} className="text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50 transition-colors" title="Ver Detalhes Técnicos">
                        <FileText size={18} />
                    </button>
                )}
            />

            {/* Modal de Detalhes (Snapshot) */}
            {isDetailsOpen && selectedLog && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-3xl bg-white shadow-2xl overflow-hidden border-0 flex flex-col max-h-[90vh]">
                        <div className="p-6 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <Code size={20}/> Dados Técnicos (Snapshot)
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">ID: {selectedLog.id} • {selectedLog.action} em {new Date(selectedLog.timestamp).toLocaleString()}</p>
                            </div>
                            <button onClick={() => setIsDetailsOpen(false)} className="text-slate-500 hover:text-slate-800">
                                ✕
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1 bg-slate-50 font-mono text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                                {selectedLog.previousSnapshot && (
                                    <div className="flex flex-col">
                                        <h4 className="font-bold text-red-700 mb-2 uppercase border-b border-red-200 pb-1">Estado Anterior (Antes)</h4>
                                        <pre className="bg-white p-3 border border-red-200 rounded text-slate-600 overflow-auto flex-1">
                                            {JSON.stringify(JSON.parse(selectedLog.previousSnapshot), null, 2)}
                                        </pre>
                                    </div>
                                )}
                                <div className={`flex flex-col ${!selectedLog.previousSnapshot ? 'col-span-2' : ''}`}>
                                    <h4 className="font-bold text-green-700 mb-2 uppercase border-b border-green-200 pb-1">Estado Novo (Depois)</h4>
                                    <pre className="bg-white p-3 border border-green-200 rounded text-slate-600 overflow-auto flex-1">
                                        {selectedLog.snapshot ? JSON.stringify(JSON.parse(selectedLog.snapshot), null, 2) : 'N/A'}
                                    </pre>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-200 bg-white text-right">
                            <button onClick={() => setIsDetailsOpen(false)} className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold">
                                Fechar
                            </button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};
