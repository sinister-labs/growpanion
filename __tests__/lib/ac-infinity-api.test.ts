import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAcInfinityControllers } from '@/lib/ac-infinity-api';

describe('AC Infinity API client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the documented form auth workflow and tokenized device list request', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        code: 200,
        data: { appId: 'app-token-1' },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        code: 200,
        data: {
          devInfoList: [
            { devId: 'controller-69', devName: 'Controller 69 Pro', temp: 2366, humidity: 5118, vpdnums: 143 },
          ],
        },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchAcInfinityControllers({
      email: 'grow@example.com',
      password: '123456789012345678901234567890',
    });

    expect(result.success).toBe(true);
    expect(result.controllers).toHaveLength(1);
    expect(result.controllers[0]).toMatchObject({
      id: 'controller-69',
      name: 'Controller 69 Pro',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://www.acinfinityserver.com/api/user/appUserLogin',
      expect.objectContaining({
        method: 'POST',
        body: 'appEmail=grow%40example.com&appPasswordl=1234567890123456789012345',
        headers: expect.objectContaining({
          'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
          phoneType: '1',
          appVersion: '1.9.7',
        }),
      }),
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://www.acinfinityserver.com/api/user/devInfoListAll',
      expect.objectContaining({
        method: 'POST',
        body: 'userId=app-token-1',
        headers: expect.objectContaining({
          token: 'app-token-1',
        }),
      }),
    );
  });
});
