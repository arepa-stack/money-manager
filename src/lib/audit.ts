import prisma from '@/lib/prisma';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'IMPORT';
export type AuditEntityType =
  | 'ACCOUNT'
  | 'CATEGORY'
  | 'SUBCATEGORY'
  | 'TRANSACTION'
  | 'SYSTEM';

export interface LogActionParams {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  entityName?: string;
  /** Cualquier objeto serializable con contexto adicional (valores anteriores/nuevos, conteos, etc.) */
  details?: Record<string, unknown>;
}

/**
 * Registra una acción de auditoría en la base de datos.
 * Es segura de llamar sin await: los errores de logging nunca interrumpen la operación principal.
 */
export async function logAction(params: LogActionParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        entityName: params.entityName ?? null,
        details: params.details ? JSON.stringify(params.details) : null,
      },
    });
  } catch (err) {
    // El log no debe bloquear ni romper la operación principal
    console.error('[AuditLog] Error al registrar acción:', err);
  }
}
