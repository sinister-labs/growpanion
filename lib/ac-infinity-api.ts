export interface AcInfinityCredentials {
  email: string;
  password: string;
}

export interface AcInfinityController {
  id: string;
  name: string;
  model?: string;
  online?: boolean;
  raw: Record<string, unknown>;
}

export interface AcInfinityDeviceListResult {
  success: boolean;
  appId?: string;
  controllers: AcInfinityController[];
  message?: string;
}

interface AcInfinityLoginPayload {
  appEmail: string;
  appPasswordl: string;
}

const BASE_URL = 'http://www.acinfinityserver.com/api';
const APP_VERSION = '1.9.7';
const USER_AGENT = 'ACController/1.9.7 (com.acinfinity.humiture; build:533; iOS 18.5.0) Alamofire/5.10.2';

export async function fetchAcInfinityControllers(credentials: AcInfinityCredentials): Promise<AcInfinityDeviceListResult> {
  const email = credentials.email.trim();
  const password = credentials.password.trim();

  if (!email || !password) {
    return { success: false, controllers: [], message: 'Email and password are required.' };
  }

  const login = await postAcInfinity<Record<string, unknown>>('/user/appUserLogin', {
    appEmail: email,
    appPasswordl: password.slice(0, 25),
  });

  const appId = extractAppId(login);
  if (!appId) {
    return {
      success: false,
      controllers: [],
      message: extractMessage(login) || 'AC Infinity login did not return an app token.',
    };
  }

  const controllers = await fetchAcInfinityControllersByAppId(appId);

  return {
    success: true,
    appId,
    controllers,
    message: controllers.length > 0 ? `${controllers.length} controller found.` : 'Login succeeded, but no controllers were returned.',
  };
}

export async function fetchAcInfinityControllersByAppId(appId: string): Promise<AcInfinityController[]> {
  const token = appId.trim();
  if (!token) return [];

  const devices = await postAcInfinity<Record<string, unknown>>('/user/devInfoListAll', { userId: token }, token);
  return extractControllers(devices);
}

async function postAcInfinity<T>(path: string, body: AcInfinityLoginPayload | { userId: string }, token?: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  const formBody = new URLSearchParams(Object.entries(body)).toString();

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
        phoneType: '1',
        appVersion: APP_VERSION,
        ...(token ? { token } : {}),
      },
      body: formBody,
      signal: controller.signal,
      redirect: 'manual',
      credentials: 'omit',
    });

    const text = await response.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { text };
    }

    const apiCode = typeof data === 'object' && data !== null ? Number((data as Record<string, unknown>).code) : NaN;
    if (!response.ok || (Number.isFinite(apiCode) && apiCode !== 200)) {
      const message = typeof data === 'object' && data !== null ? extractMessage(data as Record<string, unknown>) : undefined;
      throw new Error(message || `AC Infinity request failed with ${Number.isFinite(apiCode) ? `code ${apiCode}` : `HTTP ${response.status}`}.`);
    }

    return data as T;
  } finally {
    clearTimeout(timeout);
  }
}

function extractAppId(payload: Record<string, unknown>): string | undefined {
  const candidates = [
    payload.appId,
    payload.appid,
    payload.token,
    payload.data,
    getNested(payload, ['data', 'appId']),
    getNested(payload, ['data', 'appid']),
    getNested(payload, ['result', 'appId']),
    getNested(payload, ['result', 'appid']),
  ];

  return candidates.find((candidate): candidate is string => typeof candidate === 'string' && candidate.trim().length > 0)?.trim();
}

function extractControllers(payload: Record<string, unknown>): AcInfinityController[] {
  const list = findFirstArray(payload);
  if (!list) return [];

  return list
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null && !Array.isArray(item))
    .map(normalizeController)
    .filter((item): item is AcInfinityController => Boolean(item));
}

function normalizeController(raw: Record<string, unknown>): AcInfinityController | null {
  const id = firstString(raw.devId, raw.deviceId, raw.id, raw.mac, raw.devCode, raw.sn);
  if (!id) return null;

  const name = firstString(raw.devName, raw.deviceName, raw.name, raw.alias, raw.nickName) || `AC Infinity ${id.slice(-4)}`;
  const model = firstString(raw.devType, raw.deviceType, raw.model, raw.productName, raw.type);
  const onlineValue = raw.online ?? raw.isOnline ?? raw.status ?? raw.devStatus;
  const online = typeof onlineValue === 'boolean'
    ? onlineValue
    : typeof onlineValue === 'number'
      ? onlineValue > 0
      : typeof onlineValue === 'string'
        ? ['1', 'true', 'online', 'on'].includes(onlineValue.toLowerCase())
        : undefined;

  return { id, name, model, online, raw };
}

function extractMessage(payload: Record<string, unknown>): string | undefined {
  return firstString(payload.message, payload.msg, payload.error, payload.text, getNested(payload, ['data', 'message']));
}

function findFirstArray(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return null;

  for (const candidate of Object.values(value as Record<string, unknown>)) {
    const nested = findFirstArray(candidate);
    if (nested) return nested;
  }

  return null;
}

function getNested(payload: Record<string, unknown>, path: string[]): unknown {
  return path.reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[key];
  }, payload);
}

function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim();
}
