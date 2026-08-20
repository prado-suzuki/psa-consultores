import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { componentTagger } from "lovable-tagger";

// Qual Supabase o `bun run dev` usa, por branch
// ---------------------------------------------------------------------------
// main aponta para o banco de produção (o gerenciado pelo Lovable), develop e as
// branches de trabalho apontam para o banco de desenvolvimento.
//
// A escolha é feita aqui, e não com conteúdo diferente de .env por branch, por um
// motivo prático: arquivo versionado com valor diferente nos dois lados conflita
// em todo merge de develop para main, e uma resolução errada troca o banco do app
// sem ninguém perceber. Deste jeito os dois lados carregam exatamente os mesmos
// arquivos e o merge não tem o que decidir.
//
// Precedência, da menor para a maior:
//   .env                      produção, é também o que o build publicado usa
//   .env.development          banco de desenvolvimento
//   regra de branch abaixo    em main, volta para produção
//   .env.development.local    seu, não versionado, vence de todos
const REF_DEV = "vgzomuwnsdgrxbkyoavq";
const BRANCHES_DE_PRODUCAO = ["main"];

function branchAtual(): string {
  try {
    return execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    // Sem git (sandbox do Lovable, tarball, container de CI). Sem regra de branch.
    return "";
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const branch = branchAtual();

  // Rede de segurança do merge: se um dia o valor de desenvolvimento vazar para
  // o que vai ser publicado, o build falha aqui em vez de subir apontando para o
  // banco errado. Este é o dano que a separação por branch existe para evitar.
  if (mode === "production" && (env.VITE_SUPABASE_URL ?? "").includes(REF_DEV)) {
    throw new Error(
      `Build de produção apontando para o Supabase de desenvolvimento (${REF_DEV}).\n` +
        `VITE_SUPABASE_URL = ${env.VITE_SUPABASE_URL}\n` +
        `Provavelmente um merge levou .env.development para o lugar errado, ou o .env foi editado.`,
    );
  }

  // O override pessoal continua sendo a última palavra, inclusive em main.
  const temOverridePessoal = fs.existsSync(path.resolve(__dirname, ".env.development.local"));
  const voltarParaProducao =
    mode === "development" && BRANCHES_DE_PRODUCAO.includes(branch) && !temOverridePessoal;

  const producao = voltarParaProducao ? loadEnv("production", process.cwd(), "VITE_") : null;

  if (mode === "development") {
    const alvo = producao?.VITE_SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? "(indefinido)";
    const origem = producao
      ? `branch ${branch}`
      : temOverridePessoal
        ? ".env.development.local"
        : ".env.development";
    console.log(`  ➜  Supabase:   ${alvo}  (${origem})`);
  }

  return {
    server: {
      host: "::",
      port: 8080,
    },
    define: producao
      ? {
          "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(producao.VITE_SUPABASE_URL),
          "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
            producao.VITE_SUPABASE_PUBLISHABLE_KEY,
          ),
          "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(
            producao.VITE_SUPABASE_PROJECT_ID,
          ),
        }
      : {},
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
  };
});
