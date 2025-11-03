use crate::commands::generate_qr_code;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod commands;
mod core;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![generate_qr_code])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
