use std::fs;
use std::path::Path;

pub fn save(schema: &String, file_path: &String) -> Result<(), String> {
    fs::write(file_path, schema).map_err(|e| format!("Failed to write {}: {}", file_path, e))
}

/// Deletes a schema file, treating "already gone" as success — see `qr::delete_code`.
pub fn delete(path: &String) -> Result<(), String> {
    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(format!("Failed to delete {}: {}", path, e)),
    }
}

/// Copies a user-picked playing field image into the app's own data directory.
///
/// Copying (rather than storing the original path) is required: the fs capability
/// scope only permits `$APPLOCALDATA/**/*`, so an arbitrary path on the user's disk
/// is unreadable from the webview. It also means the reference survives the user
/// moving or deleting the file they picked.
pub fn import_field_image(
    src_path: &String,
    dest_dir: &String,
    dest_name: &String,
) -> Result<String, String> {
    let src = Path::new(src_path);
    if !src.is_file() {
        return Err(format!("{} is not a file", src_path));
    }

    fs::create_dir_all(dest_dir)
        .map_err(|e| format!("Failed to create {}: {}", dest_dir, e))?;

    let dest = Path::new(dest_dir).join(dest_name);
    fs::copy(src, &dest)
        .map_err(|e| format!("Failed to copy {} to {}: {}", src_path, dest.display(), e))?;

    Ok(dest.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn saves_a_schema_to_disk() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("schema.json");
        let schema = r#"{"name":"Test","sections":[]}"#.to_string();

        save(&schema, &path.to_string_lossy().to_string()).unwrap();
        assert_eq!(std::fs::read_to_string(&path).unwrap(), schema);
    }

    #[test]
    fn saving_overwrites_an_existing_schema() {
        // Editing a schema rewrites the same path; a partial overwrite would leave
        // trailing bytes of the previous, longer revision.
        let dir = tempdir().unwrap();
        let path = dir.path().join("schema.json");
        let path_str = path.to_string_lossy().to_string();

        save(&"a much longer original schema body".to_string(), &path_str).unwrap();
        save(&"short".to_string(), &path_str).unwrap();

        assert_eq!(std::fs::read_to_string(&path).unwrap(), "short");
    }

    #[test]
    fn deleting_a_missing_schema_succeeds() {
        let dir = tempdir().unwrap();
        let missing = dir.path().join("never-existed.json");
        assert!(delete(&missing.to_string_lossy().to_string()).is_ok());
    }

    #[test]
    fn imports_a_field_image_into_a_new_directory() {
        let dir = tempdir().unwrap();
        let src = dir.path().join("field.png");
        std::fs::write(&src, b"fake png bytes").unwrap();
        // The destination directory does not exist yet — first import must create it.
        let dest_dir = dir.path().join("images").join("fields");

        let result = import_field_image(
            &src.to_string_lossy().to_string(),
            &dest_dir.to_string_lossy().to_string(),
            &"imported.png".to_string(),
        )
        .unwrap();

        let dest = dest_dir.join("imported.png");
        assert!(dest.exists());
        assert_eq!(result, dest.to_string_lossy().to_string());
        assert_eq!(std::fs::read(&dest).unwrap(), b"fake png bytes");
    }

    #[test]
    fn importing_the_same_name_twice_overwrites() {
        let dir = tempdir().unwrap();
        let dest_dir = dir.path().join("images");
        let first = dir.path().join("a.png");
        let second = dir.path().join("b.png");
        std::fs::write(&first, b"first").unwrap();
        std::fs::write(&second, b"second").unwrap();

        for src in [&first, &second] {
            import_field_image(
                &src.to_string_lossy().to_string(),
                &dest_dir.to_string_lossy().to_string(),
                &"field.png".to_string(),
            )
            .unwrap();
        }

        assert_eq!(
            std::fs::read(dest_dir.join("field.png")).unwrap(),
            b"second"
        );
    }

    #[test]
    fn importing_a_missing_source_is_an_error() {
        let dir = tempdir().unwrap();
        let result = import_field_image(
            &dir.path().join("nope.png").to_string_lossy().to_string(),
            &dir.path().to_string_lossy().to_string(),
            &"out.png".to_string(),
        );
        assert!(result.is_err());
    }

    #[test]
    fn importing_a_directory_is_an_error() {
        // `is_file` guards this; without it fs::copy fails with a less clear message.
        let dir = tempdir().unwrap();
        let result = import_field_image(
            &dir.path().to_string_lossy().to_string(),
            &dir.path().join("out").to_string_lossy().to_string(),
            &"out.png".to_string(),
        );
        assert!(result.is_err());
    }
}
