# Money Manager Import Engine — Registro de Mejoras y Cambios (Versión 1.1)

Este documento detalla las nuevas características, mejoras visuales y decisiones de diseño técnico implementadas en la **Versión 1.1** del sistema Money Manager Import Engine.

---

## Resumen de Nuevas Características

### 1. Consola Cambiaria de Referencia (Divisas en Tiempo Real)
*   **Fuente Primaria (DolarAPI):** Integración con `ve.dolarapi.com` para obtener en tiempo real 4 tasas cambiarias de referencia en Venezuela: Dólar Oficial (BCV), Dólar Paralelo, Euro Oficial (BCV) y Euro Paralelo.
*   **Alternativa B (Scraper del BCV):** Sistema de contingencia automático en caso de caída de DolarAPI. Realiza web scraping a `https://www.bcv.org.ve/` simulando cabeceras de navegador y omitiendo fallos SSL. Extrae las tasas oficiales de USD/EUR y hereda el último paralelo conocido.
*   **Caché Inteligente de 1 Hora:** Inicializa la tabla `exchange_rates` en SQLite. Los valores consultados se almacenan localmente y se sirven instantáneamente si tienen menos de 1 hora de antigüedad, protegiendo contra bloqueos de IP y agilizando las llamadas de red.
*   **Frecuencia Adaptativa:** El tiempo de caché se optimizó a 1 hora debido a la volatilidad diaria de la tasa paralela en el mercado venezolano.

### 2. Calculadora de Conversión Cambiaria (QuickConverter)
*   **Conversión Bidireccional:** Un widget en la UI de tasas que permite convertir al vuelo montos entre 5 monedas: `Bs.`, `USD (Oficial)`, `USD (Paralelo)`, `EUR (Oficial)` y `EUR (Paralelo)`. El cálculo se actualiza inmediatamente al escribir en cualquiera de los dos extremos.
*   **Controles de Incremento Personalizados:** Se eliminaron las flechas de spinner por defecto del navegador en los campos numéricos (las cuales rompían con el tema visual). Se diseñaron botones de tipo chevron nativos de React:
    *   Para **Bolívares**, el incremento/decremento se realiza de **10 en 10 Bs.**
    *   Para **Dólares/Euros**, se incrementa de **1 en 1**.
    *   Los botones respetan la paleta de colores oscura, los bordes curvos y tienen micro-animaciones en los estados hover/active.

### 3. Distribución de Gastos por Categoría
*   **Cómputo Eficiente en Cliente:** El desglose se realiza procesando localmente la lista de transacciones activas en memoria, adaptándose de inmediato a cualquier filtro de rango de fechas o cuentas seleccionado en la interfaz.
*   **Gráfico Donut SVG Custom:** Renderizado de un gráfico circular tipo rosquilla utilizando SVG nativo de React, sin añadir librerías pesadas al bundle.
*   **Barra de Progreso y Leyenda:** Despliega una leyenda detallada de categorías de gastos ordenada de mayor a menor participación, indicando color personalizado de la paleta, monto en USD, porcentaje de participación y una barra de progreso que llena el espacio de forma proporcional.

### 4. Buscador Global por Notas con Autocompletado
*   **Filtro por Notas:** Modificación del endpoint de transacciones para filtrar registros únicamente mediante coincidencia parcial sobre la columna `note`.
*   **Búsqueda Global (Omitir Filtros):** Cuando hay un término de búsqueda en la barra, la API de transacciones ignora por completo los filtros activos de fecha y cuenta bancaria, permitiendo encontrar notas históricas de cualquier año o cuenta.
*   **Indicador de Búsqueda Activa:** Un badge de advertencia en color ámbar alerta visualmente al usuario: `Búsqueda global activa: filtros de fecha y cuenta ignorados`.
*   **Dropdown de Autocompletado Custom:** Reemplazo del elemento `<datalist>` HTML5 nativo (el cual presentaba problemas de contraste en modo oscuro) por un menú desplegable de React personalizado. Cuenta con diseño glassmorphism (`bg-slate-950/95`, bordes `border-slate-850/85` y efecto de desenfoque `backdrop-blur-md`) que muestra hasta 6 coincidencias obtenidas del endpoint `/api/transactions/notes`.

### 5. Estilización de Scrollbars de la Aplicación
*   **Scrollbars Coherentes con el Tema:** Configuración de reglas CSS globales en `globals.css` que personalizan las barras de scroll en todos los navegadores (Webkit y Firefox):
    *   **Forma delgada:** Grosor de 6px.
    *   **Contraste Alto:** El thumb tiene color `slate-700` (`#334155`) para destacar de forma limpia sobre el fondo `slate-950` del dropdown y las tablas.
    *   **Interacciones:** El thumb cambia a color índigo (`#4f46e5`) al pasar el cursor (hover).
    *   El canal (track) es completamente transparente.

### 6. Conciliación y Ajustes de Saldos Iniciales
*   **Corrección de Ajuste Inicial:** Se solucionó el bug que enviaba saldo objetivo `0` ignorando el input personalizado. Ahora guarda y procesa correctamente el balance inicial.
*   **Idempotencia en Apertura:** Si ya existe un movimiento de saldo de apertura, la API de conciliación lo actualiza en lugar de insertar duplicados, ajustando la fecha y la diferencia de forma transaccional.
*   **Soporte de Zonas Horarias:** Ajuste de desfase UTC del cliente tanto en reportes de evolución patrimonial como en el filtrado de transacciones, evitando la pérdida de movimientos del primer o último día del mes en el calendario local del usuario.

---

## Contrato de Nuevos Endpoints de API

### 1. Obtener Notas de Transacciones para Autocompletado
*   **Endpoint:** `GET /api/transactions/notes`
*   **Descripción:** Consulta la base de datos para extraer todas las notas no nulas y no vacías de forma única.
*   **Respuesta (JSON):** Arreglo plano de cadenas de texto ordenadas alfabéticamente:
    ```json
    [
      "Compra Supermercado",
      "Gasolina",
      "Pago de Alquiler",
      "Transferencia de Ahorro"
    ]
    ```

### 2. Consola de Tasas de Cambio
*   **Endpoint:** `GET /api/bcv/rates?force=true`
*   **Descripción:** Recupera la tasa oficial (USD/EUR) y paralela del caché de SQLite (1 hora de validez). Si expira o se añade `force=true`, realiza consulta a los servidores cambiarios en vivo y almacena el resultado calculando variaciones porcentuales.
*   **Respuesta (JSON):**
    ```json
    {
      "usdOficial": 45.4512,
      "usdParalelo": 48.20,
      "eurOficial": 49.3245,
      "eurParalelo": 52.10,
      "date": "Lunes, 01 Junio 2026",
      "fetchedAt": 1780327300000,
      "source": "dolarapi",
      "usdOficialVar": 0.12,
      "usdParaleloVar": -0.5,
      "eurOficialVar": 0.0,
      "eurParaleloVar": 0.25,
      "history": [...]
    }
    ```

---

## Estructura de Nuevos Archivos

*   `src/app/api/transactions/notes/route.ts` - Endpoint para obtener notas de autocompletado.
*   `src/components/QuickConverter.tsx` - Componente de la calculadora de conversión cambiaria bidireccional.
*   `src/components/CategoryDistribution.tsx` - Componente analítico con el gráfico circular Donut SVG de gastos.
