'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { 
  TrendingUp, TrendingDown, Zap, Target, Activity,
  AlertTriangle, Crosshair, Map, ShieldAlert, Cpu, Package, CheckCircle2,
  RefreshCw, Clock, ArrowRight, ArrowUpRight, DollarSign, LocateFixed, Eye, Newspaper, HeartPulse, GraduationCap,
  Sparkles, ChevronRight, Search, BrainCircuit
} from 'lucide-react';
import { mockIntelligenceData } from '@/lib/intelligence-data';

export default function MarketIntelligencePage() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('Market Prices');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setMounted(true);
    // Use imported mock data for static export compatibility
    setData(mockIntelligenceData);
    setLoading(false);
  }, []);

  const isDark = mounted && theme === 'dark';

  const c = {
    bg: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)',
    border: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.5)',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    primary: isDark ? '#00D9FF' : '#0EA5E9',
    accent: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    purple: '#8B5CF6',
    cardBg: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(248,250,252,0.8)',
  };

  const tabs = [
    { id: 'Health Pulse', icon: HeartPulse, subtitle: 'WHO · BBC Health · Industry signals' },
    { id: 'Drug Intelligence', icon: Cpu, subtitle: 'AI-powered drug monographs' },
    { id: 'Market Prices', icon: TrendingUp, subtitle: 'Price trends & supplier intel' },
    { id: 'Disease Alerts', icon: AlertTriangle, subtitle: 'WHO & Ghana Health Service' },
    { id: 'Staff Learning', icon: GraduationCap, subtitle: 'Drug education modules' },
    { id: 'Market News', icon: Newspaper, subtitle: 'Global pharma breaking news' },
  ];

  if (!mounted) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header Area is now simplified because global layout has the title, branch, and marquee */}
      <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl border backdrop-blur-xl relative overflow-hidden group w-max" style={{ borderColor: c.border, background: c.bg }}>
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <Sparkles size={16} className="text-emerald-500 animate-pulse" />
        <span className="text-xs font-black tracking-widest text-emerald-500">Live Intelligence</span>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-4 border-b pb-4" style={{ borderColor: c.border }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-left min-w-[200px]"
              style={{ 
                borderColor: isActive ? c.accent : c.border,
                background: isActive ? (isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)') : c.cardBg,
                boxShadow: isActive ? `0 0 20px ${isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.2)'}` : 'none'
              }}
            >
              <div style={{ color: isActive ? c.accent : c.muted }}>
                <tab.icon size={20} />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: isActive ? c.text : c.muted }}>{tab.id}</p>
                <p className="text-[10px]" style={{ color: c.muted }}>{tab.subtitle}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
          <RefreshCw className="animate-spin text-primary" size={32} />
          <p className="text-sm font-bold animate-pulse">Syncing Intelligence Core...</p>
        </div>
      ) : (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
          
          {/* MARKET PRICES TAB */}
          {activeTab === 'Market Prices' && (
            <div className="space-y-6">
              <div className="p-6 rounded-[32px] border flex items-center justify-between" style={{ background: c.bg, borderColor: c.border }}>
                <div>
                  <h3 className="font-display font-bold text-xl flex items-center gap-2 text-orange-500">
                    <TrendingUp size={20} /> Ghana Pharma Market Intelligence
                  </h3>
                  <p className="text-sm mt-1" style={{ color: c.text }}>Demand trends, pricing signals, and supplier intelligence for Ghana pharmacy market.</p>
                </div>
                <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-500">
                  Updated Daily
                </div>
              </div>
              
              {/* Category Pills */}
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {['All', 'Antimalarials', 'Antibiotics', 'Antidiabetics', 'Analgesics', 'Antihypertensives', 'GI Medicines', 'Rehydration'].map(cat => (
                  <button key={cat} className="px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors"
                    style={{ background: cat === 'All' ? c.accent : c.cardBg, color: cat === 'All' ? '#fff' : c.muted, border: `1px solid ${cat === 'All' ? c.accent : c.border}` }}>
                    {cat}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data?.marketPrices?.map((p: any) => (
                  <div key={p.id} className="p-5 rounded-3xl border transition-all hover:scale-[1.02]" style={{ background: c.cardBg, borderColor: c.border }}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-sm" style={{ color: c.text }}>{p.name}</h4>
                        <span className="text-[10px] text-slate-500">{p.category}</span>
                      </div>
                      <span className="px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1"
                        style={{ 
                          background: p.trend === 'Rising' ? 'rgba(239,68,68,0.1)' : p.trend === 'Falling' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                          color: p.trend === 'Rising' ? c.danger : p.trend === 'Falling' ? c.accent : c.warning
                        }}>
                        {p.trend === 'Rising' ? <TrendingUp size={10} /> : p.trend === 'Falling' ? <TrendingDown size={10} /> : <Activity size={10} />}
                        {p.trend}
                      </span>
                    </div>
                    <p className="text-xs mb-4 min-h-[40px] leading-relaxed" style={{ color: c.muted }}>{p.description}</p>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                      <ArrowUpRight size={12} /> {p.source}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DISEASE ALERTS TAB */}
          {activeTab === 'Disease Alerts' && (
            <div className="space-y-6">
              <div className="p-6 rounded-[32px] border flex items-center justify-between" style={{ background: c.bg, borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                <div>
                  <h3 className="font-display font-bold text-xl flex items-center gap-2 text-red-500">
                    <AlertTriangle size={20} /> Disease Outbreak Alerts — Ghana
                  </h3>
                  <p className="text-sm mt-1" style={{ color: c.text }}>Real-time disease surveillance from WHO and Ghana Health Service. Stay prepared for seasonal outbreaks.</p>
                </div>
                <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-500 animate-pulse">
                  Live Alerts
                </div>
              </div>

              <div className="space-y-4">
                {data?.diseaseAlerts?.map((alert: any) => (
                  <div key={alert.id} className="p-5 rounded-3xl border border-l-4" style={{ background: c.cardBg, borderColor: c.border, borderLeftColor: alert.level === 'WARNING' ? c.warning : c.primary }}>
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-bold text-base" style={{ color: c.text }}>{alert.disease}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: alert.level === 'WARNING' ? 'rgba(245,158,11,0.1)' : 'rgba(14,165,233,0.1)', color: alert.level === 'WARNING' ? c.warning : c.primary }}>
                        <AlertTriangle size={10} className="inline mr-1" />{alert.level}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider mb-4" style={{ color: c.muted }}>
                      <span className="flex items-center gap-1"><Map size={12} /> {alert.locations}</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {alert.date}</span>
                    </div>
                    <p className="text-sm mb-4" style={{ color: c.text }}>{alert.description}</p>
                    <div className="p-3 rounded-xl mb-4" style={{ background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <p className="text-xs font-bold mb-1 flex items-center gap-2 text-orange-500">💊 Pharmacy Action</p>
                      <p className="text-sm" style={{ color: c.muted }}>{alert.action}</p>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                      <ArrowUpRight size={12} /> {alert.source}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STAFF LEARNING TAB */}
          {activeTab === 'Staff Learning' && (
            <div className="space-y-6">
              <div className="p-6 rounded-[32px] border flex items-center justify-between" style={{ background: c.bg, borderColor: c.border }}>
                <div>
                  <h3 className="font-display font-bold text-xl flex items-center gap-2 text-purple-500">
                    <GraduationCap size={20} /> Staff Learning Centre
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-500 ml-2">NEW</span>
                  </h3>
                  <p className="text-sm mt-1" style={{ color: c.text }}>Drug education modules for pharmacy staff. Learn at your own pace.</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-bold text-emerald-500">0/4</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">completed</p>
                </div>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '0%' }} />
              </div>

              <div className="flex gap-2 mt-4">
                {['All', 'Clinical', 'Regulatory', 'Skills'].map(cat => (
                  <button key={cat} className="px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors"
                    style={{ background: cat === 'All' ? c.accent : c.cardBg, color: cat === 'All' ? '#fff' : c.muted, border: `1px solid ${cat === 'All' ? c.accent : c.border}` }}>
                    {cat}
                  </button>
                ))}
              </div>

              <div className="space-y-3 mt-6">
                {data?.staffLearning?.map((module: any) => (
                  <div key={module.id} className="p-4 rounded-2xl border flex items-center gap-4 transition-all hover:bg-slate-50/5 dark:hover:bg-slate-800/50 cursor-pointer" style={{ borderColor: c.border, background: c.cardBg }}>
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <GraduationCap size={20} className="text-slate-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{module.title}</h4>
                      <div className="flex items-center gap-3 text-[10px] mt-1 font-bold text-slate-500">
                        <span className="text-emerald-500">{module.level}</span>
                        <span className="flex items-center gap-1"><Clock size={10} /> {module.duration}</span>
                        <span>{module.category}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">{module.description}</p>
                    </div>
                    <ChevronRight size={20} className="text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MARKET NEWS TAB */}
          {activeTab === 'Market News' && (
            <div className="space-y-6">
               <div className="p-6 rounded-[32px] border flex items-center justify-between" style={{ background: c.bg, borderColor: c.border }}>
                <div>
                  <h3 className="font-display font-bold text-xl flex items-center gap-2 text-blue-500">
                    <Newspaper size={20} /> Global Pharma News
                  </h3>
                  <p className="text-sm mt-1" style={{ color: c.text }}>Latest industry updates, WHO directives, and supply chain shifts.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data?.news?.map((n: any) => (
                  <div key={n.id} className="p-5 rounded-3xl border flex flex-col justify-between hover:border-blue-500/30 transition-all cursor-pointer" style={{ background: c.cardBg, borderColor: c.border }}>
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-blue-500/10 text-blue-500">
                          {n.source}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">{n.time}</span>
                      </div>
                      <h4 className="font-bold text-sm mb-3 leading-snug" style={{ color: c.text }}>{n.title}</h4>
                    </div>
                    <div className="flex justify-end">
                       <span className="px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1"
                        style={{ background: n.urgency === 'critical' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', color: n.urgency === 'critical' ? c.danger : c.warning }}>
                        {n.urgency} Priority
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* HEALTH PULSE TAB */}
          {activeTab === 'Health Pulse' && data?.healthPulse && (
            <div className="space-y-6">
               <div className="p-6 rounded-[32px] border flex items-center justify-between" style={{ background: c.bg, borderColor: c.border }}>
                <div>
                  <h3 className="font-display font-bold text-xl flex items-center gap-2" style={{ color: c.primary }}>
                    <HeartPulse size={20} /> Regional Health Pulse
                  </h3>
                  <p className="text-sm mt-1" style={{ color: c.text }}>Global and regional health KPIs affecting pharmaceutical operations.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {data.healthPulse.metrics.map((metric: any, idx: number) => (
                  <div key={idx} className="p-5 rounded-3xl border flex flex-col justify-between hover:-translate-y-1 transition-transform" style={{ background: c.cardBg, borderColor: c.border }}>
                    <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: c.muted }}>{metric.title}</p>
                    <h4 className="text-3xl font-display font-bold mb-2" style={{ color: c.text }}>{metric.value}</h4>
                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                      {metric.trend === 'up' ? <TrendingUp size={12} className="text-emerald-500" /> : metric.trend === 'down' ? <TrendingDown size={12} className="text-blue-500" /> : <Activity size={12} className="text-orange-500" />}
                      {metric.description}
                    </p>
                  </div>
                ))}
              </div>

              <div className="p-6 rounded-3xl border space-y-4" style={{ background: c.cardBg, borderColor: c.border }}>
                <h4 className="font-bold text-sm" style={{ color: c.text }}>Priority Industry Signals</h4>
                <div className="space-y-3">
                  {data.healthPulse.signals.map((signal: any) => (
                    <div key={signal.id} className="p-4 rounded-2xl border bg-white/5 flex gap-4 items-start" style={{ borderColor: c.border }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(14,165,233,0.1)', color: c.primary }}>
                         {signal.type === 'Regulatory' ? <ShieldAlert size={16} /> : signal.type === 'Epidemiological' ? <Activity size={16} /> : <GraduationCap size={16} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{signal.source}</span>
                          <span className="text-[10px] text-slate-500">{signal.date}</span>
                        </div>
                        <p className="text-sm font-bold" style={{ color: c.text }}>{signal.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* DRUG INTELLIGENCE TAB */}
          {activeTab === 'Drug Intelligence' && (
            <div className="space-y-6">
              <div className="p-6 rounded-[32px] border" style={{ background: c.bg, borderColor: c.border }}>
                <div className="flex items-center gap-3 text-[#00D9FF] mb-4">
                  <BrainCircuit size={24} />
                  <h3 className="font-display font-bold text-xl">AI Drug Intelligence</h3>
                </div>
                
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search any drug name, active ingredient, or indication..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border-none outline-none text-sm font-bold shadow-inner"
                    style={{ color: c.text }}
                  />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-[#00D9FF] text-slate-900 rounded-xl text-xs font-bold hover:bg-[#00D9FF]/90 transition-colors">
                    Search AI
                  </button>
                </div>
              </div>

              {searchQuery.length > 2 ? (
                <div className="space-y-4">
                  {data?.drugIntelligence?.filter((d: any) => d.product.toLowerCase().includes(searchQuery.toLowerCase()) || d.indications.toLowerCase().includes(searchQuery.toLowerCase())).map((drug: any, i: number) => (
                    <div key={i} className="p-6 rounded-[32px] border flex flex-col gap-4 relative overflow-hidden" style={{ background: 'rgba(0,217,255,0.03)', borderColor: 'rgba(0,217,255,0.1)' }}>
                      <div className="absolute -right-10 -top-10 opacity-5"><BrainCircuit size={200} /></div>
                      
                      <div className="flex items-center justify-between relative z-10">
                        <h4 className="text-xl font-display font-bold text-[#00D9FF]">{drug.product}</h4>
                        <span className="px-3 py-1 rounded-full bg-[#00D9FF]/10 text-[#00D9FF] text-[10px] font-bold border border-[#00D9FF]/20">AI Monograph</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                         <div className="space-y-1 bg-white/5 p-4 rounded-2xl border border-white/5">
                           <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Indications</p>
                           <p className="text-sm font-medium leading-relaxed" style={{ color: c.text }}>{drug.indications}</p>
                         </div>
                         <div className="space-y-1 bg-white/5 p-4 rounded-2xl border border-white/5">
                           <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Standard Dosage</p>
                           <p className="text-sm font-medium leading-relaxed" style={{ color: c.text }}>{drug.dosage}</p>
                         </div>
                         <div className="space-y-1 bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10">
                           <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Patient Counseling</p>
                           <p className="text-sm font-medium leading-relaxed" style={{ color: c.text }}>{drug.counseling}</p>
                         </div>
                         <div className="space-y-1 bg-red-500/5 p-4 rounded-2xl border border-red-500/10">
                           <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">Contraindications</p>
                           <p className="text-sm font-medium leading-relaxed" style={{ color: c.text }}>{drug.contraindications}</p>
                         </div>
                      </div>
                    </div>
                  ))}
                  {data?.drugIntelligence?.filter((d: any) => d.product.toLowerCase().includes(searchQuery.toLowerCase()) || d.indications.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                     <div className="p-12 rounded-[32px] border text-center" style={{ background: c.cardBg, borderColor: c.border }}>
                       <p className="text-sm font-bold text-slate-400">No AI monographs found matching "{searchQuery}"</p>
                     </div>
                  )}
                </div>
              ) : (
                <div className="p-12 rounded-[32px] border text-center flex flex-col items-center justify-center opacity-60" style={{ background: c.cardBg, borderColor: c.border }}>
                   <BrainCircuit size={48} className="text-[#00D9FF] mb-4" />
                   <h4 className="font-bold text-lg mb-2" style={{ color: c.text }}>AI Copilot Ready</h4>
                   <p className="text-sm text-slate-500 max-w-sm">Type at least 3 characters to search our deep pharmaceutical intelligence database.</p>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
