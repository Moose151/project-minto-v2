use std::path::PathBuf;
use tauri::Manager;

/// Returns (and creates if missing) the saves directory inside the OS app-data folder.
fn saves_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
  let base = app.path().app_data_dir().map_err(|e| e.to_string())?;
  let dir = base.join("saves");
  std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
  Ok(dir)
}

/// Sanitised path for a save slot (mirrors the old server's slot cleaning).
fn save_path(app: &tauri::AppHandle, slot: &str) -> Result<PathBuf, String> {
  let clean: String = slot
    .chars()
    .filter(|c| c.is_ascii_alphanumeric() || *c == '_' || *c == '-')
    .collect();
  if clean.is_empty() {
    return Err("invalid slot name".into());
  }
  Ok(saves_dir(app)?.join(format!("{clean}.json")))
}

#[derive(serde::Serialize)]
struct SaveEntry {
  slot: String,
  meta: serde_json::Value,
}

/// List all saves with metadata only (autosave first, then newest first).
#[tauri::command]
fn list_saves(app: tauri::AppHandle) -> Vec<SaveEntry> {
  let dir = match saves_dir(&app) {
    Ok(d) => d,
    Err(_) => return vec![],
  };
  let mut entries: Vec<SaveEntry> = vec![];
  if let Ok(rd) = std::fs::read_dir(&dir) {
    for e in rd.flatten() {
      let p = e.path();
      if p.extension().and_then(|s| s.to_str()) != Some("json") {
        continue;
      }
      let slot = p
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_string();
      if slot.is_empty() {
        continue;
      }
      let meta = std::fs::read_to_string(&p)
        .ok()
        .and_then(|raw| serde_json::from_str::<serde_json::Value>(&raw).ok())
        .and_then(|v| v.get("meta").cloned())
        .unwrap_or(serde_json::Value::Null);
      entries.push(SaveEntry { slot, meta });
    }
  }
  entries.sort_by(|a, b| {
    if a.slot == "autosave" {
      return std::cmp::Ordering::Less;
    }
    if b.slot == "autosave" {
      return std::cmp::Ordering::Greater;
    }
    let ta = a.meta.get("savedAt").and_then(|x| x.as_str()).unwrap_or("");
    let tb = b.meta.get("savedAt").and_then(|x| x.as_str()).unwrap_or("");
    tb.cmp(ta)
  });
  entries
}

/// Load a save slot, returning the parsed JSON payload ({minto, pid, G, meta}).
#[tauri::command]
fn load_save(app: tauri::AppHandle, slot: String) -> Result<serde_json::Value, String> {
  let path = save_path(&app, &slot)?;
  let data = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
  serde_json::from_str(&data).map_err(|e| e.to_string())
}

/// Write a save slot.
#[tauri::command]
fn write_save(
  app: tauri::AppHandle,
  slot: String,
  data: serde_json::Value,
) -> Result<(), String> {
  let path = save_path(&app, &slot)?;
  let s = serde_json::to_string(&data).map_err(|e| e.to_string())?;
  std::fs::write(&path, s).map_err(|e| e.to_string())
}

/// Delete a save slot.
#[tauri::command]
fn delete_save(app: tauri::AppHandle, slot: String) -> Result<(), String> {
  let path = save_path(&app, &slot)?;
  std::fs::remove_file(&path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // Work around a WebKitGTK + Wayland DMABUF rendering bug (Gdk "Error 71")
  // that crashes the webview on some Linux/GPU setups. No-op elsewhere.
  #[cfg(target_os = "linux")]
  if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
    std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
  }

  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      list_saves,
      load_save,
      write_save,
      delete_save
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
