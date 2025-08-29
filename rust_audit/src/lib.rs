use wasm_bindgen::prelude::*;
use scraper::{Html, Selector};
use std::str::FromStr;

#[wasm_bindgen]
pub struct ScanResult {
    pub has_title: bool,
    pub has_meta_description: bool,
    pub has_lang: bool,
    pub h1_count: usize,
    pub img_missing_alt: usize,
    pub weak_links: usize,
    pub inputs_without_label: usize,
    pub has_main_or_nav: bool,
    pub has_duplicate_title: bool,
    pub images_without_lazy: usize,
    pub low_contrast_count: usize,
    pub inaccessible_form_fields: usize,
    pub has_viewport: bool,
    pub has_canonical: bool,
    pub blocking_scripts: usize,
    pub heavy_images: usize,
}

#[wasm_bindgen]
pub fn scan_html(html: &str) -> ScanResult {
    let document = Html::parse_document(html);

    let title_sel = Selector::parse("title").unwrap();
    let meta_sel = Selector::parse("meta[name='description']").unwrap();
    let h1_sel = Selector::parse("h1").unwrap();
    let img_sel = Selector::parse("img").unwrap();
    let a_sel = Selector::parse("a").unwrap();
    let input_sel = Selector::parse("input").unwrap();
    let textarea_sel = Selector::parse("textarea").unwrap();
    let select_sel = Selector::parse("select").unwrap();
    let label_sel = Selector::parse("label").unwrap();
    let html_sel = Selector::parse("html").unwrap();
    let main_sel = Selector::parse("main").unwrap();
    let nav_sel = Selector::parse("nav").unwrap();
    let meta_all_sel = Selector::parse("meta").unwrap();
    let viewport_sel = Selector::parse("meta[name='viewport']").unwrap();
    let canonical_sel = Selector::parse("link[rel='canonical']").unwrap();
    let script_sel = Selector::parse("head script").unwrap();

    // Title
    let title_count = document.select(&title_sel).count();
    let has_title = title_count == 1;

    // Meta description
    let has_meta_description = document.select(&meta_sel).next().is_some();

    // Lang attr
    let has_lang = document
        .select(&html_sel)
        .any(|el| el.value().attr("lang").is_some());

    // H1 count
    let h1_count = document.select(&h1_sel).count();

    // Missing alt on img
    let img_missing_alt = document
        .select(&img_sel)
        .filter(|img| img.value().attr("alt").map_or(true, |alt| alt.trim().is_empty()))
        .count();

    // Weak link text
    let weak_links = document
        .select(&a_sel)
        .filter(|a| {
            let txt = a.text().collect::<String>().to_lowercase();
            ["clicca qui", "link", "qui", "leggi"].iter().any(|w| txt.contains(w))
        })
        .count();

    // Inputs/textarea/select without label or aria-label
    let mut inaccessible_form_fields = 0;
    for sel in [&input_sel, &textarea_sel, &select_sel] {
        let elements = document.select(sel);
        for el in elements {
            let attrs = el.value();
            let has_aria = attrs.attr("aria-label").is_some();
            let has_id = attrs.attr("id");
            let has_label = has_id.map_or(false, |id| {
                document.select(&label_sel).any(|l| l.value().attr("for") == Some(id))
            });
            if !has_aria && !has_label {
                inaccessible_form_fields += 1;
            }
        }
    }

    // Inputs without label or aria-label (legacy, for compatibility)
    let input_elements = document.select(&input_sel).collect::<Vec<_>>();
    let inputs_without_label = input_elements.iter().filter(|input| {
        let attrs = input.value();
        let has_aria = attrs.attr("aria-label").is_some();
        let has_id = attrs.attr("id");
        let has_label = has_id.map_or(false, |id| {
            document.select(&label_sel).any(|l| l.value().attr("for") == Some(id))
        });
        !has_aria && !has_label
    }).count();

    // Landmark tag: main or nav
    let has_main_or_nav = document.select(&main_sel).next().is_some()
        || document.select(&nav_sel).next().is_some();

    // Duplicated title or meta
    let has_duplicate_title = title_count > 1 ||
        document.select(&meta_all_sel)
        .map(|m| m.value().attr("name").unwrap_or(""))
        .filter(|&name| name == "description")
        .count() > 1;

    // Images missing loading="lazy"
    let images_without_lazy = document
        .select(&img_sel)
        .filter(|img| match img.value().attr("loading") {
            Some(v) => v.trim().to_lowercase() != "lazy",
            None => true,
        })
        .count();

    // Contrasto colori (solo inline style, base)
    let mut low_contrast_count = 0;
    let style_sel = Selector::parse("[style]").unwrap();
    for el in document.select(&style_sel) {
        let style = el.value().attr("style").unwrap_or("");
        let fg = extract_css_color(style, "color");
        let bg = extract_css_color(style, "background-color");
        if let (Some(fg), Some(bg)) = (fg, bg) {
            if !is_contrast_ok(&fg, &bg) {
                low_contrast_count += 1;
            }
        }
    }

    // Viewport meta
    let has_viewport = document.select(&viewport_sel).next().is_some();

    // Canonical
    let has_canonical = document.select(&canonical_sel).next().is_some();

    // Script bloccanti (head script senza async/defer)
    let blocking_scripts = document.select(&script_sel)
        .filter(|s| {
            let v = s.value();
            v.attr("src").is_some() && v.attr("async").is_none() && v.attr("defer").is_none()
        })
        .count();

    // Immagini pesanti (con width/height > 1000px, se dichiarati)
    let mut heavy_images = 0;
    for img in document.select(&img_sel) {
        let w = img.value().attr("width").and_then(|v| usize::from_str(v).ok());
        let h = img.value().attr("height").and_then(|v| usize::from_str(v).ok());
        if let (Some(width), Some(height)) = (w, h) {
            if width > 1000 || height > 1000 {
                heavy_images += 1;
            }
        }
    }

    ScanResult {
        has_title,
        has_meta_description,
        has_lang,
        h1_count,
        img_missing_alt,
        weak_links,
        inputs_without_label,
        has_main_or_nav,
        has_duplicate_title,
        images_without_lazy,
        low_contrast_count,
        inaccessible_form_fields,
        has_viewport,
        has_canonical,
        blocking_scripts,
        heavy_images,
    }
}

// Helpers per estrarre e valutare colori CSS inline (molto base, solo hex #rrggbb)
fn extract_css_color(style: &str, prop: &str) -> Option<String> {
    let prop = format!("{}:", prop);
    style.split(';').find_map(|s| {
        let s = s.trim();
        if s.starts_with(&prop) {
            let v = s[prop.len()..].trim();
            if v.starts_with('#') && v.len() == 7 {
                return Some(v.to_string());
            }
        }
        None
    })
}

fn is_contrast_ok(fg: &str, bg: &str) -> bool {
    // Solo #rrggbb, calcolo contrasto luminosità (non WCAG preciso)
    fn hex_to_rgb(hex: &str) -> Option<(u8, u8, u8)> {
        if hex.len() != 7 { return None; }
        let r = u8::from_str_radix(&hex[1..3], 16).ok()?;
        let g = u8::from_str_radix(&hex[3..5], 16).ok()?;
        let b = u8::from_str_radix(&hex[5..7], 16).ok()?;
        Some((r, g, b))
    }
    let (r1, g1, b1) = match hex_to_rgb(fg) {
        Some(rgb) => rgb,
        None => return false,
    };
    let (r2, g2, b2) = match hex_to_rgb(bg) {
        Some(rgb) => rgb,
        None => return false,
    };
    let l1 = 0.2126 * (r1 as f32) + 0.7152 * (g1 as f32) + 0.0722 * (b1 as f32);
    let l2 = 0.2126 * (r2 as f32) + 0.7152 * (g2 as f32) + 0.0722 * (b2 as f32);
    let contrast = if l1 > l2 { (l1 + 0.05) / (l2 + 0.05) } else { (l2 + 0.05) / (l1 + 0.05) };
    contrast > 4.5
}
