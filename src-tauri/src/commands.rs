use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

#[derive(Serialize, Deserialize)]
pub struct LinkMetadata {
    title: Option<String>,
    description: Option<String>,
    image: Option<String>,
    site_name: Option<String>,
    url: String,
}

#[tauri::command]
pub fn is_dev() -> bool {
    cfg!(debug_assertions)
}

#[tauri::command]
pub fn quit_app(app: AppHandle) {
    app.exit(0);
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ExpenseFormArgs {
    pub expense_id: Option<String>,
    pub is_global_edit: bool,
}

/// Managed state to pass form args from the open command to the frontend
pub struct ExpenseFormState(pub std::sync::Mutex<Option<ExpenseFormArgs>>);

#[tauri::command]
pub async fn open_expense_form_window(
    app: AppHandle,
    args: ExpenseFormArgs,
) -> Result<(), String> {
    // Close any existing expense-form window first
    if let Some(existing) = app.get_webview_window("expense-form") {
        let _ = existing.destroy();
        tokio::time::sleep(std::time::Duration::from_millis(300)).await;
    }

    // Store the args in managed state so the frontend can retrieve them
    {
        let state = app.state::<ExpenseFormState>();
        let mut stored = state.0.lock().map_err(|e| e.to_string())?;
        *stored = Some(args);
    }

    // Get main window position and size to center the form window on
    // the same monitor as the main app window
    let (target_x, target_y) = if let Some(main_win) = app.get_webview_window("main") {
        let form_width: i32 = 480;
        let form_height: i32 = 720;

        match (main_win.outer_position(), main_win.outer_size()) {
            (Ok(pos), Ok(size)) => {
                let center_x = pos.x + (size.width as i32) / 2;
                let center_y = pos.y + (size.height as i32) / 2;
                let x = center_x - form_width / 2;
                let y = center_y - form_height / 2;
                (Some(x), Some(y))
            }
            _ => (None, None),
        }
    } else {
        (None, None)
    };

    let builder = WebviewWindowBuilder::new(
        &app,
        "expense-form",
        WebviewUrl::App("/".into()),
    )
    .title("Expense")
    .inner_size(480.0, 720.0)
    .min_inner_size(480.0, 720.0)
    .max_inner_size(480.0, 720.0)
    .resizable(false)
    .maximizable(false);

    // If we couldn't determine the position, fall back to center()
    let window = if target_x.is_some() && target_y.is_some() {
        builder
            .position(target_x.unwrap() as f64, target_y.unwrap() as f64)
            .build()
            .map_err(|e| e.to_string())?
    } else {
        builder
            .center()
            .build()
            .map_err(|e| e.to_string())?
    };

    let _ = window.show();
    let _ = window.set_focus();

    Ok(())
}

#[tauri::command]
pub fn get_expense_form_args(app: AppHandle) -> Result<Option<ExpenseFormArgs>, String> {
    let state = app.state::<ExpenseFormState>();
    let stored = state.0.lock().map_err(|e| e.to_string())?;
    Ok(stored.clone())
}

#[tauri::command]
pub async fn close_expense_form_window(app: AppHandle) -> Result<(), String> {
    // Clear the stored args first
    {
        let state = app.state::<ExpenseFormState>();
        let mut stored = state.0.lock().map_err(|e| e.to_string())?;
        *stored = None;
    }

    if let Some(window) = app.get_webview_window("expense-form") {
        window.destroy().map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn fetch_link_metadata(url: String) -> Result<LinkMetadata, String> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .get(&url)
        .header(
            "Accept",
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        )
        .header("Accept-Language", "en-US,en;q=0.5")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let html = response.text().await.map_err(|e| e.to_string())?;

    let document = scraper::Html::parse_document(&html);

    let og_title_selector =
        scraper::Selector::parse("meta[property='og:title']").unwrap();
    let og_desc_selector =
        scraper::Selector::parse("meta[property='og:description']").unwrap();
    let og_image_selector =
        scraper::Selector::parse("meta[property='og:image']").unwrap();
    let og_site_name_selector =
        scraper::Selector::parse("meta[property='og:site_name']").unwrap();
    let title_selector = scraper::Selector::parse("title").unwrap();
    let meta_desc_selector =
        scraper::Selector::parse("meta[name='description']").unwrap();

    let title = document
        .select(&og_title_selector)
        .next()
        .and_then(|el| el.value().attr("content"))
        .map(|s| s.to_string())
        .or_else(|| {
            document
                .select(&title_selector)
                .next()
                .map(|el| el.text().collect::<String>())
        });

    let description = document
        .select(&og_desc_selector)
        .next()
        .and_then(|el| el.value().attr("content"))
        .map(|s| s.to_string())
        .or_else(|| {
            document
                .select(&meta_desc_selector)
                .next()
                .and_then(|el| el.value().attr("content"))
                .map(|s| s.to_string())
        });

    let image = document
        .select(&og_image_selector)
        .next()
        .and_then(|el| el.value().attr("content"))
        .map(|s| s.to_string());

    let site_name = document
        .select(&og_site_name_selector)
        .next()
        .and_then(|el| el.value().attr("content"))
        .map(|s| s.to_string());

    Ok(LinkMetadata {
        title,
        description,
        image,
        site_name,
        url,
    })
}