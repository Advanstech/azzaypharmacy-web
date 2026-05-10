'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { 
  Search, X, Plus, Minus, CreditCard, Smartphone, Banknote, Shield, 
  CheckCircle2, Printer, User, Package, Tag, LogOut,
  Monitor, LayoutGrid, Wifi, AlertCircle, ChevronLeft, ChevronRight,
  Receipt, Trash2, UserPlus, BarChart2, RefreshCw, FlaskConical,
  ArrowRight, BadgeCheck, Pill, Home, ShoppingCart, Store,
  BrainCircuit, Sparkles
} from 'lucide-react';
import { StoreProvider, useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { gql, Q_SEARCH_PRODUCTS } from '@/lib/gql';
import { TopResultPill } from '@/components/TopResultPill';
import Image from 'next/image';
import Link from 'next/link';

// Map dosage forms to 3D product images
const DOSAGE_IMAGE_MAP: Record<string, string> = {
  TABLET: '/pharma/tablets.png',
  CAPSULE: '/pharma/capsules.png',
  SYRUP: '/pharma/syrup.png',
  SUSPENSION: '/pharma/syrup.png',
  INJECTION: '/pharma/injection.png',
  INFUSION: '/pharma/injection.png',
  CREAM: '/pharma/cream.png',
  OINTMENT: '/pharma/cream.png',
  GEL: '/pharma/cream.png',
  LOTION: '/pharma/cream.png',
  EYE_DROP: '/pharma/eyedrops.png',
  EAR_DROP: '/pharma/eyedrops.png',
  NASAL_SPRAY: '/pharma/eyedrops.png',
  DROPS: '/pharma/eyedrops.png',
  SOLUTION: '/pharma/eyedrops.png',
};

function getProductImage(product: any): string {
  if (product.imageUrl) return product.imageUrl;
  return DOSAGE_IMAGE_MAP[product.dosageForm] || '/pharma/default.png';
}

interface CartItem {
  product: any;
  quantity: number;
}

type PaymentMethod = 'Cash' | 'MoMo' | 'Card' | 'NHIS';

function POSInner() {
  const { theme, resolvedTheme } = useTheme();
  const router = useRouter();
  const { 
    products: liveProducts, 
    loadingProducts, 
    refetchProducts,
    refetchAll,
    syncStatus,
    error: storeError,
    me,
    createSale
  } = useStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && (resolvedTheme ?? theme) === 'dark';

  // Clock
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // POS state
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [tendered, setTendered] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showNumpad, setShowNumpad] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<any>(null);
  const [previewSupplier, setPreviewSupplier] = useState<string | null>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(() => {
    if (!liveProducts.length) return ['All'];
    const cats = new Set(liveProducts.map(p => p.category).filter(Boolean));
    return ['All', ...Array.from(cats).sort()];
  }, [liveProducts]);

  // Server-side product search (debounced)
  useEffect(() => {
    const q = search.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const data = await gql<{ searchProducts: any[] }>(Q_SEARCH_PRODUCTS, { query: q, limit: 50 });
        setSearchResults(data.searchProducts || []);
      } catch (e) {
        console.warn('[POS] Search failed:', e);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    // Use server results when searching
    if (q) {
      const base = searchResults.length > 0 ? searchResults : liveProducts;
      if (activeCategory === 'All') return base;
      return base.filter(p => p.category === activeCategory);
    }
    // Default: show empty when no category and no search
    if (activeCategory === 'All') return [];
    return liveProducts.filter(p => p.category === activeCategory);
  }, [search, activeCategory, liveProducts, searchResults]);

  // Auto-refetch if empty
  useEffect(() => {
    if (mounted && liveProducts.length === 0 && !loadingProducts) {
      const t = setTimeout(() => {
        refetchProducts();
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [mounted, liveProducts.length, loadingProducts, refetchProducts]);

  const addToCart = (product: any) => {
    if (product.stockQuantity === 0) return;
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id
          ? { ...i, quantity: Math.min(i.quantity + 1, product.stockQuantity) }
          : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev
      .map(i => i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i)
      .filter(i => i.quantity > 0)
    );
  };

  const total = cart.reduce((sum, i) => sum + i.product.sellingPrice * i.quantity, 0);
  const tenderedNum = parseFloat(tendered) || 0;
  const change = tenderedNum - total;

  const handleComplete = async () => {
    if (cart.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const sale = await createSale({
        items: cart.map(i => ({ product: i.product, quantity: i.quantity })),
        paymentMethod,
        amountPaid: paymentMethod === 'Cash' ? tenderedNum || total : total,
        customerName: selectedCustomer?.name || 'Walk-in Customer',
      });
      setCompletedSale({ ...sale, items: [...cart], total, change: Math.max(0, change) });
      setShowReceipt(true);
      setCart([]);
      setTendered('');
    } catch (err: any) {
      console.error('Sale failed:', err);
      alert(`Sale failed: ${err?.message || 'Unknown error. Check your connection and try again.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = 300;
      categoryScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleCategoryClick = (cat: string) => {
    setActiveCategory(cat);
    // Smoothly scroll the selected category into center view
    const container = categoryScrollRef.current;
    if (container) {
      const target = container.querySelector(`[data-category="${cat}"]`) as HTMLElement;
      if (target) {
        const containerWidth = container.offsetWidth;
        const targetOffset = target.offsetLeft;
        const targetWidth = target.offsetWidth;
        const scrollLeft = targetOffset - (containerWidth / 2) + (targetWidth / 2);
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    }
  };

  const handleNumpadPress = (value: string) => {
    if (value === 'C') {
      setTendered('');
    } else if (value === '⌫') {
      setTendered(prev => prev.slice(0, -1));
    } else {
      setTendered(prev => prev + value);
    }
  };

  if (!mounted) return null;

  const c = {
    header: '#059669', // Emerald Green
    bg: isDark ? '#0A0F1E' : '#F1F5F9',
    card: isDark ? 'rgba(15,23,42,0.86)' : '#fff',
    border: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(203,213,225,0.5)',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    primary: isDark ? '#00D9FF' : '#0EA5E9',
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: c.bg, color: c.text }}>
      {/* Custom Header - EXACT Match */}
      <header className="flex items-center justify-between px-4 h-14 shrink-0 z-10 text-white"
        style={{ background: '#059669' }}>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
               <span className="text-[#059669] font-bold text-[10px]">
                 {me?.name ? me.name.charAt(0).toUpperCase() : 'A'}
               </span>
            </div>
            <div className="flex items-center text-sm font-semibold tracking-wide">
              <span>{me?.name || 'Azzay Pharmacy'}</span>
              <span className="mx-2 opacity-50">•</span>
              <span className="font-light">{me?.position || me?.role || 'Cashier'}</span>
              <span className="mx-2 opacity-50">•</span>
              <span className="font-light">{me?.role === 'SE_ADMIN' ? 'Main Branch' : (me?.branch?.name || 'Main Branch')}</span>
            </div>
          </div>

          <div className="h-4 w-px bg-white/20 mx-2"></div>

          <button 
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/30 hover:bg-white/10 transition-colors text-xs font-medium"
          >
            <LayoutGrid size={14} /> Desk
          </button>

          <button 
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-transparent hover:bg-white/10 transition-colors text-xs font-medium"
          >
            <LogOut size={14} /> Out
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => refetchAll()} 
            className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/30 hover:bg-white/10 transition-colors text-xs font-medium"
          >
            <Wifi size={14} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
            {syncStatus === 'syncing' ? 'Syncing...' : 'Sync'}
          </button>
          <div className="text-right flex flex-col items-end">
            <p className="font-mono font-bold text-sm leading-none">{formatTime(now)}</p>
            <p className="text-[10px] opacity-80 mt-0.5">{now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
          </div>
        </div>
      </header>


      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden">
        {/* Left: Product Selection */}
        <div className="flex flex-col flex-1 min-w-0 border-r" style={{ borderColor: c.border, background: isDark ? 'rgba(10,15,30,0.92)' : 'rgba(255,255,255,0.55)' }}>
          
          {storeError && (
            <div className="p-3 mx-4 mt-4 rounded-xl border flex items-center justify-between gap-3 animate-pulse" 
              style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)', color: '#EF4444' }}>
              <div className="flex items-center gap-2">
                <AlertCircle size={16} />
                <p className="text-xs font-bold">{storeError}</p>
              </div>
              <button onClick={() => window.location.href = '/'} className="text-[10px] underline font-bold">Relogin</button>
            </div>
          )}

          {/* Search Bar matching screenshot */}
          <div className="px-6 pt-4 pb-2 z-20">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: c.muted }} size={20} />
              <input 
                type="text" 
                placeholder="Search products by name, brand, or category..." 
                className="w-full pl-12 pr-12 py-3 rounded-xl border focus:outline-none focus:border-[#059669] transition-colors text-sm"
                style={{ borderColor: c.border, background: isDark ? 'rgba(15,23,42,0.9)' : '#fff', color: c.text }}
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: c.muted }}>
                  <X size={18} />
                </button>
              )}
            </div>
            <p className="text-xs mt-2 ml-1 font-medium" style={{ color: c.muted }}>
              {searchResults.length} products found
            </p>
          </div>

            {/* Horizontal Categories with Scroll Controls */}
            <div className="relative group/cats">
              <button 
                onClick={() => scrollCategories('left')}
                aria-label="Scroll Categories Left"
                className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full flex items-center justify-center border hover:scale-110 transition-transform"
                style={{ borderColor: c.border, background: isDark ? 'rgba(15,23,42,0.95)' : '#fff' }}
              >
                <ChevronLeft size={16} style={{ color: c.muted }} />
              </button>
              <div ref={categoryScrollRef} className="flex gap-2 overflow-x-auto pb-4 pt-1 no-scrollbar scroll-smooth px-10">
                {categories.map(cat => (
                  <button 
                    key={cat} 
                    data-category={cat}
                    onClick={() => handleCategoryClick(cat)}
                    className={`px-6 py-3 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border-2 flex items-center gap-2 ${
                      activeCategory === cat 
                        ? 'scale-105 z-10' 
                        : 'hover:border-primary/40 hover:bg-primary/5 active:scale-95'
                    }`}
                    style={{ 
                      background: activeCategory === cat ? c.primary : (isDark ? 'rgba(255,255,255,0.03)' : '#fff'),
                      borderColor: activeCategory === cat ? c.primary : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                      color: activeCategory === cat ? '#fff' : c.muted
                    }}
                  >
                    <div className={`w-2 h-2 rounded-full ${activeCategory === cat ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
                    {cat}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => scrollCategories('right')}
                aria-label="Scroll Categories Right"
                className="absolute right-0 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full flex items-center justify-center border hover:scale-110 transition-transform"
                style={{ borderColor: c.border, background: isDark ? 'rgba(15,23,42,0.95)' : '#fff' }}
              >
                <ChevronRight size={16} style={{ color: c.muted }} />
              </button>
            </div>

            {/* Top Search Result */}
            {search && searchResults.length > 0 && activeCategory === 'All' && (
              <div className="mt-4 px-2">
                <TopResultPill 
                  product={searchResults[0]} 
                  onAddToCart={addToCart} 
                  isDark={isDark} 
                  onPreviewProduct={setPreviewProduct}
                  onPreviewSupplier={setPreviewSupplier}
                />
              </div>
            )}


          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {loadingProducts || searching ? (
              <div className="h-full flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent animate-spin rounded-full"></div>
                <p className="text-xs font-medium" style={{ color: c.muted }}>
                  {searching ? 'Searching products...' : 'Syncing inventory...'}
                </p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 opacity-50">
                <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: isDark ? 'rgba(30,41,59,0.8)' : 'rgba(203,213,225,0.8)' }}>
                  <Package size={48} />
                </div>
                <div className="text-center">
                  {search ? (
                    <>
                      <p className="text-sm font-bold">No results for "{search}"</p>
                      <p className="text-xs">Try the generic name, or log a product request.</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-bold">Ready for Sale</p>
                      <p className="text-xs">Search for a product or select a category above to begin.</p>
                    </>
                  )}
                </div>
                {search && (
                  <button onClick={() => setSearch('')} className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs mt-2">
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 px-2">
                {filteredProducts.map(p => (
                  <button 
                    key={p.id} onClick={() => addToCart(p)}
                    disabled={p.stockQuantity === 0}
                    className="group text-left rounded-2xl border hover:border-[#059669] transition-all shadow-sm active:scale-[0.98] overflow-hidden relative"
                    style={{ 
                      background: isDark ? 'rgba(15,23,42,0.86)' : '#fff',
                      borderColor: cart.find(i => i.product.id === p.id) ? '#059669' : c.border,
                      opacity: p.stockQuantity === 0 ? 0.5 : 1
                    }}
                  >
                    <div className="flex w-full h-full p-2.5 gap-4 items-center">
                      {/* Left: Image Container */}
                      <div className="w-24 h-24 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden" style={{ background: isDark ? 'rgba(30,41,59,0.7)' : '#F1F5F9' }}>
                        <img 
                          src={getProductImage(p)} 
                          alt={p.name} 
                          className="w-full h-full object-cover transition-transform group-hover:scale-110"
                        />
                      </div>
                      
                      {/* Right: Content */}
                      <div className="flex-1 min-w-0 py-1 flex flex-col h-full justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="px-1.5 py-0.5 rounded border border-[#059669] text-[#059669] bg-transparent text-[9px] font-extrabold uppercase tracking-widest">
                              {p.category || 'OTC'}
                            </span>
                          </div>
                          <h3 className="font-extrabold text-sm leading-tight truncate uppercase pr-16 hover:text-[#059669]" style={{ color: c.text }}>
                            <span onClick={(e) => { e.stopPropagation(); setPreviewProduct(p); }} className="hover:underline cursor-pointer">{p.name}</span>
                          </h3>
                        </div>
                        
                        <div className="mt-2">
                          <p className="font-extrabold text-base text-[#059669]">GHc{p.sellingPrice.toFixed(2)}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[#059669] font-bold text-[10px]">
                            <Store size={12} /> {p.stockQuantity}/{p.maxStock || p.stockQuantity}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Rightmost Add Button - Positioned absolute to match design */}
                    <div className="absolute bottom-3 right-3 flex flex-col justify-end">
                      <div className="px-3 py-1.5 rounded-full bg-[#059669] text-white flex items-center gap-1 group-hover:bg-[#047857] transition-colors shadow-sm">
                        {cart.find(i => i.product.id === p.id) ? (
                          <span className="font-bold text-xs">{cart.find(i => i.product.id === p.id)?.quantity}</span>
                        ) : (
                          <>
                            <Plus size={12} />
                            <span className="text-[10px] font-bold">ADD</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart & Preview Container */}
        <div className="w-[380px] xl:w-[420px] shrink-0 flex flex-col z-20 border-l relative overflow-hidden" style={{ borderColor: c.border, background: c.card }}>
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: c.border }}>
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} style={{ color: c.text }} />
              <h2 className="font-bold text-sm" style={{ color: c.text }}>Current Sale</h2>
            </div>
            <button onClick={() => setCart([])} className="text-[10px] font-bold text-red-500 hover:underline">Clear Cart</button>
          </div>

          {/* CUSTOMER (optional) Section */}
          <div className="p-4 border-b" style={{ borderColor: c.border, background: isDark ? 'rgba(15,23,42,0.68)' : 'rgba(248,250,252,0.75)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold flex items-center gap-1" style={{ color: c.muted }}>
                <div className="w-3 h-3 rounded flex items-center justify-center text-[8px]" style={{ background: isDark ? 'rgba(30,41,59,0.85)' : '#E2E8F0' }}>X</div>
                CUSTOMER <span className="opacity-60 font-normal">(optional)</span>
              </span>
            </div>
            
            {selectedCustomer ? (
              <div className="flex items-center justify-between bg-white border p-3 rounded-lg" style={{ borderColor: c.border }}>
                <div className="flex items-center gap-2">
                  <User size={14} className="text-[#059669]" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">{selectedCustomer.name}</p>
                    <p className="text-[10px] text-slate-500">{selectedCustomer.phone || 'No phone'}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="text-[10px] text-red-500 font-bold hover:underline">Change</button>
              </div>
            ) : (
              <div className="flex gap-2 mb-2">
                <input 
                  type="text" 
                  placeholder="Search by PP- code..." 
                  className="flex-1 px-3 py-2 text-xs rounded-lg border focus:outline-none focus:border-[#059669]"
                  style={{ background: isDark ? 'rgba(15,23,42,0.9)' : '#fff', borderColor: c.border, color: c.text }}
                />
                <button 
                  onClick={() => setShowCustomerSearch(true)}
                  className="px-3 py-2 rounded-lg bg-[#059669]/10 text-[#059669] text-xs font-bold hover:bg-[#059669]/20 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <UserPlus size={14} /> New
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar flex flex-col">
            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center opacity-40 min-h-[200px]">
                <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                  <Tag size={32} />
                </div>
                <div>
                  <p className="text-sm font-bold">Cart is empty</p>
                  <p className="text-[10px]">Select items to begin a sale</p>
                </div>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.product.id} className="p-3 rounded-xl border flex flex-col gap-2 transition-all hover:border-primary/30"
                  style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', borderColor: c.border }}>
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-bold leading-tight flex-1 pr-2" style={{ color: c.text }}>{item.product.name}</p>
                    <button onClick={() => updateQty(item.product.id, -item.quantity)} className="text-red-500 opacity-50 hover:opacity-100"><X size={14} /></button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item.product.id, -1)} className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200"><Minus size={12} /></button>
                      <span className="w-8 text-center font-mono text-sm font-bold">{item.quantity}</span>
                      <button onClick={() => updateQty(item.product.id, 1)} className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center"><Plus size={12} /></button>
                    </div>
                    <span className="font-mono text-xs font-bold" style={{ color: c.primary }}>GH₵ {(item.product.sellingPrice * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t space-y-4" style={{ borderColor: c.border, background: isDark ? 'rgba(15,23,42,0.6)' : '#F8FAFC' }}>
            <div className="space-y-2">
              <div className="flex justify-between text-xs" style={{ color: c.muted }}>
                <span>Subtotal</span>
                <span className="font-mono">GH₵ {total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold" style={{ color: c.text }}>Total Due</span>
                <span className="text-2xl font-display font-bold text-primary">GH₵ {total.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {(['Cash', 'MoMo', 'Card', 'NHIS'] as PaymentMethod[]).map(m => (
                <button 
                  key={m} onClick={() => setPaymentMethod(m)}
                  className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${
                    paymentMethod === m 
                      ? 'bg-primary text-white border-primary' 
                      : 'bg-white text-slate-800 border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 opacity-60'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {paymentMethod === 'Cash' && (
              <button
                onClick={() => setShowNumpad(true)}
                className="w-full py-3 rounded-xl border-2 font-mono text-lg font-bold focus:border-primary/50 outline-none transition-all hover:border-primary/30"
                style={{ background: isDark ? '#0A0F1E' : '#fff', borderColor: c.border, color: c.text }}
              >
                {tendered || 'Tap to Enter Amount'}
              </button>
            )}

            <button 
              onClick={handleComplete}
              disabled={cart.length === 0 || submitting}
              className="w-full py-4 rounded-2xl bg-primary text-white font-display font-bold text-lg flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
              style={{ background: submitting ? c.muted : c.primary }}
            >
              {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white animate-spin rounded-full"></div> : <CheckCircle2 size={24} />}
              COMPLETE SALE
            </button>
          </div>

          {/* AI PRODUCT INTELLIGENCE PANEL (Slide-over) */}
          <div 
            className={`absolute inset-0 z-50 flex flex-col transition-transform duration-300 ${previewProduct ? 'translate-x-0' : 'translate-x-full'}`}
            style={{ background: isDark ? '#0A0F1E' : '#111827' }}
          >
            {previewProduct && (
              <>
                <div className="p-4 flex items-center justify-between border-b border-white/10 text-white">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/10 text-slate-300">
                      {previewProduct.category || 'OTC'}
                    </span>
                    <h2 className="font-display font-bold text-lg leading-tight mt-2">{previewProduct.name}</h2>
                  </div>
                  <button onClick={() => setPreviewProduct(null)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                  {/* AI Block */}
                  <div className="p-4 rounded-2xl border flex flex-col gap-3 relative overflow-hidden" style={{ background: 'rgba(0,217,255,0.05)', borderColor: 'rgba(0,217,255,0.2)' }}>
                    <div className="absolute top-0 right-0 p-4 opacity-5"><BrainCircuit size={100} /></div>
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-2 text-[#00D9FF]">
                        <Sparkles size={16} />
                        <span className="text-xs font-bold uppercase tracking-widest">AI Drug Intelligence</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#00D9FF]/20 text-[#00D9FF]">GPT-4o</span>
                    </div>

                    <div className="relative z-10 w-full h-32 rounded-xl overflow-hidden mt-2 bg-slate-900 border border-white/10">
                      <img src={getProductImage(previewProduct)} alt={previewProduct.name} className="w-full h-full object-cover opacity-80" />
                    </div>

                    <div className="space-y-4 relative z-10 mt-2 text-slate-300 text-xs">
                      <div>
                        <p className="font-bold text-[#00D9FF] mb-1 text-[10px] uppercase">Indications</p>
                        <p className="leading-relaxed">Relief of mild to moderate pain, reduction of fever, and relief of symptoms of colds.</p>
                      </div>
                      <div>
                        <p className="font-bold text-[#00D9FF] mb-1 text-[10px] uppercase">Standard Dosage</p>
                        <p className="leading-relaxed">Adults: 1-2 tablets every 6-8 hours. Max 4 doses/24h.</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                        <p className="font-bold text-orange-400 mb-1 text-[10px] uppercase">Counseling Points</p>
                        <p className="leading-relaxed">Take with food to minimize GI irritation. Do not exceed recommended dose.</p>
                      </div>
                    </div>
                  </div>

                  {/* Product Data */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Unit Price</p>
                      <p className="text-xl font-bold text-emerald-400">GH₵{previewProduct.sellingPrice.toFixed(2)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">In Stock</p>
                      <p className="text-xl font-bold text-white">{previewProduct.stockQuantity}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Supplier Chain</p>
                     <div className="flex items-center justify-between">
                       <p className="text-sm font-bold text-white">Ernest Chemists Ltd</p>
                       <span className="text-[10px] text-orange-400 font-bold">Score 75</span>
                     </div>
                  </div>
                </div>

                <div className="p-4 border-t border-white/10 bg-black/20">
                  <button 
                    onClick={() => { addToCart(previewProduct); setPreviewProduct(null); }}
                    disabled={previewProduct.stockQuantity === 0}
                    className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold transition-all hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Plus size={18} /> Add to Sale
                  </button>
                </div>
              </>
            )}
          </div>

        </div>
      </main>

      {/* Customer Search Modal */}
      {showCustomerSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl bg-black/60">
          <div className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300" style={{ background: isDark ? '#0F172A' : '#fff' }}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-lg" style={{ color: c.text }}>Select Customer</h3>
                <button onClick={() => setShowCustomerSearch(false)}><X size={20} style={{ color: c.muted }} /></button>
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2" size={18} style={{ color: c.muted }} />
                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-2 focus:outline-none"
                  style={{ background: isDark ? '#0A0F1E' : '#F8FAFC', borderColor: c.border, color: c.text }}
                />
              </div>
              <button
                onClick={() => { setSelectedCustomer({ name: 'Walk-in Customer', phone: '' }); setShowCustomerSearch(false); }}
                className="w-full py-3 rounded-xl border-2 border-dashed font-bold text-xs mb-3"
                style={{ borderColor: c.border, color: c.muted }}
              >
                Walk-in Customer
              </button>
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                {/* Sample customers - would use store.customers */}
                {['Kwame Mensah', 'Ama Serwaa', 'Kojo Asante'].map(name => (
                  <button
                    key={name}
                    onClick={() => { setSelectedCustomer({ name, phone: '024...' }); setShowCustomerSearch(false); }}
                    className="w-full p-3 rounded-xl border flex items-center gap-3 transition-all hover:border-primary/30"
                    style={{ borderColor: c.border, background: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC' }}
                  >
                    <User size={16} style={{ color: c.primary }} />
                    <span className="text-xs font-bold" style={{ color: c.text }}>{name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Numpad Modal */}
      {showNumpad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl bg-black/60">
          <div className="w-full max-w-xs rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300" style={{ background: isDark ? '#0F172A' : '#fff' }}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-sm" style={{ color: c.text }}>Cash Tendered</h3>
                <button onClick={() => setShowNumpad(false)}><X size={18} style={{ color: c.muted }} /></button>
              </div>
              <div className="p-4 rounded-xl mb-4 text-center" style={{ background: isDark ? 'rgba(0,217,255,0.1)' : 'rgba(14,165,233,0.05)', border: `2px solid ${c.border}` }}>
                <p className="font-mono text-3xl font-bold" style={{ color: c.primary }}>GH₵ {tendered || '0.00'}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', '⌫'].map(key => (
                  <button
                    key={key}
                    onClick={() => handleNumpadPress(key)}
                    className={`py-4 rounded-xl font-bold text-lg transition-all ${
                      key === 'C' ? 'bg-red-500/10 text-red-500' :
                      key === '⌫' ? 'bg-orange-500/10 text-orange-500' :
                      'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                    style={{ color: c.text }}
                  >
                    {key}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowNumpad(false)}
                className="w-full mt-4 py-3 rounded-xl bg-primary text-white font-bold text-sm"
                style={{ background: c.primary }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl bg-black/60 print:p-0 print:bg-white print:backdrop-blur-none">
          <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 print:shadow-none print:max-w-none print:w-[80mm] print:rounded-none" 
            style={{ background: isDark ? '#0F172A' : '#fff' }}>
            
            {/* Print Only Header (Logo) */}
            <div className="hidden print:block text-center pt-4">
              <h1 className="text-xl font-bold">AZZAY PHARMACY</h1>
              <p className="text-[10px]">Quality Health, Quality Life</p>
            </div>

            <div className="p-6 text-center print:p-2" style={{ background: c.header }}>
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center font-display font-bold text-xl mx-auto mb-3 border border-white/30 text-white print:hidden">A</div>
              <h2 className="font-display font-bold text-white print:text-black">Azzay Pharma NEXUS</h2>
              <p className="text-[10px] text-white/70 print:text-black">Clinical Receipt · {new Date().toLocaleString()}</p>
            </div>

            <div className="p-6 space-y-4 print:p-2 print:space-y-2">
              {/* Transaction Details */}
              <div className="grid grid-cols-2 gap-2 text-[10px] print:text-[8px]" style={{ color: c.muted }}>
                <div><span className="opacity-60">Date:</span> {new Date().toLocaleDateString()}</div>
                <div><span className="opacity-60">Time:</span> {new Date().toLocaleTimeString()}</div>
                <div><span className="opacity-60">Branch:</span> Dormaa Central</div>
                <div><span className="opacity-60">Cashier:</span> {me?.name || 'Pharmacist'}</div>
              </div>

              {selectedCustomer && (
                <div className="p-2 rounded-lg text-[10px]" style={{ background: isDark ? 'rgba(0,217,255,0.05)' : 'rgba(14,165,233,0.05)' }}>
                  <span className="opacity-60">Customer:</span> {selectedCustomer.name}
                  {selectedCustomer.phone && <span className="ml-2 opacity-60">{selectedCustomer.phone}</span>}
                </div>
              )}

              <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar print:max-h-none print:overflow-visible">
                {completedSale.items.map((item: any) => (
                  <div key={item.product.id} className="flex justify-between text-xs border-b border-dashed print:border-slate-300 pb-2">
                    <div className="flex-1">
                      <p className="font-bold truncate">{item.product.name}</p>
                      <p className="text-[9px] opacity-60">Qty: {item.quantity} @ GH₵ {item.product.sellingPrice.toFixed(2)}</p>
                    </div>
                    <span className="font-mono font-bold ml-4 self-center">GH₵ {(item.product.sellingPrice * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t space-y-2 print:pt-2">
                <div className="flex justify-between text-xs opacity-60">
                  <span>Subtotal</span>
                  <span className="font-mono">GH₵ {completedSale.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-base print:text-sm">
                  <span>Grand Total</span>
                  <span className="text-primary font-mono print:text-black">GH₵ {completedSale.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[10px] opacity-60">
                  <span>Method</span>
                  <span className="font-bold">{paymentMethod}</span>
                </div>
                {paymentMethod === 'Cash' && (
                  <>
                    <div className="flex justify-between text-xs opacity-60">
                      <span>Tendered</span>
                      <span className="font-mono">GH₵ {tenderedNum.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-green-500 print:text-black">
                      <span>Change Due</span>
                      <span className="font-mono">GH₵ {completedSale.change.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Barcode Line */}
              <div className="pt-4 text-center print:pt-2">
                <div className="h-8 bg-black dark:bg-white mx-auto" style={{ 
                  background: `repeating-linear-gradient(90deg, ${isDark ? '#fff' : '#000'} 0px, ${isDark ? '#fff' : '#000'} 2px, transparent 2px, transparent 3px, ${isDark ? '#fff' : '#000'} 4px, ${isDark ? '#fff' : '#000'} 5px, transparent 5px, transparent 7px)`,
                  width: '80%'
                }}></div>
                <p className="text-[9px] font-mono mt-1 opacity-60">{completedSale.id}</p>
              </div>

              {/* Receipt Footer for Print */}
              <div className="hidden print:block text-center pt-4 space-y-1">
                <p className="text-[10px] font-bold">Thank you for your visit!</p>
                <p className="text-[8px] opacity-60 italic">Items sold are not returnable unless defective.</p>
                <div className="pt-2">
                  <p className="text-[8px]">Served by: {me?.name || 'Pharmacist'}</p>
                  <p className="text-[8px] opacity-60">AZZAY PHARMACY NEXUS</p>
                </div>
              </div>

              <div className="flex gap-3 pt-2 print:hidden">
                <button onClick={() => window.print()} className="flex-1 py-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-2" style={{ borderColor: c.border, color: c.text }}><Printer size={16} /> Print</button>
                <button onClick={() => { setShowReceipt(false); setCompletedSale(null); setSelectedCustomer(null); setPaymentMethod('Cash'); refetchProducts(); }} className="flex-[2] py-3 rounded-xl bg-primary text-white font-bold text-xs" style={{ background: c.primary }}>Next Sale</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.2); border-radius: 10px; }
        
        @media print {
          body * { visibility: hidden; }
          .print\:block, .print\:block * { visibility: visible; }
          .print\:hidden { display: none !important; }
          .fixed { position: absolute !important; top: 0 !important; left: 0 !important; margin: 0 !important; padding: 0 !important; }
          .backdrop-blur-xl { backdrop-filter: none !important; background: white !important; }
          @page { size: 80mm auto; margin: 0; }
        }
      `}</style>
    </div>
  );
}

export default function POSPage() {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setToken(s?.access_token ?? null));
    return () => subscription.unsubscribe();
  }, []);

  if (!token) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent animate-spin rounded-full" />
          <p className="text-emerald-500 font-display font-bold animate-pulse">Authenticating NEXUS...</p>
        </div>
      </div>
    );
  }

  return (
    <StoreProvider token={token}>
      <POSInner />
    </StoreProvider>
  );
}
