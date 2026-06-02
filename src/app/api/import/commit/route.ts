import { NextRequest, NextResponse } from 'next/server';
import { executeImport } from '@/lib/use-cases/ExecuteImportUseCase';
import { logAction } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const provider = formData.get('provider') as string || 'MONEY_MANAGER';
    const reconciliationsStr = formData.get('reconciliations') as string || '{}';
    
    let reconciliations: Record<string, string> = {};
    try {
      reconciliations = JSON.parse(reconciliationsStr);
    } catch (e) {
      console.warn('Error al parsear reconciliations en commit, usando vacío', e);
    }

    if (!file) {
      return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await executeImport(buffer, provider, reconciliations);

    logAction({
      action: 'IMPORT',
      entityType: 'SYSTEM',
      entityName: `Importación ${provider}`,
      details: {
        provider,
        totalParsed: result.totalParsed,
        totalInserted: result.totalInserted,
        totalSkipped: result.totalSkipped,
        newAccounts: result.newAccountsCreatedCount,
        newCategories: result.newCategoriesCreatedCount,
        newSubcategories: result.newSubcategoriesCreatedCount,
        fileName: file.name,
      },
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error en /api/import/commit:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
