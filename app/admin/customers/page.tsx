'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { 
  Search, Plus, Edit, UserPlus, Phone, Mail, Award, 
  CheckCircle, Loader2, CreditCard, ChevronRight, X
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { usePagination } from '@/hooks/use-pagination';
import { motion, AnimatePresence } from 'framer-motion';

export default function CustomersAdminPage() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { customers, createCustomer, updateCustomer } = useStore();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);

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
                <th className="p-4 text-xs font-bold uppercase tracking-wider" style={{ color: card.muted }}>Value & Points</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider" style={{ color: card.muted }}>Added</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-right" style={{ color: card.muted }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-sm" style={{ color: card.muted }}>No customers found</td>
                </tr>
              ) : paginatedData.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ borderColor: card.border }}>
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
                    <div className="font-bold text-sm" style={{ color: card.text }}>GH₵ {(c.totalSpent || 0).toFixed(2)}</div>
                    <div className="text-xs flex items-center gap-1 mt-0.5" style={{ color: '#F59E0B' }}>
                      <Award size={12} /> {c.loyaltyPoints || 0} pts
                    </div>
                  </td>
                  <td className="p-4 text-xs" style={{ color: card.muted }}>
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => handleOpenModal(c)} className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 transition-colors" title="Edit Customer">
                      <Edit size={16} />
                    </button>
                  </td>
                </tr>
              ))}
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
