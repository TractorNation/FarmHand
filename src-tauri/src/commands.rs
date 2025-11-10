use crate::core::{qr, util};
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
