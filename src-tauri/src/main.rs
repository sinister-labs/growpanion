#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{LogicalSize, Size, Manager, command};
use serde::{Deserialize, Serialize};
use reqwest::Client;
use std::collections::HashMap;

const WINDOW_ASPECT_RATIO: f64 = 16.0 / 9.0;
const MIN_WIDTH: f64 = 800.0;
const MAX_WIDTH_PERCENTAGE: f64 = 0.8;

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

#[command]
async fn http_proxy(args: HttpProxyArgs) -> Result<String, String> {
    let client = Client::new();
    
    let mut request_headers = reqwest::header::HeaderMap::new();
    if let Some(headers_str) = args.headers {
        match serde_json::from_str::<HashMap<String, String>>(&headers_str) {
            Ok(headers_map) => {
                for (key, value) in headers_map {
                    if let (Ok(header_name), Ok(header_value)) = (
                        reqwest::header::HeaderName::from_bytes(key.as_bytes()),
                        reqwest::header::HeaderValue::from_str(&value)
                    ) {
                        request_headers.insert(header_name, header_value);
                    }
                }
            },
            Err(e) => return Err(format!("Failed to parse headers: {}", e)),
        }
    }
    
    let mut request_builder = match args.method.to_uppercase().as_str() {
        "GET" => client.get(&args.url),
        "POST" => client.post(&args.url),
        "PUT" => client.put(&args.url),
        "DELETE" => client.delete(&args.url),
        "PATCH" => client.patch(&args.url),
        "HEAD" => client.head(&args.url),
        _ => return Err(format!("Unsupported HTTP method: {}", args.method)),
    };
    
    request_builder = request_builder.headers(request_headers);
    
    if let Some(body_str) = args.body {
        request_builder = request_builder.body(body_str);
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
            let window = app.get_webview_window("main").unwrap();
            
            if let Some(monitor) = window.current_monitor().unwrap() {
                let screen_size = monitor.size();
                let scale_factor = monitor.scale_factor();
                
                let max_width = (screen_size.width as f64 * MAX_WIDTH_PERCENTAGE) / scale_factor;
                let width = max_width.max(MIN_WIDTH);
                
                let height = width / WINDOW_ASPECT_RATIO;
                
                window.set_size(Size::Logical(LogicalSize { width, height })).unwrap();
                
                window.center().unwrap();
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            http_proxy
        ])
        .run(tauri::generate_context!())
        .expect("Error while running Tauri application");
} 