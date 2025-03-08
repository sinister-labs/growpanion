import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    // URL-Parameter abrufen
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('client_id');
    const clientSecret = searchParams.get('client_secret');
    
    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { success: false, msg: 'Client ID und Client Secret erforderlich' },
        { status: 400 }
      );
    }
    
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
    const response = await fetch(`https://openapi.tuyaeu.com/v1.0/token?grant_type=1`, {
      method: "GET",
      headers: headers
    });
    
    const data = await response.json();
    
    // Antwort zurückgeben
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Fehler bei der Tuya-Authentifizierung:', error);
    
    return NextResponse.json(
      { success: false, msg: 'Fehler bei der Tuya-Authentifizierung' },
      { status: 500 }
    );
  }
} 