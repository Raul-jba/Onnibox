
import React, { useEffect, useState } from 'react';
import { notificationService } from '../services/notificationService';
import { Notification } from '../types';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const icons = {
  success: <CheckCircle size={20} className="text-green-500" />,
  error: <AlertCircle size={20} className="text-red-500" />,
  warning: <AlertTriangle size={20} className="text-amber-500" />,
  info: <Info size={20} className="text-blue-500" />,
};

const styles = {
  success: "border-green-200 bg-green-50",
  error: "border-red-200 bg-red-50",
  warning: "border-amber-200 bg-amber-50",
  info: "border-blue-200 bg-blue-50",
};

export const ToastContainer: React.FC = () => {
  const [list, setList] = useState<Notification[]>([]);

  useEffect(() => {
    return notificationService.subscribe(setList);
  }, []);

  if (list.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {list.map(n => (
        <div 
          key={n.id} 
          className={`pointer-events-auto min-w-[300px] max-w-sm p-4 rounded-lg shadow-lg border flex items-start gap-3 animate-in slide-in-from-right duration-300 ${styles[n.type]}`}
        >
          <div className="shrink-0 mt-0.5">{icons[n.type]}</div>
          <p className="text-sm font-medium text-slate-800 flex-1">{n.message}</p>
          <button 
            onClick={() => notificationService.remove(n.id)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};
