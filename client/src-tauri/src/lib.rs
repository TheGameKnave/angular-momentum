use tauri::menu::{Menu, MenuItem, Submenu};
use tauri_plugin_updater::UpdaterExt;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            // Only set up menu on desktop platforms
            #[cfg(desktop)]
            {
                let check_updates = MenuItem::with_id(app, "check_updates", "Check for Updates...", true, None::<&str>)?;
                let app_submenu = Submenu::with_items(
                    app,
                    "Angular Momentum",
                    true,
                    &[&check_updates],
                )?;
                let menu = Menu::with_items(app, &[&app_submenu])?;
                app.set_menu(menu)?;
            }
            Ok(())
        })
        .on_menu_event(|app, event| {
            if event.id().as_ref() == "check_updates" {
                let app_handle = app.clone();
                tauri::async_runtime::spawn(async move {
                    match app_handle.updater() {
                        Ok(updater) => {
                            match updater.check().await {
                                Ok(Some(update)) => {
                                    let version = update.version.clone();
                                    let msg = format!("Version {} is available. Would you like to install it now?", version);
                                    let confirmed = app_handle.dialog()
                                        .message(msg)
                                        .title("Update Available")
                                        .buttons(MessageDialogButtons::OkCancel)
                                        .blocking_show();

                                    if confirmed {
                                        if let Err(e) = update.download_and_install(|_, _| {}, || {}).await {
                                            app_handle.dialog()
                                                .message(format!("Failed to install update: {}", e))
                                                .kind(MessageDialogKind::Error)
                                                .title("Update Error")
                                                .blocking_show();
                                        } else {
                                            app_handle.dialog()
                                                .message("Update installed. Please restart the application.")
                                                .title("Update Complete")
                                                .blocking_show();
                                        }
                                    }
                                }
                                Ok(None) => {
                                    app_handle.dialog()
                                        .message("You're running the latest version.")
                                        .title("No Updates")
                                        .blocking_show();
                                }
                                Err(e) => {
                                    app_handle.dialog()
                                        .message(format!("Failed to check for updates: {}", e))
                                        .kind(MessageDialogKind::Error)
                                        .title("Update Error")
                                        .blocking_show();
                                }
                            }
                        }
                        Err(e) => {
                            app_handle.dialog()
                                .message(format!("Updater not available: {}", e))
                                .kind(MessageDialogKind::Error)
                                .title("Update Error")
                                .blocking_show();
                        }
                    }
                });
            }
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
