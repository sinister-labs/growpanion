import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    // Check for client credentials in query params
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('client_id');
    const clientSecret = searchParams.get('client_secret');
    
    // Umgebungsinformationen sammeln, die bei der Fehlersuche helfen können
    const envInfo = {
      nodeEnv: process.env.NODE_ENV,
      nextPublicApiUrl: process.env.NEXT_PUBLIC_API_URL,
      hasWindow: typeof window !== 'undefined',
      hostname: process.env.HOSTNAME || process.env.VERCEL_URL,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'Nicht gesetzt',
      headers: {
        'content-type': 'application/json',
      },
      hasCredentials: !!clientId && !!clientSecret,
    };

    // Test für externe API-Aufrufe zu Tuya
    let tuyaTestResult = null;
    let tuyaError = null;
    
    if (clientId && clientSecret) {
      try {
        // Aktueller Zeitstempel in Millisekunden als String
        const t = Date.now().toString();
        
        // Für GET-Anfragen ohne Body: Berechne den SHA256-Hash eines leeren Strings
        const contentHash = crypto.createHash('sha256').update('').digest('hex');
        
        // Definiere die HTTP-Methode und den Request-Pfad
        const method = "GET";
        const signUrl = "/v1.0/token?grant_type=1";
        
        // Erstelle den String, der signiert werden soll
        const stringToSign = [method, contentHash, "", signUrl].join("\n");
        
        // Kombiniere Access ID, Zeitstempel und den stringToSign
        const signStr = clientId + t + stringToSign;
        
        // Berechne die Signatur mit HMAC-SHA256 und wandle sie in Großbuchstaben um
        const sign = crypto.createHmac('sha256', clientSecret)
                         .update(signStr, 'utf8')
                         .digest('hex')
                         .toUpperCase();
        
        // Header zusammenstellen
        const headers = {
          "client_id": clientId,
          "t": t,
          "sign": sign,
          "sign_method": "HMAC-SHA256",
          "Content-Type": "application/json"
        };
        
        // API-Anfrage an Tuya
        const tuyaResponse = await fetch(`https://openapi.tuyaeu.com/v1.0/token?grant_type=1`, {
          method: "GET",
          headers: headers
        });

        const tuyaData = await tuyaResponse.json();
        
        tuyaTestResult = {
          status: tuyaResponse.status,
          statusText: tuyaResponse.statusText,
          isOk: tuyaResponse.ok,
          data: tuyaData
        };
      } catch (e) {
        if (e instanceof Error) {
          tuyaError = {
            message: e.message,
            stack: e.stack,
            name: e.name,
          };
        } else {
          tuyaError = String(e);
        }
      }
    }

    return NextResponse.json({
      success: true,
      environment: envInfo,
      tuyaTest: tuyaTestResult,
      tuyaError,
    });
  } catch (error) {
    console.error('Fehler im Debug-Endpunkt:', error);
    
    return NextResponse.json(
      { success: false, message: 'Fehler beim Abrufen der Debug-Informationen' },
      { status: 500 }
    );
  }
} 