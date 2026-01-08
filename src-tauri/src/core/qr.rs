use qrcode::{render::svg, QrCode};
use std::fs;
use tauri::Error;

pub fn encode_to_svg(data: &String) -> Result<String, String> {
    // Generate QR code
    let code =
        QrCode::new(data.as_bytes()).map_err(|e| format!("Failed to generate QR code: {}", e))?;

    let svg = code
        .render::<svg::Color>()
        .quiet_zone(true) // Disable automatic quiet zone
        .min_dimensions(265, 265)
        .build();

    Ok(svg)
}

pub fn save_as_svg(svg: &String, file_path: &String) -> Result<(), Error> {
    fs::write(&file_path, svg).expect("Failed to write to svg file");

    Ok(())
}

pub fn delete_code(path: &String) -> Result<(), Error> {
    fs::remove_file(&path).expect("Failed to delete file");

    Ok(())
}
