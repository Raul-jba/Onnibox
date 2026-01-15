
import { 
  Driver, Vehicle, RouteDef, Agency, ExpenseType, RouteCash, AgencyCash, DailyClose, FuelEntry, Line, CommissionRule, GeneralExpense, TourismService, Client, Supplier, AuditLog, UserProfile, DriverLedgerEntry, User,
  MOCK_DRIVERS, MOCK_VEHICLES, MOCK_ROUTES, MOCK_AGENCIES, MOCK_EXPENSE_TYPES, MOCK_LINES, MOCK_COMMISSIONS, MOCK_CLIENTS, MOCK_SUPPLIERS
} from '../types';
import { notificationService } from './notificationService';

// Keys
const K_USERS = 'tf_auth_users'; 
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

// --- LOW LEVEL STORAGE ADAPTER ---
// [BACKEND-MIGRATION]: This section emulates the DB Client.
const get = <T>(key: string, defaultVal: T): T => {
  const s = localStorage.getItem(key);
  if (!s) return defaultVal;
  try { return JSON.parse(s); } catch { return defaultVal; }
};

const set = <T>(key: string, val: T) => {
    try {
        localStorage.setItem(key, JSON.stringify(val));
    } catch (e: any) {
        if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            alert("ERRO CRÍTICO: Espaço de armazenamento cheio! O sistema não consegue salvar novos dados.\n\nSOLUÇÃO IMEDIATA: Vá em 'Cadastros > Sistema' e baixe o backup. O sistema tentará limpar logs antigos automaticamente agora.");
            // Emergency cleanup
            try {
                const logs = get<AuditLog[]>(K_AUDIT, []);
                if (logs.length > 50) {
                    const keep = logs.slice(logs.length - 50);
                    localStorage.setItem(K_AUDIT, JSON.stringify(keep));
                    alert("Limpeza de emergência realizada. Tente salvar novamente.");
                }
            } catch (err) {
                console.error("Emergency cleanup failed", err);
            }
            throw new Error("Armazenamento Cheio");
        }
        console.error("Storage Error", e);
    }
};

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const getLocalDate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().split('T')[0];
};

export const formatDateDisplay = (isoDate: string) => {
  if (!isoDate) return '-';
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
};

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
            const changes = [];
            for (const key in item) {
                if (item[key] !== previousItem[key] && key !== 'id' && key !== 'updatedAt') {
                    changes.push(key);
                }
            }
            details = changes.length > 0 ? `Alterou: ${changes.join(', ')}` : 'Atualizou registro';
            
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

    // [CRITICAL FIX] Strict Quota Management for Logs
    // Keep only last 200 logs to prevent localStorage explosion
    if (logs.length > 200) {
        logs.splice(0, logs.length - 200);
    }
    
    logs.push(log);
    set(K_AUDIT, logs);
};

// --- USER REPOSITORY (BACKEND READY ARCHITECTURE) ---
// This object encapsulates all User logic. 
// When migrating to Firebase/Supabase, ONLY THIS OBJECT needs to be rewritten.

export const UserRepository = {
    // [BACKEND-MIGRATION]: Replace with `await supabase.from('users').select('*')`
    getAll: (): User[] => {
        return get<User[]>(K_USERS, []);
    },

    // [BACKEND-MIGRATION]: Replace with `await supabase.from('users').select('*').eq('id', id)`
    getById: (id: string): User | undefined => {
        const users = get<User[]>(K_USERS, []);
        return users.find(u => u.id === id);
    },

    // [BACKEND-MIGRATION]: Replace with `await supabase.from('users').select('*').eq('email', email)`
    getByEmail: (email: string): User | undefined => {
        const users = get<User[]>(K_USERS, []);
        return users.find(u => u.email.toLowerCase() === email.toLowerCase());
    },

    // [BACKEND-MIGRATION]: Replace with `await supabase.from('users').upsert(user)`
    save: (user: Partial<User>): User => {
        const users = get<User[]>(K_USERS, []);
        const existingIndex = users.findIndex(u => u.id === user.id);
        const now = new Date().toISOString();

        let savedUser: User;

        if (existingIndex >= 0) {
            // Update
            const prev = users[existingIndex];
            savedUser = {
                ...prev,
                ...user,
                updatedAt: now,
                // Ensure critical fields aren't lost if not passed
                createdAt: prev.createdAt,
                password: user.password || prev.password
            } as User;
            users[existingIndex] = savedUser;
            createAuditLog('User', savedUser, prev, 'UPDATE');
        } else {
            // Insert
            savedUser = {
                ...user,
                id: user.id || generateId(),
                active: user.active ?? true,
                createdAt: now,
                updatedAt: now
            } as User;
            users.push(savedUser);
            createAuditLog('User', savedUser, null, 'CREATE');
        }

        set(K_USERS, users);
        return savedUser;
    },

    // [BACKEND-MIGRATION]: Replace with Auth Provider logic (Firebase Auth / Supabase Auth)
    // This handles the "Login" logic locally.
    authenticate: (email: string, password: string): User | null => {
        const users = get<User[]>(K_USERS, []);
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.active);
        
        // [SECURITY WARNING]: Simple comparison. In backend, use bcrypt.compare(password, user.passwordHash)
        if (user && user.password === password) {
            // Update Last Login
            const updatedUser = { ...user, lastLogin: new Date().toISOString() };
            // Persist the last login update without triggering a heavy audit log if preferred
            const idx = users.findIndex(u => u.id === user.id);
            if (idx >= 0) {
                users[idx] = updatedUser;
                set(K_USERS, users);
            }
            return updatedUser;
        }
        return null;
    }
};


// --- LEGACY STORAGE (To be refactored in Phase 2) ---

// [CRITICAL FIX] Added explicit date parameter for legacy checking
const checkLock = (date: string, operationName: string = 'Operação') => {
  const closes = get<DailyClose[]>(K_DAILY_CLOSES, []);
  const isClosed = closes.some(c => c.date === date);
  if (isClosed) {
    throw new Error(`BLOQUEIO DE SEGURANÇA: O dia ${formatDateDisplay(date)} está FECHADO. Você não pode realizar ${operationName} nesta data.`);
  }
};

export const storage = {
  // Expose User Repo
  users: UserRepository,

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
    
    // Initialize Default Admin via Repo
    const existingUsers = UserRepository.getAll();
    if (existingUsers.length === 0) {
        UserRepository.save({
            name: 'Administrador Principal',
            email: 'admin@onnibox.com',
            password: 'admin',
            role: 'ADMIN',
            active: true
        });
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
  
  // Backwards compatibility for User Page until fully refactored UI
  getUsers: () => UserRepository.getAll(),
  saveUser: (u: User) => UserRepository.save(u),
  
  isDayClosed: (date: string) => {
    const list = get<DailyClose[]>(K_DAILY_CLOSES, []);
    return list.some(c => c.date === date);
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
    const list = get<RouteCash[]>(K_ROUTE_CASH, []);
    const idx = list.findIndex(i => i.id === item.id);
    const prev = idx >= 0 ? list[idx] : null;

    // [CRITICAL FIX] Check lock on BOTH new date AND previous date (if changing)
    checkLock(item.date, 'Edição de Caixa');
    if (prev && prev.date !== item.date) {
        checkLock(prev.date, 'Mudança de Data de Caixa Fechado');
    }
    
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
    const list = get<AgencyCash[]>(K_AGENCY_CASH, []);
    const idx = list.findIndex(i => i.id === item.id);
    const prev = idx >= 0 ? list[idx] : null;

    // [CRITICAL FIX] Check lock on BOTH new date AND previous date
    checkLock(item.date, 'Edição de Caixa Agência');
    if (prev && prev.date !== item.date) {
        checkLock(prev.date, 'Mudança de Data de Caixa Fechado');
    }
    
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
    const list = get<FuelEntry[]>(K_FUEL, []);
    const idx = list.findIndex(i => i.id === item.id);
    const prev = idx >= 0 ? list[idx] : null;

    checkLock(item.date, 'Lançamento de Combustível');
    if (prev && prev.date !== item.date) checkLock(prev.date, 'Mudança de Data Fechada');

    const newItem = { ...item, id: item.id || generateId(), amount: money(item.amount) };

    if (idx >= 0) list[idx] = newItem; else list.push(newItem);
    set(K_FUEL, list);
    createAuditLog('Fuel', newItem, prev);
  },

  deleteFuel: (id: string) => {
    const list = get<FuelEntry[]>(K_FUEL, []);
    const item = list.find(i => i.id === id);
    if (item) {
        checkLock(item.date, 'Exclusão de Combustível');
        set(K_FUEL, list.filter(i => i.id !== id));
        createAuditLog('Fuel', item, item, 'DELETE');
    }
  },

  saveGeneralExpense: (item: GeneralExpense) => {
    const list = get<GeneralExpense[]>(K_GENERAL_EXPENSES, []);
    const idx = list.findIndex(i => i.id === item.id);
    const prev = idx >= 0 ? list[idx] : null;

    // Only lock Check if Payment Method is CASH. Bank transfers can be entered later.
    if (item.paymentMethod === 'CASH') {
        const checkDate = item.status === 'PAID' ? (item.paidAt || item.date) : item.date;
        checkLock(checkDate, 'Pagamento em Dinheiro');
        
        if (prev && prev.paymentMethod === 'CASH') {
             const prevDate = prev.status === 'PAID' ? (prev.paidAt || prev.date) : prev.date;
             if (prevDate !== checkDate) checkLock(prevDate, 'Alteração de Data de Pagamento');
        }
    }
    
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
             checkLock(item.paidAt || item.date, 'Exclusão de Pagamento em Dinheiro');
        }
        set(K_GENERAL_EXPENSES, list.filter(i => i.id !== id));
        createAuditLog('GeneralExpense', item, item, 'DELETE');
    }
  },

  saveTourismService: (item: TourismService) => {
    // Tourism cash logic is simpler: check departure date if Received Value is set
    const list = get<TourismService[]>(K_TOURISM, []);
    const idx = list.findIndex(i => i.id === item.id);
    const prev = idx >= 0 ? list[idx] : null;
    
    // If receiving cash now? Not implemented strict lock yet for Tourism as dates vary.
    // Recommended Phase 2: Lock by receipt date.

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
