use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Serialize, Deserialize)]
pub struct BackupInfo {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub created_at: i64,
}

fn get_backups_dir() -> Result<PathBuf, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let backup_dir = home_dir.join(".azzay-pharmacy").join("backups");

    if !backup_dir.exists() {
        fs::create_dir_all(&backup_dir)
            .map_err(|e| format!("Failed to create backup dir: {}", e))?;
    }

    Ok(backup_dir)
}

pub fn create_backup(data: &str) -> Result<String, String> {
    let backup_dir = get_backups_dir()?;
    let timestamp = chrono::Utc::now().timestamp();
    let filename = format!("backup-{}.json", timestamp);
    let filepath = backup_dir.join(&filename);

    fs::write(&filepath, data).map_err(|e| format!("Failed to write backup file: {}", e))?;

    Ok(filepath.to_string_lossy().to_string())
}

pub fn list_backups() -> Result<Vec<BackupInfo>, String> {
    let backup_dir = get_backups_dir()?;
    let mut backups = Vec::new();

    let entries =
        fs::read_dir(backup_dir).map_err(|e| format!("Failed to read backup dir: {}", e))?;

    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            if path.is_file() && path.extension().map_or(false, |e| e == "json") {
                if let Ok(metadata) = fs::metadata(&path) {
                    let created_at = metadata
                        .modified()
                        .unwrap_or(std::time::SystemTime::now())
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs() as i64;

                    backups.push(BackupInfo {
                        name: path
                            .file_name()
                            .unwrap_or_default()
                            .to_string_lossy()
                            .to_string(),
                        path: path.to_string_lossy().to_string(),
                        size: metadata.len(),
                        created_at,
                    });
                }
            }
        }
    }

    // Sort newest first
    backups.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    Ok(backups)
}

pub fn restore_backup(path: &str) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| format!("Failed to read backup file: {}", e))
}

pub fn delete_backup(path: &str) -> Result<(), String> {
    fs::remove_file(path).map_err(|e| format!("Failed to delete backup file: {}", e))
}
