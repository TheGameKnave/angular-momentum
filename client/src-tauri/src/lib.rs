#[cfg(desktop)]
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
#[cfg(desktop)]
use tauri_plugin_updater::UpdaterExt;
#[cfg(desktop)]
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_deep_link::init());

    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            // App menu (Angular Momentum)
            let check_updates = MenuItem::with_id(app, "check_updates", "Check for Updates...", true, None::<&str>)?;
            let separator = PredefinedMenuItem::separator(app)?;
            let hide = PredefinedMenuItem::hide(app, Some("Hide Angular Momentum"))?;
            let hide_others = PredefinedMenuItem::hide_others(app, Some("Hide Others"))?;
            let show_all = PredefinedMenuItem::show_all(app, Some("Show All"))?;
            let separator2 = PredefinedMenuItem::separator(app)?;
            let quit = PredefinedMenuItem::quit(app, Some("Quit Angular Momentum"))?;
            let app_submenu = Submenu::with_items(
                app,
                "Angular Momentum",
                true,
                &[&check_updates, &separator, &hide, &hide_others, &show_all, &separator2, &quit],
            )?;

            // Edit menu
            let undo = PredefinedMenuItem::undo(app, None)?;
            let redo = PredefinedMenuItem::redo(app, None)?;
            let separator3 = PredefinedMenuItem::separator(app)?;
            let cut = PredefinedMenuItem::cut(app, None)?;
            let copy = PredefinedMenuItem::copy(app, None)?;
            let paste = PredefinedMenuItem::paste(app, None)?;
            let select_all = PredefinedMenuItem::select_all(app, None)?;
            let edit_submenu = Submenu::with_items(
                app,
                "Edit",
                true,
                &[&undo, &redo, &separator3, &cut, &copy, &paste, &select_all],
            )?;

            // Window menu
            let minimize = PredefinedMenuItem::minimize(app, None)?;
            let fullscreen = PredefinedMenuItem::fullscreen(app, Some("Enter Full Screen"))?;
            let separator4 = PredefinedMenuItem::separator(app)?;
            let close_window = PredefinedMenuItem::close_window(app, None)?;
            let window_submenu = Submenu::with_items(
                app,
                "Window",
                true,
                &[&minimize, &fullscreen, &separator4, &close_window],
            )?;

            let menu = Menu::with_items(app, &[&app_submenu, &edit_submenu, &window_submenu])?;
            app.set_menu(menu)?;
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
        });

    builder
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
