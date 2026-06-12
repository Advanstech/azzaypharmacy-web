use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct SaleData {
    id: String,
    items: Vec<SaleItem>,
    total: f64,
    payment_method: String,
    cashier_name: String,
    branch_name: String,
    timestamp: i64,
}

#[derive(Debug, Serialize, Deserialize)]
struct SaleItem {
    name: String,
    qty: i32,
    price: f64,
}

#[derive(Debug, Serialize, Deserialize)]
struct SyncStatus {
    is_online: bool,
    pending_sales: usize,
    last_sync: Option<i64>,
}

#[tauri::command]
async fn check_sync_status() -> Result<SyncStatus, String> {
    // Check if online and count pending sales
    // The actual offline storage is handled by IndexedDB in the frontend
    Ok(SyncStatus {
        is_online: true,
        pending_sales: 0,
        last_sync: Some(chrono::Utc::now().timestamp()),
    })
}

#[tauri::command]
async fn print_receipt(sale: SaleData) -> Result<(), String> {
    // Print thermal receipt using system print dialog
    log::info!("Printing receipt for sale: {}", sale.id);
    // The actual printing will be handled by the frontend using window.print()
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_log::Builder::default().build())
    .invoke_handler(tauri::generate_handler![
        check_sync_status,
        print_receipt,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
