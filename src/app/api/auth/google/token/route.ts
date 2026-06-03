import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Falta el parámetro code' }, { status: 400 });
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Configuración de Google OAuth incompleta en el servidor' }, { status: 500 });
    }

    // Intercambiar código de autorización por tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: 'postmessage', // Requerido para flujos emergentes de GIS
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      console.error('Error de Google Token Exchange:', tokenData);
      return NextResponse.json({ error: tokenData.error_description || 'Error al intercambiar código' }, { status: tokenRes.status });
    }

    const { access_token, refresh_token, expires_in } = tokenData;
    const expiresAt = Date.now() + (expires_in || 3600) * 1000;

    // Guardar tokens de forma segura en la tabla app_settings de SQLite
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

      // El refresh_token solo se envía en la primera autorización/consentimiento.
      // Si está presente, lo guardamos o lo actualizamos.
      if (refresh_token) {
        await tx.appSetting.upsert({
          where: { key: 'gdrive_refresh_token' },
          update: { value: refresh_token },
          create: { key: 'gdrive_refresh_token', value: refresh_token },
        });
      }
    });

    return NextResponse.json({ accessToken: access_token, expiresAt });
  } catch (error: any) {
    console.error('Error en callback de autenticación Google:', error);
    return NextResponse.json({ error: 'Error interno en el intercambio de tokens' }, { status: 500 });
  }
}
