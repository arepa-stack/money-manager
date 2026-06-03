# Seguimiento de Mejoras de UX (Temporal)

Este documento es una lista de verificación temporal para dar seguimiento a las mejoras de experiencia de usuario (UX) propuestas para la aplicación Money Manager. Una vez completadas las tareas seleccionadas, este archivo puede ser eliminado de forma segura.

---

## 📋 Lista de Mejoras Propuestas

- [x] **1. Consistencia en Diálogos (Eliminación de `alert` nativo)**
  - **Estado:** 🟢 Completado
  - **Dificultad:** Baja (Fácil)
  - **Impacto en UX:** Medio-Alto (Consistencia visual)
  - **Detalle:** Reemplazar el `alert(err.message)` en la línea 80 de [AccountBalances.tsx](file:///c:/Users/User/Documents/Repositorios/personales/money-manager/src/ui/organisms/AccountBalances.tsx#L80) por un modal de error estilizado utilizando el `ConfirmModal` global o un flujo similar.


- [x] **2. Autocompletado Predictivo Inteligente**
  - **Estado:** 🟢 Completado
  - **Dificultad:** Media
  - **Impacto en UX:** Muy Alto (Eficiencia al registrar movimientos)
  - **Detalle:** En [EditTransactionModal.tsx](file:///c:/Users/User/Documents/Repositorios/personales/money-manager/src/ui/organisms/EditTransactionModal.tsx), al comenzar a escribir o seleccionar una nota, cargar/sugerir automáticamente la categoría anterior, la cuenta habitual y el último monto registrado.

- [ ] **3. Diseño Mobile-First en Tablas de Transacciones**
  - **Estado:** 🔴 Pendiente
  - **Dificultad:** Media-Alta
  - **Impacto en UX:** Alto (Usabilidad móvil)
  - **Detalle:** En [TransactionTable.tsx](file:///c:/Users/User/Documents/Repositorios/personales/money-manager/src/ui/organisms/TransactionTable.tsx), implementar una vista colapsable en forma de tarjetas individuales en pantallas pequeñas (`< md`) para evitar scroll horizontal u ocultación excesiva de información.

- [ ] **4. Skeleton Loaders para Transiciones de Carga**
  - **Estado:** 🔴 Pendiente
  - **Dificultad:** Media
  - **Impacto en UX:** Alto (Sensación de velocidad y estética premium)
  - **Detalle:** Crear loaders visuales que imiten la estructura de las tarjetas de saldos y las filas de la tabla de transacciones durante la consulta de datos en la API.

- [ ] **5. Selector de Moneda Global en Tiempo Real**
  - **Estado:** 🔴 Pendiente
  - **Dificultad:** Alta
  - **Impacto en UX:** Alto (Facilidad de análisis)
  - **Detalle:** Agregar un control interactivo (USD/VES/EUR) en el header de [DashboardLayout.tsx](file:///c:/Users/User/Documents/Repositorios/personales/money-manager/src/ui/templates/DashboardLayout.tsx) para convertir dinámicamente todos los saldos mostrados y movimientos según las tasas de cambio de referencia del día.

- [ ] **6. Sistema de Notificaciones Toast Flotantes**
  - **Estado:** 🔴 Pendiente
  - **Dificultad:** Media
  - **Impacto en UX:** Medio-Alto (Retroalimentación inmediata)
  - **Detalle:** Implementar un gestor ligero de notificaciones Toast no bloqueantes para confirmar acciones de éxito rápidas como duplicar movimientos, guardar ediciones o refrescar tasas.

---

## 🛠️ Instrucciones de Uso
1. Marca con `[x]` las mejoras que desees que implementemos.
2. Indícame en el chat cuál te gustaría abordar primero para preparar el plan de implementación.
3. Una vez implementadas las mejoras deseadas, elimina este archivo con `git rm ux_improvements_todo.md` o borrándolo directamente de la raíz.
