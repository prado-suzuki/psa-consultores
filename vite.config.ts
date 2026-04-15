import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Aumenta o limite antes do warning para 900 KB (antes: 500 KB default).
    // Com manualChunks abaixo, nenhum chunk isolado deve passar desse tamanho.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        /**
         * Agrupa dependências grandes e estáveis em chunks próprios para
         * permitir cache de longo prazo no browser (o hash só muda quando
         * a lib atualiza). Mantém o chunk da aplicação enxuto.
         *
         * Combinado com React.lazy nas rotas (App.tsx), gera chunks
         * separados por página sob demanda.
         */
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return undefined;

          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("react-router") ||
            id.includes("scheduler")
          ) {
            return "react-vendor";
          }
          if (id.includes("@radix-ui") || id.includes("cmdk") || id.includes("vaul")) {
            return "radix-ui";
          }
          if (id.includes("@supabase")) {
            return "supabase";
          }
          if (id.includes("@tanstack")) {
            return "tanstack";
          }
          if (id.includes("recharts") || id.includes("d3-")) {
            return "charts";
          }
          if (id.includes("framer-motion")) {
            return "motion";
          }
          if (id.includes("xlsx")) {
            return "xlsx";
          }
          if (id.includes("date-fns")) {
            return "date-fns";
          }
          if (id.includes("lucide-react")) {
            return "icons";
          }
          if (id.includes("react-hook-form") || id.includes("@hookform") || id.includes("zod")) {
            return "forms";
          }
          return undefined;
        },
      },
    },
  },
}));
