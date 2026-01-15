
import { 
  Driver, Vehicle, RouteDef, Agency, ExpenseType, RouteCash, AgencyCash, DailyClose, FuelEntry, Line, CommissionRule, GeneralExpense, TourismService, Client, Supplier, AuditLog, UserProfile, DriverLedgerEntry, User,
  MOCK_DRIVERS, MOCK_VEHICLES, MOCK_ROUTES, MOCK_AGENCIES, MOCK_EXPENSE_TYPES, MOCK_LINES, MOCK_COMMISSIONS, MOCK_CLIENTS, MOCK_SUPPLIERS
} from '../types';
import { notificationService } from './notificationService';

// Keys
const K_USERS = 'tf_auth_users'; // NEW: Auth Storage
const K_DRIVERS = 'tf_drivers';
const K_VEHICLES = 'tf_vehicles';
const K_LINES = 'tf_lines';
const K_ROUTES = 'tf_routes';
const K_AGENCIES = 'tf_agencies';
const K_CLIENTS = 'tf_clients';
const K_SUPPLIERS = 'tf_suppliers';
const K_EXPENSE_TYPES = 'tf_etypes';
const K_COMMISSIONS = 'tf_commissions';
const K_ROUTE_CASH = 'tf_route_cash';
const K_AGENCY_CASH = 'tf_agency_cash';
const K_DAILY_CLOSES = 'tf_daily_closes';
const K_FUEL = 'tf_fuel';
const K_GENERAL_EXPENSES = 'tf_general_expenses';
const K_TOURISM = 'tf_tourism';
const K_AUDIT = 'tf_audit_logs';
const K_DRIVER_LEDGER = 'tf_driver_ledger';

const get = <T>(key: string, defaultVal: T): T => {
  const s = localStorage.getItem(key);
  if (!s) return defaultVal;
  try { return JSON.parse(s); } catch { return defaultVal; }
};

// Safe Set with Quota Management
const set = <T>(key: string, val: T) => {
    try {
        localStorage.setItem(key, JSON.stringify(val));
    } catch (e: any) {
        if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            alert("ERRO CRÍTICO: Espaço de armazenamento cheio! O sistema não consegue salvar novos dados.\n\nSOLUÇÃO: Vá em 'Cadastros > Dados & Backup', baixe o backup e depois clique em 'Limpar Dados Antigos' ou contate o suporte.");
            throw new Error("Armazenamento Cheio");
        }
        console.error("Storage Error", e);
    }
};

// --- UUID GENERATOR ---
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// --- DATE HELPER (Timezone Fix) ---
export const getLocalDate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().split('T')[0];
};

// --- DISPLAY DATE HELPER (Prevent Timezone Shift) ---
export const formatDateDisplay = (isoDate: string) => {
  if (!isoDate) return '-';
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
};

// --- FINANCIAL PRECISION HELPER (CRITICAL FOR PRODUCTION) ---
// JavaScript floating point math is dangerous for finance (0.1 + 0.2 !== 0.3).
// This helper fixes precision to 2 decimals safely.
export const money = (value: number | undefined | null): number => {
    if (!value) return 0;
    return Math.round((value + Number.EPSILON) * 100) / 100;
};

// --- AUDIT SYSTEM ---
const getCurrentUser = (): UserProfile | null => {
    const s = sessionStorage.getItem('onnibox_auth');
    return s ? JSON.parse(s) : null;
};

export const createAuditLog = (
    entity: string, 
    item: any, 
    previousItem: any | null, 
    actionOverride?: 'CREATE' | 'UPDATE' | 'DELETE' | 'CLOSE' | 'REOPEN' | 'LOGIN' | 'LOGOUT'
) => {
    const user = getCurrentUser();
    const logs = get<AuditLog[]>(K_AUDIT, []);
    
    let action = actionOverride;
    let details = '';

    if (!action) {
        if (!previousItem) {
            action = 'CREATE';
            details = 'Criou novo registro';
        } else {
            action = 'UPDATE';
            // Simple diff detection for description
            const changes = [];
            for (const key in item) {
                if (item[key] !== previousItem[key] && key !== 'id') {
                    changes.push(key);
                }
            }
            details = changes.length > 0 ? `Alterou: ${changes.join(', ')}` : 'Atualizou registro';
            
            // Detect Status Change specific Logic
            if (previousItem.status === 'OPEN' && item.status === 'CLOSED') {
                action = 'CLOSE';
                details = 'Fechou conferência/caixa';
            } else if (previousItem.status === 'CLOSED' && item.status === 'OPEN') {
                action = 'REOPEN';
                details = 'Reabriu conferência para ajuste';
            }
        }
    } else {
        details = action === 'DELETE' ? 'Excluiu registro permanentemente' : details;
        if (action === 'LOGIN') details = 'Acesso ao sistema';
        if (action === 'LOGOUT') details = 'Saída do sistema';
    }

    const log: AuditLog = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        entity,
        entityId: item.id || 'N/A',
        action: action || 'UPDATE',
        userId: user?.id || 'SYSTEM', 
        userName: user?.name || 'Sistema',
        userRole: user?.role || 'SYSTEM',
        details,
        snapshot: JSON.stringify(item),
        previousSnapshot: previousItem ? JSON.stringify(previousItem) : undefined
    };

    // Auto-Truncate Logs to prevent Quota issues (Safety Valve)
    if (logs.length > 1500) {
        logs.splice(0, 500);
    } 
    
    logs.push(log);
    set(K_AUDIT, logs);
};

// --- AUDIT HELPER: LOCK CHECK ---
const checkLock = (date: string) => {
  const closes = get<DailyClose[]>(K_DAILY_CLOSES, []);
  const isClosed = closes.some(c => c.date === date);
  if (isClosed) {
    throw new Error(`AÇÃO BLOQUEADA: O dia ${formatDateDisplay(date)} já está fechado financeiramente. Reabra o caixa ou contate o gerente.`);
  }
};

export const storage = {
  init: () => {
    if (!localStorage.getItem(K_DRIVERS)) set(K_DRIVERS, MOCK_DRIVERS);
    if (!localStorage.getItem(K_VEHICLES)) set(K_VEHICLES, MOCK_VEHICLES);
    if (!localStorage.getItem(K_LINES)) set(K_LINES, MOCK_LINES);
    if (!localStorage.getItem(K_ROUTES)) set(K_ROUTES, MOCK_ROUTES);
    if (!localStorage.getItem(K_AGENCIES)) set(K_AGENCIES, MOCK_AGENCIES);
    if (!localStorage.getItem(K_CLIENTS)) set(K_CLIENTS, MOCK_CLIENTS);
    if (!localStorage.getItem(K_SUPPLIERS)) set(K_SUPPLIERS, MOCK_SUPPLIERS);
    if (!localStorage.getItem(K_EXPENSE_TYPES)) set(K_EXPENSE_TYPES, MOCK_EXPENSE_TYPES);
    if (!localStorage.getItem(K_COMMISSIONS)) set(K_COMMISSIONS, MOCK_COMMISSIONS);
    
    // Default Admin User Initialization (Vital for new Auth system)
    const users = get<User[]>(K_USERS, []);
    if (users.length === 0) {
        set(K_USERS, [{
            id: 'admin-001',
            name: 'Administrador Principal',
            email: 'admin@onnibox.com',
            password: 'admin', // Simple default for first access
            role: 'ADMIN',
            active: true,
            createdAt: new Date().toISOString()
        }]);
    }
  },

  // Generic Getters
  getDrivers: () => get<Driver[]>(K_DRIVERS, []),
  getVehicles: () => get<Vehicle[]>(K_VEHICLES, []),
  getLines: () => get<Line[]>(K_LINES, []),
  getRoutes: () => get<RouteDef[]>(K_ROUTES, []), 
  getAgencies: () => get<Agency[]>(K_AGENCIES, []),
  getClients: () => get<Client[]>(K_CLIENTS, []),
  getSuppliers: () => get<Supplier[]>(K_SUPPLIERS, []),
  getExpenseTypes: () => get<ExpenseType[]>(K_EXPENSE_TYPES, []),
  getCommissions: () => get<CommissionRule[]>(K_COMMISSIONS, []),
  getRouteCash: () => get<RouteCash[]>(K_ROUTE_CASH, []),
  getAgencyCash: () => get<AgencyCash[]>(K_AGENCY_CASH, []),
  getDailyCloses: () => get<DailyClose[]>(K_DAILY_CLOSES, []),
  getFuelEntries: () => get<FuelEntry[]>(K_FUEL, []),
  getGeneralExpenses: () => get<GeneralExpense[]>(K_GENERAL_EXPENSES, []),
  getTourismServices: () => get<TourismService[]>(K_TOURISM, []),
  getAuditLogs: () => get<AuditLog[]>(K_AUDIT, []).sort((a,b) => b.timestamp.localeCompare(a.timestamp)),
  getDriverLedger: () => get<DriverLedgerEntry[]>(K_DRIVER_LEDGER, []),
  getUsers: () => get<User[]>(K_USERS, []),
  
  isDayClosed: (date: string) => {
    const list = get<DailyClose[]>(K_DAILY_CLOSES, []);
    return list.some(c => c.date === date);
  },

  // --- USER MANAGEMENT ---
  saveUser: (item: User) => {
      const list = get<User[]>(K_USERS, []);
      const idx = list.findIndex(i => i.id === item.id);
      const prev = idx >= 0 ? list[idx] : null;
      
      const newItem = { ...item, id: item.id || generateId() };
      
      if (idx >= 0) list[idx] = newItem; else list.push(newItem);
      set(K_USERS, list);
      createAuditLog('User', newItem, prev);
  },
  
  deleteUser: (id: string) => {
      const list = get<User[]>(K_USERS, []);
      const idx = list.findIndex(i => i.id === id);
      if (idx >= 0) {
          const prev = { ...list[idx] };
          // Logic: Soft delete or Hard delete? 
          // For users, it's better to deactivate to keep history linkage.
          // But if requested "delete", we will deactivate.
          list[idx].active = false; 
          set(K_USERS, list);
          createAuditLog('User', list[idx], prev, 'UPDATE'); // Log as update (deactivation)
      }
  },

  // --- REGISTRIES ---

  saveDriver: (item: Driver) => {
    const list = get<Driver[]>(K_DRIVERS, []);
    const idx = list.findIndex(i => i.id === item.id);
    const prev = idx >= 0 ? list[idx] : null;
    const newItem = { ...item, id: item.id || generateId() };
    
    if (idx >= 0) list[idx] = newItem; else list.push(newItem);
    set(K_DRIVERS, list);
    createAuditLog('Driver', newItem, prev);
  },
  deleteDriver: (id: string) => {
    const list = get<Driver[]>(K_DRIVERS, []);
    const idx = list.findIndex(i => i.id === id);
    if (idx >= 0) {
        const prev = { ...list[idx] };
        list[idx].active = false;
        set(K_DRIVERS, list);
        createAuditLog('Driver', list[idx], prev, 'UPDATE');
    }
  },

  saveVehicle: (item: Vehicle) => {
    const list = get<Vehicle[]>(K_VEHICLES, []);
    const idx = list.findIndex(i => i.id === item.id);
    const prev = idx >= 0 ? list[idx] : null;
    const newItem = { ...item, id: item.id || generateId() };

    if (idx >= 0) list[idx] = newItem; else list.push(newItem);
    set(K_VEHICLES, list);
    createAuditLog('Vehicle', newItem, prev);
  },
  deleteVehicle: (id: string) => {
    const list = get<Vehicle[]>(K_VEHICLES, []);
    const idx = list.findIndex(i => i.id === id);
    if (idx >= 0) {
        const prev = { ...list[idx] };
        list[idx].active = false;
        set(K_VEHICLES, list);
        createAuditLog('Vehicle', list[idx], prev, 'UPDATE');
    }
  },

  saveLine: (item: Line) => {
    const list = get<Line[]>(K_LINES, []);
    const idx = list.findIndex(i => i.id === item.id);
    const prev = idx >= 0 ? list[idx] : null;
    const newItem = { ...item, id: item.id || generateId() };

    if (idx >= 0) list[idx] = newItem; else list.push(newItem);
    set(K_LINES, list);
    createAuditLog('Line', newItem, prev);
  },
  deleteLine: (id: string) => {
    const list = get<Line[]>(K_LINES, []);
    const idx = list.findIndex(i => i.id === id);
    if (idx >= 0) {
        const prev = { ...list[idx] };
        list[idx].active = false;
        set(K_LINES, list);
        createAuditLog('Line', list[idx], prev, 'UPDATE');
    }
  },
  
  saveRoute: (item: RouteDef) => {
    const list = get<RouteDef[]>(K_ROUTES, []);
    const idx = list.findIndex(i => i.id === item.id);
    const prev = idx >= 0 ? list[idx] : null;
    const newItem = { ...item, id: item.id || generateId() };

    if (idx >= 0) list[idx] = newItem; else list.push(newItem);
    set(K_ROUTES, list);
    createAuditLog('RouteDef', newItem, prev);
  },
  deleteRoute: (id: string) => {
    const list = get<RouteDef[]>(K_ROUTES, []);
    const idx = list.findIndex(i => i.id === id);
    if (idx >= 0) {
        const prev = { ...list[idx] };
        list[idx].active = false;
        set(K_ROUTES, list);
        createAuditLog('RouteDef', list[idx], prev, 'UPDATE');
    }
  },

  saveAgency: (item: Agency) => {
    const list = get<Agency[]>(K_AGENCIES, []);
    const idx = list.findIndex(i => i.id === item.id);
    const prev = idx >= 0 ? list[idx] : null;
    const newItem = { ...item, id: item.id || generateId() };

    if (idx >= 0) list[idx] = newItem; else list.push(newItem);
    set(K_AGENCIES, list);
    createAuditLog('Agency', newItem, prev);
  },
  deleteAgency: (id: string) => {
    const list = get<Agency[]>(K_AGENCIES, []);
    const idx = list.findIndex(i => i.id === id);
    if (idx >= 0) {
        const prev = { ...list[idx] };
        list[idx].active = false;
        set(K_AGENCIES, list);
        createAuditLog('Agency', list[idx], prev, 'UPDATE');
    }
  },

  saveClient: (item: Client) => {
    const list = get<Client[]>(K_CLIENTS, []);
    const idx = list.findIndex(i => i.id === item.id);
    const prev = idx >= 0 ? list[idx] : null;
    const newItem = { ...item, id: item.id || generateId() };

    if (idx >= 0) list[idx] = newItem; else list.push(newItem);
    set(K_CLIENTS, list);
    createAuditLog('Client', newItem, prev);
  },
  deleteClient: (id: string) => {
    const list = get<Client[]>(K_CLIENTS, []);
    const idx = list.findIndex(i => i.id === id);
    if (idx >= 0) {
        const prev = { ...list[idx] };
        list[idx].active = false;
        set(K_CLIENTS, list);
        createAuditLog('Client', list[idx], prev, 'UPDATE');
    }
  },

  saveSupplier: (item: Supplier) => {
    const list = get<Supplier[]>(K_SUPPLIERS, []);
    const idx = list.findIndex(i => i.id === item.id);
    const prev = idx >= 0 ? list[idx] : null;
    const newItem = { ...item, id: item.id || generateId() };

    if (idx >= 0) list[idx] = newItem; else list.push(newItem);
    set(K_SUPPLIERS, list);
    createAuditLog('Supplier', newItem, prev);
  },
  deleteSupplier: (id: string) => {
    const list = get<Supplier[]>(K_SUPPLIERS, []);
    const idx = list.findIndex(i => i.id === id);
    if (idx >= 0) {
        const prev = { ...list[idx] };
        list[idx].active = false;
        set(K_SUPPLIERS, list);
        createAuditLog('Supplier', list[idx], prev, 'UPDATE');
    }
  },

  saveExpenseType: (item: ExpenseType) => {
    const list = get<ExpenseType[]>(K_EXPENSE_TYPES, []);
    const idx = list.findIndex(i => i.id === item.id);
    const prev = idx >= 0 ? list[idx] : null;
    const newItem = { ...item, id: item.id || generateId() };

    if (idx >= 0) list[idx] = newItem; else list.push(newItem);
    set(K_EXPENSE_TYPES, list);
    createAuditLog('ExpenseType', newItem, prev);
  },
  deleteExpenseType: (id: string) => {
    const list = get<ExpenseType[]>(K_EXPENSE_TYPES, []);
    const idx = list.findIndex(i => i.id === id);
    if (idx >= 0) {
        const prev = { ...list[idx] };
        list[idx].active = false;
        set(K_EXPENSE_TYPES, list);
        createAuditLog('ExpenseType', list[idx], prev, 'UPDATE');
    }
  },

  saveCommission: (item: CommissionRule) => {
    const list = get<CommissionRule[]>(K_COMMISSIONS, []);
    const idx = list.findIndex(i => i.id === item.id);
    const prev = idx >= 0 ? list[idx] : null;
    const newItem = { ...item, id: item.id || generateId() };

    if (idx >= 0) list[idx] = newItem; else list.push(newItem);
    set(K_COMMISSIONS, list);
    createAuditLog('CommissionRule', newItem, prev);
  },
  deleteCommission: (id: string) => {
    const list = get<CommissionRule[]>(K_COMMISSIONS, []);
    const idx = list.findIndex(i => i.id === id);
    if (idx >= 0) {
        const prev = { ...list[idx] };
        list[idx].active = false;
        set(K_COMMISSIONS, list);
        createAuditLog('CommissionRule', list[idx], prev, 'UPDATE');
    }
  },

  // --- TRANSACTIONAL DATA ---
  // Ensure "money()" is applied to all financial fields before saving

  saveRouteCash: (item: RouteCash) => {
    checkLock(item.date);
    const list = get<RouteCash[]>(K_ROUTE_CASH, []);
    const idx = list.findIndex(i => i.id === item.id);
    const prev = idx >= 0 ? list[idx] : null;
    
    // Financial Sanitization
    const newItem = { 
        ...item, 
        id: item.id || generateId(),
        revenueInformed: money(item.revenueInformed),
        cashExpenses: money(item.cashExpenses),
        netCashExpected: money(item.netCashExpected),
        cashHanded: money(item.cashHanded),
        diff: money(item.diff),
        expenses: item.expenses?.map(e => ({...e, amount: money(e.amount)}))
    };

    if (idx >= 0) list[idx] = newItem; else list.push(newItem);
    set(K_ROUTE_CASH, list);
    createAuditLog('RouteCash', newItem, prev);
  },
  
  saveAgencyCash: (item: AgencyCash) => {
    checkLock(item.date);
    const list = get<AgencyCash[]>(K_AGENCY_CASH, []);
    const idx = list.findIndex(i => i.id === item.id);
    const prev = idx >= 0 ? list[idx] : null;
    
    // Financial Sanitization
    const newItem = { 
        ...item, 
        id: item.id || generateId(),
        valueInformed: money(item.valueInformed),
        valueReceived: money(item.valueReceived),
        diff: money(item.diff),
        expenses: item.expenses?.map(e => ({...e, amount: money(e.amount)}))
    };

    if (idx >= 0) list[idx] = newItem; else list.push(newItem);
    set(K_AGENCY_CASH, list);
    createAuditLog('AgencyCash', newItem, prev);
  },

  saveFuel: (item: FuelEntry) => {
    checkLock(item.date);
    const list = get<FuelEntry[]>(K_FUEL, []);
    const idx = list.findIndex(i => i.id === item.id);
    const prev = idx >= 0 ? list[idx] : null;
    const newItem = { ...item, id: item.id || generateId(), amount: money(item.amount) };

    if (idx >= 0) list[idx] = newItem; else list.push(newItem);
    set(K_FUEL, list);
    createAuditLog('Fuel', newItem, prev);
  },

  deleteFuel: (id: string) => {
    const list = get<FuelEntry[]>(K_FUEL, []);
    const item = list.find(i => i.id === id);
    if (item) {
        checkLock(item.date);
        set(K_FUEL, list.filter(i => i.id !== id));
        createAuditLog('Fuel', item, item, 'DELETE');
    }
  },

  saveGeneralExpense: (item: GeneralExpense) => {
    // Only lock Check if Payment Method is CASH. Bank transfers can be entered later.
    if (item.paymentMethod === 'CASH') {
        const checkDate = item.status === 'PAID' ? (item.paidAt || item.date) : item.date;
        checkLock(checkDate);
    }
    
    const list = get<GeneralExpense[]>(K_GENERAL_EXPENSES, []);
    const idx = list.findIndex(i => i.id === item.id);
    const prev = idx >= 0 ? list[idx] : null;
    const newItem = { ...item, id: item.id || generateId(), amount: money(item.amount) };

    if (idx >= 0) list[idx] = newItem; else list.push(newItem);
    set(K_GENERAL_EXPENSES, list);
    createAuditLog('GeneralExpense', newItem, prev);
  },

  deleteGeneralExpense: (id: string) => {
    const list = get<GeneralExpense[]>(K_GENERAL_EXPENSES, []);
    const item = list.find(i => i.id === id);
    if (item) {
        if (item.paymentMethod === 'CASH' && item.status === 'PAID') {
             checkLock(item.paidAt || item.date);
        }
        set(K_GENERAL_EXPENSES, list.filter(i => i.id !== id));
        createAuditLog('GeneralExpense', item, item, 'DELETE');
    }
  },

  saveTourismService: (item: TourismService) => {
    const list = get<TourismService[]>(K_TOURISM, []);
    const idx = list.findIndex(i => i.id === item.id);
    const prev = idx >= 0 ? list[idx] : null;
    const newItem = { 
        ...item, 
        id: item.id || generateId(),
        contractValue: money(item.contractValue),
        receivedValue: item.receivedValue !== undefined ? money(item.receivedValue) : undefined,
        expenses: item.expenses?.map(e => ({...e, amount: money(e.amount)}))
    };

    if (idx >= 0) list[idx] = newItem; else list.push(newItem);
    set(K_TOURISM, list);
    createAuditLog('Tourism', newItem, prev);
  },
  
  deleteTourismService: (id: string) => {
    const list = get<TourismService[]>(K_TOURISM, []);
    const item = list.find(i => i.id === id);
    if (item) {
        set(K_TOURISM, list.filter(i => i.id !== id));
        createAuditLog('Tourism', item, item, 'DELETE');
    }
  },

  // Daily Close
  saveDailyClose: (item: DailyClose) => {
    const list = get<DailyClose[]>(K_DAILY_CLOSES, []);
    const idx = list.findIndex(i => i.date === item.date);
    const prev = idx >= 0 ? list[idx] : null;
    
    // Ensure precision on all aggregates
    const newItem = { 
        ...item, 
        id: item.id || generateId(),
        totalRouteRevenue: money(item.totalRouteRevenue),
        totalAgencyRevenue: money(item.totalAgencyRevenue),
        totalTourismRevenue: money(item.totalTourismRevenue),
        totalExpenses: money(item.totalExpenses),
        totalAgencyExpenses: money(item.totalAgencyExpenses),
        totalTourismExpenses: money(item.totalTourismExpenses),
        totalGeneralExpenses: money(item.totalGeneralExpenses),
        totalCommissions: money(item.totalCommissions),
        netResult: money(item.netResult),
        totalDiff: money(item.totalDiff)
    };

    if (idx >= 0) {
        list[idx] = newItem; 
    } else {
        list.push(newItem);
    }
    set(K_DAILY_CLOSES, list);
    createAuditLog('DailyClose', newItem, prev, 'CLOSE');
  },
  
  deleteDailyClose: (date: string) => {
      const list = get<DailyClose[]>(K_DAILY_CLOSES, []);
      const item = list.find(c => c.date === date);
      if (item) {
          set(K_DAILY_CLOSES, list.filter(c => c.date !== date));
          createAuditLog('DailyClose', item, item, 'REOPEN');
      }
  },

  // --- DRIVER LEDGER ---
  
  saveLedgerEntry: (item: DriverLedgerEntry) => {
      const list = get<DriverLedgerEntry[]>(K_DRIVER_LEDGER, []);
      const newItem = { 
          ...item, 
          id: item.id || generateId(),
          amount: money(item.amount),
          createdAt: new Date().toISOString()
      };
      list.push(newItem);
      set(K_DRIVER_LEDGER, list);
      createAuditLog('DriverLedger', newItem, null);
  },

  deleteLedgerEntry: (id: string) => {
      const list = get<DriverLedgerEntry[]>(K_DRIVER_LEDGER, []);
      const entry = list.find(l => l.id === id);
      if (entry) {
          set(K_DRIVER_LEDGER, list.filter(l => l.id !== id));
          createAuditLog('DriverLedger', entry, entry, 'DELETE');
      }
  },

  reset: () => {
      localStorage.clear();
  },

  // --- BACKUP SYSTEM ---
  exportData: () => {
    const data = {
        users: get(K_USERS, []), // Export Users too
        drivers: get(K_DRIVERS, []),
        vehicles: get(K_VEHICLES, []),
        lines: get(K_LINES, []),
        routes: get(K_ROUTES, []),
        agencies: get(K_AGENCIES, []),
        clients: get(K_CLIENTS, []),
        suppliers: get(K_SUPPLIERS, []),
        expenseTypes: get(K_EXPENSE_TYPES, []),
        commissions: get(K_COMMISSIONS, []),
        routeCash: get(K_ROUTE_CASH, []),
        agencyCash: get(K_AGENCY_CASH, []),
        dailyCloses: get(K_DAILY_CLOSES, []),
        fuel: get(K_FUEL, []),
        generalExpenses: get(K_GENERAL_EXPENSES, []),
        tourism: get(K_TOURISM, []),
        auditLogs: get(K_AUDIT, []),
        driverLedger: get(K_DRIVER_LEDGER, []), 
        meta: {
            exportedAt: new Date().toISOString(),
            version: '1.3.0', // Users Update
            generator: 'OnniBox'
        }
    };
    return JSON.stringify(data, null, 2);
  },

  importData: (jsonString: string) => {
      try {
          const data = JSON.parse(jsonString);
          if (!data.meta) throw new Error("Arquivo de backup inválido.");
          
          set(K_USERS, data.users || []); // Import Users
          set(K_DRIVERS, data.drivers || []);
          set(K_VEHICLES, data.vehicles || []);
          set(K_LINES, data.lines || []);
          set(K_ROUTES, data.routes || []);
          set(K_AGENCIES, data.agencies || []);
          set(K_CLIENTS, data.clients || []);
          set(K_SUPPLIERS, data.suppliers || []);
          set(K_EXPENSE_TYPES, data.expenseTypes || []);
          set(K_COMMISSIONS, data.commissions || []);
          set(K_ROUTE_CASH, data.routeCash || []);
          set(K_AGENCY_CASH, data.agencyCash || []);
          set(K_DAILY_CLOSES, data.dailyCloses || []);
          set(K_FUEL, data.fuel || []);
          set(K_GENERAL_EXPENSES, data.generalExpenses || []);
          set(K_TOURISM, data.tourism || []);
          set(K_AUDIT, data.auditLogs || []);
          set(K_DRIVER_LEDGER, data.driverLedger || []); 
          
          return true;
      } catch (e) {
          console.error(e);
          return false;
      }
  }
};
