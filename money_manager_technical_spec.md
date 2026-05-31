# Especificación Técnica Core: Importación de Datos de Money Manager

Este documento detalla exhaustivamente la arquitectura técnica, estructuras de datos, algoritmos y esquemas de base de datos necesarios para implementar el motor de importación de Money Manager. Está enfocado estrictamente en la capa de persistencia y lógica (backend core) para garantizar robustez, consistencia transaccional e idempotencia.

---

## 1. Stack Tecnológico Sugerido (Backend)
- **Framework:** NestJS (Node.js).
- **ORM:** TypeORM o Prisma (Se asume relacional, PostgreSQL recomendado).
- **Librerías Core:** `xlsx` (para parsing de Excel y CSV), `crypto` (nativa de Node para hashes), `class-validator` y `class-transformer` (para validación de DTOs), `date-fns` o `dayjs` (para parsing de fechas).

---

## 2. Esquemas de Base de Datos (Relacional)

El motor requerirá las siguientes tablas con sus respectivas restricciones de integridad:

### 2.1. `accounts`
- `id`: UUID (Primary Key).
- `name`: VARCHAR(255) (Unique Index - clave para evitar duplicados en la creación al vuelo).
- `created_at`: TIMESTAMP.

### 2.2. `categories`
- `id`: UUID (Primary Key).
- `name`: VARCHAR(255) (Unique Index).
- `type`: ENUM('INCOME', 'EXPENSE', 'TRANSFER').

### 2.3. `subcategories`
- `id`: UUID (Primary Key).
- `category_id`: UUID (Foreign Key -> `categories.id`, Indexed).
- `name`: VARCHAR(255).
- `Unique Constraint`: (`category_id`, `name`).

### 2.4. `transactions`
- `id`: UUID (Primary Key).
- `import_hash`: VARCHAR(64) (Unique Index). **Crítico para Idempotencia**.
- `transaction_date`: TIMESTAMP WITH TIME ZONE (Indexed).
- `account_id`: UUID (Foreign Key -> `accounts.id`, Indexed).
- `category_id`: UUID (Foreign Key -> `categories.id`).
- `subcategory_id`: UUID (Foreign Key -> `subcategories.id`, Nullable).
- `transaction_type`: ENUM('INCOME', 'EXPENSE', 'TRANSFER').
- `amount`: DECIMAL(15, 4) (Valor original).
- `currency`: VARCHAR(3) (ej. 'USD', 'VES').
- `base_amount_usd`: DECIMAL(15, 4) (Valor estándar en USD).
- `note`: TEXT (Nullable).
- `description`: TEXT (Nullable).
- `created_at`: TIMESTAMP.

---

## 3. Data Transfer Objects (DTOs) y Transformación

El proceso pasa por tres estados de datos.

### Estado 1: `RawRowDTO` (Fila cruda del Parser)
Representa exactamente lo que lee la librería `xlsx`. Todos los campos pueden ser strings o numbers dependiendo del formato original de Excel.

### Estado 2: `ParsedTransactionDTO`
Este DTO es el resultado de la sanitización. Se valida mediante `class-validator`.

```typescript
class ParsedTransactionDTO {
  @IsDate()
  date: Date;

  @IsString()
  @IsNotEmpty()
  accountName: string;

  @IsString()
  @IsNotEmpty()
  categoryName: string;

  @IsOptional()
  @IsString()
  subcategoryName?: string;

  @IsNumber()
  amount: number;

  @IsString()
  @Length(3, 3)
  currency: string;

  @IsNumber()
  baseAmountUsd: number;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  @IsOptional()
  description?: string;
  
  // Propiedad inyectada post-sanitización
  @IsString()
  importHash: string; 
}
```

---

## 4. Algoritmos Críticos (Core Logic)

### 4.1. Algoritmo de Parsing de Fechas (Excel Date Quirk)
Las fechas en Money Manager exportadas en `.xls` pueden venir en dos sabores. El agente debe implementar una lógica condicional fuerte:

```typescript
function parseExcelDate(rawValue: string | number): Date {
  if (typeof rawValue === 'number') {
    // Es un Excel Serial Date (Días transcurridos desde 1/1/1900)
    // Formula de conversión segura en JS:
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const millisecondsPerDay = 86400000;
    return new Date(excelEpoch.getTime() + rawValue * millisecondsPerDay);
  } else if (typeof rawValue === 'string') {
    // Viene como string tipo "06/03/2026 20:35:54"
    // Hay que parsear manualmente asumiendo DD/MM/YYYY HH:mm:ss
    // Precaución: usar un parseador estricto para evitar invalid dates.
    return parse(rawValue, 'dd/MM/yyyy HH:mm:ss', new Date());
  }
  throw new Error('Formato de fecha irreconocible');
}
```

### 4.2. Algoritmo de Generación de Hash de Idempotencia
Para evitar que una transacción se importe dos veces si el usuario sube archivos solapados en fechas, se debe generar un hash SHA-256 criptográfico con los datos inmutables de la transacción.

```typescript
import * as crypto from 'crypto';

function generateImportHash(dto: Partial<ParsedTransactionDTO>): string {
  // 1. Normalizar fecha a string ISO UTC
  const dateIso = dto.date.toISOString();
  // 2. Normalizar montos (redondear a 2 decimales para evitar problemas de coma flotante)
  const amountStr = Number(dto.amount).toFixed(2);
  // 3. Limpiar espacios extra
  const acc = dto.accountName.trim().toLowerCase();
  const cat = dto.categoryName.trim().toLowerCase();
  const noteStr = dto.note ? dto.note.trim().toLowerCase() : '';
  
  // String base de concatenación (El orden debe ser estricto)
  const rawString = `${dateIso}|${acc}|${cat}|${amountStr}|${dto.currency}|${noteStr}`;
  
  return crypto.createHash('sha256').update(rawString).digest('hex');
}
```

### 4.3. Normalización del Tipo de Transacción y Montos
- Input `Gasto` / `Dinero gastado`: Asignar `TransactionType.EXPENSE`. El `amount` crudo de Excel suele venir en positivo. La BD debe almacenarlo **negativo** o absoluto dependiendo de la convención del proyecto, pero matemáticamente debe restar en el dominio. *Recomendación técnica:* Guardar el `amount` como absoluto en la BD y dejar que la lógica SQL aplique el signo según el `transaction_type`.
- Input `Ingreso`: Asignar `TransactionType.INCOME`.
- Si `baseAmountUsd` (Columna USD) viene vacío, hacer fallback a 0 temporalmente, o rechazar si es estricto.

---

## 5. Arquitectura del Flujo de Procesamiento (The Engine)

El flujo debe ejecutarse idealmente en una transacción de base de datos para asegurar el "Todo o Nada" (ACID). El servicio orquestador debe seguir estos pasos exactos (Complejidad Temporal minimizada O(n)):

#### Fase 1: Extracción y Sanitización
1. Cargar archivo en buffer.
2. Usar `xlsx` para obtener el Array crudo `sheet_to_json(..., {header: 1})`. Ignorar fila 0 (headers).
3. Map sobre el array: convertir cada fila en `ParsedTransactionDTO` aplicando `parseExcelDate()` y `generateImportHash()`.
4. Si un registro falla validación estructural, detener la importación y retornar Array de errores con número de fila.

#### Fase 2: Resolución Relacional Masiva (Entity Upserting)
Para no hacer 1 insert por cada fila en BD, se hace de manera agrupada (Bulk/Batch).
1. **Cuentas**:
   - Extraer arreglo único de `accountName` de los DTOs.
   - Hacer Query: `SELECT id, name FROM accounts WHERE name IN (...)`.
   - Calcular diferencia: ¿Qué cuentas faltan en la BD?
   - Si hay faltantes, hacer `INSERT INTO accounts (name) VALUES ...` usando Bulk Insert.
   - Volver a consultar y construir un `Map<string, string>` en memoria donde Key=Nombre y Value=UUID.
2. **Categorías y Subcategorías**:
   - Mismo patrón. Extraer combinaciones únicas.
   - Buscar y hacer Bulk Insert de categorías faltantes.
   - Buscar y hacer Bulk Insert de subcategorías faltantes.
   - Construir mapas en memoria: `Map<string, UUID>` para Categorías y `Map<string_string(Cat_Sub), UUID>` para Subcategorías.

#### Fase 3: Filtrado de Duplicados (Idempotency Check)
1. Extraer arreglo de todos los `importHash` de los DTOs.
2. Hacer Query: `SELECT import_hash FROM transactions WHERE import_hash IN (...)`.
3. Filtrar los DTOs que ya existen en ese listado en memoria. Estos DTOs se marcan como "Omitidos" y no avanzan.

#### Fase 4: Preparación y Commit Transaccional
1. Mapear los DTOs resultantes (no duplicados) a Entidades de TypeORM / Prisma.
2. Usar los Mapas en memoria generados en la Fase 2 para asignar los `account_id`, `category_id` y `subcategory_id` sin tocar la BD.
3. Hacer Bulk Insert: `INSERT INTO transactions ...` con lotes (chunks) de 1000 registros para no agotar la memoria del driver SQL.
4. Confirmar la transacción (`COMMIT`).
5. Retornar DTO de resultado: `Result { totalParsed, totalInserted, totalSkipped, newAccountsCreated, newCategoriesCreated }`.

---

## 6. Consideraciones de Seguridad y Rendimiento

- **Uso de Memoria (RAM):** Archivos de Money Manager rara vez exceden los 10,000 registros. Todo este pipeline de importación en Node.js debería consumir < 100MB de RAM. No es imperativo usar Streams para la lectura (como sí lo sería si habláramos de 1 millón de registros), pero usar *Bulk Inserts* es obligatorio para no ahogar las conexiones del Connection Pool de la base de datos.
- **Transaccionalidad Cruzada:** Si la *Fase 4* falla por un constraint de BD, todo lo creado en la *Fase 2* (nuevas cuentas) idealmente debe hacer rollback si se engloba bajo el mismo `QueryRunner` o Prisma Transaction.
