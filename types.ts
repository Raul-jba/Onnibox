
export type UserRole = 'ADMIN' | 'MANAGER' | 'FINANCIAL' | 'OPERATOR';

export interface UserProfile {
  name: string;
  role: UserRole;
  companyName: string;
}

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'CLOSE' | 'REOPEN';
  entity: string; // Ex: 'RouteCash', 'Fuel', 'User'
  entityId: string;
  userId: string;
  userName: string;
  userRole: string;
  details: string; // Resumo legível (ex: "Alterou valor de 100 para 200")
  snapshot?: string; // JSON stringify do objeto para recuperação
  previousSnapshot?: string; // JSON do estado anterior (para UPDATE/DELETE)
}

export interface Driver {
  id: string;
  name: string;
  cpf?: string;
  phone?: string;
  cnh?: string;
  cnhCategory?: string;
  admissionDate?: string;
  active: boolean;
}

export interface DriverLedgerEntry {
  id: string;
  driverId: string;
  date: string;
  type: 'DEBIT' | 'CREDIT'; // DEBIT = Motorista Deve (Dívida/Vale), CREDIT = Motorista Pagou ou Tem Haver
  category: 'SHORTAGE' | 'ADVANCE' | 'PAYMENT' | 'BONUS' | 'REFUND'; 
  amount: number;
  description: string;
  relatedEntityId?: string; // ID da Rota ou Fechamento se houver
  createdAt: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  brand?: string;
  description: string;
  year?: number;
  seats?: number;
  initialMileage?: number;
  active: boolean;
}

export interface Line {
  id: string;
  name: string;
  active: boolean;
}

export interface RouteDef {
  id: string;
  lineId: string;
  time: string;
  origin: string;
  destination: string;
  active: boolean;
}

export interface Agency {
  id: string;
  name: string;
  city: string;
  address?: string;
  managerName?: string;
  phone?: string;
  email?: string;
  active: boolean;
}

export interface Client {
  id: string;
  name: string;
  type: 'PF' | 'PJ';
  tradeName?: string;
  taxId: string;
  identityDoc?: string;
  phone: string;
  email?: string;
  zipCode?: string;
  city?: string;
  state?: string;
  address?: string;
  number?: string;
  neighborhood?: string;
  active: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  tradeName?: string;
  taxId: string;
  category?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  active: boolean;
}

export interface ExpenseType {
  id: string;
  name: string;
  active: boolean;
}

export interface CommissionRule {
  id: string;
  targetType: 'AGENCY' | 'DRIVER';
  targetId: string;
  percentage: number;
  active: boolean;
}

export interface Expense {
  typeId: string;
  amount: number;
}

export interface RouteCash {
  id: string;
  date: string;
  routeId: string;
  driverId: string;
  vehicleId: string;
  passengers: number;
  revenueInformed: number;
  cashExpenses: number;
  expenses?: Expense[];
  netCashExpected: number;
  cashHanded: number;
  diff: number;
  status: 'OPEN' | 'CLOSED';
}

export interface AgencyCash {
  id: string;
  date: string;
  agencyId: string;
  valueInformed: number;
  valueReceived: number;
  expenses?: Expense[];
  diff: number;
  status: 'OPEN' | 'CLOSED';
  // SNAPSHOT FIELDS FOR HISTORICAL INTEGRITY
  commissionPctSnapshot?: number; 
}

export interface DailyClose {
  id: string;
  date: string;
  totalRouteRevenue: number;
  totalAgencyRevenue: number;
  totalTourismRevenue?: number;
  
  totalExpenses: number;
  totalAgencyExpenses?: number;
  totalTourismExpenses?: number;
  totalGeneralExpenses?: number; // ADDED: To track general expenses paid in cash
  
  totalCommissions: number;
  netResult: number;
  totalDiff: number;
  closedAt: string;
}

export interface FuelEntry {
  id: string;
  date: string;
  vehicleId: string;
  amount: number;
  liters: number;
  mileage: number;
  isFullTank?: boolean;
  paymentMethod: 'CARD' | 'CASH' | 'CREDIT';
  notes?: string;
}

export interface GeneralExpense {
  id: string;
  description: string;
  date: string;
  amount: number;
  status: 'PENDING' | 'PAID';
  paidAt?: string;
  typeId?: string;
  supplierId?: string;
  paymentMethod: string;
  notes?: string;
}

export interface TourismService {
  id: string;
  departureDate: string;
  returnDate: string;
  contractorName: string;
  destination: string;
  contractValue: number;
  receivedValue?: number; // ADDED: To track actual cash received
  expenses?: Expense[];
  status: 'QUOTE' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED' | 'REJECTED';
  pricingType?: 'FIXED' | 'CALCULATED';
  pricePerKm?: number;
  totalKm?: number;
  dailyRate?: number;
  days?: number;
  clientId?: string;
  driverId?: string;
  vehicleId?: string;
  notes?: string;
}

// MOCKS
export const MOCK_DRIVERS: Driver[] = [];
export const MOCK_VEHICLES: Vehicle[] = [];
export const MOCK_ROUTES: RouteDef[] = [];
export const MOCK_AGENCIES: Agency[] = [];
export const MOCK_EXPENSE_TYPES: ExpenseType[] = [];
export const MOCK_LINES: Line[] = [];
export const MOCK_COMMISSIONS: CommissionRule[] = [];
export const MOCK_CLIENTS: Client[] = [];
export const MOCK_SUPPLIERS: Supplier[] = [];
