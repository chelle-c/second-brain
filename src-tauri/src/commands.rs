use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct LinkMetadata {
    title: Option<String>,
    description: Option<String>,
    image: Option<String>,
    url: String,
}

#[tauri::command]
pub fn is_dev() -> bool {
    cfg!(debug_assertions)
}

#[tauri::command]
pub async fn fetch_link_metadata(url: String) -> Result<LinkMetadata, String> {
    // Fetch the HTML
    let response = reqwest::get(&url).await.map_err(|e| e.to_string())?;

    let html = response.text().await.map_err(|e| e.to_string())?;

    // Parse the HTML to extract Open Graph tags
    let document = scraper::Html::parse_document(&html);

    // Selectors for Open Graph tags
    let og_title_selector = scraper::Selector::parse("meta[property='og:title']").unwrap();
    let og_desc_selector = scraper::Selector::parse("meta[property='og:description']").unwrap();
    let og_image_selector = scraper::Selector::parse("meta[property='og:image']").unwrap();

    let title = document
        .select(&og_title_selector)
        .next()
        .and_then(|el| el.value().attr("content"))
        .map(|s| s.to_string());

    let description = document
        .select(&og_desc_selector)
        .next()
        .and_then(|el| el.value().attr("content"))
        .map(|s| s.to_string());

    let image = document
        .select(&og_image_selector)
        .next()
        .and_then(|el| el.value().attr("content"))
        .map(|s| s.to_string());

    Ok(LinkMetadata {
        title,
        description,
        image,
        url,
    })
}