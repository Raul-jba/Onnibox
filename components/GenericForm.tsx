
import React from 'react';
import { 
  User, Store, Truck, Gauge, MapPin, Phone, FileText, 
  Calendar, CreditCard, Receipt, Building2, Map, Clock 
} from 'lucide-react';

// Standard Styles (Moved from Registries for reuse)
const INPUT_CLASS = "w-full bg-white border border-slate-300 text-slate-800 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-medium shadow-sm transition-all disabled:bg-slate-100 disabled:text-slate-500";
const LABEL_CLASS = "block mb-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide";
const SECTION_TITLE = "text-sm font-bold text-blue-900 border-b border-blue-100 pb-2 mb-4 mt-2 flex items-center gap-2";

export interface FieldOption {
  value: string | number;
  label: string;
}

export interface FieldConfig<T> {
  name: keyof T;
  label: string;
  type?: 'text' | 'number' | 'date' | 'time' | 'select' | 'textarea' | 'email' | 'tel';
  options?: FieldOption[]; // For select
  gridCols?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12; // Bootstrap-like grid span
  required?: boolean;
  placeholder?: string;
  uppercase?: boolean;
  readOnly?: boolean;
  section?: string; // Group fields by section
  icon?: React.ElementType; // Icon for section or field decoration
  autoFocus?: boolean;
}

interface GenericFormProps<T> {
  fields: FieldConfig<T>[];
  data: Partial<T>;
  onChange: (data: Partial<T>) => void;
}

export function GenericForm<T>({ fields, data, onChange }: GenericFormProps<T>) {
  
  // Group fields by section
  const sections = React.useMemo(() => {
    const groups: Record<string, FieldConfig<T>[]> = {};
    const sectionOrder: string[] = [];

    fields.forEach(field => {
      const secName = field.section || 'default';
      if (!groups[secName]) {
        groups[secName] = [];
        sectionOrder.push(secName);
      }
      groups[secName].push(field);
    });

    return sectionOrder.map(name => ({ name, fields: groups[name] }));
  }, [fields]);

  const handleChange = (name: keyof T, value: any, uppercase: boolean = false) => {
    let finalValue = value;
    if (uppercase && typeof value === 'string') {
        finalValue = value.toUpperCase();
    }
    onChange({ ...data, [name]: finalValue });
  };

  const getSectionIcon = (sectionName: string) => {
      if (sectionName.includes('Dados') || sectionName.includes('Identificação')) return FileText;
      if (sectionName.includes('Contato') || sectionName.includes('Endereço')) return Phone;
      if (sectionName.includes('Técnico')) return Gauge;
      if (sectionName.includes('Veículo')) return Truck;
      return null;
  };

  return (
    <div className="space-y-6">
      {sections.map((section) => {
        const SectionIcon = getSectionIcon(section.name);
        
        return (
          <div key={section.name}>
            {section.name !== 'default' && (
              <h4 className={SECTION_TITLE}>
                {SectionIcon && <SectionIcon size={16}/>} {section.name}
              </h4>
            )}
            
            <div className="grid grid-cols-12 gap-4">
              {section.fields.map((field) => {
                const colSpan = field.gridCols ? `col-span-${field.gridCols}` : 'col-span-12 md:col-span-6';
                const val = data[field.name];
                const value = val !== undefined && val !== null ? String(val) : '';

                return (
                  <div key={String(field.name)} className={`${colSpan} col-span-12`}>
                    <label className={LABEL_CLASS}>
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    
                    {field.type === 'select' ? (
                      <select
                        className={INPUT_CLASS}
                        value={value}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        disabled={field.readOnly}
                        autoFocus={field.autoFocus}
                      >
                        <option value="">Selecione...</option>
                        {field.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        className={INPUT_CLASS}
                        rows={3}
                        value={value}
                        onChange={(e) => handleChange(field.name, e.target.value, field.uppercase)}
                        placeholder={field.placeholder}
                        disabled={field.readOnly}
                      />
                    ) : (
                      <input
                        type={field.type || 'text'}
                        className={`${INPUT_CLASS} ${field.uppercase ? 'uppercase' : ''}`}
                        value={value}
                        onChange={(e) => handleChange(field.name, e.target.value, field.uppercase)}
                        placeholder={field.placeholder}
                        disabled={field.readOnly}
                        autoFocus={field.autoFocus}
                        step={field.type === 'number' ? "any" : undefined}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
