use qrcode_generator::{QRCodeError, QrCodeEcc};

pub fn encode_to_svg(data: &String) -> Result<std::string::String, QRCodeError> {
    // Create SVG QR code
    qrcode_generator::to_svg_to_string(data, QrCodeEcc::Low, 265, None::<&str>)
}
