mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if commands::is_dev() {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .filter(|metadata| {
                            metadata.target() != "tao::platform_impl::platform::event_loop::runner"
                        })
                        .build(),
                )?;
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // Log shutdown - the frontend handles saving via onCloseRequested
                // This provides a fallback log in case frontend handler fails
                log::info!("Window close requested for: {}", window.label());
            }
        })
        .invoke_handler(tauri::generate_handler![commands::is_dev, commands::fetch_link_metadata])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
