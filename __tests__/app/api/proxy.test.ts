import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/proxy/route';
import { isValidProxyUrl } from '@/lib/proxy-utils';

describe('api proxy route', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('allows only approved Tuya HTTPS endpoints', () => {
        expect(isValidProxyUrl('https://openapi.tuyaeu.com/v1.0/token?grant_type=1')).toBe(true);
        expect(isValidProxyUrl('http://openapi.tuyaeu.com/v1.0/token?grant_type=1')).toBe(false);
        expect(isValidProxyUrl('https://evil.example.com/v1.0/token?grant_type=1')).toBe(false);
        expect(isValidProxyUrl('not-a-url')).toBe(false);
    });

    it('defaults missing proxy method to GET', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: vi.fn().mockResolvedValue({ success: true }),
        });
        vi.stubGlobal('fetch', fetchMock);

        const response = await POST(new Request('http://localhost/api/proxy', {
            method: 'POST',
            body: JSON.stringify({
                url: 'https://openapi.tuyaeu.com/v1.0/token?grant_type=1',
            }),
        }) as Parameters<typeof POST>[0]);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({ success: true });
        expect(fetchMock).toHaveBeenCalledWith(
            'https://openapi.tuyaeu.com/v1.0/token?grant_type=1',
            expect.objectContaining({
                method: 'GET',
                body: null,
            }),
        );
    });

    it('forwards falsy POST bodies instead of dropping them', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: vi.fn().mockResolvedValue({ success: true }),
        });
        vi.stubGlobal('fetch', fetchMock);

        await POST(new Request('http://localhost/api/proxy', {
            method: 'POST',
            body: JSON.stringify({
                url: 'https://openapi.tuyaeu.com/v1.0/devices/test/commands',
                method: 'POST',
                body: false,
            }),
        }) as Parameters<typeof POST>[0]);

        expect(fetchMock).toHaveBeenCalledWith(
            'https://openapi.tuyaeu.com/v1.0/devices/test/commands',
            expect.objectContaining({
                method: 'POST',
                body: 'false',
            }),
        );
    });
});
