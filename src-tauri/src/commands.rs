use crate::core::{
    api::{self, EventData, TbaEvent},
    qr, schema, util,
};
use serde::{Deserialize, Serialize};
use tauri::Error;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TbaDataResponse {
    pub data: Option<EventData>,
    pub is_cached: bool,
    pub message: String,
    pub success: bool,
}

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
) -> Result<TbaDataResponse, String> {
    match api::fetch_and_save_matches(app_handle, &api_key, &event_key).await {
        Ok((event_data, is_cached)) => {
            let message = if is_cached {
                format!(
                    "Using cached data for event '{}' (offline mode). {} matches, {} teams available.",
                    event_key,
                    event_data.matches.len(),
                    event_data.teams.len()
                )
            } else {
                format!(
                    "Successfully pulled data for event '{}'. {} matches, {} teams downloaded.",
                    event_key,
                    event_data.matches.len(),
                    event_data.teams.len()
                )
            };

            Ok(TbaDataResponse {
                data: Some(event_data),
                is_cached,
                message,
                success: true,
            })
        }
        Err(e) => {
            // Create a user-friendly error message based on error type
            let user_message = match e.error_type.as_str() {
                "network" => format!(
                    "Cannot connect to The Blue Alliance. Please check your internet connection. Details: {}",
                    e.message
                ),
                "api" => format!(
                    "The Blue Alliance API error: {}",
                    e.message
                ),
                "filesystem" => format!(
                    "Local storage error: {}",
                    e.message
                ),
                "parsing" => format!(
                    "Data format error: {}. The event data may be corrupted.",
                    e.message
                ),
                "combined" => e.message, // Already formatted in api.rs
                _ => format!("Error: {}", e.message),
            };

            // Return error as a failed response with helpful message
            Ok(TbaDataResponse {
                data: None,
                is_cached: false,
                message: user_message,
                success: false,
            })
        }
    }
}

#[tauri::command]
pub async fn get_tba_events(api_key: String) -> Result<Vec<TbaEvent>, String> {
    match api::fetch_upcoming_events(&api_key).await {
        Ok(events) => Ok(events),
        Err(e) => {
            // Create a user-friendly error message
            let error_message = match e.error_type.as_str() {
                "network" => format!(
                    "Cannot connect to The Blue Alliance. Check your internet connection. ({})",
                    e.message
                ),
                "api" => {
                    if e.message.contains("Invalid")
                        || e.message.contains("401")
                        || e.message.contains("403")
                    {
                        "Invalid TBA API key. Please check your API key in settings.".to_string()
                    } else {
                        format!("TBA API error: {}", e.message)
                    }
                }
                "parsing" => format!("Failed to process event data: {}", e.message),
                _ => format!("Error fetching events: {}", e.message),
            };

            Err(error_message)
        }
    }
}
