
import React, { useState, useEffect } from 'react';
import { Card, Button } from '../components/Layout';
import { storage, getLocalDate, formatDateDisplay, money } from '../services/storageService';
import { DailyClose, RouteCash, AgencyCash, Driver, Agency, CommissionRule, TourismService, GeneralExpense } from '../types';
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
  ShieldCheck,
  MapPinned,
  Receipt,
  Download,
  Save
} from 'lucide-react';

const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// Standard Styles for Closing
const INPUT_CLASS = "bg-white border border-slate-300 text-slate-800 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-bold shadow-sm transition-all";

export const ClosingPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(getLocalDate());
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [hasBackedUp, setHasBackedUp] = useState(false); // Force backup check
  
  // Data State
  const [report, setReport] = useState<{
    routes: RouteCash[];
    agencies: AgencyCash[];
    tourism: TourismService[];
    generalExpenses: GeneralExpense[]; // ADDED
    
    // Financials
    totalRouteRevenue: number;
    totalAgencyRevenue: number;
    totalTourismRevenue: number;
    totalRevenue: number;   // Gross Sales
    
    totalExpenses: number;  // Cash Expenses (Routes)
    totalAgencyExpenses: number; // Agency Expenses
    totalTourismExpenses: number; // Tourism Expenses
    totalGeneralExpenses: number; // ADDED: General Expenses paid in CASH

    totalCommissions: number; // Agency Commissions

    netCash: number;        // Physical Cash Handed + Received + Tourism Received - Cash Bills
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
    
    // Tourism logic: Departure Date matters.
    const allTourism = storage.getTourismServices().filter(t => 
        t.departureDate === selectedDate && 
        (t.status === 'CONFIRMED' || t.status === 'COMPLETED')
    );

    // General Expenses (Cash Only)
    // CRITICAL FIX: Ensure we only count PAID items where Payment Date is TODAY
    const cashBills = storage.getGeneralExpenses().filter(e => 
        e.paymentMethod === 'CASH' && 
        e.status === 'PAID' &&
        (e.paidAt === selectedDate || (!e.paidAt && e.date === selectedDate)) // Fallback to due date if paidAt missing (legacy)
    );

    // --- 1. GROSS REVENUES (Competence View) ---
    const routeRev = allRoutes.reduce((acc, r) => money(acc + r.revenueInformed), 0);
    const agencyRev = allAgencies.reduce((acc, a) => money(acc + a.valueInformed), 0); 
    const tourismRev = allTourism.reduce((acc, t) => money(acc + t.contractValue), 0);
    const totalRevenue = money(routeRev + agencyRev + tourismRev);

    // --- 2. OPERATIONAL EXPENSES ---
    const routeExp = allRoutes.reduce((acc, r) => money(acc + r.cashExpenses), 0);
    const tourismExp = allTourism.reduce((acc, t) => money(acc + (t.expenses || []).reduce((s, e) => money(s + e.amount), 0)), 0);
    const generalExp = cashBills.reduce((acc, e) => money(acc + e.amount), 0);
    
    let totalAgencyExpenses = 0;
    let totalCommissions = 0;
    let agencyDiffSum = 0;

    allAgencies.forEach(a => {
        // Use snapshot if available, else current rule
        let pct = a.commissionPctSnapshot;
        if (pct === undefined) {
             const rule = commissions.find(c => c.targetType === 'AGENCY' && c.targetId === a.agencyId && c.active);
             pct = rule ? rule.percentage : 0;
        }
        
        const commVal = money(a.valueInformed * (pct / 100));
        totalCommissions = money(totalCommissions + commVal);

        // Calculate Expenses Sum
        const expSum = (a.expenses || []).reduce((sum, e) => money(sum + e.amount), 0);
        totalAgencyExpenses = money(totalAgencyExpenses + expSum);

        // Calculate Expected Net & Diff
        const expectedNet = money(a.valueInformed - commVal - expSum);
        const diff = money(a.valueReceived - expectedNet);
        agencyDiffSum = money(agencyDiffSum + diff);
    });

    // --- 3. PHYSICAL CASH FLOW (The Box) ---
    const routeHanded = allRoutes.reduce((acc, r) => money(acc + r.cashHanded), 0);
    const agencyReceived = allAgencies.reduce((acc, a) => money(acc + a.valueReceived), 0);
    
    // Tourism Net Cash Logic:
    // If receivedValue is explicitly set, use it.
    // If not set, but COMPLETED, assume full contract minus expenses (Legacy).
    // If CONFIRMED but not completed, check if receivedValue exists (Deposit), otherwise 0.
    const tourismNet = allTourism.reduce((acc, t) => {
        if (t.receivedValue !== undefined) return money(acc + t.receivedValue);
        // Fallback for legacy data without receivedValue field
        if (t.status === 'COMPLETED') {
             const tExp = (t.expenses || []).reduce((s, e) => money(s + e.amount), 0);
             return money(acc + (t.contractValue - tExp));
        }
        return acc;
    }, 0);
    
    // NET CASH FORMULA:
    // (+) Money from Drivers (Routes)
    // (+) Money from Agencies
    // (+) Money from Tourism
    // (-) Cash paid for Bills (General Expenses)
    const netCash = money((routeHanded + agencyReceived + tourismNet) - generalExp);

    // --- 4. DIFFERENCES (Quebras) ---
    const routeDiffSum = allRoutes.reduce((acc, r) => money(acc + r.diff), 0);
    const totalDiff = money(routeDiffSum + agencyDiffSum);

    const pendingRoutes = allRoutes.filter(r => r.status === 'OPEN').length;
    const pendingAgencies = allAgencies.filter(a => a.status === 'OPEN').length;

    setReport({
      routes: allRoutes,
      agencies: allAgencies,
      tourism: allTourism,
      generalExpenses: cashBills,
      
      totalRouteRevenue: routeRev,
      totalAgencyRevenue: agencyRev,
      totalTourismRevenue: tourismRev,
      totalRevenue,
      
      totalExpenses: routeExp,
      totalAgencyExpenses, 
      totalTourismExpenses: tourismExp,
      totalGeneralExpenses: generalExp,
      
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
    const today = getLocalDate();
    if (selectedDate > today) return alert("ERRO CRÍTICO: Não é permitido fechar o caixa de uma data futura. O sistema não permite previsões de fechamento.");
    setHasBackedUp(false); // Reset backup check
    setShowConfirmModal(true);
  };

  // PHASE 1 FIX: FORCE BACKUP DOWNLOAD
  const handleDownloadBackup = () => {
        const data = storage.exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `OnniBox_FECHAMENTO_${selectedDate}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setHasBackedUp(true);
  };

  const confirmCloseDay = () => {
    if (!report) return;
    
    // PHASE 1 FIX: Safety check
    if (!hasBackedUp && !confirm("ATENÇÃO: Você não baixou o backup de segurança. Se o navegador for limpo, você perderá os dados de hoje. Deseja fechar mesmo assim? (Não recomendado)")) {
        return;
    }

    try {
        const close: DailyClose = {
          id: Date.now().toString(),
          date: selectedDate,
          totalRouteRevenue: report.totalRouteRevenue, 
          totalAgencyRevenue: report.totalAgencyRevenue,
          totalTourismRevenue: report.totalTourismRevenue,
          
          totalExpenses: report.totalExpenses,
          totalAgencyExpenses: report.totalAgencyExpenses,
          totalTourismExpenses: report.totalTourismExpenses,
          totalGeneralExpenses: report.totalGeneralExpenses,
          
          totalCommissions: report.totalCommissions, 
          netResult: report.netCash,
          totalDiff: report.diff,
          closedAt: new Date().toISOString()
        };

        storage.saveDailyClose(close);
        
        // Force Close Items
        report.routes.forEach(r => { if(r.status === 'OPEN') storage.saveRouteCash({...r, status: 'CLOSED'}) });
        
        // When closing agencies, ensure we burn the commission snapshot if it wasn't there
        report.agencies.forEach(a => { 
            if(a.status === 'OPEN') {
                 let pct = a.commissionPctSnapshot;
                 if (pct === undefined) {
                    const rule = commissions.find(c => c.targetType === 'AGENCY' && c.targetId === a.agencyId && c.active);
                    pct = rule ? rule.percentage : 0;
                 }
                 // Recalculate Diff to be safe using precision math
                 const commVal = money(a.valueInformed * (pct / 100));
                 const expSum = (a.expenses || []).reduce((s, e) => money(s + e.amount), 0);
                 const expected = money(a.valueInformed - commVal - expSum);
                 const diff = money(a.valueReceived - expected);
                 
                 // Save with snapshot and closed status
                 storage.saveAgencyCash({
                     ...a, 
                     diff: diff, 
                     status: 'CLOSED',
                     commissionPctSnapshot: pct 
                 });
            }
        });

        setShowConfirmModal(false);
        loadReport();
    } catch (e: any) {
        alert("Erro ao fechar caixa: " + e.message);
    }
  };

  const handleDeleteClose = () => {
      if(!confirm("ATENÇÃO: Reabrir o caixa permitirá edições nos registros. Deseja continuar?")) return;
      storage.deleteDailyClose(selectedDate);
      loadReport();
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
    { header: "Dif.", render: (a) => <div className={`font-bold text-xs ${a.diff < -0.1 ? 'text-red-500' : 'text-slate-300'}`}>{formatMoney(a.diff)}</div>, align: 'right' },
    { header: "Status", render: (a) => a.status === 'CLOSED' ? <Lock size={16} className="text-green-500 mx-auto"/> : <AlertTriangle size={16} className="text-amber-500 mx-auto"/>, align: 'center' }
  ];

  const expensesColumns: Column<GeneralExpense>[] = [
      { header: "Descrição", render: (e) => <span className="text-xs font-bold text-slate-700">{e.description}</span> },
      { header: "Valor", render: (e) => <span className="font-bold text-red-600">-{formatMoney(e.amount)}</span>, align: 'right' }
  ];

  if (!report) return <div className="p-8 text-center">Carregando auditoria...</div>;

  return (
    <div className="space-y-6 pb-24">
      
      {/* Date Selector */}
      <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-4 bg-white border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 w-full md:w-auto">
           <div className="bg-slate-100 p-2 rounded-lg text-blue-600 border border-slate-200">
              <Calendar size={24}/>
           </div>
           <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase">Data de Conferência</label>
              <input 
                type="date" 
                className={`${INPUT_CLASS} text-lg py-1 px-3 w-full`}
                value={selectedDate}
                max={getLocalDate()}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
           </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
             {report.isClosed ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg shadow-sm w-full justify-center md:w-auto">
                   <Lock size={16} /> <span className="font-bold text-sm">CAIXA FECHADO</span>
                </div>
             ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg shadow-sm w-full justify-center md:w-auto animate-pulse">
                   <ShieldCheck size={16} /> <span className="font-bold text-sm">DISPONÍVEL</span>
                </div>
             )}
             <Button variant="secondary" onClick={loadReport} className="!p-2.5 bg-white border-slate-300 text-slate-600 hover:bg-slate-50">
                <Search size={18} />
             </Button>
        </div>
      </Card>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="p-4 border-t-4 border-blue-600 bg-white">
             <p className="text-xs font-bold text-slate-500 uppercase">Vendas Brutas</p>
             <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{formatMoney(report.totalRevenue)}</h3>
             <p className="text-[10px] text-slate-400 mt-1 font-medium">Rotas + Agências + Turismo</p>
          </Card>
          <Card className="p-4 border-t-4 border-red-500 bg-white">
             <p className="text-xs font-bold text-slate-500 uppercase">Saídas (Vale/Despesas)</p>
             <h3 className="text-2xl font-extrabold text-red-600 mt-1">{formatMoney(report.totalExpenses + report.totalAgencyExpenses + report.totalTourismExpenses)}</h3>
             <p className="text-[10px] text-slate-400 mt-1 font-medium">Operacional em Viagem</p>
          </Card>
           <Card className="p-4 border-t-4 border-orange-500 bg-white">
             <p className="text-xs font-bold text-slate-500 uppercase">Pagamentos em Caixa</p>
             <h3 className="text-2xl font-extrabold text-orange-700 mt-1">{formatMoney(report.totalGeneralExpenses)}</h3>
             <p className="text-[10px] text-slate-400 mt-1 font-medium">Contas Pagas (Dinheiro)</p>
          </Card>
          <Card className="p-4 border-t-4 border-green-600 bg-white">
             <p className="text-xs font-bold text-slate-500 uppercase">Saldo em Caixa</p>
             <h3 className="text-2xl font-extrabold text-green-700 mt-1">{formatMoney(report.netCash)}</h3>
             <p className="text-[10px] text-slate-400 mt-1 font-medium">Disponível em Mãos</p>
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

      {/* Details Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <button onClick={() => setShowDetails(!showDetails)} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200">
            <div className="flex items-center gap-2">
                <FileText className="text-blue-600" size={20}/>
                <h3 className="font-bold text-slate-800">Auditoria Detalhada</h3>
                <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">
                    {report.routes.length + report.agencies.length + report.tourism.length + report.generalExpenses.length} Registros
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

                {/* General Expenses Table (Cash) */}
                <div>
                    <div className="mb-2 font-bold text-xs text-slate-500 uppercase flex items-center gap-2">
                        <Receipt size={14}/> Contas Pagas (Dinheiro)
                    </div>
                    {report.generalExpenses.length > 0 ? (
                        <GenericTableManager<GeneralExpense>
                            title="Pagamentos Caixa"
                            items={report.generalExpenses}
                            columns={expensesColumns}
                            headless={true}
                        />
                    ) : <div className="text-sm text-slate-400 italic bg-white p-4 border rounded">Nenhum pagamento em dinheiro hoje.</div>}
                </div>

                {/* Tourism Table */}
                <div>
                    <div className="mb-2 font-bold text-xs text-slate-500 uppercase flex items-center gap-2">
                        <MapPinned size={14}/> Turismo
                    </div>
                    {report.tourism.length > 0 ? (
                        <div className="space-y-2">
                            {report.tourism.map(t => (
                                <div key={t.id} className="bg-white p-3 border border-slate-200 rounded flex justify-between text-sm">
                                    <span>{t.destination} ({t.contractorName})</span>
                                    <span className="font-bold text-green-700">
                                        {formatMoney(t.receivedValue !== undefined ? t.receivedValue : (t.status === 'COMPLETED' ? t.contractValue - (t.expenses||[]).reduce((a,b)=>a+b.amount,0) : 0))}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : <div className="text-sm text-slate-400 italic bg-white p-4 border rounded">Nenhuma viagem de turismo hoje.</div>}
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
        <div className="bg-slate-100 p-6 rounded-lg border border-slate-200 text-center flex flex-col items-center justify-center gap-4">
            <div className="flex flex-col items-center">
                <div className="bg-slate-200 p-3 rounded-full mb-3">
                    <Lock className="text-slate-500" size={32}/>
                </div>
                <p className="font-bold text-slate-800 text-lg">Caixa Fechado e Auditado</p>
                <p className="text-sm text-slate-500">Operação encerrada em: {new Date(report.closedAt!).toLocaleString('pt-BR')}</p>
            </div>
            
            <button onClick={handleDeleteClose} className="text-red-600 hover:text-red-700 text-sm font-bold flex items-center gap-2 px-4 py-2 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                <Lock size={14}/> Reabrir Dia (Gerente)
            </button>
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

              {/* SECURITY BACKUP SECTION (PHASE 1 FIX) */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                      <Save size={18} className="text-blue-700"/>
                      <h4 className="font-bold text-blue-900 text-sm">Segurança de Dados</h4>
                  </div>
                  <p className="text-xs text-blue-800 mb-3 leading-tight">
                      Para evitar perda de dados (limpeza de cache), é <strong>obrigatório</strong> baixar uma cópia de segurança antes de fechar.
                  </p>
                  <button 
                    onClick={handleDownloadBackup}
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded font-bold text-xs transition-all ${hasBackedUp ? 'bg-green-600 text-white shadow-sm' : 'bg-white border border-blue-300 text-blue-700 hover:bg-blue-100'}`}
                  >
                      {hasBackedUp ? <><CheckCircle size={14}/> Backup Realizado</> : <><Download size={14}/> Baixar Backup do Dia (JSON)</>}
                  </button>
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

              <p className="text-[10px] text-slate-400 text-center px-4 mt-2">
                  Ao confirmar, todos os registros serão bloqueados.
              </p>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>Voltar</Button>
              <Button onClick={confirmCloseDay} className={`${hasBackedUp ? 'bg-blue-700 hover:bg-blue-800' : 'bg-slate-400 cursor-not-allowed'} text-white shadow-lg transition-colors`} disabled={!hasBackedUp}>
                <Lock size={16} /> Fechar Caixa
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
