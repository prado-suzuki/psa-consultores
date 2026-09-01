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

// O sandbox/preview do Lovable é um checkout git de verdade, numa branch
// gerada por edição (`edit/edt-…`), então a regra de branch sozinha o
// classificava como "checkout de trabalho" e apontava o preview para o Supabase
// de desenvolvimento da PSA. O container do Lovable se identifica por variáveis
// próprias; usá-las é sinal de fato, não palpite.
function rodandoNoLovable(): boolean {
  return (
    process.env.LOVABLE_SANDBOX === "1" ||
    process.env.LOVABLE === "sandbox" ||
    process.env.LOVABLE_DEV_SERVER === "true" ||
    process.env.LOVABLE_PROJECT_ID !== undefined
  );
}

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
      // As rotas do `App.tsx` são `lazy`, e em DEV cada módulo é transformado na
      // hora em que a rota é aberta pela primeira vez. Foi essa espera — não o
      // build publicado — que motivou o revert de `ba0c461b` em 15/04: "demora
      // ao mudar de página", "telas em branco" no preview do Lovable.
      //
      // O QUE O WARMUP FAZ, e é menos do que parece: ele transforma e cacheia
      // ESTES arquivos quando o servidor sobe. A subárvore de cada página não
      // entra — o Vite não desce recursivamente — e é a subárvore que faz volume
      // numa primeira visita. Medido aqui: módulo aquecido responde em ~7 ms e
      // um frio em ~8 ms, ou seja, no arquivo isolado o ganho é ruído.
      //
      // Então quem devolve a navegação de verdade é o `PrefetchDeRotas`, que
      // roda em dev também e puxa o grafo inteiro depois do primeiro paint. O
      // warmup é o complemento: garante que a página em si nunca seja o gargalo,
      // e custa fôlego de CPU só no start.
      //
      // Só as PÁGINAS entram na lista. A subárvore de componentes de cada uma
      // vem no rastro do módulo transformado, e listar `src/components/**` aqui
      // trocaria um start rápido por um start longo sem ganho.
      //
      // O `!` dos testes NÃO é higiene: as páginas têm teste colocado ao lado, e
      // aquecê-los fazia o otimizador de dependências descobrir `vitest` e
      // `@testing-library` no start, com "optimized dependencies changed.
      // reloading" logo depois — um reload a cada `bun run dev`, por nada.
      warmup: {
        clientFiles: [
          "./src/App.tsx",
          "./src/pages/**/*.tsx",
          "!./src/pages/**/*.test.tsx",
        ],
      },
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
      // O chunk "charts" causou
      //   Uncaught ReferenceError: Cannot access 'S' before initialization
      // ao agrupar recharts + d3-* juntos isolados do resto do bundle —
      // problema conhecido de circular/TDZ em minified Rollup output.
      //
      // A divisão de hoje vem de OUTRO lugar: as rotas do `App.tsx` são `lazy`,
      // então o Rollup corta o grafo nos pontos de `import()` e põe em cada
      // chunk o que só aquela rota alcança — `xlsx`, `@react-pdf`, `mermaid`,
      // `recharts` saem atrás das telas que os usam. O que é compartilhado ele
      // decide sozinho, respeitando a ordem de inicialização.
      //
      // É por isso que uma coisa não traz a outra de volta: o TDZ apareceu por
      // FORÇAR agrupamento que o grafo não tinha. **Não reintroduza
      // `manualChunks`** — se um chunk específico incomodar, o caminho é mexer
      // no `import()` que o gerou, não em lista de vendor.
      chunkSizeWarningLimit: 2000,
    },
  };
});
