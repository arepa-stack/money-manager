<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Mobile First Development

- Toda pantalla, componente o interfaz de usuario que se desarrolle debe ser diseñada siguiendo estrictamente el enfoque **Mobile First** (diseño pensado primero para teléfonos móviles y escalado progresivamente a escritorio mediante modificadores responsivos de Tailwind como `sm:`, `md:`, `lg:`).
- Se debe asegurar que las interfaces nunca generen scroll horizontal accidental a nivel global y que todos los elementos contenedores flexibles gestionen correctamente el ajuste de línea (`flex-wrap`) o cambien a dirección vertical en pantallas pequeñas.

