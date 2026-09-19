use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InventoryDelta {
    pub id: String,
    pub product_id: String,
    pub branch_id: String,
    pub quantity: f64,
    pub created_at: i64,
}

fn db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("create_dir_all: {e}"))?;
    Ok(dir.join("nexus_outbox.db"))
}

pub fn open_for_app(app: &AppHandle) -> Result<Connection, String> {
    let conn = Connection::open(&db_path(app)?).map_err(|e| format!("sqlite open: {e}"))?;
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         CREATE TABLE IF NOT EXISTS inventory_deltas (
           id          TEXT PRIMARY KEY,
           product_id  TEXT NOT NULL,
           branch_id   TEXT NOT NULL,
           quantity    REAL NOT NULL,
           created_at  INTEGER NOT NULL
         );",
    )
    .map_err(|e| format!("sqlite init: {e}"))?;
    Ok(conn)
}

pub fn record_delta(
    conn: &Connection,
    product_id: &str,
    branch_id: &str,
    quantity: f64,
) -> Result<(), String> {
    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO inventory_deltas (id, product_id, branch_id, quantity, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            id,
            product_id,
            branch_id,
            quantity,
            chrono::Utc::now().timestamp()
        ],
    )
    .map_err(|e| format!("record_delta: {e}"))?;
    Ok(())
}

pub fn get_pending_deltas(conn: &Connection) -> Result<Vec<InventoryDelta>, String> {
    let mut stmt = conn
        .prepare("SELECT id, product_id, branch_id, quantity, created_at FROM inventory_deltas ORDER BY created_at ASC")
        .map_err(|e| format!("prepare: {e}"))?;
    let rows = stmt
        .query_map([], |r| {
            Ok(InventoryDelta {
                id: r.get(0)?,
                product_id: r.get(1)?,
                branch_id: r.get(2)?,
                quantity: r.get(3)?,
                created_at: r.get(4)?,
            })
        })
        .map_err(|e| format!("query: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("collect: {e}"))?;
    Ok(rows)
}

pub fn clear_deltas(conn: &Connection, ids: Vec<String>) -> Result<(), String> {
    for id in ids {
        conn.execute("DELETE FROM inventory_deltas WHERE id = ?1", params![id])
            .map_err(|e| format!("delete delta: {e}"))?;
    }
    Ok(())
}
