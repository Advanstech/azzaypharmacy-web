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
import { supabase } from '@/lib/supabase';
import { AZZAY_PRODUCTS_RAW, getDistributedProducts } from '@/data/products';

// Mock suppliers list for UI - in real app, fetch from API
const SUPPLIERS = [
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function fetchGraphQL(query: string, variables: any = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${API_URL}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

export default function SupplierProductsPage() {
  const params = useParams();
  const router = useRouter();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  const supplierId = params.id as string;
  const supplier = SUPPLIERS.find(s => s.id === supplierId) || SUPPLIERS[0];

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [moveProduct, setMoveProduct] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadProducts();
  }, [supplierId]);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = `
        query GetProductsBySupplier($supplierId: String!) {
          productsBySupplier(supplierId: $supplierId) {
            id
            name
            category
            sellingPrice
            costPrice
            stockQuantity
            supplierId
          }
        }
      `;
      const result = await fetchGraphQL(query, { supplierId });
      
      if (result.data?.productsBySupplier) {
        setProducts(result.data.productsBySupplier.map((p: any) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          sell: p.sellingPrice,
          cost: p.costPrice,
          qty: p.stockQuantity,
          supplierId: p.supplierId
        })));
      } else {
        // Fallback to local data if API fails or returns empty
        console.warn('API returned no data, using fallback products');
        const fallback = getDistributedProducts(SUPPLIERS).filter(p => p.supplierId === supplierId);
        setProducts(fallback);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
      // Fallback
      const fallback = getDistributedProducts(SUPPLIERS).filter(p => p.supplierId === supplierId);
      setProducts(fallback);
      setError('Database connection unavailable. Using offline data.');
    } finally {
      setLoading(false);
    }
  };

  const isDark = mounted && theme === 'dark';
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
    const cats = new Set(products.map(p => p.cat || p.category));
    return ['All', ...Array.from(cats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const name = p.name || '';
      const cat = p.cat || p.category || '';
      const matchesSearch = name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || cat === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

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
    setEditingId(p.id);
    setEditForm({ ...p });
  };

  const saveEdit = async () => {
    setIsUpdating(true);
    try {
      const mutation = `
        mutation UpdatePrices($productId: ID!, $costPrice: Float!, $sellingPrice: Float!) {
          updateProductPrices(productId: $productId, costPrice: $costPrice, sellingPrice: $sellingPrice) {
            id
            costPrice
            sellingPrice
          }
        }
      `;
      const result = await fetchGraphQL(mutation, {
        productId: editingId,
        costPrice: editForm.cost,
        sellingPrice: editForm.sell
      });

      if (result.data?.updateProductPrices) {
        setProducts(products.map(p => p.id === editingId ? { 
          ...p, 
          cost: result.data.updateProductPrices.costPrice,
          sell: result.data.updateProductPrices.sellingPrice,
          name: editForm.name,
          qty: editForm.qty
        } : p));
      } else {
        // Local only update if API fails
        setProducts(products.map(p => p.id === editingId ? editForm : p));
      }
    } catch (err) {
      console.error('Failed to save changes:', err);
      setProducts(products.map(p => p.id === editingId ? editForm : p));
    } finally {
      setIsUpdating(false);
      setEditingId(null);
    }
  };

  const handleDelete = (id: string) => {
    // In real app, call a delete mutation
    setProducts(products.filter(p => p.id !== id));
    setConfirmDelete(null);
  };

  const handleMove = async (targetSupplierId: string) => {
    setIsUpdating(true);
    try {
      const mutation = `
        mutation Reassign($productId: ID!, $supplierId: ID!) {
          updateProductSupplier(productId: $productId, supplierId: $supplierId) {
            id
            supplierId
          }
        }
      `;
      const result = await fetchGraphQL(mutation, {
        productId: moveProduct.id,
        supplierId: targetSupplierId
      });

      if (result.data?.updateProductSupplier) {
        setProducts(products.filter(p => p.id !== moveProduct.id));
      } else {
        // Local only
        setProducts(products.filter(p => p.id !== moveProduct.id));
      }
    } catch (err) {
      console.error('Failed to move product:', err);
      setProducts(products.filter(p => p.id !== moveProduct.id));
    } finally {
      setIsUpdating(false);
      setMoveProduct(null);
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
                  AI Score: {supplier.aiScore}/100
                </span>
                {error && <span className="text-xs flex items-center gap-1" style={{ color: c.warning }}><AlertCircle size={10} /> {error}</span>}
              </div>
            </div>
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm"
            style={{ 
              background: isDark ? 'linear-gradient(135deg,#00D9FF,#00A3CC)' : 'linear-gradient(135deg,#0EA5E9,#0284C7)',
              color: isDark ? '#0A0E1A' : '#fff'
            }}>
            <Plus size={18} /> Add Product
          </button>
        </div>
      </div>

      {loading && products.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3" style={{ color: c.muted }}>
          <Loader2 className="animate-spin" size={32} />
          <p className="text-sm font-medium">Connecting to Azzay Inventory...</p>
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
                    {['Product Name', 'Quantity', 'Cost Price', 'Sell Price', 'Stock Value', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider" style={{ color: c.muted }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p, i) => {
                    const isEditing = editingId === p.id;
                    const stockValue = p.qty * p.cost;
                    const status = p.qty < 10 ? 'Low Stock' : p.qty === 0 ? 'Out of Stock' : 'In Stock';
                    const statusColor = status === 'Low Stock' ? c.warning : status === 'Out of Stock' ? c.danger : c.success;

                    return (
                      <tr key={p.id} 
                        style={{ borderBottom: i < filteredProducts.length - 1 ? `1px solid ${c.border}` : 'none' }}
                        className="group"
                      >
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <input 
                              value={editForm.name} 
                              onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                              className="w-full px-3 py-1.5 rounded-lg text-sm"
                              style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }}
                            />
                          ) : (
                            <div>
                              <p className="text-sm font-bold" style={{ color: c.text }}>{p.name}</p>
                              <p className="text-[10px]" style={{ color: c.muted }}>{p.cat || p.category}</p>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <input 
                              type="number"
                              value={editForm.qty} 
                              onChange={e => setEditForm({ ...editForm, qty: parseInt(e.target.value) || 0 })}
                              className="w-20 px-3 py-1.5 rounded-lg text-sm"
                              style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }}
                            />
                          ) : (
                            <span className="font-mono text-sm" style={{ color: c.text }}>{p.qty} {p.unit}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <input 
                              type="number"
                              value={editForm.cost} 
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 0;
                                setEditForm({ ...editForm, cost: val, sell: val * 1.5 });
                              }}
                              className="w-24 px-3 py-1.5 rounded-lg text-sm"
                              style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }}
                            />
                          ) : (
                            <span className="font-mono text-sm" style={{ color: c.muted }}>GH₵ {p.cost.toFixed(2)}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <input 
                              type="number"
                              value={editForm.sell} 
                              onChange={e => setEditForm({ ...editForm, sell: parseFloat(e.target.value) || 0 })}
                              className="w-24 px-3 py-1.5 rounded-lg text-sm"
                              style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }}
                            />
                          ) : (
                            <span className="font-mono text-sm font-bold" style={{ color: c.primary }}>GH₵ {p.sell.toFixed(2)}</span>
                          )}
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
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <button onClick={saveEdit} disabled={isUpdating} className="p-2 rounded-lg" style={{ background: c.success + '20', color: c.success }}>
                                {isUpdating ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                              </button>
                              <button onClick={() => setEditingId(null)} className="p-2 rounded-lg" style={{ background: c.danger + '20', color: c.danger }}><X size={14} /></button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button onClick={() => startEdit(p)} className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: c.pBg, color: c.primary }}><Edit2 size={14} /></button>
                              <button onClick={() => setMoveProduct(p)} className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: c.pBg, color: '#8B5CF6' }}><Move size={14} /></button>
                              <button onClick={() => setConfirmDelete(p.id)} className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: c.danger + '10', color: c.danger }}><Trash2 size={14} /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
              {SUPPLIERS.filter(s => s.id !== supplierId).map(s => (
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.6)' }}>
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
    </div>
  );
}
