import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Falta el parámetro key' }, { status: 400 });
    }

    const setting = await prisma.appSetting.findUnique({
      where: { key },
    });

    return NextResponse.json({ key, value: setting ? setting.value : null });
  } catch (error: any) {
    console.error('Error al obtener configuración:', error);
    return NextResponse.json({ error: 'Error al obtener la configuración' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Faltan parámetros key o value' }, { status: 400 });
    }

    const setting = await prisma.appSetting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });

    return NextResponse.json(setting);
  } catch (error: any) {
    console.error('Error al guardar configuración:', error);
    return NextResponse.json({ error: 'Error al guardar la configuración' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Falta el parámetro key' }, { status: 400 });
    }

    await prisma.appSetting.deleteMany({
      where: { key },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error al eliminar configuración:', error);
    return NextResponse.json({ error: 'Error al eliminar la configuración' }, { status: 500 });
  }
}
