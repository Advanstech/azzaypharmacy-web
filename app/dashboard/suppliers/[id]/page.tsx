'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  ArrowLeft, Search, Filter, MoreHorizontal, Edit2, Trash2, 
  ChevronRight, Save, X, Move, Plus, TrendingUp, Package, 
  AlertCircle, DollarSign, Check, ChevronDown, LayoutGrid, List,
  Loader2, RefreshCw
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { usePagination } from '@/hooks/use-pagination';

// Fallback suppliers if store is empty
const FALLBACK_SUPPLIERS = [
  {"id": "1", "name": "Bedither Pharmaceuticals", "aiScore": 92},
  {"id": "2", "name": "ADD Pharma Limited", "aiScore": 88},
  {"id": "3", "name": "Danny Pharma", "aiScore": 79},
  {"id": "4", "name": "Danadams Pharmaceuticals", "aiScore": 95},
  {"id": "5", "name": "Jojo Pharmacy", "aiScore": 74},
  {"id": "6", "name": "Sixx Star Pharmacy", "aiScore": 81},
  {"id": "7", "name": "Ernest Chemists Ltd", "aiScore": 86},
  {"id": "8", "name": "Greenlight Pharmacy", "aiScore": 83},
  {"id": "9", "name": "OA&J Pharmaceuticals", "aiScore": 77},
  {"id": "10", "name": "MedSupply Ghana Ltd", "aiScore": 94},
];

export default function SupplierProductsPage() {
  const params = useParams();
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { products: allProducts, suppliers: storeSuppliers, getProductsBySupplier, updateProductPrices, updateProductSupplier, updateProductFull, adjustProductStock, deleteProduct, refetchProducts, loadingProducts, createProduct, updateSupplier, deleteSupplier, me } = useStore();
  const isManager = ['SE_ADMIN', 'ROOT', 'OWNER', 'MANAGER', 'HEAD_PHARMACIST', 'DEVELOPER'].includes(me?.role || '');
  
  const supplierId = params.id as string;
  const supplier = storeSuppliers.find(s => s.id === supplierId) || FALLBACK_SUPPLIERS.find(s => s.id === supplierId) || FALLBACK_SUPPLIERS[0];

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({
    name: '', genericName: '', brand: '', category: '', cost: 0, sell: 0, qty: 0, supplierId: '', requiresRx: false
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<any>({
    name: '', genericName: '', brand: '', category: 'ANTIBIOTICS', cost: 0, sell: 0, qty: 0, supplierId: supplierId, requiresRx: false, expiryDate: ''
  });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [moveProduct, setMoveProduct] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Supplier edit & delete state
  const [showSupplierEditModal, setShowSupplierEditModal] = useState(false);
  const [supplierEditForm, setSupplierEditForm] = useState({
    name: '', contact: '', phone: '', email: '', address: '', tin: '', categories: [] as string[]
  });
  const [showDeleteSupplierModal, setShowDeleteSupplierModal] = useState(false);
  const [isDeletingSupplier, setIsDeletingSupplier] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadProducts();
  }, [supplierId]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await getProductsBySupplier(supplierId);
      if (data && data.length > 0) {
        setProducts(data.map(p => ({
          id: p.id,
          name: p.name,
          genericName: p.genericName || '',
          brand: p.brand || '',
          category: p.category,
          requiresRx: p.requiresRx || false,
          supplierId: p.supplierId || supplierId,
          sell: p.sellingPrice,
          cost: p.costPrice,
          qty: p.stockQuantity,
          unit: 'units'
        })));
      } else {
        // Filter from local products if API returns empty but we have products in store
        const local = allProducts.filter(p => p.supplierId === supplierId);
        setProducts(local.map(p => ({
          id: p.id,
          name: p.name,
          genericName: p.genericName || '',
          brand: p.brand || '',
          category: p.category,
          requiresRx: p.requiresRx || false,
          supplierId: p.supplierId || supplierId,
          sell: p.sellingPrice,
          cost: p.costPrice,
          qty: p.stockQuantity,
          unit: 'units'
        })));
      }
    } catch (err) {
      console.error('Failed to load supplier products:', err);
    } finally {
      setLoading(false);
    }
  };

  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
  const c = {
    bg: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.95)',
    border: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.6)',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    primary: isDark ? '#00D9FF' : '#0EA5E9',
    pBg: isDark ? 'rgba(0,217,255,0.1)' : 'rgba(14,165,233,0.1)',
    cardBg: isDark ? 'rgba(15,23,42,0.5)' : 'rgba(248,250,252,0.8)',
    inputBg: isDark ? 'rgba(15,23,42,0.6)' : '#fff',
    danger: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
  };

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ['All', ...Array.from(cats)];
  }, [products]);

  const categoryOptions = useMemo(() => {
    const list = new Set([
      'ANTIBIOTICS',
      'ANALGESICS_NSAIDS',
      'CARDIOVASCULAR',
      'VITAMINS_SUPPLEMENTS',
      'ANTIMALARIALS',
      'MISCELLANEOUS',
      ...products.map(p => p.category)
    ]);
    return Array.from(list).filter(Boolean);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  const {
    paginatedData: paginatedProducts,
    currentPage, totalPages, nextPage, prevPage, startIndex, endIndex, totalItems
  } = usePagination({ data: filteredProducts, itemsPerPage: 5 });

  const stats = useMemo(() => {
    const totalValue = products.reduce((sum, p) => sum + (p.qty * p.cost), 0);
    const lowStock = products.filter(p => p.qty < 10).length;
    return {
      totalProducts: products.length,
      totalValue,
      lowStock
    };
  }, [products]);

  const startEdit = (p: any) => {
    setEditingProduct(p);
    setEditForm({ ...p });
    setShowEditModal(true);
  };

  const saveEdit = async () => {
    setIsUpdating(true);
    try {
      const currentQty = editingProduct?.qty || 0;
      await updateProductFull({
        id: editingProduct.id,
        name: editForm.name,
        genericName: editForm.genericName,
        brand: editForm.brand,
        category: editForm.category,
        costPrice: editForm.cost,
        sellingPrice: editForm.sell,
        supplierId: editForm.supplierId,
        requiresRx: editForm.requiresRx
      });

      if (editForm.qty !== currentQty) {
        const diff = editForm.qty - currentQty;
        await adjustProductStock(editingProduct.id, diff, 'Manual stock adjustment from supplier management');
      }

      setShowEditModal(false);
      setEditingProduct(null);
      refetchProducts();
      loadProducts();
    } catch (err) {
      console.error('Failed to update product:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const openAddModal = () => {
    setAddForm({
      name: '', genericName: '', brand: '', category: 'ANTIBIOTICS', cost: 0, sell: 0, qty: 0, supplierId: supplierId, requiresRx: false, expiryDate: ''
    });
    setShowAddModal(true);
  };

  const saveAdd = async () => {
    setIsUpdating(true);
    try {
      await createProduct({
        name: addForm.name,
        genericName: addForm.genericName || undefined,
        brand: addForm.brand || undefined,
        category: addForm.category,
        costPrice: addForm.cost,
        sellingPrice: addForm.sell,
        stockQuantity: addForm.qty,
        supplierId: addForm.supplierId || undefined,
        requiresRx: addForm.requiresRx,
        dosageForm: 'TABLET',
        expiryDate: addForm.expiryDate || undefined,
      });
      setShowAddModal(false);
      refetchProducts();
      loadProducts();
    } catch (err) {
      console.error('Failed to create product:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProduct(id);
      setConfirmDelete(null);
      refetchProducts();
      loadProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const handleMove = async (targetSupplierId: string) => {
    setIsUpdating(true);
    try {
      await updateProductSupplier(moveProduct.id, targetSupplierId);
      setProducts(products.filter(p => p.id !== moveProduct.id));
      setMoveProduct(null);
    } catch (err) {
      console.error('Failed to move product:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Supplier Edit & Delete Handlers
  const openSupplierEdit = () => {
    setSupplierEditForm({
      name: supplier.name || '',
      contact: (supplier as any).contact || '',
      phone: (supplier as any).phone || '',
      email: (supplier as any).email || '',
      address: (supplier as any).address || '',
      tin: (supplier as any).tin || '',
      categories: (supplier as any).categories || []
    });
    setShowSupplierEditModal(true);
  };

  const saveSupplierEdit = async () => {
    if (!supplierEditForm.name.trim()) return;
    setIsUpdating(true);
    try {
      await updateSupplier({
        id: supplierId,
        name: supplierEditForm.name.trim(),
        contact: supplierEditForm.contact.trim() || undefined,
        phone: supplierEditForm.phone.trim() || undefined,
        email: supplierEditForm.email.trim() || undefined,
        address: supplierEditForm.address.trim() || undefined,
        tin: supplierEditForm.tin.trim() || undefined,
        categories: supplierEditForm.categories.length > 0 ? supplierEditForm.categories : undefined
      });
      setShowSupplierEditModal(false);
    } catch (err) {
      console.error('Failed to update supplier:', err);
      alert('Failed to update supplier. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteSupplier = async () => {
    setIsDeletingSupplier(true);
    try {
      await deleteSupplier(supplierId);
      setShowDeleteSupplierModal(false);
      router.push('/dashboard/suppliers');
    } catch (err) {
      console.error('Failed to delete supplier:', err);
      alert('Failed to delete supplier. Make sure there are no active invoices or purchases linked to this supplier.');
    } finally {
      setIsDeletingSupplier(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <button 
          onClick={() => router.push('/dashboard/suppliers')}
          className="flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-70"
          style={{ color: c.muted }}
        >
          <ArrowLeft size={16} /> Back to Suppliers
        </button>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-display text-xl font-bold"
              style={{ background: c.pBg, color: c.primary, border: `1px solid ${isDark ? 'rgba(0,217,255,0.2)' : 'rgba(14,165,233,0.2)'}` }}>
              {supplier.name[0]}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-display text-3xl font-bold" style={{ color: c.text }}>{supplier.name}</h1>
                <button onClick={loadProducts} className={`p-1.5 rounded-lg transition-all ${loading ? 'animate-spin' : ''}`} style={{ color: c.muted }}>
                  <RefreshCw size={16} />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(16,185,129,0.1)', color: c.success }}>
                  AI Score: {supplier.aiScore || 85}/100
                </span>
                <span className="text-xs" style={{ color: c.muted }}>Supplier Inventory Management</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isManager && (
              <>
                <button 
                  onClick={openSupplierEdit}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] border"
                  style={{
                    background: isDark ? 'rgba(15,23,42,0.6)' : '#fff',
                    borderColor: c.border,
                    color: c.text
                  }}
                >
                  <Edit2 size={16} /> Edit Supplier
                </button>
                <button 
                  onClick={() => setShowDeleteSupplierModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: c.danger + '10',
                    border: `1px solid ${c.danger}30`,
                    color: c.danger
                  }}
                >
                  <Trash2 size={16} /> Delete
                </button>
              </>
            )}
            {isManager && (
              <button 
                onClick={openAddModal}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
                style={{
                  background: isDark ? 'linear-gradient(135deg,#00D9FF,#00A3CC)' : 'linear-gradient(135deg,#0EA5E9,#0284C7)',
                  color: isDark ? '#0A0E1A' : '#fff'
                }}
              >
                <Plus size={18} /> Add Product
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3" style={{ color: c.muted }}>
          <Loader2 className="animate-spin" size={32} />
          <p className="text-sm font-medium">Fetching supplier data...</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Total Products', value: stats.totalProducts, icon: Package, color: c.primary },
              { label: 'Total Stock Value', value: `GH₵ ${stats.totalValue.toLocaleString()}`, icon: DollarSign, color: c.success },
              { label: 'Low Stock Items', value: stats.lowStock, icon: AlertCircle, color: c.warning },
            ].map(s => (
              <div key={s.label} className="rounded-2xl border p-5 backdrop-blur-xl"
                style={{ background: c.bg, borderColor: c.border }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg" style={{ background: `${s.color}20`, color: s.color }}>
                    <s.icon size={18} />
                  </div>
                  <p className="text-xs" style={{ color: c.muted }}>{s.label}</p>
                </div>
                <p className="font-display text-2xl font-bold" style={{ color: c.text }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-between p-4 rounded-2xl border"
            style={{ background: c.bg, borderColor: c.border }}>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: c.muted }} />
              <input 
                type="text" 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                placeholder="Search product inventory..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all"
                  style={{
                    background: selectedCategory === cat ? c.pBg : 'transparent',
                    color: selectedCategory === cat ? c.primary : c.muted,
                    border: `1px solid ${selectedCategory === cat ? c.primary + '40' : 'transparent'}`
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border backdrop-blur-xl overflow-hidden"
            style={{ background: c.bg, borderColor: c.border }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr style={{ background: isDark ? 'rgba(15,23,42,0.3)' : 'rgba(248,250,252,0.7)', borderBottom: `1px solid ${c.border}` }}>
                    {['Product Name', 'Quantity', 'Cost Price', 'Sell Price', 'Stock Value', 'Status', ...(isManager ? ['Actions'] : [])].map(h => (
                      <th key={h} className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider" style={{ color: c.muted }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.map((p, i) => {
                    const stockValue = p.qty * p.cost;
                    const status = p.qty < 10 ? 'Low Stock' : p.qty === 0 ? 'Out of Stock' : 'In Stock';
                    const statusColor = status === 'Low Stock' ? c.warning : status === 'Out of Stock' ? c.danger : c.success;

                    return (
                      <tr key={p.id} 
                        onClick={() => router.push(`/dashboard/inventory/${p.id}`)}
                        style={{ borderBottom: i < paginatedProducts.length - 1 ? `1px solid ${c.border}` : 'none' }}
                        className="group cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-bold" style={{ color: c.text }}>{p.name}</p>
                            <p className="text-[10px]" style={{ color: c.muted }}>{p.category}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm" style={{ color: c.text }}>{p.qty}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm" style={{ color: c.muted }}>GH₵ {p.cost.toFixed(2)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm font-bold" style={{ color: c.primary }}>GH₵ {p.sell.toFixed(2)}</span>
                        </td>
                        <td className="px-6 py-4 font-mono text-sm" style={{ color: c.text }}>
                          GH₵ {stockValue.toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                            style={{ background: `${statusColor}15`, color: statusColor }}>
                            {status}
                          </span>
                        </td>
                        {isManager && (
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); startEdit(p); }} className="p-2 rounded-lg" style={{ background: c.pBg, color: c.primary }}><Edit2 size={14} /></button>
                              <button onClick={(e) => { e.stopPropagation(); setMoveProduct(p); }} className="p-2 rounded-lg" style={{ background: c.pBg, color: '#8B5CF6' }}><Move size={14} /></button>
                              <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(p.id); }} className="p-2 rounded-lg" style={{ background: c.danger + '10', color: c.danger }}><Trash2 size={14} /></button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: c.border }}>
                <p className="text-sm" style={{ color: c.muted }}>
                  Showing <span className="font-bold" style={{ color: c.text }}>{startIndex}</span> to <span className="font-bold" style={{ color: c.text }}>{endIndex}</span> of <span className="font-bold" style={{ color: c.text }}>{totalItems}</span> products
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={prevPage} disabled={currentPage === 1} className="p-2 rounded-lg disabled:opacity-50 transition-colors" style={{ background: c.cardBg, color: c.text, border: `1px solid ${c.border}` }}>
                    <ChevronDown size={16} className="rotate-90" />
                  </button>
                  <button onClick={nextPage} disabled={currentPage === totalPages} className="p-2 rounded-lg disabled:opacity-50 transition-colors" style={{ background: c.cardBg, color: c.text, border: `1px solid ${c.border}` }}>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Move Product Modal */}
      {moveProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-sm rounded-2xl border p-6" style={{ background: isDark ? '#0F172A' : '#fff', borderColor: c.border }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: c.text }}>Move Product</h3>
            <p className="text-sm mb-4" style={{ color: c.muted }}>Select target supplier for <b>{moveProduct.name}</b></p>
            <div className="space-y-2 max-h-60 overflow-y-auto mb-6 pr-2">
              {(storeSuppliers.length > 0 ? storeSuppliers : FALLBACK_SUPPLIERS).filter(s => s.id !== supplierId).map(s => (
                <button
                  key={s.id}
                  onClick={() => handleMove(s.id)}
                  disabled={isUpdating}
                  className="w-full flex items-center justify-between p-3 rounded-xl border text-left transition-colors hover:border-primary/40 group"
                  style={{ background: c.cardBg, borderColor: c.border, color: c.text }}
                >
                  <span className="text-sm font-medium">{s.name}</span>
                  {isUpdating ? <Loader2 className="animate-spin" size={14} /> : <ChevronRight size={14} style={{ color: c.muted }} />}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setMoveProduct(null)}
              className="w-full py-2.5 rounded-xl font-bold text-sm"
              style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', color: c.text }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-sm rounded-2xl border p-6 text-center" style={{ background: isDark ? '#0F172A' : '#fff', borderColor: c.border }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: c.danger + '20', color: c.danger }}>
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: c.text }}>Delete Product?</h3>
            <p className="text-sm mb-6" style={{ color: c.muted }}>This action cannot be undone. This product will be removed from inventory.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm"
                style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', color: c.text }}
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white"
                style={{ background: c.danger }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}>
          <div className="w-full max-w-lg rounded-2xl border" style={{ background: isDark ? '#0F172A' : '#fff', borderColor: c.border }}>
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: c.border }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-500"><Edit2 size={20} /></div>
                <div>
                  <h2 className="font-display text-lg font-bold" style={{ color: c.text }}>Edit Product</h2>
                  <p className="text-xs" style={{ color: c.muted }}>Updating {editingProduct.name}</p>
                </div>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Product Name</label>
                  <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Generic Name</label>
                  <input type="text" value={editForm.genericName} onChange={e => setEditForm({...editForm, genericName: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Brand / Manufacturer</label>
                  <input type="text" value={editForm.brand} onChange={e => setEditForm({...editForm, brand: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category</label>
                  <select value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }}>
                    {categoryOptions.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Supplier</label>
                  <select value={editForm.supplierId} onChange={e => setEditForm({...editForm, supplierId: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }}>
                    <option value="">Direct / Unknown</option>
                    {storeSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cost Price (GH₵)</label>
                  <input type="number" value={editForm.cost} onChange={e => setEditForm({...editForm, cost: parseFloat(e.target.value)})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selling Price (GH₵)</label>
                  <input type="number" value={editForm.sell} onChange={e => setEditForm({...editForm, sell: parseFloat(e.target.value)})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Stock Quantity</label>
                  <input type="number" min="0" value={editForm.qty || ''} onChange={e => setEditForm({...editForm, qty: parseInt(e.target.value) || 0})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono" style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                </div>
                <div className="col-span-2 pt-2 border-t flex items-center justify-between" style={{ borderColor: c.border }}>
                  <div>
                    <p className="text-sm font-bold" style={{ color: c.text }}>Prescription Required</p>
                    <p className="text-[10px]" style={{ color: c.muted }}>Classifies this drug as POM (Prescription-Only)</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={editForm.requiresRx} onChange={e => setEditForm({...editForm, requiresRx: e.target.checked})} />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" style={{ background: editForm.requiresRx ? c.primary : (isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1') }}></div>
                  </label>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex gap-2" style={{ borderColor: c.border }}>
              <button onClick={() => setShowEditModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-slate-100 dark:hover:bg-slate-800" style={{ color: c.muted }}>Cancel</button>
              <button onClick={saveEdit} disabled={isUpdating} className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2" style={{ background: c.primary, color: '#fff' }}>
                {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}>
          <div className="w-full max-w-lg rounded-2xl border" style={{ background: isDark ? '#0F172A' : '#fff', borderColor: c.border }}>
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: c.border }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500"><Plus size={20} /></div>
                <div>
                  <h2 className="font-display text-lg font-bold" style={{ color: c.text }}>Add New Product</h2>
                  <p className="text-xs" style={{ color: c.muted }}>Create a new product for this supplier</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Product Name</label>
                  <input type="text" value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} placeholder="e.g. Amoxicillin 500mg" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Generic Name</label>
                  <input type="text" value={addForm.genericName} onChange={e => setAddForm({...addForm, genericName: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} placeholder="e.g. Amoxicillin Trihydrate" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Brand / Manufacturer</label>
                  <input type="text" value={addForm.brand} onChange={e => setAddForm({...addForm, brand: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} placeholder="e.g. GSK" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category</label>
                  <select value={addForm.category} onChange={e => setAddForm({...addForm, category: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }}>
                    {categoryOptions.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Supplier</label>
                  <select value={addForm.supplierId} onChange={e => setAddForm({...addForm, supplierId: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }}>
                    <option value="">Direct / Unknown</option>
                    {storeSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cost Price (GH₵)</label>
                  <input type="number" step="0.01" value={addForm.cost || ''} onChange={e => setAddForm({...addForm, cost: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selling Price (GH₵)</label>
                  <input type="number" step="0.01" value={addForm.sell || ''} onChange={e => setAddForm({...addForm, sell: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                </div>
                <div className="col-span-2 border-t pt-5" style={{ borderColor: c.border }}>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">Initial Stock Quantity</label>
                      <input type="number" min="0" value={addForm.qty || ''} onChange={e => setAddForm({...addForm, qty: parseInt(e.target.value) || 0})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">Expiry Date</label>
                      <input type="date" value={addForm.expiryDate} onChange={e => setAddForm({...addForm, expiryDate: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs" style={{ color: c.muted }}>If you leave quantity at 0, you can receive stock later via Purchase Orders.</p>
                    </div>
                  </div>
                </div>
                <div className="col-span-2 pt-2 border-t flex items-center justify-between" style={{ borderColor: c.border }}>
                  <div>
                    <p className="text-sm font-bold" style={{ color: c.text }}>Prescription Required</p>
                    <p className="text-[10px]" style={{ color: c.muted }}>Classifies this drug as POM (Prescription-Only)</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={addForm.requiresRx} onChange={e => setAddForm({...addForm, requiresRx: e.target.checked})} />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" style={{ background: addForm.requiresRx ? c.primary : (isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1') }}></div>
                  </label>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex gap-2" style={{ borderColor: c.border }}>
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-slate-100 dark:hover:bg-slate-800" style={{ color: c.muted }}>Cancel</button>
              <button onClick={saveAdd} disabled={isUpdating || !addForm.name} className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2" style={{ background: c.primary, color: '#fff' }}>
                {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {isUpdating ? 'Creating...' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {showSupplierEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}>
          <div className="w-full max-w-lg rounded-2xl border" style={{ background: isDark ? '#0F172A' : '#fff', borderColor: c.border }}>
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: c.border }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-500"><Edit2 size={20} /></div>
                <div>
                  <h2 className="font-display text-lg font-bold" style={{ color: c.text }}>Edit Supplier</h2>
                  <p className="text-xs" style={{ color: c.muted }}>Update {supplier.name}</p>
                </div>
              </div>
              <button onClick={() => setShowSupplierEditModal(false)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Supplier Name *</label>
                  <input type="text" value={supplierEditForm.name} onChange={e => setSupplierEditForm({...supplierEditForm, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} placeholder="e.g. Akwaba Pharma Distributors" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contact Person</label>
                  <input type="text" value={supplierEditForm.contact} onChange={e => setSupplierEditForm({...supplierEditForm, contact: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} placeholder="e.g. John Doe" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone</label>
                  <input type="text" value={supplierEditForm.phone} onChange={e => setSupplierEditForm({...supplierEditForm, phone: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} placeholder="e.g. +233 24 123 4567" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</label>
                  <input type="email" value={supplierEditForm.email} onChange={e => setSupplierEditForm({...supplierEditForm, email: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} placeholder="e.g. contact@supplier.com" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TIN / Tax ID</label>
                  <input type="text" value={supplierEditForm.tin} onChange={e => setSupplierEditForm({...supplierEditForm, tin: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} placeholder="e.g. C0001234567" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Address</label>
                  <input type="text" value={supplierEditForm.address} onChange={e => setSupplierEditForm({...supplierEditForm, address: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} placeholder="e.g. 123 Pharmacy Street, Accra" />
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex gap-2" style={{ borderColor: c.border }}>
              <button onClick={() => setShowSupplierEditModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-slate-100 dark:hover:bg-slate-800" style={{ color: c.muted }}>Cancel</button>
              <button onClick={saveSupplierEdit} disabled={isUpdating || !supplierEditForm.name.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2" style={{ background: c.primary, color: '#fff' }}>
                {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Supplier Confirmation */}
      {showDeleteSupplierModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-sm rounded-2xl border p-6 text-center" style={{ background: isDark ? '#0F172A' : '#fff', borderColor: c.border }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: c.danger + '20', color: c.danger }}>
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: c.text }}>Delete Supplier?</h3>
            <p className="text-sm mb-2" style={{ color: c.muted }}>You are about to permanently delete <b>{supplier.name}</b>.</p>
            <p className="text-xs mb-6" style={{ color: c.danger }}>All products will be disassociated. Invoices and purchases will remain but unlinked. This cannot be undone.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteSupplierModal(false)}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm"
                style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', color: c.text }}
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteSupplier}
                disabled={isDeletingSupplier}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
                style={{ background: c.danger }}
              >
                {isDeletingSupplier ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {isDeletingSupplier ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
