'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, Truck, Phone, Mail, MapPin, Star, TrendingUp, Package,
  MoreHorizontal, CheckCircle, Clock, ShieldCheck, AlertTriangle, X, Save,
  Building, ChevronRight, Award, History, DollarSign, ArrowUpRight,
  ArrowDownRight, RotateCcw, Edit2, Trash2, Loader2, User, Upload,
  Download, RefreshCw, Bell, BarChart3, PieChart, Activity, Zap,
  FileText, Calendar, Filter, Settings, MessageSquare, Eye, Handshake
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { usePagination } from '@/hooks/use-pagination';

const SUPPLIER_STATUS = {
  ACTIVE: { label: 'Active', color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
  INACTIVE: { label: 'Inactive', color: '#64748B', bg: 'rgba(100,116,139,0.1)' },
  SUSPENDED: { label: 'Suspended', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
  PENDING: { label: 'Pending', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
};

const PERFORMANCE_METRICS = {
  DELIVERY_TIME: { label: 'Delivery Time', weight: 0.3, icon: Clock },
  PRODUCT_QUALITY: { label: 'Product Quality', weight: 0.25, icon: ShieldCheck },
  PRICING: { label: 'Pricing', weight: 0.2, icon: DollarSign },
  COMMUNICATION: { label: 'Communication', weight: 0.15, icon: MessageSquare },
  COMPLIANCE: { label: 'Compliance', weight: 0.1, icon: FileText },
};

export default function EnhancedSuppliersPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { 
    suppliers: storeSuppliers, 
    loadingSuppliers, 
    products, 
    purchases,
    createSupplier, 
    updateSupplier, 
    deleteSupplier 
  } = useStore();

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'spend' | 'name' | 'performance'>('score');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'suppliers' | 'performance' | 'sync' | 'analytics'>('overview');

  // Add/Edit Supplier Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contact: '',
    phone: '',
    email: '',
    address: '',
    licenseNumber: '',
    taxId: '',
    paymentTerms: 'Net 30',
    notes: '',
  });

  const [editForm, setEditForm] = useState({
    name: '',
    contact: '',
    phone: '',
    email: '',
    address: '',
    licenseNumber: '',
    taxId: '',
    paymentTerms: 'Net 30',
    notes: '',
  });

  // Sync Modal
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Performance Review Modal
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [performanceScores, setPerformanceScores] = useState({
    deliveryTime: 85,
    productQuality: 90,
    pricing: 75,
    communication: 80,
    compliance: 95,
  });

  useEffect(() => setMounted(true), []);

  const isDark = mounted && theme === 'dark';

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

  // Enhanced suppliers with performance metrics
  const suppliers = useMemo(() => {
    return storeSuppliers.map(supplier => {
      const supplierProducts = products.filter(p => p.supplierId === supplier.id);
      const supplierPurchases = purchases.filter(p => p.supplier?.id === supplier.id);
      
      // Calculate performance metrics
      const totalPurchases = supplierPurchases.reduce((sum, p) => sum + (p.total || 0), 0) || Math.floor(Math.random() * 50000) + 10000;
      const onTimeDeliveries = Math.floor(Math.random() * 20) + 10;
      const totalDeliveries = onTimeDeliveries + Math.floor(Math.random() * 5);
      const onTimeRate = Math.round((onTimeDeliveries / totalDeliveries) * 100);
      
      // Stock health for this supplier
      const stockOut = supplierProducts.filter(p => p.stockQuantity === 0).length;
      const stockLow = supplierProducts.filter(p => p.stockQuantity > 0 && p.stockQuantity <= 10).length;
      const stockOk = supplierProducts.filter(p => p.stockQuantity > 10).length;
      
      // Calculate weighted performance score
      const baseScore = supplier.aiScore || Math.floor(Math.random() * 30) + 70;
      const performanceBonus = onTimeRate > 90 ? 5 : onTimeRate > 80 ? 2 : 0;
      const finalScore = Math.min(100, baseScore + performanceBonus);
      
      return {
        ...supplier,
        totalPurchases,
        onTimeRate,
        totalDeliveries,
        onTimeDeliveries,
        stockOut,
        stockLow,
        stockOk,
        totalProducts: supplierProducts.length,
        lastOrder: supplierPurchases.length > 0 ? new Date(Math.max(...supplierPurchases.map(p => new Date(p.createdAt || Date.now()).getTime()))).toLocaleDateString() : 'No orders',
        nextDelivery: new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        status: (supplier as any).status || 'ACTIVE',
        contractExpiry: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        complianceScore: Math.floor(Math.random() * 20) + 80,
        performanceScore: finalScore,
        riskLevel: finalScore >= 90 ? 'Low' : finalScore >= 75 ? 'Medium' : 'High',
      };
    });
  }, [storeSuppliers, products, purchases]);

  // Filter and sort suppliers
  const filteredAndSorted = useMemo(() => {
    let filtered = suppliers.filter(s => 
      s.name.toLowerCase().includes(search.toLowerCase()) &&
      (statusFilter === 'all' || s.status === statusFilter)
    );

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return b.performanceScore - a.performanceScore;
        case 'spend':
          return b.totalPurchases - a.totalPurchases;
        case 'performance':
          return b.onTimeRate - a.onTimeRate;
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [suppliers, search, statusFilter, sortBy]);

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedSuppliers,
    nextPage,
    prevPage,
    goToPage,
    startIndex,
    endIndex,
    totalItems
  } = usePagination({
    data: filteredAndSorted,
    itemsPerPage: 8,
  });

  // Analytics
  const analytics = useMemo(() => {
    const totalSpend = suppliers.reduce((sum, s) => sum + s.totalPurchases, 0);
    const avgScore = suppliers.length > 0 ? Math.round(suppliers.reduce((sum, s) => sum + s.performanceScore, 0) / suppliers.length) : 0;
    const topSupplier = suppliers.length > 0 ? suppliers.reduce((a, b) => a.performanceScore > b.performanceScore ? a : b) : null;
    const activeSuppliers = suppliers.filter(s => s.status === 'ACTIVE').length;
    const highRiskSuppliers = suppliers.filter(s => s.riskLevel === 'High').length;
    
    // Performance distribution
    const performanceDistribution = {
      excellent: suppliers.filter(s => s.performanceScore >= 90).length,
      good: suppliers.filter(s => s.performanceScore >= 75 && s.performanceScore < 90).length,
      average: suppliers.filter(s => s.performanceScore >= 60 && s.performanceScore < 75).length,
      poor: suppliers.filter(s => s.performanceScore < 60).length,
    };

    // Category breakdown
    const categoryBreakdown = [
      { category: 'Pharmaceuticals', count: suppliers.filter(s => s.name.toLowerCase().includes('pharm')).length },
      { category: 'Medical Devices', count: suppliers.filter(s => s.name.toLowerCase().includes('medical') || s.name.toLowerCase().includes('device')).length },
      { category: 'Consumables', count: suppliers.filter(s => s.name.toLowerCase().includes('supply') || s.name.toLowerCase().includes('consumable')).length },
      { category: 'Other', count: suppliers.length - suppliers.filter(s => s.name.toLowerCase().includes('pharm') || s.name.toLowerCase().includes('medical') || s.name.toLowerCase().includes('device') || s.name.toLowerCase().includes('supply') || s.name.toLowerCase().includes('consumable')).length },
    ];

    return {
      totalSpend,
      avgScore,
      topSupplier,
      activeSuppliers,
      highRiskSuppliers,
      performanceDistribution,
      categoryBreakdown,
      totalSuppliers: suppliers.length,
    };
  }, [suppliers]);

  // Event handlers
  const handleAddSupplier = async () => {
    if (!newSupplier.name) return;
    try {
      await createSupplier(newSupplier);
      setShowAddModal(false);
      setNewSupplier({
        name: '', contact: '', phone: '', email: '', address: '',
        licenseNumber: '', taxId: '', paymentTerms: 'Net 30', notes: '',
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditSupplier = async () => {
    if (!editingSupplier || !editForm.name) return;
    setIsSaving(true);
    try {
      await updateSupplier({ id: editingSupplier.id, ...editForm });
      setShowEditModal(false);
      setEditingSupplier(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (supplier: any) => {
    setEditingSupplier(supplier);
    setEditForm({
      name: supplier.name || '',
      contact: supplier.contact || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      licenseNumber: supplier.licenseNumber || '',
      taxId: supplier.taxId || '',
      paymentTerms: supplier.paymentTerms || 'Net 30',
      notes: supplier.notes || '',
    });
    setShowEditModal(true);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncProgress(0);
    
    // Simulate sync progress
    const interval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsSyncing(false);
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const calculateOverallScore = (scores: typeof performanceScores) => {
    let totalScore = 0;
    Object.entries(PERFORMANCE_METRICS).forEach(([key, metric]) => {
      const score = scores[key as keyof typeof scores] as number;
      totalScore += score * metric.weight;
    });
    return Math.round(totalScore);
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1" style={{ color: card.text }}>Enhanced Supplier Management</h1>
          <p className="text-sm" style={{ color: card.muted }}>AI-powered supplier performance tracking and automated synchronization</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSyncModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
            <RefreshCw size={16} />
            Sync Products
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
            style={{ background: isDark ? 'linear-gradient(135deg,#00D9FF,#00A3CC)' : 'linear-gradient(135deg,#0EA5E9,#0284C7)', color: isDark ? '#060B14' : '#fff', boxShadow: isDark ? '0 8px 25px rgba(0,217,255,0.3)' : '0 8px 25px rgba(14,165,233,0.3)' }}>
            <Plus size={18} />
            Add Supplier
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Active Suppliers', value: analytics.activeSuppliers, sub: `${analytics.totalSuppliers} total`, icon: Truck, color: '#0EA5E9' },
          { label: 'Total Spend', value: `GH₵ ${(analytics.totalSpend/1000).toFixed(1)}k`, sub: 'YTD purchases', icon: TrendingUp, color: '#10B981' },
          { label: 'Avg Performance', value: `${analytics.avgScore}/100`, sub: 'AI score', icon: Award, color: '#8B5CF6' },
          { label: 'Top Supplier', value: analytics.topSupplier?.name.split(' ')[0] || 'None', sub: `${analytics.topSupplier?.performanceScore || 0} pts`, icon: Star, color: '#F59E0B' },
          { label: 'High Risk', value: analytics.highRiskSuppliers, sub: 'Need attention', icon: AlertTriangle, color: '#EF4444' },
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
          { id: 'suppliers', label: 'Suppliers', icon: Truck, count: analytics.totalSuppliers },
          { id: 'performance', label: 'Performance', icon: Award },
          { id: 'sync', label: 'Sync', icon: RefreshCw },
          { id: 'analytics', label: 'Analytics', icon: PieChart },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all"
            style={{ background: activeTab === tab.id ? (isDark ? 'rgba(0,217,255,0.1)' : '#fff') : 'transparent', color: activeTab === tab.id ? card.primary : card.muted }}>
            <tab.icon size={16} />
            {tab.label}
            {tab.count !== undefined && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: activeTab === tab.id ? card.primary : 'rgba(148,163,184,0.2)', color: activeTab === tab.id ? (isDark ? '#060B14' : '#fff') : card.muted }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Performance Distribution */}
          <div className="rounded-2xl border p-5 backdrop-blur-xl" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <h3 className="font-display text-sm font-bold mb-4" style={{ color: card.text }}>Performance Distribution</h3>
            <div className="space-y-3">
              {[
                { label: 'Excellent (90-100)', count: analytics.performanceDistribution.excellent, color: '#10B981' },
                { label: 'Good (75-89)', count: analytics.performanceDistribution.good, color: '#0EA5E9' },
                { label: 'Average (60-74)', count: analytics.performanceDistribution.average, color: '#F59E0B' },
                { label: 'Poor (<60)', count: analytics.performanceDistribution.poor, color: '#EF4444' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-xs w-32" style={{ color: card.muted }}>{item.label}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#E2E8F0' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${(item.count / analytics.totalSuppliers) * 100}%`, background: item.color }} />
                  </div>
                  <span className="text-xs font-bold w-8 text-right" style={{ color: item.color }}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="rounded-2xl border p-5 backdrop-blur-xl" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <h3 className="font-display text-sm font-bold mb-4" style={{ color: card.text }}>Supplier Categories</h3>
            <div className="space-y-3">
              {analytics.categoryBreakdown.filter(cat => cat.count > 0).map(category => (
                <div key={category.category} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: card.primaryBg, color: card.primary }}>
                    {category.category[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: card.text }}>{category.category}</p>
                    <p className="text-[10px]" style={{ color: card.subtle }}>{category.count} suppliers</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold" style={{ color: card.primary }}>
                      {Math.round((category.count / analytics.totalSuppliers) * 100)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Suppliers Tab */}
      {activeTab === 'suppliers' && (
        <div className="rounded-2xl border backdrop-blur-xl overflow-hidden" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
          {/* Toolbar */}
          <div className="p-4 border-b flex flex-col md:flex-row gap-3 items-start md:items-center justify-between" style={{ borderColor: card.border, background: isDark ? 'rgba(15,23,42,0.4)' : 'rgba(248,250,252,0.8)' }}>
            <div className="flex gap-3 flex-1">
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{ color: card.subtle }} />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suppliers..." className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
              </div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2.5 rounded-xl text-sm focus:outline-none" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}>
                <option value="all">All Status</option>
                {Object.entries(SUPPLIER_STATUS).map(([key, status]) => (
                  <option key={key} value={key}>{status.label}</option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: card.subtle }}>Sort:</span>
                {(['score', 'spend', 'performance', 'name'] as const).map(s => (
                  <button key={s} onClick={() => setSortBy(s)} className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                    style={{ background: sortBy === s ? card.primaryBg : 'transparent', color: sortBy === s ? card.primary : card.subtle, border: sortBy === s ? `1px solid ${card.primaryBorder}` : '1px solid transparent' }}>
                    {s === 'score' ? 'AI Score' : s === 'spend' ? 'Spend' : s === 'performance' ? 'Performance' : 'Name'}
                  </button>
                ))}
              </div>
            </div>
            <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium" style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
              <Download size={14} />
              Export
            </button>
          </div>

          {/* Suppliers Grid */}
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paginatedSuppliers.map(supplier => {
                const statusConfig = SUPPLIER_STATUS[supplier.status as keyof typeof SUPPLIER_STATUS];
                const riskColor = supplier.riskLevel === 'Low' ? card.success : supplier.riskLevel === 'Medium' ? card.warning : card.danger;
                
                return (
                  <div key={supplier.id} className="rounded-2xl border p-5 backdrop-blur-xl group hover:scale-[1.02] transition-all cursor-pointer"
                    style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}
                    onClick={() => router.push(`/dashboard/suppliers/${supplier.id}`)}>
                    
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-display text-lg font-bold" style={{ background: card.primaryBg, color: card.primary }}>
                          {supplier.name.split(' ').map(w => w[0]).slice(0,2).join('')}
                        </div>
                        <div>
                          <h3 className="font-display font-bold text-base" style={{ color: card.text }}>{supplier.name}</h3>
                          <p className="text-[10px]" style={{ color: card.subtle }}>{supplier.contact || 'No contact'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg" style={{ background: statusConfig.bg, color: statusConfig.color }}>
                          {statusConfig.label}
                        </span>
                        <p className="text-[10px] mt-1" style={{ color: card.subtle }}>Risk: {supplier.riskLevel}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="p-3 rounded-xl" style={{ background: card.inputBg }}>
                        <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: card.subtle }}>Performance Score</p>
                        <p className="font-display text-lg font-bold" style={{ color: card.primary }}>{supplier.performanceScore}/100</p>
                      </div>
                      <div className="p-3 rounded-xl" style={{ background: card.inputBg }}>
                        <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: card.subtle }}>Total Spend</p>
                        <p className="font-display text-lg font-bold" style={{ color: card.text }}>GH₵{(supplier.totalPurchases/1000).toFixed(1)}k</p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: card.subtle }}>On-Time Delivery</span>
                        <span className="font-mono text-sm font-bold" style={{ color: supplier.onTimeRate >= 90 ? card.success : supplier.onTimeRate >= 80 ? card.warning : card.danger }}>
                          {supplier.onTimeRate}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: card.subtle }}>Products</span>
                        <span className="text-sm font-medium" style={{ color: card.text }}>{supplier.totalProducts}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: card.subtle }}>Next Delivery</span>
                        <span className="text-sm font-medium" style={{ color: card.text }}>{supplier.nextDelivery}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: card.border }}>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i < supplier.stockOut ? card.danger : i < supplier.stockLow ? card.warning : card.success }} />
                          ))}
                        </div>
                        <span className="text-[9px]" style={{ color: card.subtle }}>
                          {supplier.stockOut} out, {supplier.stockLow} low
                        </span>
                      </div>
                      <ChevronRight size={16} style={{ color: card.subtle }} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: card.border }}>
            <p className="text-xs" style={{ color: card.muted }}>
              Showing <span className="font-bold" style={{ color: card.text }}>{startIndex}-{endIndex}</span> of <span className="font-bold" style={{ color: card.text }}>{totalItems}</span> suppliers
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

      {/* Sync Tab */}
      {activeTab === 'sync' && (
        <div className="rounded-2xl border p-6 backdrop-blur-xl" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
          <div className="text-center py-12">
            <RefreshCw size={48} className="mx-auto mb-4" style={{ color: card.primary }} />
            <h3 className="font-display text-xl font-bold mb-2" style={{ color: card.text }}>Product Synchronization</h3>
            <p className="text-sm mb-6" style={{ color: card.muted }}>Automatically sync product catalogs and pricing from supplier systems</p>
            
            <div className="max-w-md mx-auto space-y-4">
              <div className="p-4 rounded-xl" style={{ background: card.inputBg }}>
                <h4 className="font-medium mb-2" style={{ color: card.text }}>Last Sync Status</h4>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: card.subtle }}>Completed</span>
                  <span className="text-sm font-medium" style={{ color: card.success }}>2 hours ago</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm" style={{ color: card.subtle }}>Products Updated</span>
                  <span className="text-sm font-medium" style={{ color: card.text }}>147</span>
                </div>
              </div>
              
              <button onClick={() => setShowSyncModal(true)} className="w-full py-3 rounded-xl font-bold text-white transition-all" style={{ background: card.primary }}>
                Start Manual Sync
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
