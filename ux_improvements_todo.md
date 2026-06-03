# Seguimiento de Mejoras de UX (Temporal)

Este documento es una lista de verificación temporal para dar seguimiento a las mejoras de experiencia de usuario (UX) propuestas para la aplicación Money Manager. Una vez completadas las tareas seleccionadas, este archivo puede ser eliminado de forma segura.

---

## 📋 Lista de Mejoras Propuestas

- [x] **1. Consistencia en Diálogos (Eliminación de `alert` nativo)**
  - **Estado:** 🟢 Completado
  - **Dificultad:** Baja (Fácil)
  - **Impacto en UX:** Medio-Alto (Consistencia visual)
  - **Detalle:** Reemplazar el `alert(err.message)` en [AccountBalances.tsx](file:///c:/Users/User/Documents/Repositorios/personales/money-manager/src/ui/organisms/AccountBalances.tsx) por el modal de error estilizado `ConfirmModal`.

- [x] **2. Autocompletado Predictivo Inteligente**
  - **Estado:** 🟢 Completado
  - **Dificultad:** Media
  - **Impacto en UX:** Muy Alto (Eficiencia al registrar movimientos)
  - **Detalle:** En [EditTransactionModal.tsx](file:///c:/Users/User/Documents/Repositorios/personales/money-manager/src/ui/organisms/EditTransactionModal.tsx), sugerir y autocompletar dinámicamente categoría, subcategoría y cuenta habitual basándose en el historial de notas cortas.

- [x] **3. Diseño Mobile-First en Tablas de Transacciones**
  - **Estado:** 🟢 Completado
  - **Dificultad:** Media-Alta
  - **Impacto en UX:** Alto (Usabilidad móvil)
  - **Detalle:** En [TransactionTable.tsx](file:///c:/Users/User/Documents/Repositorios/personales/money-manager/src/ui/organisms/TransactionTable.tsx), implementar una vista colapsable en forma de tarjetas individuales en pantallas pequeñas (`< md`) para evitar scroll horizontal.

- [x] **4. Skeleton Loaders para Transiciones de Carga**
  - **Estado:** 🟢 Completado
  - **Dificultad:** Media
  - **Impacto en UX:** Alto (Sensación de velocidad y estética premium)
  - **Detalle:** Crear loaders visuales que imiten la estructura de las tarjetas de saldos y las filas de la tabla de transacciones durante la consulta de datos en la API.

- [ ] **5. Selector de Moneda Global en Tiempo Real**
  - **Estado:** 🟡 Despriorizado (Pospuesto por complejidad de tasas cruzadas históricas)
  - **Dificultad:** Alta
  - **Impacto en UX:** Alto (Facilidad de análisis)
  - **Detalle:** Control interactivo (USD/VES/EUR) en el header para convertir dinámicamente saldos y movimientos según tasas del día.

- [x] **6. Sistema de Notificaciones Toast Flotantes**
  - **Estado:** 🟢 Completado
  - **Dificultad:** Media
  - **Impacto en UX:** Medio-Alto (Retroalimentación inmediata)
  - **Detalle:** Gestor ligero de notificaciones flotantes en el Dashboard para confirmar acciones de éxito rápidas como duplicar o conciliar.

- [ ] **7. Píldoras de Filtro Rápido (Filtros Avanzados) en Transacciones**
  - **Estado:** ⚪ Pendiente de Selección
  - **Dificultad:** Baja-Media
  - **Impacto en UX:** Alto (Navegación ágil)
  - **Detalle:** En [TransactionsTab.tsx](file:///c:/Users/User/Documents/Repositorios/personales/money-manager/src/ui/pages/TransactionsTab.tsx), añadir píldoras interactivas superiores para filtrar instantáneamente con un solo toque (ej. "Hoy", "Esta Semana", "Ingresos", "Gastos > $100").

- [ ] **8. Resumen Consolidado de Presupuestos en Categorías**
  - **Estado:** ⚪ Pendiente de Selección
  - **Dificultad:** Media
  - **Impacto en UX:** Alto (Visión de salud financiera)
  - **Detalle:** En [CategoryManager.tsx](file:///c:/Users/User/Documents/Repositorios/personales/money-manager/src/ui/organisms/CategoryManager.tsx), agregar un widget superior consolidado de progreso mensual (Presupuesto Total vs. Gasto Real) y un contador destacado con las categorías que están en alerta (>80% de su límite).

- [ ] **9. Sparkline de Tendencia Histórica de Tasas Cambiarias**
  - **Estado:** ⚪ Pendiente de Selección
  - **Dificultad:** Media
  - **Impacto en UX:** Medio-Alto (Visualización de datos)
  - **Detalle:** En [BcvRates.tsx](file:///c:/Users/User/Documents/Repositorios/personales/money-manager/src/ui/organisms/BcvRates.tsx), dibujar un minigráfico de tendencia (Sparkline SVG nativo puro) con la evolución de las tasas de cambio del Dólar Oficial y Paralelo de los últimos 7 registros históricos.

- [x] **10. Notificación Toast con Acción "Deshacer" (Undo) al Eliminar**
  - **Estado:** 🟢 Completado
  - **Dificultad:** Media-Alta
  - **Impacto en UX:** Muy Alto (Flujo de interacción sin interrupciones)
  - **Detalle:** Tras confirmar y eliminar una transacción en el historial, mostrar un Toast interactivo que diga "Movimiento eliminado correctamente." con un botón de acción "Deshacer". Al hacer clic en "Deshacer", se envía un POST y se restaura el movimiento automáticamente en la base de datos local SQLite.

---

## 🛠️ Instrucciones de Uso
1. Marca con `[x]` las mejoras que desees que implementemos.
2. Indícame en el chat cuál te gustaría abordar primero para preparar el plan de implementación.
3. Una vez implementadas las mejoras deseadas, elimina este archivo con `git rm ux_improvements_todo.md` o borrándolo directamente de la raíz.
