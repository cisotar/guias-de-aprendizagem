import type { NextConfig } from "next";

// No GitHub Pages o app é servido em /<repo>; localmente (npm run dev) fica na raiz.
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  agentRules: false, // não deixa o Next reescrever o AGENTS.md do projeto
  output: "export", // site estático: sem servidor, os dados ficam no navegador
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
