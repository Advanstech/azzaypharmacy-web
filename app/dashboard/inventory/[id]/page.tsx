'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Package, DollarSign, TrendingUp, History,
  Truck, AlertCircle, CheckCircle, Clock, Calendar,
  Upload, Edit2, ChevronDown, ChevronUp, Image as ImageIcon, X, Save,
  Sparkles, Wand2, Camera, RefreshCw, FileText, Move, Loader2
} from 'lucide-react';
import { usePagination } from '@/hooks/use-pagination';

export default function ProductDetailedPaper() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  const productId = params?.id as string;
  const { products, suppliers, stockMovements, updateProductFull, updateProductSupplier, adjustProductStock, refetchProducts, loadingProducts, me } = useStore();
  
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [targetSupplierId, setTargetSupplierId] = useState('');
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generatingAIImage, setGeneratingAIImage] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [aiImageOptions, setAiImageOptions] = useState<string[]>([]);
  const [selectedAiImage, setSelectedAiImage] = useState<string | null>(null);
  const [editModalTab, setEditModalTab] = useState<'basic' | 'pricing' | 'supplier'>('basic');
  const [editForm, setEditForm] = useState({
    name: '',
    genericName: '',
    brand: '',
    category: '',
    costPrice: 0,
    sellingPrice: 0,
    stockQuantity: 0,
    supplierId: '',
    strength: '',
    dosageForm: 'TABLET',
    barcode: '',
    nafdacNo: '',
    classification: 'OTC', // 'OTC', 'POM', 'CONTROLLED'
    imageUrl: ''
  });

  const isDark = mounted && theme === 'dark';
  const isAdmin = ['SE_ADMIN', 'OWNER', 'MANAGER', 'HEAD_PHARMACIST'].includes(me?.role || '');
  const canEdit = isAdmin;

  // Ensure products are loaded
  useEffect(() => {
    setMounted(true);
    if (searchParams?.get('edit') === 'true') {
      setShowEditModal(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!products.length && !loadingProducts) {
      refetchProducts();
    }
  }, [products.length, loadingProducts, refetchProducts]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;
        setEditForm({ ...editForm, imageUrl });
        setAiImageOptions([]);
        setSelectedAiImage(null);
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Image upload error:', error);
      setUploadingImage(false);
    }
  };

  // AI Image Generation using product name
  const generateAIImages = async () => {
    if (!editForm.name) {
      alert('Please enter a product name first');
      return;
    }

    setGeneratingAIImage(true);
    try {
      // Using Pollinations AI image generation API (free, no API key needed)
      const prompt = `Professional pharmaceutical product photo of ${editForm.name}, ${editForm.genericName || 'medication'}, white background, studio lighting, high quality medical product photography, clean composition`;
      
      // Generate 3 different variations
      const seeds = [1234, 5678, 9012];
      const imageUrls = seeds.map(seed => 
        `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?seed=${seed}&width=512&height=512&nologo=true`
      );
      
      setAiImageOptions(imageUrls);
      setSelectedAiImage(null);
    } catch (error) {
      console.error('AI generation error:', error);
    } finally {
      setGeneratingAIImage(false);
    }
  };

  const selectAiImage = (url: string) => {
    setSelectedAiImage(url);
    setEditForm({ ...editForm, imageUrl: url });
  };

  const handleSave = async () => {
    try {
      const currentStock = product?.stockQuantity || 0;
      await updateProductFull({
        id: productId,
        name: editForm.name,
        genericName: editForm.genericName || undefined,
        brand: editForm.brand || undefined,
        category: editForm.category,
        costPrice: editForm.costPrice,
        sellingPrice: editForm.sellingPrice,
        supplierId: editForm.supplierId || undefined,
        strength: editForm.strength || undefined,
        dosageForm: editForm.dosageForm || undefined,
        barcode: editForm.barcode || undefined,
        nafdacNo: editForm.nafdacNo || undefined,
        requiresRx: editForm.classification === 'POM' || editForm.classification === 'CONTROLLED',
        isControlled: editForm.classification === 'CONTROLLED',
        imageUrl: editForm.imageUrl || undefined,
      });

      if (editForm.stockQuantity !== currentStock) {
        const diff = editForm.stockQuantity - currentStock;
        await adjustProductStock(productId, diff, 'Manual stock adjustment during product edit');
      }

      setShowEditModal(false);
    } catch (error) {
      console.error('Failed to update product:', error);
    }
  };
  
  const card = {
    bg: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)',
    border: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.5)',
    shadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    subtle: isDark ? '#64748B' : '#94A3B8',
    primary: isDark ? '#00D9FF' : '#0EA5E9',
    primaryBg: isDark ? 'rgba(0,217,255,0.1)' : 'rgba(14,165,233,0.1)',
    inputBg: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC',
  };

  const product = products.find(p => p.id === productId);
  const supplier = product ? suppliers.find(s => s.id === product.supplierId) : null;
  const movements = stockMovements.filter(m => m.productId === productId);

  useEffect(() => {
    if (product) {
      setEditForm({
        name: product.name,
        genericName: product.genericName || '',
        brand: product.brand || '',
        category: product.category || '',
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        stockQuantity: product.stockQuantity,
        supplierId: product.supplierId || '',
        strength: product.strength || '',
        dosageForm: product.dosageForm || 'TABLET',
        barcode: (product as any).barcode || '',
        nafdacNo: (product as any).nafdacNo || '',
        classification: product.isControlled ? 'CONTROLLED' : (product.requiresRx ? 'POM' : 'OTC'),
        imageUrl: product.imageUrl || ''
      });
    }
  }, [product]);

  const {
    paginatedData: paginatedMovements,
    currentPage, totalPages, nextPage, prevPage, startIndex, endIndex, totalItems
  } = usePagination({ data: movements, itemsPerPage: 10 });

  if (!mounted) return null;

  if (loadingProducts || !products.length) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <h2 className="text-xl font-bold" style={{ color: card.text }}>Loading Product Details...</h2>
      </div>
    );
  }

  const handleMoveProduct = async () => {
    if (!targetSupplierId) return;
    try {
      await updateProductSupplier(productId, targetSupplierId);
      setShowMoveModal(false);
      setTargetSupplierId('');
    } catch (err) {
      console.error('Failed to move product:', err);
    }
  };

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Package size={48} style={{ color: card.subtle }} />
        <h2 className="text-xl font-bold" style={{ color: card.text }}>Product Not Found</h2>
        <button onClick={() => router.back()} className="px-4 py-2 rounded-xl text-sm font-bold" style={{ background: card.primary, color: '#fff' }}>Go Back</button>
      </div>
    );
  }

  const isPOM = product.requiresRx;
  const status = product.stockQuantity === 0 ? 'OUT' : product.stockQuantity <= 10 ? 'LOW' : 'OK';
  const potentialProfit = (product.sellingPrice - product.costPrice) * product.stockQuantity;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" style={{ color: card.text }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-3" style={{ color: card.text }}>
              {product.name}
              <span className="text-xs px-2.5 py-1 rounded-md font-bold uppercase tracking-wider" style={{
                background: isPOM ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                color: isPOM ? '#EF4444' : '#10B981',
                border: `1px solid ${isPOM ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`
              }}>
                {isPOM ? 'POM' : 'OTC'}
              </span>
            </h1>
            <p className="text-sm" style={{ color: card.muted }}>
              {product.genericName || product.strength || product.dosageForm || 'No generic provided'} {product.brand ? `· ${product.brand}` : ''}
            </p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setTargetSupplierId(product.supplierId || '');
                setShowMoveModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:bg-slate-100"
              style={{ color: card.muted, border: `1px solid ${card.border}` }}
            >
              <Move size={16} />
              Move Supplier
            </button>
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
              style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBg}` }}
            >
              <Edit2 size={16} />
              Edit Product
            </button>
          </div>
        )}
      </div>

      {/* Product Image */}
      <div className="rounded-2xl border backdrop-blur-xl overflow-hidden" style={{ background: card.bg, borderColor: card.border }}>
        {product.imageUrl && !imgError ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-48 object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-48 flex items-center justify-center" style={{ background: card.primaryBg }}>
            <ImageIcon size={48} style={{ color: card.primary }} />
          </div>
        )}
      </div>

      {/* Large Edit Modal */}
      <AnimatePresence>
        {showEditModal && canEdit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl rounded-2xl border overflow-hidden shadow-2xl transition-all"
              style={{ background: isDark ? '#0F172A' : '#fff', borderColor: card.border }}
            >
              {/* Header */}
              <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: card.border, background: card.primaryBg }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: card.primary, color: isDark ? '#060B14' : '#fff' }}><Edit2 size={20} /></div>
                  <div>
                    <h2 className="font-display text-lg font-bold" style={{ color: card.text }}>Edit Product</h2>
                    <p className="text-[11px]" style={{ color: card.muted }}>Update pharmaceutical details for {product.name}</p>
                  </div>
                </div>
                <button onClick={() => setShowEditModal(false)} className="text-red-500 hover:bg-red-500/10 p-2 rounded-xl transition-colors"><X size={20} /></button>
              </div>

              {/* Tabs Navigation */}
              <div className="flex px-6 pt-4 border-b gap-6" style={{ borderColor: card.border }}>
                {[
                  { id: 'basic', label: 'Basic Info', icon: FileText },
                  { id: 'pricing', label: 'Pricing & Stock', icon: DollarSign },
                  { id: 'supplier', label: 'Supplier & Media', icon: Truck }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setEditModalTab(tab.id as any)}
                    className="flex items-center gap-2 pb-3 text-sm font-bold transition-colors relative"
                    style={{ color: editModalTab === tab.id ? card.primary : card.muted }}
                  >
                    <tab.icon size={16} />
                    {tab.label}
                    {editModalTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full" style={{ background: card.primary }} />
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-6 h-[400px] overflow-y-auto custom-scrollbar">
                
                {/* Tab 1: Basic Info */}
                {editModalTab === 'basic' && (
                  <div className="grid grid-cols-2 gap-5 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Product Name *</label>
                      <input type="text" placeholder="e.g. Paracetamol 500mg" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Generic Name</label>
                      <input type="text" placeholder="e.g. Acetaminophen" value={editForm.genericName} onChange={e => setEditForm({...editForm, genericName: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Brand / Manufacturer</label>
                      <input type="text" placeholder="e.g. GSK" value={editForm.brand} onChange={e => setEditForm({...editForm, brand: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Category *</label>
                      <select value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}>
                        <option value="">Select Category</option>
                        <option value="ANTIBIOTICS">ANTIBIOTICS</option>
                        <option value="ANALGESICS_NSAIDS">ANALGESICS & NSAIDS</option>
                        <option value="ANTIMALARIALS">ANTIMALARIALS</option>
                        <option value="VITAMINS_SUPPLEMENTS">VITAMINS & SUPPLEMENTS</option>
                        <option value="MISCELLANEOUS">MISCELLANEOUS</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Dosage Form</label>
                      <select value={editForm.dosageForm} onChange={e => setEditForm({...editForm, dosageForm: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}>
                        <option value="TABLET">Tablet</option>
                        <option value="CAPSULE">Capsule</option>
                        <option value="SYRUP">Syrup</option>
                        <option value="SUSPENSION">Suspension</option>
                        <option value="INJECTION">Injection</option>
                        <option value="CREAM">Cream</option>
                        <option value="OINTMENT">Ointment</option>
                        <option value="DROPS">Drops</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Strength</label>
                      <input type="text" placeholder="e.g. 500mg, 10mg/5ml" value={editForm.strength} onChange={e => setEditForm({...editForm, strength: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Classification *</label>
                      <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                        {['OTC', 'POM', 'CONTROLLED'].map(c => (
                          <button key={c} onClick={() => setEditForm({...editForm, classification: c})} 
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${editForm.classification === c ? 'shadow-sm' : 'opacity-60 hover:opacity-100'}`}
                            style={{ 
                              background: editForm.classification === c ? (isDark ? card.primaryBg : '#fff') : 'transparent',
                              color: editForm.classification === c ? card.primary : card.text
                            }}>
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Pricing & Stock */}
                {editModalTab === 'pricing' && (
                  <div className="grid grid-cols-2 gap-5 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Barcode / SKU</label>
                      <div className="flex gap-2">
                        <input type="text" placeholder="Scan or enter barcode" value={editForm.barcode} onChange={e => setEditForm({...editForm, barcode: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Cost Price (GH₵) *</label>
                      <input type="number" min="0" step="0.01" value={editForm.costPrice || ''} onChange={e => setEditForm({...editForm, costPrice: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Selling Price (GH₵) *</label>
                      <input type="number" min="0" step="0.01" value={editForm.sellingPrice || ''} onChange={e => setEditForm({...editForm, sellingPrice: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                    </div>

                    {/* Margin Calculator */}
                    <div className="col-span-2 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Profit Margin</p>
                        <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">Per unit sold</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-display font-bold text-emerald-600 dark:text-emerald-400">
                          {editForm.costPrice > 0 
                            ? `${(((editForm.sellingPrice - editForm.costPrice) / editForm.costPrice) * 100).toFixed(1)}%` 
                            : '0.0%'}
                        </p>
                        <p className="text-xs font-bold text-emerald-600/80 dark:text-emerald-400/80">
                          GH₵ {(editForm.sellingPrice - editForm.costPrice).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="col-span-2 border-t pt-5" style={{ borderColor: card.border }}>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Stock Quantity</label>
                      <div className="flex items-center gap-4">
                        <input type="number" min="0" value={editForm.stockQuantity || ''} onChange={e => setEditForm({...editForm, stockQuantity: parseInt(e.target.value) || 0})} className="flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                        <p className="text-xs w-1/2" style={{ color: card.muted }}>Usually managed via Purchase Orders or Stock Adjustments.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: Supplier & Media */}
                {editModalTab === 'supplier' && (
                  <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-5">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Supplier</label>
                        <select value={editForm.supplierId} onChange={e => setEditForm({...editForm, supplierId: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}>
                          <option value="">Direct / Unknown / General</option>
                          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>FDA / NAFDAC Number</label>
                        <input type="text" placeholder="Regulatory ID" value={editForm.nafdacNo} onChange={e => setEditForm({...editForm, nafdacNo: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Image URL</label>
                        <input type="text" placeholder="https://example.com/image.png" value={editForm.imageUrl} onChange={e => setEditForm({...editForm, imageUrl: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Product Media</label>
                      <div className="aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden group" style={{ borderColor: card.border, background: card.inputBg }}>
                        {editForm.imageUrl ? (
                          <>
                            <img src={editForm.imageUrl} className="w-full h-full object-cover" alt="Product Preview" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button onClick={() => setEditForm({...editForm, imageUrl: ''})} className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold">Remove</button>
                            </div>
                          </>
                        ) : (
                          <div className="text-center p-4">
                            <Sparkles size={32} className="mx-auto mb-2 opacity-50" style={{ color: card.primary }} />
                            <p className="text-[10px] opacity-70" style={{ color: card.text }}>No image selected</p>
                          </div>
                        )}
                        {generatingAIImage && <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-cyan-500 text-[10px] font-bold tracking-widest animate-pulse">GENERATING...</div>}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                         <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="edit-image-upload" />
                         <label htmlFor="edit-image-upload" className="w-full py-2.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all hover:opacity-80 cursor-pointer" style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC', border: `1px solid ${card.border}`, color: card.text }}>
                           {uploadingImage ? <RefreshCw size={12} className="animate-spin" /> : <Upload size={12} />} Upload
                         </label>
                         <button onClick={generateAIImages} disabled={generatingAIImage} className="w-full py-2.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all hover:brightness-110 disabled:opacity-50" style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBg}` }}>
                           {generatingAIImage ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} AI Generated
                         </button>
                      </div>
                      {/* AI Options */}
                      {aiImageOptions.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {aiImageOptions.map((url, idx) => (
                            <button key={idx} onClick={() => selectAiImage(url)} className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${selectedAiImage === url ? 'border-primary opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                              <img src={url} alt={`AI Option ${idx}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t flex items-center justify-between bg-slate-50 dark:bg-slate-900/50" style={{ borderColor: card.border }}>
                <button onClick={() => setShowEditModal(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-slate-200 dark:hover:bg-slate-800" style={{ color: card.text }}>Cancel</button>
                
                <div className="flex gap-2">
                  {editModalTab !== 'basic' && <button onClick={() => setEditModalTab(editModalTab === 'pricing' ? 'basic' : 'pricing')} className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all border" style={{ borderColor: card.border, color: card.text }}>Back</button>}
                  
                  {editModalTab !== 'supplier' ? (
                    <button onClick={() => setEditModalTab(editModalTab === 'basic' ? 'pricing' : 'supplier')} className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-xl" style={{ background: card.primary, color: '#fff', boxShadow: `0 4px 15px ${card.primary}40` }}>Continue</button>
                  ) : (
                    <button onClick={handleSave} disabled={!editForm.name || editForm.costPrice <= 0 || editForm.sellingPrice <= 0} className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center gap-2" style={{ background: '#10B981', color: '#fff', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}>
                      <Save size={16} /> Save Changes
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border backdrop-blur-xl p-6" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: card.text }}>
              <Package size={18} style={{ color: card.primary }} />
              Detailed Paper
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: card.subtle }}>Category</p>
                <p className="text-sm font-semibold px-3 py-1.5 rounded-lg inline-block" style={{ background: 'rgba(0,0,0,0.05)', color: card.text }}>{product.category || 'Uncategorized'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: card.subtle }}>Stock Level</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-display font-bold" style={{ color: card.text }}>{product.stockQuantity}</p>
                  {status === 'OK' && <CheckCircle size={16} color="#10B981" />}
                  {status === 'LOW' && <AlertCircle size={16} color="#F59E0B" />}
                  {status === 'OUT' && <AlertCircle size={16} color="#EF4444" />}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: card.subtle }}>Cost Price</p>
                <p className="text-lg font-mono font-bold" style={{ color: card.text }}>GH₵ {product.costPrice.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: card.subtle }}>Selling Price</p>
                <p className="text-lg font-mono font-bold" style={{ color: card.primary }}>GH₵ {product.sellingPrice.toFixed(2)}</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t grid grid-cols-1 md:grid-cols-2 gap-6" style={{ borderColor: card.border }}>
               <div className="flex items-start gap-4">
                 <div className="p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}><TrendingUp size={20} /></div>
                 <div>
                   <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: card.subtle }}>Projected Profit (Current Stock)</p>
                   <p className="text-xl font-mono font-bold text-emerald-500">GH₵ {potentialProfit.toFixed(2)}</p>
                 </div>
               </div>
               <div className="flex items-start gap-4">
                 <div className="p-3 rounded-xl" style={{ background: card.primaryBg, color: card.primary }}><Truck size={20} /></div>
                 <div>
                   <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: card.subtle }}>Supplier</p>
                   {supplier ? (
                     <button onClick={() => router.push(`/dashboard/suppliers/${supplier.id}`)} className="text-sm font-bold hover:underline transition-colors" style={{ color: card.primary }}>
                       {supplier.name}
                     </button>
                   ) : (
                     <p className="text-sm font-bold" style={{ color: card.text }}>Direct / Unknown</p>
                   )}
                   <p className="text-xs" style={{ color: card.muted }}>{supplier?.contact || supplier?.phone || 'No contact info'}</p>
                 </div>
               </div>
            </div>
          </div>

          {/* Stock History */}
          <div className="rounded-2xl border backdrop-blur-xl overflow-hidden" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <div className="p-6 border-b" style={{ borderColor: card.border }}>
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: card.text }}>
                <History size={18} style={{ color: card.primary }} />
                Stock Movement History
              </h2>
            </div>
            
            {movements.length === 0 ? (
              <div className="p-8 text-center">
                <Clock size={32} className="mx-auto mb-3" style={{ color: card.subtle }} />
                <p className="text-sm" style={{ color: card.muted }}>No recorded stock movements for this product yet.</p>
              </div>
            ) : (
              <div>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${card.border}`, background: isDark ? 'rgba(15,23,42,0.3)' : 'rgba(248,250,252,0.6)' }}>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase" style={{ color: card.subtle }}>Date</th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase" style={{ color: card.subtle }}>Type</th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase" style={{ color: card.subtle }}>Quantity</th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase" style={{ color: card.subtle }}>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedMovements.map((m, i) => (
                      <tr key={m.id} style={{ borderBottom: i < paginatedMovements.length - 1 ? `1px solid ${card.border}` : 'none' }}>
                        <td className="px-5 py-4" style={{ color: card.text }}>
                          {new Date(m.date).toLocaleDateString()}
                          <span className="text-[10px] block" style={{ color: card.muted }}>{new Date(m.date).toLocaleTimeString()}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-[10px] font-bold px-2 py-1 rounded-md" style={{ 
                            background: m.type === 'in' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', 
                            color: m.type === 'in' ? '#10B981' : '#EF4444' 
                          }}>
                            {m.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-mono font-bold" style={{ color: card.text }}>
                          {m.type === 'in' ? '+' : '-'}{m.quantity}
                        </td>
                        <td className="px-5 py-4" style={{ color: card.muted }}>{m.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-4 border-t flex justify-between items-center" style={{ borderColor: card.border }}>
                   <p className="text-xs" style={{ color: card.muted }}>Showing {startIndex}-{endIndex} of {totalItems}</p>
                   <div className="flex gap-2">
                     <button disabled={currentPage === 1} onClick={prevPage} className="px-3 py-1 rounded-lg text-xs font-bold disabled:opacity-30" style={{ background: card.primaryBg, color: card.primary }}>Prev</button>
                     <button disabled={currentPage === totalPages} onClick={nextPage} className="px-3 py-1 rounded-lg text-xs font-bold disabled:opacity-30" style={{ background: card.primaryBg, color: card.primary }}>Next</button>
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Action / Sync Card */}
          <div className="rounded-2xl border backdrop-blur-xl p-6 text-center" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
             <DollarSign size={32} className="mx-auto mb-3" style={{ color: card.primary }} />
             <h3 className="font-bold mb-1" style={{ color: card.text }}>Sales Ready</h3>
             <p className="text-xs mb-4" style={{ color: card.muted }}>This product is properly synced to the POS terminal with pricing applied.</p>
             <button onClick={() => router.push('/dashboard/inventory')} className="w-full py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90" style={{ background: card.primary, color: '#fff' }}>
               Back to Inventory
             </button>
          </div>
        </div>
      </div>
      {/* Move Modal */}
      {showMoveModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-sm rounded-2xl border p-6" style={{ background: isDark ? '#0F172A' : '#fff', borderColor: card.border }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Move size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold" style={{ color: card.text }}>Change Supplier</h3>
                <p className="text-xs" style={{ color: card.muted }}>Move product to a different supplier</p>
              </div>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">Target Supplier</label>
                <select 
                  value={targetSupplierId} 
                  onChange={e => setTargetSupplierId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}
                >
                  <option value="">Choose a supplier...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowMoveModal(false)}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm"
                style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', color: card.text }}
              >
                Cancel
              </button>
              <button 
                onClick={handleMoveProduct}
                disabled={!targetSupplierId}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
                style={{ background: card.primary }}
              >
                <Save size={16} />
                Confirm Move
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
