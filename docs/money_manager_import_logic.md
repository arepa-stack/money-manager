# Especificación de Diseño y Lógicas de Negocio: Importación de Money Manager

Este documento define la arquitectura de negocio y las reglas lógicas para el sistema de importación de datos financieros provenientes de la aplicación "Money Manager". Está diseñado para ser consumido por un agente de IA como base fundamental para construir la aplicación desde cero, enfocándose puramente en la lógica del dominio, las entidades, las invariantes de negocio y los flujos de usuario, aislando los detalles de implementación (Screaming Architecture).

## 1. Contexto del Negocio

El usuario requiere una aplicación capaz de consolidar, almacenar y analizar sus registros contables personales (Money Manager Expense & Budget). Para esto, el sistema debe ser capaz de ingerir archivos de exportación (principalmente Excel `.xls`), normalizar la información y poblar el modelo de dominio central, garantizando consistencia, tolerancia a errores y soporte multi-moneda.

## 2. Entidades Principales del Dominio (Domain Entities)

El modelo de dominio se compone de las siguientes entidades, las cuales deben ser independientes de la base de datos y la interfaz de usuario:

*   **Transaction (Transacción)**: Entidad central. Representa un evento financiero. Contiene fecha, tipo, monto, moneda, categoría, cuenta y notas.
*   **Account (Cuenta)**: Representa los orígenes o destinos de fondos (ej. Binance, Banesco Panamá, Efectivo). Cada transacción debe estar vinculada obligatoriamente a una cuenta.
*   **Category & Subcategory (Categoría y Subcategoría)**: Elementos para clasificar gastos o ingresos. Deben soportar jerarquías simples (Categoría padre -> Múltiples subcategorías).
*   **Currency (Moneda)**: Representa las divisas manejadas (USD, VES, EUR). El sistema es inherentemente multi-moneda.

## 3. Estructura del Origen de Datos (Diccionario del Export de Money Manager)

El sistema debe ser capaz de interpretar las columnas nativas generadas por Money Manager. El mapeo lógico es el siguiente:

| Columna Original | Obligatoriedad | Mapeo Lógico en Dominio | Reglas de Negocio y Transformación |
| :--- | :--- | :--- | :--- |
| **Fecha** | Requerido | `date` | Contiene la fecha y hora. **Regla de oro:** Puede venir como un *serial number* de Excel (ej. `46237.478...`) o como un string formateado (ej. `06/03/2026 20:35:54`). El parser debe ser agnóstico y unificar todo a UTC o zona horaria local consistente. |
| **Cuenta** | Requerido | `account` | Nombre en texto de la cuenta. |
| **Categoría** | Requerido | `category` | Nombre de la categoría principal. |
| **Subcategorías** | Opcional | `subcategory` | Si está presente, refina la transacción. Si no, se asigna `null` o `default`. |
| **Nota** | Opcional | `note` | Comentarios del usuario (ej. "Mensualidad Say Park III mamá"). |
| **USD** | Opcional/Req. | `baseAmount` | Representa el valor estandarizado en la moneda base del sistema (en este caso, Dólares). Vital para reportes globales sin importar la moneda original. |
| **Ingreso/Gasto** | Requerido | `transactionType` | Clasifica la operación. Valores esperados típicos: `Gasto`, `Ingreso`, `Dinero gastado` (suele indicar transferencia o gasto deducido), `Transferencia`. |
| **Descripción** | Opcional | `description` | Suplementario a la nota. |
| **Importe** | Requerido | `amount` | El monto en la moneda original en la que ocurrió el evento (ej. `30`, `50`). |
| **Moneda** | Requerido | `currency` | El código de la divisa (ej. `USD`, `VES`). |
| **Cuenta** *(Última Col)*| Ignorar | - | En algunos exports, la última columna se llama "Cuenta" pero repite el valor del "Importe". La lógica de negocio debe ignorarla de forma segura. |

## 4. Lógicas y Reglas de Negocio Centrales (Core Business Rules)

### 4.1. Regla de Idempotencia y Prevención de Duplicados
Es común que el usuario exporte rangos de fechas superpuestos (ej. exporta Enero a Marzo, luego Febrero a Abril). 
*   **Decisión:** El sistema **no debe** insertar transacciones duplicadas.
*   **Lógica:** Se debe generar un `hash` único o una clave compuesta por transacción (ej. `hash(Fecha + Cuenta + Categoría + Importe + Moneda + Nota)`). 
*   **Flujo:** Antes de la inserción, el sistema evalúa si el hash ya existe. Si existe, se descarta silently (o se actualiza si hay cambios, según la estrategia elegida, aunque el descarte es más seguro).

### 4.2. Resolución de Entidades Dinámicas (Upsert de Referencias)
Al procesar un lote de transacciones, pueden aparecer cuentas o categorías que no existen en la base de datos actual.
*   **Decisión:** El importador debe crear de forma dinámica e implícita las Cuentas, Categorías y Subcategorías nuevas que encuentre durante la ingesta.
*   **Manejo de Estado:** Para optimización (prevenir el problema N+1 queries), el proceso de importación debe primero leer todas las entidades únicas del archivo, hacer un volcado a memoria de la BD, insertar las faltantes y construir un mapa en memoria `{"nombre_cuenta": UUID}` antes de insertar las transacciones.

### 4.3. Manejo de Montos, Monedas y Divisa Base
El sistema debe tratar cada transacción bajo un principio bimonetario:
1.  **Moneda Original:** Conservar el `Importe` y `Moneda` en crudo. Esto garantiza que la exactitud histórica no se pierda.
2.  **Moneda Base (USD):** Conservar el valor de la columna `USD` para reportes agregados y gráficas. Si la columna `USD` viene vacía en el futuro, el sistema debería idealmente buscar el tipo de cambio histórico, pero para la Fase 1, se asume que Money Manager lo provee.

### 4.4. Clasificación de Tipos de Transacción (Categorization) y Partida Doble

El sistema debe normalizar los textos de `Ingreso/Gasto` a Enums del Dominio:
*   `Gasto` -> `EXPENSE` (El valor debe ser tratado como negativo en cálculos de balance).
*   `Ingreso` -> `INCOME` (Valor positivo).
*   `Transferencia` / `Dinero gastado` -> `TRANSFER` (Representa una transferencia entre cuentas).
*   *Lógica de Partida Doble para Transferencias:* Para transacciones de tipo `TRANSFER`:
    - La columna **Cuenta** original es el origen (`accountId`).
    - La columna **Categoría** contiene el nombre de la cuenta de destino. Este nombre debe ser interceptado, crearse la cuenta en la base de datos si no existe (mediante un upsert masivo), y asociarse al campo `destinationAccountId` de la transacción.
    - La transacción **nunca** debe insertarse en la tabla de categorías utilizando este string. En su lugar, se asocia internamente a una categoría de sistema única llamada `"Transferencia"` (tipo `TRANSFER`).
    - El saldo de las cuentas se rige por la partida doble:
      `Balance = SUM(INCOME) - SUM(EXPENSE) - SUM(TRANSFER_OUT) + SUM(TRANSFER_IN)`
      donde `TRANSFER_OUT` representa la transferencia que sale de la cuenta de origen (`accountId`), y `TRANSFER_IN` representa la transferencia que ingresa a la cuenta de destino (`destinationAccountId`).

## 5. Diseño del Flujo de Trabajo (Import Workflow)

Para que el agente entienda cómo orquestar el flujo desde la UI hasta la BD, el flujo ideal es en 2 fases (Patrón *Preview-Confirm*):

1.  **Fase de Análisis (Dry Run):**
    *   **Input:** Archivo `.xls` o `.csv`.
    *   **Acción:** El sistema parsea el archivo, ejecuta las reglas de validación y chequea idempotencia *sin guardar en BD*.
    *   **Output:** Genera un resumen (Payload) que dice: *"Se encontraron 150 transacciones. 100 son nuevas, 50 son duplicadas y serán omitidas. Se crearán 2 cuentas nuevas (Binance, Banesco)."*
2.  **Fase de Confirmación (Commit):**
    *   **Input:** Identificador de la carga analizada (o el archivo nuevamente con un flag de confirmación).
    *   **Acción:** El sistema ejecuta el plan de la Fase 1 transaccionalmente en la Base de Datos.
    *   **Output:** Confirmación de éxito.

## 6. Arquitectura Recomendada para el Agente (Clean Architecture)

El agente encargado de implementar esto debe estructurar el código (preferiblemente en NestJS o un framework modular) de la siguiente manera:

*   `domain/`: Interfaces de `Transaction`, `Account`, `Category`. Enum `TransactionType`.
*   `application/use-cases/`: 
    *   `ParseStatementFileUseCase`: Recibe el archivo y lo convierte a DTOs unificados manejando la rareza de las fechas de Excel.
    *   `AnalyzeImportUseCase`: Aplica la lógica de detección de cuentas nuevas y duplicados. (Fase 1).
    *   `ExecuteImportUseCase`: Realiza la persistencia usando transacciones de BD. (Fase 2).
*   `infrastructure/parsers/`: Implementación específica usando librerías como `xlsx` o `csv-parser`.

## 7. Casos de Borde (Edge Cases) a Prever

*   **Fechas Inválidas o Vacías:** Rechazar la fila completa. No se pueden permitir transacciones huérfanas en el tiempo.
*   **Montos en Cero:** Generalmente son errores de tipeo del usuario en la app original, pero podrían ser válidos (ej. registrando un servicio gratuito). Permitir, pero quizas emitir un warning en el dry-run.
*   **Comas vs Puntos Decimales:** Los archivos exportados según el *locale* del teléfono pueden tener `310,5` o `310.5`. El parser numérico debe sanitizar la cadena antes de castear a Float. (Se evidenció esto en los archivos de prueba existentes donde existen montos con decimales y textos como "Pago, con, comas").
