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
    // Deixamos o Rollup decidir o code-splitting automaticamente.
    //
    // Contexto: o bloco `rollupOptions.output.manualChunks` anterior forçava
    // chunks separados para `react-vendor`, `radix-ui`, `supabase`, `tanstack`,
    // `charts` (recharts+d3), `motion`, `xlsx`, `date-fns`, `icons`, `forms`.
    // Isso fazia sentido quando as rotas eram lazy-loaded (PR inicial), mas
    // depois do revert para imports eager em App.tsx o ganho desapareceu e
    // apareceu o risco: o chunk "charts" causou
    //   Uncaught ReferenceError: Cannot access 'S' before initialization
    // ao agrupar recharts + d3-* juntos isolados do resto do bundle —
    // problema conhecido de circular/TDZ em minified Rollup output.
    //
    // Solução: remover o manualChunks. O Vite/Rollup gera um chunk único
    // grande, o que é aceitável para o tamanho atual do app e elimina
    // riscos de ordem de inicialização entre chunks.
    chunkSizeWarningLimit: 2000,
  },
}));
