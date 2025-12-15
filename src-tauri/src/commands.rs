use serde::{Deserialize, Serialize};

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
pub async fn fetch_link_metadata(url: String) -> Result<LinkMetadata, String> {
    // Create a client with browser-like headers to avoid being blocked
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| e.to_string())?;

    // Fetch the HTML with proper headers
    let response = client
        .get(&url)
        .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
        .header("Accept-Language", "en-US,en;q=0.5")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let html = response.text().await.map_err(|e| e.to_string())?;

    // Parse the HTML to extract Open Graph tags
    let document = scraper::Html::parse_document(&html);

    // Selectors for Open Graph tags
    let og_title_selector = scraper::Selector::parse("meta[property='og:title']").unwrap();
    let og_desc_selector = scraper::Selector::parse("meta[property='og:description']").unwrap();
    let og_image_selector = scraper::Selector::parse("meta[property='og:image']").unwrap();
    let og_site_name_selector = scraper::Selector::parse("meta[property='og:site_name']").unwrap();
    let title_selector = scraper::Selector::parse("title").unwrap();
    let meta_desc_selector = scraper::Selector::parse("meta[name='description']").unwrap();

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