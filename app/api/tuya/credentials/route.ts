import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/db';

export async function GET() {
  try {
    // Einstellungen aus der Datenbank laden
    const settings = await getSettings();
    
    if (!settings || !settings.tuyaClientId || !settings.tuyaClientSecret) {
      return NextResponse.json(
        { success: false, msg: 'Tuya-Anmeldedaten nicht konfiguriert' },
        { status: 404 }
      );
    }
    
    // Nur die notwendigen Daten zurückgeben
    return NextResponse.json({
      clientId: settings.tuyaClientId,
      clientSecret: settings.tuyaClientSecret
    });
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Tuya-Anmeldedaten:', error);
    
    return NextResponse.json(
      { success: false, msg: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
} 