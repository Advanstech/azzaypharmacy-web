'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useStore } from '@/lib/store';
import {
  ArrowLeft, Package, DollarSign, TrendingUp, History,
  Truck, AlertCircle, CheckCircle, Clock, Calendar
} from 'lucide-react';
import { usePagination } from '@/hooks/use-pagination';

export default function ProductDetailedPaper() {
  const params = useParams();
  const router = useRouter();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  const productId = params?.id as string;
  const { products, suppliers, stockMovements } = useStore();

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
  };

  const product = products.find(p => p.id === productId);
  const supplier = product ? suppliers.find(s => s.id === product.supplierId) : null;
  const movements = stockMovements.filter(m => m.productId === productId);

  const {
    paginatedData: paginatedMovements,
    currentPage, totalPages, nextPage, prevPage, startIndex, endIndex, totalItems
  } = usePagination({ data: movements, itemsPerPage: 10 });

  if (!mounted) return null;

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
      </div>

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
                   <p className="text-sm font-bold" style={{ color: card.text }}>{supplier?.name || 'Direct / Unknown'}</p>
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
    </div>
  );
}
