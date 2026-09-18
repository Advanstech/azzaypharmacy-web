/**
 * Azzay Pharmacy NEXUS — Receipt Printing
 *
 * In Tauri: silent ESC/POS thermal printing via the native layer — either a
 * named system printer (RAW spool, no dialog) or a network printer (TCP :9100).
 * In the browser: callers fall back to the HTML window.print() path.
 *
 * Printer selection persists in localStorage so it survives restarts.
 */

import {
  isTauri,
  nativePrintReceipt,
  nativePrintReceiptTcp,
  type ReceiptPayload,
} from './tauri-native';

export interface PrinterConfig {
  /** System printer name (e.g. "XP-80C"). Empty = default printer. */
  name: string;
  /** Optional network printer host — takes precedence over name when set. */
  host: string;
  port: number;
  /** Kick the cash drawer after printing. */
  drawer: boolean;
}

const KEY = 'nexus_printer_config';

export function getPrinterConfig(): PrinterConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        name: p.name || '',
        host: p.host || '',
        port: p.port || 9100,
        drawer: !!p.drawer,
      };
    }
  } catch {}
  return { name: '', host: '', port: 9100, drawer: true };
}

export function savePrinterConfig(cfg: PrinterConfig) {
  try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch {}
}

/** Map a store Sale to the native receipt payload. */
export function saleToReceipt(sale: any, opts?: { shopName?: string; branchName?: string; cashier?: string }): ReceiptPayload {
  return {
    shop_name: opts?.shopName || 'AZZAY PHARMACY NEXUS',
    branch_name: opts?.branchName,
    receipt_no: sale.receiptNo || String(sale.id || '').slice(-10).toUpperCase(),
    cashier: opts?.cashier || sale.user?.name || sale.cashier?.name,
    customer: sale.customerName,
    date: sale.createdAt ? new Date(sale.createdAt).toLocaleString() : new Date().toLocaleString(),
    items: (sale.items || []).map((it: any) => ({
      name: it.product?.name || it.name || 'Item',
      qty: it.quantity ?? it.qty ?? 1,
      price: it.unitPrice ?? it.price ?? it.product?.sellingPrice ?? 0,
      total: it.total ?? ((it.quantity ?? 1) * (it.unitPrice ?? it.price ?? 0)),
    })),
    total: sale.totalAmount ?? sale.total ?? 0,
    amount_paid: sale.amountPaid,
    change: sale.change,
    discount: sale.discountAmt > 0 ? sale.discountAmt : undefined,
    payment_method: sale.paymentMethod,
    paper_width: 80,
  };
}

/**
 * Try native thermal printing. Returns true if a print job was sent —
 * false when not in Tauri or printing failed (caller should fall back
 * to the HTML print path).
 */
export async function tryThermalPrint(sale: any, opts?: { shopName?: string; branchName?: string; cashier?: string }): Promise<boolean> {
  if (!isTauri()) return false;
  const cfg = getPrinterConfig();
  const receipt = saleToReceipt(sale, opts);
  try {
    if (cfg.host) {
      await nativePrintReceiptTcp(receipt, cfg.host, cfg.port, cfg.drawer);
    } else {
      await nativePrintReceipt(receipt, cfg.name || undefined, cfg.drawer);
    }
    return true;
  } catch (e) {
    console.error('[print] thermal print failed:', e);
    return false;
  }
}
