use std::io::{Read, Write};

use base64::{engine::general_purpose, Engine};
use flate2::{read::ZlibDecoder, write::ZlibEncoder, Compression};

pub fn hash_data(data: &String) -> Result<String, String> {
    let hashed = md5::compute(data);
    let result = format!("{:x}", hashed)[..8].to_string();
    Ok(result)
}

pub fn deflate_data(input: &String) -> Result<String, String> {
    let mut encoder = ZlibEncoder::new(Vec::new(), Compression::default());
    encoder
        .write_all(input.as_bytes())
        .map_err(|e| e.to_string())?;
    let compressed = encoder.finish().map_err(|e| e.to_string())?;

    let encoded = general_purpose::STANDARD.encode(compressed);
    Ok(encoded)
}

pub fn inflate_data(input: &String) -> Result<String, String> {
    let compressed_bytes = general_purpose::STANDARD
        .decode(input)
        .map_err(|e| e.to_string())?;

    let mut decoder = ZlibDecoder::new(&compressed_bytes[..]);
    let mut decompressed = String::new();
    decoder
        .read_to_string(&mut decompressed)
        .map_err(|e| e.to_string())?;

    Ok(decompressed)
}
