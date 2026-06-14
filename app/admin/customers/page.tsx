'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { 
  Search, Edit, UserPlus, Phone, Mail, Award, 
  CheckCircle, Loader2, CreditCard, X, ShoppingBag,
  Calendar, TrendingUp, Clock, ChevronRight, ArrowLeft,
  MapPin, BarChart3, Receipt
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { usePagination } from '@/hooks/use-pagination';
import { motion, AnimatePresence } from 'framer-motion';

export default function CustomersAdminPage() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { customers, sales, createCustomer, updateCustomer } = useStore();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const card = {
    bg: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)',
    border: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.5)',
    shadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    primary: '#14B8A6',
    primaryBg: 'rgba(20, 184, 166, 0.1)',
    inputBg: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC',
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) ||
             (c.phone && c.phone.toLowerCase().includes(q)) ||
             (c.email && c.email.toLowerCase().includes(q));
    });
  }, [customers, search]);

  const {
    currentPage, totalPages, paginatedData,
    nextPage, prevPage, startIndex, endIndex, totalItems
  } = usePagination({ data: filteredCustomers, itemsPerPage: 10 });

  const metrics = useMemo(() => {
    const totalSpent = customers.reduce((acc, c) => acc + (c.totalSpent || 0), 0);
    const totalPoints = customers.reduce((acc, c) => acc + (c.loyaltyPoints || 0), 0);
    const avgSpent = customers.length ? totalSpent / customers.length : 0;
    return { total: customers.length, totalSpent, totalPoints, avgSpent };
  }, [customers]);

  // Build per-customer sales history from sales store (match by phone or name)
  const customerSalesMap = useMemo(() => {
    const map: Record<string, typeof sales> = {};
    for (const c of customers) {
      map[c.id] = sales.filter(s =>
        (c.phone && s.customerPhone && s.customerPhone === c.phone) ||
        (c.name && s.customerName && s.customerName.toLowerCase() === c.name.toLowerCase())
      );
    }
    return map;
  }, [customers, sales]);

  const getCustomerStats = (c: any) => {
    const history = customerSalesMap[c.id] || [];
    const totalFromSales = history.reduce((acc, s) => acc + s.totalAmount, 0);
    const lastSale = history.length ? history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] : null;
    return {
      visits: history.length,
      totalSpent: totalFromSales || c.totalSpent || 0,
      lastPurchase: lastSale?.createdAt || null,
      history: history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 20),
    };
  };

  const fmt = (v: number) => `GH₵ ${v.toFixed(2)}`;

  const handleOpenModal = (customer?: any) => {
    setError(null);
    if (customer) {
      setEditingCustomer(customer);
      setName(customer.name || '');
      setEmail(customer.email || '');
      setPhone(customer.phone || '');
      setAddress(customer.address || '');
    } else {
      setEditingCustomer(null);
      setName('');
      setEmail('');
      setPhone('');
      setAddress('');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (editingCustomer) {
        await updateCustomer({ ...editingCustomer, name, email, phone, address });
      } else {
        await createCustomer({ name, email, phone, address });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1" style={{ color: card.text }}>Customer Relations</h1>
          <p className="text-sm" style={{ color: card.muted }}>Manage loyalty members and track customer value</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all hover:scale-105" 
          style={{ background: card.primary }}
        >
          <UserPlus size={16} />
          Add Customer
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Customers', value: metrics.total, icon: UserPlus, color: '#14B8A6' },
          { label: 'Total Value', value: `GH₵ ${metrics.totalSpent.toFixed(2)}`, icon: CreditCard, color: '#3B82F6' },
          { label: 'Avg Customer Value', value: `GH₵ ${metrics.avgSpent.toFixed(2)}`, icon: Award, color: '#8B5CF6' },
          { label: 'Total Loyalty Points', value: metrics.totalPoints.toLocaleString(), icon: Award, color: '#F59E0B' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="rounded-2xl border p-4 backdrop-blur-xl" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg" style={{ background: `${s.color}18`, color: s.color }}>
                  <Icon size={16} />
                </div>
              </div>
              <p className="font-display text-xl font-bold mb-0.5" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs" style={{ color: card.muted }}>{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border overflow-hidden backdrop-blur-xl" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4 justify-between" style={{ borderColor: card.border }}>
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: card.muted }} />
            <input 
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search customers..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-1 transition-all"
              style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                <th className="p-4 text-xs font-bold uppercase tracking-wider" style={{ color: card.muted }}>Customer</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider" style={{ color: card.muted }}>Contact</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider" style={{ color: card.muted }}>Total Spent</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider" style={{ color: card.muted }}>Visits</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider" style={{ color: card.muted }}>Last Purchase</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-right" style={{ color: card.muted }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm" style={{ color: card.muted }}>No customers found</td>
                </tr>
              ) : paginatedData.map((c) => {
                const stats = getCustomerStats(c);
                return (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer" style={{ borderColor: card.border }} onClick={() => setSelectedCustomer(c)}>
                    <td className="p-4">
                      <div className="font-bold text-sm" style={{ color: card.text }}>{c.name}</div>
                      <div className="text-[10px] uppercase font-bold mt-1 inline-block px-2 py-0.5 rounded-full" style={{ background: card.primaryBg, color: card.primary }}>
                        {c.loyaltyPoints && c.loyaltyPoints > 500 ? 'VIP' : 'Member'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        {c.phone && <div className="flex items-center gap-1.5 text-xs"><Phone size={12} style={{ color: card.muted }}/> <span style={{ color: card.text }}>{c.phone}</span></div>}
                        {c.email && <div className="flex items-center gap-1.5 text-xs"><Mail size={12} style={{ color: card.muted }}/> <span style={{ color: card.text }}>{c.email}</span></div>}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-sm" style={{ color: '#10B981' }}>{fmt(stats.totalSpent)}</div>
                      <div className="text-xs flex items-center gap-1 mt-0.5" style={{ color: '#F59E0B' }}>
                        <Award size={12} /> {c.loyaltyPoints || 0} pts
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.12)' }}>
                          <ShoppingBag size={13} style={{ color: '#6366F1' }} />
                        </div>
                        <span className="font-bold text-sm" style={{ color: card.text }}>{stats.visits}</span>
                      </div>
                    </td>
                    <td className="p-4 text-xs" style={{ color: card.muted }}>
                      {stats.lastPurchase ? (
                        <div>
                          <div className="font-medium" style={{ color: card.text }}>{new Date(stats.lastPurchase).toLocaleDateString()}</div>
                          <div className="text-[10px] mt-0.5">{new Date(stats.lastPurchase).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      ) : <span className="italic">No purchases</span>}
                    </td>
                    <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setSelectedCustomer(c)} className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors" title="View History" style={{ color: card.primary }}>
                          <ChevronRight size={16} />
                        </button>
                        <button onClick={() => handleOpenModal(c)} className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors" title="Edit" style={{ color: card.muted }}>
                          <Edit size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: card.border }}>
          <p className="text-xs" style={{ color: card.muted }}>
            Showing <span className="font-bold" style={{ color: card.text }}>{startIndex}-{endIndex}</span> of <span className="font-bold" style={{ color: card.text }}>{totalItems}</span>
          </p>
          <div className="flex gap-2">
            <button disabled={currentPage === 1} onClick={prevPage} className="px-3 py-1 rounded-lg text-xs font-bold transition-all disabled:opacity-30" style={{ background: card.primaryBg, color: card.primary }}>Prev</button>
            <button disabled={currentPage === totalPages} onClick={nextPage} className="px-3 py-1 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-30" style={{ background: card.primary }}>Next</button>
          </div>
        </div>
      </div>

      {/* Customer Detail Slide Panel */}
      <AnimatePresence>
        {selectedCustomer && (() => {
          const stats = getCustomerStats(selectedCustomer);
          return (
            <div className="fixed inset-0 z-50 flex justify-end">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedCustomer(null)} />
              <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="relative w-full max-w-md h-full overflow-y-auto flex flex-col shadow-2xl"
                style={{ background: isDark ? '#0F172A' : '#FFFFFF', borderLeft: `1px solid ${card.border}` }}
              >
                {/* Header */}
                <div className="p-6 border-b sticky top-0 z-10" style={{ borderColor: card.border, background: isDark ? '#0F172A' : '#FFFFFF' }}>
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={() => setSelectedCustomer(null)} className="flex items-center gap-2 text-sm font-bold" style={{ color: card.muted }}>
                      <ArrowLeft size={16} /> Back
                    </button>
                    <button onClick={() => { setSelectedCustomer(null); handleOpenModal(selectedCustomer); }} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: card.primaryBg, color: card.primary }}>
                      Edit Profile
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black" style={{ background: `linear-gradient(135deg, ${card.primary}, #6366F1)` }}>
                      {selectedCustomer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-xl font-black" style={{ color: card.text }}>{selectedCustomer.name}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full" style={{ background: card.primaryBg, color: card.primary }}>
                          {selectedCustomer.loyaltyPoints > 500 ? 'VIP' : 'Member'}
                        </span>
                        <span className="text-xs" style={{ color: card.muted }}>Since {selectedCustomer.createdAt ? new Date(selectedCustomer.createdAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="p-5 border-b space-y-2" style={{ borderColor: card.border }}>
                  {selectedCustomer.phone && <div className="flex items-center gap-2 text-sm"><Phone size={14} style={{ color: card.muted }} /><span style={{ color: card.text }}>{selectedCustomer.phone}</span></div>}
                  {selectedCustomer.email && <div className="flex items-center gap-2 text-sm"><Mail size={14} style={{ color: card.muted }} /><span style={{ color: card.text }}>{selectedCustomer.email}</span></div>}
                  {selectedCustomer.address && <div className="flex items-center gap-2 text-sm"><MapPin size={14} style={{ color: card.muted }} /><span style={{ color: card.text }}>{selectedCustomer.address}</span></div>}
                </div>

                {/* Stats */}
                <div className="p-5 grid grid-cols-3 gap-3 border-b" style={{ borderColor: card.border }}>
                  <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
                    <p className="text-lg font-black" style={{ color: '#10B981' }}>{fmt(stats.totalSpent)}</p>
                    <p className="text-[10px] font-bold uppercase" style={{ color: card.muted }}>Total Spent</p>
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
                    <p className="text-lg font-black" style={{ color: '#6366F1' }}>{stats.visits}</p>
                    <p className="text-[10px] font-bold uppercase" style={{ color: card.muted }}>Visits</p>
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(245,158,11,0.1)' }}>
                    <p className="text-lg font-black" style={{ color: '#F59E0B' }}>{selectedCustomer.loyaltyPoints || 0}</p>
                    <p className="text-[10px] font-bold uppercase" style={{ color: card.muted }}>Points</p>
                  </div>
                </div>

                {/* Purchase History */}
                <div className="p-5 flex-1">
                  <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: card.text }}>
                    <Receipt size={15} style={{ color: card.primary }} /> Purchase History
                  </h3>
                  {stats.history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                      <ShoppingBag size={36} className="opacity-30" />
                      <p className="text-sm">No purchases recorded yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {stats.history.map((sale) => (
                        <div key={sale.id} className="rounded-xl p-4 border" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor: card.border }}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-mono font-bold" style={{ color: card.muted }}>#{sale.receiptNo || sale.id.slice(-6).toUpperCase()}</div>
                            <div className="font-black text-sm" style={{ color: '#10B981' }}>{fmt(sale.totalAmount)}</div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-xs" style={{ color: card.muted }}>
                              <Clock size={10} className="inline mr-1" />
                              {new Date(sale.createdAt).toLocaleDateString()} · {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(14,165,233,0.1)', color: '#0EA5E9' }}>
                              {sale.paymentMethod}
                            </div>
                          </div>
                          {sale.items && sale.items.length > 0 && (
                            <div className="mt-2 pt-2 border-t text-xs" style={{ borderColor: card.border, color: card.muted }}>
                              {sale.items.slice(0, 3).map((item: any, i: number) => (
                                <span key={i}>{item.product?.name || 'Item'}{i < Math.min(sale.items.length, 3) - 1 ? ', ' : ''}</span>
                              ))}
                              {sale.items.length > 3 && <span> +{sale.items.length - 3} more</span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isSubmitting && setIsModalOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-lg rounded-3xl overflow-hidden flex flex-col shadow-2xl" style={{ background: isDark ? '#0F172A' : '#FFFFFF', border: `1px solid ${card.border}` }}>
              <div className="p-6 border-b flex justify-between items-center" style={{ borderColor: card.border }}>
                <h2 className="text-xl font-bold" style={{ color: card.text }}>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5" style={{ color: card.muted }}><X size={20} /></button>
              </div>

              <div className="p-6 overflow-y-auto">
                {error && (
                  <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium">
                    {error}
                  </div>
                )}
                <form id="customer-form" onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider mb-2 block" style={{ color: card.muted }}>Full Name <span className="text-red-500">*</span></label>
                    <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-1 transition-all" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider mb-2 block" style={{ color: card.muted }}>Phone Number</label>
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="054 000 0000" className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-1 transition-all" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider mb-2 block" style={{ color: card.muted }}>Email Address</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-1 transition-all" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider mb-2 block" style={{ color: card.muted }}>Physical Address</label>
                    <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Health St, Accra" className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-1 transition-all" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                  </div>
                </form>
              </div>

              <div className="p-6 border-t flex gap-4" style={{ borderColor: card.border, background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-sm transition-colors hover:bg-black/10 dark:hover:bg-white/10" style={{ color: card.text }}>Cancel</button>
                <button type="submit" form="customer-form" disabled={isSubmitting} className="flex-[2] py-3 rounded-xl text-white font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70" style={{ background: card.primary }}>
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                  {editingCustomer ? 'Save Changes' : 'Create Customer'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
