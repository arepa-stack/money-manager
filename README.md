This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Servidores MCP (Model Context Protocol)

Este proyecto está configurado para integrarse con asistentes de desarrollo basados en IA utilizando los siguientes servidores MCP para potenciar las capacidades del agente:

*   **[Codegraph](https://github.com/colbymchenry/codegraph)**: Indexador de código local que analiza el árbol de sintaxis abstracta (AST) para proveer búsquedas semánticas, grafos de llamadas y análisis de dependencias de forma ultra rápida.
*   **[Engram](https://github.com/Gentleman-Programming/engram)**: Sistema de memoria persistente para el agente, permitiendo almacenar y recuperar el contexto del proyecto, decisiones de arquitectura y notas a lo largo del tiempo.
*   **[NotebookLM MCP](https://github.com/jacob-bd/notebooklm-mcp-cli)**: Integración que permite al agente interactuar de forma directa con tus libretas de Google NotebookLM para consultar fuentes de conocimiento y realizar investigaciones.
