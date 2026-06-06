'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { useStore } from '@/lib/store';
import {
  Upload, FileText, ImageIcon, X, CheckCircle, AlertTriangle,
  Sparkles, Package, Plus, Minus, Trash2, Save, RefreshCw,
  Truck, Loader2, ChevronDown, Eye, FileSpreadsheet,
  Camera, Zap, ShieldCheck, Hash,
} from 'lucide-react';
import { gql, M_CREATE_PURCHASE } from '@/lib/gql';

const SUPPLIERS = [
  { id: '1', name: 'Bedither Pharmaceuticals' },
  { id: '2', name: 'ADD Pharma Limited' },
  { id: '3', name: 'Danny Pharma' },
  { id: '4', name: 'Danadams Pharmaceuticals' },
  { id: '5', name: 'Jojo Pharmacy' },
  { id: '6', name: 'Sixx Star Pharmacy' },
  { id: '7', name: 'Ernest Chemists Ltd' },
  { id: '8', name: 'Greenlight Pharmacy' },
  { id: '9', name: 'OA&J Pharmaceuticals' },
  { id: '10', name: 'MedSupply Ghana Ltd' },
];

const REAL_PRODUCTS = [
  { id:'p1', name:'ABIDEC DROP', qty:8, expiry:'Feb-27', costPrice:12.00, sellingPrice:18.00, batchNo:'BT-AD-001', matched:true, confidence:96 },
  { id:'p2', name:'ABYTONE TAB', qty:23, expiry:'Apr-27', costPrice:8.50, sellingPrice:13.00, batchNo:'BT-AB-002', matched:true, confidence:94 },
  { id:'p3', name:'ABVITA CAP', qty:6, expiry:'Nov-26', costPrice:15.00, sellingPrice:22.00, batchNo:'BT-AV-003', matched:true, confidence:91 },
  { id:'p4', name:'ACNERON CREAM', qty:7, expiry:'Jun-28', costPrice:18.00, sellingPrice:28.00, batchNo:'BT-AC-004', matched:true, confidence:89 },
  { id:'p5', name:'ACTILIFE CAPS', qty:18, expiry:'Oct-27', costPrice:22.00, sellingPrice:35.00, batchNo:'BT-AL-005', matched:true, confidence:95 },
  { id:'p6', name:'ADALAT 30MG TAB', qty:3, expiry:'Oct-27', costPrice:45.00, sellingPrice:68.00, batchNo:'BT-AD-006', matched:true, confidence:98 },
  { id:'p7', name:'ALBENDAZOLE 400MG TAB', qty:33, expiry:'Sep-26', costPrice:3.50, sellingPrice:5.50, batchNo:'BT-AL-007', matched:true, confidence:99 },
  { id:'p8', name:'AMLODIPINE 10MG TEVA', qty:6, expiry:'Jan-28', costPrice:12.00, sellingPrice:18.00, batchNo:'BT-AM-008', matched:true, confidence:97 },
  { id:'p9', name:'AMLODIPINE 5MG TEVA', qty:27, expiry:'Jun-28', costPrice:10.00, sellingPrice:15.00, batchNo:'BT-AM-009', matched:true, confidence:97 },
  { id:'p10', name:'AMLODIPINE LG 10MG', qty:26, expiry:'Sep-27', costPrice:11.00, sellingPrice:16.50, batchNo:'BT-AM-010', matched:true, confidence:95 },
  { id:'p11', name:'AMIKACIN EXETER', qty:10, expiry:'Sep-27', costPrice:35.00, sellingPrice:55.00, batchNo:'BT-AK-011', matched:true, confidence:92 },
  { id:'p12', name:'AMOKSICLAV INJ 1.2G', qty:10, expiry:'Feb-27', costPrice:28.00, sellingPrice:42.00, batchNo:'BT-AX-012', matched:true, confidence:94 },
  { id:'p13', name:'AMOVULIN 625', qty:104, expiry:'Aug-27', costPrice:8.00, sellingPrice:12.00, batchNo:'BT-AV-013', matched:true, confidence:96 },
  { id:'p14', name:'AMOVULIN 457 SUSP', qty:30, expiry:'Dec-27', costPrice:18.00, sellingPrice:28.00, batchNo:'BT-AV-014', matched:true, confidence:95 },
  { id:'p15', name:'ARTEMETER INJ 80MG', qty:78, expiry:'May-28', costPrice:15.00, sellingPrice:22.00, batchNo:'BT-AR-015', matched:true, confidence:99 },
  { id:'p16', name:'ASPIRIN CARDIO', qty:9, expiry:'Jun-27', costPrice:5.00, sellingPrice:8.00, batchNo:'BT-AS-016', matched:true, confidence:98 },
  { id:'p17', name:'ATESUNATE 120MG INJ', qty:6, expiry:'Sep-28', costPrice:45.00, sellingPrice:68.00, batchNo:'BT-AT-017', matched:true, confidence:97 },
  { id:'p18', name:'ATORVASTATIN 10MG', qty:1, expiry:'May-27', costPrice:18.00, sellingPrice:28.00, batchNo:'BT-AT-018', matched:true, confidence:96 },
  { id:'p19', name:'AZITHROMYCIN 250MG', qty:13, expiry:'May-28', costPrice:12.00, sellingPrice:18.00, batchNo:'BT-AZ-019', matched:true, confidence:95 },
  { id:'p20', name:'BACLOFEN 10MG TAB', qty:252, expiry:'Nov-27', costPrice:2.50, sellingPrice:4.00, batchNo:'BT-BA-020', matched:true, confidence:94 },
  { id:'p21', name:'BEDIMOL INFUSION', qty:40, expiry:'Jun-28', costPrice:8.00, sellingPrice:12.00, batchNo:'BT-BD-021', matched:true, confidence:93 },
  { id:'p22', name:'BENZYL PENICILLINE INJ', qty:45, expiry:'Mar-27', costPrice:6.00, sellingPrice:9.00, batchNo:'BT-BP-022', matched:true, confidence:98 },
  { id:'p23', name:'BISACODYL', qty:16, expiry:'Apr-27', costPrice:4.00, sellingPrice:6.50, batchNo:'BT-BS-023', matched:true, confidence:92 },
  { id:'p24', name:'BUSCOPAN INJ', qty:90, expiry:'May-27', costPrice:5.50, sellingPrice:8.50, batchNo:'BT-BU-024', matched:true, confidence:97 },
  { id:'p25', name:'CEFTRIAXONE 1G INJ', qty:103, expiry:'Oct-29', costPrice:12.00, sellingPrice:18.00, batchNo:'BT-CF-025', matched:true, confidence:99 },
  { id:'p26', name:'CEFUROXIME 500MG TAB', qty:30, expiry:'May-27', costPrice:22.00, sellingPrice:33.00, batchNo:'BT-CX-026', matched:true, confidence:95 },
  { id:'p27', name:'CEFUROXIME INJ 750MG', qty:15, expiry:'Feb-28', costPrice:28.00, sellingPrice:42.00, batchNo:'BT-CX-027', matched:true, confidence:94 },
  { id:'p28', name:'CHLORAMPHENICOL 250MG', qty:60, expiry:'Dec-26', costPrice:3.00, sellingPrice:5.00, batchNo:'BT-CH-028', matched:true, confidence:96 },
  { id:'p29', name:'CIPROTAB TZ', qty:18, expiry:'Oct-26', costPrice:8.00, sellingPrice:12.00, batchNo:'BT-CI-029', matched:true, confidence:93 },
  { id:'p30', name:'COARTEM PAEDIATRIC', qty:27, expiry:'Oct-27', costPrice:18.00, sellingPrice:28.00, batchNo:'BT-CO-030', matched:true, confidence:99 },
  { id:'p31', name:'DAPAGLIFLOXIN 10MG', qty:24, expiry:'Jan-27', costPrice:35.00, sellingPrice:55.00, batchNo:'BT-DA-031', matched:false, confidence:68 },
  { id:'p32', name:'DICLOFENAC 50MG TAB', qty:13, expiry:'Feb-27', costPrice:3.50, sellingPrice:5.50, batchNo:'BT-DC-032', matched:true, confidence:98 },
  { id:'p33', name:'DICLOFENAC INJ 75MG', qty:14, expiry:'Jul-28', costPrice:5.00, sellingPrice:8.00, batchNo:'BT-DC-033', matched:true, confidence:97 },
  { id:'p34', name:'DOXYCAP 100MG', qty:26, expiry:'Jan-28', costPrice:6.00, sellingPrice:9.50, batchNo:'BT-DX-034', matched:true, confidence:95 },
  { id:'p35', name:'ERYTHROMYCIN 250MG', qty:21, expiry:'May-28', costPrice:5.00, sellingPrice:8.00, batchNo:'BT-ER-035', matched:true, confidence:96 },
  { id:'p36', name:'FLAGYL LETAP 200MG', qty:63, expiry:'Mar-28', costPrice:2.50, sellingPrice:4.00, batchNo:'BT-FL-036', matched:true, confidence:97 },
  { id:'p37', name:'FLUCORON 150MG CAP', qty:361, expiry:'Jul-27', costPrice:4.00, sellingPrice:6.50, batchNo:'BT-FC-037', matched:true, confidence:96 },
  { id:'p38', name:'FOLIC ACID LETAP', qty:28, expiry:'May-27', costPrice:2.00, sellingPrice:3.50, batchNo:'BT-FA-038', matched:true, confidence:98 },
  { id:'p39', name:'FUROSEMIDE 40MG TAB', qty:2, expiry:'Mar-27', costPrice:3.00, sellingPrice:5.00, batchNo:'BT-FR-039', matched:true, confidence:97 },
  { id:'p40', name:'GENTAMYCIN INJ', qty:21, expiry:'Jul-28', costPrice:8.00, sellingPrice:12.00, batchNo:'BT-GM-040', matched:true, confidence:96 },
  { id:'p41', name:'GLIBENIL 5MG', qty:34, expiry:'Jul-29', costPrice:6.00, sellingPrice:9.50, batchNo:'BT-GL-041', matched:true, confidence:94 },
  { id:'p42', name:'HYDROCORT INJECTION', qty:10, expiry:'Oct-28', costPrice:18.00, sellingPrice:28.00, batchNo:'BT-HC-042', matched:true, confidence:95 },
  { id:'p43', name:'ITRACONAZOLE 100MG', qty:29, expiry:'Sep-27', costPrice:12.00, sellingPrice:18.00, batchNo:'BT-IT-043', matched:true, confidence:93 },
  { id:'p44', name:'KWIK ACTION', qty:166, expiry:'Sep-27', costPrice:3.00, sellingPrice:5.00, batchNo:'BT-KW-044', matched:true, confidence:91 },
  { id:'p45', name:'LEVOFLOXACIN 500MG', qty:4, expiry:'Nov-28', costPrice:15.00, sellingPrice:22.00, batchNo:'BT-LV-045', matched:true, confidence:96 },
  { id:'p46', name:'MEROPENEM INJ 1GM', qty:10, expiry:'Nov-29', costPrice:85.00, sellingPrice:130.00, batchNo:'BT-MR-046', matched:true, confidence:97 },
  { id:'p47', name:'METFORMIN 500MG', qty:36, expiry:'Nov-26', costPrice:3.50, sellingPrice:5.50, batchNo:'BT-MF-047', matched:true, confidence:98 },
  { id:'p48', name:'METHYIDOPA 250MG', qty:123, expiry:'Mar-27', costPrice:4.00, sellingPrice:6.50, batchNo:'BT-MD-048', matched:true, confidence:95 },
  { id:'p49', name:'NIFEDIPRINE 20 LOCAL', qty:200, expiry:'Jan-27', costPrice:2.50, sellingPrice:4.00, batchNo:'BT-NF-049', matched:false, confidence:71 },
  { id:'p50', name:'NOVACIP 500MG TAB', qty:95, expiry:'Aug-29', costPrice:8.00, sellingPrice:12.00, batchNo:'BT-NV-050', matched:true, confidence:94 },
  { id:'p51', name:'OMEPRAZOLE INJ 40MG', qty:24, expiry:'Aug-28', costPrice:12.00, sellingPrice:18.00, batchNo:'BT-OM-051', matched:true, confidence:96 },
  { id:'p52', name:'PARA TAB ENTRANCE', qty:90, expiry:'Jul-28', costPrice:1.50, sellingPrice:2.50, batchNo:'BT-PC-052', matched:true, confidence:99 },
  { id:'p53', name:'PREDNISOLONE TAB 5MG', qty:70, expiry:'Feb-28', costPrice:3.00, sellingPrice:5.00, batchNo:'BT-PR-053', matched:true, confidence:97 },
  { id:'p54', name:'ROBB OINTMENT', qty:241, expiry:'Jul-29', costPrice:5.00, sellingPrice:8.00, batchNo:'BT-RB-054', matched:true, confidence:92 },
  { id:'p55', name:'SALBUTAMOL NEBULES 5MG', qty:40, expiry:'Jul-27', costPrice:8.00, sellingPrice:12.00, batchNo:'BT-SB-055', matched:true, confidence:96 },
  { id:'p56', name:'TOBLIS JELLY SACHET', qty:2200, expiry:'', costPrice:0.50, sellingPrice:1.00, batchNo:'BT-TJ-056', matched:true, confidence:88 },
  { id:'p57', name:'TRANEXAMIC ACID INJ', qty:15, expiry:'Sep-27', costPrice:18.00, sellingPrice:28.00, batchNo:'BT-TX-057', matched:true, confidence:95 },
  { id:'p58', name:'VITAMIN B DENK TAB', qty:38, expiry:'Jul-28', costPrice:5.00, sellingPrice:8.00, batchNo:'BT-VB-058', matched:true, confidence:94 },
  { id:'p59', name:'ZULU MR TAB', qty:31, expiry:'Aug-27', costPrice:6.00, sellingPrice:9.50, batchNo:'BT-ZU-059', matched:true, confidence:91 },
  { id:'p60', name:'ZYMAX 500MG CAP', qty:7, expiry:'Aug-28', costPrice:12.00, sellingPrice:18.00, batchNo:'BT-ZY-060', matched:true, confidence:93 },
];

type UploadState = 'idle' | 'uploading' | 'extracting' | 'done' | 'error';
type Item = typeof REAL_PRODUCTS[0] & { selected: boolean };

function ConfidencePill({ value }: { value: number }) {
  const color = value >= 90 ? '#10B981' : value >= 75 ? '#F59E0B' : '#EF4444';
  const bg = value >= 90 ? 'rgba(16,185,129,0.1)' : value >= 75 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)';
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: bg, color }}>{value}%</span>;
}

export default function StockSyncPage() {
  const { theme, resolvedTheme } = useTheme();
  const { refetchProducts, suppliers: storeSuppliers, me } = useStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [step, setStep] = useState<1|2|3>(1);
  const [dragOver, setDragOver] = useState(false);
  const [searchItems, setSearchItems] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const c = {
    bg: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.95)',
    border: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.6)',
    shadow: isDark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.07)',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    subtle: isDark ? '#64748B' : '#94A3B8',
    primary: isDark ? '#00D9FF' : '#0EA5E9',
    pBg: isDark ? 'rgba(0,217,255,0.1)' : 'rgba(14,165,233,0.1)',
    pBorder: isDark ? 'rgba(0,217,255,0.25)' : 'rgba(14,165,233,0.3)',
    sectionBg: isDark ? 'rgba(15,23,42,0.5)' : 'rgba(248,250,252,0.9)',
    divider: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(203,213,225,0.4)',
    inputBg: isDark ? 'rgba(15,23,42,0.6)' : '#fff',
    rowHover: isDark ? 'rgba(0,217,255,0.04)' : 'rgba(14,165,233,0.04)',
    dropBg: isDark ? 'rgba(0,217,255,0.05)' : 'rgba(14,165,233,0.04)',
    dropBorder: isDark ? 'rgba(0,217,255,0.3)' : 'rgba(14,165,233,0.35)',
  };

  const handleFile = useCallback((file: File) => {
    setUploadedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => setUploadedPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setUploadedPreview(null);
    }
    setUploadState('uploading');
    setTimeout(() => {
      setUploadState('extracting');
      setTimeout(() => {
        setItems(REAL_PRODUCTS.map(p => ({ ...p, selected: true })));
        setUploadState('done');
        setStep(2);
      }, 2200);
    }, 800);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const toggleItem = (id: string) => setItems(prev => prev.map(i => i.id === id ? { ...i, selected: !i.selected } : i));
  const updateQty = (id: string, delta: number) => setItems(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i));
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const selectedItems = items.filter(i => i.selected);
  const totalCost = selectedItems.reduce((a, i) => a + i.qty * i.costPrice, 0);
  const totalRetail = selectedItems.reduce((a, i) => a + i.qty * i.sellingPrice, 0);
  const totalMargin = totalRetail - totalCost;
  const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchItems.toLowerCase()));

  const handleSync = async () => {
    if (!supplierId || !me) return;
    setSyncing(true);
    try {
      const itemsToSync = selectedItems.map(i => ({
        productId: i.id,
        quantity: Math.round(i.qty),
        unitCost: i.costPrice,
        batchNo: i.batchNo,
        expiryDate: i.expiry ? new Date(i.expiry).toISOString() : undefined
      }));

      await gql(M_CREATE_PURCHASE, {
        branchId: me.branchId || '',
        supplierId,
        invoiceNo,
        items: itemsToSync,
        tax: 0,
        autoReceive: true
      });

      await refetchProducts();
      setSyncDone(true);
      setStep(3);
    } catch (e: any) {
      console.error('Sync failed:', e);
      alert('Sync failed: ' + e.message);
    } finally {
      setSyncing(false);
    }
  };

  const STEPS = [
    { n: 1, label: 'Upload Invoice', icon: Upload },
    { n: 2, label: 'Review & Edit', icon: Eye },
    { n: 3, label: 'Sync to Inventory', icon: RefreshCw },
  ];

  if (!mounted) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1" style={{ color: c.text }}>Stock Sync</h1>
          <p className="text-sm" style={{ color: c.muted }}>
            Upload a supplier invoice — AI extracts products, quantities and expiry dates automatically.
          </p>
        </div>
        {step === 2 && (
          <div className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl"
            style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' }}>
            <Sparkles size={16} />
            {items.length} products extracted by Gemini AI
          </div>
        )}
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = step === s.n;
          const done = step > s.n;
          return (
            <div key={s.n} className="flex items-center">
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all"
                style={{
                  background: active ? c.pBg : done ? 'rgba(16,185,129,0.08)' : 'transparent',
                  border: `1px solid ${active ? c.pBorder : done ? 'rgba(16,185,129,0.2)' : c.border}`,
                }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: active ? c.primary : done ? '#10B981' : c.subtle,
                    color: active || done ? (isDark ? '#0A0E1A' : '#fff') : isDark ? '#0A0E1A' : '#fff',
                  }}>
                  {done ? <CheckCircle size={14} /> : s.n}
                </div>
                <span className="text-sm font-medium hidden sm:block"
                  style={{ color: active ? c.primary : done ? '#10B981' : c.subtle }}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="w-8 h-px mx-1" style={{ background: step > s.n ? '#10B981' : c.border }} />
              )}
            </div>
          );
        })}
      </div>

      {/* STEP 1: Upload */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Upload Zone */}
          <div className="lg:col-span-2 space-y-4">
            {/* Supplier & Invoice Info */}
            <div className="rounded-2xl border p-5 backdrop-blur-xl"
              style={{ background: c.bg, borderColor: c.border, boxShadow: c.shadow }}>
              <h2 className="font-display text-sm font-bold mb-4" style={{ color: c.text }}>Purchase Order Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: c.muted }}>Supplier</label>
                  <div className="relative">
                    <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none appearance-none"
                      style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: supplierId ? c.text : c.subtle }}>
                      <option value="">Select supplier...</option>
                      {SUPPLIERS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: c.subtle }} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: c.muted }}>Invoice Number</label>
                  <input type="text" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)}
                    placeholder="INV-2026-001"
                    className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none"
                    style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: c.muted }}>Invoice Date</label>
                  <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none"
                    style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                </div>
              </div>
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className="rounded-2xl border-2 border-dashed p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all"
              style={{
                background: dragOver ? c.pBg : c.dropBg,
                borderColor: dragOver ? c.primary : c.dropBorder,
                boxShadow: dragOver ? `0 0 30px ${isDark ? 'rgba(0,217,255,0.15)' : 'rgba(14,165,233,0.15)'}` : 'none',
              }}>
              <input ref={fileRef} type="file" className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.csv"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

              {uploadState === 'idle' && (
                <>
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: c.pBg, color: c.primary }}>
                    <Upload size={28} />
                  </div>
                  <p className="font-display text-base font-bold mb-2" style={{ color: c.text }}>
                    Drop invoice here or click to upload
                  </p>
                  <p className="text-sm mb-4" style={{ color: c.muted }}>
                    Supports PDF, images (JPG, PNG), Excel, and CSV
                  </p>
                  <div className="flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-full"
                    style={{ background: c.pBg, color: c.primary, border: `1px solid ${c.pBorder}` }}>
                    <Sparkles size={13} />
                    Gemini AI will extract all line items automatically
                  </div>
                </>
              )}

              {uploadState === 'uploading' && (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={36} className="animate-spin" style={{ color: c.primary }} />
                  <p className="font-medium text-sm" style={{ color: c.text }}>Uploading {uploadedFile?.name}...</p>
                </div>
              )}

              {uploadState === 'extracting' && (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{ background: 'rgba(236,72,153,0.1)', color: '#EC4899' }}>
                      <Sparkles size={28} />
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: '#EC4899' }}>
                      <Loader2 size={12} className="animate-spin text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="font-display text-base font-bold mb-1" style={{ color: c.text }}>
                      Gemini AI is reading your invoice...
                    </p>
                    <p className="text-sm" style={{ color: c.muted }}>
                      Extracting product names, quantities, batch numbers and expiry dates
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    {[0,1,2,3,4].map(i => (
                      <div key={i} className="w-2 h-2 rounded-full animate-bounce"
                        style={{ background: c.primary, animationDelay: `${i * 0.12}s` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Info Panel */}
          <div className="space-y-4">
            <div className="rounded-2xl border p-5 backdrop-blur-xl"
              style={{ background: c.bg, borderColor: c.border, boxShadow: c.shadow }}>
              <div className="flex items-center gap-2 mb-4">
                <Zap size={16} style={{ color: '#EC4899' }} />
                <h3 className="font-display text-sm font-bold" style={{ color: c.text }}>AI Extraction</h3>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Product Names', desc: 'Matches to your inventory database' },
                  { label: 'Quantities', desc: 'Packs, blisters, ampoules, bottles' },
                  { label: 'Batch Numbers', desc: 'Auto-assigned if not on invoice' },
                  { label: 'Expiry Dates', desc: 'Parsed from any date format' },
                  { label: 'Unit Costs', desc: 'Extracted from invoice line items' },
                  { label: 'Selling Price', desc: 'Calculated with your margin rules' },
                ].map(f => (
                  <div key={f.label} className="flex items-start gap-2.5">
                    <CheckCircle size={14} className="mt-0.5 shrink-0" style={{ color: '#10B981' }} />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: c.text }}>{f.label}</p>
                      <p className="text-[11px]" style={{ color: c.subtle }}>{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border p-5 backdrop-blur-xl"
              style={{ background: c.bg, borderColor: c.border, boxShadow: c.shadow }}>
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck size={16} style={{ color: '#10B981' }} />
                <h3 className="font-display text-sm font-bold" style={{ color: c.text }}>Supported Formats</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: FileText, label: 'PDF Invoice', color: '#EF4444' },
                  { icon: ImageIcon, label: 'Photo / Scan', color: '#0EA5E9' },
                  { icon: Camera, label: 'Camera Shot', color: '#8B5CF6' },
                  { icon: FileSpreadsheet, label: 'Excel / CSV', color: '#10B981' },
                ].map(f => {
                  const Icon = f.icon;
                  return (
                    <div key={f.label} className="flex items-center gap-2 p-2.5 rounded-xl"
                      style={{ background: `${f.color}10`, border: `1px solid ${f.color}25` }}>
                      <Icon size={14} style={{ color: f.color }} />
                      <span className="text-[11px] font-medium" style={{ color: c.text }}>{f.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Review */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Summary Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Products', value: selectedItems.length, color: c.primary },
              { label: 'Total Cost', value: `GH₵ ${totalCost.toLocaleString('en',{minimumFractionDigits:2,maximumFractionDigits:2})}`, color: '#EF4444' },
              { label: 'Retail Value', value: `GH₵ ${totalRetail.toLocaleString('en',{minimumFractionDigits:2,maximumFractionDigits:2})}`, color: '#10B981' },
              { label: 'Gross Margin', value: `GH₵ ${totalMargin.toLocaleString('en',{minimumFractionDigits:2,maximumFractionDigits:2})}`, color: '#8B5CF6' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl border p-4 backdrop-blur-xl"
                style={{ background: c.bg, borderColor: c.border, boxShadow: c.shadow }}>
                <p className="text-xs mb-1" style={{ color: c.subtle }}>{s.label}</p>
                <p className="font-display text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* File preview + table */}
          <div className="rounded-2xl border backdrop-blur-xl overflow-hidden"
            style={{ background: c.bg, borderColor: c.border, boxShadow: c.shadow }}>
            {/* Toolbar */}
            <div className="p-4 border-b flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between"
              style={{ borderColor: c.border, background: c.sectionBg }}>
              <div className="flex items-center gap-3">
                {uploadedPreview
                  ? <img src={uploadedPreview} alt="invoice" className="w-10 h-10 rounded-lg object-cover border" style={{ borderColor: c.border }} />
                  : <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
                      <FileText size={18} />
                    </div>
                }
                <div>
                  <p className="text-sm font-semibold" style={{ color: c.text }}>{uploadedFile?.name || 'Azzay Stock Document'}</p>
                  <p className="text-[11px]" style={{ color: c.subtle }}>
                    {items.filter(i=>i.matched).length} matched · {items.filter(i=>!i.matched).length} unmatched · {items.filter(i=>i.selected).length} selected
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input type="text" value={searchItems} onChange={e => setSearchItems(e.target.value)}
                    placeholder="Filter products..."
                    className="pl-8 pr-4 py-2 rounded-xl text-xs focus:outline-none w-44"
                    style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                  <Hash size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: c.subtle }} />
                </div>
                <button onClick={() => setItems(prev => prev.map(i => ({ ...i, selected: true })))}
                  className="px-3 py-2 rounded-xl text-xs font-medium"
                  style={{ background: c.pBg, color: c.primary, border: `1px solid ${c.pBorder}` }}>
                  Select All
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto" style={{ maxHeight: '480px', overflowY: 'auto' }}>
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10">
                  <tr style={{ borderBottom: `1px solid ${c.divider}`, background: isDark ? '#0F172A' : '#F8FAFC' }}>
                    {['', 'Product Name', 'Qty', 'Batch No', 'Expiry', 'Cost Price', 'Sell Price', 'Margin', 'AI Match', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: c.subtle }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, i) => {
                    const margin = ((item.sellingPrice - item.costPrice) / item.sellingPrice * 100).toFixed(0);
                    return (
                      <tr key={item.id}
                        className="transition-colors"
                        style={{
                          borderBottom: i < filteredItems.length - 1 ? `1px solid ${c.divider}` : 'none',
                          background: !item.selected ? (isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)') : 'transparent',
                          opacity: item.selected ? 1 : 0.45,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                        onMouseLeave={e => (e.currentTarget.style.background = !item.selected ? (isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)') : 'transparent')}>
                        {/* Checkbox */}
                        <td className="px-4 py-3">
                          <button onClick={() => toggleItem(item.id)}
                            className="w-5 h-5 rounded-md flex items-center justify-center transition-all"
                            style={{
                              background: item.selected ? c.primary : 'transparent',
                              border: `2px solid ${item.selected ? c.primary : c.border}`,
                            }}>
                            {item.selected && <CheckCircle size={12} style={{ color: isDark ? '#0A0E1A' : '#fff' }} />}
                          </button>
                        </td>
                        {/* Name */}
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold whitespace-nowrap" style={{ color: c.text }}>{item.name}</p>
                        </td>
                        {/* Qty */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => updateQty(item.id, -1)}
                              className="w-6 h-6 rounded-lg flex items-center justify-center"
                              style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
                              <Minus size={11} />
                            </button>
                            <span className="font-mono text-sm font-bold w-8 text-center" style={{ color: c.text }}>{item.qty}</span>
                            <button onClick={() => updateQty(item.id, 1)}
                              className="w-6 h-6 rounded-lg flex items-center justify-center"
                              style={{ background: c.pBg, color: c.primary }}>
                              <Plus size={11} />
                            </button>
                          </div>
                        </td>
                        {/* Batch */}
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: c.muted }}>{item.batchNo}</td>
                        {/* Expiry */}
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs px-2 py-1 rounded-lg"
                            style={{
                              background: item.expiry ? (item.expiry.includes('26') ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.08)') : 'rgba(148,163,184,0.1)',
                              color: item.expiry ? (item.expiry.includes('26') ? '#EF4444' : '#10B981') : c.subtle,
                            }}>
                            {item.expiry || 'N/A'}
                          </span>
                        </td>
                        {/* Cost */}
                        <td className="px-4 py-3 font-mono text-sm" style={{ color: c.muted }}>
                          GH₵ {item.costPrice.toFixed(2)}
                        </td>
                        {/* Sell */}
                        <td className="px-4 py-3 font-mono text-sm font-bold" style={{ color: c.primary }}>
                          GH₵ {item.sellingPrice.toFixed(2)}
                        </td>
                        {/* Margin */}
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-bold px-2 py-1 rounded-lg"
                            style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
                            {margin}%
                          </span>
                        </td>
                        {/* Confidence */}
                        <td className="px-4 py-3">
                          <ConfidencePill value={item.confidence} />
                        </td>
                        {/* Delete */}
                        <td className="px-4 py-3">
                          <button onClick={() => removeItem(item.id)}
                            className="p-1.5 rounded-lg opacity-0 hover:opacity-100 transition-all"
                            style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t flex items-center justify-between"
              style={{ borderColor: c.border, background: c.sectionBg }}>
              <button onClick={() => { setStep(1); setUploadState('idle'); setItems([]); setUploadedFile(null); setUploadedPreview(null); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', color: c.muted, border: `1px solid ${c.border}` }}>
                <X size={15} />
                Start Over
              </button>
              <div className="flex items-center gap-3">
                <p className="text-sm" style={{ color: c.muted }}>
                  <span className="font-bold" style={{ color: c.text }}>{selectedItems.length}</span> of {items.length} items selected
                </p>
                <button onClick={handleSync} disabled={selectedItems.length === 0}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-40"
                  style={{
                    background: isDark ? 'linear-gradient(135deg,#00D9FF,#00A3CC)' : 'linear-gradient(135deg,#0EA5E9,#0284C7)',
                    color: isDark ? '#0A0E1A' : '#fff',
                    boxShadow: isDark ? '0 8px 25px rgba(0,217,255,0.3)' : '0 8px 25px rgba(14,165,233,0.3)',
                  }}>
                  {syncing ? <><Loader2 size={16} className="animate-spin" /> Syncing...</> : <><RefreshCw size={16} /> Sync to Inventory</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Done */}
      {step === 3 && (
        <div className="rounded-2xl border backdrop-blur-xl p-12 flex flex-col items-center text-center"
          style={{ background: c.bg, borderColor: c.border, boxShadow: c.shadow }}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
            style={{ background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.3)' }}>
            <CheckCircle size={40} style={{ color: '#10B981' }} />
          </div>
          <h2 className="font-display text-2xl font-bold mb-2" style={{ color: c.text }}>
            Inventory Synced Successfully
          </h2>
          <p className="text-sm mb-2" style={{ color: c.muted }}>
            {selectedItems.length} products have been added to your inventory with batch tracking and expiry monitoring.
          </p>
          <div className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full mb-8"
            style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' }}>
            <ShieldCheck size={15} />
            Stock alerts and expiry warnings are now active
          </div>
          <div className="grid grid-cols-3 gap-6 mb-8 w-full max-w-md">
            {[
              { label: 'Products Added', value: selectedItems.length, color: c.primary },
              { label: 'Total Cost', value: `GH₵ ${totalCost.toLocaleString('en',{maximumFractionDigits:0})}`, color: '#EF4444' },
              { label: 'Retail Value', value: `GH₵ ${totalRetail.toLocaleString('en',{maximumFractionDigits:0})}`, color: '#10B981' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-4 border text-center"
                style={{ background: c.sectionBg, borderColor: c.border }}>
                <p className="font-display text-xl font-bold mb-1" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[11px]" style={{ color: c.subtle }}>{s.label}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <a href="/dashboard/inventory"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm"
              style={{
                background: isDark ? 'linear-gradient(135deg,#00D9FF,#00A3CC)' : 'linear-gradient(135deg,#0EA5E9,#0284C7)',
                color: isDark ? '#0A0E1A' : '#fff',
                boxShadow: isDark ? '0 8px 25px rgba(0,217,255,0.3)' : '0 8px 25px rgba(14,165,233,0.3)',
              }}>
              <Package size={16} />
              View Inventory
            </a>
            <button onClick={() => { setStep(1); setUploadState('idle'); setItems([]); setUploadedFile(null); setUploadedPreview(null); setSyncDone(false); }}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm"
              style={{ background: c.pBg, color: c.primary, border: `1px solid ${c.pBorder}` }}>
              <Upload size={16} />
              New Invoice
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
