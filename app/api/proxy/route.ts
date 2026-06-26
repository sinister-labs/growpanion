import { NextRequest, NextResponse } from 'next/server';
import { ProxyRequestSchema } from '@/lib/validation-schemas';
import { validateFormData } from '@/lib/validation-utils';
import { isValidProxyUrl } from '@/lib/proxy-utils';

/**
 * Secure API proxy for Tuya Cloud API requests only
 * Implements strict allowlist to prevent SSRF attacks
 */
export async function POST(request: NextRequest) {
    try {
        let proxyData: unknown;
        try {
            proxyData = await request.json();
        } catch {
            return NextResponse.json(
                { error: 'Invalid JSON request body' },
                { status: 400 }
            );
        }
        
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
        const allowedHeaders = new Map([
            ['client_id', 'client_id'],
            ['t', 't'],
            ['sign', 'sign'],
            ['sign_method', 'sign_method'],
            ['access_token', 'access_token'],
            ['content-type', 'Content-Type'],
        ]);
        const requestHeaders: HeadersInit = {
            'Content-Type': 'application/json',
        };

        // Only include explicitly allowed headers
        if (headers && typeof headers === 'object') {
            Object.keys(headers).forEach(key => {
                const normalizedHeader = allowedHeaders.get(key.toLowerCase());
                if (normalizedHeader && typeof headers[key] === 'string') {
                    requestHeaders[normalizedHeader] = headers[key];
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
                body: body !== null && body !== undefined && method === 'POST' ? JSON.stringify(body) : null,
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
