import { NextRequest, NextResponse } from 'next/server';
import { ProxyRequestSchema } from '@/lib/validation-schemas';
import { validateFormData } from '@/lib/validation-utils';

// Allowlist of domains that can be proxied to prevent SSRF attacks
const ALLOWED_DOMAINS = [
    'openapi.tuyaeu.com',
    'openapi.tuyacn.com', 
    'openapi.tuyaus.com',
    'openapi.tuyain.com'
];

/**
 * Validates if a URL is safe to proxy to prevent SSRF attacks
 * @param url The URL to validate
 * @returns true if URL is safe to proxy
 */
function isValidProxyUrl(url: string): boolean {
    try {
        const parsedUrl = new URL(url);
        
        // Only allow HTTPS protocol for security
        if (parsedUrl.protocol !== 'https:') {
            return false;
        }

        // Check against allowlist of domains
        const hostname = parsedUrl.hostname.toLowerCase();
        if (!ALLOWED_DOMAINS.includes(hostname)) {
            return false;
        }

        // Additional security: prevent private IP ranges
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (ipv4Regex.test(hostname)) {
            const octets = hostname.split('.').map(Number);
            
            // Block private IP ranges: 10.x.x.x, 172.16-31.x.x, 192.168.x.x
            if (octets[0] === 10 || 
                (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
                (octets[0] === 192 && octets[1] === 168) ||
                octets[0] === 127) {
                return false;
            }
        }

        return true;
    } catch (error) {
        // Invalid URL format
        return false;
    }
}

/**
 * Secure API proxy for Tuya Cloud API requests only
 * Implements strict allowlist to prevent SSRF attacks
 */
export async function POST(request: NextRequest) {
    try {
        const proxyData = await request.json();
        
        // Validate request data
        const validation = validateFormData(ProxyRequestSchema, proxyData);
        if (!validation.isValid) {
            return NextResponse.json(
                { error: 'Invalid request data', details: validation.errors },
                { status: 400 }
            );
        }
        
        const { url, method = 'GET', headers = {}, body = null } = validation.data!

        // Validate URL against allowlist and security checks
        if (!isValidProxyUrl(url)) {
            return NextResponse.json(
                { error: 'URL not allowed. Only approved Tuya Cloud API endpoints are permitted.' },
                { status: 403 }
            );
        }

        // Sanitize and limit request headers for security
        const allowedHeaders = ['client_id', 't', 'sign', 'sign_method', 'access_token', 'Content-Type'];
        const requestHeaders: HeadersInit = {
            'Content-Type': 'application/json',
        };

        // Only include explicitly allowed headers
        if (headers && typeof headers === 'object') {
            Object.keys(headers).forEach(key => {
                if (allowedHeaders.includes(key) && typeof headers[key] === 'string') {
                    requestHeaders[key] = headers[key];
                }
            });
        }

        // Add timeout and security constraints
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        try {
            const response = await fetch(url, {
                method: method === 'GET' || method === 'POST' ? method : 'GET', // Only allow GET/POST
                headers: requestHeaders,
                body: body && method === 'POST' ? JSON.stringify(body) : null,
                signal: controller.signal,
                // Additional security options
                redirect: 'manual', // Don't follow redirects
                credentials: 'omit', // Don't send credentials
            });

            clearTimeout(timeoutId);

            let responseData;
            const contentType = response.headers.get('content-type') || '';

            if (contentType.includes('application/json')) {
                responseData = await response.json();
            } else {
                responseData = { text: await response.text() };
            }

            return NextResponse.json(responseData, {
                status: response.status,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

        } catch (fetchError) {
            clearTimeout(timeoutId);
            throw fetchError;
        }

    } catch (error) {
        // Enhanced error logging without exposing sensitive details  
        console.error('Proxy request failed:', {
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
        });

        let errorMessage = 'Request failed';
        let statusCode = 500;

        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                errorMessage = 'Request timeout';
                statusCode = 408;
            } else if (error.message.includes('fetch')) {
                errorMessage = 'Network error';
                statusCode = 502;
            }
        }

        return NextResponse.json(
            { error: errorMessage },
            { status: statusCode }
        );
    }
}