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

#[cfg(test)]
mod tests {
    use super::*;

    /// `hash_data` is the schema identity every saved match code keys on: a match QR
    /// carries this 8-character value, and decoding resolves the schema by matching
    /// it. If the algorithm or the truncation ever changes, every code already on a
    /// device stops resolving — so the digests below are pinned deliberately.
    #[test]
    fn hash_is_first_eight_hex_chars_of_md5() {
        assert_eq!(hash_data(&"hello".to_string()).unwrap(), "5d41402a");
        assert_eq!(hash_data(&"".to_string()).unwrap(), "d41d8cd9");
        assert_eq!(
            hash_data(&"{\"name\":\"Test Schema\",\"sections\":[]}".to_string()).unwrap(),
            "c90bcabb"
        );
    }

    #[test]
    fn hash_is_always_eight_lowercase_hex_chars() {
        let hash = hash_data(&"a schema".to_string()).unwrap();
        assert_eq!(hash.len(), 8);
        assert!(hash.chars().all(|c| c.is_ascii_hexdigit() && !c.is_uppercase()));
    }

    #[test]
    fn hash_is_stable_across_calls() {
        let input = "the same schema".to_string();
        assert_eq!(hash_data(&input).unwrap(), hash_data(&input).unwrap());
    }

    #[test]
    fn hash_changes_for_a_single_character_difference() {
        // Two schemas that differ only in a field name must not share an identity.
        assert_ne!(
            hash_data(&"schema a".to_string()).unwrap(),
            hash_data(&"schema b".to_string()).unwrap()
        );
    }

    #[test]
    fn deflate_inflate_round_trips_ascii() {
        let input = "FRMHND schema payload".to_string();
        let deflated = deflate_data(&input).unwrap();
        assert_eq!(inflate_data(&deflated).unwrap(), input);
    }

    #[test]
    fn deflate_inflate_round_trips_multibyte_utf8() {
        // Scout comments and schema names are free text and reach this path.
        let input = "café — 🤖 ロボット".to_string();
        let deflated = deflate_data(&input).unwrap();
        assert_eq!(inflate_data(&deflated).unwrap(), input);
    }

    #[test]
    fn deflate_inflate_round_trips_a_realistic_schema() {
        // A schema QR carries a few KB; this is the size that actually ships.
        let field = r#"{"id":1,"name":"Auto Points","type":"counter","props":{"min":0,"max":99}},"#;
        let input = format!("{{\"name\":\"Big\",\"sections\":[{}]}}", field.repeat(60));

        let deflated = deflate_data(&input).unwrap();
        assert_eq!(inflate_data(&deflated).unwrap(), input);
        // Repetitive JSON is exactly what zlib is good at; if this stops holding,
        // schema codes are getting denser for no reason.
        assert!(deflated.len() < input.len() / 2);
    }

    #[test]
    fn deflate_produces_standard_base64() {
        let deflated = deflate_data(&"payload".to_string()).unwrap();
        assert!(deflated
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '+' || c == '/' || c == '='));
    }

    #[test]
    fn deflate_handles_an_empty_string() {
        let input = String::new();
        let deflated = deflate_data(&input).unwrap();
        assert_eq!(inflate_data(&deflated).unwrap(), input);
    }

    #[test]
    fn inflate_rejects_input_that_is_not_base64() {
        // A corrupt scan must surface as an error, not a panic in the webview bridge.
        assert!(inflate_data(&"not base64!!!".to_string()).is_err());
    }

    #[test]
    fn inflate_rejects_valid_base64_that_is_not_zlib() {
        assert!(inflate_data(&"aGVsbG8gd29ybGQ=".to_string()).is_err());
    }

    /// Truncation is **not** detected here, and that is worth stating explicitly.
    ///
    /// `read_to_string` returns what it managed to decode when the zlib stream ends
    /// early, so a half-scanned schema payload inflates to partial text with no
    /// error — `"a reasonably long payload to truncate"` cut in half comes back as
    /// `"a reasonably long"`.
    ///
    /// Unlike match codes, schema codes carry no CRC. The only thing standing between
    /// a truncated scan and a corrupt schema is that partial JSON fails to parse
    /// downstream, which is reliable for a truncated object but is a downstream
    /// guarantee rather than one this function makes. If schema payloads ever gain a
    /// checksum, this test is the one to change.
    #[test]
    fn inflate_does_not_detect_truncation() {
        let input = "a reasonably long payload to truncate".to_string();
        let deflated = deflate_data(&input).unwrap();
        let truncated = deflated[..deflated.len() / 2].to_string();

        match inflate_data(&truncated) {
            Ok(partial) => {
                assert!(input.starts_with(&partial));
                assert_ne!(partial, input);
            }
            // Some truncation points land on an invalid base64 length and do error.
            Err(_) => {}
        }
    }

    #[test]
    fn inflate_rejects_a_truncation_that_breaks_base64_framing() {
        let deflated = deflate_data(&"a reasonably long payload to truncate".to_string()).unwrap();
        let truncated = deflated[..deflated.len() / 3].to_string();
        assert!(inflate_data(&truncated).is_err());
    }
}
