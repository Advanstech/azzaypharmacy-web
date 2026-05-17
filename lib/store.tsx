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
  Q_PRODUCTS, Q_SUPPLIERS, Q_SALES, Q_STAFF, Q_ME, Q_CUSTOMERS,
  Q_PRODUCTS_BY_SUPPLIER, Q_PRESCRIPTIONS, Q_PURCHASES, Q_EXPENSES, Q_LEDGER,
  M_CREATE_SALE, M_CLOSE_TERMINAL, M_INVITE_STAFF, M_CREATE_STAFF_ACCOUNT,
  M_UPDATE_STAFF_PROFILE, M_UPDATE_DUTY_STATUS,
  M_UPDATE_PRODUCT_PRICES, M_UPDATE_PRODUCT_SUPPLIER, M_BULK_UPDATE_PRODUCT_SUPPLIER,
  M_CREATE_CUSTOMER, M_UPDATE_CUSTOMER,
  M_CREATE_PRODUCT, M_DELETE_PRODUCT, M_UPDATE_PRODUCT_STOCK, M_UPDATE_PRODUCT,
  M_CREATE_SUPPLIER, M_UPDATE_SUPPLIER, M_DELETE_SUPPLIER, M_REFUND_SALE,
} from './gql';
import { saveToCache, getFromCache } from './offline';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  createdAt: string;
  user?: { id: string; name: string; role: string };
  items: SaleItem[];
}

export interface StaffMember {
  id: string;
  supabaseId: string;
  email: string;
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
  createdAt: string;
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
  expenses: Expense[];
  ledger: LedgerEntry[];
  loadingPrescriptions: boolean;
  loadingPurchases: boolean;
  loadingExpenses: boolean;
  loadingLedger: boolean;

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
  refetchExpenses: () => Promise<void>;
  refetchLedger: () => Promise<void>;
  refetchAll: () => Promise<void>;

  // Mutations
  createSale: (args: {
    items: CartItem[];
    paymentMethod: string;
    amountPaid: number;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
  }) => Promise<Sale>;

  closeTerminal: () => Promise<TerminalReport>;

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
    role?: string;
    branchId?: string;
    position?: string;
    isActive?: boolean;
  }) => Promise<StaffMember>;

  updateDutyStatus: (userId: string, isOnDuty: boolean) => Promise<void>;

  updateProductPrices: (productId: string, costPrice: number, sellingPrice: number) => Promise<Product>;
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

  refundSale: (saleId: string, reason: string) => Promise<void>;

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
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);

  // ── Fetchers ──────────────────────────────────────────────────────────────

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
      const data = await gql<{ sales: Sale[] }>(Q_SALES);
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

  const refetchExpenses = useCallback(async () => {
    setLoadingExpenses(true);
    try {
      const data = await gql<{ expenses: Expense[] }>(Q_EXPENSES);
      setExpenses(data.expenses ?? []);
    } catch (e: any) {
      console.warn('[store] expenses fetch failed:', e.message);
    } finally {
      setLoadingExpenses(false);
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

  const refetchAll = useCallback(async () => {
    setSyncStatus('syncing');
    setError(null);
    try {
      await Promise.all([
        refetchProducts(),
        refetchSuppliers(),
        refetchSales(),
        refetchStaff(),
        refetchCustomers(),
      ]);
      // Load ERP modules lazily after core data
      await Promise.all([
        refetchPrescriptions(),
        refetchPurchases(),
        refetchExpenses(),
        refetchLedger(),
      ]);
      setSyncStatus('idle');
    } catch (err) {
      console.error('[store] Sync failed:', err);
      setSyncStatus('error');
    }
  }, [refetchProducts, refetchSuppliers, refetchSales, refetchStaff, refetchCustomers, refetchPrescriptions, refetchPurchases, refetchExpenses]);

  // Set token and fetch when it becomes available
  useEffect(() => {
    setAuthToken(token ?? null);
    if (token) {
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
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
  }): Promise<Sale> => {
    if (!me) throw new Error('Not authenticated');

    const variables = {
      userId: me.id,
      branchId: me.branchId || '',
      items: args.items.map(i => ({ productId: i.product.id, quantity: i.quantity })),
      paymentMethod: args.paymentMethod.toUpperCase(),
      amountPaid: args.amountPaid,
      customerId: args.customerId,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerEmail: args.customerEmail,
    };

    let newSale: Sale;
    try {
      const data = await gql<{ createSale: Sale }>(M_CREATE_SALE, variables);
      newSale = data.createSale;
    } catch (err) {
      console.warn('[store] Online sale failed, saving to offline queue:', err);
      // Create a mock sale for immediate UI
      newSale = {
        id: `offline-${Date.now()}`,
        totalAmount: args.items.reduce((sum, i) => sum + i.product.sellingPrice * i.quantity, 0),
        amountPaid: args.amountPaid,
        change: Math.max(0, args.amountPaid - args.items.reduce((sum, i) => sum + i.product.sellingPrice * i.quantity, 0)),
        paymentMethod: args.paymentMethod,
        customerName: args.customerName || 'Walk-in',
        createdAt: new Date().toISOString(),
        items: args.items.map(i => ({
          id: `item-${Date.now()}`,
          quantity: i.quantity,
          unitPrice: i.product.sellingPrice,
          total: i.product.sellingPrice * i.quantity,
          batchNo: 'OFFLINE',
          product: { id: i.product.id, name: i.product.name, category: i.product.category }
        }))
      };

      // Save to IndexedDB
      await saveToCache('pending_sales', [newSale]);
      
      // Register sync if possible
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        try {
          await (registration as any).sync.register('sync-pos-transactions');
        } catch (e) {
          console.warn('[store] Sync registration failed:', e);
        }
      }
    }

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
    // Delayed to avoid overwhelming the DB connection pool
    setTimeout(() => {
      refetchSales().catch(() => {});
      refetchProducts().catch(() => {});
      refetchLedger().catch(() => {});
    }, 3000);

    return newSale;
  }, [me, products, refetchSales, refetchProducts]);

  const closeTerminal = useCallback(async (): Promise<TerminalReport> => {
    if (!me) throw new Error('Not authenticated');
    const data = await gql<{ closeTerminal: TerminalReport }>(M_CLOSE_TERMINAL, { userId: me.id });
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
    userId: string; role?: string; branchId?: string; position?: string; isActive?: boolean;
  }): Promise<StaffMember> => {
    const data = await gql<{ updateStaffProfile: StaffMember }>(M_UPDATE_STAFF_PROFILE, args);
    const updated = data.updateStaffProfile;
    setStaff(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s));
    return updated;
  }, []);

  const updateDutyStatus = useCallback(async (userId: string, isOnDuty: boolean) => {
    await gql(M_UPDATE_DUTY_STATUS, { userId, isOnDuty });
    setStaff(prev => prev.map(s => s.id === userId ? { ...s, isOnDuty } : s));
    setMe(prev => prev && prev.id === userId ? { ...prev, isOnDuty } : prev);
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

  const refundSale = useCallback(async (saleId: string, reason: string) => {
    try {
      await gql(M_REFUND_SALE, { saleId, reason });
      await Promise.all([refetchSales(), refetchProducts()]);
    } catch (err: any) {
      setError(err.message || 'Failed to refund sale');
      throw err;
    }
  }, [refetchSales, refetchProducts]);

  const createProduct = useCallback(async (args: {
    name: string; genericName?: string; brand?: string; category: string;
    costPrice: number; sellingPrice: number; stockQuantity: number;
    supplierId?: string; strength?: string; dosageForm?: string;
    barcode?: string; nafdacNo?: string; requiresRx?: boolean; isControlled?: boolean; imageUrl?: string;
  }): Promise<Product> => {
    const data = await gql<{ createProduct: Product }>(M_CREATE_PRODUCT, args);
    const newProduct = data.createProduct;
    setProducts(prev => [newProduct, ...prev]);
    if (args.stockQuantity > 0) {
      setStockMovements(prev => [{
        id: `mv-${Date.now()}`,
        productId: newProduct.id,
        productName: newProduct.name,
        type: 'in' as const,
        quantity: args.stockQuantity,
        reason: 'Initial stock on product creation',
        user: me?.name,
        date: new Date().toISOString(),
      }, ...prev].slice(0, 200));
    }
    return newProduct;
  }, [me]);

  const deleteProduct = useCallback(async (productId: string): Promise<void> => {
    await gql(M_DELETE_PRODUCT, { productId });
    setProducts(prev => prev.filter(p => p.id !== productId));
  }, []);

  const updateProductFull = useCallback(async (productData: any): Promise<Product> => {
    const data = await gql<{ updateProduct: Product }>(M_UPDATE_PRODUCT, productData);
    const updated = data.updateProduct;
    setProducts(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
    return updated;
  }, []);

  const adjustProductStock = useCallback(async (productId: string, quantity: number, reason: string): Promise<void> => {
    const data = await gql<{ updateProductStock: Product }>(M_UPDATE_PRODUCT_STOCK, { productId, quantity, reason });
    const updated = data.updateProductStock;
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, stockQuantity: updated.stockQuantity } : p));
    setStockMovements(prev => [{
      id: `mv-${Date.now()}`,
      productId,
      productName: updated.name,
      type: (quantity >= 0 ? 'in' : 'out') as 'in' | 'out',
      quantity: Math.abs(quantity),
      reason,
      user: me?.name,
      date: new Date().toISOString(),
    }, ...prev].slice(0, 200));
  }, [me]);

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

  const getProductsBySupplier = useCallback(async (supplierId: string): Promise<Product[]> => {
    const data = await gql<{ productsBySupplier: Product[] }>(
      Q_PRODUCTS_BY_SUPPLIER, { supplierId }
    );
    return data.productsBySupplier ?? [];
  }, []);

  return (
    <StoreContext.Provider value={{
      products, suppliers, sales, staff, customers, me,
      prescriptions, purchases, expenses, ledger,
      loadingProducts, loadingSuppliers, loadingSales, loadingStaff, loadingCustomers,
      loadingPrescriptions, loadingPurchases, loadingExpenses, loadingLedger,
      error, syncStatus,
      lowStockProducts, todaySales, todayRevenue, todayTransactions,
      stockMovements,
      refetchProducts, refetchSales, refetchStaff, refetchCustomers,
      refetchPrescriptions, refetchPurchases, refetchExpenses, refetchLedger, refetchAll,
      createSale, closeTerminal, inviteStaff, createStaffAccount, updateStaffProfile, updateDutyStatus,
      updateProductPrices, updateProductFull,
      updateProductSupplier,
      bulkUpdateProductSupplier,
      createCustomer, updateCustomer, getProductsBySupplier,
      refundSale,
      createProduct, deleteProduct, adjustProductStock,
      createSupplier, updateSupplier, deleteSupplier,
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
