# Registro de Mejoras y Cambios — Versión 1.2 (UX, Productividad y Multidivisa)

Este documento detalla las nuevas características, cambios de base de datos, endpoints de API, integraciones visuales y lógica técnica implementados en la **Versión 1.2** de la aplicación Money Manager. Está especialmente estructurado para servir como fuente de conocimiento en NotebookLM.

---

## 1. Actualización del Modelo de Datos (Prisma Schema)

Para soportar presupuestos y clasificación avanzada de cuentas por moneda y tipo de pasivo/activo, se extendió la base de datos en [schema.prisma](file:///c:/Users/User/Documents/Repositorios/personales/money-manager/prisma/schema.prisma):

```prisma
model Account {
  id                String        @id @default(uuid())
  name              String        @unique
  type              String        @default("CASH") // CASH, BANK, CREDIT_CARD, INVESTMENT
  currency          String        @default("USD")  // USD, VES, EUR, etc.
  createdAt         DateTime      @default(now()) @map("created_at")
  transactions      Transaction[] @relation("TransferOrigin")
  receivedTransfers Transaction[] @relation("TransferDestination")

  @@map("accounts")
}

model Category {
  id            String        @id @default(uuid())
  name          String        @unique
  type          String        // INCOME, EXPENSE, TRANSFER
  budgetUsd     Int?          @map("budget_usd") // Presupuesto mensual límite en centavos de USD
  subcategories Subcategory[]
  transactions  Transaction[]

  @@map("categories")
}
```

---

## 2. Nuevos Endpoints y Cambios en Backend (API)

### A. Conciliación de Tarjetas de Crédito como Pasivo
* **Ruta:** `GET /api/accounts/balances`
* **Lógica:** Al calcular el saldo consolidado de las cuentas, las de tipo `CREDIT_CARD` actúan como pasivos y restan del Patrimonio Neto Consolidado. El cálculo interno es:
  $$\text{Patrimonio Neto} = \sum (\text{Activos}) - \sum (\text{Pasivos: Tarjetas de Crédito})$$

### B. Consumo Mensual de Presupuesto por Categoría
* **Ruta:** `GET /api/categories/spending`
* **Lógica:** Recupera dinámicamente los gastos (`EXPENSE`) del mes en curso y los agrupa por categoría, devolviendo un mapa de consumos en centavos de USD: `{ [categoryId]: totalSpentInCents }`.
* **Fórmula de gasto en USD:** La agregación utiliza el campo `baseAmountUsd` para asegurar consistencia multi-moneda contra el presupuesto establecido.

### C. Filtros Avanzados del Historial
* **Ruta:** `GET /api/transactions`
* **Parámetros Añadidos:** `categoryId` y `transactionType` para filtrar los movimientos del historial al vuelo.

---

## 3. Rediseño del Dashboard (Saldos y Evolución)

Implementado en [AccountBalances.tsx](file:///c:/Users/User/Documents/Repositorios/personales/money-manager/src/components/AccountBalances.tsx):
* **Patrimonio Neto Consolidado:** Tarjeta prominente con cálculo dinámico en tiempo real. Las cuentas con saldo negativo (sobregiradas) se tiñen de rojo.
* **Panel de Acciones Rápidas:** Tres botones de acceso rápido (💸 Gasto, 💰 Ingreso, 🔄 Transferir) que abren el modal de transacciones con el tipo de movimiento preseleccionado.
* **Gráfico Donut de Activos SVG Custom:** Renderizado matemático de la distribución de fondos de cuentas activas en USD. Utiliza un círculo SVG nativo con cálculo de desfase perimetral (`strokeDashoffset` y `strokeDasharray`), incluyendo Tooltips nativos SVG (`<title>`) compatibles con TypeScript.
* **Iconografía en Lista:** Asignación visual por tipo de cuenta:
  * `CASH` ➡️ 💵 Efectivo
  * `BANK` ➡️ 🏦 Banco / Débito
  * `CREDIT_CARD` ➡️ 💳 Tarjeta de Crédito (Pasivo)
  * `INVESTMENT` ➡️ 📈 Inversión

---

## 4. Historial, Filtros y Duplicado de Transacciones

Implementado en [page.tsx](file:///c:/Users/User/Documents/Repositorios/personales/money-manager/src/app/page.tsx), [TransactionTable.tsx](file:///c:/Users/User/Documents/Repositorios/personales/money-manager/src/components/TransactionTable.tsx) y [CalendarView.tsx](file:///c:/Users/User/Documents/Repositorios/personales/money-manager/src/components/CalendarView.tsx):
* **Reorganización de UI:** El botón para registrar transacciones se ubicó en la zona superior de la pestaña. El panel estadístico superior se hizo colapsable (`showAnalytics`) para maximizar el área de trabajo en pantallas pequeñas.
* **Acción Duplicar (Clonar):**
  * Se agregó un botón de clonado (icono de hojas superpuestas) en cada fila de la tabla y en las tarjetas móviles.
  * Al hacer clic, abre `EditTransactionModal` en modo de creación (`isDuplicate: true`), copiando campos como cuenta, tipo, importe, divisa, equivalente USD, categoría, notas y descripción, pero fijando la fecha al día de hoy.
* **Tasa de Cambio Implícita en Tablas:**
  * Si la transacción se realiza en una divisa distinta a USD, la tabla muestra la tasa implícita calculada debajo del importe original.
  * **Fórmula implícita general:** $\text{Tasa} = \frac{\text{Importe Original}}{\text{Equivalente USD}}$ (ej. `40.00 VES/$`).
  * **Fórmula implícita del Euro:** $\text{Tasa} = \frac{\text{Equivalente USD}}{\text{Importe Original}}$ (ej. `1.0850 $/€` para coincidir con la convención cambiaria del Euro).

---

## 5. Selector y Conversión Automática de Divisas

Implementado en [EditTransactionModal.tsx](file:///c:/Users/User/Documents/Repositorios/personales/money-manager/src/components/EditTransactionModal.tsx):
* **Sincronización por Cuenta:** En modo creación, al cambiar la cuenta seleccionada, la divisa del modal se actualiza automáticamente con la divisa nativa de esa cuenta.
* **Selector Dropdown y Otra Divisa:** El campo divisa ahora es un dropdown interactivo (`USD`, `VES`, `EUR`). Al seleccionar "Otra divisa...", cambia a un campo de texto libre para ingresar códigos personalizados (ej. `COP`).
* **Cálculo Cambiario al Vuelo:** Si la divisa seleccionada en el formulario es `VES` o `EUR`, se consulta localmente el endpoint `/api/bcv/rates` y se renderiza un panel de sugerencia con dos botones:
  * **Tasa Oficial (BCV)**
  * **Tasa Paralela**
  * Al pulsar cualquiera de las opciones calculadas, el campo de equivalente en USD (`baseAmountUsd`) se rellena automáticamente de forma instantánea.

---

## 6. Verificación e Integridad

* **Typechecking:** El compilador de TypeScript valida el código exitosamente (`pnpm exec tsc --noEmit`).
* **Sincronización de Base de Datos:** Los cambios en Prisma fueron migrados transaccionalmente y aplicados a la base SQLite local.
* **Persistencia:** Los resúmenes de sesión y notas de engram están almacenados localmente en `.engram/` para sincronización continua.
