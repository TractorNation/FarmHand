use qrcode::{render::svg, EcLevel, QrCode};
use std::fs;

pub fn encode_to_svg(data: &String) -> Result<String, String> {
    // Error correction level Q (~25% recoverable) rather than the default M. The
    // bit-packed payload is small enough that the extra redundancy is effectively
    // free, and it buys real reliability when scanning scratched or glare-lit
    // field tablets.
    let code = QrCode::with_error_correction_level(data.as_bytes(), EcLevel::Q)
        .map_err(|e| format!("Failed to generate QR code: {}", e))?;

    let svg = code
        .render::<svg::Color>()
        .quiet_zone(true)
        .min_dimensions(265, 265)
        .build();

    Ok(svg)
}

pub fn save_as_svg(svg: &String, file_path: &String) -> Result<(), String> {
    fs::write(file_path, svg).map_err(|e| format!("Failed to write {}: {}", file_path, e))
}

/// Deletes a saved code, treating "already gone" as success.
///
/// A folder can hold the name of a code that was deleted individually earlier. When
/// the folder is then deleted with its codes, a hard error here rejects the whole
/// batch and the folder itself never gets removed — so absence is the desired end
/// state, not a failure.
pub fn delete_code(path: &String) -> Result<(), String> {
    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(format!("Failed to delete {}: {}", path, e)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn encodes_a_match_payload_to_svg() {
        let svg = encode_to_svg(&"FRMHND:M2:B0F68211:6:%20M13O+14%5:639/RL".to_string()).unwrap();
        assert!(svg.contains("<svg"));
        assert!(svg.contains("</svg>"));
    }

    #[test]
    fn rejects_a_payload_beyond_qr_capacity() {
        // Must be an Err rather than a panic: the batch builder sizes chunks against
        // this limit, and a panic here would take down the webview bridge.
        let oversized = "A".repeat(10_000);
        assert!(encode_to_svg(&oversized).is_err());
    }

    #[test]
    fn saves_an_svg_to_disk() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("code.svg");
        let svg = "<svg></svg>".to_string();

        save_as_svg(&svg, &path.to_string_lossy().to_string()).unwrap();
        assert_eq!(std::fs::read_to_string(&path).unwrap(), svg);
    }

    #[test]
    fn deleting_an_existing_code_removes_it() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("code.svg");
        std::fs::write(&path, "<svg></svg>").unwrap();

        delete_code(&path.to_string_lossy().to_string()).unwrap();
        assert!(!path.exists());
    }

    #[test]
    fn deleting_a_missing_code_succeeds() {
        // The documented invariant: a folder can hold the name of a code deleted
        // individually earlier, and "delete folder with its codes" must not abort
        // partway and leave the folder itself behind.
        let dir = tempdir().unwrap();
        let missing = dir.path().join("never-existed.svg");

        assert!(delete_code(&missing.to_string_lossy().to_string()).is_ok());
    }

    #[test]
    fn deleting_is_idempotent() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("code.svg");
        std::fs::write(&path, "<svg></svg>").unwrap();
        let path_str = path.to_string_lossy().to_string();

        assert!(delete_code(&path_str).is_ok());
        assert!(delete_code(&path_str).is_ok());
    }
}
