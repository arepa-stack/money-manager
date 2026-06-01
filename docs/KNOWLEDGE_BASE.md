# Money Manager Import Engine — Documentación Completa del Sistema

> **Versión**: 1.0 | **Fecha**: Junio 2026 | **Entorno**: Local / Desktop App-like (sin backend en la nube)

---

## Tabla de Contenidos

1. [Visión General del Negocio](#1-visión-general-del-negocio)
2. [Problema que Resuelve](#2-problema-que-resuelve)
3. [Usuarios y Casos de Uso](#3-usuarios-y-casos-de-uso)
4. [Arquitectura del Sistema](#4-arquitectura-del-sistema)
5. [Stack Tecnológico](#5-stack-tecnológico)
6. [Modelo de Datos](#6-modelo-de-datos)
7. [Lógica de Importación](#7-lógica-de-importación)
8. [Lógica de Consultas y Reportes](#8-lógica-de-consultas-y-reportes)
9. [Lógica de Categorías](#9-lógica-de-categorías)
10. [API REST — Contrato de Endpoints](#10-api-rest--contrato-de-endpoints)
11. [Componentes de Interfaz de Usuario](#11-componentes-de-interfaz-de-usuario)
12. [Flujos de Navegación](#12-flujos-de-navegación)
13. [Decisiones de Diseño Técnico](#13-decisiones-de-diseño-técnico)
14. [Estructura de Archivos del Proyecto](#14-estructura-de-archivos-del-proyecto)
15. [Configuración y Despliegue Local](#15-configuración-y-despliegue-local)
16. [Limitaciones Actuales y Roadmap](#16-limitaciones-actuales-y-roadmap)
17. [Glosario](#17-glosario)

---

## 1. Visión General del Negocio

El **Money Manager Import Engine** es una aplicación web de uso personal que permite importar y analizar estados de cuenta financieros exportados desde la aplicación móvil Money Manager (iOS/Android de Real Byte Apps Inc.).

La aplicación funciona completamente en local (localhost), sin enviar datos a ningún servidor externo. Opera como una herramienta de inteligencia financiera personal donde todos los datos viven en un archivo SQLite local en el equipo del usuario.

### Propósito Principal

- **Consolidar** extractos de múltiples cuentas bancarias y billeteras digitales en una sola vista unificada.
- **Eliminar duplicados** automáticamente al reimportar archivos que ya fueron procesados parcialmente.
- **Catalogar** transacciones bajo categorías y subcategorías con la posibilidad de editar sus nombres post-importación.
- **Visualizar** la evolución patrimonial neta mes a mes mediante un gráfico SVG interactivo.
- **Filtrar** el historial de movimientos por cuenta, fecha de inicio y fecha de fin.

### Características Clave de Negocio

| Característica | Descripción |
|---|---|
| Idempotencia de importación | Re-importar el mismo archivo no crea duplicados gracias a hash SHA-256 |
| Multi-cuenta | Soporta ilimitadas cuentas (bancarias, cash, crypto, etc.) |
| Multi-moneda | Almacena el monto original + su equivalente en USD base |
| Auto-catalogación | Cuentas, categorías y subcategorías se crean automáticamente al importar |
| Edición de catálogo | Los nombres de categorías/subcategorías pueden editarse sin afectar el historial |
| Gráfico deslizante | Visualización de evolución patrimonial con ventana de 6 meses navegable |

---

## 2. Problema que Resuelve

La aplicación móvil **Money Manager** permite registrar transacciones a mano y exportarlas en formato Excel (.xls / .xlsx). Sin embargo presenta las siguientes limitaciones:

1. No ofrece análisis avanzado ni visualizaciones de tendencias patrimoniales.
2. No permite consolidar datos de múltiples cuentas en una sola vista de patrimonio neto.
3. La exportación es un snapshot estático, sin histórico acumulativo.
4. No hay forma de renombrar categorías de forma masiva post-registro.

### Solución Implementada

El sistema actúa como un **motor de consolidación financiera local** que:
- Ingiere los archivos Excel exportados por Money Manager.
- Normaliza los datos (fechas, montos, monedas, categorías).
- Los persiste en SQLite con reglas de deduplicación estrictas.
- Provee una interfaz web para consulta, análisis y edición del catálogo.

---

## 3. Usuarios y Casos de Uso

### Usuario Objetivo

Usuario individual con conocimientos básicos de finanzas personales, que usa Money Manager para llevar registro manual de sus transacciones y quiere análisis más profundo sin depender de herramientas en la nube.

### CU-01: Importar un Extracto

1. El usuario exporta sus transacciones desde Money Manager como Excel.
2. Carga el archivo en la pestaña "Consola de Importación".
3. El sistema analiza el archivo y muestra un preview con: total de filas, nuevas entidades a crear y duplicados detectados.
4. El usuario confirma la importación.
5. El sistema inserta las transacciones nuevas y reporta el resultado (insertadas, omitidas, entidades creadas).

### CU-02: Consultar Historial de Movimientos

1. El usuario navega a la pestaña "Historial de Movimientos".
2. Filtra por cuenta bancaria y/o rango de fechas.
3. El sistema muestra las transacciones agrupadas por día con badges indicando el día de la semana.
4. Se muestran métricas del período: balance neto, ingresos totales, gastos totales.

### CU-03: Consultar Saldos y Evolución

1. El usuario navega a "Saldos y Evolución".
2. Ve los balances actuales por cuenta.
3. Ve el gráfico SVG de evolución patrimonial neta (últimos 6 meses por defecto).
4. Navega el gráfico hacia meses anteriores usando flechas izquierda/derecha.

### CU-04: Editar Categorías y Subcategorías

1. El usuario navega a "Categorías".
2. Busca una categoría o subcategoría por nombre.
3. Hace hover sobre el ítem y clickea el ícono de lápiz.
4. Edita el nombre inline y presiona Enter o "Guardar".
5. El sistema valida unicidad y persiste el cambio. El historial se actualiza automáticamente.

### CU-05: Limpiar la Base de Datos

1. El usuario presiona "Limpiar Base de Datos" en el header.
2. Confirma la acción en el diálogo de alerta.
3. El sistema borra todo en orden transaccional.
4. La UI regresa a la pestaña "Consola de Importación".

---

## 4. Arquitectura del Sistema

El sistema sigue una arquitectura de **monolito modular** con separación clara de 4 capas:

**Capa de Presentación**: Next.js App Router + React Components + Tailwind CSS (page.tsx + componentes en /src/components/)

**Capa de API REST**: Next.js Route Handlers (/api/*) con validación de inputs y manejo de errores.

**Capa de Lógica de Negocio**: Use Cases (AnalyzeImportUseCase, ExecuteImportUseCase) y Parser (moneyManagerParser que convierte XLSX a ParsedTransaction[]).

**Capa de Datos**: Prisma ORM 7 + better-sqlite3 adapter + SQLite (archivo local prisma/dev.db).

### Principios de Diseño Adoptados

- **Sin estado del lado del servidor**: Las rutas API son stateless; el estado vive en SQLite o en el cliente React.
- **Singleton de Prisma**: El cliente Prisma se instancia una sola vez y se recicla entre requests en desarrollo (patrón globalThis).
- **Separación Parser/UseCase**: El parser transforma bytes a DTOs ParsedTransaction; los use cases contienen la lógica transaccional con Prisma.
- **Idempotencia**: El hash SHA-256 garantiza que re-importar el mismo archivo nunca crea duplicados.

---

## 5. Stack Tecnológico

### Dependencias de Producción

| Paquete | Versión | Rol |
|---|---|---|
| next | 16.2.6 | Framework web (App Router, SSR/CSR) |
| react + react-dom | 19.2.4 | UI library |
| @prisma/client | ^7.8.0 | ORM generado — acceso a SQLite |
| @prisma/adapter-better-sqlite3 | ^7.8.0 | Adaptador Prisma Driver para SQLite |
| better-sqlite3 | ^12.10.0 | Driver SQLite binario (synchronous, high performance) |
| xlsx | ^0.18.5 | Parsing de archivos Excel (.xls / .xlsx) |
| date-fns | ^4.4.0 | Parsing y formateo de fechas |
| zod | ^4.4.3 | Validación de schemas |

### Dependencias de Desarrollo

| Paquete | Versión | Rol |
|---|---|---|
| tailwindcss | ^4 | Utility-first CSS framework |
| typescript | ^5 | Tipado estático |
| prisma CLI | ^7.8.0 | Generación de cliente, migraciones |
| eslint | ^9 | Linting |

### Herramientas de Entorno

- **Runtime**: Node.js v20+
- **Package Manager**: pnpm v10+ con workspace (pnpm-workspace.yaml)
- **Base de datos**: SQLite (archivo prisma/dev.db)
- **Servidor de desarrollo**: pnpm dev → next dev en http://localhost:3000

### Nota de Compatibilidad Importante

Este proyecto usa **Next.js 16** (App Router) con **Prisma 7**. Prisma 7 introdujo cambios breaking: usa un sistema de "driver adapters" obligatorio y el cliente se genera en src/generated/prisma/ en lugar de node_modules. La configuración está en prisma.config.ts (no solo en prisma/schema.prisma).

---

## 6. Modelo de Datos

### Esquema Prisma (SQLite)

#### Entidad Account (tabla: accounts)

Representa una cuenta financiera del usuario (bancaria, wallet, efectivo, etc.).

| Campo | Tipo | Restricción | Descripción |
|---|---|---|---|
| id | String UUID | PK | Identificador único |
| name | String | UNIQUE | Nombre de la cuenta (ej: "Banesco Panamá", "Binance", "Cash") |
| createdAt | DateTime | Default NOW | Fecha de creación del registro |
| transactions | Transaction[] | Relación | Transacciones asociadas |

#### Entidad Category (tabla: categories)

Categoría principal de clasificación de transacciones.

| Campo | Tipo | Restricción | Descripción |
|---|---|---|---|
| id | String UUID | PK | Identificador único |
| name | String | UNIQUE global | Nombre de la categoría |
| type | String | — | Tipo: INCOME, EXPENSE, o TRANSFER |
| subcategories | Subcategory[] | Relación | Subcategorías hijas |
| transactions | Transaction[] | Relación | Transacciones directas |

#### Entidad Subcategory (tabla: subcategories)

Subclasificación dentro de una categoría padre.

| Campo | Tipo | Restricción | Descripción |
|---|---|---|---|
| id | String UUID | PK | Identificador único |
| categoryId | String FK | NOT NULL | ID de la categoría padre |
| category | Category | FK onDelete Cascade | Relación al padre |
| name | String | UNIQUE dentro de categoryId | Nombre de la subcategoría |
| transactions | Transaction[] | Relación | Transacciones asociadas |

**Regla de unicidad de subcategorías**: El par (categoryId, name) es único. El mismo nombre puede usarse en diferentes categorías padre. Esta restricción se valida también a nivel de aplicación.

#### Entidad Transaction (tabla: transactions)

Registro central de un movimiento financiero.

| Campo | Tipo | Restricción | Descripción |
|---|---|---|---|
| id | String UUID | PK | Identificador único |
| importHash | String | UNIQUE | Hash SHA-256 de deduplicación |
| transactionDate | DateTime | — | Fecha y hora del movimiento |
| accountId | String FK | NOT NULL | Cuenta bancaria |
| categoryId | String FK | NOT NULL | Categoría del movimiento |
| subcategoryId | String? FK | NULLABLE | Subcategoría (opcional) |
| transactionType | String | — | INCOME, EXPENSE, o TRANSFER |
| amount | Float | — | Monto en la moneda original (siempre positivo) |
| currency | String | — | Código ISO de moneda (USD, VES, BTC, etc.) |
| baseAmountUsd | Float | — | Equivalente en dólares americanos |
| note | String? | NULLABLE | Nota libre del usuario |
| description | String? | NULLABLE | Descripción adicional (campo del Excel) |
| createdAt | DateTime | Default NOW | Fecha de inserción en BD |

### Diagrama de Relaciones

```
Account (1) ──────── (*) Transaction
Category (1) ─────── (*) Transaction
Category (1) ─────── (*) Subcategory
Subcategory (0..1) ── (*) Transaction
```

### Reglas de Integridad Referencial

- Al borrar una Category, sus Subcategory asociadas se eliminan en cascada (onDelete: Cascade).
- Para borrar la BD completa, se debe respetar el orden: Transaction → Subcategory → Category → Account.

---

## 7. Lógica de Importación

### 7.1 Formato de Archivo Esperado

El sistema procesa archivos Excel exportados desde Money Manager. La hoja debe contener las siguientes columnas (detección insensible a mayúsculas):

| Columna Excel | Obligatorio |
|---|---|
| Fecha | Sí |
| Cuenta | Sí |
| Categoría | Sí |
| Ingreso/Gasto | Sí |
| Importe | Sí |
| Moneda | Sí |
| Subcategorías | No |
| Nota | No |
| USD | No |
| Descripción | No |

### 7.2 Parsing de Fechas

El parser soporta múltiples formatos para máxima compatibilidad:

| Formato | Ejemplo |
|---|---|
| Número serial de Excel | 46200 (días desde 1899-12-30 en UTC) |
| String DD/MM/YYYY HH:mm:ss | 31/05/2026 14:30:00 |
| String DD/MM/YYYY HH:mm | 31/05/2026 14:30 |
| String YYYY-MM-DD HH:mm:ss | 2026-05-31 14:30:00 |
| Fallback: new Date(string) | Cualquier formato parseado por el motor JS |

### 7.3 Parsing de Montos

Los montos se procesan siempre como valores absolutos positivos. El signo contable se determina exclusivamente por transactionType. El parser maneja formatos localizados:
- "310,50" → 310.50 (coma como separador decimal)
- "1,200.50" → 1200.50 (coma como separador de miles)
- "1.200,50" → 1200.50 (punto como separador de miles, coma como decimal)

### 7.4 Normalización del Tipo de Transacción

| Valor en Excel (insensible a mayúsculas) | Tipo Interno |
|---|---|
| Contiene "ingreso" | INCOME |
| Contiene "transferencia" o "transfer" | TRANSFER |
| Contiene "gasto" o "dinero gastado" | EXPENSE |
| Cualquier otro valor | EXPENSE (default seguro) |

### 7.5 Generación del Hash de Deduplicación SHA-256

Para prevenir duplicados al re-importar, cada transacción genera un hash SHA-256 determinístico basado en:

```
SHA256( fechaISO | cuenta_lower | categoría_lower | monto_2dec | moneda | nota_lower )
```

Donde:
- fechaISO: Date.toISOString() de la fecha parseada
- cuenta_lower: trim().toLowerCase()
- categoría_lower: trim().toLowerCase()
- monto_2dec: Number(amount).toFixed(2) para evitar errores de punto flotante
- moneda: código ISO tal cual (ej: "USD")
- nota_lower: trim().toLowerCase() o string vacío si es nula

Si la misma transacción se importa dos veces (con el mismo o distinto archivo), el hash será idéntico y la segunda inserción se omite.

### 7.6 Fase 1: Análisis (Read-Only)

La fase de análisis NO escribe en BD. Su objetivo es mostrar un preview al usuario antes de confirmar.

Proceso (AnalyzeImportUseCase):
1. Parsear el archivo Excel → lista de ParsedTransaction[].
2. Consultar en paralelo: cuentas existentes, categorías existentes, hashes existentes.
3. Determinar: nuevas cuentas, nuevas categorías (con su tipo inferido), nuevas subcategorías.
4. Marcar cada transacción del preview como isDuplicate: true/false.
5. Devolver ImportAnalysisResult con todos los metadatos del análisis.

### 7.7 Fase 2: Ejecución (Transaccional)

La fase de ejecución es todo o nada. Si falla cualquier paso, se hace rollback completo.

Proceso (ExecuteImportUseCase) dentro de prisma.$transaction():
1. Parsear el archivo Excel → ParsedTransaction[].
2. Insertar cuentas faltantes: Account.createMany() para cuentas nuevas.
3. Cargar mapa Account Name → ID.
4. Insertar categorías faltantes: Category.createMany() con su tipo inferido.
5. Cargar mapa Category Name → ID.
6. Insertar subcategorías faltantes: verificar unicidad por (categoryId, nombre_lowercase) usando un Set local para evitar duplicados dentro del mismo archivo.
7. Cargar mapa Subcategory categoryId_nombre_lower → ID.
8. Detectar duplicados: buscar hashes existentes en BD y excluirlos.
9. Insertar transacciones nuevas en chunks de 1000 para respetar SQLITE_MAX_VARIABLE_NUMBER.
10. Retornar ImportExecuteResult con contadores finales.

---

## 8. Lógica de Consultas y Reportes

### 8.1 Historial de Transacciones

Endpoint: GET /api/transactions

Filtros soportados por query string:
- accountId: UUID — filtrar por cuenta específica
- startDate: YYYY-MM-DD — fecha desde (incluyente, hora 00:00:00)
- endDate: YYYY-MM-DD — fecha hasta (incluyente, hora 23:59:59.999)

Respuesta: Array de hasta 200 transacciones ordenadas por transactionDate DESC, con relaciones account, category, subcategory expandidas.

El límite de 200 registros es una decisión de rendimiento. El filtrado por fecha y cuenta reduce el conjunto lo suficiente para uso normal.

### 8.2 Balances por Cuenta

Endpoint: GET /api/accounts/balances

Lógica de cálculo (todas las transacciones de la cuenta, sin filtro de fecha):
- INCOME: suma al balance y a totalIncome
- EXPENSE: resta del balance y suma a totalExpense
- TRANSFER: resta del balance (tratado como salida neta) y suma a totalExpense

Nota sobre transferencias: Una transferencia entre dos cuentas propias registradas en Money Manager aparecerá como deducción en la cuenta origen. Si ambas cuentas están en el sistema, el efecto neto a nivel patrimonio global es neutro.

Respuesta por cuenta: { accountId, accountName, balance, totalIncome, totalExpense, transactionCount }

### 8.3 Evolución Patrimonial Mensual

Endpoint: GET /api/reports/evolution

Lógica de cálculo (opera sobre TODAS las transacciones en la BD):

1. Agrupar cambios netos por mes (YYYY-MM):
   - INCOME: +baseAmountUsd
   - EXPENSE: -baseAmountUsd
   - TRANSFER: 0 (neutro a nivel patrimonial global)

2. Determinar rango temporal: desde el mes más antiguo hasta el más reciente.

3. Rellenar meses sin movimientos: Si un mes no tuvo transacciones, su cambio neto es 0, pero el balance acumulado continúa desde el mes anterior.

4. Calcular saldo acumulativo (running total):
   balance[mes_N] = balance[mes_N-1] + cambioNeto[mes_N]

Respuesta: Array cronológico de objetos { month: "YYYY-MM", balance: 12345.67 }.

Los balances son siempre en USD (baseAmountUsd), que es la moneda base del sistema para permitir comparaciones cross-currency.

---

## 9. Lógica de Categorías

### 9.1 Listado

Endpoint: GET /api/categories

Devuelve todas las categorías ordenadas por tipo (asc) y nombre (asc), con sus subcategorías ordenadas alfabéticamente incluidas.

### 9.2 Renombrado de Categorías

Endpoint: PUT /api/categories/:id

Reglas de validación:
1. El nombre no puede estar vacío (después de trim()).
2. No puede existir otra categoría con el mismo nombre (unicidad global).
3. Retorna HTTP 400 (vacío) o HTTP 409 (conflicto de nombre).

Al actualizar el nombre de una categoría, todas las transacciones que la referencian via categoryId automáticamente verán el nombre actualizado, ya que la relación es por ID, no por texto desnormalizado. Esto es la ventaja clave de usar IDs en lugar de texto plano en las transacciones.

### 9.3 Renombrado de Subcategorías

Endpoint: PUT /api/subcategories/:id

Reglas de validación:
1. El nombre no puede estar vacío.
2. No puede existir otra subcategoría con el mismo nombre dentro de la misma categoría padre (unicidad por categoryId).
3. La búsqueda de conflictos es case-insensitive.

---

## 10. API REST — Contrato de Endpoints

### Resumen de Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| POST | /api/import/analyze | Analiza un archivo Excel y devuelve preview (no escribe en BD) |
| POST | /api/import/commit | Ejecuta la importación transaccional del archivo |
| GET | /api/transactions | Lista transacciones con filtros opcionales |
| GET | /api/accounts/balances | Balances actuales por cuenta |
| GET | /api/reports/evolution | Evolución patrimonial mensual acumulada |
| GET | /api/categories | Lista categorías con subcategorías |
| PUT | /api/categories/:id | Renombra una categoría |
| PUT | /api/subcategories/:id | Renombra una subcategoría |
| POST | /api/db/clear | Borra toda la base de datos |

### Tipos de Respuesta

**ImportAnalysisResult**: { totalRows, totalParsed, totalSkippedDuplicates, newAccounts[], newCategories[], newSubcategories[], previewTransactions[] }

**ImportExecuteResult**: { totalParsed, totalInserted, totalSkipped, newAccountsCreatedCount, newCategoriesCreatedCount, newSubcategoriesCreatedCount }

---

## 11. Componentes de Interfaz de Usuario

### 11.1 Página Principal (page.tsx)

Es el único "page" del sistema (Single Page Application con pestañas). Gestiona:
- Estado global de tabs (currentTab): 'import' | 'transactions' | 'balances' | 'categories'
- Estado del proceso de importación (importState): 'upload' | 'preview' | 'success'
- Lista de transacciones filtradas y lista de cuentas para selectores
- Filtros activos: selectedAccountId, startDate, endDate
- Splash loader inicial (isResolvingDefaultTab) que previene el parpadeo de tab al cargar

**Lógica de tab por defecto**: Al cargar la página, consulta /api/accounts/balances. Si hay al menos una cuenta, redirige a 'transactions'; si la BD está vacía, muestra 'import'. Mientras resuelve, muestra un spinner centrado para evitar parpadeo visual.

### 11.2 ImportWidget

Componente de drag and drop / file input para seleccionar el archivo Excel. Invoca /api/import/analyze al recibir el archivo y emite el resultado al padre.

### 11.3 ImportPreview

Muestra los resultados del análisis pre-importación:
- Contadores: total rows, nuevas entidades, duplicados detectados
- Tabla preview de transacciones marcando cuáles son duplicados con estilo visual diferenciado
- Botones: "Confirmar Importación" (llama /api/import/commit) y "Cancelar"

### 11.4 AccountBalances

Muestra el listado de cuentas con sus balances actuales en USD. Cada fila tiene un botón para filtrar directamente el historial por esa cuenta (navega a la pestaña Historial con accountId preseleccionado).

### 11.5 DateRangePicker

Selector de rango de fechas completamente custom (sin librerías externas). Implementado como dropdown con calendario propio. Soporta selección de dos fechas (inicio y fin), navegación mensual y cierre al clickear fuera del componente.

### 11.6 MonthlyEvolutionChart

Gráfico SVG interactivo de área con lógica de ventana deslizante de 6 meses.

Lógica de ventana deslizante:
- Mantiene un índice windowStartIndex que indica desde qué mes del array total se empieza a renderizar.
- Siempre muestra exactamente 6 meses (slice(windowStartIndex, windowStartIndex + 6)).
- Al cargar datos, inicializa windowStartIndex = max(0, data.length - 6) para mostrar los últimos 6 meses por defecto.
- Flechas izquierda y derecha mueven el índice más o menos 1, con límites en [0, data.length - 6].

Matemáticas SVG:
- Viewport: 800 x 240 unidades.
- Padding: izq 75, der 25, top 25, bottom 35.
- getX(i): mapeo lineal del índice al eje X del área del gráfico.
- getY(val): mapeo lineal del valor al eje Y (invertido, ya que SVG Y crece hacia abajo).
- Protección contra división por zero cuando visibleData.length <= 1.
- Gradiente de relleno bajo la línea usando linearGradient de indigo con opacidad decreciente.
- Tooltip posicionado en HTML (no SVG) para mejor styling, aparece en hover de cada punto.

### 11.7 CategoryManager

Componente de gestión de catálogo con las siguientes funcionalidades:
- Buscador en tiempo real que filtra categorías y subcategorías por nombre.
- Agrupación por tipo con secciones diferenciadas con colores: Ingresos (esmeralda), Gastos (rosa), Transferencias (índigo).
- Cards colapsables: cada categoría es una card que se expande para mostrar subcategorías.
- Edición inline: hover muestra el ícono de lápiz. Al clickear abre un input en el lugar del texto con botones Guardar/Cancelar. Soporta Enter para guardar y Escape para cancelar.
- Actualización optimista: el estado local se actualiza inmediatamente al guardar, sin recargar toda la lista.
- Manejo de errores: muestra mensaje de error debajo del campo si hay conflicto de nombre.

---

## 12. Flujos de Navegación

### Flujo de Primera Carga con BD Vacía

1. Visita localhost:3000
2. Se muestra splash loader (isResolvingDefaultTab = true)
3. Se consulta GET /api/accounts/balances → responde con array vacío []
4. Sin cuentas: se muestra Pestaña "Consola de Importación"
5. El usuario carga su archivo Excel
6. Se invoca POST /api/import/analyze
7. Se muestra el preview de análisis (tabla + stats)
8. El usuario confirma → POST /api/import/commit
9. Se muestra pantalla de éxito con resumen
10. "Cargar Otro Archivo" vuelve al estado de upload

### Flujo de Carga con Datos Existentes

1. Visita localhost:3000
2. Se muestra splash loader
3. GET /api/accounts/balances → responde con [cuenta1, cuenta2, ...]
4. Con cuentas existentes: se muestra Pestaña "Historial de Movimientos" (tab por defecto)
5. Se carga GET /api/transactions con filtros del mes actual

### Flujo de Limpieza de BD

1. El usuario presiona "Limpiar Base de Datos" en el header
2. Aparece window.confirm() — si cancela, no pasa nada
3. Si confirma → POST /api/db/clear
4. BD vacía → currentTab = 'import'
5. La app vuelve a la Consola de Importación

---

## 13. Decisiones de Diseño Técnico

### Por qué SQLite y no PostgreSQL/MySQL

El sistema es de uso local y personal. SQLite:
- No requiere servidor de BD separado.
- El archivo dev.db es portátil (backup = copiar el archivo).
- better-sqlite3 es síncrono y extremadamente rápido para workloads de escritura/lectura local.
- Prisma 7 con Driver Adapters tiene soporte nativo para SQLite.

### Por qué el Hash SHA-256 y no una clave natural

Una clave natural compuesta (fecha + cuenta + categoría + monto) sería difícil de indexar eficientemente en SQLite. El SHA-256 produce una cadena de longitud fija (64 hex chars) indexable como @unique, es determinístico para los mismos inputs y el monto se redondea a 2 decimales antes de hashear para evitar errores de representación float.

### Por qué transacciones almacenadas como IDs y no como texto desnormalizado

Vincular transacciones a categoryId y accountId permite:
- Renombrar categorías/cuentas sin actualizar miles de registros de transacciones.
- Integridad referencial: un categoryId inválido falla en BD.
- Eficiencia: los JOINs por UUID son rápidos en SQLite con índices.

### Por qué no hay librerías de charting externas

Decisión explícita del proyecto: zero dependencias externas de gráficos. El MonthlyEvolutionChart es SVG puro generado en React con control total sobre estilos, colores y animaciones, sin overhead de librerías pesadas en el bundle.

### Por qué no hay DatePicker de librería

Misma filosofía que el gráfico. El DateRangePicker es un componente custom que evita incompatibilidades de versiones y permite integración perfecta con el design system del proyecto (colores oscuros, bordes, glassmorphism).

### Singleton de Prisma Client

En desarrollo, Next.js recarga módulos en hot reload, lo que crearía múltiples instancias del PrismaClient y agotaría las conexiones. El patrón guarda la instancia en globalThis:

```typescript
const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();
if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
```

### CSS Stacking Context y z-index

Los elementos con backdrop-filter (glassmorphism) crean nuevos stacking contexts, lo que hace que sus hijos absolutos (como dropdowns de calendario) queden por debajo de otras cards. Solución: el panel de filtros donde vive el DateRangePicker tiene "relative z-50" para elevar su stacking context por encima de los demás paneles.

---

## 14. Estructura de Archivos del Proyecto

```
money-manager/
├── prisma/
│   ├── schema.prisma              # Esquema de BD (modelos, relaciones)
│   └── dev.db                     # Archivo SQLite local (gitignored)
├── prisma.config.ts               # Configuración Prisma 7 (rutas del adapter)
├── src/
│   ├── app/
│   │   ├── page.tsx               # Página principal (SPA con tabs)
│   │   ├── layout.tsx             # Layout raíz de Next.js
│   │   ├── globals.css            # Estilos globales y animaciones custom
│   │   └── api/
│   │       ├── import/
│   │       │   ├── analyze/route.ts   # POST: análisis de Excel (read-only)
│   │       │   └── commit/route.ts    # POST: inserción transaccional
│   │       ├── transactions/
│   │       │   └── route.ts           # GET: historial con filtros
│   │       ├── accounts/
│   │       │   └── balances/route.ts  # GET: balances por cuenta
│   │       ├── reports/
│   │       │   └── evolution/route.ts # GET: evolución mensual acumulada
│   │       ├── categories/
│   │       │   ├── route.ts           # GET: listado de categorías
│   │       │   └── [id]/route.ts      # PUT: renombrar categoría
│   │       ├── subcategories/
│   │       │   └── [id]/route.ts      # PUT: renombrar subcategoría
│   │       └── db/
│   │           └── clear/route.ts     # POST: borrar toda la BD
│   ├── components/
│   │   ├── ImportWidget.tsx           # Upload drag and drop
│   │   ├── ImportPreview.tsx          # Preview pre-importación
│   │   ├── AccountBalances.tsx        # Tabla de balances por cuenta
│   │   ├── DateRangePicker.tsx        # Selector de rango de fechas custom
│   │   ├── MonthlyEvolutionChart.tsx  # Gráfico SVG de evolución patrimonial
│   │   └── CategoryManager.tsx        # Gestión inline de categorías
│   ├── lib/
│   │   ├── prisma.ts                  # Singleton de PrismaClient
│   │   ├── domain/
│   │   │   └── types.ts               # Tipos TypeScript del dominio
│   │   ├── parsers/
│   │   │   └── moneyManagerParser.ts  # Parser XLSX + hash SHA-256
│   │   └── use-cases/
│   │       ├── AnalyzeImportUseCase.ts # Análisis (read-only)
│   │       └── ExecuteImportUseCase.ts # Ejecución (transaccional)
│   └── generated/
│       └── prisma/                    # Cliente Prisma generado (no editar a mano)
├── scripts/
│   └── validate_app.js               # Script de validación matemática de APIs
├── package.json
├── pnpm-workspace.yaml
├── next.config.ts
└── tsconfig.json
```

---

## 15. Configuración y Despliegue Local

### Requisitos del Sistema

- Node.js: v20 o superior
- pnpm: v10 o superior (instalar con: npm install -g pnpm)
- Sistema Operativo: Windows, macOS o Linux

### Variables de Entorno (.env)

```
DATABASE_URL="file:./dev.db"
```

### Comandos de Desarrollo

```bash
# Instalar dependencias
pnpm install

# Generar cliente Prisma
pnpm prisma generate

# Ejecutar migraciones (crear tablas en SQLite)
pnpm prisma migrate dev

# Iniciar servidor de desarrollo
pnpm dev
# Disponible en http://localhost:3000

# Verificar matemáticas de APIs (requiere server activo)
node scripts/validate_app.js

# Ver BD en browser con UI visual
pnpm prisma studio
```

### Backup de la Base de Datos

La base de datos es un único archivo binario. En Windows:
```
copy prisma\dev.db prisma\dev.db.backup
```

---

## 16. Limitaciones Actuales y Roadmap

### Limitaciones Conocidas

| Limitación | Impacto | Notas |
|---|---|---|
| Límite de 200 transacciones en historial | No muestra todas si el filtro retorna más | Se puede aumentar; es decisión de rendimiento |
| Sin paginación en historial | La tabla no pagina resultados | Futuro: paginación server-side |
| Sin edición de transacciones individuales | Solo se puede importar o borrar todo | Planificado como mejora futura |
| Sin soporte de tipos de cambio históricos | Transacciones no-USD tienen baseAmountUsd = 0 si el archivo no incluye columna USD | Requiere integración con API de tipos de cambio |
| Sin autenticación | Cualquiera en la red local puede acceder | Intencional para uso personal; no exponer a internet |
| Transferencias reducen balance de cuenta | Una transferencia saliente aparece solo en la cuenta de origen | Limitación del modelo de datos de Money Manager |
| Gráfico sin filtro por cuenta | Muestra siempre el patrimonio total | Mejora futura: evolución por cuenta individual |

### Roadmap Potencial

1. Paginación server-side del historial de transacciones.
2. Edición de transacciones individuales (nota, categoría, fecha).
3. Eliminación de transacciones individuales con confirmación.
4. Filtro por categoría en el historial.
5. Gráfico de evolución por cuenta individual.
6. Exportación a CSV/Excel del historial filtrado.
7. Estadísticas de categorías: distribución de gastos (pie chart SVG).
8. Presupuestos por categoría: comparar gasto real vs presupuesto mensual.
9. Integración con API de tipos de cambio para calcular baseAmountUsd automáticamente para monedas no-USD.
10. Dark/Light mode toggle (actualmente solo dark mode).

---

## 17. Glosario

| Término | Definición |
|---|---|
| Money Manager | Aplicación móvil de Realbyteapps para registro manual de transacciones personales |
| Import Hash | Hash SHA-256 calculado deterministamente de los campos clave de una transacción; garantiza deduplicación |
| baseAmountUsd | Equivalente en dólares americanos (USD) del monto de una transacción; campo base para todos los cálculos financieros |
| INCOME | Tipo de transacción que representa un ingreso (suma al patrimonio neto) |
| EXPENSE | Tipo de transacción que representa un gasto (resta al patrimonio neto) |
| TRANSFER | Tipo de transacción entre cuentas propias (neutro en patrimonio global, pero registrado como salida en la cuenta de origen) |
| Running Total | Acumulación progresiva del balance neto mes a mes para el gráfico de evolución |
| Windowed Slice | Técnica de mostrar solo N elementos de un array usando un índice de inicio desplazable |
| Inline Edit | Patrón de UI donde el texto se convierte en input directamente en su posición, sin abrir un modal |
| Idempotencia | Propiedad de una operación que puede ejecutarse múltiples veces sin cambiar el resultado más allá de la primera ejecución |
| Prisma Driver Adapter | Capa de Prisma 7 que separa el ORM del driver de BD subyacente; permite usar better-sqlite3 en lugar del cliente nativo |
| Stacking Context | Contexto de apilamiento Z en CSS creado por elementos con backdrop-filter; puede causar que dropdowns queden ocultos detrás de otras cards |
| Chunk Processing | División de una lista grande en sublistas para procesarlas iterativamente y evitar límites del sistema (SQLITE_MAX_VARIABLE_NUMBER) |
| pnpm | Package manager para Node.js alternativo a npm/yarn; más eficiente en espacio de disco gracias a hard links |
| App Router | Sistema de enrutamiento de Next.js basado en carpetas con page.tsx, layout.tsx y route.ts (introducido en Next.js 13+) |

---

*Documento generado el 31 de Mayo de 2026 — Fuente de conocimiento completa del proyecto Money Manager Import Engine para uso en NotebookLM.*
