import React, { Component, ErrorInfo, ReactNode } from 'react';
import { storage } from '../services/storageService';
import { AlertTriangle, Database, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleHardReset = () => {
    // eslint-disable-next-line no-restricted-globals
    if (confirm("ATENÇÃO: Isso limpará TODOS os dados locais para recuperar o sistema. Você tem um backup?")) {
        storage.reset();
        window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full bg-white shadow-xl rounded-xl p-8 border border-red-100 text-center">
            <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={32} className="text-red-600" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Ops! Algo deu errado.</h1>
            <p className="text-slate-500 mb-6 text-sm">
                Ocorreu um erro inesperado na aplicação. Isso pode ter acontecido devido a dados corrompidos ou falha de atualização.
            </p>
            
            <div className="bg-slate-100 p-3 rounded-lg text-left text-xs font-mono text-red-600 mb-6 overflow-auto max-h-32">
                {this.state.error?.message}
            </div>

            <div className="flex flex-col gap-3">
                <button 
                    onClick={() => window.location.reload()} 
                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                    <RefreshCw size={18}/> Tentar Recarregar
                </button>
                
                <button 
                    onClick={this.handleHardReset} 
                    className="w-full py-3 bg-white border border-red-200 text-red-600 rounded-lg font-bold hover:bg-red-50 flex items-center justify-center gap-2"
                >
                    <Database size={18}/> Resetar Banco de Dados (Emergência)
                </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
