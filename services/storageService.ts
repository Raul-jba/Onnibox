
import { 
  Driver, Vehicle, RouteDef, Agency, ExpenseType, RouteCash, AgencyCash, DailyClose, FuelEntry, Line, CommissionRule, GeneralExpense, TourismService, Client,
  MOCK_DRIVERS, MOCK_VEHICLES, MOCK_ROUTES, MOCK_AGENCIES, MOCK_EXPENSE_TYPES, MOCK_LINES, MOCK_COMMISSIONS, MOCK_CLIENTS
} from '../types';

// Keys
const K_DRIVERS = 'tf_drivers';
const K_VEHICLES = 'tf_vehicles';
const K_LINES = 'tf_lines';
const K_ROUTES = 'tf_routes';
const K_AGENCIES = 'tf_agencies';
const K_CLIENTS = 'tf_clients';
const K_EXPENSE_TYPES = 'tf_etypes';
const K_COMMISSIONS = 'tf_commissions';
const K_ROUTE_CASH = 'tf_route_cash';
const K_AGENCY_CASH = 'tf_agency_cash';
const K_DAILY_CLOSES = 'tf_daily_closes';
const K_FUEL = 'tf_fuel';
const K_GENERAL_EXPENSES = 'tf_general_expenses';
const K_TOURISM = 'tf_tourism';

const get = <T>(key: string, defaultVal: T): T => {
  const s = localStorage.getItem(key);
  if (!s) return defaultVal;
  try { return JSON.parse(s); } catch { return defaultVal; }
};

const set = <T>(key: string, val: T) => localStorage.setItem(key, JSON.stringify(val));

// --- DATE HELPER (Timezone Fix) ---
export const getLocalDate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().split('T')[0];
};

// --- DISPLAY DATE HELPER (Prevent Timezone Shift) ---
export const formatDateDisplay = (isoDate: string) => {
  if (!isoDate) return '-';
  // Manually split YYYY-MM-DD to avoid new Date() timezone conversion issues
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
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
    if (!localStorage.getItem(K_EXPENSE_TYPES)) set(K_EXPENSE_TYPES, MOCK_EXPENSE_TYPES);
    if (!localStorage.getItem(K_COMMISSIONS)) set(K_COMMISSIONS, MOCK_COMMISSIONS);
  },

  // Generic Getters (Safe)
  getDrivers: () => get<Driver[]>(K_DRIVERS, []),
  getVehicles: () => get<Vehicle[]>(K_VEHICLES, []),
  getLines: () => get<Line[]>(K_LINES, []),
  getRoutes: () => get<RouteDef[]>(K_ROUTES, []), 
  getAgencies: () => get<Agency[]>(K_AGENCIES, []),
  getClients: () => get<Client[]>(K_CLIENTS, []),
  getExpenseTypes: () => get<ExpenseType[]>(K_EXPENSE_TYPES, []),
  getCommissions: () => get<CommissionRule[]>(K_COMMISSIONS, []),
  getRouteCash: () => get<RouteCash[]>(K_ROUTE_CASH, []),
  getAgencyCash: () => get<AgencyCash[]>(K_AGENCY_CASH, []),
  getDailyCloses: () => get<DailyClose[]>(K_DAILY_CLOSES, []),
  getFuelEntries: () => get<FuelEntry[]>(K_FUEL, []),
  getGeneralExpenses: () => get<GeneralExpense[]>(K_GENERAL_EXPENSES, []),
  getTourismServices: () => get<TourismService[]>(K_TOURISM, []),
  
  // Helper for UI
  isDayClosed: (date: string) => {
    const list = get<DailyClose[]>(K_DAILY_CLOSES, []);
    return list.some(c => c.date === date);
  },

  // --- SAFE WRITERS (WITH AUDIT LOCK) ---

  // Route Cash
  saveRouteCash: (item: RouteCash) => {
    checkLock(item.date); // Audit Lock
    const list = get<RouteCash[]>(K_ROUTE_CASH, []);
    const idx = list.findIndex(i => i.id === item.id);
    if (idx >= 0) list[idx] = item; else list.push(item);
    set(K_ROUTE_CASH, list);
  },
  
  // Agency Cash
  saveAgencyCash: (item: AgencyCash) => {
    checkLock(item.date); // Audit Lock
    const list = get<AgencyCash[]>(K_AGENCY_CASH, []);
    const idx = list.findIndex(i => i.id === item.id);
    if (idx >= 0) list[idx] = item; else list.push(item);
    set(K_AGENCY_CASH, list);
  },

  // Fuel (Only block if cash payment affects closed day logic, generally good practice to lock fleet logs too)
  saveFuel: (item: FuelEntry) => {
    checkLock(item.date); // Audit Lock
    const list = get<FuelEntry[]>(K_FUEL, []);
    const idx = list.findIndex(i => i.id === item.id);
    if (idx >= 0) list[idx] = item; else list.push(item);
    set(K_FUEL, list);
  },

  deleteFuel: (id: string) => {
    const list = get<FuelEntry[]>(K_FUEL, []);
    const item = list.find(i => i.id === id);
    if (item) {
        checkLock(item.date); // Audit Lock
        set(K_FUEL, list.filter(i => i.id !== id));
    }
  },

  // General Expenses
  saveGeneralExpense: (item: GeneralExpense) => {
    // Note: General expenses might not be strictly locked by daily close unless they affect cash flow. 
    // We'll leave it unlocked for now to allow administrative flexibility, or strict if paymentMethod is CASH.
    if (item.paymentMethod === 'CASH') {
        checkLock(item.date);
    }
    const list = get<GeneralExpense[]>(K_GENERAL_EXPENSES, []);
    const idx = list.findIndex(i => i.id === item.id);
    if (idx >= 0) list[idx] = item; else list.push(item);
    set(K_GENERAL_EXPENSES, list);
  },

  deleteGeneralExpense: (id: string) => {
    const list = get<GeneralExpense[]>(K_GENERAL_EXPENSES, []);
    set(K_GENERAL_EXPENSES, list.filter(i => i.id !== id));
  },

  // Tourism Services
  saveTourismService: (item: TourismService) => {
    // Audit lock logic could apply here if we consider the departure date or completion date
    // For now, we will allow editing unless it's strictly a cash operation integrated into Daily Close.
    const list = get<TourismService[]>(K_TOURISM, []);
    const idx = list.findIndex(i => i.id === item.id);
    if (idx >= 0) list[idx] = item; else list.push(item);
    set(K_TOURISM, list);
  },
  
  deleteTourismService: (id: string) => {
    const list = get<TourismService[]>(K_TOURISM, []);
    set(K_TOURISM, list.filter(i => i.id !== id));
  },
  
  // Registries (Generally not locked by date, but strictly managed)
  saveDriver: (item: Driver) => {
    const list = get<Driver[]>(K_DRIVERS, []);
    const idx = list.findIndex(i => i.id === item.id);
    if (idx >= 0) list[idx] = item; else list.push(item);
    set(K_DRIVERS, list);
  },
  deleteDriver: (id: string) => {
    const list = get<Driver[]>(K_DRIVERS, []);
    set(K_DRIVERS, list.filter(i => i.id !== id));
  },

  saveVehicle: (item: Vehicle) => {
    const list = get<Vehicle[]>(K_VEHICLES, []);
    const idx = list.findIndex(i => i.id === item.id);
    if (idx >= 0) list[idx] = item; else list.push(item);
    set(K_VEHICLES, list);
  },
  deleteVehicle: (id: string) => {
    const list = get<Vehicle[]>(K_VEHICLES, []);
    set(K_VEHICLES, list.filter(i => i.id !== id));
  },

  saveLine: (item: Line) => {
    const list = get<Line[]>(K_LINES, []);
    const idx = list.findIndex(i => i.id === item.id);
    if (idx >= 0) list[idx] = item; else list.push(item);
    set(K_LINES, list);
  },
  deleteLine: (id: string) => {
    const list = get<Line[]>(K_LINES, []);
    set(K_LINES, list.filter(i => i.id !== id));
  },
  
  saveRoute: (item: RouteDef) => {
    const list = get<RouteDef[]>(K_ROUTES, []);
    const idx = list.findIndex(i => i.id === item.id);
    if (idx >= 0) list[idx] = item; else list.push(item);
    set(K_ROUTES, list);
  },
  deleteRoute: (id: string) => {
    const list = get<RouteDef[]>(K_ROUTES, []);
    set(K_ROUTES, list.filter(i => i.id !== id));
  },

  saveAgency: (item: Agency) => {
    const list = get<Agency[]>(K_AGENCIES, []);
    const idx = list.findIndex(i => i.id === item.id);
    if (idx >= 0) list[idx] = item; else list.push(item);
    set(K_AGENCIES, list);
  },
  deleteAgency: (id: string) => {
    const list = get<Agency[]>(K_AGENCIES, []);
    set(K_AGENCIES, list.filter(i => i.id !== id));
  },

  saveClient: (item: Client) => {
    const list = get<Client[]>(K_CLIENTS, []);
    const idx = list.findIndex(i => i.id === item.id);
    if (idx >= 0) list[idx] = item; else list.push(item);
    set(K_CLIENTS, list);
  },
  deleteClient: (id: string) => {
    const list = get<Client[]>(K_CLIENTS, []);
    set(K_CLIENTS, list.filter(i => i.id !== id));
  },

  saveExpenseType: (item: ExpenseType) => {
    const list = get<ExpenseType[]>(K_EXPENSE_TYPES, []);
    const idx = list.findIndex(i => i.id === item.id);
    if (idx >= 0) list[idx] = item; else list.push(item);
    set(K_EXPENSE_TYPES, list);
  },
  deleteExpenseType: (id: string) => {
    const list = get<ExpenseType[]>(K_EXPENSE_TYPES, []);
    set(K_EXPENSE_TYPES, list.filter(i => i.id !== id));
  },

  saveCommission: (item: CommissionRule) => {
    const list = get<CommissionRule[]>(K_COMMISSIONS, []);
    const idx = list.findIndex(i => i.id === item.id);
    if (idx >= 0) list[idx] = item; else list.push(item);
    set(K_COMMISSIONS, list);
  },
  deleteCommission: (id: string) => {
    const list = get<CommissionRule[]>(K_COMMISSIONS, []);
    set(K_COMMISSIONS, list.filter(i => i.id !== id));
  },

  // Daily Close (The Authoritative Record)
  saveDailyClose: (item: DailyClose) => {
    const list = get<DailyClose[]>(K_DAILY_CLOSES, []);
    const idx = list.findIndex(i => i.date === item.date);
    if (idx >= 0) {
        list[idx] = item; 
    } else {
        list.push(item);
    }
    set(K_DAILY_CLOSES, list);
  },
  
  deleteDailyClose: (date: string) => {
      const list = get<DailyClose[]>(K_DAILY_CLOSES, []);
      set(K_DAILY_CLOSES, list.filter(c => c.date !== date));
  },

  reset: () => localStorage.clear()
};
