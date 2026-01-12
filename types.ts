
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

export interface Vehicle {
  id: string;
  plate: string;
  brand?: string;
  model?: string;
  year?: number;
  seats?: number;
  description: string;
  initialMileage?: number; // Added: Current Odometer at registration
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
  origin: string;
  destination: string;
  time: string;
  active: boolean;
}

export interface Agency {
  id: string;
  name: string;
  managerName?: string;
  phone?: string;
  email?: string;
  city: string;
  address?: string;
  active: boolean;
}

// NEW: Tourism Client
export interface Client {
  id: string;
  type: 'PF' | 'PJ';
  name: string; // Nome Completo or Razão Social
  tradeName?: string; // Nome Fantasia (PJ Only)
  taxId: string; // CPF or CNPJ
  identityDoc?: string; // RG or Inscrição Estadual
  phone: string;
  email?: string;
  
  // Address
  zipCode?: string;
  address: string;
  number?: string;
  neighborhood?: string;
  city: string;
  state: string;
  
  active: boolean;
}

export interface ExpenseType {
  id: string;
  name: string;
  active: boolean;
}

export interface CommissionRule {
  id: string;
  targetType: 'DRIVER' | 'AGENCY';
  targetId: string;
  percentage: number;
  active: boolean;
}

export interface Expense {
  typeId: string;
  amount: number;
  note?: string;
  // Strictly implies money taken FROM the cash bag of the route
}

export interface RouteCash {
  id: string;
  date: string;
  routeId: string;
  driverId: string;
  vehicleId: string;
  passengers: number;
  
  // Financials
  revenueInformed: number; // Total sold in tickets
  cashExpenses: number;    // Sum of expenses paid with cash from the bag
  netCashExpected: number; // revenueInformed - cashExpenses
  
  cashHanded: number;      // Physical money handed over
  diff: number;            // cashHanded - netCashExpected
  
  expenses: Expense[];
  notes?: string;
  status: 'OPEN' | 'CLOSED';
}

export interface AgencyCash {
  id: string;
  date: string;
  agencyId: string;
  valueInformed: number; // Sales report
  valueReceived: number; // Bank deposit or Cash
  expenses: Expense[];   // NEW: Expenses paid by the agency using cash
  diff: number;
  notes?: string;
  status: 'OPEN' | 'CLOSED';
}

export interface DailyClose {
  id: string;
  date: string;
  
  // Snapshots for historical integrity
  totalRouteRevenue: number;
  totalAgencyRevenue: number;
  
  totalExpenses: number; // Cash expenses from routes
  totalAgencyExpenses: number; // NEW: Cash expenses from agencies
  
  totalCommissions: number; // Commissions deducted from agencies
  netResult: number;     // Cash In - Cash Out
  totalDiff: number;     // Sum of all differences (Quebras/Sobras)
  
  notes?: string;
  closedAt: string;
}

export interface FuelEntry {
  id: string;
  date: string;
  vehicleId: string;
  amount: number;
  liters: number;
  mileage: number;
  isFullTank?: boolean; // Indicates if the tank was filled to the top
  paymentMethod: 'CASH' | 'CARD' | 'CREDIT';
  notes?: string;
}

export interface GeneralExpense {
  id: string;
  date: string; // Due date or Payment date
  description: string;
  amount: number;
  typeId: string; // Link to ExpenseType
  paymentMethod: 'CASH' | 'CREDIT' | 'DEBIT' | 'TRANSFER' | 'PIX' | 'BOLETO';
  status: 'PAID' | 'PENDING';
  paidAt?: string; // Date actually paid
  notes?: string;
}

export interface TourismService {
  id: string;
  clientId?: string; // Link to Client Registry
  contractorName: string; // Name snapshot (in case client is deleted or for manual entry)
  destination: string;
  departureDate: string;
  returnDate: string;
  driverId: string;
  vehicleId: string;
  
  // Pricing Logic
  pricingType: 'FIXED' | 'CALCULATED'; // FIXED = City/Tabled, CALCULATED = Km + Days
  pricePerKm?: number;
  totalKm?: number;
  dailyRate?: number;
  days?: number;

  contractValue: number; // Total value charged (Result)
  expenses: Expense[];   // Trip expenses (tolls, parking, food, fuel if separate)
  
  status: 'QUOTE' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED';
  notes?: string;
}

// --- MOCKS ---
export const MOCK_DRIVERS: Driver[] = [
  { id: '1', name: 'João Silva', phone: '(11) 99999-9999', cnhCategory: 'D', active: true },
  { id: '2', name: 'Pedro Santos', phone: '(11) 98888-8888', cnhCategory: 'E', active: true },
];

export const MOCK_VEHICLES: Vehicle[] = [
  { id: '1', plate: 'ABC-1234', description: 'Paradiso 1200', brand: 'Marcopolo', seats: 46, initialMileage: 150000, active: true },
  { id: '2', plate: 'XYZ-9876', description: 'Volare W9', brand: 'Volare', seats: 28, initialMileage: 85000, active: true },
];

export const MOCK_LINES: Line[] = [
  { id: '1', name: 'São Paulo x Campinas', active: true },
  { id: '2', name: 'São Paulo x Santos', active: true }
];

export const MOCK_ROUTES: RouteDef[] = [
  { id: '1', lineId: '1', origin: 'São Paulo', destination: 'Campinas', time: '08:00', active: true },
  { id: '2', lineId: '1', origin: 'Campinas', destination: 'São Paulo', time: '18:00', active: true },
  { id: '3', lineId: '2', origin: 'São Paulo', destination: 'Santos', time: '10:00', active: true }
];

export const MOCK_AGENCIES: Agency[] = [
  { id: '1', name: 'Agência Central', city: 'São Paulo', managerName: 'Roberto', phone: '(11) 3333-3333', active: true },
  { id: '2', name: 'Rodoviária Campinas', city: 'Campinas', managerName: 'Ana', active: true },
];

export const MOCK_CLIENTS: Client[] = [
  { id: '1', type: 'PJ', name: 'Igreja Batista Central', tradeName: 'Min. Jovem', taxId: '12.345.678/0001-90', phone: '(11) 91234-5678', address: 'Rua da Paz', number: '100', city: 'São Paulo', state: 'SP', active: true },
  { id: '2', type: 'PF', name: 'Maria Oliveira', taxId: '123.456.789-00', phone: '(19) 99876-5432', address: 'Av. Brasil', number: '500', city: 'Campinas', state: 'SP', active: true }
];

export const MOCK_EXPENSE_TYPES: ExpenseType[] = [
  { id: '1', name: 'Combustível (Rota)', active: true },
  { id: '2', name: 'Pedágio (Rota)', active: true },
  { id: '3', name: 'Alimentação', active: true },
  { id: '4', name: 'Manutenção Emergencial', active: true },
  { id: '5', name: 'Aluguel Garagem', active: true },
  { id: '6', name: 'Energia Elétrica', active: true },
  { id: '7', name: 'Internet/Telefonia', active: true },
  { id: '8', name: 'Salários', active: true },
  { id: '9', name: 'Material de Escritório', active: true },
];

export const MOCK_COMMISSIONS: CommissionRule[] = [
  { id: '1', targetType: 'AGENCY', targetId: '1', percentage: 10, active: true }, // 10% for Agencia Central
  { id: '2', targetType: 'DRIVER', targetId: '1', percentage: 5, active: true }, // 5% for João
];
