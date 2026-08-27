# Ensaio do fluxo de alteração contratual

Roteiro de demonstração assistida da tela **Gerar Documento** da área OSG, na
frente em que a alteração contratual entra.

Script que executa este roteiro: `e2e/demos/ac-alteracao-contratual.mjs`.
Ele **mede e narra**; não corrige nada e não roda SQL. As escritas que faz são
as da própria UI: validar a versão, registrar a peça na junta e responder o
assistente de eventos. No fim ele desmarca os eventos que marcou.

> **O roteiro mudou em 25/08/2026.** Até então, "Marque o que se aplica" era um
> **passo do assistente de geração**, com as seis flags de evento em escopo `pj`.
> Esse desenho foi desfeito: perguntar que evento societário aconteceu antes de
> existir contrato registrado é perguntar sobre um documento que ainda não valeu,
> e num modelo de constituição a pergunta não tem resposta possível. A versão
> anterior deste documento descrevia aquele passo; se você procura por ele na
> tela, ele não existe mais, por desenho.

---

## 1. O desenho de hoje, em uma passada

1. O contrato social é gerado e **validado** como sempre (`documento_gerado`
   status `rascunho`, com os snapshots congelados).
2. Levado à junta, ele é **registrado**: status `registrado`. A peça trava. Não
   se edita bloco, não se forka versão, não se re-sincroniza do cadastro.
3. Da folha travada sai **"Gerar alteração contratual"**: um assistente em modal,
   de dois passos, que pergunta **que eventos aconteceram depois dela**.
4. As respostas ficam ancoradas no **documento registrado**
   (`projeto_flag_valor.documento_base_id`, escopo `documento`), e cada evento
   marcado puxa para a folha a **resolução** correspondente. A folha passa a
   compor **ao vivo**: resoluções pelos eventos + consolidado do cadastro atual.
5. "Validar versão" cria o documento **novo**, que aponta para o registrado em
   `documento_gerado.substitui_documento_id`. Registrada a alteração, o ciclo
   recomeça a partir dela.

Schema em `supabase/migrations/20260825143000_alteracao_contratual_sucessao_e_escopo_documento.sql`.

---

## 2. Pré-requisitos

### 2.1 App rodando na branch certa

O código desta frente vive na branch **`alteracao-contratual-caminho-b`**. Fora
da `main` o `bun run dev` aponta para o **sandbox**, que é o banco onde este
ensaio deve rodar. Nunca rode contra produção.

```bash
git worktree add /caminho/para/wt-alteracao alteracao-contratual-caminho-b
cd /caminho/para/wt-alteracao
bun install
bun run dev --port 5199
```

Anote a porta que o Vite imprimir. O ensaio assume `http://localhost:5199`; se
for outra, passe `AC_URL`.

### 2.2 Login

Conta de equipe com a área **OSG** liberada. No sandbox:

- email `user001@exemplo.dev`
- senha `devlocal123`

A tela `/equipe` pede email e senha primeiro; o seletor de área (Board, Digital,
Marketing, OSG, Tax) vem depois.

### 2.3 Rota e dados

- Rota: `/equipe/osg/work/gerar-documento`
- Cliente: `[TESTE] Banana Quântica Engenharia de Sonhos Ltda`
- Modelo: **Contrato Social — Sociedade Limitada (Participações)**
- Empresas do cliente usadas no roteiro:
  - `Pantanal Comércio S.A.` (a principal, tipo CN, **42 sócios no quadro**)
  - `Rondon Administradora de Bens S.A.` (a de contraste, tipo PR **sem
    integralização aprovada**, portanto sem sócios)

A escolha da principal não é decorativa: cinco das seis resoluções percorrem uma
lista (`{{#socios}}`, `{{#administradores}}`, `{{#integralizacoes}}`), e numa
empresa sem esses cadastros o motor as **descarta por falta de dado**, o que é
comportamento correto mas não demonstra nada. A `Rondon` é justamente a empresa
em que isso acontece, e por isso serve de contraste.

O nome do cliente pode estar gravado achatado no banco. Procure pelo que está
gravado, não pelo que você espera, e ajuste `AC_CLIENTE` se precisar.

### 2.4 Os blocos e o vínculo com as flags: **agora é permanente**

> Até 25/08/2026 este era o pré-requisito que quebrava o ensaio: o vínculo entre
> um bloco e as seis flags de evento era criado à mão e desfeito depois. **Não é
> mais.** Ele vive numa migration.

`supabase/migrations/20260825194340_blocos_resolucao_alteracao_contratual.sql`
cria os **seis blocos de resolução**, um por evento, cada um vinculado em
`tmpl_bloco_flag` à **sua própria** flag, e os posiciona nos dois modelos de
contrato social (Participações e Agro), entre o preâmbulo de qualificação e o
primeiro capítulo:

| Bloco | Flag |
| --- | --- |
| Resolução: alteração do endereço da sede | `evento_alteracao_endereco` |
| Resolução: aumento do capital social | `evento_aumento_capital` |
| Resolução: cessão de quotas | `evento_cessao_quotas` |
| Resolução: integralização de capital | `evento_integralizacao` |
| Resolução: mudança na administração | `evento_mudanca_administracao` |
| Resolução: entrada ou retirada de sócio | `evento_mudanca_socios` |

A mesma migration **desfaz** o vínculo improvisado que o ensaio antigo usava (as
seis flags penduradas no bloco `Capítulo — Questões Diversas`). Ele estava errado
por dois motivos independentes:

- `src/lib/templates/composition.ts` compõe com **AND** (`flags.every(...)`), de
  modo que aquele capítulo só entraria se **todos os seis** eventos tivessem
  acontecido na mesma alteração, o que é cenário raríssimo;
- aquele capítulo não é condicional: ele abriga a cláusula de foro e pertence a
  **todo** contrato. Preso a flags de evento, sumia de todo contrato de
  constituição.

Com uma flag por bloco, o AND vira trivial (um único termo) e cada evento puxa a
sua própria resolução, sem depender do que os outros responderam.

As seis linhas de `tmpl_flag` são permanentes desde 25/08/2026 (seed da migration
`20260824212848`), e desde `20260825143000` estão com `escopo = 'documento'`.

#### Aplicar no sandbox

`supabase db push` está quebrado nesta árvore por drift do ledger de migrations
(erro `LegacyDbPushMissingLocalError`). Aplique o SQL direto:

```bash
supabase db query --linked -f supabase/migrations/20260825194340_blocos_resolucao_alteracao_contratual.sql
```

As duas migrations são idempotentes: rodar de novo não duplica bloco nem empurra
a ordenação uma segunda vez.

### 2.5 Tipo dos blocos: `livre`, não `clausula`

Cláusula tem numeração automática **contínua** (`numeracao.ts` não reseta por
capítulo). Uma resolução numerada empurraria a numeração do contrato consolidado
inteiro, e "CLÁUSULA PRIMEIRA" passaria a ser a resolução em vez da denominação
da sociedade. Bloco `livre` sai como escrito e não consome número; a rubrica em
negrito (`*Do aumento do capital social.*`) faz o papel do rótulo.

---

## 3. Como rodar

Da raiz do repositório:

```bash
node e2e/demos/ac-alteracao-contratual.mjs
```

Abre uma janela de verdade, em ritmo de plateia (`slowMo` 700ms + pausas de 3 a
5 segundos nos momentos que importam), narra cada passo numerado no terminal e
grava vídeo. Os caminhos do vídeo, das fotos e do registro JSON são impressos no
fim.

Variáveis de ambiente, todas com default:

| Variável | Default | Para quê |
| --- | --- | --- |
| `AC_URL` | `http://localhost:5199` | Base do app |
| `AC_EMAIL` | `user001@exemplo.dev` | Login da equipe |
| `AC_PASSWORD` | `devlocal123` | Senha |
| `AC_CLIENTE` | `Banana Quântica` | Trecho do nome do cliente |
| `AC_EMPRESA_1` | `Pantanal Comércio` | Empresa principal |
| `AC_EMPRESA_2` | `Rondon` | Empresa de contraste |
| `AC_HEADLESS` | (vazio) | `1` roda sem janela e sem as pausas |
| `AC_OUT` | `.playwright-mcp/ac-<timestamp>` | Pasta dos artefatos |

Convém rodar uma vez com `AC_HEADLESS=1` para conferir que os seletores ainda
existem, antes de rodar headed para uma plateia.

---

## 4. Os dez passos, e o que se espera ver em cada um

**1. Login e chegada em Gerar Documento.**
`/equipe`, email e senha, botão "Entrar", depois o botão da área **OSG**.

**2. Escolher cliente e modelo.**
O cliente vai no select Radix da barra do topo (é combobox, não `<select>`; o
`browser_select_option` não funciona). O modelo é um **card**, não um select:
clique no card "Contrato Social — Sociedade Limitada (Participações)". O passo 1
colapsa num resumo com botão "Trocar".

**3. O fluxo de geração NÃO pergunta mais "o que se aplica".**
O ensaio conta a ausência do passo em voz alta, porque ela é o desenho novo.
Se o `<h2>` "Marque o que se aplica" reaparecer, é regressão.

**4. Escolher a empresa e ver a folha.**
Cards de empresa com avatar, razão social, CNPJ e tipo (PR/CN/SC). Escolhida a
empresa, os passos saem de cena e a folha branca assume a tela, com o painel de
conferência à esquerda e o rail de ações à direita.

**5. Validar a versão e registrar na junta.**
Dois botões do rail, cada um com o seu AlertDialog. "Validar versão" congela os
valores e cria o `documento_gerado`; "Registrar na junta" o trava. Os dois passos
são **idempotentes** no ensaio: numa segunda rodada o documento já está no estado
final e o script só narra.

**6. O assistente, em modal, sobre a folha travada.**
A folha travada mostra a tarja "Registrado na junta" e o botão **"Gerar alteração
contratual"**. Se já houver alteração em curso, o botão é **"Rever os eventos"**,
e o script aceita os dois caminhos. O modal traz os **seis interruptores**.

**7. Marcar dois eventos e gerar.**
Sugeridos: `Houve mudança do endereço da sede` (a resolução dele não percorre
lista nenhuma, então entra até com cadastro magro) e `Houve aumento do capital
social` (percorre `{{#socios}}` e mostra a resolução escrita do quadro).
"Continuar" leva ao segundo passo do modal, que avisa o que precisa estar
atualizado no cadastro antes de gerar; "Gerar alteração contratual" grava as
**seis** respostas de uma vez (as desmarcadas como `false`: é a existência das
linhas que marca "há uma alteração em curso aqui").

A folha passa a trazer, logo depois do preâmbulo, as resoluções marcadas.

**8. Recarregar e refazer a seleção.**
Nem o cliente nem as escolhas do fluxo persistem entre navegações
(`OsgWorkContext` é `useState` puro), então refaça cliente → modelo → empresa. O
que **deve** persistir são as respostas, que estão no banco: as resoluções voltam
para a folha sozinhas.

**9. Isolamento entre empresas.**
Refaça a seleção com a empresa de contraste. O que se mede é **vazamento**: as
resoluções marcadas na primeira empresa **não** podem aparecer na folha da
segunda. A segunda pode ter uma alteração própria em curso (com respostas
próprias), e isso não é defeito.

**10. Fecho.**
O script reabre o assistente e desmarca tudo. A UI grava `valor = false` (não
apaga linha: a RLS de DELETE é só de admin), e isso basta para as resoluções
saírem da folha, porque é `false` que o motor lê.

---

## 5. O que é defeito e o que é esperado

### Esperado, não relate como bug

- **Resolução que entrou na composição e foi descartada por falta de dado.** O
  painel a nomeia em "N blocos não entraram" com o motivo ("a lista que ele
  percorre não trouxe nenhum item"). É cadastro incompleto do cliente de teste,
  não motor. O script conta folha + descartadas e só reclama se a resolução não
  aparecer em lugar nenhum.
- **Blocos do contrato listados como "não entraram"** pelo mesmo motivo
  (`Preâmbulo — qualificação dos sócios`, `Tabela Quotistas`).
- **Ter de refazer cliente/modelo/empresa depois de recarregar.** O contexto não
  persiste, por desenho atual.
- **"Marque o que se aplica" ausente da tela.** Saiu do fluxo em 25/08/2026.
- **A segunda empresa com alteração própria em curso.** Isolamento é sobre
  vazamento de resposta, não sobre ausência de alteração.

### Sinal de defeito

- Resolução marcada que não aparece **nem na folha nem entre as descartadas**.
- Resolução de uma empresa aparecendo na folha de **outra** (vazamento).
- Resposta que **não persiste** depois de recarregar a página.
- Erro `Esta condição pertence a uma alteração contratual, e não há uma em curso.`
  com o documento registrado na tela.
- Toast `Erro ao salvar os eventos da alteração` ou `Erro ao registrar o
  documento`. Leia a mensagem literal do servidor, é a prova.
- O passo "Marque o que se aplica" de volta no fluxo de geração.
- Folha inteira em erro depois de marcar um evento (placeholder não resolvido em
  algum bloco de resolução derruba a composição inteira).

---

## 6. O que o ensaio deixa para trás

O fecho desliga os eventos, mas **não** devolve o sandbox ao estado exato:

- as linhas de `projeto_flag_valor` continuam gravadas com `valor = false`,
  ancoradas no documento registrado. A UI não tem caminho para apagá-las (RLS de
  DELETE é só de admin), e enquanto elas existirem a tela considera que **há uma
  alteração em curso** naquela empresa: o botão vira "Rever os eventos" e a peça
  registrada não volta a aparecer travada;
- o `documento_gerado` que o ensaio registrou continua com `status =
  'registrado'`. Não há "desregistrar" na tela.

Nada disso quebra a próxima rodada (o script aceita os dois pontos de entrada do
assistente), mas vale saber. Para zerar de verdade, no **sandbox**:

```sql
delete from public.projeto_flag_valor where documento_base_id is not null;
update public.documento_gerado set status = 'rascunho'
 where status = 'registrado' and pj_pessoa_id in (
   select id from public.pessoa where denominacao in (
     'Pantanal Comércio S.A.', 'Rondon Administradora de Bens S.A.'
   )
 );
```

---

## 7. Pendências conhecidas

- **Não há "cancelar alteração" na UI.** Ver seção 6. Desmarcar tudo esvazia o
  documento novo mas não o desfaz.
- **As resoluções afirmam o estado NOVO, não a transição.** O caminho B não
  guarda a história da sociedade, então nenhuma resolução escreve "de X para Y":
  não existe no cadastro o capital anterior, a sede antiga nem o quadro
  societário de antes. É o que o segundo passo do modal avisa em voz alta.
- **Falta o bloco de "consolidação".** O documento sai com as resoluções e, logo
  em seguida, o contrato inteiro, sem a frase que liga uma coisa à outra
  ("resolvem consolidar o contrato social, que passa a vigorar com a seguinte
  redação"). Esse bloco teria de entrar quando **qualquer** evento estivesse
  marcado, e o motor só faz AND: precisaria de OR, de negação, ou de uma flag
  derivada "há alteração em curso" que hoje não existe.
- **O cabeçalho continua dizendo "INSTRUMENTO PARTICULAR DE CONSTITUIÇÃO".** Pelo
  mesmo motivo do item anterior: o título alternativo dependeria de um bloco
  condicionado ao "há alteração em curso".
