<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Mobile First Development

- Toda pantalla, componente o interfaz de usuario que se desarrolle debe ser diseñada siguiendo estrictamente el enfoque **Mobile First** (diseño pensado primero para teléfonos móviles y escalado progresivamente a escritorio mediante modificadores responsivos de Tailwind como `sm:`, `md:`, `lg:`).
- Se debe asegurar que las interfaces nunca generen scroll horizontal accidental a nivel global y que todos los elementos contenedores flexibles gestionen correctamente el ajuste de línea (`flex-wrap`) o cambien a dirección vertical en pantallas pequeñas.

# Servidores MCP configurados para Agentes

Para optimizar el flujo de trabajo en este repositorio, los agentes deben apoyarse en los siguientes servidores MCP:

- **[Codegraph](https://github.com/colbymchenry/codegraph)**: Consúltalo prioritariamente antes de hacer búsquedas de texto manuales con `grep`. Utiliza `codegraph_context` para entender relaciones complejas, llamadas y arquitectura del código antes de proponer planes de desarrollo.
- **[Engram](https://github.com/Gentleman-Programming/engram)**: Guarda resúmenes de sesión proactivamente (`mem_save`) tras completar hitos importantes. Recupera el contexto utilizando `mem_context` si el estado de la sesión se reinicia o se pierde.
- **[NotebookLM MCP](https://github.com/jacob-bd/notebooklm-mcp-cli)**: Empléalo para interactuar con libretas externas asociadas al proyecto, consultando fuentes y documentación para guiar las reglas de negocio de la aplicación.

# Sincronización de Memorias (Engram) para Agentes

Al iniciar y finalizar tu trabajo en este repositorio, debes seguir las siguientes pautas para garantizar que el registro se asocie al proyecto `money-manager` (y no a la IDE `"antigravity ide"`):
*   **Al iniciar la sesión**: 
    1. Asegúrate de que las memorias locales del repositorio estén importadas en tu base de datos SQLite ejecutando `engram sync --import` (si detectas que hay nuevos chunks en la carpeta `.engram/chunks/` que no están indexados localmente).
    2. Llama a la herramienta `mem_session_start` pasando como `id` el valor `"manual-save-money-manager"` y en `directory` la ruta absoluta del repositorio de tu área de trabajo (ej. `"C:/Users/User/Documents/Repositorios/personales/money-manager"`). Esto enlazará tu sesión directamente con este proyecto.
*   **Durante el desarrollo (`mem_save`)**: Pasa siempre de forma explícita el parámetro `"project": "money-manager"`.
*   **Al finalizar la sesión**: 
    1. Guarda el resumen final llamando a `mem_session_summary` pasándole como `session_id` el valor `"manual-save-money-manager"`.
    2. Ejecuta `engram sync` para exportar las observaciones y resúmenes nuevos a la carpeta `.engram/` local. Esto garantiza que las observaciones estén listas para ser confirmadas y subidas a Git por el usuario.

