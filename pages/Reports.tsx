
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { storage, formatDateDisplay, money } from '../services/storageService';
import { 
  DailyClose, RouteCash, AgencyCash, GeneralExpense, FuelEntry, 
  Vehicle, Line, RouteDef, Supplier, ExpenseType, TourismService, AuditLog
} from '../types';
import { 
  Printer, FileText, Calendar, Filter, PieChart, 
  TrendingUp, Truck, Users, DollarSign, AlertCircle, 
  CheckCircle2, Search, ArrowRight, Download, BarChart3, Receipt
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// --- TYPES & INTERFACES ---

type ReportCategory = 'CASH' | 'FINANCIAL' | 'PAYABLES' | 'FLEET' | 'AUDIT';

interface ReportDefinition {
  id: string;
  category: ReportCategory;
  title: string;
  description: string;
  orientation: 'portrait' | 'landscape';
}

interface ReportData {
  headers: string[];
  rows: any[][];
  summary: { label: string; value: string | number; color?: string; subtext?: string }[];
  footerNote?: string;
  generatedAt: string;
}

const REPORT_LIST: ReportDefinition[] = [
  // 1. CAIXA & FLUXO
  { id: 'CASH_FLOW_DAILY', category: 'CASH', title: 'Fluxo de Caixa Diário (Analítico)', description: 'Detalhamento cronológico de todas as entradas e saídas de dinheiro.', orientation: 'landscape' },
  { id: 'CASH_BY_ROUTE', category: 'CASH', title: 'Arrecadação por Linha/Rota', description: 'Consolidado de receitas, passageiros e despesas por rota operacional.', orientation: 'portrait' },
  
  // 2. FINANCEIRO GERENCIAL
  { id: 'DRE_SYNTHETIC', category: 'FINANCIAL', title: 'D.R.E. Gerencial (Competência)', description: 'Demonstrativo de Resultado do Exercício. Receita vs Despesa (Independente do pagamento).', orientation: 'portrait' },
  { id: 'FINANCIAL_RESULTS', category: 'FINANCIAL', title: 'Resumo Financeiro Consolidado', description: 'Visão macro de receitas, custos e margens.', orientation: 'portrait' },
  
  // 3. CONTAS A PAGAR
  { id: 'PAYABLES_OPEN', category: 'PAYABLES', title: 'Contas a Pagar (Aberto)', description: 'Obrigações financeiras pendentes e vencidas.', orientation: 'portrait' },
  { id: 'PAYABLES_PAID', category: 'PAYABLES', title: 'Histórico de Pagamentos', description: 'Contas liquidadas no período.', orientation: 'portrait' },
  
  // 4. FROTA
  { id: 'FUEL_EFFICIENCY', category: 'FLEET', title: 'Eficiência de Combustível (Km/L)', description: 'Análise de consumo, custo por km e desempenho da frota.', orientation: 'landscape' },
  
  // 5. AUDITORIA
  { id: 'AUDIT_CLOSING', category: 'AUDIT', title: 'Conferência de Fechamentos', description: 'Auditoria de integridade dos fechamentos de caixa diários.', orientation: 'portrait' },
];

const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// --- PRINTABLE COMPONENT ---
const PrintableReport = React.forwardRef<HTMLDivElement, { 
    data: ReportData; 
    definition: ReportDefinition; 
    dateRange: { start: string, end: string }; 
    user: string;
}>(({ data, definition, dateRange, user }, ref) => {
    
    return (
        <div ref={ref} className="print-container bg-white p-8 min-h-screen text-slate-900 font-sans">
            {/* Header A4 */}
            <div className="border-b-2 border-slate-800 pb-4 mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold uppercase tracking-tight text-slate-900">{definition.title}</h1>
                    <p className="text-sm text-slate-500 mt-1">{definition.description}</p>
                    <div className="mt-2 text-xs font-mono text-slate-600 border border-slate-200 bg-slate-50 px-2 py-1 inline-block rounded">
                        Período: <strong>{formatDateDisplay(dateRange.start)}</strong> até <strong>{formatDateDisplay(dateRange.end)}</strong>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xl font-black tracking-widest text-slate-900">ONNIBOX</div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Gestão Inteligente</div>
                    <div className="text-[10px] text-slate-500 mt-2">Emissão: {data.generatedAt}</div>
                    <div className="text-[10px] text-slate-500">Por: {user}</div>
                </div>
            </div>

            {/* Summary Cards (Top) */}
            {data.summary.length > 0 && (
                <div className="grid grid-cols-4 gap-4 mb-8 bg-slate-50 p-4 rounded-lg border border-slate-200 print:bg-white print:border-slate-300">
                    {data.summary.map((item, idx) => (
                        <div key={idx} className="border-l-4 pl-3 py-1" style={{ borderColor: item.color || '#cbd5e1' }}>
                            <div className="text-[10px] uppercase font-bold text-slate-500">{item.label}</div>
                            <div className="text-lg font-bold text-slate-800">{typeof item.value === 'number' ? formatMoney(item.value) : item.value}</div>
                            {item.subtext && <div className="text-[10px] text-slate-400 mt-0.5">{item.subtext}</div>}
                        </div>
                    ))}
                </div>
            )}

            {/* Main Table */}
            <div className="">
                <table className="w-full text-sm text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-100 border-y-2 border-slate-300 text-slate-700 text-xs uppercase tracking-wider print:bg-slate-100">
                            {data.headers.map((h, i) => (
                                <th key={i} className={`py-2 px-2 font-bold ${i > 0 ? 'text-right' : 'text-left'}`}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {data.rows.length > 0 ? (
                            data.rows.map((row, rIdx) => {
                                const isTotalRow = row[0] === 'TOTAL' || row[0] === 'SALDO FINAL' || (typeof row[0] === 'string' && row[0].includes('(=)'));
                                return (
                                    <tr key={rIdx} className={`break-inside-avoid ${isTotalRow ? 'bg-slate-100 font-bold border-t-2 border-slate-300' : 'even:bg-slate-50'}`}>
                                        {row.map((cell, cIdx) => (
                                            <td key={cIdx} className={`py-1.5 px-2 ${cIdx > 0 ? 'text-right' : 'text-left'} text-xs text-slate-700`}>
                                                {cell}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={data.headers.length} className="py-12 text-center text-slate-400 italic bg-slate-50 border-b border-slate-200">
                                    Nenhum registro encontrado para os filtros selecionados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer Note */}
            {data.footerNote && (
                <div className="mt-8 text-xs text-slate-500 italic border-l-2 border-slate-300 pl-3 bg-slate-50 p-2">
                    <strong>Nota Explicativa:</strong> {data.footerNote}
                </div>
            )}

            {/* Print Footer */}
            <div className="fixed bottom-0 left-0 right-0 hidden print:flex justify-between items-center px-8 py-4 border-t border-slate-300 text-[9px] text-slate-400 bg-white">
                <div>OnniBox System - Relatório Gerado Automaticamente</div>
                <div>Este documento é confidencial e para uso interno.</div>
            </div>
        </div>
    );
});

// --- MAIN PAGE COMPONENT ---

export const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  
  // Filters
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
  });
  const [selectedReportId, setSelectedReportId] = useState<string>('DRE_SYNTHETIC');
  
  // Data Store
  const [data, setData] = useState<any>({});
  
  const componentRef = useRef<HTMLDivElement>(null);

  // Load Data
  useEffect(() => {
    setData({
        routes: storage.getRouteCash(),
        agencies: storage.getAgencyCash(),
        expenses: storage.getGeneralExpenses(),
        fuel: storage.getFuelEntries(),
        vehicles: storage.getVehicles(),
        lines: storage.getLines(),
        tourism: storage.getTourismServices(),
        closes: storage.getDailyCloses(),
        suppliers: storage.getSuppliers(),
        types: storage.getExpenseTypes()
    });
  }, []);

  // --- REPORT ENGINE ---
  const reportOutput = useMemo((): ReportData => {
    if (!data.routes) return { headers: [], rows: [], summary: [], generatedAt: '' }; // Loading

    const filterDate = (date: string) => date >= dateRange.start && date <= dateRange.end;
    
    // --------------------------------------------------------------------------------
    // 1. CASH FLOW DAILY (FLUXO DE CAIXA - REGIME DE CAIXA)
    // --------------------------------------------------------------------------------
    if (selectedReportId === 'CASH_FLOW_DAILY') {
        const rows: any[] = [];
        let runningBalance = 0; 
        // Note: Real Cash Flow should calculate initial balance, but simplified here starting from 0 or filtered period
        
        // Collect all events
        const events: { date: string, desc: string, in: number, out: number, type: string }[] = [];

        // Inflows
        data.routes.filter((r:any) => filterDate(r.date)).forEach((r:any) => events.push({ date: r.date, desc: `Receita Rota (Mot. ${r.driverId})`, in: r.cashHanded, out: 0, type: 'ROTA' }));
        data.agencies.filter((a:any) => filterDate(a.date)).forEach((a:any) => events.push({ date: a.date, desc: `Repasse Agência (${a.agencyId})`, in: a.valueReceived, out: 0, type: 'AGENCIA' }));
        data.tourism.filter((t:any) => t.receivedValue && filterDate(t.departureDate)).forEach((t:any) => events.push({ date: t.departureDate, desc: `Turismo (${t.destination})`, in: t.receivedValue, out: 0, type: 'TURISMO' }));

        // Outflows (Expenses PAID in Cash or Bank within the period)
        // General Expenses
        data.expenses.filter((e:any) => e.status === 'PAID' && filterDate(e.paidAt || e.date)).forEach((e:any) => events.push({ date: e.paidAt || e.date, desc: `Despesa: ${e.description}`, in: 0, out: e.amount, type: 'DESPESA' }));
        
        // Sort Chronologically
        events.sort((a,b) => a.date.localeCompare(b.date));

        let totalIn = 0; 
        let totalOut = 0;

        events.forEach(e => {
            runningBalance += (e.in - e.out);
            totalIn += e.in;
            totalOut += e.out;
            rows.push([
                formatDateDisplay(e.date),
                e.desc,
                e.type,
                e.in > 0 ? formatMoney(e.in) : '-',
                e.out > 0 ? <span className="text-red-700">-{formatMoney(e.out)}</span> : '-',
                <span className="font-bold">{formatMoney(runningBalance)}</span>
            ]);
        });

        rows.push(['TOTAL', 'Resumo do Período', '', formatMoney(totalIn), formatMoney(totalOut), formatMoney(totalIn - totalOut)]);

        return {
            headers: ['Data', 'Descrição', 'Categoria', 'Entradas', 'Saídas', 'Saldo Acumulado'],
            rows,
            summary: [
                { label: 'Total Entradas', value: totalIn, color: '#16a34a' },
                { label: 'Total Saídas', value: totalOut, color: '#dc2626' },
                { label: 'Resultado de Caixa', value: totalIn - totalOut, color: '#2563eb', subtext: 'Superávit/Déficit do Período' },
            ],
            footerNote: "Este relatório demonstra a movimentação financeira efetiva (Regime de Caixa). Considera apenas valores recebidos ou pagos nas datas indicadas.",
            generatedAt: new Date().toLocaleString()
        };
    }

    // --------------------------------------------------------------------------------
    // 2. DRE SYNTHETIC (REGIME DE COMPETÊNCIA)
    // --------------------------------------------------------------------------------
    if (selectedReportId === 'DRE_SYNTHETIC') {
        // Receita Operacional Bruta
        const revRoutes = data.routes.filter((r: any) => filterDate(r.date)).reduce((a: number, b: any) => a + b.revenueInformed, 0);
        const revAgencies = data.agencies.filter((a: any) => filterDate(a.date)).reduce((a: number, b: any) => a + b.valueInformed, 0);
        const revTourism = data.tourism.filter((t: any) => filterDate(t.departureDate) && t.status !== 'CANCELED').reduce((a: number, b: any) => a + b.contractValue, 0);
        const totalRev = revRoutes + revAgencies + revTourism;

        // Custos Variáveis (Diretos)
        const costFuel = data.fuel.filter((f: any) => filterDate(f.date)).reduce((a: number, b: any) => a + b.amount, 0);
        const costRouteExp = data.routes.filter((r: any) => filterDate(r.date)).reduce((a: number, b: any) => a + b.cashExpenses, 0);
        // Estimate Agency Commissions (Using approx based on received vs informed diff if detailed not avail)
        // Better: Loop agencies and calc commission based on rule would be ideal, but here we use the diff logic or assume standard.
        // Simplified: ValueInformed - ValueReceived - Expenses ~= Commission
        // However, in our system: Commission is implicit. Let's use `valueInformed * 0.10` as estimate or the gaps.
        // Let's use the explicit Agency Expenses field + Commissions
        const costAgencyExp = data.agencies.filter((a: any) => filterDate(a.date)).reduce((a: number, b: any) => {
             const exps = (b.expenses || []).reduce((s:number, e:any) => s+e.amount, 0);
             // Commission estimation: ValueInformed - ValueReceived - Expenses (approx)
             // In a real scenario, we should store commission value explicitly.
             const comm = Math.max(0, b.valueInformed - b.valueReceived - exps); 
             return a + exps + comm;
        }, 0);
        
        const totalVariable = costFuel + costRouteExp + costAgencyExp;
        const contribMargin = totalRev - totalVariable;

        // Despesas Fixas (Operacionais / Administrativas)
        // General Expenses filtered by DATE (Accrual basis), regardless of payment status
        const fixedExp = data.expenses.filter((e: any) => filterDate(e.date)).reduce((a: number, b: any) => a + b.amount, 0);

        // EBITDA (Simplificado)
        const ebitda = contribMargin - fixedExp;

        const rows = [
            ['(+) RECEITA BRUTA OPERACIONAL', formatMoney(totalRev), '100%'],
            ['   Receita de Linhas', formatMoney(revRoutes), totalRev ? ((revRoutes/totalRev)*100).toFixed(1)+'%' : '0%'],
            ['   Receita de Agências', formatMoney(revAgencies), totalRev ? ((revAgencies/totalRev)*100).toFixed(1)+'%' : '0%'],
            ['   Receita de Turismo', formatMoney(revTourism), totalRev ? ((revTourism/totalRev)*100).toFixed(1)+'%' : '0%'],
            ['', '', ''],
            ['(-) CUSTOS VARIÁVEIS', formatMoney(totalVariable), totalRev ? ((totalVariable/totalRev)*100).toFixed(1)+'%' : '0%'],
            ['   Combustível', formatMoney(costFuel), totalRev ? ((costFuel/totalRev)*100).toFixed(1)+'%' : '0%'],
            ['   Despesas de Viagem', formatMoney(costRouteExp), totalRev ? ((costRouteExp/totalRev)*100).toFixed(1)+'%' : '0%'],
            ['   Comissões e Taxas', formatMoney(costAgencyExp), totalRev ? ((costAgencyExp/totalRev)*100).toFixed(1)+'%' : '0%'],
            ['', '', ''],
            ['(=) MARGEM DE CONTRIBUIÇÃO', formatMoney(contribMargin), totalRev ? ((contribMargin/totalRev)*100).toFixed(1)+'%' : '0%'],
            ['', '', ''],
            ['(-) DESPESAS OPERACIONAIS (FIXAS)', formatMoney(fixedExp), totalRev ? ((fixedExp/totalRev)*100).toFixed(1)+'%' : '0%'],
            ['   Despesas Gerais / Adm', formatMoney(fixedExp), '-'],
            ['', '', ''],
            ['(=) RESULTADO LÍQUIDO (EBITDA)', formatMoney(ebitda), totalRev ? ((ebitda/totalRev)*100).toFixed(1)+'%' : '0%']
        ];

        return {
            headers: ['Descrição da Conta', 'Valor R$', 'Análise Vertical %'],
            rows,
            summary: [
                { label: 'Faturamento Bruto', value: totalRev, color: '#1e293b' },
                { label: 'Custos Totais', value: totalVariable + fixedExp, color: '#dc2626' },
                { label: 'Resultado Líquido', value: ebitda, color: ebitda >= 0 ? '#16a34a' : '#dc2626', subtext: totalRev > 0 ? `Margem Líquida: ${((ebitda/totalRev)*100).toFixed(1)}%` : '' },
            ],
            footerNote: "Este relatório segue o Regime de Competência (Data do Fato Gerador). Receitas e Despesas são contabilizadas na data de emissão/vencimento, independente do pagamento efetivo.",
            generatedAt: new Date().toLocaleString()
        };
    }

    // --------------------------------------------------------------------------------
    // 3. FUEL EFFICIENCY
    // --------------------------------------------------------------------------------
    if (selectedReportId === 'FUEL_EFFICIENCY') {
        const rows: any[] = [];
        const vehicleStats: Record<string, { liters: number, amount: number, dist: number, entries: number }> = {};
        
        // Sort by vehicle and date
        const entries = data.fuel.filter((f: any) => filterDate(f.date)).sort((a:any,b:any) => a.date.localeCompare(b.date) || a.mileage - b.mileage);
        
        // Advanced Algorithm: Calculate distance based on previous entry for same vehicle
        // Note: This only works perfectly if we have the previous entry even if it's outside the date range.
        // For simplicity in this mock, we calculate distance between entries IN range.
        
        const vehicles = data.vehicles;
        
        vehicles.forEach((v: Vehicle) => {
            const vEntries = entries.filter((e:any) => e.vehicleId === v.id);
            if (vEntries.length > 0) {
                let totalLiters = 0;
                let totalAmount = 0;
                let totalDist = 0;

                // We need at least 2 entries or start mileage to calc distance correctly
                // If we have only 1 entry in range, we can't determine distance unless we look back.
                // Simplified: Sum liters and amount. Distance = Last Mileage - First Mileage (Rough approx)
                
                vEntries.forEach(e => {
                    totalLiters += e.liters;
                    totalAmount += e.amount;
                });
                
                // Distance calc
                if (vEntries.length > 1) {
                    totalDist = vEntries[vEntries.length-1].mileage - vEntries[0].mileage;
                } else if (vEntries.length === 1 && v.initialMileage) {
                    totalDist = Math.max(0, vEntries[0].mileage - v.initialMileage);
                }

                vehicleStats[v.id] = { liters: totalLiters, amount: totalAmount, dist: totalDist, entries: vEntries.length };
            }
        });

        Object.entries(vehicleStats).forEach(([vid, stat]) => {
            const vehicle = vehicles.find((v:any) => v.id === vid);
            const kmL = stat.dist > 0 && stat.liters > 0 ? (stat.dist / stat.liters) : 0;
            const costKm = stat.dist > 0 ? (stat.amount / stat.dist) : 0;
            
            rows.push([
                vehicle?.plate || vid,
                vehicle?.description || '-',
                stat.entries,
                stat.dist.toLocaleString() + ' km',
                stat.liters.toFixed(1) + ' L',
                formatMoney(stat.amount),
                <span className={kmL < 2.5 ? 'text-red-600 font-bold' : 'text-green-700 font-bold'}>{kmL.toFixed(2)} km/L</span>,
                'R$ ' + costKm.toFixed(2)
            ]);
        });

        const totalCost = Object.values(vehicleStats).reduce((a,b) => a + b.amount, 0);
        const totalLiters = Object.values(vehicleStats).reduce((a,b) => a + b.liters, 0);

        return {
            headers: ['Placa', 'Modelo', 'Abastecimentos', 'Distância Apurada', 'Consumo (L)', 'Custo Total', 'Média Km/L', 'Custo R$/Km'],
            rows,
            summary: [
                { label: 'Gasto Total Combustível', value: totalCost, color: '#f59e0b' },
                { label: 'Volume Consumido', value: totalLiters.toFixed(1) + ' L', color: '#64748b' },
                { label: 'Preço Médio / Litro', value: totalLiters ? formatMoney(totalCost/totalLiters) : 'R$ 0,00', color: '#6366f1' }
            ],
            footerNote: "A média Km/L é calculada com base na diferença de hodômetro entre o primeiro e o último abastecimento do período selecionado. Veículos com apenas 1 abastecimento podem apresentar distorções se o KM inicial não estiver cadastrado.",
            generatedAt: new Date().toLocaleString()
        };
    }

    // --------------------------------------------------------------------------------
    // 4. PAYABLES (CONTAS A PAGAR)
    // --------------------------------------------------------------------------------
    if (selectedReportId === 'PAYABLES_OPEN' || selectedReportId === 'PAYABLES_PAID') {
        const isPaidMode = selectedReportId === 'PAYABLES_PAID';
        const items = data.expenses.filter((e: GeneralExpense) => {
            // Logic:
            // If report is OPEN: Show PENDING items due in range OR OVERDUE items (due before end range)
            // If report is PAID: Show PAID items paid in range
            if (isPaidMode) {
                const pDate = e.paidAt || e.date;
                return e.status === 'PAID' && pDate >= dateRange.start && pDate <= dateRange.end;
            } else {
                return e.status === 'PENDING' && e.date <= dateRange.end; // Show all up to end date (including past overdue)
            }
        }).sort((a: GeneralExpense, b: GeneralExpense) => a.date.localeCompare(b.date));

        const total = items.reduce((a: number, b: GeneralExpense) => a + b.amount, 0);
        const supplierMap = new Map(data.suppliers.map((s:any) => [s.id, s.name]));
        const typeMap = new Map(data.types.map((t:any) => [t.id, t.name]));

        const rows = items.map((i: GeneralExpense) => [
            formatDateDisplay(i.date),
            isPaidMode ? formatDateDisplay(i.paidAt!) : (i.date < new Date().toISOString().split('T')[0] ? <span className="text-red-600 font-bold">VENCIDA</span> : 'A Vencer'),
            i.description,
            i.supplierId ? supplierMap.get(i.supplierId) : '-',
            typeMap.get(i.typeId) || 'Geral',
            formatMoney(i.amount)
        ]);
        
        rows.push(['TOTAL', '', '', '', '', formatMoney(total)]);

        return {
            headers: ['Vencimento', 'Status/Pagto', 'Descrição', 'Fornecedor', 'Categoria', 'Valor'],
            rows,
            summary: [
                { label: isPaidMode ? 'Total Pago' : 'Total a Pagar', value: total, color: isPaidMode ? '#16a34a' : '#dc2626' },
                { label: 'Qtd. Títulos', value: items.length }
            ],
            generatedAt: new Date().toLocaleString()
        };
    }

    // Default Empty
    return { headers: [], rows: [], summary: [], generatedAt: '' };

  }, [selectedReportId, dateRange, data]);


  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="pb-12 space-y-6 h-[calc(100vh-80px)] flex flex-col">
      
      {/* HEADER & FILTERS (Hidden on Print) */}
      <div className="no-print bg-white p-4 rounded-xl border border-slate-200 shadow-sm shrink-0">
          <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4">
              
              {/* Report Selector */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 xl:pb-0 custom-scrollbar">
                  {REPORT_LIST.map(rep => (
                      <button 
                        key={rep.id}
                        onClick={() => setSelectedReportId(rep.id)}
                        className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all ${selectedReportId === rep.id ? 'bg-blue-600 text-white border-blue-700 shadow-md' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                      >
                          {rep.title}
                      </button>
                  ))}
              </div>

              {/* Date & Print */}
              <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2 px-2">
                      <Calendar size={16} className="text-slate-500"/>
                      <input type="date" className="bg-transparent border-none text-sm font-bold text-slate-700 outline-none w-28" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
                      <span className="text-slate-400">até</span>
                      <input type="date" className="bg-transparent border-none text-sm font-bold text-slate-700 outline-none w-28" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
                  </div>
                  <button onClick={handlePrint} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-md font-bold text-sm hover:bg-slate-900 shadow-sm transition-all">
                      <Printer size={16}/> Imprimir / PDF
                  </button>
              </div>
          </div>
      </div>

      {/* REPORT PREVIEW AREA */}
      <div className="flex-1 bg-slate-500/10 rounded-xl overflow-hidden border border-slate-300 relative flex justify-center p-8 overflow-y-auto no-print-bg">
         <div className={`bg-white shadow-2xl transition-all duration-300 ${REPORT_LIST.find(r => r.id === selectedReportId)?.orientation === 'landscape' ? 'w-[297mm]' : 'w-[210mm]'}`}>
             <PrintableReport 
                ref={componentRef} 
                data={reportOutput} 
                definition={REPORT_LIST.find(r => r.id === selectedReportId)!}
                dateRange={dateRange}
                user={user?.name || 'Usuário'}
             />
         </div>
      </div>

    </div>
  );
};
