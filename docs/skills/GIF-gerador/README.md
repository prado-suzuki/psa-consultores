# GIF-gerador

Skill do Claude Code para **gravar um GIF de um fluxo real do portal PSA**
(`psa-consultores`, app em `localhost`), dirigindo o navegador com Playwright a partir de
um "storyboard" JSON. Funciona em **Windows, macOS e Linux**.

Foi feita para a equipe: qualquer pessoa clona o repo, instala as dependências uma vez e
grava GIFs de features (Tax, Chamados, Clientes, Projetos, PERDCOMP, RH, board, portal do
cliente…), inclusive **estados de loading** transitórios.

> **Segurança primeiro.** O token que autentica o navegador é de um usuário **admin** e o
> app grava no banco de verdade. A skill tem travas técnicas para não gravar sem
> consentimento — leia `references/safety.md`. Regra de ouro: **avise antes de qualquer
> escrita no banco**.

## Conteúdo

```
GIF-gerador/
├── SKILL.md            # instruções da skill (frontmatter + loop de trabalho)
├── README.md           # este arquivo
├── requirements.txt    # deps Python (playwright, pillow)
├── scripts/
│   └── record_gif.py   # motor: injeta token, dirige o fluxo, captura frames, monta o GIF
├── examples/
│   ├── storyboard.example.json         # fluxo genérico (qualquer área)
│   └── storyboard.loader.example.json  # capturar um estado de loading (delay_routes)
└── references/
    └── safety.md       # política de token/escrita no banco, snapshot/rollback, higiene
```

## Pré-requisitos

- **Python 3.10+** (`python` no Windows, `python3` no macOS/Linux)
- **Bun** — dev server do projeto (`bun run dev` sobe o Vite em `http://localhost:8080`)
- **Navegador do Playwright** (Chromium) — instalado no passo abaixo

## Instalação (uma vez por máquina)

```bash
# a partir desta pasta:
pip install -r requirements.txt         # playwright + pillow
python -m playwright install chromium   # baixa o Chromium (~150 MB, uma vez)
```

Pillow monta o GIF em Python puro — **não** é preciso ter `gifski` nem `ffmpeg` no PATH.
Se você tiver algum deles, o script o usa automaticamente (melhor compressão).

## Uso rápido

```bash
# 1) dev server (noutro terminal, na raiz do repo)
bun run dev

# 2) valida token + ambiente + o que grava no banco (não abre navegador)
python scripts/record_gif.py --storyboard sb.json --session-file <token> --dry-run

# 3) grava (read-only)
python scripts/record_gif.py --storyboard sb.json --session-file <token> --out ./out
```

- **`<token>`**: arquivo **fora do repo** com o JWT do usuário (ou o valor completo do
  `localStorage`). Alternativa: definir a env `PSA_GIF_SESSION`. Como obter o token:
  `references/safety.md` §1.
- Flags úteis: `--headed` (mostra o navegador), `--no-cursor` (sem o cursor destacado),
  `--confirm-writes` (libera passos marcados `mutates` — só após consentimento).

O passo a passo completo (montar o storyboard, iterar, revisar e entregar) está no
`SKILL.md`.

## Instalar como skill ativa do Claude Code

Esta pasta vive em `docs/skills/` como **fonte publicável**. O Claude Code carrega skills
de `.claude/skills/`. Para ativá-la:

```bash
# na raiz do repo (Claude passa a oferecer /gif-gerador nas próximas sessões):
cp -r docs/skills/GIF-gerador .claude/skills/gif-gerador          # macOS/Linux
```
```powershell
Copy-Item -Recurse docs\skills\GIF-gerador .claude\skills\gif-gerador   # Windows
```

O nome da skill (frontmatter `name: gif-gerador`) é o que aparece como `/gif-gerador`.
Para uma skill **pessoal** (disponível em qualquer projeto seu), copie para
`~/.claude/skills/gif-gerador` em vez de `.claude/skills/`.

> Já existe hoje no repo a skill ativa `.claude/skills/record-feature-gif` (mesma função,
> versão anterior). Este pacote é a versão portável/revisada. Ao publicar, decida se
> substitui a antiga ou mantém as duas com nomes distintos.

## Portabilidade — o que muda por SO

| | Windows (PowerShell) | macOS / Linux |
|---|---|---|
| Python | `python` | `python3` |
| Temp p/ o token | `$env:TEMP\psa_tok.txt` | `"$TMPDIR/psa_tok.txt"` ou `/tmp/psa_tok.txt` |
| Copiar a skill | `Copy-Item -Recurse` | `cp -r` |

O `record_gif.py` em si não tem nada específico de SO — usa só a stdlib, `pathlib` e
variáveis de ambiente.
