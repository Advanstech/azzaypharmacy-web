'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { 
  Search, Plus, Package, AlertCircle, TrendingUp, DollarSign, Upload,
  History, Receipt, Truck, X, BarChart3, Sparkles, Phone, Mail, Building,
  Edit2, Trash2, ChevronRight, RefreshCw, Save, Loader2, FileText,
  MoreHorizontal
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { usePagination } from '@/hooks/use-pagination';

const STATUS_CONFIG = {
  OK: { label: 'In Stock', color: '#10B981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)' },
  LOW: { label: 'Low Stock', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
  OUT: { label: 'Out of Stock', color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' },
  EXPIRED: { label: 'Expired', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.25)' },
};

export default function InventoryPage() {
  const { theme } = useTheme();
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
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [activeTab, setActiveTab] = useState<'products' | 'movements' | 'orders' | 'valuation' | 'suppliers'>('products');

  // Add Product Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    genericName: '',
    brand: '',
    category: 'ANTIBIOTICS',
    costPrice: 0,
    sellingPrice: 0,
    stockQuantity: 0,
    supplierId: '',
    imageUrl: ''
  });

  // Edit Product Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    genericName: '',
    brand: '',
    category: '',
    cost: 0,
    sell: 0,
    stock: 0,
    supplierId: '',
    requiresRx: false
  });
  const [isSaving, setIsSaving] = useState(false);

  // Stock Adjustment Modal
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockProduct, setStockProduct] = useState<any>(null);
  const [stockAdjust, setStockAdjust] = useState(0);
  const [stockReason, setStockReason] = useState('');

  // Delete Confirmation
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Upload Invoice Modal
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    rowHover: isDark ? 'rgba(0,217,255,0.03)' : 'rgba(14,165,233,0.03)',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    inputBg: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC',
  };

  const products = storeProducts.map((p: any) => {
    const isPOM = ['ANTIBIOTICS', 'CARDIOVASCULAR', 'ANTIMALARIALS'].includes(p.category);
    return {
      id: p.id,
      name: p.name,
      brand: p.brand || '',
      medClass: isPOM ? 'POM' : 'OTC',
      generic: p.strength || p.dosageForm || '',
      cat: p.category || 'OTC',
      stock: p.stockQuantity,
      price: p.sellingPrice,
      cost: p.costPrice,
      status: p.stockQuantity === 0 ? 'OUT' : p.stockQuantity <= 10 ? 'LOW' : 'OK',
      expiry: 'N/A',
      barcode: 'N/A',
      supplierId: p.supplierId,
    };
  });

  const categories = ['All', ...Array.from(new Set(products.map((p: any) => p.cat)))].sort();
  const filteredProducts = products.filter((p: any) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.generic.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'All' || p.cat === catFilter;
    return matchSearch && matchCat;
  });

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
    itemsPerPage: 5,
  });

  useEffect(() => {
    goToPage(1);
  }, [search, catFilter, goToPage]);

  const totalValue = products.reduce((acc: number, p: any) => acc + p.stock * p.cost, 0);
  const retailValue = products.reduce((acc: number, p: any) => acc + p.stock * p.price, 0);
  const lowCount = products.filter((p: any) => p.status === 'LOW').length;
  const outCount = products.filter((p: any) => p.status === 'OUT').length;
  const potentialProfit = retailValue - totalValue;

  const handleGenerateImage = async () => {
    if (!newProduct.name) return;
    setIsGeneratingImage(true);
    try {
      const { gql, M_GENERATE_PRODUCT_IMAGE } = await import('@/lib/gql');
      const data = await gql<{ generateProductImage: string }>(M_GENERATE_PRODUCT_IMAGE, { name: newProduct.name });
      if (data.generateProductImage) {
        setNewProduct((prev: any) => ({ ...prev, imageUrl: data.generateProductImage }));
      }
    } catch (error) {
      console.error('Failed to generate image:', error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleAddProduct = async () => {
    try {
      await createProduct({
        name: newProduct.name,
        genericName: newProduct.genericName,
        brand: newProduct.brand,
        category: newProduct.category,
        costPrice: newProduct.costPrice,
        sellingPrice: newProduct.sellingPrice,
        stockQuantity: newProduct.stockQuantity,
        supplierId: newProduct.supplierId || undefined,
        imageUrl: newProduct.imageUrl,
      });
      setShowAddModal(false);
      setNewProduct({ name: '', genericName: '', brand: '', category: 'ANTIBIOTICS', costPrice: 0, sellingPrice: 0, stockQuantity: 0, supplierId: '', imageUrl: '' });
    } catch (error) {
      console.error('Failed to create product:', error);
    }
  };

  const handleEditProduct = async () => {
    setIsSaving(true);
    try {
      await updateProductFull({
        id: editingProduct.id,
        name: editForm.name,
        genericName: editForm.genericName,
        brand: editForm.brand,
        category: editForm.category,
        costPrice: editForm.cost,
        sellingPrice: editForm.sell,
        supplierId: editForm.supplierId || undefined,
        requiresRx: editForm.requiresRx
      });
      setShowEditModal(false);
      setEditingProduct(null);
      refetchProducts();
    } catch (error) {
      console.error('Failed to update product:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (product: any) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name,
      genericName: product.generic || '',
      brand: product.brand,
      category: product.cat,
      cost: product.cost,
      sell: product.price,
      stock: product.stock,
      supplierId: product.supplierId || '',
      requiresRx: product.medClass === 'POM'
    });
    setShowEditModal(true);
  };

  const handleDeleteProduct = async () => {
    if (!confirmDelete) return;
    try {
      await deleteProduct(confirmDelete);
      setConfirmDelete(null);
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const handleStockAdjust = async () => {
    if (!stockProduct || stockAdjust === 0) return;
    try {
      await adjustProductStock(stockProduct.id, stockAdjust, stockReason || 'Manual adjustment');
      setShowStockModal(false);
      setStockProduct(null);
      setStockAdjust(0);
      setStockReason('');
    } catch (error) {
      console.error('Failed to adjust stock:', error);
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1" style={{ color: card.text }}>Inventory & Stock Management</h1>
          <p className="text-sm" style={{ color: card.muted }}>Real-time tracking, purchase orders, and financial valuation</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
            <Upload size={16} />
            Upload Invoice
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
            style={{ background: isDark ? 'linear-gradient(135deg,#00D9FF,#00A3CC)' : 'linear-gradient(135deg,#0EA5E9,#0284C7)', color: isDark ? '#060B14' : '#fff', boxShadow: isDark ? '0 8px 25px rgba(0,217,255,0.3)' : '0 8px 25px rgba(14,165,233,0.3)' }}>
            <Plus size={18} />
            Add Product
          </button>
        </div>
      </div>

      {storeError && (
        <div className="p-4 rounded-xl border flex items-center gap-3 animate-bounce" 
          style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)', color: '#EF4444' }}>
          <AlertCircle size={20} />
          <p className="text-sm font-bold">{storeError}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Products', value: products.length, sub: `${lowCount + outCount} need attention`, icon: Package, color: '#0EA5E9' },
          { label: 'Stock Value (Cost)', value: `GH₵ ${(totalValue/1000).toFixed(1)}k`, sub: 'Inventory investment', icon: DollarSign, color: '#10B981' },
          { label: 'Retail Value', value: `GH₵ ${(retailValue/1000).toFixed(1)}k`, sub: `Profit: GH₵ ${(potentialProfit/1000).toFixed(1)}k`, icon: TrendingUp, color: '#8B5CF6' },
          { label: 'Pending Orders', value: (purchases || []).filter(o => o.status !== 'received').length, sub: 'Awaiting delivery', icon: Truck, color: '#F59E0B' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl border p-4 backdrop-blur-xl" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ background: `${s.color}18`, color: s.color }}><Icon size={18} /></div>
                <div>
                  <p className="text-xs" style={{ color: card.subtle }}>{s.label}</p>
                  <p className="font-display text-lg font-bold" style={{ color: card.text }}>{s.value}</p>
                  <p className="text-[10px]" style={{ color: card.muted }}>{s.sub}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: isDark ? 'rgba(15,23,42,0.4)' : '#F1F5F9' }}>
        {[
          { id: 'products', label: 'Products', icon: Package, count: products.length },
          { id: 'suppliers', label: 'Supplier Directory', icon: Truck, count: suppliers.length },
          { id: 'movements', label: 'Stock Movements', icon: History, count: (stockMovements || []).length },
          { id: 'orders', label: 'Purchase Orders', icon: Receipt, count: (purchases || []).length },
          { id: 'valuation', label: 'Financial Valuation', icon: BarChart3 },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all"
            style={{ background: activeTab === tab.id ? (isDark ? 'rgba(0,217,255,0.1)' : '#fff') : 'transparent', color: activeTab === tab.id ? card.primary : card.muted }}>
            <tab.icon size={16} />
            {tab.label}
            {tab.count !== undefined && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: activeTab === tab.id ? card.primary : 'rgba(148,163,184,0.2)', color: activeTab === tab.id ? (isDark ? '#060B14' : '#fff') : card.muted }}>{tab.count}</span>}
          </button>
        ))}
      </div>

      {activeTab === 'products' && (
        <div className="rounded-2xl border backdrop-blur-xl overflow-hidden" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
          <div className="p-4 border-b flex flex-col md:flex-row gap-3 items-start md:items-center justify-between" style={{ borderColor: card.border, background: isDark ? 'rgba(15,23,42,0.4)' : 'rgba(248,250,252,0.8)' }}>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={15} style={{ color: card.subtle }} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#fff', border: `1px solid ${card.border}`, color: card.text }} />
            </div>
            <div className="flex-1 flex overflow-hidden">
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
                {categories.map(cat => (
                  <button key={cat} onClick={() => setCatFilter(cat)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border-2 ${
                    catFilter === cat 
                      ? 'shadow-md shadow-primary/20 scale-105' 
                      : 'hover:border-primary/30'
                  }`}
                  style={{ 
                    background: catFilter === cat ? card.primary : (isDark ? 'rgba(255,255,255,0.03)' : '#fff'),
                    borderColor: catFilter === cat ? card.primary : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                    color: catFilter === cat ? '#fff' : card.muted 
                  }}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: `1px solid ${card.border}`, background: isDark ? 'rgba(15,23,42,0.3)' : 'rgba(248,250,252,0.6)' }}>
                  {['Product', 'Class', 'Cat', 'Supplier', 'Stock', 'Price', 'Status', ''].map(h => (
                    <th key={h} className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: card.subtle }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map(p => (
                  <tr key={p.id} 
                    className="transition-colors group cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30" 
                    style={{ borderBottom: `1px solid ${card.border}` }}
                    onClick={() => router.push(`/dashboard/inventory/${p.id}`)}
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold" style={{ color: card.text }}>{p.name}</p>
                      {p.generic && <p className="text-[11px]" style={{ color: card.subtle }}>{p.generic}</p>}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-md" style={{ 
                        background: p.medClass === 'OTC' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', 
                        color: p.medClass === 'OTC' ? '#10B981' : '#F59E0B' 
                      }}>
                        {p.medClass}
                      </span>
                    </td>
                    <td className="px-5 py-4"><span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(0,0,0,0.05)', color: card.muted }}>{p.cat}</span></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Truck size={12} style={{ color: card.subtle }} />
                        <span className="text-[10px] font-medium max-w-[120px] truncate" style={{ color: card.muted }}>
                          {suppliers.find(s => s.id === p.supplierId)?.name || 'Direct / Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-sm font-bold" style={{ color: card.text }}>{p.stock}</td>
                    <td className="px-5 py-4 font-mono text-sm font-bold" style={{ color: card.primary }}>GH₵ {p.price.toFixed(2)}</td>
                    <td className="px-5 py-4">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ background: STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG].bg, color: STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG].color }}>
                        {STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG].label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={(e) => { e.stopPropagation(); openEditModal(p); }} className="p-1.5 rounded-lg hover:bg-blue-500/10 text-blue-500">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(p.id); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: card.border }}>
            <p className="text-xs" style={{ color: card.muted }}>
              Showing <span className="font-bold text-slate-800" style={{ color: card.text }}>{startIndex}-{endIndex}</span> of <span className="font-bold text-slate-800" style={{ color: card.text }}>{totalItems}</span> products
            </p>
            <div className="flex gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={prevPage}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-30"
                style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}
              >
                Previous
              </button>
              <button 
                disabled={currentPage === totalPages}
                onClick={nextPage}
                className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-30"
                style={{ background: card.primary, color: '#fff' }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.length === 0 ? (
            <div className="col-span-full py-12 text-center rounded-2xl border-2 border-dashed" style={{ borderColor: card.border }}>
              <Truck size={48} className="mx-auto mb-4 opacity-20" style={{ color: card.muted }} />
              <p className="text-lg font-bold" style={{ color: card.muted }}>No Suppliers Found</p>
              <p className="text-sm" style={{ color: card.subtle }}>Register your first pharmaceutical supplier</p>
            </div>
          ) : (
            suppliers.map(s => (
              <div key={s.id} className="rounded-2xl border p-5 backdrop-blur-xl group hover:scale-[1.02] transition-all cursor-pointer"
                style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}
                onClick={() => router.push(`/dashboard/suppliers/${s.id}`)}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-display text-lg font-bold" style={{ background: card.primaryBg, color: card.primary }}>
                    {s.name[0]}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg" style={{ background: '#10B98118', color: '#10B981' }}>
                      Active
                    </span>
                    <p className="text-[10px] mt-1" style={{ color: card.subtle }}>Score: {s.aiScore || 0}/100</p>
                  </div>
                </div>
                <h3 className="font-display font-bold text-base mb-1" style={{ color: card.text }}>{s.name}</h3>
                <div className="space-y-2 mt-4 pt-4 border-t" style={{ borderColor: card.border }}>
                  <div className="flex items-center gap-2 text-xs" style={{ color: card.muted }}>
                    <Phone size={12} /> {s.phone || 'No phone'}
                  </div>
                  <div className="flex items-center gap-2 text-xs" style={{ color: card.muted }}>
                    <Mail size={12} /> {s.email || 'No email'}
                  </div>
                  <div className="flex items-center gap-2 text-xs" style={{ color: card.muted }}>
                    <Building size={12} /> {s.address || 'No address'}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-[10px] font-bold" style={{ color: card.primary }}>{products.filter(p => p.supplierId === s.id).length} Products</p>
                  <ChevronRight size={16} style={{ color: card.subtle }} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}>
          <div className="w-full max-w-2xl rounded-2xl border overflow-hidden" style={{ background: isDark ? '#0F172A' : '#fff', borderColor: card.border }}>
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: card.border, background: card.primaryBg }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: card.primary, color: isDark ? '#060B14' : '#fff' }}><Plus size={20} /></div>
                <div>
                  <h2 className="font-display text-lg font-bold" style={{ color: card.text }}>Add New Product</h2>
                  <p className="text-xs" style={{ color: card.muted }}>Register a new pharmaceutical item with AI-native tools</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-red-500"><X size={20} /></button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <input type="text" placeholder="Product Name" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full px-3 py-2 rounded-xl text-sm" style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC', border: `1px solid ${card.border}`, color: card.text }} />
                <input type="text" placeholder="Generic Name" value={newProduct.genericName} onChange={e => setNewProduct({...newProduct, genericName: e.target.value})} className="w-full px-3 py-2 rounded-xl text-sm" style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC', border: `1px solid ${card.border}`, color: card.text }} />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" placeholder="Cost" onChange={e => setNewProduct({...newProduct, costPrice: parseFloat(e.target.value)})} className="px-3 py-2 rounded-xl text-sm" style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC', border: `1px solid ${card.border}`, color: card.text }} />
                  <input type="number" placeholder="Price" onChange={e => setNewProduct({...newProduct, sellingPrice: parseFloat(e.target.value)})} className="px-3 py-2 rounded-xl text-sm" style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC', border: `1px solid ${card.border}`, color: card.text }} />
                </div>
              </div>
              <div className="space-y-4">
                <div className="aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden" style={{ borderColor: card.border }}>
                  {newProduct.imageUrl ? <img src={newProduct.imageUrl} className="w-full h-full object-cover" /> : <Sparkles size={32} style={{ color: card.subtle }} />}
                  {isGeneratingImage && <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-cyan-500 text-[10px] font-bold">GENERATING...</div>}
                </div>
                <button onClick={handleGenerateImage} disabled={!newProduct.name || isGeneratingImage} className="w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2" style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
                  <Sparkles size={14} /> Generate AI Image
                </button>
              </div>
            </div>
            <div className="p-4 border-t flex gap-2">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-2 rounded-xl text-sm" style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC', color: card.text }}>Cancel</button>
              <button onClick={handleAddProduct} className="flex-1 py-2 rounded-xl text-sm font-bold" style={{ background: card.primary, color: '#fff' }}>Save Product</button>
            </div>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}>
          <div className="w-full max-w-lg rounded-2xl border" style={{ background: isDark ? '#0F172A' : '#fff', borderColor: card.border }}>
            <div className="p-6 border-b flex items-center gap-3" style={{ borderColor: card.border }}>
              <Upload size={20} style={{ color: card.primary }} />
              <h2 className="font-display text-lg font-bold" style={{ color: card.text }}>Upload Invoice</h2>
            </div>
            <div className="p-6 space-y-4">
              <select className="w-full px-3 py-2 rounded-xl text-sm" style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC', border: `1px solid ${card.border}`, color: card.text }}>
                <option>Select Purchase Order...</option>
                {(purchases || []).map(o => <option key={o.id}>{o.id}</option>)}
              </select>
              <div className="border-2 border-dashed rounded-xl p-8 text-center" style={{ borderColor: card.border }}>
                <FileText size={32} className="mx-auto mb-2" style={{ color: card.subtle }} />
                <p className="text-sm" style={{ color: card.text }}>Drop invoice here</p>
              </div>
            </div>
            <div className="p-4 border-t flex gap-2">
              <button onClick={() => setShowUploadModal(false)} className="flex-1 py-2 rounded-xl text-sm">Cancel</button>
              <button onClick={() => setShowUploadModal(false)} className="flex-1 py-2 rounded-xl text-sm font-bold" style={{ background: card.primary, color: '#fff' }}>Upload</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}>
          <div className="w-full max-w-lg rounded-2xl border" style={{ background: isDark ? '#0F172A' : '#fff', borderColor: card.border }}>
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: card.border }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-500"><Edit2 size={20} /></div>
                <div>
                  <h2 className="font-display text-lg font-bold" style={{ color: card.text }}>Edit Product</h2>
                  <p className="text-xs" style={{ color: card.muted }}>Updating {editingProduct.name}</p>
                </div>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Product Name</label>
                  <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Generic Name</label>
                  <input type="text" value={editForm.genericName} onChange={e => setEditForm({...editForm, genericName: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Brand / Manufacturer</label>
                  <input type="text" value={editForm.brand} onChange={e => setEditForm({...editForm, brand: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category</label>
                  <select value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}>
                    {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Supplier</label>
                  <select value={editForm.supplierId} onChange={e => setEditForm({...editForm, supplierId: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}>
                    <option value="">Direct / Unknown</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cost Price (GH₵)</label>
                  <input type="number" value={editForm.cost} onChange={e => setEditForm({...editForm, cost: parseFloat(e.target.value)})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selling Price (GH₵)</label>
                  <input type="number" value={editForm.sell} onChange={e => setEditForm({...editForm, sell: parseFloat(e.target.value)})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                </div>
                <div className="col-span-2 pt-2 border-t flex items-center justify-between" style={{ borderColor: card.border }}>
                  <div>
                    <p className="text-sm font-bold" style={{ color: card.text }}>Prescription Required</p>
                    <p className="text-[10px]" style={{ color: card.muted }}>Classifies this drug as POM (Prescription-Only)</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={editForm.requiresRx} onChange={e => setEditForm({...editForm, requiresRx: e.target.checked})} />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" style={{ background: editForm.requiresRx ? card.primary : (isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1') }}></div>
                  </label>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex gap-2">
              <button onClick={() => setShowEditModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-slate-100" style={{ color: card.muted }}>Cancel</button>
              <button onClick={handleEditProduct} disabled={isSaving} className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2" style={{ background: card.primary, color: '#fff' }}>
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}>
          <div className="w-full max-w-sm rounded-2xl border p-6 text-center" style={{ background: isDark ? '#0F172A' : '#fff', borderColor: card.border }}>
            <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="font-display text-xl font-bold mb-2" style={{ color: card.text }}>Delete Product?</h3>
            <p className="text-sm mb-6" style={{ color: card.muted }}>This action is permanent and will remove this product from all inventory records.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-3 rounded-xl text-sm font-bold" style={{ background: card.inputBg, color: card.text }}>Cancel</button>
              <button onClick={handleDeleteProduct} className="flex-1 py-3 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
