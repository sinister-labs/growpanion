#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use reqwest::{Client, Method, Url};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;
use tauri::{command, LogicalSize, Manager, Size};

const WINDOW_ASPECT_RATIO: f64 = 16.0 / 9.0;
const MIN_WIDTH: f64 = 800.0;
const MAX_WIDTH_PERCENTAGE: f64 = 0.8;
const ALLOWED_DOMAINS: [&str; 4] = [
    "openapi.tuyaeu.com",
    "openapi.tuyacn.com",
    "openapi.tuyaus.com",
    "openapi.tuyain.com",
];
const ALLOWED_HEADERS: [&str; 6] = [
    "client_id",
    "t",
    "sign",
    "sign_method",
    "access_token",
    "content-type",
];

#[derive(Debug, Serialize, Deserialize)]
struct HttpResponse {
    status: u16,
    body: String,
    headers: HashMap<String, String>,
}

#[derive(Debug, Deserialize)]
struct HttpProxyArgs {
    url: String,
    method: String,
    headers: Option<String>,
    body: Option<String>,
}

fn is_valid_proxy_url(url: &str) -> Result<(), String> {
    let parsed = Url::parse(url).map_err(|_| "Invalid URL".to_string())?;

    if parsed.scheme() != "https" {
        return Err("Only HTTPS URLs are allowed".to_string());
    }

    let host = parsed
        .host_str()
        .ok_or_else(|| "URL must include a host".to_string())?
        .to_ascii_lowercase();

    if !ALLOWED_DOMAINS.contains(&host.as_str()) {
        return Err(
            "URL not allowed. Only approved Tuya Cloud API endpoints are permitted.".to_string(),
        );
    }

    Ok(())
}

#[command]
async fn http_proxy(args: HttpProxyArgs) -> Result<String, String> {
    is_valid_proxy_url(&args.url)?;

    let method = match args.method.to_uppercase().as_str() {
        "GET" => Method::GET,
        "POST" => Method::POST,
        _ => return Err(format!("Unsupported HTTP method: {}", args.method)),
    };

    let client = Client::builder()
        .timeout(Duration::from_secs(10))
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let mut request_headers = reqwest::header::HeaderMap::new();
    if let Some(headers_str) = args.headers {
        match serde_json::from_str::<HashMap<String, String>>(&headers_str) {
            Ok(headers_map) => {
                for (key, value) in headers_map {
                    if !ALLOWED_HEADERS.contains(&key.to_ascii_lowercase().as_str()) {
                        continue;
                    }

                    let normalized_key = key.to_ascii_lowercase();
                    if let (Ok(header_name), Ok(header_value)) = (
                        reqwest::header::HeaderName::from_bytes(normalized_key.as_bytes()),
                        reqwest::header::HeaderValue::from_str(&value),
                    ) {
                        request_headers.insert(header_name, header_value);
                    }
                }
            }
            Err(e) => return Err(format!("Failed to parse headers: {}", e)),
        }
    }

    let mut request_builder = client
        .request(method.clone(), &args.url)
        .headers(request_headers);

    if method == Method::POST {
        if let Some(body_str) = args.body {
            request_builder = request_builder.body(body_str);
        }
    }

    let response = match request_builder.send().await {
        Ok(res) => res,
        Err(e) => return Err(format!("Request failed: {}", e)),
    };

    let status = response.status().as_u16();
    let mut headers_map = HashMap::new();
    for (key, value) in response.headers() {
        if let Ok(v) = value.to_str() {
            headers_map.insert(key.to_string(), v.to_string());
        }
    }

    let body = match response.text().await {
        Ok(text) => text,
        Err(e) => return Err(format!("Failed to read response body: {}", e)),
    };

    let http_response = HttpResponse {
        status,
        body,
        headers: headers_map,
    };

    match serde_json::to_string(&http_response) {
        Ok(json) => Ok(json),
        Err(e) => Err(format!("Failed to serialize response: {}", e)),
    }
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let Some(window) = app.get_webview_window("main") else {
                return Ok(());
            };

            if let Ok(Some(monitor)) = window.current_monitor() {
                let screen_size = monitor.size();
                let scale_factor = monitor.scale_factor();

                let max_width = (screen_size.width as f64 * MAX_WIDTH_PERCENTAGE) / scale_factor;
                let width = max_width.max(MIN_WIDTH);

                let height = width / WINDOW_ASPECT_RATIO;

                let _ = window.set_size(Size::Logical(LogicalSize { width, height }));

                let _ = window.center();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![http_proxy])
        .run(tauri::generate_context!())
        .expect("Error while running Tauri application");
}
