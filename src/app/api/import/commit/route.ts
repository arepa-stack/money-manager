import { NextRequest, NextResponse } from 'next/server';
import { executeImport } from '@/lib/use-cases/ExecuteImportUseCase';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await executeImport(buffer);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error en /api/import/commit:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
