#[cfg_attr(mobile, tauri::mobile_entry_point)]

#[tauri::command]
fn is_dev() -> bool {
    cfg!(debug_assertions)
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            if is_dev() {
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
        .invoke_handler(tauri::generate_handler![is_dev])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
