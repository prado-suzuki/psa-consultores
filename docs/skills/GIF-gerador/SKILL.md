---
name: gif-gerador
description: |
  Use esta skill SEMPRE que o usuário pedir para GRAVAR/CRIAR um GIF (ou
  screencast/animação) de uma funcionalidade ou fluxo do portal PSA rodando
  (repo psa-consultores, app em localhost). Serve para QUALQUER área — Tax,
  Chamados, Clientes, Projetos, PERDCOMP, RH, board, portal do cliente. Cobre:
  subir o dev server, autenticar o navegador injetando o token JWT do usuário
  (que aqui é ADMIN) no localStorage, dirigir o fluxo com Playwright a partir de
  um "storyboard" JSON, capturar frames e montar o GIF (gifski/ffmpeg/Pillow).
  Também cobre capturar estados transitórios de loading (via delay_routes).
  Regra central: AVISAR e pedir consentimento ANTES de qualquer passo que grave
  no banco. Acione com "cria um gif dessa feature", "grava a tela fazendo X",
  "gif do fluxo de Y", "animação mostrando Z", "screencast do app".
---

# GIF-gerador — gravar GIF de uma feature do portal psa-consultores

Grava um GIF de um fluxo **real** do app (qualquer área) dirigindo o navegador com
Playwright. O GIF resultante é seguro; o cuidado todo está no **como**: o token é
admin e o app grava no banco de verdade quando você clica em salvar/confirmar.

> Nasceu de um episódio em que a feature de GIF do Lovable, para conseguir gravar,
> **mutou dado real e desligou triggers de integridade**. Esta skill faz o mesmo GIF
> **sem** essa cirurgia. Leia `references/safety.md` para o porquê e os casos de borda.

## ⚠️ Regra de ouro (leia antes de tudo)

1. **O token do usuário é admin e é segredo.** Injetado no navegador, o app renderiza
   com acesso total; qualquer clique que salva/confirma/exclui **grava no banco e passa
   pelo RLS** — sem rede de segurança. Nunca imprima/versione/passe o token inline.
2. **Confira o AMBIENTE.** O script imprime `[alvo] app=… supabase_ref=…` no começo.
   Verifique se é o ambiente esperado (dev) antes de gravar — mais ainda se houver escrita.
3. **Avise ANTES de gravar no banco.** Todo passo que muda estado leva `"mutates": true`
   no storyboard; o script **bloqueia** esses passos sem `--confirm-writes`. Antes de
   liberar, diga ao usuário **em português qual entidade muda e como**, e obtenha OK.
4. **Prefira não escrever.** Como você grava **como admin**, o botão aparece sem preparar
   dados. Na maioria dos casos, **grave até o diálogo de confirmação e pare** — não clique
   no Confirmar. (Alternativas em `references/safety.md` §3.)
5. **Token expirado → PARE** e peça um novo. Nunca "grave com o que tem".
6. **NUNCA** desligue triggers/RLS (`session_replication_role='replica'` & cia.), mute
   entidade real compartilhada só p/ o GIF, nem faça "rollback" por janela de tempo.

## Setup (uma vez por máquina)

Pré-requisitos: **Python 3.10+**, **Bun** (dev server do projeto) e o navegador do Playwright.

```bash
# a partir desta pasta (docs/skills/GIF-gerador ou onde a skill foi instalada):
pip install -r requirements.txt         # playwright + pillow
python -m playwright install chromium   # baixa o Chromium (uma vez)
```

No Windows use `python`; no macOS/Linux normalmente `python3` e `pip3`. Se `pip` não
achar o requirements, use o caminho relativo (`pip install -r ./requirements.txt`).

## O loop de trabalho

### 1. Capturar a intenção
Pergunte (ou infira do pedido): **qual área/rota**, **quais passos** devem aparecer, e se
o fluxo **termina numa ação que grava** (salvar/enviar/excluir) ou pode **parar antes do
confirm**. Se existir, descubra a rota real em `docs/geral/mapa-navegacao.md` (não varra o repo).

### 2. Pedir o token
Peça o **token JWT do usuário** (é admin). Como obter: `references/safety.md` §1
(DevTools → Local Storage → valor de `sb-<ref>-auth-token`, ou o `access_token` via
console). O usuário salva num arquivo **fora do repo** e você usa `--session-file`:

- Windows: `%TEMP%\psa_tok.txt`  (PowerShell: `$env:TEMP\psa_tok.txt`)
- macOS/Linux: `"$TMPDIR/psa_tok.txt"` ou `/tmp/psa_tok.txt`
- ou defina a env `PSA_GIF_SESSION` com o valor (o script lê dela se não passar `--session-file`).

**Nunca** peça para colar o token no chat se puder evitar, e nunca o escreva em arquivo
versionado. Se o usuário colar mesmo assim, avise que ele deve rotacionar a sessão depois.

### 3. Montar o storyboard
Copie `examples/storyboard.example.json` (fluxo genérico) ou
`examples/storyboard.loader.example.json` (capturar um estado de loading) e adapte:
`base_url`, os `steps` (alvos por `text` / `role`+`name` / `selector`) e marque
`"mutates": true` em cada passo que grava. Confira nomes de botão/rotas reais no código
(`get_by_role("button", name="…")` casa com o texto visível). Use o mapa de navegação,
não `grep` cego.

### 4. Subir o app
```bash
bun install   # se necessário
bun run dev   # Vite em http://localhost:8080
```

### 5. Dry-run: validar token + ambiente + o que grava no banco
```bash
python scripts/record_gif.py --storyboard sb.json --session-file <arquivo-do-token> --dry-run
```
Confere validade do token, imprime **usuário + ambiente alvo**, deriva a `storage_key`,
lista os passos `mutates` **e** dispara a **heurística** (passos que _parecem_ gravar mas
não estão marcados). Se houver `mutates`, **avise o usuário** (entidade + o que muda) e só
siga com consentimento.

### 6. Gravar
```bash
# read-only (recomendado — para no diálogo, não confirma):
python scripts/record_gif.py --storyboard sb.json --session-file <token> --out ./out

# incluindo escrita no banco (SÓ após OK explícito do usuário):
python scripts/record_gif.py --storyboard sb.json --session-file <token> --out ./out --confirm-writes
```
`--headed` mostra o navegador; `--no-cursor` tira o cursor destacado. Se um passo falhar,
o script **estoura com o índice/label do passo** (sem fallback silencioso) — ajuste o alvo
no storyboard e rode de novo, como um loop de iteração.

### 7. Revisar e entregar
**Leia o GIF gerado** (`Read` no arquivo) e confira que o fluxo aparece certo, sem tela de
login/erro/branco e sem dado sensível de outro cliente à toa. Entregue **só o GIF**.
Se você executou algum passo de escrita, **verifique o estado no banco e reverta**
(snapshot→restore por id, ver `references/safety.md` §4). Apague o arquivo do token e os
frames; não commite nada disso.

## Storyboard — campos

**Topo:** `base_url`, `viewport` (`{width,height}`), `device_scale_factor` (padrão 1; use
2 p/ frames mais nítidos), `fps` (padrão 5), `width` (largura final do GIF, padrão 960),
`hold_frames` (frames "parados" por passo, padrão 6), `gif_name`, `supabase_ref` (opcional;
senão é derivado do token), `delay_routes` (opcional, ver abaixo).

**Cada passo:** `action` = `goto | click | hover | fill | type | press | scroll | wait | hold`;
alvo por `text`(+`exact`,`which`) / `role`+`name` / `selector`; `label`, `hold_frames`,
`settle_ms`; `goto` aceita `wait_until` (`load` | `domcontentloaded` | `networkidle` |
`commit`); **`mutates: true`** quando grava no banco.

**`delay_routes`** (segurar estados transitórios como loading): lista de
`{ "url_contains": "/rest/v1/", "ms": 7000 }`. Atrasa a **resposta** de requests que casam
com o padrão — não muda nada, só adia. Combine com `wait_until: "domcontentloaded"` no
`goto` (senão o próprio `goto` espera a resposta atrasada). Ver
`examples/storyboard.loader.example.json`.

## Travas de segurança embutidas no script

- **Gate `mutates` + `--confirm-writes`** — barreira **técnica**: o script recusa executar
  passo `mutates` sem a flag. Não dá para gravar no banco "sem querer".
- **Heurística de escrita** — alerta (não bloqueia) quando um `click`/`press` bate em verbos
  de escrita (Salvar/Confirmar/Excluir/Enviar/Publicar…) sem estar marcado `mutates`. Pega
  o passo esquecido.
- **Ambiente à vista** — imprime `app=` e `supabase_ref=` no início.
- **Token expirado → aborta.** Sem gravação com token vencido.
- **Sem fallback silencioso** — passo que falha estoura com índice/label.

## Arquivos da skill
- `scripts/record_gif.py` — motor: injeta o token, dirige o fluxo, captura frames, monta o
  GIF; gate `--confirm-writes`, heurística de escrita e checagem de expiração do token.
- `requirements.txt` — deps Python (playwright, pillow).
- `examples/storyboard.example.json` — storyboard genérico comentado (qualquer área).
- `examples/storyboard.loader.example.json` — capturar estado de loading com `delay_routes`.
- `references/safety.md` — token admin, política de escrita no banco, snapshot/rollback,
  anti-padrões do episódio Lovable, higiene de saída.
- `README.md` — instalação em qualquer máquina + como publicar/instalar como skill.
