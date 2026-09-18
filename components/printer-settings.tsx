'use client';

import { useEffect, useRef, useState } from 'react';
import { Printer, CheckCircle2, X, RefreshCw } from 'lucide-react';
import {
  isTauri,
  nativeListPrinters,
  type PrinterInfo,
} from '@/lib/tauri-native';
import {
  getPrinterConfig,
  savePrinterConfig,
  tryThermalPrint,
  type PrinterConfig,
} from '@/lib/print';

/**
 * Printer picker popover — lists system printers via the native layer and
 * optionally a network (TCP :9100) thermal printer. Selection persists in
 * localStorage. Only rendered meaningfully inside the Tauri desktop app.
 */
export function PrinterSettings({ buttonClass }: { buttonClass?: string }) {
  const [open, setOpen] = useState(false);
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [cfg, setCfg] = useState<PrinterConfig>({ name: '', host: '', port: 9100, drawer: true });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const tauri = isTauri();

  useEffect(() => {
    setCfg(getPrinterConfig());
    if (tauri) {
      nativeListPrinters().then(setPrinters).catch(() => setPrinters([]));
    }
  }, [tauri, open]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const update = (patch: Partial<PrinterConfig>) => {
    const next = { ...cfg, ...patch };
    setCfg(next);
    savePrinterConfig(next);
  };

  const testPrint = async () => {
    setTesting(true);
    setTestResult(null);
    const ok = await tryThermalPrint({
      receiptNo: 'TEST-PRINT',
      createdAt: new Date().toISOString(),
      items: [{ quantity: 1, unitPrice: 0.01, total: 0.01, product: { name: 'Printer test' } }],
      totalAmount: 0.01,
      amountPaid: 0.01,
      change: 0,
      paymentMethod: 'TEST',
    });
    setTestResult(ok ? 'ok' : 'fail');
    setTesting(false);
  };

  const currentLabel = cfg.host
    ? `${cfg.host}:${cfg.port}`
    : cfg.name || (printers.find(p => p.is_default)?.name ?? 'Default printer');

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={buttonClass || 'flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/30 hover:bg-white/10 transition-colors text-xs font-medium'}
        title={`Receipt printer: ${currentLabel}`}
      >
        <Printer size={14} />
        <span className="hidden sm:inline max-w-[110px] truncate">{currentLabel}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border shadow-2xl z-50 p-4 space-y-3 bg-slate-900 border-slate-700 text-slate-100">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold flex items-center gap-2"><Printer size={14} /> Receipt Printer</p>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white"><X size={15} /></button>
          </div>

          {!tauri && (
            <p className="text-xs text-amber-400">
              Native printing needs the desktop app — this browser session will use the print dialog.
            </p>
          )}

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">System printer</label>
            <select
              value={cfg.name}
              onChange={e => update({ name: e.target.value, host: e.target.value ? '' : cfg.host })}
              className="w-full mt-1 px-3 py-2 rounded-lg text-xs bg-slate-800 border border-slate-700 focus:outline-none"
            >
              <option value="">Default printer{printers.find(p => p.is_default)?.name ? ` (${printers.find(p => p.is_default)!.name})` : ''}</option>
              {printers.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Or network printer (IP : port)</label>
            <div className="flex gap-2 mt-1">
              <input
                value={cfg.host}
                onChange={e => update({ host: e.target.value.trim() })}
                placeholder="192.168.1.50"
                className="flex-1 px-3 py-2 rounded-lg text-xs bg-slate-800 border border-slate-700 focus:outline-none"
              />
              <input
                value={cfg.port}
                onChange={e => update({ port: parseInt(e.target.value) || 9100 })}
                className="w-20 px-3 py-2 rounded-lg text-xs bg-slate-800 border border-slate-700 focus:outline-none"
                type="number"
              />
            </div>
            {cfg.host && <p className="text-[10px] text-slate-500 mt-1">Network printer overrides the system printer.</p>}
          </div>

          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={cfg.drawer} onChange={e => update({ drawer: e.target.checked })} className="accent-orange-500" />
            Kick cash drawer after printing
          </label>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={testPrint}
              disabled={testing || !tauri}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-orange-600 text-white disabled:opacity-40"
            >
              {testing ? <RefreshCw size={12} className="animate-spin" /> : <Printer size={12} />}
              Test print
            </button>
            {testResult === 'ok' && <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle2 size={13} /> Printed</span>}
            {testResult === 'fail' && <span className="text-xs text-red-400">Failed — check printer</span>}
          </div>
        </div>
      )}
    </div>
  );
}
