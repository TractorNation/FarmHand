use crate::core::{api::{self, EventData, TbaEvent}, qr, schema, util};
use tauri::Error;

#[tauri::command]
pub fn generate_qr_code(data: String) -> Result<String, String> {
    qr::encode_to_svg(&data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_qr_svg(svg: String, file_path: String) -> Result<(), Error> {
    qr::save_as_svg(&svg, &file_path)
}

#[tauri::command]
pub fn hash_schema(schema: String) -> Result<String, String> {
    util::hash_data(&schema)
}

#[tauri::command]
pub fn compress_fields(fields: String) -> Result<String, String> {
    util::deflate_data(&fields)
}

#[tauri::command]
pub fn decompress_data(data: String) -> Result<String, String> {
    util::inflate_data(&data)
}

#[tauri::command]
pub fn delete_qr_code(path: String) -> Result<(), Error> {
    qr::delete_code(&path)
}

#[tauri::command]
pub fn save_schema(schema: String, file_path: String) -> Result<(), Error> {
    schema::save(&schema, &file_path)
}

#[tauri::command]
pub fn delete_schema(path: String) -> Result<(), Error> {
    schema::delete(&path)
}

#[tauri::command]
pub async fn pull_tba_event_data(
    app_handle: tauri::AppHandle,
    api_key: String,
    event_key: String,
) -> Result<EventData, Error> {
    api::fetch_and_save_matches(app_handle, &api_key, &event_key).await
}

#[tauri::command]
pub async fn get_tba_events(api_key: String) -> Result<Vec<TbaEvent>, Error> {
    api::fetch_upcoming_events(&api_key).await
}