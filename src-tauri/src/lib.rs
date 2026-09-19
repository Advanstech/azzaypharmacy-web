mod backup;
mod inventory;
mod outbox;
mod printing;
mod sync;

use serde::Serialize;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, State};

type SharedConfig = Arc<Mutex<sync::SyncConfig>>;

// ── Outbox commands ──────────────────────────────────────────────────────────

#[tauri::command]
fn outbox_enqueue(
    app: AppHandle,
    id: String,
    variables: String,
    mutation: Option<String>,
) -> Result<(), String> {
    let conn = outbox::open_for_app(&app)?;
    outbox::enqueue(&conn, &id, &variables, mutation.as_deref())
}

#[tauri::command]
fn outbox_stats(app: AppHandle) -> Result<outbox::QueueStats, String> {
    let conn = outbox::open_for_app(&app)?;
    outbox::stats(&conn)
}

#[tauri::command]
fn outbox_list(app: AppHandle, status: Option<String>) -> Result<Vec<outbox::OutboxRow>, String> {
    let conn = outbox::open_for_app(&app)?;
    outbox::list(&conn, status.as_deref().unwrap_or("pending"))
}

#[tauri::command]
fn outbox_remove(app: AppHandle, id: String) -> Result<(), String> {
    let conn = outbox::open_for_app(&app)?;
    outbox::remove(&conn, &id)
}

/// Requeue a dead-lettered sale for another sync attempt.
#[tauri::command]
fn outbox_retry(app: AppHandle, id: String) -> Result<(), String> {
    let conn = outbox::open_for_app(&app)?;
    conn.execute(
        "UPDATE pending_sales SET status = 'pending', attempts = 0 WHERE id = ?1",
        rusqlite::params![id],
    )
    .map_err(|e| format!("retry: {e}"))?;
    Ok(())
}

// ── Inventory commands ───────────────────────────────────────────────────────

#[tauri::command]
fn record_inventory_delta(
    app: AppHandle,
    product_id: String,
    branch_id: String,
    quantity: f64,
) -> Result<(), String> {
    let conn = inventory::open_for_app(&app)?;
    inventory::record_delta(&conn, &product_id, &branch_id, quantity)
}

#[tauri::command]
fn get_pending_deltas(app: AppHandle) -> Result<Vec<inventory::InventoryDelta>, String> {
    let conn = inventory::open_for_app(&app)?;
    inventory::get_pending_deltas(&conn)
}

#[tauri::command]
fn clear_inventory_deltas(app: AppHandle, ids: Vec<String>) -> Result<(), String> {
    let conn = inventory::open_for_app(&app)?;
    inventory::clear_deltas(&conn, ids)
}

// ── Backup commands ──────────────────────────────────────────────────────────

#[tauri::command]
fn create_backup(data: String) -> Result<String, String> {
    backup::create_backup(&data)
}

#[tauri::command]
fn list_backups() -> Result<Vec<backup::BackupInfo>, String> {
    backup::list_backups()
}

#[tauri::command]
fn restore_backup(path: String) -> Result<String, String> {
    backup::restore_backup(&path)
}

#[tauri::command]
fn delete_backup(path: String) -> Result<(), String> {
    backup::delete_backup(&path)
}

// ── Sync config ──────────────────────────────────────────────────────────────

#[tauri::command]
fn set_sync_auth(cfg: State<SharedConfig>, api_url: Option<String>, token: Option<String>) {
    if let Ok(mut c) = cfg.lock() {
        if let Some(u) = api_url {
            c.api_url = Some(u);
        }
        c.token = token;
        log::info!(
            "[sync] auth config updated (token set: {})",
            c.token.is_some()
        );
    }
}

/// Kick the daemon's drain loop immediately (manual "sync now").
#[tauri::command]
async fn sync_now(app: AppHandle, cfg: State<'_, SharedConfig>) -> Result<(), String> {
    let snapshot = cfg
        .lock()
        .map_err(|_| "config lock".to_string())?
        .api_url
        .clone();
    let token = cfg
        .lock()
        .map_err(|_| "config lock".to_string())?
        .token
        .clone();
    let c = sync::SyncConfig {
        api_url: snapshot,
        token,
    };
    sync::drain_once(&app, &c).await;
    Ok(())
}

// ── Connectivity ─────────────────────────────────────────────────────────────

#[derive(Serialize)]
struct ProbeResult {
    online: bool,
}

/// One-shot API reachability probe from native code (real TCP+HTTP).
#[tauri::command]
async fn probe_api(api_url: String) -> Result<ProbeResult, String> {
    let root = match api_url.find("/graphql") {
        Some(i) => api_url[..i].to_string(),
        None => api_url.trim_end_matches('/').to_string(),
    };
    let client = reqwest::Client::new();
    let online = client
        .get(format!("{root}/"))
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await
        .map(|r| r.status().as_u16() < 600)
        .unwrap_or(false);
    Ok(ProbeResult { online })
}

// ── Printing ─────────────────────────────────────────────────────────────────

#[tauri::command]
fn list_printers() -> Result<Vec<printing::PrinterInfo>, String> {
    printing::list_printers()
}

/// Print a receipt to a named system printer (RAW spool — silent, no dialog).
#[tauri::command]
fn print_receipt(
    receipt: printing::ReceiptData,
    printer_name: Option<String>,
    open_drawer: Option<bool>,
) -> Result<(), String> {
    let mut data = printing::build_receipt(&receipt);
    if open_drawer.unwrap_or(false) {
        data.extend_from_slice(&printing::drawer_kick());
    }
    match printer_name.as_deref() {
        Some(name) if !name.is_empty() => printing::print_raw(name, &data),
        _ => printing::print_raw("", &data), // falls back to default printer
    }
}

/// Print to a network thermal printer directly (IP:port 9100) — no driver needed.
#[tauri::command]
fn print_receipt_tcp(
    receipt: printing::ReceiptData,
    host: String,
    port: Option<u16>,
    open_drawer: Option<bool>,
) -> Result<(), String> {
    let mut data = printing::build_receipt(&receipt);
    if open_drawer.unwrap_or(false) {
        data.extend_from_slice(&printing::drawer_kick());
    }
    printing::print_tcp(&host, port.unwrap_or(9100), &data)
}

/// Kick the cash drawer only (no print) via the named printer or TCP host.
#[tauri::command]
fn open_drawer(
    printer_name: Option<String>,
    host: Option<String>,
    port: Option<u16>,
) -> Result<(), String> {
    let bytes = printing::drawer_kick();
    if let Some(h) = host {
        return printing::print_tcp(&h, port.unwrap_or(9100), &bytes);
    }
    match printer_name.as_deref() {
        Some(name) if !name.is_empty() => printing::print_raw(name, &bytes),
        _ => printing::print_raw("", &bytes),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let cfg: SharedConfig = Arc::new(Mutex::new(sync::SyncConfig::default()));

    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_log::Builder::default().build())
        .manage(cfg.clone())
        .invoke_handler(tauri::generate_handler![
            outbox_enqueue,
            outbox_stats,
            outbox_list,
            outbox_remove,
            outbox_retry,
            set_sync_auth,
            sync_now,
            probe_api,
            list_printers,
            print_receipt,
            print_receipt_tcp,
            open_drawer,
            record_inventory_delta,
            get_pending_deltas,
            clear_inventory_deltas,
            create_backup,
            list_backups,
            restore_backup,
            delete_backup,
        ])
        .setup(move |app| {
            sync::spawn_daemon(app.handle().clone(), cfg.clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
