import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, normalizeApiHeaders } from '@/lib/apiClient';
import { invoke, isTauri } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core', () => ({
    isTauri: vi.fn(),
    invoke: vi.fn()
}));

const mockedIsTauri = vi.mocked(isTauri);
const mockedInvoke = vi.mocked(invoke);

describe('apiClient', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('throws on non-successful Tauri proxy responses', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        mockedIsTauri.mockResolvedValue(true);
        mockedInvoke.mockResolvedValue(JSON.stringify({
            status: 403,
            body: '{"error":"forbidden"}',
            headers: {}
        }));

        await expect(apiRequest({
            url: 'https://openapi.tuyaeu.com/v1.0/token?grant_type=1',
            method: 'GET'
        })).rejects.toThrow('API Error (403)');

        consoleErrorSpy.mockRestore();
    });

    it('parses successful Tauri JSON responses', async () => {
        mockedIsTauri.mockResolvedValue(true);
        mockedInvoke.mockResolvedValue(JSON.stringify({
            status: 200,
            body: '{"success":true}',
            headers: {}
        }));

        await expect(apiRequest<{ success: boolean }>({
            url: 'https://openapi.tuyaeu.com/v1.0/token?grant_type=1',
            method: 'GET'
        })).resolves.toEqual({ success: true });
    });

    it('sends upstream headers only inside the browser proxy payload', async () => {
        mockedIsTauri.mockResolvedValue(false);
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({ success: true })
        });
        vi.stubGlobal('fetch', fetchMock);

        await apiRequest({
            url: 'https://openapi.tuyaeu.com/v1.0/token?grant_type=1',
            method: 'GET',
            headers: {
                client_id: 'tuya-client',
                sign: 'signature'
            }
        });

        expect(fetchMock).toHaveBeenCalledWith('/api/proxy', expect.objectContaining({
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }));

        const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(payload.headers).toEqual({
            client_id: 'tuya-client',
            sign: 'signature'
        });
    });

    it('normalizes all supported RequestInit header shapes', () => {
        expect(normalizeApiHeaders(new Headers([
            ['client_id', 'tuya-client'],
            ['sign', 'signature'],
        ]))).toEqual({
            client_id: 'tuya-client',
            sign: 'signature',
        });

        expect(normalizeApiHeaders([
            ['client_id', 'tuya-client'],
            ['t', '123'],
        ])).toEqual({
            client_id: 'tuya-client',
            t: '123',
        });

        expect(normalizeApiHeaders({ client_id: 'tuya-client' })).toEqual({
            client_id: 'tuya-client',
        });
    });

    it('serializes Headers instances for the Tauri proxy', async () => {
        mockedIsTauri.mockResolvedValue(true);
        mockedInvoke.mockResolvedValue(JSON.stringify({
            status: 200,
            body: '{"success":true}',
            headers: {}
        }));

        await apiRequest({
            url: 'https://openapi.tuyaeu.com/v1.0/token?grant_type=1',
            method: 'GET',
            headers: new Headers({
                client_id: 'tuya-client',
                sign: 'signature'
            })
        });

        expect(mockedInvoke).toHaveBeenCalledWith('http_proxy', {
            args: expect.objectContaining({
                headers: JSON.stringify({
                    client_id: 'tuya-client',
                    sign: 'signature'
                })
            })
        });
    });

    it('forwards falsy request bodies through the Tauri proxy', async () => {
        mockedIsTauri.mockResolvedValue(true);
        mockedInvoke.mockResolvedValue(JSON.stringify({
            status: 200,
            body: '{"success":true}',
            headers: {}
        }));

        await apiRequest({
            url: 'https://openapi.tuyaeu.com/v1.0/devices/test/commands',
            method: 'POST',
            body: false as unknown as BodyInit
        });

        await apiRequest({
            url: 'https://openapi.tuyaeu.com/v1.0/devices/test/commands',
            method: 'POST',
            body: 0 as unknown as BodyInit
        });

        await apiRequest({
            url: 'https://openapi.tuyaeu.com/v1.0/devices/test/commands',
            method: 'POST',
            body: ''
        });

        expect(mockedInvoke).toHaveBeenNthCalledWith(1, 'http_proxy', {
            args: expect.objectContaining({ body: 'false' })
        });
        expect(mockedInvoke).toHaveBeenNthCalledWith(2, 'http_proxy', {
            args: expect.objectContaining({ body: '0' })
        });
        expect(mockedInvoke).toHaveBeenNthCalledWith(3, 'http_proxy', {
            args: expect.objectContaining({ body: '' })
        });
    });
});
