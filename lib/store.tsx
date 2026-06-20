/**
 * Azzay Pharmacy NEXUS — Global Data Store
 * Single source of truth for all pages.
 * Fetches from the API, caches in memory, exposes typed helpers.
 */
'use client';

import {
  createContext, useContext, useEffect, useState,
  useCallback, useRef, ReactNode
} from 'react';
import {
  gql, setAuthToken,
  Q_PRODUCTS, Q_SUPPLIERS, Q_SALES, Q_SALES_PAGINATED, Q_STAFF, Q_ME, Q_CUSTOMERS,
  Q_PRODUCTS_BY_SUPPLIER, Q_PRESCRIPTIONS, Q_PURCHASES, Q_EXPENSES, Q_EXPENSE_CATEGORIES, Q_LEDGER, Q_INVOICES, Q_REFUND_REQUESTS,
  M_CREATE_SALE, M_CLOSE_TERMINAL, M_INVITE_STAFF, M_CREATE_STAFF_ACCOUNT, M_RECORD_SUPPLIER_PAYMENT, M_DELETE_INVOICE, M_DELETE_SALE,
  M_UPDATE_STAFF_PROFILE, M_UPDATE_DUTY_STATUS, M_GENERATE_TEMP_PASSWORD, M_DELETE_STAFF,
  M_UPDATE_PRODUCT_PRICES, M_BULK_UPDATE_PRODUCT_PRICES, M_UPDATE_PRODUCT_SUPPLIER, M_BULK_UPDATE_PRODUCT_SUPPLIER,
  M_CREATE_CUSTOMER, M_UPDATE_CUSTOMER,
  M_CREATE_PRODUCT, M_DELETE_PRODUCT, M_UPDATE_PRODUCT_STOCK, M_UPDATE_PRODUCT,
  M_CREATE_SUPPLIER, M_UPDATE_SUPPLIER, M_DELETE_SUPPLIER, M_CREATE_EXPENSE,
  M_REQUEST_REFUND, M_APPROVE_REFUND, M_REJECT_REFUND,
  Q_STOCK_TRANSFERS
} from './gql';
import { saveToCache, getFromCache, savePendingSale, isOnline } from './offline';
import { initTauriSync } from './tauri-sync';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StockItem {
  id: string;
  batchNo: string;
  expiryDate: string;
  quantity: number;
  costPrice: number;
  receivedAt: string;
  isExpired: boolean;
}

export interface Product {
  id: string;
  name: string;
  genericName?: string;
  brand?: string;
  category: string;
  sellingPrice: number;
  costPrice: number;
  stockQuantity: number;
  supplierId?: string;
  imageUrl?: string;
  strength?: string;
  dosageForm?: string;
  requiresRx?: boolean;
  isControlled?: boolean;
  branchId?: string;
  stockItems?: StockItem[];
}

export interface Supplier {
  id: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  tin?: string;
  aiScore?: number;
  categories: string[];
}

export interface SaleItem {
  id: string;
  quantity: number;
  unitPrice: number;
  total: number;
  batchNo: string;
  product: { id: string; name: string; category: string };
}

export interface Sale {
  id: string;
  totalAmount: number;
  amountPaid: number;
  change: number;
  paymentMethod: string;
  customerName?: string;
  customerPhone?: string;
  receiptNo?: string;
  subtotal?: number;
  discountAmt?: number;
  discountReason?: string;
  nhil?: number;
  getfund?: number;
  covid19Levy?: number;
  vat?: number;
  nhisClaimNo?: string;
  status?: string;
  profitMargin?: number;
  averageItemValue?: number;
  customerType?: string;
  notes?: string;
  isRefunded?: boolean;
  refundReason?: string;
  refundedAt?: string;
  createdAt: string;
  cashierId?: string;
  branchId?: string;
  user?: { id: string; name: string; role: string };
  items: SaleItem[];
}

export interface StaffMember {
  id: string;
  supabaseId: string;
  email: string;
  phone?: string;
  name: string;
  avatarUrl?: string;
  role: string;
  branchId?: string;
  isOnDuty: boolean;
  lastSeen?: string;
  position?: string;
  isActive: boolean;
  branch?: { id: string; name: string; location?: string; phone?: string };
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  loyaltyPoints?: number;
  totalSpent?: number;
  createdAt?: string;
}

export interface RefundRequest {
  id: string;
  saleId: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  sale: Partial<Sale>;
  requestedBy: { id: string; name: string };
  approvedBy?: { id: string; name: string };
}

export interface TerminalReport {
  cashierName: string;
  branchName: string;
  totalSales: number;
  cashSales: number;
  momoSales: number;
  cardSales: number;
  nhisSales: number;
  creditSales: number;
  transactionCount: number;
  closingTime: string;
}

export interface RxItem {
  id: string;
  drugName: string;
  quantity: number;
  dosage?: string;
  dispensed: boolean;
}

export interface Prescription {
  id: string;
  rxNumber: string;
  patientName: string;
  patientAge?: number;
  patientPhone?: string;
  doctorName?: string;
  status: string;
  issueDate: string;
  expiryDate: string;
  dispensedAt?: string;
  notes?: string;
  items: RxItem[];
  createdAt: string;
  branchId?: string;
}

export interface PurchaseItem {
  id: string;
  quantity: number;
  unitCost: number;
  total: number;
  batchNo?: string;
  expiryDate?: string;
  product?: { id: string; name: string };
}

export interface Purchase {
  id: string;
  invoiceNo?: string;
  invoiceDate: string;
  status: string;
  total: number;
  supplier?: { id: string; name: string };
  items: PurchaseItem[];
  createdAt: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  date: string;
  receiptUrl?: string;
  category?: ExpenseCategory;
  status: string;
  branchId?: string;
  createdAt: string;
}

export interface InvoicePayment {
  id: string;
  invoiceId: string;
  amount: number;
  method: string;
  reference?: string;
  notes?: string;
  paidAt?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  supplierId: string;
  purchaseId?: string;
  type: string;
  issueDate: string;
  dueDate?: string;
  subtotal: number;
  vat: number;
  total: number;
  paidAmount: number;
  balance: number;
  paymentStatus: string;
  notes?: string;
  createdAt: string;
  supplier?: { id: string; name: string; contact?: string; phone?: string; email?: string };
  payments?: InvoicePayment[];
  uploadedBy?: { id: string; name: string; role: string };
  approvalStatus?: string;
  approvedBy?: { id: string; name: string; role: string };
  purchase?: {
    id: string;
    items: {
      id: string;
      quantity: number;
      unitCost: number;
      sellingPrice?: number;
      total: number;
      product: {
        id: string;
        name: string;
        costPrice?: number;
        basePrice?: number;
      }
    }[];
  };
}

export interface LedgerEntry {
  id: string;
  type: 'DEBIT' | 'CREDIT';
  account: string;
  amount: number;
  date: string;
  description: string;
  saleId?: string;
  ref?: string;
  supplier?: string;
  category?: string;
  paymentMethod?: string;
}

export interface StockTransferItem {
  id: string;
  quantity: number;
  costPrice: number;
  transferPrice: number;
  total: number;
  batchNo?: string;
  expiryDate?: string;
  product?: Product;
}

export interface StockTransfer {
  id: string;
  transferNo: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RECEIVED';
  notes?: string;
  transferDate: string;
  totalCost: number;
  transferPrice: number;
  invoiceId?: string;
  purchaseId?: string;
  sourceBranch?: { id: string; name: string };
  destBranch?: { id: string; name: string };
  initiatedBy?: { id: string; name: string; role?: string };
  approvedBy?: { id: string; name: string; role?: string };
  items: StockTransferItem[];
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  reference?: string;
  user?: string;
  date: string;
  branchId?: string;
  branchName?: string;
  supplierId?: string;
  supplierName?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

// ─── Store Context ─────────────────────────────────────────────────────────────

interface StoreState {
  // Data
  products: Product[];
  suppliers: Supplier[];
  sales: Sale[];
  staff: StaffMember[];
  customers: Customer[];
  me: StaffMember | null;

  // Loading states
  loadingProducts: boolean;
  loadingSuppliers: boolean;
  loadingSales: boolean;
  loadingStaff: boolean;
  loadingCustomers: boolean;

  // ERP modules
  prescriptions: Prescription[];
  purchases: Purchase[];
  invoices: Invoice[];
  expenses: Expense[];
  ledger: LedgerEntry[];
  stockTransfers: StockTransfer[];
  loadingPrescriptions: boolean;
  loadingPurchases: boolean;
  loadingInvoices: boolean;
  loadingExpenses: boolean;
  loadingLedger: boolean;
  loadingTransfers: boolean;
  expenseCategories: ExpenseCategory[];
  loadingExpenseCategories: boolean;

  // Errors
  error: string | null;
  syncStatus: 'idle' | 'syncing' | 'error';

  // Derived / computed
  lowStockProducts: Product[];
  todaySales: Sale[];
  todayRevenue: number;
  todayTransactions: number;

  // Refetch helpers
  refetchProducts: () => Promise<void>;
  refetchSales: () => Promise<void>;
  refetchStaff: () => Promise<void>;
  refetchCustomers: () => Promise<void>;
  refetchPrescriptions: () => Promise<void>;
  refetchPurchases: () => Promise<void>;
  refetchInvoices: () => Promise<void>;
  refetchExpenses: () => Promise<void>;
  refetchLedger: () => Promise<void>;
  refetchExpenseCategories: () => Promise<void>;
  refetchTransfers: () => Promise<void>;
  refetchAll: () => Promise<void>;

  // Mutations
  createSale: (args: {
    items: CartItem[];
    paymentMethod: string;
    amountPaid: number;
    cashAmount?: number;
    momoAmount?: number;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
  }) => Promise<Sale>;

  closeTerminal: (physicalCash?: number, digitalPayments?: number, notes?: string) => Promise<TerminalReport>;

  inviteStaff: (args: {
    email: string;
    name: string;
    role: string;
    branchId: string;
  }) => Promise<boolean>;

  createStaffAccount: (args: {
    email: string;
    password: string;
    name: string;
    role: string;
    branchId: string;
    position?: string;
  }) => Promise<boolean>;

  updateStaffProfile: (args: {
    userId: string;
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
    branchId?: string;
    position?: string;
    isActive?: boolean;
  }) => Promise<StaffMember>;

  updateDutyStatus: (userId: string, isOnDuty: boolean) => Promise<void>;
  deleteStaff: (userId: string) => Promise<boolean>;

  generateTempPassword: (userId: string) => Promise<string>;

  updateProductPrices: (productId: string, costPrice: number, sellingPrice: number) => Promise<Product>;
  bulkUpdateProductPrices: (updates: Array<{ productId: string; costPrice: number; sellingPrice: number }>) => Promise<Product[]>;
  updateProductFull: (productData: any) => Promise<Product>;
  updateProductSupplier: (productId: string, supplierId: string) => Promise<void>;
  bulkUpdateProductSupplier: (productIds: string[], supplierId: string) => Promise<void>;

  createCustomer: (args: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  }) => Promise<Customer>;

  updateCustomer: (args: {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  }) => Promise<Customer>;

  refundRequests: RefundRequest[];
  refetchRefundRequests: () => Promise<void>;
  requestRefund: (saleId: string, reason: string) => Promise<void>;
  approveRefund: (requestId: string) => Promise<void>;
  rejectRefund: (requestId: string) => Promise<void>;

  getProductsBySupplier: (supplierId: string) => Promise<Product[]>;

  // Stock movements (local log derived from sales + purchases)
  stockMovements: StockMovement[];

  // Product CRUD
  createProduct: (args: {
    name: string;
    genericName?: string;
    brand?: string;
    category: string;
    costPrice: number;
    sellingPrice: number;
    stockQuantity: number;
    supplierId?: string;
    strength?: string;
    dosageForm?: string;
    barcode?: string;
    nafdacNo?: string;
    requiresRx?: boolean;
    isControlled?: boolean;
    imageUrl?: string;
    expiryDate?: string;
    branchId?: string;
  }) => Promise<Product>;

  deleteProduct: (productId: string) => Promise<void>;

  adjustProductStock: (productId: string, quantity: number, reason: string) => Promise<void>;

  // Supplier CRUD
  createSupplier: (args: {
    name: string;
    contact?: string;
    phone?: string;
    email?: string;
    address?: string;
    tin?: string;
    categories?: string[];
  }) => Promise<Supplier>;

  updateSupplier: (args: {
    id: string;
    name?: string;
    contact?: string;
    phone?: string;
    email?: string;
    address?: string;
    tin?: string;
    categories?: string[];
  }) => Promise<Supplier>;

  deleteSupplier: (id: string) => Promise<void>;

  // Invoice Management
  recordSupplierPayment: (invoiceId: string, amount: number, method: string, reference?: string, notes?: string) => Promise<Invoice>;
  deleteInvoice: (invoiceId: string) => Promise<void>;
  deleteSale: (saleId: string) => Promise<boolean>;

  // Financials
  createExpense: (args: {
    categoryId: string;
    amount: number;
    description: string;
    date: string;
    receiptUrl?: string;
  }) => Promise<Expense>;
}

const StoreContext = createContext<StoreState | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function StoreProvider({ children, token }: { children: ReactNode; token?: string | null }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [me, setMe] = useState<StaffMember | null>(null);

  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [loadingSales, setLoadingSales] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [loadingExpenseCategories, setLoadingExpenseCategories] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
  const [loadingTransfers, setLoadingTransfers] = useState(false);

  // ── Fetchers ──────────────────────────────────────────────────────────────

  const refetchTransfers = useCallback(async () => {
    setLoadingTransfers(true);
    try {
      const data = await gql<{ stockTransfers: StockTransfer[] }>(Q_STOCK_TRANSFERS);
      setStockTransfers(data.stockTransfers ?? []);
    } catch (e: any) {
      console.warn('[store] stockTransfers fetch failed:', e.message);
    } finally {
      setLoadingTransfers(false);
    }
  }, []);

  const refetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      // Try cache first
      const cached = await getFromCache('products_cache');
      if (cached?.length) setProducts(cached);

      const data = await gql<{ products: Product[] }>(Q_PRODUCTS);
      if (data.products) {
        setProducts(data.products);
        await saveToCache('products_cache', data.products);
      }
    } catch (e: any) {
      console.warn('[store] products fetch failed:', e.message);
      if (e.message.includes('Unauthorized')) {
        setError('Session expired. Please log out and back in to sync NEXUS data.');
      }
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const refetchSuppliers = useCallback(async () => {
    setLoadingSuppliers(true);
    try {
      const data = await gql<{ suppliers: Supplier[] }>(Q_SUPPLIERS);
      setSuppliers(data.suppliers ?? []);
    } catch (e: any) {
      console.warn('[store] suppliers fetch failed:', e.message);
    } finally {
      setLoadingSuppliers(false);
    }
  }, []);

  const refetchSales = useCallback(async () => {
    setLoadingSales(true);
    try {
      // Instead of all sales, load only recent ones to speed up initial render
      const data = await gql<{ sales: Sale[] }>(Q_SALES_PAGINATED, { limit: 200, offset: 0 });
      setSales(data.sales ?? []);
    } catch (e: any) {
      console.warn('[store] sales fetch failed:', e.message);
    } finally {
      setLoadingSales(false);
    }
  }, []);

  const refetchStaff = useCallback(async () => {
    setLoadingStaff(true);
    try {
      const [staffCached] = await Promise.all([
        getFromCache('staff_cache'),
        // No explicit cache for 'me' yet, but we could add it
      ]);
      if (staffCached?.length) setStaff(staffCached);

      const [staffData, meData] = await Promise.all([
        gql<{ staff: StaffMember[] }>(Q_STAFF),
        gql<{ me: StaffMember }>(Q_ME),
      ]);
      if (staffData.staff) {
        setStaff(staffData.staff);
        await saveToCache('staff_cache', staffData.staff);
      }
      setMe(meData.me ?? null);
    } catch (e: any) {
      console.warn('[store] staff fetch failed:', e.message);
      if (e.message.includes('Unauthorized') || e.message.includes('not authenticated')) {
        setError('Your session has expired. Please log out and sign in again to view the staff list.');
      }
    } finally {
      setLoadingStaff(false);
    }
  }, []);

  const refetchCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    try {
      const data = await gql<{ customers: Customer[] }>(Q_CUSTOMERS);
      setCustomers(data.customers ?? []);
    } catch (e: any) {
      console.warn('[store] customers fetch failed:', e.message);
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  const refetchPrescriptions = useCallback(async () => {
    setLoadingPrescriptions(true);
    try {
      const data = await gql<{ prescriptions: Prescription[] }>(Q_PRESCRIPTIONS);
      setPrescriptions(data.prescriptions ?? []);
    } catch (e: any) {
      console.warn('[store] prescriptions fetch failed:', e.message);
    } finally {
      setLoadingPrescriptions(false);
    }
  }, []);

  const refetchPurchases = useCallback(async () => {
    setLoadingPurchases(true);
    try {
      const data = await gql<{ purchases: Purchase[] }>(Q_PURCHASES);
      setPurchases(data.purchases ?? []);
    } catch (e: any) {
      console.warn('[store] purchases fetch failed:', e.message);
    } finally {
      setLoadingPurchases(false);
    }
  }, []);

  const refetchInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    try {
      // Fetch branchId directly from Q_ME rather than relying on `me` React state
      // (which may not have updated yet when called from refetchAll)
      let branchId = me?.branchId;
      if (!branchId) {
        const meData = await gql<{ me: { branchId: string } }>(`query Me { me { branchId } }`);
        branchId = meData.me?.branchId;
      }
      if (!branchId) {
        console.warn('[store] refetchInvoices: no branchId — skipping');
        return;
      }
      const data = await gql<{ invoices: Invoice[] }>(Q_INVOICES, { branchId });
      setInvoices(data.invoices ?? []);
    } catch (e: any) {
      console.warn('[store] invoices fetch failed:', e.message);
    } finally {
      setLoadingInvoices(false);
    }
  }, [me?.branchId]);

  const refetchExpenses = useCallback(async () => {
    setLoadingExpenses(true);
    try {
      const data = await gql<{ expenses: { items: Expense[] } }>(Q_EXPENSES);
      setExpenses(data.expenses?.items ?? []);
    } catch (e: any) {
      console.warn('[store] expenses fetch failed:', e.message);
    } finally {
      setLoadingExpenses(false);
    }
  }, []);

  const refetchExpenseCategories = useCallback(async () => {
    setLoadingExpenseCategories(true);
    try {
      const data = await gql<{ expenseCategories: ExpenseCategory[] }>(Q_EXPENSE_CATEGORIES);
      setExpenseCategories(data.expenseCategories ?? []);
    } catch (e: any) {
      console.warn('[store] expense categories fetch failed:', e.message);
    } finally {
      setLoadingExpenseCategories(false);
    }
  }, []);

  const refetchLedger = useCallback(async () => {
    if (!me?.branchId) return;
    setLoadingLedger(true);
    try {
      const data = await gql<{ ledgerEntries: LedgerEntry[] }>(Q_LEDGER, { branchId: me.branchId });
      setLedger(data.ledgerEntries ?? []);
    } catch (e: any) {
      console.warn('[store] ledger fetch failed:', e.message);
    } finally {
      setLoadingLedger(false);
    }
  }, [me?.branchId]);
  const refetchRefundRequests = useCallback(async () => {
    try {
      const data = await gql<{ refundRequests: { items: RefundRequest[] } }>(Q_REFUND_REQUESTS, { page: 1, limit: 1000 });
      setRefundRequests(data.refundRequests?.items || []);
    } catch (err: any) {
      console.error('Failed to fetch refund requests', err);
    }
  }, []);

  const refetchAll = useCallback(async () => {
    setSyncStatus('syncing');
    setError(null);
    try {
      // Phase 1a: Staff first (sets me+branchId needed by phase 2)
      await refetchStaff();
      // Phase 1b: Core data in small batches to stay within DB connection pool (limit: 5)
      await Promise.all([refetchProducts(), refetchSuppliers()]);
      await Promise.all([refetchSales(), refetchCustomers()]);
      // Phase 2: ERP modules — batched to avoid pool exhaustion
      await Promise.all([refetchPrescriptions(), refetchPurchases(), refetchInvoices()]);
      await Promise.all([refetchExpenses(), refetchExpenseCategories(), refetchLedger(), refetchRefundRequests()]);
      setSyncStatus('idle');
    } catch (err) {
      console.error('[store] Sync failed:', err);
      setSyncStatus('error');
    }
  }, [refetchProducts, refetchSuppliers, refetchSales, refetchStaff, refetchCustomers, refetchPrescriptions, refetchPurchases, refetchInvoices, refetchExpenses, refetchExpenseCategories, refetchLedger, refetchRefundRequests]);

  // Track previous token to only fetch on null→token transitions, not on every refresh
  const prevTokenRef = useRef<string | null | undefined>(undefined);

  // Set token and fetch when it becomes available
  useEffect(() => {
    setAuthToken(token ?? null);
    const wasEmpty = !prevTokenRef.current;
    const hasToken = !!token;
    prevTokenRef.current = token ?? null;

    if (hasToken && wasEmpty) {
      // Only fetch on first token arrival (null→token), not on silent token refreshes
      console.log('[store] Token acquired — initiating data sync');
      try {
        initTauriSync().catch(err => console.warn('[store] Tauri sync init failed:', err));
      } catch (err) {
        console.warn('[store] Tauri not available, running web-only mode');
      }
      refetchAll();
    }
  }, [token]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const lowStockProducts = products.filter(p => p.stockQuantity <= 10);

  const today = new Date().toDateString();
  const todaySales = sales.filter(s => new Date(s.createdAt).toDateString() === today);
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
  const todayTransactions = todaySales.length;

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createSale = useCallback(async (args: {
    items: CartItem[];
    paymentMethod: string;
    amountPaid: number;
    cashAmount?: number;
    momoAmount?: number;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
  }): Promise<Sale> => {
    if (!me) throw new Error('Not authenticated');

    // Check if online before attempting API call
    const online = isOnline();
    if (!online) {
      console.warn('[store] ⚠️ Device is offline - saving sale locally');
    }

    const variables = {
      userId: me.id,
      branchId: me.branchId || '',
      items: args.items.map(i => ({ productId: i.product.id, quantity: i.quantity })),
      paymentMethod: args.paymentMethod.toUpperCase(),
      amountPaid: args.amountPaid,
      cashAmount: args.cashAmount,
      momoAmount: args.momoAmount,
      customerId: args.customerId,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerEmail: args.customerEmail,
    };

    let newSale: Sale | undefined;
    let isSynced = false;

    // Calculate total amount for both online and offline paths
    const totalAmount = args.items.reduce((sum, i) => sum + i.product.sellingPrice * i.quantity, 0);

    // Only try API if online
    if (online) {
      try {
        console.log('[store] 📤 Sending createSale mutation...', variables);
        const data = await gql<{ createSale: Sale }>(M_CREATE_SALE, variables);
        newSale = data.createSale;
        isSynced = true;
        console.log('[store] ✅ Sale synced to backend!', { id: newSale.id, total: newSale.totalAmount });
      } catch (err: any) {
        console.error('[store] ❌ Online sale failed:', {
          error: err?.message,
          status: err?.status,
          response: err?.response,
          stack: err?.stack
        });
        // Fall through to offline path
      }
    }

    // If offline or API failed, create offline sale
    if (!isSynced) {
      // Create a mock sale for immediate UI
      newSale = {
        id: `offline-${Date.now()}`,
        totalAmount,
        amountPaid: args.amountPaid,
        change: Math.max(0, args.amountPaid - totalAmount),
        paymentMethod: args.paymentMethod,
        customerName: args.customerName || 'Walk-in',
        createdAt: new Date().toISOString(),
        user: me ? { id: me.id, name: me.name, role: me.role } : undefined,
        items: args.items.map(i => ({
          id: `item-${Date.now()}`,
          quantity: i.quantity,
          unitPrice: i.product.sellingPrice,
          total: i.product.sellingPrice * i.quantity,
          batchNo: 'OFFLINE',
          product: { id: i.product.id, name: i.product.name, category: i.product.category }
        }))
      };

      // Save to IndexedDB with proper PendingSale structure for tauri-sync
      await savePendingSale({
        id: newSale.id,
        items: args.items.map(i => ({ name: i.product.id, qty: i.quantity, price: i.product.sellingPrice })),
        total: totalAmount,
        payment_method: args.paymentMethod,
        cashier_name: me?.name || 'Unknown',
        cashier_id: me?.id,
        branch_name: me?.branch?.name || (typeof me?.branch === 'string' ? me.branch : 'Unknown'),
        branch_id: me?.branchId,
        timestamp: Date.now()
      });

      // Register sync if possible
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        try {
          await (registration as any).sync.register('sync-pos-transactions');
        } catch (e) {
          console.warn('[store] Sync registration failed:', e);
        }
      }

      console.warn('[store] 📱 Sale saved locally (offline mode). Will sync when connection restored.');
    }

    // Ensure newSale is assigned (TypeScript safety)
    if (!newSale) {
      throw new Error('Sale creation failed: no sale data available');
    }

    // Mark if synced or pending
    (newSale as any)._isSynced = isSynced;
    (newSale as any)._syncStatus = isSynced ? 'SYNCED' : 'PENDING';

    // Optimistically update local state
    setSales(prev => [newSale, ...prev]);

    // Decrement product stock locally and record movements
    const newMovements: StockMovement[] = [];
    setProducts(prev => prev.map(p => {
      const soldItem = args.items.find(i => i.product.id === p.id);
      if (!soldItem) return p;
      newMovements.push({
        id: `mv-${Date.now()}-${p.id}`,
        productId: p.id,
        productName: p.name,
        type: 'out',
        quantity: soldItem.quantity,
        reason: `Sale - Receipt #${newSale.id}`,
        reference: newSale.id,
        user: me?.name,
        date: new Date().toISOString(),
        branchId: me?.branchId,
        branchName: me?.branch?.name || (typeof me?.branch === 'string' ? me.branch : ''),
      });
      return { ...p, stockQuantity: Math.max(0, p.stockQuantity - soldItem.quantity) };
    }));
    if (newMovements.length > 0) {
      setStockMovements(prev => [...newMovements, ...prev].slice(0, 200));
    }

    // Also update the products cache with new stock quantities
    const updatedProducts = products.map(p => {
      const soldItem = args.items.find(i => i.product.id === p.id);
      if (!soldItem) return p;
      return { ...p, stockQuantity: Math.max(0, p.stockQuantity - soldItem.quantity) };
    });
    await saveToCache('products_cache', updatedProducts);

    // Schedule background re-sync after sale completes
    // Short delay to let the DB transaction commit before re-fetching
    setTimeout(() => {
      refetchSales().catch(() => { });
      refetchProducts().catch(() => { });
      refetchLedger().catch(() => { });
    }, 500);

    return newSale;
  }, [me, products, refetchSales, refetchProducts]);

  const closeTerminal = useCallback(async (physicalCash?: number, digitalPayments?: number, notes?: string): Promise<TerminalReport> => {
    if (!me) throw new Error('Not authenticated');
    const data = await gql<{ closeTerminal: TerminalReport }>(M_CLOSE_TERMINAL, {
      userId: me.id,
      physicalCash,
      digitalPayments,
      notes
    });
    return data.closeTerminal;
  }, [me]);

  const inviteStaff = useCallback(async (args: {
    email: string; name: string; role: string; branchId: string;
  }): Promise<boolean> => {
    const data = await gql<{ inviteStaff: boolean }>(M_INVITE_STAFF, args);
    const result = data.inviteStaff;
    if (result) {
      await refetchStaff();
    }
    return result;
  }, [refetchStaff]);

  const createStaffAccount = useCallback(async (args: {
    email: string; password: string; name: string; role: string; branchId: string; position?: string;
  }): Promise<boolean> => {
    const data = await gql<{ createStaffAccount: boolean }>(M_CREATE_STAFF_ACCOUNT, args);
    const result = data.createStaffAccount;
    if (result) {
      await refetchStaff();
    }
    return result;
  }, [refetchStaff]);

  const updateStaffProfile = useCallback(async (args: {
    userId: string; name?: string; email?: string; phone?: string; role?: string; branchId?: string; position?: string; isActive?: boolean;
  }): Promise<StaffMember> => {
    const data = await gql<{ updateStaffProfile: StaffMember }>(M_UPDATE_STAFF_PROFILE, args);
    const updated = data.updateStaffProfile;
    setStaff(prev => {
      const nextStaff = prev.map(s => s.id === updated.id ? { ...s, ...updated } : s);
      saveToCache('staff_cache', nextStaff).catch(err => console.warn('[store] failed to cache staff on update:', err));
      return nextStaff;
    });
    return updated;
  }, []);

  const updateDutyStatus = useCallback(async (userId: string, isOnDuty: boolean) => {
    await gql(M_UPDATE_DUTY_STATUS, { userId, isOnDuty });
    setStaff(prev => prev.map(s => s.id === userId ? { ...s, isOnDuty } : s));
    setMe(prev => prev && prev.id === userId ? { ...prev, isOnDuty } : prev);
  }, []);

  const deleteStaffFn = useCallback(async (userId: string): Promise<boolean> => {
    const data = await gql<{ deleteStaff: boolean }>(M_DELETE_STAFF, { userId });
    const result = data.deleteStaff;
    if (result) {
      setStaff(prev => prev.filter(s => s.id !== userId));
    }
    return result;
  }, []);

  const generateTempPassword = useCallback(async (userId: string): Promise<string> => {
    const data = await gql<{ generateTempPassword: string }>(M_GENERATE_TEMP_PASSWORD, { userId });
    return data.generateTempPassword;
  }, []);

  const updateProductPrices = useCallback(async (
    productId: string, costPrice: number, sellingPrice: number
  ): Promise<Product> => {
    const data = await gql<{ updateProductPrices: Product }>(
      M_UPDATE_PRODUCT_PRICES, { productId, costPrice, sellingPrice }
    );
    const updated = data.updateProductPrices;
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...updated } : p));
    return updated;
  }, []);

  const bulkUpdateProductPrices = useCallback(async (
    updates: Array<{ productId: string; costPrice: number; sellingPrice: number }>
  ): Promise<Product[]> => {
    const data = await gql<{ bulkUpdateProductPrices: Product[] }>(
      M_BULK_UPDATE_PRODUCT_PRICES, { updates: JSON.stringify(updates) }
    );
    const updated = data.bulkUpdateProductPrices;
    setProducts(prev => prev.map(p => {
      const u = updated.find(u => u.id === p.id);
      return u ? { ...p, ...u } : p;
    }));
    await Promise.all([refetchProducts(), refetchPurchases(), refetchInvoices(), refetchLedger()]);
    return updated;
  }, [refetchProducts, refetchPurchases, refetchInvoices, refetchLedger]);

  const updateProductSupplier = useCallback(async (productId: string, supplierId: string) => {
    try {
      await gql(M_UPDATE_PRODUCT_SUPPLIER, { productId, supplierId });
      await refetchProducts();
    } catch (err: any) {
      setError(err.message || 'Failed to update supplier');
      throw err;
    }
  }, [refetchProducts]);

  const bulkUpdateProductSupplier = useCallback(async (productIds: string[], supplierId: string) => {
    try {
      await gql(M_BULK_UPDATE_PRODUCT_SUPPLIER, { productIds, supplierId });
      await refetchProducts();
    } catch (err: any) {
      setError(err.message || 'Failed to bulk update supplier');
      throw err;
    }
  }, [refetchProducts]);

  const createCustomer = useCallback(async (args: {
    name: string; email?: string; phone?: string; address?: string;
  }): Promise<Customer> => {
    const data = await gql<{ createCustomer: Customer }>(M_CREATE_CUSTOMER, args);
    const newCustomer = data.createCustomer;
    setCustomers(prev => [newCustomer, ...prev]);
    return newCustomer;
  }, []);

  const updateCustomer = useCallback(async (args: {
    id: string; name?: string; email?: string; phone?: string; address?: string;
  }): Promise<Customer> => {
    const data = await gql<{ updateCustomer: Customer }>(M_UPDATE_CUSTOMER, args);
    const updated = data.updateCustomer;
    setCustomers(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
    return updated;
  }, []);


  const requestRefund = useCallback(async (saleId: string, reason: string) => {
    try {
      await gql(M_REQUEST_REFUND, { saleId, reason });
      await refetchRefundRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to request refund');
      throw err;
    }
  }, [refetchRefundRequests]);

  const approveRefund = useCallback(async (requestId: string) => {
    try {
      await gql(M_APPROVE_REFUND, { requestId });
      await Promise.all([refetchRefundRequests(), refetchSales(), refetchProducts()]);
    } catch (err: any) {
      setError(err.message || 'Failed to approve refund');
      throw err;
    }
  }, [refetchRefundRequests, refetchSales, refetchProducts]);

  const rejectRefund = useCallback(async (requestId: string) => {
    try {
      await gql(M_REJECT_REFUND, { requestId });
      await refetchRefundRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to reject refund');
      throw err;
    }
  }, [refetchRefundRequests]);

  const createProduct = useCallback(async (args: {
    name: string; genericName?: string; brand?: string; category: string;
    costPrice: number; sellingPrice: number; stockQuantity: number;
    supplierId?: string; strength?: string; dosageForm?: string;
    barcode?: string; nafdacNo?: string; requiresRx?: boolean; isControlled?: boolean;
    imageUrl?: string;
    expiryDate?: string;
    branchId?: string;
  }): Promise<Product> => {
    const data = await gql<{ createProduct: Product }>(M_CREATE_PRODUCT, args);
    const newProduct = data.createProduct;
    setProducts(prev => [newProduct, ...prev]);
    if (args.stockQuantity > 0) {
      const supplier = suppliers.find(s => s.id === args.supplierId);
      setStockMovements(prev => [{
        id: `mv-${Date.now()}`,
        productId: newProduct.id,
        productName: newProduct.name,
        type: 'in' as const,
        quantity: args.stockQuantity,
        reason: 'Initial stock on product creation',
        user: me?.name,
        date: new Date().toISOString(),
        branchId: args.branchId || me?.branchId,
        branchName: me?.branch?.name || (typeof me?.branch === 'string' ? me.branch : ''),
        supplierId: args.supplierId,
        supplierName: supplier?.name,
      }, ...prev].slice(0, 200));
    }
    return newProduct;
  }, [me]);

  const deleteProduct = useCallback(async (productId: string): Promise<void> => {
    await gql(M_DELETE_PRODUCT, { productId });
    setProducts(prev => prev.filter(p => p.id !== productId));
    // Refetch all related data that may have been affected
    await Promise.all([
      refetchSales().catch(() => {}),
      refetchPurchases().catch(() => {}),
      refetchPrescriptions().catch(() => {}),
    ]);
  }, [refetchSales, refetchPurchases, refetchPrescriptions]);

  const updateProductFull = useCallback(async (productData: any): Promise<Product> => {
    const data = await gql<{ updateProduct: Product }>(M_UPDATE_PRODUCT, productData);
    const updated = data.updateProduct;
    setProducts(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
    return updated;
  }, [me?.branchId]);

  const adjustProductStock = useCallback(async (productId: string, quantity: number, reason: string): Promise<void> => {
    const data = await gql<{ updateProductStock: Product }>(M_UPDATE_PRODUCT_STOCK, { productId, quantity, reason });
    const updated = data.updateProductStock;
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, stockQuantity: updated.stockQuantity } : p));
    const product = products.find(p => p.id === productId);
    const supplier = suppliers.find(s => s.id === product?.supplierId);
    setStockMovements(prev => [{
      id: `mv-${Date.now()}`,
      productId,
      productName: updated.name,
      type: (quantity >= 0 ? 'in' : 'out') as 'in' | 'out',
      quantity: Math.abs(quantity),
      reason,
      user: me?.name,
      date: new Date().toISOString(),
      branchId: me?.branchId,
      branchName: me?.branch?.name || (typeof me?.branch === 'string' ? me.branch : ''),
      supplierId: product?.supplierId,
      supplierName: supplier?.name,
    }, ...prev].slice(0, 200));
  }, [me, products, suppliers]);

  const createSupplier = useCallback(async (args: {
    name: string; contact?: string; phone?: string; email?: string;
    address?: string; tin?: string; categories?: string[];
  }): Promise<Supplier> => {
    const data = await gql<{ createSupplier: Supplier }>(M_CREATE_SUPPLIER, { input: args });
    const newSupplier = data.createSupplier;
    setSuppliers(prev => [newSupplier, ...prev]);
    return newSupplier;
  }, []);

  const updateSupplier = useCallback(async (args: {
    id: string; name?: string; contact?: string; phone?: string;
    email?: string; address?: string; tin?: string; categories?: string[];
  }): Promise<Supplier> => {
    const { id, ...rest } = args;
    const data = await gql<{ updateSupplier: Supplier }>(M_UPDATE_SUPPLIER, { id, input: rest });
    const updated = data.updateSupplier;
    setSuppliers(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s));
    return updated;
  }, []);

  const deleteSupplier = useCallback(async (id: string): Promise<void> => {
    await gql(M_DELETE_SUPPLIER, { id });
    setSuppliers(prev => prev.filter(s => s.id !== id));
  }, []);

  const recordSupplierPayment = useCallback(async (invoiceId: string, amount: number, method: string, reference?: string, notes?: string): Promise<Invoice> => {
    const data = await gql<{ recordSupplierPayment: Invoice }>(M_RECORD_SUPPLIER_PAYMENT, { invoiceId, amount, method, reference, notes });
    const updatedInvoice = data.recordSupplierPayment;
    setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, ...updatedInvoice } : inv));
    refetchLedger();
    return updatedInvoice;
  }, [refetchLedger]);

  const createExpense = useCallback(async (args: {
    categoryId: string; amount: number; description: string; date: string; receiptUrl?: string;
  }): Promise<Expense> => {
    if (!me?.branchId) throw new Error('No branch assigned');
    const data = await gql<{ createExpense: Expense }>(M_CREATE_EXPENSE, { ...args, branchId: me.branchId });
    const newExpense = data.createExpense;
    setExpenses(prev => [newExpense, ...prev]);
    refetchLedger();
    return newExpense;
  }, [me?.branchId, refetchLedger]);

  const deleteInvoice = useCallback(async (invoiceId: string): Promise<void> => {
    await gql(M_DELETE_INVOICE, { invoiceId });
    setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
    refetchLedger();
  }, [refetchLedger]);

  const deleteSale = useCallback(async (saleId: string): Promise<boolean> => {
    try {
      console.log('[store] Attempting to delete sale:', saleId);
      const result = await gql<{ deleteSale: boolean }>(M_DELETE_SALE, { saleId });
      console.log('[store] Delete sale result:', result);
      if (result.deleteSale) {
        setSales(prev => prev.filter(s => s.id !== saleId));
        refetchProducts();
        refetchLedger();
        refetchSales();
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('[store] Failed to delete sale:', error);
      console.error('[store] Error details:', error?.message, error?.response);
      return false;
    }
  }, [refetchProducts, refetchLedger, refetchSales]);

  const getProductsBySupplier = useCallback(async (supplierId: string): Promise<Product[]> => {
    const data = await gql<{ productsBySupplier: Product[] }>(
      Q_PRODUCTS_BY_SUPPLIER, { supplierId }
    );
    return data.productsBySupplier ?? [];
  }, []);

  return (
    <StoreContext.Provider value={{
      products, suppliers, sales, staff, customers, me,
      prescriptions, purchases, invoices, expenses, expenseCategories, ledger,
      stockTransfers, loadingTransfers,
      loadingProducts, loadingSuppliers, loadingSales, loadingStaff, loadingCustomers,
      loadingPrescriptions, loadingPurchases, loadingInvoices, loadingExpenses, loadingExpenseCategories, loadingLedger,
      error, syncStatus,
      lowStockProducts, todaySales, todayRevenue, todayTransactions,
      stockMovements,
      refetchProducts, refetchSales, refetchStaff, refetchCustomers,
      refetchPrescriptions, refetchPurchases, refetchInvoices, refetchExpenses, refetchExpenseCategories, refetchLedger, refetchTransfers, refetchAll,
      createSale, closeTerminal, inviteStaff, createStaffAccount, updateStaffProfile, updateDutyStatus, deleteStaff: deleteStaffFn, generateTempPassword,
      updateProductPrices, bulkUpdateProductPrices, updateProductFull,
      updateProductSupplier,
      bulkUpdateProductSupplier,
      createCustomer, updateCustomer, getProductsBySupplier,
      refundRequests,
      refetchRefundRequests,
      requestRefund,
      approveRefund,
      rejectRefund,
      createProduct, deleteProduct, adjustProductStock,
      createSupplier, updateSupplier, deleteSupplier,
      recordSupplierPayment, deleteInvoice, deleteSale,
      createExpense,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

// Convenience hooks
export const useProducts = () => {
  const { products, loadingProducts, refetchProducts } = useStore();
  return { products, loading: loadingProducts, refetch: refetchProducts };
};

export const useSuppliers = () => {
  const { suppliers, loadingSuppliers } = useStore();
  return { suppliers, loading: loadingSuppliers };
};

export const useSales = () => {
  const { sales, loadingSales, refetchSales, todaySales, todayRevenue, todayTransactions } = useStore();
  return { sales, loading: loadingSales, refetch: refetchSales, todaySales, todayRevenue, todayTransactions };
};

export const useStaff = () => {
  const { staff, me, loadingStaff, refetchStaff } = useStore();
  return { staff, me, loading: loadingStaff, refetch: refetchStaff };
};

export const useCustomers = () => {
  const { customers, loadingCustomers, refetchCustomers } = useStore();
  return { customers, loading: loadingCustomers, refetch: refetchCustomers };
};
