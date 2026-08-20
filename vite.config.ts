import { defineConfig, loadEnv, type PluginOption } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { componentTagger } from "lovable-tagger";

// Qual Supabase o `bun run dev` usa
// ---------------------------------------------------------------------------
// Produção (o banco gerenciado pelo Lovable, vindo do `.env`) é o padrão em todo
// lugar. O sandbox é opt-in e exige prova positiva de que este é um checkout de
// trabalho: git respondendo e branch fora de BRANCHES_DE_PRODUCAO.
//
// O default é produção porque o contrário já nos morde uma vez: enquanto o
// arquivo do sandbox se chamava `.env.development`, o Vite o carregava sozinho em
// todo `mode=development`. O sandbox do Lovable roda em development e não tem
// branch para ler, então o preview de lá falava com o banco de desenvolvimento da
// PSA em vez do Lovable Cloud. Daí o nome `.env.sandbox`: `sandbox` não é mode do
// Vite, logo nada carrega esse arquivo por conta própria, só este config.
//
// A decisão é feita aqui, e não com conteúdo diferente de `.env` por branch, por
// um motivo prático: arquivo versionado com valor diferente nos dois lados
// conflita em todo merge de develop para main, e uma resolução errada troca o
// banco do app sem ninguém perceber. Deste jeito os dois lados carregam
// exatamente os mesmos arquivos e o merge não tem o que decidir.
//
// O alvo escolhido entra por `define`, que vence qualquer arquivo de env. Assim um
// `.env.development` esquecido no disco não consegue voltar a decidir o banco por
// baixo desta regra.
//
// Precedência, da maior para a menor:
//   .env.development.local    seu, não versionado: se existe, manda, e a regra sai de cena
//   regra abaixo              sandbox em branch de trabalho, produção em todo o resto
//   .env e .env.local         base, produção; é o que o build publicado usa
const REF_DEV = "vgzomuwnsdgrxbkyoavq";
const BRANCHES_DE_PRODUCAO = ["main"];
// `sandbox` não é mode do Vite: é só o sufixo de `.env.sandbox`, que existe para
// esse arquivo nunca ser carregado por ninguém que não seja este config.
const MODE_SANDBOX = "sandbox";

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

// A regra de branch acima roda uma vez, quando o servidor sobe. Um `git switch`
// com o dev de pé não faria o Vite reavaliar nada, e o app seguiria no banco da
// branch anterior sem nenhum sinal na tela. Este plugin vigia o HEAD do git e
// reinicia o servidor quando a branch muda, para o alvo voltar a bater com onde
// você está. O watcher do Vite ignora `.git/**` por padrão, daí o fs.watch
// próprio; e a vigilância é instalada uma vez por processo, já que
// `server.restart()` reexecuta o `configureServer`.
let vigilanciaDeBranchInstalada = false;
let branchVigiada = "";

function caminhoDoHEAD(): string | null {
  try {
    const relativo = execFileSync("git", ["rev-parse", "--git-path", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return relativo ? path.resolve(process.cwd(), relativo) : null;
  } catch {
    return null;
  }
}

function reiniciaAoTrocarDeBranch(): PluginOption {
  return {
    name: "psa:reinicia-ao-trocar-de-branch",
    apply: "serve",
    configureServer(server) {
      if (vigilanciaDeBranchInstalada) return;
      const head = caminhoDoHEAD();
      if (!head || !fs.existsSync(head)) return;

      vigilanciaDeBranchInstalada = true;
      branchVigiada = branchAtual();

      // O git troca o HEAD por rename (HEAD.lock -> HEAD), então vigiamos o
      // diretório: um fs.watch no arquivo se perderia na primeira troca.
      const vigia = fs.watch(path.dirname(head), (_evento, arquivo) => {
        if (arquivo !== path.basename(head)) return;
        const agora = branchAtual();
        if (!agora || agora === branchVigiada) return;
        branchVigiada = agora;
        server.config.logger.info(
          `\n  ➜  branch ${agora}: reiniciando para reavaliar o Supabase...`,
        );
        void server.restart();
      });
      vigia.unref();
      server.httpServer?.once("close", () => {
        vigia.close();
        vigilanciaDeBranchInstalada = false;
      });
    },
  };
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
        `Provavelmente o .env foi editado, ou algum arquivo de env do sandbox virou .env.production.`,
    );
  }

  // O override pessoal continua sendo a última palavra, inclusive em main.
  const temOverridePessoal = fs.existsSync(path.resolve(__dirname, ".env.development.local"));

  // Branch de trabalho é a única porta para o sandbox. Sem git a `branchAtual()`
  // devolve string vazia, e aí não há prova de nada: fica produção.
  const ehBranchDeTrabalho = branch !== "" && !BRANCHES_DE_PRODUCAO.includes(branch);
  const usarSandbox = mode === "development" && ehBranchDeTrabalho && !temOverridePessoal;

  // Em dev o alvo é sempre explícito, para nenhum arquivo de env decidir no lugar
  // da regra. Vai tudo que for VITE_, não só as três do Supabase, senão uma
  // variável nova no `.env.sandbox` não chegaria no app.
  const alvo =
    mode === "development" && !temOverridePessoal
      ? loadEnv(usarSandbox ? MODE_SANDBOX : "production", process.cwd(), "VITE_")
      : null;

  if (mode === "development") {
    const url = alvo?.VITE_SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? "(indefinido)";
    const origem = temOverridePessoal
      ? ".env.development.local"
      : usarSandbox
        ? `.env.sandbox (branch ${branch})`
        : branch === ""
          ? ".env (sem git: nada prova que este é um checkout de trabalho)"
          : `.env (branch ${branch})`;
    console.log(`  ➜  Supabase:   ${url}  (${origem})`);

    // Sobra de checkout antigo. Não decide mais nada (o define acima vence), mas
    // quem abrir o arquivo vai acreditar que decide.
    if (fs.existsSync(path.resolve(__dirname, ".env.development"))) {
      console.log(
        "  ⚠  .env.development existe e saiu do desenho: apague-o. O alvo acima " +
          "veio da regra de branch, não dele.",
      );
    }
  }

  return {
    server: {
      host: "::",
      port: 8080,
    },
    define: alvo
      ? Object.fromEntries(
          Object.entries(alvo).map(([chave, valor]) => [
            `import.meta.env.${chave}`,
            JSON.stringify(valor),
          ]),
        )
      : {},
    plugins: [
      react(),
      reiniciaAoTrocarDeBranch(),
      mode === "development" && componentTagger(),
    ].filter(Boolean),
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
