use crate::commands::{
    compress_fields, decompress_data, delete_qr_code, generate_qr_code, hash_schema,
    import_field_image, save_qr_svg, save_schema, delete_schema, pull_tba_event_data,
    get_tba_events,
};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod commands;
mod core;

/// Grants the webview access to the camera on Linux.
///
/// Every other platform's webview asks the OS for camera access on its own, so the QR
/// scanner just works. WebKitGTK does neither: `enable-media-stream` is off by default,
/// and an unanswered `permission-request` signal counts as a denial. The result is a
/// `getUserMedia` rejection that `QrScannerDialog` reads as "no camera on this machine".
///
/// wry does not set either of these (it only touches webgl, webaudio, and the page
/// cache), so we reach the webview ourselves. Only camera and microphone requests are
/// granted; anything else falls through to WebKit's default of denying it.
#[cfg(target_os = "linux")]
fn allow_camera_access(app: &tauri::App) {
    use tauri::Manager;
    use webkit2gtk::glib::prelude::Cast;
    use webkit2gtk::{PermissionRequestExt, SettingsExt, UserMediaPermissionRequest, WebViewExt};

    let Some(window) = app.get_webview_window("main") else {
        return;
    };

    let result = window.with_webview(|platform_webview| {
        let webview = platform_webview.inner();

        if let Some(settings) = WebViewExt::settings(&webview) {
            settings.set_enable_media_stream(true);
            settings.set_enable_mediasource(true);
            settings.set_enable_webrtc(true);
            settings.set_media_playback_requires_user_gesture(false);
        }

        webview.connect_permission_request(|_, request| {
            if request
                .dynamic_cast_ref::<UserMediaPermissionRequest>()
                .is_some()
            {
                request.allow();
                true
            } else {
                false
            }
        });
    });

    // A failure here costs the QR scanner its camera, not the app its launch.
    if let Err(e) = result {
        eprintln!("Could not configure the Linux webview for camera access: {e}");
    }
}

/// Stops WebKitGTK from painting the window as torn scanlines on Linux.
///
/// WebKitGTK composites through DMA-BUF by default, which needs the GPU driver and the
/// compositor to agree on buffer formats. Plenty of Linux setups do not — a Raspberry Pi's
/// VideoCore under labwc is one — and the webview then paints shredded garbage, or nothing,
/// while the window chrome draws correctly. Only the web content is wrong, so the app looks
/// thoroughly broken even though it is running fine.
///
/// Turning the DMA-BUF renderer off falls back to a path that is marginally slower but
/// correct everywhere. An existing value is left untouched, so anyone whose GPU handles
/// DMA-BUF properly can export `WEBKIT_DISABLE_DMABUF_RENDERER=0` and keep the fast path.
#[cfg(target_os = "linux")]
fn disable_dmabuf_renderer() {
    if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Has to happen before the webview exists: WebKitGTK reads this when it spawns its
    // rendering process, and setting it afterwards has no effect. Still single-threaded
    // here, which is what makes mutating the environment safe.
    #[cfg(target_os = "linux")]
    disable_dmabuf_renderer();

    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|_app| {
            #[cfg(target_os = "linux")]
            allow_camera_access(_app);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            generate_qr_code,
            save_qr_svg,
            hash_schema,
            compress_fields,
            decompress_data,
            delete_qr_code,
            save_schema,
            delete_schema,
            import_field_image,
            pull_tba_event_data,
            get_tba_events
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
