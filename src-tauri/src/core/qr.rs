use std::fs;

use qrcode_generator::{QRCodeError, QrCodeEcc};
use tauri::Error;

pub fn encode_to_svg(data: &String) -> Result<std::string::String, QRCodeError> {
    // Create SVG QR code
    qrcode_generator::to_svg_to_string(data, QrCodeEcc::Low, 265, None::<&str>)
}

pub fn save_as_svg(svg: &String, file_path: &String) -> Result<(), Error> {
    fs::write(&file_path, svg).expect("Failed to write to svg file");

    Ok(())
}

pub fn delete_code(path: &String) -> Result<(), Error> {
    fs::remove_file(&path).expect("Failed to delete file");

    Ok(())
}
