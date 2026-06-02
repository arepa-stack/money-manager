import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Delete in order of dependency to avoid foreign key constraint violations
    await prisma.$transaction([
      prisma.transaction.deleteMany({}),
      prisma.subcategory.deleteMany({}),
      prisma.category.deleteMany({}),
      prisma.account.deleteMany({}),
      prisma.auditLog.deleteMany({}),
    ]);

    return NextResponse.json({ 
      success: true, 
      message: 'Base de datos limpiada con éxito (transacciones, cuentas, categorías y auditoría eliminadas)' 
    });
  } catch (error: any) {
    console.error('Error al limpiar base de datos:', error);
    return NextResponse.json(
      { error: 'Error al limpiar la base de datos: ' + error.message },
      { status: 500 }
    );
  }
}
