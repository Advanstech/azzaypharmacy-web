//! ESC/POS thermal receipt printing — works fully offline.
//!
//! Two delivery paths:
//!   1. System printer by name via the OS spooler in RAW mode (`printers` crate)
//!      — works with any installed driver (USB thermal printers incl. Xprinter/
//!      Epson clones appear as normal Windows printers).
//!   2. Direct TCP to a network printer on port 9100 (zero drivers needed).
//!
//! Receipt layout is generated here in Rust as raw ESC/POS bytes, so printing
//! is silent (no dialog), instant, and identical every time.

use serde::{Deserialize, Serialize};
use std::io::Write;
use std::net::TcpStream;
use std::time::Duration;

#[derive(Debug, Deserialize)]
pub struct ReceiptItem {
    pub name: String,
    pub qty: f64,
    pub price: f64,
    pub total: f64,
}

#[derive(Debug, Deserialize)]
pub struct ReceiptData {
    #[serde(default = "default_shop")]
    pub shop_name: String,
    #[serde(default)]
    pub branch_name: Option<String>,
    #[serde(default)]
    pub address: Option<String>,
    #[serde(default)]
    pub phone: Option<String>,
    pub receipt_no: String,
    #[serde(default)]
    pub cashier: Option<String>,
    #[serde(default)]
    pub customer: Option<String>,
    #[serde(default)]
    pub date: Option<String>,
    pub items: Vec<ReceiptItem>,
    pub total: f64,
    #[serde(default)]
    pub amount_paid: Option<f64>,
    #[serde(default)]
    pub change: Option<f64>,
    #[serde(default)]
    pub discount: Option<f64>,
    #[serde(default)]
    pub payment_method: Option<String>,
    #[serde(default)]
    pub footer: Option<String>,
    /// Paper width in mm — 58 or 80. Controls chars-per-line.
    #[serde(default = "default_width")]
    pub paper_width: u8,
}

fn default_shop() -> String {
    "AZZAY PHARMACY".to_string()
}
fn default_width() -> u8 {
    80
}

#[derive(Debug, Serialize)]
pub struct PrinterInfo {
    pub name: String,
    pub is_default: bool,
}

// ── ESC/POS byte building ────────────────────────────────────────────────────

const ESC: u8 = 0x1B;
const GS: u8 = 0x1D;

fn align_center(b: &mut Vec<u8>) {
    b.extend_from_slice(&[ESC, 0x61, 0x01]);
}
fn align_left(b: &mut Vec<u8>) {
    b.extend_from_slice(&[ESC, 0x61, 0x00]);
}
fn bold_on(b: &mut Vec<u8>) {
    b.extend_from_slice(&[ESC, 0x45, 0x01]);
}
fn bold_off(b: &mut Vec<u8>) {
    b.extend_from_slice(&[ESC, 0x45, 0x00]);
}
fn double_size_on(b: &mut Vec<u8>) {
    b.extend_from_slice(&[GS, 0x21, 0x11]);
}
fn normal_size(b: &mut Vec<u8>) {
    b.extend_from_slice(&[GS, 0x21, 0x00]);
}
fn line(b: &mut Vec<u8>, s: &str) {
    b.extend_from_slice(s.as_bytes());
    b.push(b'\n');
}
fn rule(b: &mut Vec<u8>, width: usize) {
    line(b, &"-".repeat(width));
}

/// Two-column line: label left, value right, padded to `width` chars.
fn kv_line(b: &mut Vec<u8>, label: &str, value: &str, width: usize) {
    let pad = width.saturating_sub(label.chars().count() + value.chars().count());
    line(b, &format!("{}{}{}", label, " ".repeat(pad.max(1)), value));
}

fn money(v: f64) -> String {
    format!("{:.2}", v)
}

pub fn build_receipt(r: &ReceiptData) -> Vec<u8> {
    let width: usize = if r.paper_width == 58 { 32 } else { 48 };
    let mut b: Vec<u8> = Vec::with_capacity(2048);

    // Init
    b.extend_from_slice(&[ESC, 0x40]);

    // Header
    align_center(&mut b);
    double_size_on(&mut b);
    bold_on(&mut b);
    line(&mut b, &r.shop_name);
    normal_size(&mut b);
    bold_off(&mut b);
    if let Some(branch) = &r.branch_name {
        line(&mut b, branch);
    }
    if let Some(addr) = &r.address {
        line(&mut b, addr);
    }
    if let Some(phone) = &r.phone {
        line(&mut b, phone);
    }
    rule(&mut b, width);

    // Meta
    align_left(&mut b);
    kv_line(&mut b, "Receipt:", &r.receipt_no, width);
    if let Some(d) = &r.date {
        kv_line(&mut b, "Date:", d, width);
    }
    if let Some(c) = &r.cashier {
        kv_line(&mut b, "Cashier:", c, width);
    }
    if let Some(c) = &r.customer {
        kv_line(&mut b, "Customer:", c, width);
    }
    rule(&mut b, width);

    // Items
    for it in &r.items {
        let name = if it.name.chars().count() > width {
            it.name.chars().take(width - 1).collect::<String>()
        } else {
            it.name.clone()
        };
        line(&mut b, &name);
        let qty_price = format!("  {} x {}", it.qty, money(it.price));
        kv_line(&mut b, &qty_price, &money(it.total), width);
    }
    rule(&mut b, width);

    // Totals
    if let Some(d) = r.discount {
        if d > 0.0 {
            kv_line(&mut b, "Discount:", &format!("-{}", money(d)), width);
        }
    }
    bold_on(&mut b);
    double_size_on(&mut b);
    kv_line(&mut b, "TOTAL:", &money(r.total), width);
    normal_size(&mut b);
    bold_off(&mut b);
    if let Some(p) = r.amount_paid {
        kv_line(&mut b, "Paid:", &money(p), width);
    }
    if let Some(ch) = r.change {
        kv_line(&mut b, "Change:", &money(ch), width);
    }
    if let Some(m) = &r.payment_method {
        kv_line(&mut b, "Method:", m, width);
    }
    rule(&mut b, width);

    // Footer
    align_center(&mut b);
    line(
        &mut b,
        r.footer.as_deref().unwrap_or("Thank you for your visit!"),
    );
    line(&mut b, "Powered by Azzay Pharmacy NEXUS");

    // Feed + cut
    b.extend_from_slice(&[ESC, 0x64, 0x04]); // feed 4 lines
    b.extend_from_slice(&[GS, 0x56, 0x41, 0x03]); // partial cut

    b
}

/// Cash-drawer kick pulse (ESC p 0 25 250).
pub fn drawer_kick() -> Vec<u8> {
    vec![ESC, 0x70, 0x00, 0x19, 0xFA]
}

// ── Delivery paths ───────────────────────────────────────────────────────────

pub fn list_printers() -> Result<Vec<PrinterInfo>, String> {
    let all = printers::get_printers();
    let default_name = printers::get_default_printer().map(|p| p.name);
    Ok(all
        .into_iter()
        .map(|p| PrinterInfo {
            is_default: Some(&p.name) == default_name.as_ref(),
            name: p.name,
        })
        .collect())
}

pub fn print_raw(printer_name: &str, data: &[u8]) -> Result<(), String> {
    let all = printers::get_printers();
    let printer = all
        .into_iter()
        .find(|p| p.name == printer_name)
        .or_else(|| printers::get_default_printer())
        .ok_or_else(|| format!("printer '{printer_name}' not found"))?;
    printer
        .print(data, printers::common::base::job::PrinterJobOptions::none())
        .map(|_| ())
        .map_err(|e| format!("print job failed: {e:?}"))
}

pub fn print_tcp(host: &str, port: u16, data: &[u8]) -> Result<(), String> {
    let addr = format!("{host}:{port}");
    let mut stream = TcpStream::connect_timeout(
        &addr.parse().map_err(|e| format!("bad address: {e}"))?,
        Duration::from_secs(4),
    )
    .map_err(|e| format!("connect {addr}: {e}"))?;
    stream.set_write_timeout(Some(Duration::from_secs(10))).ok();
    stream
        .write_all(data)
        .and_then(|_| stream.flush())
        .map_err(|e| format!("write {addr}: {e}"))
}
