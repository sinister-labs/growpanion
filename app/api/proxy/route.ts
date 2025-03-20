import { NextRequest, NextResponse } from 'next/server';

/**
 * Generic API proxy for external requests
 * Bypasses CORS restrictions for frontend requests
 */
export async function POST(request: NextRequest) {
    try {
        const proxyData = await request.json();
        const { url, method = 'GET', headers = {}, body = null } = proxyData;

        if (!url) {
            return NextResponse.json(
                { error: 'URL is required' },
                { status: 400 }
            );
        }

        const isExternalRequest = !url.startsWith('/') && !url.includes('localhost') && !url.includes('127.0.0.1');
        if (!isExternalRequest) {
            return NextResponse.json(
                { error: 'Only external URLs are allowed' },
                { status: 403 }
            );
        }

        const requestHeaders: HeadersInit = {
            'Content-Type': 'application/json',
            ...headers
        };

        const response = await fetch(url, {
            method,
            headers: requestHeaders,
            body: body ? JSON.stringify(body) : null,
        });

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
    } catch (error) {
        console.error('Proxy error:', error);

        let errorMessage = 'Unknown error during proxy request';
        if (error instanceof Error) {
            errorMessage = error.message;
        }

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}