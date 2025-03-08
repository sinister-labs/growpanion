import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    // URL-Parameter abrufen
    const searchParams = request.nextUrl.searchParams;
    const deviceId = searchParams.get('deviceId');
    const clientId = searchParams.get('client_id');
    const clientSecret = searchParams.get('client_secret');
    
    // Bearer Token aus Headers extrahieren
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader ? authHeader.replace('Bearer ', '') : null;
    
    if (!deviceId) {
      return NextResponse.json(
        { success: false, msg: 'Geräte-ID (deviceId) erforderlich' },
        { status: 400 }
      );
    }
    
    if (!accessToken) {
      return NextResponse.json(
        { success: false, msg: 'Authentifizierung erforderlich' },
        { status: 401 }
      );
    }

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { success: false, msg: 'Client ID und Client Secret erforderlich' },
        { status: 400 }
      );
    }
    
    // Aktuelle Zeit als Zeitstempel
    const t = Date.now().toString();
    
    // SHA256-Hash eines leeren Strings für GET-Anfragen ohne Body
    const contentHash = crypto.createHash('sha256').update('').digest('hex');
    
    // Request-Infos
    const method = "GET";
    const signUrl = `/v2.0/cloud/thing/${deviceId}/shadow/properties`;
    
    // Signatur-String erstellen
    const stringToSign = [method, contentHash, "", signUrl].join("\n");
    const signStr = clientId + accessToken + t + stringToSign;
    
    // Signatur berechnen
    const sign = crypto.createHmac('sha256', clientSecret)
                      .update(signStr, 'utf8')
                      .digest('hex')
                      .toUpperCase();
    
    // API-Anfrage an Tuya
    const response = await fetch(`https://openapi.tuyaeu.com${signUrl}`, {
      method: method,
      headers: {
        "client_id": clientId,
        "access_token": accessToken,
        "t": t,
        "sign": sign,
        "sign_method": "HMAC-SHA256",
        "Content-Type": "application/json"
      }
    });
    
    const data = await response.json();
    
    // Antwort zurückgeben
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Sensordaten:', error);
    
    let errorDetails = '';
    if (error instanceof Error) {
      errorDetails = error.stack || error.message;
    } else {
      errorDetails = String(error);
    }
    
    return NextResponse.json(
      { 
        success: false, 
        msg: 'Fehler beim Abrufen der Sensordaten', 
        errorDetails 
      },
      { status: 500 }
    );
  }
} 