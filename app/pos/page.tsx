'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { 
  Search, X, Plus, Minus, CreditCard, Smartphone, Banknote, Shield, 
  CheckCircle2, Printer, User, Package, Tag, LogOut,
  Monitor, LayoutGrid, LayoutList, Wifi, AlertCircle, ChevronLeft, ChevronRight,
  Receipt, Trash2, UserPlus, BarChart2, RefreshCw, FlaskConical,
  ArrowRight, BadgeCheck, Pill, Home, ShoppingCart, Store,
  BrainCircuit, Sparkles, Thermometer, Heart, MessageSquare, Globe
} from 'lucide-react';
import { useStore } from '@/lib/store';

import { gql, Q_SEARCH_PRODUCTS, M_ASK_NEXUS_AI } from '@/lib/gql';
import { TopResultPill } from '@/components/TopResultPill';
import { PharmaProductImage } from '@/components/PharmaProductImage';
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

type PaymentMethod = 'Cash' | 'MoMo' | 'Card' | 'NHIS' | 'SPLIT';

function POSInner() {
  const { theme, resolvedTheme } = useTheme();
  const router = useRouter();
  const { 
    products: liveProducts, 
    suppliers,
    sales, 
    customers,
    createSale, 
    createCustomer,
    me,
    loadingProducts,
    loadingCustomers,
    error: storeError,
    refetchProducts,
    refetchAll,
    syncStatus
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
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('pos_cart');
        if (saved) return JSON.parse(saved);
      } catch(e) {}
    }
    return [];
  });

  // Persist cart to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pos_cart', JSON.stringify(cart));
    }
  }, [cart]);

  const [activeCategory, setActiveCategory] = useState('All');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [tendered, setTendered] = useState('');
  const [splitCash, setSplitCash] = useState('');
  const [splitMomo, setSplitMomo] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const submissionLockRef = useRef(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', address: '' });
  const [showNumpad, setShowNumpad] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<any>(null);
  const [previewSupplier, setPreviewSupplier] = useState<string | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // Toggle layout mode
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  // Thermal Receipt Print Function
  const handlePrintReceipt = (sale: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Optimized for 80mm thermal printer with high-contrast black & white clarity
    const itemsHtml = sale.items.map((item: any) => {
      const itemName = item.product?.name || 'Unknown Item';
      const qty = item.quantity;
      const price = item.product?.sellingPrice?.toFixed(2) || item.unitPrice?.toFixed(2) || '0.00';
      const total = (item.product?.sellingPrice * item.quantity || item.total || (item.quantity * item.unitPrice)).toFixed(2);
      return `
        <tr>
          <td style="padding: 8px 4px; font-size: 12px; font-weight: 700; color: #000; line-height: 1.3;">${itemName}</td>
          <td style="text-align: center; padding: 8px 4px; font-size: 12px; font-weight: 600; width: 30px;">${qty}</td>
          <td style="text-align: right; padding: 8px 4px; font-size: 12px; font-weight: 600; width: 50px;">${price}</td>
          <td style="text-align: right; padding: 8px 4px; font-size: 12px; font-weight: 800; width: 55px;">${total}</td>
        </tr>
      `;
    }).join('');

    const discountRow = sale.discountAmt > 0 ? `
      <tr style="border-top: 2px solid #000;">
        <td colspan="3" style="padding: 6px 4px; font-size: 12px; font-weight: 700;">Discount:</td>
        <td style="text-align: right; padding: 6px 4px; font-size: 12px; font-weight: 800;">-${Number(sale.discountAmt).toFixed(2)}</td>
      </tr>
    ` : '';

    const taxRow = (sale.vat > 0 || sale.nhil > 0 || sale.getfund > 0) ? `
      <tr>
        <td colspan="3" style="padding: 4px 4px; font-size: 11px; font-weight: 600;">Taxes:</td>
        <td style="text-align: right; padding: 4px 4px; font-size: 11px; font-weight: 600;">${(Number(sale.vat || 0) + Number(sale.nhil || 0) + Number(sale.getfund || 0)).toFixed(2)}</td>
      </tr>
    ` : '';

    const isRefunded = sale.status === 'REFUNDED' || sale.isRefunded;

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${sale.receiptNo || sale.id.slice(-8).toUpperCase()}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Arial Black', 'Arial', 'Helvetica', sans-serif;
              width: 80mm;
              max-width: 80mm;
              padding: 5mm;
              font-size: 12px;
              line-height: 1.5;
              color: #000;
              background: #fff;
              -webkit-font-smoothing: none;
            }
            .center { text-align: center; }
            .bold { font-weight: 900; }
            .store-name {
              font-size: 20px;
              font-weight: 900;
              text-transform: uppercase;
              margin-bottom: 6px;
              letter-spacing: 2px;
              color: #000;
            }
            .store-info {
              font-size: 11px;
              font-weight: 700;
              margin-bottom: 3px;
              color: #000;
            }
            .divider {
              border-top: 3px solid #000;
              margin: 10px 0;
              height: 0;
            }
            .divider-dashed {
              border-top: 3px dashed #000;
              margin: 10px 0;
              height: 0;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              font-size: 12px;
              font-weight: 700;
              margin: 4px 0;
              color: #000;
            }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            thead th {
              font-size: 11px;
              font-weight: 900;
              text-align: left;
              padding: 8px 4px;
              border-bottom: 3px solid #000;
              color: #000;
              text-transform: uppercase;
            }
            thead th:nth-child(2) { text-align: center; }
            thead th:nth-child(3), thead th:nth-child(4) { text-align: right; }
            tbody td { vertical-align: top; border-bottom: 1px solid #000; }
            .totals-section {
              margin-top: 10px;
              border-top: 3px solid #000;
              padding-top: 8px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              font-size: 16px;
              font-weight: 900;
              padding: 8px 0;
              color: #000;
            }
            .payment-row {
              display: flex;
              justify-content: space-between;
              font-size: 12px;
              font-weight: 700;
              padding: 4px 0;
              color: #000;
            }
            .footer {
              text-align: center;
              font-size: 11px;
              font-weight: 700;
              margin-top: 12px;
              padding-top: 10px;
              border-top: 3px dashed #000;
              color: #000;
            }
            .footer p { margin: 4px 0; }
            .barcode {
              font-family: 'Courier New', monospace;
              font-size: 22px;
              font-weight: 900;
              text-align: center;
              margin: 10px 0;
              letter-spacing: 3px;
            }
            .refunded-badge {
              text-align: center;
              background: #000;
              color: #fff;
              font-size: 14px;
              font-weight: 900;
              padding: 6px 16px;
              margin: 10px 0;
              text-transform: uppercase;
            }
            @media print {
              body { width: 80mm; max-width: 80mm; padding: 4mm; }
              * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="store-name">AZZAY PHARMACY</div>
            <div class="store-info">${me?.branch?.name || 'Branch'}</div>
            <div class="store-info">${me?.branch?.location || 'Dormaa Central, Ghana'}</div>
            <div class="store-info">Tel: +233 54 335 8934</div>
          </div>

          <div class="divider"></div>

          <div class="info-row">
            <span>Receipt #:</span>
            <span>${sale.receiptNo || sale.id.slice(-8).toUpperCase()}</span>
          </div>
          <div class="info-row">
            <span>Date:</span>
            <span>${new Date(sale.createdAt || new Date()).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div class="info-row">
            <span>Cashier:</span>
            <span>${me?.name || 'Staff'}</span>
          </div>
          <div class="info-row">
            <span>Customer:</span>
            <span>${sale.customer?.name || selectedCustomer?.name || 'Walk-in'}</span>
          </div>

          <div class="divider"></div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals-section">
            ${discountRow}
            ${taxRow}
            <div class="total-row">
              <span>TOTAL:</span>
              <span>GH₵ ${sale.total?.toFixed(2) || sale.totalAmount?.toFixed(2) || '0.00'}</span>
            </div>
            <div class="payment-row">
              <span>Amount Paid:</span>
              <span>GH₵ ${(sale.amountPaid || sale.total || sale.totalAmount).toFixed(2)}</span>
            </div>
            <div class="payment-row">
              <span>Change:</span>
              <span>GH₵ ${sale.change?.toFixed(2) || '0.00'}</span>
            </div>
            <div class="payment-row" style="margin-top: 8px;">
              <span>Method:</span>
              <span>${paymentMethod}</span>
            </div>
          </div>

          ${isRefunded ? `
            <div class="divider"></div>
            <div class="refunded-badge">*** REFUNDED ***</div>
          ` : ''}

          <div class="divider-dashed"></div>

          <div class="footer">
            <p style="font-size: 13px;">Thank you for your patronage!</p>
            <p>Items sold are not returnable unless defective.</p>
            <p>Keep this receipt for returns within 48 hours.</p>
            <div class="barcode">${sale.receiptNo || sale.id.slice(-8)}</div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(() => {
                window.print();
                setTimeout(() => window.close(), 100);
              }, 200);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // AI Drug Intelligence State
  const [aiDrugTab, setAiDrugTab] = useState<'dosage' | 'safety' | 'counselling' | 'ghana'>('dosage');
  const [aiDrugData, setAiDrugData] = useState<any>(null);
  const [aiDrugLoading, setAiDrugLoading] = useState(false);
  const [aiDrugError, setAiDrugError] = useState<string | null>(null);

  // AI Drug Intelligence Fetch
  useEffect(() => {
    if (!previewProduct) {
      setAiDrugData(null);
      setAiDrugError(null);
      return;
    }

    const fetchAiDrugData = async () => {
      setAiDrugLoading(true);
      setAiDrugError(null);
      
      try {
        const prompt = `Generate a comprehensive clinical drug monograph for "${previewProduct.name}" (${previewProduct.genericName || 'N/A'}, ${previewProduct.dosageForm || 'Unknown dosage form'}). 

Return ONLY a valid JSON object with this exact structure:
{
  "indications": "Brief clinical indications and therapeutic uses",
  "dosage": {
    "adults": "Standard adult dosing regimen",
    "pediatric": "Pediatric dosing if applicable",
    "elderly": "Elderly considerations if any"
  },
  "safety": {
    "contraindications": "Major contraindications",
    "warnings": "Key warnings and precautions",
    "sideEffects": "Common and serious side effects",
    "interactions": "Major drug interactions"
  },
  "counselling": {
    "points": "Key patient counselling points",
    "storage": "Storage instructions",
    "administration": "How to take/administer"
  },
  "ghana": {
    "availability": "Availability status in Ghana",
    "regulatory": "Ghana FDA status if known",
    "nhis": "NHIS coverage status (yes/no/partial)",
    "localGuidelines": "Relevant Ghana Health Service guidelines"
  }
}

Provide clinically accurate information. If specific data is unknown, use "Consult standard references" as placeholder.`;

        const result = await gql<{ askNexusAi: string }>(M_ASK_NEXUS_AI, { prompt });
        const rawText = result.askNexusAi;
        
        // Extract JSON from response
        const jsonStart = rawText.indexOf('{');
        const jsonEnd = rawText.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const cleanedJson = rawText.slice(jsonStart, jsonEnd + 1);
          const parsed = JSON.parse(cleanedJson);
          setAiDrugData(parsed);
        } else {
          throw new Error('Invalid AI response format');
        }
      } catch (err: any) {
        console.error('Failed to fetch AI drug data:', err);
        setAiDrugError(err.message || 'Failed to load AI drug intelligence');
        // Set fallback data
        setAiDrugData({
          indications: 'Clinical indications data loading... Please check back in a moment.',
          dosage: { adults: 'Standard dosing information loading...', pediatric: '', elderly: '' },
          safety: { contraindications: '', warnings: '', sideEffects: '', interactions: '' },
          counselling: { points: '', storage: '', administration: '' },
          ghana: { availability: '', regulatory: '', nhis: '', localGuidelines: '' }
        });
      } finally {
        setAiDrugLoading(false);
      }
    };

    fetchAiDrugData();
  }, [previewProduct?.id]);

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
  const quickAmounts = useMemo(() => {
    // Always provide useful quick amounts based on total
    const baseAmount = total > 0 ? total : 0;
    const ceilTo = (step: number) => Math.ceil(baseAmount / step) * step;
    
    // Generate smart suggestions: exact + rounded up to common bill denominations
    const suggestions = [baseAmount];
    
    // Add rounded amounts based on common Ghana bill denominations (5, 10, 20, 50, 100, 200)
    [5, 10, 20, 50, 100].forEach(step => {
      const rounded = ceilTo(step);
      if (rounded > baseAmount && suggestions.length < 5) {
        suggestions.push(rounded);
      }
    });
    
    // If still no suggestions (empty cart), show common default amounts
    if (suggestions.length === 1 && baseAmount === 0) {
      return [0, 5, 10, 20, 50, 100];
    }
    
    return Array.from(new Set(suggestions)).sort((a, b) => a - b);
  }, [total]);

  const setTenderedAmount = (value: number) => {
    setTendered(value.toFixed(2));
  };

  const handleComplete = async () => {
    if (cart.length === 0 || submitting || submissionLockRef.current) return;
    
    // Set lock immediately to prevent race conditions
    submissionLockRef.current = true;
    setSubmitting(true);
    
    try {
      const sale = await createSale({
        items: cart.map(i => ({ product: i.product, quantity: i.quantity })),
        paymentMethod: paymentMethod === 'SPLIT' ? 'SPLIT' : paymentMethod.toUpperCase(),
        amountPaid: paymentMethod === 'Cash' ? tenderedNum || total : total,
        cashAmount: paymentMethod === 'SPLIT' ? (parseFloat(splitCash) || 0) : undefined,
        momoAmount: paymentMethod === 'SPLIT' ? (parseFloat(splitMomo) || 0) : undefined,
        customerId: selectedCustomer?.id,
        customerName: (!selectedCustomer || selectedCustomer.name === 'Walk-in Customer') 
          ? `Walk-in Customer (G-${Math.floor(1000 + Math.random() * 9000)})` 
          : selectedCustomer.name,
        customerPhone: selectedCustomer?.phone,
        customerEmail: selectedCustomer?.email,
      });
      
      // Check if sale was synced or is pending
      const isSynced = (sale as any)._isSynced ?? true;
      const syncStatus = (sale as any)._syncStatus ?? 'SYNCED';
      
      if (!isSynced) {
        console.warn('⚠️ Sale is OFFLINE - not sent to server yet');
        alert('⚠️ WARNING: Sale saved OFFLINE\n\nYour device is offline. Sale will sync when connection is restored.\n\nReceipt ID: ' + sale.id);
      }
      
      setCompletedSale({ 
        ...sale, 
        items: [...cart], 
        total, 
        change: Math.max(0, change),
        _isSynced: isSynced,
        _syncStatus: syncStatus
      });
      setShowReceipt(true);
      setCart([]);
      setTendered('');
    } catch (err: any) {
      console.error('❌ Sale creation failed:', err);
      alert(`❌ SALE FAILED\n\n${err?.message || 'Unknown error. Check your connection and try again.'}\n\nPlease try again or contact support.`);
    } finally {
      setSubmitting(false);
      // Release lock after a short delay to prevent rapid retries
      setTimeout(() => {
        submissionLockRef.current = false;
      }, 500);
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

  const formatCategory = (cat: string) => {
    if (cat === 'All') return cat;
    return cat.replace(/_/g, ' ')
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
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
            <div className="hidden sm:flex items-center text-sm font-semibold tracking-wide">
              <span>{me?.name || 'Azzay Pharmacy'}</span>
              <span className="mx-2 opacity-50">•</span>
              <span className="font-light truncate max-w-[100px]">{me?.position || me?.role || 'Cashier'}</span>
              <span className="mx-2 opacity-50">•</span>
              <span className="font-light truncate max-w-[120px]">{(me?.branch?.name || '').toLowerCase().includes('chemical') ? 'Chemical Shop' : 'Main Branch'}</span>
            </div>
          </div>

          <div className="hidden sm:block h-4 w-px bg-white/20 mx-2"></div>

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
            className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-full border border-white/30 hover:bg-white/10 transition-colors text-[10px] sm:text-xs font-medium"
          >
            <Wifi size={14} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{syncStatus === 'syncing' ? 'Syncing...' : 'Sync'}</span>
          </button>
          <div className="text-right flex flex-col items-end">
            <p className="font-mono font-bold text-xs sm:text-sm leading-none">{formatTime(now)}</p>
            <p className="hidden sm:block text-[10px] opacity-80 mt-0.5">{now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
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

          {/* Search Bar matching screenshot with View Switcher */}
          <div className="px-6 pt-4 pb-2 z-20 flex gap-3 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: c.muted }} size={20} />
              <input 
                type="text" 
                placeholder="Search products by name, brand, or category..." 
                className="w-full pl-12 pr-12 py-3 rounded-xl border focus:outline-none focus:border-[#059669] transition-colors text-sm"
                style={{ borderColor: c.border, background: isDark ? 'rgba(15,23,42,0.9)' : '#fff', color: c.text }}
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  if (activeCategory !== 'All' && e.target.value.trim() !== '') {
                    setActiveCategory('All');
                  }
                }}
                autoFocus
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: c.muted }}>
                  <X size={18} />
                </button>
              )}
            </div>
            {/* View Mode Toggle (Grid with Images vs List High Density) */}
            <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border" style={{ borderColor: c.border }}>
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
                title="Cards View (with Images)"
              >
                <LayoutGrid size={16} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
                title="List View (Compact)"
              >
                <LayoutList size={16} />
              </button>
            </div>
          </div>
          {searchResults.length > 0 && (
            <div className="px-6">
              <p className="text-xs font-medium" style={{ color: c.muted }}>
                {searchResults.length} products found
              </p>
            </div>
          )}

            {/* Categories Navigation - aligned with search */}
            <div className="flex items-stretch gap-2 overflow-hidden px-6">
              {/* Fixed All Button */}
              <button
                onClick={() => handleCategoryClick('All')}
                className={`flex-shrink-0 self-center h-9 px-4 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 border flex items-center gap-2 ${
                  activeCategory === 'All'
                    ? 'shadow-md'
                    : 'hover:border-primary/40'
                }`}
                style={{
                  background: activeCategory === 'All' ? c.primary : (isDark ? 'rgba(255,255,255,0.04)' : '#fff'),
                  borderColor: activeCategory === 'All' ? c.primary : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'),
                  color: activeCategory === 'All' ? '#fff' : c.muted
                }}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${activeCategory === 'All' ? 'bg-white' : 'bg-slate-400'}`} />
                All
              </button>

              {/* Scrollable Categories with Navigation */}
              <div className="flex-1 flex items-center gap-1 min-w-0">
                {/* Left Arrow */}
                <button
                  onClick={() => scrollCategories('left')}
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
                >
                  <ChevronLeft size={16} style={{ color: c.muted }} />
                </button>

                {/* Scrollable Pills Container */}
                <div
                  ref={categoryScrollRef}
                  className="flex-1 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {categories.filter(cat => cat !== 'All').map(cat => (
                    <button
                      key={cat}
                      data-category={cat}
                      onClick={() => handleCategoryClick(cat)}
                      className={`flex-shrink-0 h-9 px-3 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 border flex items-center gap-1.5 ${
                        activeCategory === cat
                          ? 'shadow-sm'
                          : 'hover:border-primary/30'
                      }`}
                      style={{
                        background: activeCategory === cat ? c.primary : (isDark ? 'rgba(255,255,255,0.04)' : '#fff'),
                        borderColor: activeCategory === cat ? c.primary : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'),
                        color: activeCategory === cat ? '#fff' : c.muted
                      }}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${activeCategory === cat ? 'bg-white' : 'bg-slate-400'}`} />
                      {formatCategory(cat)}
                    </button>
                  ))}
                </div>

                {/* Right Arrow */}
                <button
                  onClick={() => scrollCategories('right')}
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
                >
                  <ChevronRight size={16} style={{ color: c.muted }} />
                </button>
              </div>
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
              viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2 lg:gap-3 px-2 pb-24 lg:pb-4">
                  {filteredProducts.map(p => {
                    const supplier = p.supplier || suppliers.find(s => s.id === p.supplierId);
                    const inCart = cart.find(i => i.product.id === p.id);
                    return (
                      <button 
                        key={p.id} onClick={() => addToCart(p)}
                        disabled={p.stockQuantity === 0}
                        className="group text-left rounded-2xl border hover:border-[#059669] transition-all shadow-sm active:scale-[0.98] overflow-hidden relative"
                        style={{ 
                          background: isDark ? 'rgba(15,23,42,0.86)' : '#fff',
                          borderColor: inCart ? '#059669' : c.border,
                          opacity: p.stockQuantity === 0 ? 0.5 : 1
                        }}
                      >
                        <div className="flex w-full h-full p-2.5 gap-4 items-center">
                          {/* Left: Image Container */}
                          <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border bg-white dark:bg-slate-950" style={{ borderColor: c.border }}>
                            <PharmaProductImage
                              name={p.name}
                              dosageForm={p.dosageForm}
                              strength={p.strength}
                              imageUrl={p.imageUrl}
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
                              {supplier && (
                                <p className="text-[10px] truncate mt-0.5" style={{ color: c.muted }}>
                                  Supplier: <span className="font-bold text-[#059669]">{supplier.name}</span>
                                </p>
                              )}
                            </div>
                            
                            <div className="mt-2">
                              <p className="font-extrabold text-base text-[#059669]">GHc{p.sellingPrice.toFixed(2)}</p>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[#059669] font-bold text-[10px]">
                                <Store size={12} /> {p.stockQuantity}/{p.maxStock || p.stockQuantity}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Top right tag */}
                        <div className="absolute top-3 right-3">
                          <span className={`text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase ${p.requiresRx ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'}`}>
                            {p.requiresRx ? 'POM' : 'OTC'}
                          </span>
                        </div>

                        {/* Rightmost Add Button - Positioned absolute to match design */}
                        <div className="absolute bottom-3 right-3 flex flex-col items-end gap-1.5">
                          <div className="px-3 py-1.5 rounded-full bg-[#059669] text-white flex items-center gap-1 group-hover:bg-[#047857] transition-colors shadow-sm">
                            {inCart ? (
                              <span className="font-bold text-xs">{inCart.quantity}</span>
                            ) : (
                              <>
                                <Plus size={12} />
                                <span className="text-[10px] font-bold">ADD</span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* High-Density Compact List View without Images */
                <div className="flex flex-col gap-2 px-2 pb-24 lg:pb-4">
                  {filteredProducts.map(p => {
                    const supplier = p.supplier || suppliers.find(s => s.id === p.supplierId);
                    const inCart = cart.find(i => i.product.id === p.id);
                    return (
                      <button 
                        key={p.id} onClick={() => addToCart(p)}
                        disabled={p.stockQuantity === 0}
                        className="group text-left rounded-2xl border hover:border-[#059669] transition-all shadow-sm active:scale-[0.99] relative overflow-hidden flex items-center justify-between p-3"
                        style={{ 
                          background: isDark ? 'rgba(15,23,42,0.86)' : '#fff',
                          borderColor: inCart ? '#059669' : c.border,
                          opacity: p.stockQuantity === 0 ? 0.5 : 1
                        }}
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0 pr-24">
                          {/* Compact Badge and Code */}
                          <div className="flex flex-col items-start gap-1 flex-shrink-0">
                            <span className={`text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase whitespace-nowrap ${p.requiresRx ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'}`}>
                              {p.requiresRx ? 'POM' : 'OTC'}
                            </span>
                            <span className="text-[8px] font-mono opacity-50 uppercase tracking-widest">{p.id.slice(-6)}</span>
                          </div>

                          {/* Product info details */}
                          <div className="min-w-0">
                            <h3 className="font-black text-sm uppercase leading-tight hover:text-[#059669] truncate" style={{ color: c.text }}>
                              <span onClick={(e) => { e.stopPropagation(); setPreviewProduct(p); }} className="hover:underline cursor-pointer">{p.name}</span>
                            </h3>
                            <div className="flex items-center gap-2 text-[11px] mt-0.5 flex-wrap" style={{ color: c.muted }}>
                              <span>{p.genericName || p.brand || 'No brand'}</span>
                              <span>•</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {p.stockQuantity > 0 ? 'In stock' : 'Out of stock'}
                              </span>
                              {supplier && (
                                <>
                                  <span>•</span>
                                  <span>Supplier: <span className="font-bold text-[#059669]">{supplier.name}</span></span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right side alignment: Price, Stock, Add Button */}
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="text-right">
                            <p className="font-black text-sm text-[#059669]">GHc{p.sellingPrice.toFixed(2)}</p>
                            <p className="text-[10px] font-bold opacity-75" style={{ color: c.muted }}>
                              Qty: <span className="font-black text-emerald-600 dark:text-emerald-400">{p.stockQuantity}</span>
                            </p>
                          </div>
                          <div className="px-3 py-1.5 rounded-full bg-[#059669] text-white flex items-center gap-1 group-hover:bg-[#047857] transition-colors shadow-sm min-w-[54px] justify-center">
                            {inCart ? (
                              <span className="font-bold text-xs">{inCart.quantity}</span>
                            ) : (
                              <>
                                <Plus size={10} />
                                <span className="text-[9px] font-bold uppercase tracking-wider">ADD</span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>

        {/* Right: Cart & Preview Container */}
        {mobileCartOpen && (
          <div 
            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm transition-opacity"
            onClick={() => setMobileCartOpen(false)}
          />
        )}
        <div 
          className={`
            fixed inset-y-0 right-0 z-50 w-full sm:w-[380px] lg:relative lg:flex flex-col border-l transition-transform duration-300 shadow-2xl lg:shadow-none
            ${mobileCartOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
            xl:w-[420px] shrink-0 overflow-hidden
          `} 
          style={{ borderColor: c.border, background: c.card }}
        >
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: c.border }}>
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} style={{ color: c.text }} />
              <h2 className="font-bold text-sm" style={{ color: c.text }}>Current Sale</h2>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setCart([])} className="text-[10px] font-bold text-red-500 hover:underline">Clear Cart</button>
              <button onClick={() => setMobileCartOpen(false)} className="lg:hidden p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white">
                <X size={16} />
              </button>
            </div>
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
              <div className="bg-white border p-3 rounded-lg space-y-2" style={{ borderColor: c.border }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#059669]/10 flex items-center justify-center">
                      <User size={14} className="text-[#059669]" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{selectedCustomer.name}</p>
                      <p className="text-[10px] text-slate-500">{selectedCustomer.phone || 'No phone'}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedCustomer(null)} className="text-[10px] text-red-500 font-bold hover:underline">Change</button>
                </div>
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
                    <div className="flex-1 pr-2 flex flex-col">
                      <p className="text-xs font-bold leading-tight" style={{ color: c.text }}>{item.product.name}</p>
                      <p className="text-[10px] font-medium mt-0.5" style={{ color: c.muted }}>
                        {item.product.stockQuantity - item.quantity} in stock
                      </p>
                    </div>
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
                <span className="text-2xl font-display font-black" style={{ color: '#059669' }}>GH₵ {total.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {(['Cash', 'MoMo', 'Card', 'NHIS', 'SPLIT'] as PaymentMethod[]).map(m => (
                <button 
                  key={m} onClick={() => setPaymentMethod(m)}
                  className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${
                    paymentMethod === m 
                      ? 'text-white border-[#059669]' 
                      : 'bg-white text-slate-800 border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 opacity-60'
                  }`}
                  style={paymentMethod === m ? { background: '#059669', borderColor: '#059669' } : {}}
                >
                  {m}
                </button>
              ))}
            </div>

            {paymentMethod === 'Cash' && (
              <button
                onClick={() => {
                  if (!tendered || tenderedNum < total) setTenderedAmount(total);
                  setShowNumpad(true);
                }}
                className="w-full py-3 flex items-center justify-center gap-2 rounded-xl border-2 font-mono text-lg font-black transition-all hover:border-[#059669]/50"
                style={{ 
                  background: isDark ? '#0F172A' : '#F0FDF4', 
                  borderColor: tenderedNum >= total && total > 0 ? '#059669' : c.border, 
                  color: tenderedNum >= total && total > 0 ? '#059669' : c.text 
                }}
              >
                {tendered ? `GH₵ ${tendered}` : 'Tap to Enter Cash'}
              </button>
            )}

            {paymentMethod === 'SPLIT' && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Cash Amount</label>
                  <input type="number" value={splitCash} onChange={e => setSplitCash(e.target.value)} placeholder="0.00" className="w-full py-3 px-4 rounded-xl border font-mono text-sm focus:outline-none focus:border-[#059669]" style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC', borderColor: c.border, color: c.text }} />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">MoMo Amount</label>
                  <input type="number" value={splitMomo} onChange={e => setSplitMomo(e.target.value)} placeholder="0.00" className="w-full py-3 px-4 rounded-xl border font-mono text-sm focus:outline-none focus:border-[#059669]" style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC', borderColor: c.border, color: c.text }} />
                </div>
              </div>
            )}

            <button 
              onClick={handleComplete}
              disabled={cart.length === 0 || submitting || (paymentMethod === 'SPLIT' && (parseFloat(splitCash) || 0) + (parseFloat(splitMomo) || 0) !== total)}
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
                    <h2 className="font-display font-bold text-lg leading-tight mt-2 hover:text-emerald-400 transition-colors">
                      <Link href={`/dashboard/inventory/${previewProduct.id}`} className="hover:underline">
                        {previewProduct.name}
                      </Link>
                    </h2>
                  </div>
                  <button onClick={() => setPreviewProduct(null)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                  {/* AI Drug Intelligence Block */}
                  <div className="p-4 rounded-2xl border flex flex-col gap-3 relative overflow-hidden" style={{ background: 'rgba(0,217,255,0.05)', borderColor: 'rgba(0,217,255,0.2)' }}>
                    <div className="absolute top-0 right-0 p-4 opacity-5"><BrainCircuit size={100} /></div>
                    
                    {/* Header */}
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-2 text-[#00D9FF]">
                        <Sparkles size={16} />
                        <span className="text-xs font-bold uppercase tracking-widest">AI Drug Intelligence</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#00D9FF]/20 text-[#00D9FF]">Gemini</span>
                    </div>

                    {/* Product Image */}
                    <div className="relative z-10 w-full h-32 rounded-xl overflow-hidden mt-2 bg-slate-900 border border-white/10">
                      <PharmaProductImage
                        name={previewProduct.name}
                        dosageForm={previewProduct.dosageForm}
                        strength={previewProduct.strength}
                        imageUrl={previewProduct.imageUrl}
                        className="w-full h-full object-cover opacity-80"
                      />
                    </div>

                    {/* Indications (Always visible) */}
                    <div className="relative z-10">
                      <p className="font-bold text-[#00D9FF] mb-1 text-[10px] uppercase">Indications</p>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {aiDrugLoading ? (
                          <span className="flex items-center gap-2">
                            <RefreshCw size={12} className="animate-spin" />
                            Analyzing drug data...
                          </span>
                        ) : aiDrugData?.indications || 'Clinical indications loading...'}
                      </p>
                    </div>

                    {/* Tabs Navigation */}
                    <div className="flex gap-1 relative z-10 mt-2">
                      {[
                        { id: 'dosage', label: 'Dosage', icon: Thermometer },
                        { id: 'safety', label: 'Safety', icon: Heart },
                        { id: 'counselling', label: 'Counselling', icon: MessageSquare },
                        { id: 'ghana', label: 'Ghana', icon: Globe },
                      ].map((tab) => {
                        const isActive = aiDrugTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setAiDrugTab(tab.id as any)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-[10px] font-bold transition-all ${
                              isActive 
                                ? 'bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/30' 
                                : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                            }`}
                          >
                            <tab.icon size={12} />
                            <span className="hidden sm:inline">{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Tab Content */}
                    <div className="relative z-10 min-h-[180px]">
                      {aiDrugLoading ? (
                        <div className="h-full flex flex-col items-center justify-center py-8 text-slate-500">
                          <RefreshCw size={24} className="animate-spin mb-2 text-[#00D9FF]" />
                          <p className="text-xs">Compiling clinical data...</p>
                        </div>
                      ) : aiDrugError ? (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                          <p className="font-bold mb-1">Error loading drug data</p>
                          <p>{aiDrugError}</p>
                        </div>
                      ) : (
                        <>
                          {/* Dosage Tab */}
                          {aiDrugTab === 'dosage' && (
                            <div className="space-y-3 text-xs">
                              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                <p className="font-bold text-[#00D9FF] mb-1 text-[10px] uppercase">Adults</p>
                                <p className="text-slate-300 leading-relaxed">{aiDrugData?.dosage?.adults || 'Standard adult dosing information loading...'}</p>
                              </div>
                              {aiDrugData?.dosage?.pediatric && (
                                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                  <p className="font-bold text-emerald-400 mb-1 text-[10px] uppercase">Pediatric</p>
                                  <p className="text-slate-300 leading-relaxed">{aiDrugData.dosage.pediatric}</p>
                                </div>
                              )}
                              {aiDrugData?.dosage?.elderly && (
                                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                  <p className="font-bold text-amber-400 mb-1 text-[10px] uppercase">Elderly</p>
                                  <p className="text-slate-300 leading-relaxed">{aiDrugData.dosage.elderly}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Safety Tab */}
                          {aiDrugTab === 'safety' && (
                            <div className="space-y-3 text-xs">
                              {aiDrugData?.safety?.contraindications && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                  <p className="font-bold text-red-400 mb-1 text-[10px] uppercase">Contraindications</p>
                                  <p className="text-slate-300 leading-relaxed">{aiDrugData.safety.contraindications}</p>
                                </div>
                              )}
                              {aiDrugData?.safety?.warnings && (
                                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                  <p className="font-bold text-amber-400 mb-1 text-[10px] uppercase">Warnings</p>
                                  <p className="text-slate-300 leading-relaxed">{aiDrugData.safety.warnings}</p>
                                </div>
                              )}
                              {aiDrugData?.safety?.sideEffects && (
                                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                  <p className="font-bold text-slate-400 mb-1 text-[10px] uppercase">Side Effects</p>
                                  <p className="text-slate-300 leading-relaxed">{aiDrugData.safety.sideEffects}</p>
                                </div>
                              )}
                              {aiDrugData?.safety?.interactions && (
                                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                  <p className="font-bold text-purple-400 mb-1 text-[10px] uppercase">Drug Interactions</p>
                                  <p className="text-slate-300 leading-relaxed">{aiDrugData.safety.interactions}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Counselling Tab */}
                          {aiDrugTab === 'counselling' && (
                            <div className="space-y-3 text-xs">
                              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                <p className="font-bold text-emerald-400 mb-1 text-[10px] uppercase flex items-center gap-1">
                                  <MessageSquare size={10} /> Patient Counselling
                                </p>
                                <p className="text-slate-300 leading-relaxed">{aiDrugData?.counselling?.points || 'Counselling points loading...'}</p>
                              </div>
                              {aiDrugData?.counselling?.administration && (
                                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                  <p className="font-bold text-[#00D9FF] mb-1 text-[10px] uppercase">Administration</p>
                                  <p className="text-slate-300 leading-relaxed">{aiDrugData.counselling.administration}</p>
                                </div>
                              )}
                              {aiDrugData?.counselling?.storage && (
                                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                  <p className="font-bold text-slate-400 mb-1 text-[10px] uppercase">Storage</p>
                                  <p className="text-slate-300 leading-relaxed">{aiDrugData.counselling.storage}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Ghana Tab */}
                          {aiDrugTab === 'ghana' && (
                            <div className="space-y-3 text-xs">
                              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                <p className="font-bold text-yellow-400 mb-1 text-[10px] uppercase flex items-center gap-1">
                                  <Globe size={10} /> Ghana Availability
                                </p>
                                <p className="text-slate-300 leading-relaxed">{aiDrugData?.ghana?.availability || 'Availability information loading...'}</p>
                              </div>
                              {aiDrugData?.ghana?.regulatory && (
                                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                  <p className="font-bold text-slate-400 mb-1 text-[10px] uppercase">Ghana FDA Status</p>
                                  <p className="text-slate-300 leading-relaxed">{aiDrugData.ghana.regulatory}</p>
                                </div>
                              )}
                              {aiDrugData?.ghana?.nhis && (
                                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                  <p className="font-bold text-emerald-400 mb-1 text-[10px] uppercase">NHIS Coverage</p>
                                  <p className="text-slate-300 leading-relaxed">{aiDrugData.ghana.nhis}</p>
                                </div>
                              )}
                              {aiDrugData?.ghana?.localGuidelines && (
                                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                  <p className="font-bold text-slate-400 mb-1 text-[10px] uppercase">Ghana Health Service Guidelines</p>
                                  <p className="text-slate-300 leading-relaxed">{aiDrugData.ghana.localGuidelines}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
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
                       {previewProduct.supplierId ? (
                         <Link 
                           href={`/dashboard/suppliers/${previewProduct.supplierId}`}
                           className="text-sm font-bold text-white hover:text-emerald-400 hover:underline transition-colors"
                         >
                           {suppliers.find(s => s.id === previewProduct.supplierId)?.name || 'Unknown Supplier'}
                         </Link>
                       ) : (
                         <p className="text-sm font-bold text-white">{previewProduct.brand || 'Unknown Supplier'}</p>
                       )}
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

        {/* Mobile FAB */}
        <button
          onClick={() => setMobileCartOpen(true)}
          className="lg:hidden fixed bottom-6 right-6 z-30 p-4 rounded-full bg-[#059669] text-white shadow-xl flex items-center justify-center gap-3 hover:scale-105 transition-transform"
        >
          <div className="relative">
            <ShoppingCart size={24} />
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-[#059669]">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </div>
          <span className="font-bold font-mono">GH₵ {total.toFixed(2)}</span>
        </button>
      </main>

      {/* Customer Search/Create Modal */}
      {showCustomerSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl bg-black/60">
          <div className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300" style={{ background: isDark ? '#0F172A' : '#fff' }}>
            {!showCreateCustomer ? (
              // Search/Select View
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
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border-2 focus:outline-none"
                    style={{ background: isDark ? '#0A0F1E' : '#F8FAFC', borderColor: c.border, color: c.text }}
                  />
                </div>
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => { setSelectedCustomer({ name: 'Walk-in Customer', phone: '', id: null }); setShowCustomerSearch(false); }}
                    className="flex-1 py-3 rounded-xl border-2 border-dashed font-bold text-xs"
                    style={{ borderColor: c.border, color: c.muted }}
                  >
                    Walk-in Customer
                  </button>
                  <button
                    onClick={() => setShowCreateCustomer(true)}
                    className="flex-1 py-3 rounded-xl bg-[#059669] text-white font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <UserPlus size={14} /> New Customer
                  </button>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                  {loadingCustomers ? (
                    <div className="text-center py-8" style={{ color: c.muted }}>Loading customers...</div>
                  ) : customers.filter(c => 
                      c.name?.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                      c.phone?.includes(customerSearchQuery)
                    ).length === 0 ? (
                    <div className="text-center py-8" style={{ color: c.muted }}>
                      No customers found. Create a new one!
                    </div>
                  ) : customers.filter(c => 
                      c.name?.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                      c.phone?.includes(customerSearchQuery)
                    ).map(customer => (
                    <button
                      key={customer.id}
                      onClick={() => { setSelectedCustomer(customer); setShowCustomerSearch(false); setCustomerSearchQuery(''); }}
                      className="w-full p-3 rounded-xl border flex items-start gap-3 transition-all hover:border-primary/30 text-left"
                      style={{ borderColor: c.border, background: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC' }}
                    >
                      <div className="w-10 h-10 rounded-full bg-[#059669]/10 flex items-center justify-center flex-shrink-0">
                        <User size={18} className="text-[#059669]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: c.text }}>{customer.name}</p>
                        <p className="text-[10px]" style={{ color: c.muted }}>{customer.phone || 'No phone'}</p>
                      </div>
                      {(customer.totalSpent || 0) > 0 && (
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-[#059669]">GH¢{(customer.totalSpent || 0).toFixed(0)}</p>
                          <p className="text-[9px]" style={{ color: c.muted }}>{customer.loyaltyPoints || 0} pts</p>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // Create Customer View
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-bold text-lg" style={{ color: c.text }}>New Customer</h3>
                  <button onClick={() => setShowCreateCustomer(false)}><X size={20} style={{ color: c.muted }} /></button>
                </div>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar pr-1">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider ml-1 mb-1 block" style={{ color: c.muted }}>Full Name *</label>
                    <input
                      type="text"
                      placeholder="Enter customer name"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#059669]"
                      style={{ background: isDark ? '#0A0F1E' : '#F8FAFC', borderColor: c.border, color: c.text }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider ml-1 mb-1 block" style={{ color: c.muted }}>Phone</label>
                      <input
                        type="tel"
                        placeholder="024..."
                        value={newCustomer.phone}
                        onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#059669]"
                        style={{ background: isDark ? '#0A0F1E' : '#F8FAFC', borderColor: c.border, color: c.text }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider ml-1 mb-1 block" style={{ color: c.muted }}>Email</label>
                      <input
                        type="email"
                        placeholder="optional"
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#059669]"
                        style={{ background: isDark ? '#0A0F1E' : '#F8FAFC', borderColor: c.border, color: c.text }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider ml-1 mb-1 block" style={{ color: c.muted }}>Address</label>
                    <input
                      type="text"
                      placeholder="Customer address (optional)"
                      value={newCustomer.address}
                      onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#059669]"
                      style={{ background: isDark ? '#0A0F1E' : '#F8FAFC', borderColor: c.border, color: c.text }}
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6 pt-4 border-t" style={{ borderColor: c.border }}>
                  <button
                    onClick={() => setShowCreateCustomer(false)}
                    className="flex-1 py-3 rounded-xl border-2 font-bold text-sm"
                    style={{ borderColor: c.border, color: c.muted }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!newCustomer.name.trim()) {
                        alert('Please enter customer name');
                        return;
                      }
                      try {
                        const customer = await createCustomer({
                          name: newCustomer.name,
                          phone: newCustomer.phone,
                          email: newCustomer.email,
                          address: newCustomer.address
                        });
                        setSelectedCustomer(customer);
                        setNewCustomer({ name: '', phone: '', email: '', address: '' });
                        setShowCreateCustomer(false);
                        setShowCustomerSearch(false);
                        setCustomerSearchQuery('');
                      } catch (err: any) {
                        alert(`Failed to create customer: ${err?.message || 'Unknown error'}`);
                      }
                    }}
                    disabled={!newCustomer.name.trim()}
                    className="flex-[2] py-3 rounded-xl bg-[#059669] text-white font-bold text-sm disabled:opacity-50"
                  >
                    Create & Select Customer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cash Payment Modal */}
      {showNumpad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl bg-black/60">
          <div className="w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border" style={{ background: isDark ? '#0F172A' : '#F8FAFC', borderColor: c.border }}>
            <div className="p-6 border-b" style={{ borderColor: c.border }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: c.muted }}>Cash Payment</p>
                  <p className="font-mono text-4xl font-bold mt-1" style={{ color: c.text }}>GH₵ {total.toFixed(2)}</p>
                </div>
                <button
                  onClick={() => setShowNumpad(false)}
                  className="px-4 py-2 rounded-2xl border text-sm font-semibold transition-colors"
                  style={{ borderColor: c.border, color: c.muted }}
                >
                  Cancel
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: c.muted }}>Cash Received</p>
                <div className="rounded-3xl px-6 py-5 border-2" style={{ background: isDark ? '#111827' : '#FFFFFF', borderColor: change >= 0 ? '#16A34A' : c.border }}>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-4xl font-bold" style={{ color: c.muted }}>GH₵</span>
                    <input
                      value={tendered}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/[^\d.]/g, '');
                        const normalized = cleaned.split('.').length > 2
                          ? `${cleaned.split('.')[0]}.${cleaned.split('.').slice(1).join('')}`
                          : cleaned;
                        setTendered(normalized);
                      }}
                      placeholder={total.toFixed(2)}
                      inputMode="decimal"
                      className="w-full bg-transparent border-0 outline-none font-mono text-5xl font-bold"
                      style={{ color: c.text }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: c.muted }}>Quick Amounts</p>
                <div className="flex flex-wrap gap-2">
                  {quickAmounts.map((amt, index) => {
                    const isExact = index === 0;
                    const isActive = Math.abs(tenderedNum - amt) < 0.0001;
                    return (
                      <button
                        key={amt}
                        onClick={() => setTenderedAmount(amt)}
                        className="px-5 py-2.5 rounded-2xl text-sm font-bold border transition-all"
                        style={{
                          background: isActive ? (isDark ? 'rgba(22,163,74,0.22)' : 'rgba(22,163,74,0.12)') : (isDark ? 'rgba(255,255,255,0.04)' : '#fff'),
                          borderColor: isActive ? '#16A34A' : c.border,
                          color: isActive ? '#16A34A' : c.text,
                        }}
                      >
                        {isExact ? '✓ Exact' : `GH₵ ${amt.toFixed(0)}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl border px-6 py-5" style={{ background: isDark ? 'rgba(22,163,74,0.10)' : 'rgba(22,163,74,0.08)', borderColor: change >= 0 ? 'rgba(22,163,74,0.45)' : c.border }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: change >= 0 ? '#16A34A' : c.muted }}>
                      Change To Give Customer
                    </p>
                    <p className="font-mono text-5xl font-bold" style={{ color: change >= 0 ? '#16A34A' : c.muted }}>
                      GH₵ {change >= 0 ? change.toFixed(2) : '0.00'}
                    </p>
                  </div>
                  {change >= 0 && (
                    <span className="px-4 py-2 rounded-full text-sm font-bold" style={{ background: isDark ? 'rgba(22,163,74,0.22)' : 'rgba(22,163,74,0.14)', color: '#16A34A' }}>
                      ✓ Ready
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => setShowNumpad(false)}
                disabled={tenderedNum < total}
                className="w-full mt-2 py-4 rounded-2xl text-white font-bold text-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: isDark ? '#065F46' : '#047857' }}
              >
                Confirm Cash · GH₵ {tenderedNum.toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl bg-black/60 print:absolute print:inset-0 print:block print:p-0 print:bg-white print:backdrop-blur-none print:h-auto print:min-h-full">
          <div id="receipt-print-area" className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 print:shadow-none print:max-w-none print:w-[80mm] print:rounded-none print:overflow-visible print:h-auto print:static" 
            style={{ background: isDark ? '#0F172A' : '#fff' }}>
            
            {/* Print Only Header (Logo) */}
            <div className="hidden print:block text-center pt-4 pb-2">
              <h1 className="text-[24px] font-black tracking-wide">AZZAY PHARMACY</h1>
              <p className="text-[14px] font-bold">Quality Health, Quality Life</p>
              <div className="w-full border-t-2 border-black mt-2"></div>
            </div>

            <div className="p-6 text-center print:p-3 print:pb-2" style={{ background: c.header }}>
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center font-display font-bold text-xl mx-auto mb-3 border border-white/30 text-white print:hidden">A</div>
              <h2 className="font-display font-bold text-white print:text-black print:text-[18px] print:font-black">Azzay Pharma NEXUS</h2>
              <p className="text-[10px] text-white/70 print:text-black print:text-[12px] print:font-bold">Clinical Receipt · {new Date().toLocaleString()}</p>
              
              {/* Sync Status Badge */}
              {(completedSale as any)._isSynced === false && (
                <div className="mt-3 px-3 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/50 text-[10px] font-bold text-yellow-200 print:hidden">
                  ⚠️ OFFLINE - Will sync when online
                </div>
              )}
              {(completedSale as any)._isSynced && (
                <div className="mt-3 px-3 py-2 rounded-lg bg-green-500/20 border border-green-500/50 text-[10px] font-bold text-green-200 print:hidden">
                  ✓ SYNCED TO SERVER
                </div>
              )}
            </div>

            <div className="p-6 space-y-4 print:p-3 print:space-y-3">
              <div className="grid grid-cols-2 gap-2 text-[10px] print:text-[12px] print:font-bold print:text-black" style={{ color: c.muted }}>
                <div><span className="opacity-60 print:opacity-100">Date:</span> {new Date().toLocaleDateString()}</div>
                <div><span className="opacity-60 print:opacity-100">Time:</span> {new Date().toLocaleTimeString()}</div>
                <div><span className="opacity-60 print:opacity-100">Branch:</span> Dormaa Central</div>
                <div><span className="opacity-60 print:opacity-100">Cashier:</span> {me?.name || 'Pharmacist'}</div>
              </div>

              {selectedCustomer && selectedCustomer.id && (
                <div className="p-3 rounded-xl border text-[10px] print:p-2 print:border-2 print:border-black" style={{ background: isDark ? 'rgba(0,217,255,0.05)' : 'rgba(14,165,233,0.05)', borderColor: c.border }}>
                  <div className="flex items-center gap-2 mb-1">
                    <User size={12} className="text-[#00D9FF] print:hidden" />
                    <span className="font-bold print:text-black print:text-[13px]">{selectedCustomer.name}</span>
                    {selectedCustomer.phone && <span className="opacity-60 print:opacity-100 print:text-black">| {selectedCustomer.phone}</span>}
                  </div>
                </div>
              )}

              <div className="space-y-2 max-h-56 overflow-y-auto pr-2 custom-scrollbar print:max-h-none print:overflow-visible print:h-auto print:block">
                {completedSale.items.map((item: any) => (
                  <div key={item.product.id} className="flex justify-between text-xs print:text-[15px] print:font-black print:leading-tight border-b border-dashed print:border-black print:border-b-2 pb-2 print:pb-3">
                    <div className="flex-1 pr-2">
                      <p className="font-bold print:font-black print:text-black break-words" style={{ color: c.text }}>{item.product.name}</p>
                      <p className="text-[9px] print:text-[13px] print:font-bold print:text-black print:opacity-100 opacity-60 mt-0.5">Qty: {item.quantity} @ GH₵ {item.product.sellingPrice.toFixed(2)}</p>
                    </div>
                    <span className="font-mono font-bold print:font-black print:text-[18px] print:text-black ml-2 self-center">GH₵ {(item.product.sellingPrice * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t space-y-2 print:pt-4 print:border-black print:border-t-2">
                <div className="flex justify-between text-xs print:text-[14px] print:font-bold print:text-black print:opacity-100 opacity-60">
                  <span>Subtotal</span>
                  <span className="font-mono">GH₵ {completedSale.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-base print:text-[22px] print:font-black print:border-y-2 print:border-black print:py-3">
                  <span className="print:text-black">Grand Total</span>
                  <span className="text-primary font-mono print:text-black">GH₵ {completedSale.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[10px] print:text-[14px] print:font-bold print:text-black opacity-60">
                  <span>Method</span>
                  <span className="font-bold">{paymentMethod}</span>
                </div>
                {paymentMethod === 'Cash' && (
                  <>
                    <div className="flex justify-between text-xs print:text-[14px] print:font-bold print:text-black opacity-60">
                      <span>Tendered</span>
                      <span className="font-mono">GH₵ {tenderedNum.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs print:text-[16px] print:font-black text-green-500 print:text-black">
                      <span>Change Due</span>
                      <span className="font-mono">GH₵ {completedSale.change.toFixed(2)}</span>
                    </div>
                  </>
                )}
                {paymentMethod === 'SPLIT' && completedSale && (
                  <>
                    <div className="flex justify-between text-[10px] opacity-60">
                      <span>Cash Paid</span>
                      <span className="font-mono">GH₵ {completedSale.cashAmount?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between text-[10px] opacity-60">
                      <span>MoMo Paid</span>
                      <span className="font-mono">GH₵ {completedSale.momoAmount?.toFixed(2) || '0.00'}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Barcode Line */}
              <div className="pt-4 text-center print:pt-3">
                <div className="h-10 bg-black dark:bg-white mx-auto" style={{ 
                  background: `repeating-linear-gradient(90deg, ${isDark ? '#fff' : '#000'} 0px, ${isDark ? '#fff' : '#000'} 2px, transparent 2px, transparent 3px, ${isDark ? '#fff' : '#000'} 4px, ${isDark ? '#fff' : '#000'} 5px, transparent 5px, transparent 7px)`,
                  width: '85%'
                }}></div>
                <p className="text-[10px] font-mono mt-2 font-bold opacity-60 print:text-black print:text-[12px]">{completedSale.id}</p>
              </div>

              {/* Receipt Footer for Print */}
              <div className="hidden print:block text-center pt-4 space-y-2 pb-4">
                <div className="w-full border-t-2 border-black"></div>
                <p className="text-[14px] font-black">Thank you for your visit!</p>
                <p className="text-[11px] font-bold italic">Items sold are not returnable unless defective.</p>
                <div className="pt-2 space-y-1">
                  <p className="text-[12px] font-bold">Served by: {me?.name || 'Pharmacist'}</p>
                  <p className="text-[11px] font-bold">AZZAY PHARMACY NEXUS</p>
                  <p className="text-[10px]">Dormaa Central, Ghana</p>
                </div>
              </div>

              <div className="flex gap-3 pt-2 print:hidden">
                <button onClick={() => handlePrintReceipt(completedSale)} className="flex-1 py-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-2" style={{ borderColor: c.border, color: c.text }}><Printer size={16} /> Print</button>
                <button onClick={() => { setShowReceipt(false); setCompletedSale(null); setSelectedCustomer(null); setPaymentMethod('Cash'); setSplitCash(''); setSplitMomo(''); refetchProducts(); }} className="flex-[2] py-3 rounded-xl bg-primary text-white font-bold text-xs" style={{ background: c.primary }}>Next Sale</button>
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
          /* Hide all page content by default */
          body * {
            visibility: hidden !important;
          }
          
          /* Only make our custom receipt print area container and its descendants visible */
          #receipt-print-area, #receipt-print-area * {
            visibility: visible !important;
          }
          
          /* Fit the print area perfectly to the thermal paper width */
          #receipt-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 !important;
            padding: 4px !important;
            background: #fff !important;
            color: #000 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            transform: none !important;
            animation: none !important;
          }
          
          /* Thermal color and background overrides to eliminate standard ink blockages */
          #receipt-print-area * {
            background: transparent !important;
            color: #000 !important;
            opacity: 1 !important;
            text-shadow: none !important;
            box-shadow: none !important;
            height: auto !important;
            overflow: visible !important;
          }
          
          /* Extra robust overrides for fixed positioning */
          .fixed, .absolute {
            position: relative !important;
            transform: none !important;
          }
          
          /* Thermal print typography scaling and line spacing - International Pharmacy Standards */
          #receipt-print-area h1 {
            font-size: 24px !important;
            font-weight: 900 !important;
            line-height: 1.2 !important;
            margin-bottom: 2px !important;
            letter-spacing: 0.5px !important;
          }
          #receipt-print-area h2 {
            font-size: 18px !important;
            font-weight: 900 !important;
            line-height: 1.2 !important;
            margin-bottom: 2px !important;
          }
          #receipt-print-area p, 
          #receipt-print-area span, 
          #receipt-print-area div {
            font-size: 12px !important;
            font-weight: 700 !important;
            line-height: 1.4 !important;
          }
          #receipt-print-area .font-bold {
            font-weight: 900 !important;
          }
          #receipt-print-area .font-black {
            font-weight: 900 !important;
          }
          
          /* Keep items list simple and clear with high contrast dashed lines */
          #receipt-print-area .border-b,
          #receipt-print-area .border-t,
          #receipt-print-area .border-dashed {
            border-color: #000 !important;
            border-style: dashed !important;
            border-width: 2px !important;
            border-top-width: 2px !important;
            border-bottom-width: 2px !important;
          }
          
          /* Hide non-printable screen items */
          .print\:hidden {
            display: none !important;
          }
          
          /* Configure thermal page size boundaries */
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default function POSPage() {
  return <POSInner />;
}
