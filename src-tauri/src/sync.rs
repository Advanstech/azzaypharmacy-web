//! Native background sync daemon.
//!
//! Runs on Tauri's async runtime, independent of webview JS state:
//!   - probes the API every ~15s (real HTTP, not navigator.onLine)
//!   - drains the SQLite outbox oldest-first when the API is reachable
//!   - emits `nexus://connectivity` and `nexus://sync-status` events so the
//!     frontend renders live status
//!
//! The queued payload is a fully-formed GraphQL `variables` object built by
//! the webview — the daemon stays generic and never maps sale fields.

use serde::Serialize;
use serde_json::json;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

use crate::outbox;

const PROBE_INTERVAL: Duration = Duration::from_secs(15);
const PROBE_TIMEOUT: Duration = Duration::from_secs(5);
const REQUEST_TIMEOUT: Duration = Duration::from_secs(90);
const MAX_ATTEMPTS: i64 = 8;

const SYNC_MUTATION: &str = r#"mutation SyncSale(
  $userId: String!, $branchId: String!, $items: [SaleItemInput!]!,
  $paymentMethod: PaymentMethod!, $amountPaid: Float!,
  $customerId: String, $customerName: String, $customerPhone: String,
  $customerEmail: String, $cashAmount: Float, $momoAmount: Float,
  $clientRef: String
) {
  createSale(
    userId: $userId, branchId: $branchId, items: $items,
    paymentMethod: $paymentMethod, amountPaid: $amountPaid,
    customerId: $customerId, customerName: $customerName,
    customerPhone: $customerPhone, customerEmail: $customerEmail,
    cashAmount: $cashAmount, momoAmount: $momoAmount, clientRef: $clientRef
  ) { id receiptNo totalAmount }
}"#;

#[derive(Default)]
pub struct SyncConfig {
    pub api_url: Option<String>,
    pub token: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
struct SyncStatus {
    state: String, // "online" | "offline" | "syncing"
    pending: i64,
    synced: i64,
    failed: i64,
    last_error: Option<String>,
    last_sync: Option<i64>,
}

fn api_root(api_url: &str) -> String {
    match api_url.find("/graphql") {
        Some(i) => api_url[..i].to_string(),
        None => api_url.trim_end_matches('/').to_string(),
    }
}

fn emit_status(app: &AppHandle, s: &SyncStatus) {
    let _ = app.emit("nexus://sync-status", s.clone());
}

async fn probe(client: &reqwest::Client, api_url: &str) -> bool {
    let root = api_root(api_url);
    match client
        .get(format!("{root}/"))
        .timeout(PROBE_TIMEOUT)
        .send()
        .await
    {
        Ok(res) => res.status().as_u16() < 600,
        Err(_) => false,
    }
}

fn is_permanent_error(msg: &str) -> bool {
    let m = msg.to_lowercase();
    m.contains("not found")
        || m.contains("invalid")
        || m.contains("validation")
        || m.contains("unauthorized")
        || m.contains("forbidden")
        || m.contains("graphql")
}

async fn drain_queue(app: &AppHandle, client: &reqwest::Client, cfg: &SyncConfig) {
    let api_url = match &cfg.api_url {
        Some(u) => u.clone(),
        None => return,
    };
    let token = cfg.token.clone();

    let conn = match outbox::open_for_app(app) {
        Ok(c) => c,
        Err(e) => {
            log::error!("[sync] outbox open failed: {e}");
            return;
        }
    };

    let rows = match outbox::list(&conn, "pending") {
        Ok(r) => r,
        Err(e) => {
            log::error!("[sync] outbox list failed: {e}");
            return;
        }
    };
    if rows.is_empty() {
        return;
    }

    let mut synced = 0i64;
    let mut failed = 0i64;

    for row in rows {
        let variables: serde_json::Value = match serde_json::from_str(&row.variables) {
            Ok(v) => v,
            Err(e) => {
                let _ = outbox::mark_failed(&conn, &row.id, &format!("bad payload: {e}"), 1);
                failed += 1;
                continue;
            }
        };

        let mutation = row.mutation.as_deref().unwrap_or(SYNC_MUTATION);
        let mut req = client
            .post(&api_url)
            .timeout(REQUEST_TIMEOUT)
            .json(&json!({ "query": mutation, "variables": variables }));
        if let Some(t) = &token {
            req = req.bearer_auth(t);
        }

        match req.send().await {
            Ok(res) => {
                let status = res.status();
                let body = res.text().await.unwrap_or_default();
                let has_errors = body.contains("\"errors\"");
                if status.is_success() && !has_errors {
                    let _ = outbox::remove(&conn, &row.id);
                    synced += 1;
                    log::info!("[sync] synced sale {}", row.id);
                } else {
                    let msg = format!("HTTP {status}: {}", &body[..body.len().min(300)]);
                    let dead =
                        outbox::mark_failed(&conn, &row.id, &msg, MAX_ATTEMPTS).unwrap_or(false);
                    if is_permanent_error(&msg) && dead {
                        log::warn!("[sync] sale {} retired as dead: {}", row.id, msg);
                    }
                    failed += 1;
                    log::warn!("[sync] sale {} failed: {}", row.id, msg);
                }
            }
            Err(e) => {
                // Connectivity dropped mid-drain — stop, retry next cycle
                log::warn!("[sync] request error, pausing drain: {e}");
                break;
            }
        }

        let stats = outbox::stats(&conn).unwrap_or(outbox::QueueStats {
            pending: 0,
            dead: 0,
            oldest_pending: None,
        });
        emit_status(
            app,
            &SyncStatus {
                state: "syncing".into(),
                pending: stats.pending,
                synced,
                failed,
                last_error: None,
                last_sync: Some(chrono::Utc::now().timestamp()),
            },
        );
    }

    if synced > 0 || failed > 0 {
        let stats = outbox::stats(&conn).unwrap_or(outbox::QueueStats {
            pending: 0,
            dead: 0,
            oldest_pending: None,
        });
        emit_status(
            app,
            &SyncStatus {
                state: "online".into(),
                pending: stats.pending,
                synced,
                failed,
                last_error: None,
                last_sync: Some(chrono::Utc::now().timestamp()),
            },
        );
    }
}

/// Run one drain cycle on demand (manual "sync now" from the UI).
pub async fn drain_once(app: &AppHandle, cfg: &SyncConfig) {
    if cfg.api_url.is_none() {
        return;
    }
    let client = reqwest::Client::new();
    drain_queue(app, &client, cfg).await;
}

pub fn spawn_daemon(app: AppHandle, cfg: std::sync::Arc<Mutex<SyncConfig>>) {
    tauri::async_runtime::spawn(async move {
        let client = reqwest::Client::new();
        let mut was_online = false;

        loop {
            let api_url = cfg.lock().ok().and_then(|c| c.api_url.clone());

            let online = match &api_url {
                Some(url) => probe(&client, url).await,
                None => false,
            };

            if online != was_online {
                let _ = app.emit(
                    "nexus://connectivity",
                    json!({ "online": online, "ts": chrono::Utc::now().timestamp() }),
                );
                was_online = online;
            }

            if online {
                let snapshot = cfg.lock().ok().map(|c| SyncConfig {
                    api_url: c.api_url.clone(),
                    token: c.token.clone(),
                });
                if let Some(c) = snapshot {
                    drain_queue(&app, &client, &c).await;
                }

                // Emit resting status (pending count may have changed)
                if let Ok(conn) = outbox::open_for_app(&app) {
                    if let Ok(stats) = outbox::stats(&conn) {
                        emit_status(
                            &app,
                            &SyncStatus {
                                state: "online".into(),
                                pending: stats.pending,
                                synced: 0,
                                failed: 0,
                                last_error: None,
                                last_sync: None,
                            },
                        );
                    }
                }
            } else {
                emit_status(
                    &app,
                    &SyncStatus {
                        state: "offline".into(),
                        pending: -1,
                        synced: 0,
                        failed: 0,
                        last_error: None,
                        last_sync: None,
                    },
                );
            }

            tokio::time::sleep(PROBE_INTERVAL).await;
        }
    });
}
