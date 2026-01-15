
import React, { ReactNode, useState, useEffect } from 'react';
import { Card, Button } from './Layout';
import { Plus, Search, X, Edit2, Trash2, Power, Loader2 } from 'lucide-react';

export interface Column<T> {
  header: string;
  render: (item: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

interface GenericTableManagerProps<T> {
  title: string;
  subtitle?: string;
  items: T[];
  columns: Column<T>[];
  
  // Layout Slots
  filters?: ReactNode;
  kpiContent?: ReactNode;
  
  // Actions
  onNew?: () => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  renderRowActions?: (item: T) => ReactNode;
  
  // Status Toggle (Quick Action)
  onToggleStatus?: (item: T) => void;
  statusField?: keyof T;

  // Modal / Form
  isModalOpen?: boolean;
  onCloseModal?: () => void;
  onSave?: () => void | Promise<void>;
  modalTitle?: string;
  renderForm?: () => ReactNode;
  saveLabel?: string;
  cancelLabel?: string;
  
  // Search
  searchPlaceholder?: string;
  
  // Display Options
  headless?: boolean; // Hides Title, KPI and Filters (for embedded use)
}

export function GenericTableManager<T extends { id: string }>({
  title,
  subtitle,
  items,
  columns,
  filters,
  kpiContent,
  onNew,
  onEdit,
  onDelete,
  renderRowActions,
  onToggleStatus,
  statusField,
  isModalOpen,
  onCloseModal,
  onSave,
  modalTitle,
  renderForm,
  saveLabel = 'Salvar',
  cancelLabel = 'Cancelar',
  searchPlaceholder,
  headless = false
}: GenericTableManagerProps<T>) {
  
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Reset saving state when modal closes/opens
  useEffect(() => {
      if (isModalOpen) setIsSaving(false);
  }, [isModalOpen]);

  // Wrapper for Save to prevent double clicks
  const handleSaveWrapper = async () => {
      if (!onSave || isSaving) return;
      setIsSaving(true);
      try {
        await onSave();
        // Note: We don't set setIsSaving(false) here because typically onSave closes the modal.
        // If the modal doesn't close, the parent component should handle state or errors.
        // But to be safe in case of validation error keeping modal open:
        setTimeout(() => setIsSaving(false), 500); 
      } catch (e) {
        setIsSaving(false);
        alert("Erro ao salvar: " + e);
      }
  };

  // Filter items by search term if provided
  const filteredItems = React.useMemo(() => {
    if (!searchTerm) return items;
    const lower = searchTerm.toLowerCase();
    return items.filter(item => 
      Object.values(item as any).some(val => 
        String(val).toLowerCase().includes(lower)
      )
    );
  }, [items, searchTerm]);

  // Determine if Actions column is needed
  const hasActions = Boolean(onEdit || onDelete || renderRowActions || (statusField && onToggleStatus));

  return (
    <div className="space-y-6">
      {/* Header & Main Actions - Only show if not headless */}
      {!headless && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-800">{title}</h2>
            {subtitle && <p className="text-base text-slate-600 font-bold mt-1">{subtitle}</p>}
          </div>
          {onNew && (
              <Button onClick={onNew} className="shadow-lg shadow-blue-900/20 py-3 text-lg">
              <Plus size={24} /> Novo {title}
              </Button>
          )}
        </div>
      )}

      {/* KPI Section */}
      {!headless && kpiContent && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiContent}
        </div>
      )}

      {/* Filters & Search */}
      {!headless && (filters || searchPlaceholder) && (
        <Card className="bg-slate-50 border-2 border-slate-300 p-6">
            <div className="flex flex-col lg:flex-row gap-6 items-end">
                {searchPlaceholder && (
                    <div className="w-full lg:w-64">
                         <label className="block text-sm font-extrabold text-slate-700 mb-2 flex items-center gap-2"><Search size={18}/> Buscar</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder={searchPlaceholder}
                                className="bg-white border-2 border-slate-400 rounded-lg p-3 w-full text-base font-bold text-slate-900 focus:ring-blue-600 pl-10"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            <Search className="absolute left-3 top-3.5 text-slate-400" size={20}/>
                        </div>
                    </div>
                )}
                <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 lg:flex gap-6 items-end">
                    {filters}
                </div>
            </div>
        </Card>
      )}

      {/* Table */}
      <Card className="border-2 border-slate-300 shadow-md overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-200 text-slate-800 uppercase text-sm border-b-2 border-slate-300">
              <tr>
                {columns.map((col, idx) => (
                  <th key={idx} className={`px-6 py-4 font-extrabold text-${col.align || 'left'} ${col.className || ''}`}>{col.header}</th>
                ))}
                {statusField && <th className="px-6 py-4 font-extrabold text-center">Status</th>}
                {hasActions && <th className="px-6 py-4 font-extrabold text-center">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-base">
              {filteredItems.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-blue-50 transition-colors even:bg-slate-50 group">
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className={`px-6 py-5 ${col.className || ''} text-${col.align || 'left'}`}>
                      {col.render(item)}
                    </td>
                  ))}
                  
                  {/* Optional Status Toggle */}
                  {statusField && onToggleStatus && (
                     <td className="px-6 py-5 text-center">
                        <button 
                        onClick={() => onToggleStatus(item)}
                        className={`p-2 rounded-full transition-colors ${item[statusField] ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-200 text-slate-400 hover:bg-slate-300'}`}
                        title={item[statusField] ? "Ativo" : "Inativo"}
                        >
                        <Power size={18} />
                        </button>
                    </td>
                  )}

                  {/* Actions */}
                  {hasActions && (
                    <td className="px-6 py-5 text-center whitespace-nowrap">
                        <div className="flex justify-center gap-3">
                            {renderRowActions && renderRowActions(item)}
                            
                            {onEdit && (
                                <button onClick={() => onEdit(item)} className="text-white bg-blue-600 hover:bg-blue-700 p-2.5 rounded-lg shadow-sm transition-colors" title="Editar">
                                    <Edit2 size={20} />
                                </button>
                            )}
                            {onDelete && (
                                <button onClick={() => onDelete(item)} className="text-white bg-red-600 hover:bg-red-700 p-2.5 rounded-lg shadow-sm transition-colors" title="Excluir">
                                    <Trash2 size={20} />
                                </button>
                            )}
                        </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={columns.length + (statusField ? 1 : 0) + (hasActions ? 1 : 0)} className="p-10 text-center text-slate-500 font-bold text-lg italic">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      {isModalOpen && renderForm && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <Card className="w-full max-w-4xl bg-white shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden border-0 my-auto">
             <div className="flex justify-between items-center mb-0 border-b-2 border-slate-200 p-6 pb-4 bg-slate-100">
                <h3 className="font-extrabold text-2xl text-slate-900 flex items-center gap-3">
                  {modalTitle || `Novo ${title}`}
                </h3>
                <button onClick={onCloseModal} className="text-slate-500 hover:text-slate-800 bg-white p-2 rounded-full border-2 border-slate-300" disabled={isSaving}>
                    <span className="font-bold text-xl px-1">✕</span>
                </button>
             </div>

             <div className="p-8 overflow-y-auto max-h-[80vh]">
                {renderForm()}

                <div className="flex justify-end gap-4 pt-6 mt-6 border-t-2 border-slate-200">
                    <Button variant="secondary" onClick={onCloseModal} className="text-lg px-8" disabled={isSaving}>
                        {cancelLabel}
                    </Button>
                    {onSave && (
                        <Button onClick={handleSaveWrapper} className="text-lg px-8 min-w-[140px]" disabled={isSaving}>
                            {isSaving ? <><Loader2 className="animate-spin" size={20}/> Salvando...</> : saveLabel}
                        </Button>
                    )}
                </div>
             </div>
          </Card>
        </div>
      )}
    </div>
  );
}
