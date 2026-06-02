import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const accounts = await prisma.account.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(accounts);
  } catch (error: any) {
    console.error('Error al obtener cuentas:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, currency } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre de la cuenta es requerido' },
        { status: 400 }
      );
    }

    // Verificar si ya existe una cuenta con ese nombre
    const existingAccount = await prisma.account.findUnique({
      where: { name: name.trim() },
    });

    if (existingAccount) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta con ese nombre' },
        { status: 400 }
      );
    }

    const newAccount = await prisma.account.create({
      data: {
        name: name.trim(),
        type: type || 'CASH',
        currency: currency || 'USD',
      },
    });

    return NextResponse.json(newAccount, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear cuenta:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno al crear cuenta' },
      { status: 500 }
    );
  }
}
