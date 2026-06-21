'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import {
  Search, Plus, Package, AlertCircle, TrendingUp, DollarSign, Upload,
  History, Receipt, Truck, X, BarChart3, Sparkles, Phone, Mail, Building,
  Edit2, Trash2, ChevronRight, RefreshCw, Save, Loader2, FileText,
  MoreHorizontal, Calendar, Clock, Bell, Filter, Download, Barcode,
  Eye, AlertTriangle, CheckCircle, Settings, Zap, Target, Activity,
  Thermometer, Droplets, Shield, Pill
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { useCustomAuth } from '@/lib/custom-auth';
import { usePagination } from '@/hooks/use-pagination';
import { useBranchFilter } from '@/lib/branch-context';
import { BranchBanner } from '@/components/BranchBanner';

const STOCK_STATUS = {
  IN_STOCK: { label: 'In Stock', color: '#10B981', bg: 'rgba(16,185,129,0.1)', icon: CheckCircle },
  LOW_STOCK: { label: 'Low Stock', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', icon: AlertTriangle },
  OUT_OF_STOCK: { label: 'Out of Stock', color: '#EF4444', bg: 'rgba(239,68,68,0.1)', icon: X },
  EXPIRED: { label: 'Expired', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', icon: AlertCircle },
  EXPIRING_SOON: { label: 'Expiring Soon', color: '#F97316', bg: 'rgba(249,115,22,0.1)', icon: Clock },
};

const STORAGE_CONDITIONS = {
  ROOM_TEMP: { label: 'Room Temperature', icon: Thermometer, color: '#10B981' },
  REFRIGERATED: { label: 'Refrigerated', icon: Droplets, color: '#0EA5E9' },
  CONTROLLED: { label: 'Controlled', icon: Shield, color: '#8B5CF6' },
  PROTECTED: { label: 'Light Protected', icon: Pill, color: '#F59E0B' },
};

const CATEGORIES = [
  'ANTIBIOTICS',
  'ANTIMALARIALS',
  'ANALGESICS_NSAIDS',
  'CARDIOVASCULAR',
  'DIABETES',
  'RESPIRATORY_COUGH',
  'VITAMINS_SUPPLEMENTS',
  'DERMATOLOGY_TOPICAL',
  'EYE_ENT',
  'ANTIFUNGALS',
  'ANTIVIRALS',
  'ANTIPARASITICS',
  'WOMENS_HEALTH',
  'NEUROLOGY_CNS',
  'GASTROINTESTINAL',
  'STARTINGS',
  'UROLOGY',
  'HORMONES_ENDOCRINE',
  'ANTIHISTAMINES_ALLERGY',
  'WOUND_CARE',
  'HERBAL_TRADITIONAL',
  'CONTRACEPTIVES',
  'PAEDIATRICS',
  'DEVICES_MONITORING',
  'INFUSIONS_INJECTIONS',
  'MISCELLANEOUS'
];

export default function EnhancedStockPage() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { 
    products: storeProducts, 
    suppliers,
    purchases,
    stockMovements,
    loadingProducts, 
    refetchProducts, 
    updateProductPrices,
    updateProductFull,
    createProduct,
    deleteProduct,
    adjustProductStock,
    error: storeError
  } = useStore();
  const branchFilter = useBranchFilter();
  const branchProducts = useMemo(() => branchFilter(storeProducts), [branchFilter, storeProducts]);
  const { signOut } = useCustomAuth();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [supplierFilter, setSupplierFilter] = useState('All');
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'alerts' | 'movements' | 'analytics'>('overview');

  // Stock Alert Modal
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertSettings, setAlertSettings] = useState({
    lowStockThreshold: 10,
    expiryThreshold: 30,
    enabled: true,
    emailNotifications: true,
    smsNotifications: false,
  });

  // Bulk Operations
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkAction, setBulkAction] = useState<'price' | 'stock' | 'supplier' | 'category'>('price');

  useEffect(() => setMounted(true), []);

  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const card = {
    bg: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)',
    border: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.5)',
    shadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    subtle: isDark ? '#64748B' : '#94A3B8',
    primary: isDark ? '#00D9FF' : '#0EA5E9',
    primaryBg: isDark ? 'rgba(0,217,255,0.1)' : 'rgba(14,165,233,0.1)',
    primaryBorder: isDark ? 'rgba(0,217,255,0.25)' : 'rgba(14,165,233,0.3)',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    inputBg: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC',
  };

  // Enhanced products with expiry and storage tracking
  const products = useMemo(() => {
    return branchProducts.map((p: any) => {
      const daysToExpiry = p.expiryDate ? Math.ceil((new Date(p.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 999;
      let status = 'IN_STOCK';
      
      if (p.stockQuantity === 0) status = 'OUT_OF_STOCK';
      else if (p.stockQuantity <= 10) status = 'LOW_STOCK';
      else if (daysToExpiry < 0) status = 'EXPIRED';
      else if (daysToExpiry <= 30) status = 'EXPIRING_SOON';

      return {
        ...p,
        status,
        daysToExpiry,
        expiryDate: p.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        storageCondition: p.storageCondition || 'ROOM_TEMP',
        batchNumber: p.batchNumber || `BATCH-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        reorderLevel: p.reorderLevel || 10,
        maxStock: p.maxStock || 100,
        minStock: p.minStock || 5,
        lastRestocked: p.lastRestocked || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        turnoverRate: Math.random() * 10 + 1, // Mock calculation
        storageLocation: p.storageLocation || 'Main Warehouse',
      };
    });
  }, [branchProducts]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p: any) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.genericName?.toLowerCase().includes(search.toLowerCase()) ||
        p.brand?.toLowerCase().includes(search.toLowerCase()) ||
        p.batchNumber?.toLowerCase().includes(search.toLowerCase());
      
      const matchCategory = categoryFilter === 'All' || p.category === categoryFilter;
      const matchStatus = statusFilter === 'All' || p.status === statusFilter;
      const matchSupplier = supplierFilter === 'All' || p.supplierId === supplierFilter;
      
      return matchSearch && matchCategory && matchStatus && matchSupplier;
    });
  }, [products, search, categoryFilter, statusFilter, supplierFilter]);

  // Stock analytics
  const analytics = useMemo(() => {
    const totalProducts = products.length;
    const inStock = products.filter((p: any) => p.status === 'IN_STOCK').length;
    const lowStock = products.filter((p: any) => p.status === 'LOW_STOCK').length;
    const outOfStock = products.filter((p: any) => p.status === 'OUT_OF_STOCK').length;
    const expired = products.filter((p: any) => p.status === 'EXPIRED').length;
    const expiringSoon = products.filter((p: any) => p.status === 'EXPIRING_SOON').length;

    const totalValue = products.reduce((sum: number, p: any) => sum + (p.stockQuantity * p.costPrice), 0);
    const retailValue = products.reduce((sum: number, p: any) => sum + (p.stockQuantity * p.sellingPrice), 0);
    const potentialProfit = retailValue - totalValue;

    // Category breakdown
    const categoryBreakdown = CATEGORIES.map(cat => ({
      category: cat,
      count: products.filter((p: any) => p.category === cat).length,
      value: products.filter((p: any) => p.category === cat).reduce((sum: number, p: any) => sum + (p.stockQuantity * p.costPrice), 0),
    })).filter(cat => cat.count > 0).sort((a, b) => b.value - a.value);

    // Supplier breakdown
    const supplierBreakdown = suppliers.map(supplier => ({
      supplier: supplier.name,
      count: products.filter((p: any) => p.supplierId === supplier.id).length,
      value: products.filter((p: any) => p.supplierId === supplier.id).reduce((sum: number, p: any) => sum + (p.stockQuantity * p.costPrice), 0),
    })).filter(s => s.count > 0).sort((a, b) => b.value - a.value);

    // Critical alerts
    const criticalAlerts = [
      ...products.filter((p: any) => p.status === 'OUT_OF_STOCK').map(p => ({
        type: 'OUT_OF_STOCK',
        product: p.name,
        message: `Completely out of stock`,
        severity: 'high',
      })),
      ...products.filter((p: any) => p.status === 'EXPIRED').map(p => ({
        type: 'EXPIRED',
        product: p.name,
        message: `Expired on ${p.expiryDate}`,
        severity: 'high',
      })),
      ...products.filter((p: any) => p.status === 'EXPIRING_SOON').map(p => ({
        type: 'EXPIRING_SOON',
        product: p.name,
        message: `Expires in ${p.daysToExpiry} days`,
        severity: 'medium',
      })),
      ...products.filter((p: any) => p.status === 'LOW_STOCK').map(p => ({
        type: 'LOW_STOCK',
        product: p.name,
        message: `Only ${p.stockQuantity} units left`,
        severity: 'low',
      })),
    ].slice(0, 10);

    return {
      totalProducts,
      inStock,
      lowStock,
      outOfStock,
      expired,
      expiringSoon,
      totalValue,
      retailValue,
      potentialProfit,
      categoryBreakdown,
      supplierBreakdown,
      criticalAlerts,
      healthScore: totalProducts > 0 ? Math.round((inStock / totalProducts) * 100) : 0,
    };
  }, [products, suppliers]);

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedProducts,
    nextPage,
    prevPage,
    goToPage,
    startIndex,
    endIndex,
    totalItems
  } = usePagination({
    data: filteredProducts,
    itemsPerPage: 10,
  });

  useEffect(() => goToPage(1), [search, categoryFilter, statusFilter, supplierFilter, goToPage]);

  if (!mounted) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <BranchBanner />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1" style={{ color: card.text }}>Enhanced Stock Management</h1>
          <p className="text-sm" style={{ color: card.muted }}>Real-time inventory tracking with expiry alerts and analytics</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAlertModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: card.warning + '18', color: card.warning, border: `1px solid ${card.warning}30` }}>
            <Bell size={16} />
            Alert Settings
          </button>
          <button onClick={() => setShowBulkModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
            <Settings size={16} />
            Bulk Actions
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Products', value: analytics.totalProducts, sub: `${analytics.inStock} in stock`, icon: Package, color: '#0EA5E9' },
          { label: 'Stock Value', value: `GH₵ ${(analytics.totalValue/1000).toFixed(1)}k`, sub: 'Cost value', icon: DollarSign, color: '#10B981' },
          { label: 'Low Stock', value: analytics.lowStock, sub: 'Need reorder', icon: AlertTriangle, color: '#F59E0B' },
          { label: 'Out of Stock', value: analytics.outOfStock, sub: 'Critical', icon: X, color: '#EF4444' },
          { label: 'Expired', value: analytics.expired, sub: `${analytics.expiringSoon} expiring`, icon: Clock, color: '#8B5CF6' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl border p-4 backdrop-blur-xl hover:scale-[1.02] transition-all cursor-pointer" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg" style={{ background: `${s.color}18`, color: s.color }}>
                  <Icon size={16} />
                </div>
                <p className="text-xs" style={{ color: card.subtle }}>{s.label}</p>
              </div>
              <p className="font-display text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px]" style={{ color: card.muted }}>{s.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: isDark ? 'rgba(15,23,42,0.4)' : '#F1F5F9' }}>
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'products', label: 'Products', icon: Package, count: analytics.totalProducts },
          { id: 'alerts', label: 'Alerts', icon: Bell, count: analytics.criticalAlerts.length },
          { id: 'movements', label: 'Movements', icon: History, count: (stockMovements || []).length },
          { id: 'analytics', label: 'Analytics', icon: TrendingUp },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all"
            style={{ background: activeTab === tab.id ? (isDark ? 'rgba(0,217,255,0.1)' : '#fff') : 'transparent', color: activeTab === tab.id ? card.primary : card.muted }}>
            <tab.icon size={16} />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: activeTab === tab.id ? card.primary : 'rgba(239,68,68,0.2)', color: activeTab === tab.id ? (isDark ? '#060B14' : '#fff') : card.danger }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Stock Health */}
          <div className="rounded-2xl border p-5 backdrop-blur-xl" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <h3 className="font-display text-sm font-bold mb-4" style={{ color: card.text }}>Stock Health Score</h3>
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke={isDark ? 'rgba(15,23,42,0.5)' : '#E2E8F0'} strokeWidth="12" fill="none" />
                  <circle cx="64" cy="64" r="56" stroke={analytics.healthScore > 80 ? card.success : analytics.healthScore > 60 ? card.warning : card.danger} strokeWidth="12" fill="none" strokeDasharray={`${2 * Math.PI * 56}`} strokeDashoffset={`${2 * Math.PI * 56 * (1 - analytics.healthScore / 100)}`} className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="font-display text-2xl font-bold" style={{ color: analytics.healthScore > 80 ? card.success : analytics.healthScore > 60 ? card.warning : card.danger }}>
                      {analytics.healthScore}%
                    </p>
                    <p className="text-xs" style={{ color: card.muted }}>Healthy</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { label: 'In Stock', value: analytics.inStock, total: analytics.totalProducts, color: card.success },
                { label: 'Low Stock', value: analytics.lowStock, total: analytics.totalProducts, color: card.warning },
                { label: 'Out of Stock', value: analytics.outOfStock, total: analytics.totalProducts, color: card.danger },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-xs w-20" style={{ color: card.muted }}>{item.label}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#E2E8F0' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${(item.value / item.total) * 100}%`, background: item.color }} />
                  </div>
                  <span className="text-xs font-bold w-8 text-right" style={{ color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Critical Alerts */}
          <div className="rounded-2xl border p-5 backdrop-blur-xl" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-sm font-bold" style={{ color: card.text }}>Critical Alerts</h3>
              <button onClick={() => setActiveTab('alerts')} className="text-xs font-medium" style={{ color: card.primary }}>View All</button>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {analytics.criticalAlerts.slice(0, 5).map((alert, index) => {
                const statusConfig = STOCK_STATUS[alert.type as keyof typeof STOCK_STATUS];
                const Icon = statusConfig.icon;
                return (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: statusConfig.bg }}>
                    <Icon size={16} style={{ color: statusConfig.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: card.text }}>{alert.product}</p>
                      <p className="text-xs" style={{ color: card.subtle }}>{alert.message}</p>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-1 rounded-full capitalize" style={{ background: statusConfig.color + '18', color: statusConfig.color }}>
                      {alert.severity}
                    </span>
                  </div>
                );
              })}
              {analytics.criticalAlerts.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle size={32} className="mx-auto mb-2" style={{ color: card.success }} />
                  <p className="text-sm font-medium" style={{ color: card.text }}>All systems optimal</p>
                  <p className="text-xs" style={{ color: card.subtle }}>No critical alerts at this time</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="rounded-2xl border backdrop-blur-xl overflow-hidden" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
          {/* Filters */}
          <div className="p-4 border-b flex flex-col md:flex-row gap-3 items-start md:items-center justify-between" style={{ borderColor: card.border, background: isDark ? 'rgba(15,23,42,0.4)' : 'rgba(248,250,252,0.8)' }}>
            <div className="flex gap-3 flex-1 overflow-x-auto">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={15} style={{ color: card.subtle }} />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
              </div>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-4 py-2.5 rounded-xl text-sm focus:outline-none whitespace-nowrap" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}>
                <option value="All">All Categories</option>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2.5 rounded-xl text-sm focus:outline-none whitespace-nowrap" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}>
                <option value="All">All Status</option>
                {Object.entries(STOCK_STATUS).map(([key, status]) => (
                  <option key={key} value={key}>{status.label}</option>
                ))}
              </select>
              <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)} className="px-4 py-2.5 rounded-xl text-sm focus:outline-none whitespace-nowrap" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}>
                <option value="All">All Suppliers</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium" style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
                <Download size={14} />
                Export
              </button>
            </div>
          </div>

          {/* Products Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: `1px solid ${card.border}`, background: isDark ? 'rgba(15,23,42,0.3)' : 'rgba(248,250,252,0.6)' }}>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: card.subtle }}>
                    <input type="checkbox" checked={selectedProducts.length === filteredProducts.length} onChange={(e) => setSelectedProducts(e.target.checked ? filteredProducts.map((p: any) => p.id) : [])} className="rounded" />
                  </th>
                  {['Product', 'Category', 'Stock', 'Value', 'Status', 'Expiry', 'Storage', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: card.subtle }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((product: any, i) => {
                  const statusConfig = STOCK_STATUS[product.status as keyof typeof STOCK_STATUS];
                  const storageConfig = STORAGE_CONDITIONS[product.storageCondition as keyof typeof STORAGE_CONDITIONS];
                  const StorageIcon = storageConfig.icon;
                  
                  return (
                    <tr key={product.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30" style={{ borderBottom: i < paginatedProducts.length - 1 ? `1px solid ${card.border}` : 'none' }}>
                      <td className="px-5 py-4">
                        <input type="checkbox" checked={selectedProducts.includes(product.id)} onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProducts([...selectedProducts, product.id]);
                          } else {
                            setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                          }
                        }} className="rounded" />
                      </td>
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-medium" style={{ color: card.text }}>{product.name}</p>
                          <p className="text-[10px]" style={{ color: card.subtle }}>{product.genericName}</p>
                          <p className="text-[9px] font-mono" style={{ color: card.subtle }}>Batch: {product.batchNumber}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs px-2 py-1 rounded-lg" style={{ background: card.inputBg, color: card.muted }}>
                          {product.category}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-center">
                          <p className="font-mono text-sm font-bold" style={{ color: card.text }}>{product.stockQuantity}</p>
                          <p className="text-[10px]" style={{ color: card.subtle }}>
                            Min: {product.minStock} / Max: {product.maxStock}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-right">
                          <p className="font-mono text-sm font-bold" style={{ color: card.primary }}>
                            GH₵ {(product.stockQuantity * product.costPrice).toLocaleString()}
                          </p>
                          <p className="text-[10px]" style={{ color: card.subtle }}>
                            GH₵ {product.costPrice} each
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <statusConfig.icon size={14} style={{ color: statusConfig.color }} />
                          <span className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ background: statusConfig.bg, color: statusConfig.color }}>
                            {statusConfig.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-center">
                          <p className="text-xs font-mono" style={{ color: product.daysToExpiry < 30 ? card.danger : card.text }}>
                            {product.expiryDate}
                          </p>
                          <p className="text-[9px]" style={{ color: card.subtle }}>
                            {product.daysToExpiry > 0 ? `${product.daysToExpiry} days` : 'Expired'}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <StorageIcon size={14} style={{ color: storageConfig.color }} />
                          <span className="text-[10px]" style={{ color: card.muted }}>
                            {storageConfig.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => router.push(`/dashboard/inventory/${product.id}`)} className="p-1.5 rounded-lg hover:bg-blue-500/10 text-blue-500" title="View Details">
                            <Eye size={14} />
                          </button>
                          <button className="p-1.5 rounded-lg hover:bg-green-500/10 text-green-500" title="Quick Edit">
                            <Edit2 size={14} />
                          </button>
                          <button className="p-1.5 rounded-lg hover:bg-orange-500/10 text-orange-500" title="Adjust Stock">
                            <RefreshCw size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: card.border }}>
            <p className="text-xs" style={{ color: card.muted }}>
              Showing <span className="font-bold" style={{ color: card.text }}>{startIndex}-{endIndex}</span> of <span className="font-bold" style={{ color: card.text }}>{totalItems}</span> products
            </p>
            <div className="flex gap-2">
              <button disabled={currentPage === 1} onClick={prevPage} className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-30" style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
                Previous
              </button>
              <button disabled={currentPage === totalPages} onClick={nextPage} className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-30" style={{ background: card.primary, color: '#fff' }}>
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="rounded-2xl border p-5 backdrop-blur-xl" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
          <h3 className="font-display text-sm font-bold mb-4" style={{ color: card.text }}>Stock Alerts & Notifications</h3>
          <div className="space-y-3">
            {analytics.criticalAlerts.map((alert, index) => {
              const statusConfig = STOCK_STATUS[alert.type as keyof typeof STOCK_STATUS];
              const Icon = statusConfig.icon;
              return (
                <div key={index} className="flex items-start gap-4 p-4 rounded-xl border" style={{ background: statusConfig.bg, borderColor: statusConfig.color + '30' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: statusConfig.color + '18' }}>
                    <Icon size={20} style={{ color: statusConfig.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold" style={{ color: card.text }}>{alert.product}</p>
                      <span className="text-[9px] font-bold px-2 py-1 rounded-full capitalize" style={{ background: statusConfig.color + '18', color: statusConfig.color }}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: card.muted }}>{alert.message}</p>
                    <div className="flex gap-2 mt-2">
                      <button className="text-xs font-medium px-3 py-1 rounded-lg" style={{ background: card.primary, color: '#fff' }}>
                        Order Now
                      </button>
                      <button className="text-xs font-medium px-3 py-1 rounded-lg" style={{ background: card.inputBg, color: card.text }}>
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
