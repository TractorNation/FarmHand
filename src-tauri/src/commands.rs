use crate::{core::qr};

#[tauri::command]
pub fn generate_qr_code(data: String) -> Result<String, String> {
    qr::encode_to_svg(&data).map_err(|e| e.to_string())
}
