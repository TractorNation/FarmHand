use std::fs;
use tauri::Error;

pub fn save(schema: &String, file_path: &String) -> Result<(), Error> {
    fs::write(&file_path, schema).expect("Failed to write to schema JSON");

    Ok(())
}
