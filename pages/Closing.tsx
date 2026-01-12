
import React, { useState, useEffect } from 'react';
import { Card, Button } from '../components/Layout';
import { storage, getLocalDate, formatDateDisplay } from '../services/storageService';
import { DailyClose, RouteCash, AgencyCash, Driver, Agency, CommissionRule } from '../types';
import { GenericTableManager, Column } from '../components/GenericTableManager';
import { 
  Lock, 
  Search, 
  AlertOctagon, 
  AlertTriangle, 
  X, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp, 
  FileText,
  Bus,
  Building2,
  Calendar,
  ShieldCheck
} from 'lucide-react';

const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const DARK_INPUT_CLASS = "input-dark bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none";

export const ClosingPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(getLocalDate());
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  // Data State
  const [report, setReport] = useState<{
    routes: RouteCash[];
    agencies: AgencyCash[];
    
    // Financials
    totalRouteRevenue: number;
    totalAgencyRevenue: number;
    totalRevenue: number;   // Gross Sales
    
    totalExpenses: number;  // Cash Expenses (Routes)
    totalAgencyExpenses: number; // NEW: Agency Expenses

    totalCommissions: number; // Agency Commissions

    netCash: number;        // Physical Cash Handed + Received
    diff: number;           // Discrepancy
    
    isClosed: boolean;
    pendingCount: number;
    closedAt?: string;
  } | null>(null);

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [commissions, setCommissions] = useState<CommissionRule[]>([]);

  useEffect(() => {
    setDrivers(storage.getDrivers());
    setAgencies(storage.getAgencies());
    setCommissions(storage.getCommissions());
  }, []);

  useEffect(() => {
    loadReport();
  }, [selectedDate, commissions]);

  const loadReport = () => {
    const dailyClose = storage.getDailyCloses().find(c => c.date === selectedDate);
    const allRoutes = storage.getRouteCash().filter(r => r.date === selectedDate);
    const allAgencies = storage.getAgencyCash().filter(a => a.date === selectedDate);

    // 1. Calculate Gross Revenues (Vendas)
    const routeRev = allRoutes.reduce((acc, r) => acc + r.revenueInformed, 0);
    const agencyRev = allAgencies.reduce((acc, a) => acc + a.valueInformed, 0); 
    const totalRevenue = routeRev + agencyRev;

    // 2. Expenses 
    const routeExp = allRoutes.reduce((acc, r) => acc + r.cashExpenses, 0);
    
    let totalAgencyExpenses = 0;
    let totalCommissions = 0;
    let agencyDiffSum = 0;

    allAgencies.forEach(a => {
        // Calculate Commission
        const rule = commissions.find(c => c.targetType === 'AGENCY' && c.targetId === a.agencyId && c.active);
        const pct = rule ? rule.percentage : 0;
        const commVal = a.valueInformed * (pct / 100);
        totalCommissions += commVal;

        // Calculate Expenses Sum
        const expSum = (a.expenses || []).reduce((sum, e) => sum + e.amount, 0);
        totalAgencyExpenses += expSum;

        // Calculate Expected Net & Diff
        const expectedNet = a.valueInformed - commVal - expSum;
        const diff = a.valueReceived - expectedNet;
        agencyDiffSum += diff;
    });

    // 4. Actual Cash (Entregue/Depositado)
    const routeHanded = allRoutes.reduce((acc, r) => acc + r.cashHanded, 0);
    const agencyReceived = allAgencies.reduce((acc, a) => acc + a.valueReceived, 0);
    const netCash = routeHanded + agencyReceived;

    // 5. Total Differences
    const routeDiffSum = allRoutes.reduce((acc, r) => acc + r.diff, 0);
    const totalDiff = routeDiffSum + agencyDiffSum;

    const pendingRoutes = allRoutes.filter(r => r.status === 'OPEN').length;
    const pendingAgencies = allAgencies.filter(a => a.status === 'OPEN').length;

    setReport({
      routes: allRoutes,
      agencies: allAgencies,
      totalRouteRevenue: routeRev,
      totalAgencyRevenue: agencyRev,
      totalRevenue,
      totalExpenses: routeExp,
      totalAgencyExpenses, // Added
      totalCommissions,
      netCash,
      diff: totalDiff,
      isClosed: !!dailyClose,
      closedAt: dailyClose?.closedAt,
      pendingCount: pendingRoutes + pendingAgencies
    });

    if (!dailyClose) setShowDetails(true);
  };

  const handleRequestClose = () => {
    if (!report) return;
    if (selectedDate > getLocalDate()) return alert("Não é permitido fechar o caixa de uma data futura.");
    setShowConfirmModal(true);
  };

  const confirmCloseDay = () => {
    if (!report) return;

    try {
        const close: DailyClose = {
          id: Date.now().toString(),
          date: selectedDate,
          totalRouteRevenue: report.totalRouteRevenue, 
          totalAgencyRevenue: report.totalAgencyRevenue,
          totalExpenses: report.totalExpenses,
          totalAgencyExpenses: report.totalAgencyExpenses,
          totalCommissions: report.totalCommissions, 
          netResult: report.netCash,
          totalDiff: report.diff,
          closedAt: new Date().toISOString()
        };

        storage.saveDailyClose(close);
        
        // Force Close Items
        report.routes.forEach(r => { if(r.status === 'OPEN') storage.saveRouteCash({...r, status: 'CLOSED'}) });
        report.agencies.forEach(a => { 
            if(a.status === 'OPEN') {
                 const rule = commissions.find(c => c.targetType === 'AGENCY' && c.targetId === a.agencyId && c.active);
                 const pct = rule ? rule.percentage : 0;
                 const commVal = a.valueInformed * (pct / 100);
                 const expSum = (a.expenses || []).reduce((s, e) => s + e.amount, 0);
                 const expected = a.valueInformed - commVal - expSum;
                 const diff = a.valueReceived - expected;
                 storage.saveAgencyCash({...a, diff: diff, status: 'CLOSED'});
            }
        });

        setShowConfirmModal(false);
        loadReport();
    } catch (e: any) {
        alert("Erro ao fechar caixa: " + e.message);
    }
  };

  // --- COLUMNS DEFINITION FOR GENERIC TABLE ---
  const routeColumns: Column<RouteCash>[] = [
    { header: "Motorista", render: (r) => {
        const drv = drivers.find(d => d.id === r.driverId)?.name || '???';
        return <div><div className="font-bold text-slate-700 text-xs">{drv}</div><div className="text-[10px] text-slate-400">ID: {r.id.substring(0,6)}</div></div>;
    }},
    { header: "Entregue", render: (r) => <div className="font-bold text-slate-700">{formatMoney(r.cashHanded)}</div>, align: 'right' },
    { header: "Dif.", render: (r) => <div className={`font-bold text-xs ${r.diff < -0.1 ? 'text-red-500' : 'text-slate-300'}`}>{formatMoney(r.diff)}</div>, align: 'right' },
    { header: "Status", render: (r) => r.status === 'CLOSED' ? <Lock size={16} className="text-green-500 mx-auto"/> : <AlertTriangle size={16} className="text-amber-500 mx-auto"/>, align: 'center' }
  ];

  const agencyColumns: Column<AgencyCash>[] = [
    { header: "Agência", render: (a) => {
        const agName = agencies.find(x => x.id === a.agencyId)?.name || '???';
        return <div className="font-bold text-slate-700 text-xs">{agName}</div>;
    }},
    { header: "Recebido", render: (a) => <div className="font-bold text-slate-700">{formatMoney(a.valueReceived)}</div>, align: 'right' },
    { header: "Dif.", render: (a) => {
        const rule = commissions.find(c => c.targetType === 'AGENCY' && c.targetId === a.agencyId && c.active);
        const pct = rule ? rule.percentage : 0;
        const commVal = a.valueInformed * (pct / 100);
        const expSum = (a.expenses || []).reduce((s, e) => s + e.amount, 0);
        const expected = a.valueInformed - commVal - expSum;
        const diff = a.valueReceived - expected;
        return <div className={`font-bold text-xs ${diff < -0.1 ? 'text-red-500' : 'text-slate-300'}`}>{formatMoney(diff)}</div>;
    }, align: 'right' },
    { header: "Status", render: (a) => a.status === 'CLOSED' ? <Lock size={16} className="text-green-500 mx-auto"/> : <AlertTriangle size={16} className="text-amber-500 mx-auto"/>, align: 'center' }
  ];

  if (!report) return <div className="p-8 text-center">Carregando auditoria...</div>;

  return (
    <div className="space-y-6 pb-24">
      
      {/* Date Selector - Dark Theme */}
      <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900 border-slate-800 shadow-md text-white">
        <div className="flex items-center gap-3 w-full md:w-auto">
           <div className="bg-slate-800 p-2 rounded-lg text-blue-400">
              <Calendar size={24}/>
           </div>
           <div className="flex-1">
              <label className="block text-xs font-bold text-slate-400 uppercase">Data de Conferência</label>
              <input 
                type="date" 
                className={`bg-transparent border-none text-white text-xl font-bold p-0 focus:ring-0 cursor-pointer ${DARK_INPUT_CLASS} w-auto`}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
           </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
             {report.isClosed ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg shadow-sm w-full justify-center md:w-auto">
                   <Lock size={16} /> <span className="font-bold text-sm">CAIXA FECHADO</span>
                </div>
             ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-lg shadow-sm w-full justify-center md:w-auto animate-pulse">
                   <ShieldCheck size={16} /> <span className="font-bold text-sm">DISPONÍVEL</span>
                </div>
             )}
             <Button variant="secondary" onClick={loadReport} className="!p-2.5 bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
                <Search size={18} />
             </Button>
        </div>
      </Card>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="p-4 border-t-4 border-blue-600 bg-white">
             <p className="text-xs font-bold text-slate-500 uppercase">Vendas Brutas (Total)</p>
             <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{formatMoney(report.totalRevenue)}</h3>
             <p className="text-[10px] text-slate-400 mt-1 font-medium">Passagens + Agências</p>
          </Card>
          <Card className="p-4 border-t-4 border-red-500 bg-white">
             <p className="text-xs font-bold text-slate-500 uppercase">Saídas (Despesas)</p>
             <h3 className="text-2xl font-extrabold text-red-600 mt-1">{formatMoney(report.totalExpenses + report.totalAgencyExpenses)}</h3>
             <p className="text-[10px] text-slate-400 mt-1 font-medium">Rotas + Agências</p>
          </Card>
           <Card className="p-4 border-t-4 border-purple-500 bg-white">
             <p className="text-xs font-bold text-slate-500 uppercase">Comissões</p>
             <h3 className="text-2xl font-extrabold text-purple-700 mt-1">{formatMoney(report.totalCommissions)}</h3>
             <p className="text-[10px] text-slate-400 mt-1 font-medium">Retidas na fonte</p>
          </Card>
          <Card className="p-4 border-t-4 border-green-600 bg-white">
             <p className="text-xs font-bold text-slate-500 uppercase">Saldo em Caixa</p>
             <h3 className="text-2xl font-extrabold text-green-700 mt-1">{formatMoney(report.netCash)}</h3>
             <p className="text-[10px] text-slate-400 mt-1 font-medium">Entregue / Depositado</p>
          </Card>
          
          <Card className={`p-4 border-t-4 bg-white ${Math.abs(report.diff) > 0.1 ? 'border-amber-500 bg-amber-50/30' : 'border-slate-300'}`}>
             <div className="flex justify-between items-start">
                 <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">Quebras / Sobras</p>
                    <h3 className={`text-2xl font-extrabold mt-1 ${report.diff < -0.1 ? 'text-red-600' : (report.diff > 0.1 ? 'text-blue-600' : 'text-slate-400')}`}>
                        {formatMoney(report.diff)}
                    </h3>
                 </div>
                 {Math.abs(report.diff) > 0.1 && <AlertOctagon className="text-amber-500" size={24}/>}
             </div>
             <p className="text-[10px] text-slate-500 mt-1 font-bold">
                 {report.diff < -0.1 ? 'FALTA DE CAIXA' : (report.diff > 0.1 ? 'SOBRA DE CAIXA' : 'CONFERÊNCIA OK')}
             </p>
          </Card>
      </div>

      {/* Details Section - USING GENERIC TABLE MANAGER */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <button onClick={() => setShowDetails(!showDetails)} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200">
            <div className="flex items-center gap-2">
                <FileText className="text-blue-600" size={20}/>
                <h3 className="font-bold text-slate-800">Auditoria Detalhada</h3>
                <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">
                    {report.routes.length + report.agencies.length} Registros
                </span>
            </div>
            {showDetails ? <ChevronUp size={20} className="text-slate-400"/> : <ChevronDown size={20} className="text-slate-400"/>}
         </button>

         {showDetails && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 bg-slate-50">
                {/* Routes Table */}
                <div>
                    <div className="mb-2 font-bold text-xs text-slate-500 uppercase flex items-center gap-2">
                        <Bus size={14}/> Viagens (Rotas)
                    </div>
                    <GenericTableManager<RouteCash>
                        title="Rotas"
                        items={report.routes}
                        columns={routeColumns}
                        headless={true} 
                    />
                </div>

                {/* Agencies Table */}
                <div>
                    <div className="mb-2 font-bold text-xs text-slate-500 uppercase flex items-center gap-2">
                        <Building2 size={14}/> Agências
                    </div>
                    <GenericTableManager<AgencyCash>
                        title="Agências"
                        items={report.agencies}
                        columns={agencyColumns}
                        headless={true}
                    />
                </div>
            </div>
         )}
      </div>

      {/* Footer / Actions */}
      {!report.isClosed ? (
        <div className="fixed bottom-0 left-0 md:left-64 right-0 p-4 bg-white border-t border-slate-200 flex justify-between items-center z-10 shadow-lg">
            <div>
                <p className="text-xs text-slate-500 font-medium">Status do Caixa</p>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    <span className="font-bold text-slate-800">ABERTO - {report.pendingCount} Itens Pendentes</span>
                </div>
            </div>
            <Button onClick={handleRequestClose} variant="primary" className="shadow-lg shadow-blue-900/20 px-8 py-3 text-base">
                <CheckCircle size={20} /> Fechar Caixa do Dia
            </Button>
        </div>
      ) : (
        <div className="bg-slate-100 p-6 rounded-lg border border-slate-200 text-center flex flex-col items-center justify-center">
            <div className="bg-slate-200 p-3 rounded-full mb-3">
                <Lock className="text-slate-500" size={32}/>
            </div>
            <p className="font-bold text-slate-800 text-lg">Caixa Fechado e Auditado</p>
            <p className="text-sm text-slate-500">Operação encerrada em: {new Date(report.closedAt!).toLocaleString('pt-BR')}</p>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md p-0 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-extrabold text-lg text-slate-800 flex items-center gap-2">
                <Lock size={20} className="text-blue-600"/>
                Confirmar Fechamento
              </h3>
              <button onClick={() => setShowConfirmModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="text-center mb-4">
                  <p className="text-sm text-slate-500 mb-1">Você está fechando o caixa do dia</p>
                  <p className="text-2xl font-extrabold text-slate-800">{formatDateDisplay(selectedDate)}</p>
              </div>

              {report.pendingCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3">
                   <AlertTriangle className="text-amber-600 shrink-0" size={20}/>
                   <div>
                       <p className="text-amber-800 text-sm font-bold">ATENÇÃO: Itens Pendentes</p>
                       <p className="text-amber-700 text-xs mt-1">
                         Existem <strong>{report.pendingCount}</strong> lançamentos não conferidos.
                       </p>
                   </div>
                </div>
              )}

              {Math.abs(report.diff) > 0.1 && (
                 <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-3">
                    <AlertOctagon className="text-red-600 shrink-0" size={20}/>
                    <div>
                        <p className="text-red-800 text-sm font-bold">Diferença de Caixa</p>
                        <p className="text-red-700 text-xs mt-1">
                            O caixa não bate (Diferença de <strong>{formatMoney(report.diff)}</strong>).
                        </p>
                    </div>
                 </div>
              )}

              <p className="text-xs text-slate-500 text-center px-4 mt-4">
                  Ao confirmar, <strong>todos os registros desta data serão bloqueados</strong>.
              </p>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>Voltar</Button>
              <Button onClick={confirmCloseDay} className="bg-blue-700 hover:bg-blue-800 text-white shadow-lg">
                <Lock size={16} /> Fechar Caixa
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
