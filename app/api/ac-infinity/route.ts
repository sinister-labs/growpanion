import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchAcInfinityControllers, fetchAcInfinityControllersByAppId } from '@/lib/ac-infinity-api';
import { secureError } from '@/lib/secure-logging';

const AcInfinityCredentialsRequestSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().trim().min(1),
});
const AcInfinityTokenRequestSchema = z.object({
  appId: z.string().trim().min(1),
});

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid JSON request body.' }, { status: 400 });
    }

    const tokenRequest = AcInfinityTokenRequestSchema.safeParse(body);
    if (tokenRequest.success) {
      const controllers = await fetchAcInfinityControllersByAppId(tokenRequest.data.appId);
      return NextResponse.json({
        success: true,
        controllers,
        message: controllers.length > 0 ? `${controllers.length} controller refreshed.` : 'No AC Infinity controllers were returned.',
      });
    }

    const parsed = AcInfinityCredentialsRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Email/password or an AC Infinity app token are required.' },
        { status: 400 },
      );
    }

    const result = await fetchAcInfinityControllers(parsed.data);
    return NextResponse.json({
      success: result.success,
      appId: result.appId,
      controllers: result.controllers,
      message: result.message,
    }, { status: result.success ? 200 : 502 });
  } catch (error) {
    secureError('AC Infinity connector request failed:', error);
    const message = error instanceof Error && error.name === 'AbortError'
      ? 'AC Infinity request timed out.'
      : 'AC Infinity request failed.';

    return NextResponse.json({ success: false, message, controllers: [] }, { status: 502 });
  }
}
