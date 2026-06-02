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

