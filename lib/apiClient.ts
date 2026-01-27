// utils/apiClient.ts
import { isTauri, invoke } from '@tauri-apps/api/core';

interface TauriHttpResponse {
    status: number;
    body: string;
    headers: Record<string, string>;
}

interface ApiRequestOptions extends RequestInit {
    /**
     * The complete URL for the API request.
     * In the browser mode, this is proxied through the NextJS proxy.
     * In the Tauri mode, this is passed directly to the Rust backend.
     */
    url: string;
}

/**
 * Universal API client that communicates either through NextJS or Tauri backend
 * @param options Request options including the complete URL
 * @returns Response data as a Promise
 */
export async function apiRequest<T>(options: ApiRequestOptions): Promise<T> {
    const { url, method = 'GET', headers = {}, body, ...restOptions } = options;
    const isTauriApp = await isTauri();

    if (isTauriApp) {
        try {
            const responseStr = await invoke<string>('http_proxy', {
                args: {
                    url,
                    method,
                    headers: headers ? JSON.stringify(headers) : '{}',
                    body: typeof body === 'string' ? body : body ? JSON.stringify(body) : null,
                }
            });

            const httpResponse: TauriHttpResponse = JSON.parse(responseStr);
            let responseData: T | { text: string };
            try {
                responseData = JSON.parse(httpResponse.body) as T;
            } catch {
                responseData = { text: httpResponse.body };
            }

            return responseData as T;
        } catch (error) {
            console.error('Tauri API error:', error);
            throw error;
        }
    } else {
        try {
            let processedBody = body;

            if (typeof body === 'string') {
                try {
                    processedBody = JSON.parse(body);
                } catch {
                    processedBody = body;
                }
            }

            const response = await fetch(`/api/proxy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
                body: JSON.stringify({
                    url,
                    method,
                    headers,
                    body: processedBody
                }),
                ...restOptions
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error (${response.status}): ${errorText}`);
            }

            return response.json();
        } catch (error) {
            console.error('Browser API error:', error);
            throw error;
        }
    }
}
