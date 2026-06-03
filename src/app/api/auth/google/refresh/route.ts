import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST() {
  try {
    // 1. Obtener el refresh_token guardado en SQLite
    const refreshTokenSetting = await prisma.appSetting.findUnique({
      where: { key: 'gdrive_refresh_token' },
    });

    if (!refreshTokenSetting || !refreshTokenSetting.value) {
      return NextResponse.json({ error: 'No hay credenciales de actualización (refresh_token) en SQLite' }, { status: 400 });
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Configuración de Google OAuth incompleta en el servidor' }, { status: 500 });
    }

    // 2. Solicitar un nuevo access_token
    const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshTokenSetting.value,
        grant_type: 'refresh_token',
      }),
    });

    const refreshData = await refreshRes.json();

    if (!refreshRes.ok) {
      console.error('Error al refrescar token de Google:', refreshData);
      return NextResponse.json({ error: refreshData.error_description || 'Error al refrescar token' }, { status: refreshRes.status });
    }

    const { access_token, expires_in } = refreshData;
    const expiresAt = Date.now() + (expires_in || 3600) * 1000;

    // 3. Actualizar los nuevos valores en la base de datos SQLite
    await prisma.$transaction(async (tx) => {
      await tx.appSetting.upsert({
        where: { key: 'gdrive_token' },
        update: { value: access_token },
        create: { key: 'gdrive_token', value: access_token },
      });

      await tx.appSetting.upsert({
        where: { key: 'gdrive_expires_at' },
        update: { value: expiresAt.toString() },
        create: { key: 'gdrive_expires_at', value: expiresAt.toString() },
      });
    });

    return NextResponse.json({ accessToken: access_token, expiresAt });
  } catch (error: any) {
    console.error('Error en el refresco de token Google:', error);
    return NextResponse.json({ error: 'Error interno al refrescar token de acceso' }, { status: 500 });
  }
}
