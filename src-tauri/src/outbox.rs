//! Durable SQLite outbox for offline sales.
//!
//! Lives in the app's data dir — survives webview reloads, crashes, and
//! OS-level cache eviction that can hit IndexedDB. The JS side enqueues a
//! fully-formed GraphQL `variables` object; the sync daemon drains it.

use rusqlite::{params, Connection};
use serde::Serialize;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, Clone)]
pub struct OutboxRow {
    pub id: String,
    pub variables: String,
    /// Full GraphQL mutation text for this op. NULL = legacy createSale row.
    pub mutation: Option<String>,
    pub status: String,
    pub attempts: i64,
    pub last_error: Option<String>,
    pub created_at: i64,
}

#[derive(Debug, Serialize)]
pub struct QueueStats {
    pub pending: i64,
    pub dead: i64,
    pub oldest_pending: Option<i64>,
}

fn db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("create_dir_all: {e}"))?;
    Ok(dir.join("nexus_outbox.db"))
}

pub fn open(path: &PathBuf) -> Result<Connection, String> {
    let conn = Connection::open(path).map_err(|e| format!("sqlite open: {e}"))?;
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         CREATE TABLE IF NOT EXISTS pending_sales (
           id          TEXT PRIMARY KEY,
           variables   TEXT NOT NULL,
           status      TEXT NOT NULL DEFAULT 'pending',
           attempts    INTEGER NOT NULL DEFAULT 0,
           last_error  TEXT,
           created_at  INTEGER NOT NULL
         );",
    )
    .map_err(|e| format!("sqlite init: {e}"))?;

    // Migrate: add mutation column for non-createSale ops (held sales, etc.)
    let has_mutation_col: bool = conn
        .prepare("PRAGMA table_info(pending_sales)")
        .map_err(|e| format!("pragma: {e}"))?
        .query_map([], |r| r.get::<_, String>(1))
        .map_err(|e| format!("pragma query: {e}"))?
        .collect::<Result<Vec<String>, _>>()
        .map_err(|e| format!("pragma collect: {e}"))?
        .iter()
        .any(|c| c == "mutation");
    if !has_mutation_col {
        conn.execute("ALTER TABLE pending_sales ADD COLUMN mutation TEXT", [])
            .map_err(|e| format!("migrate mutation col: {e}"))?;
    }

    Ok(conn)
}

pub fn open_for_app(app: &AppHandle) -> Result<Connection, String> {
    open(&db_path(app)?)
}

pub fn enqueue(
    conn: &Connection,
    id: &str,
    variables: &str,
    mutation: Option<&str>,
) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO pending_sales (id, variables, mutation, status, attempts, created_at)
         VALUES (?1, ?2, ?3, 'pending', 0, ?4)",
        params![id, variables, mutation, chrono::Utc::now().timestamp()],
    )
    .map_err(|e| format!("enqueue: {e}"))?;
    Ok(())
}

pub fn list(conn: &Connection, status: &str) -> Result<Vec<OutboxRow>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, variables, mutation, status, attempts, last_error, created_at
             FROM pending_sales WHERE status = ?1 ORDER BY created_at ASC",
        )
        .map_err(|e| format!("list prepare: {e}"))?;
    let rows = stmt
        .query_map(params![status], |r| {
            Ok(OutboxRow {
                id: r.get(0)?,
                variables: r.get(1)?,
                mutation: r.get(2)?,
                status: r.get(3)?,
                attempts: r.get(4)?,
                last_error: r.get(5)?,
                created_at: r.get(6)?,
            })
        })
        .map_err(|e| format!("list query: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("list collect: {e}"))?;
    Ok(rows)
}

pub fn remove(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM pending_sales WHERE id = ?1", params![id])
        .map_err(|e| format!("remove: {e}"))?;
    Ok(())
}

pub fn mark_failed(
    conn: &Connection,
    id: &str,
    error: &str,
    dead_after: i64,
) -> Result<bool, String> {
    conn.execute(
        "UPDATE pending_sales SET attempts = attempts + 1, last_error = ?2 WHERE id = ?1",
        params![id, error],
    )
    .map_err(|e| format!("mark_failed: {e}"))?;
    let attempts: i64 = conn
        .query_row(
            "SELECT attempts FROM pending_sales WHERE id = ?1",
            params![id],
            |r| r.get(0),
        )
        .map_err(|e| format!("mark_failed read: {e}"))?;
    if attempts >= dead_after {
        conn.execute(
            "UPDATE pending_sales SET status = 'dead' WHERE id = ?1",
            params![id],
        )
        .map_err(|e| format!("mark_dead: {e}"))?;
        return Ok(true);
    }
    Ok(false)
}

pub fn stats(conn: &Connection) -> Result<QueueStats, String> {
    let pending: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM pending_sales WHERE status = 'pending'",
            [],
            |r| r.get(0),
        )
        .map_err(|e| format!("stats pending: {e}"))?;
    let dead: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM pending_sales WHERE status = 'dead'",
            [],
            |r| r.get(0),
        )
        .map_err(|e| format!("stats dead: {e}"))?;
    let oldest: Option<i64> = conn
        .query_row(
            "SELECT MIN(created_at) FROM pending_sales WHERE status = 'pending'",
            [],
            |r| r.get(0),
        )
        .map_err(|e| format!("stats oldest: {e}"))?;
    Ok(QueueStats {
        pending,
        dead,
        oldest_pending: oldest,
    })
}
