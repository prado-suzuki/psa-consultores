# Validar uma mudança no app rodando

Como pôr um navegador logado na frente do app para conferir que algo funciona de
verdade, sem credencial na mão e sem tocar em produção.

## O alvo é o sandbox, e isso é decidido pela branch

O `vite.config.ts` escolhe o banco pela branch em tempo de execução: `main` usa
produção (`.env`), qualquer outra branch usa o sandbox (`.env.development`, ref
`vgzomuwnsdgrxbkyoavq`). O `bun run dev` imprime o alvo ao subir, então confira a
linha `➜ Supabase:` antes de concluir qualquer coisa.

O sandbox é produção anonimizada **com os mesmos ids** e nomes trocados. Escrever
nele é aceitável; escrever em produção, não. Fora da `main`, você está no sandbox.

Se a porta 8080 já estiver ocupada, o Vite sobe em outra, e aí a sessão salva
(atrelada à origem `http://localhost:8080`) não serve. Prefira reusar o servidor
que já está na 8080 a subir um segundo. Para saber para onde um servidor de pé
aponta, sem adivinhar:

```
curl -s http://localhost:8080/src/integrations/supabase/client.ts | grep -oE 'https://[a-z]+\.supabase\.co' | sort -u
```

## A sessão

`e2e/auth.setup.ts` loga pela UI e salva o estado em `e2e/.auth/user.json`
(gitignored). Ele precisa de `E2E_EMAIL` / `E2E_PASSWORD`.

**Na prática você quase nunca precisa da senha.** O access token vive uma hora e
o arquivo azeda em silêncio (o sintoma é cair em `/equipe` sem explicação), mas o
refresh token vive muito mais:

```
node e2e/renovarSessao.mjs
```

Ele lê o ref do projeto da própria chave `sb-<ref>-auth-token` gravada e busca a
chave anon no `.env` que aponta para aquele ref, então renovar nunca troca de
banco por acidente. Só quando ele diz que o refresh token morreu é que o caminho
volta a ser o login pela UI:

```
E2E_EMAIL=... E2E_PASSWORD=... npx playwright test --project=setup
```

## Pôr a sessão num navegador que não é o do harness

O harness Playwright recebe a sessão pelo `storageState` do `playwright.config.ts`.
Um navegador **de fora** (o do Playwright MCP, um script solto) não recebe nada:
é outro processo, com perfil próprio.

Para esses, navegue primeiro para:

```
http://localhost:8080/e2e/semear-sessao.html
```

A página lê o mesmo arquivo gitignored que o Vite serve em dev, escreve no
localStorage da **mesma origem** do app e redireciona. Aceita `?ir=/rota` para
escolher o destino. Ela não carrega segredo nenhum, e é por isso que dá para
versioná-la.

## Playwright MCP

Configurado em `~/.claude.json`, em `projects[<repo>].mcpServers.playwright`.
Roda com `--headless`: sem isso ele abre janela, porque o padrão dele é headed.

Duas coisas que custam tempo se você não souber:

- **Mudar essa config não reconfigura um servidor que já está de pé.** O MCP sobe
  junto com a sessão do Claude Code; o valor novo só vale na sessão seguinte.
  Derrubar o processo no meio não faz ele relançar, só tira as ferramentas do ar.
- `--storage-state` existe, mas só vale junto com `--isolated`. Como ele também
  só passaria a valer na sessão seguinte, a página de semeadura acima resolve o
  mesmo problema sem depender de restart.

## Conferir UI sem nenhuma credencial

Quando a mudança é só visual e não precisa de dado real, não vale mexer em
sessão: monte um entry Vite descartável que renderiza o componente com dados
falsos. Precisa de `QueryClientProvider` + `BrowserRouter`, e de `AuthProvider`
quando o componente toca em `useAuditLog` (ou qualquer coisa que chame `useAuth`,
que estoura com "useAuth must be used within an AuthProvider"). Apague o entry
no fim.

Para dirigir por script, importe o playwright por caminho absoluto: é CJS, então
`import pw from '<abs>/node_modules/playwright/index.js'` e depois
`const { chromium } = pw`. O import nomeado falha. `chromium.launch()` já é
headless por padrão.
