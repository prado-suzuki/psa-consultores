# Decisões de tema e cor — 18 a 20/08/2026

Registro das decisões, com o endereço onde cada afirmação se verifica. **Não é narrativa da
discussão**: é a decisão, o número que a sustenta e onde conferir.

Medidas conferidas em 20/08/2026, no commit `308a0149`. Número sem endereço é suspeito por
definição — se você encontrar um aqui, ele está errado ou envelheceu.

> ⚠️ **REGISTRO DE 20/08. Três decisões daqui foram REVERTIDAS depois, e as três pelo
> mesmo motivo — a área tinha a mesma âncora do piso, então o bloco dela era uma cópia.**
> Os endereços `index.css:NNN` deste documento não valem mais; as linhas andaram.
>
> | bloco | saiu em | por quê |
> |---|---|---|
> | `.rotina-theme` | 29/08/2026 | congelado idêntico ao piso, variável por variável |
> | `.board-theme` | 31/08/2026 | as superfícies dele viraram as do piso (a casa é o Board) |
> | `.sistema-theme` | 31/08/2026 | o grafite do Dev brigava com os `--bd-*` cravados em teal, e a justificativa escrita dele caiu junto com o marfim |
>
> Sobraram `.base-theme` (piso, toda rota), `.tax-theme` e `.osg-theme` (congeladas).
> **Não há mais nenhum tema DELTA.** O estado corrente está em `paleta-por-area.md`; o que
> continua valendo aqui é o RACIOCÍNIO de cada decisão e os números medidos na época.

Documentos vizinhos, que este não repete: `paleta-por-area.md` (papéis de status e tons de
tag), `comparacoes-de-cor/LEIA.md` (as decisões tomadas olhando, e as três que seguem em
aberto), `inventario-telas-por-cluster.md` (o que cada cluster precisaria). O
`inventario-paletas-por-tela.md`, que media a dívida de cor por tela, era uma foto de 18/08
com o mecanismo já mudado e foi **apagado em 01/09/2026** — está no histórico do git.

---

## 1. A arquitetura

### `.base-theme` é o piso, e declara o contrato inteiro

`src/index.css:340` — **43 variáveis, 74 linhas**. Não é um tema de área: é o chão que
qualquer rota pisa. Aplicado sempre, em toda rota, pelo resolvedor.

**O valor dele é o teal da marca** (`--primary: 175 82% 29%`, idêntico a `--teal-500`), e
isso é a decisão: rota que ninguém mapeou **nasce com a cor certa**, não com um cinza de
fábrica. Esquecer de mapear uma rota nova custa "sem identidade de área", nunca "errado".

Antes dele, `/equipe/tax/gerencial/chamados` renderizava com `--ring: 85 85% 37%` — lima,
não teal — porque nenhuma classe de tema estava no DOM. O defeito não era só o `--ring`:
**21 das 33 variáveis** do contrato ficavam erradas na janela em que o gate carregava.

### Congelado × delta

`src/lib/areaTheme.test.ts:278-279` declara os dois grupos, e `:285` exige que **todo tema
conhecido esteja em um deles** — criar tema sem classificar quebra o teste.

| | O que exige | Teste | Quem |
|---|---|---|---|
| **Congelado** | declara as 43 | `areaTheme.test.ts:291` | `tax`, `osg`, `rotina` |
| **Delta** | subconjunto, nada fora do contrato | `areaTheme.test.ts:297` | `sistema` |

**O critério é a data, não a preferência:** `tax` e `rotina` nasceram *antes* do piso
existir, com valores já validados na tela. Congelar é o que garante que criar o piso não
mexeu neles. O `sistema` nasceu *depois* e por isso pode herdar — declara **9 variáveis**
(`index.css:743`) em vez de 43, e o que não declara vem do piso de propósito.

### A ordem no `index.css` é funcional, não estética

Todas as classes de tema têm a mesma especificidade (0-1-0) e convivem no mesmo `<html>`.
Empate de especificidade se resolve por **ordem no arquivo**. O piso tem de vir primeiro:

```
.base-theme  340  →  .tax-theme  444  →  .osg-theme  531
             →  .rotina-theme  645  →  .sistema-theme  743
```

Coberto por `areaTheme.test.ts:143-147`, que compara `indexOf`. **Limite conhecido:** o
teste garante que o piso vem antes de todos, mas não a ordem *entre* dois temas de área.
Hoje não importa — dois nunca se aplicam juntos.

### O resolvedor fica acima dos gates

`src/lib/areaTheme.ts` — **22 regras** de prefixo em `MAPA_DE_ROTAS`, casamento por
segmento, prefixo mais longo vence, piso universal como fallback. **34 testes**
(`areaTheme.test.ts`), sobre as **110 rotas `/equipe`** que o `App.tsx` declara.

Montado em `src/App.tsx:182`, envolvendo `<Routes>`. A razão está no comentário em
`App.tsx:179-181`: **`LiderRoute` devolve `null` enquanto carrega o papel**. Tema aplicado
dentro do gate não existe durante esse intervalo. Por isso `AreaThemeProvider` usa
`useLayoutEffect`, e não `useEffect`: a classe entra **antes da pintura**.

### `--teal-*` é primitiva, não token

`--teal-500/600/700` moram no `:root` e **nenhum tema as sobrescreve**. Existem para
alimentar os tokens semânticos; componente usa `bg-primary`.

O engano era invisível: no tema base `bg-teal-600` (#0A756C) e `bg-primary` (#0D877C) dão
quase a mesma cor. Só quando `/equipe/acessos` virou grafite os botões apareceram teal.

Regra travada em `eslint.config.js:56-71`, em **`warn`** e de propósito: erro de build seria
apagão, não migração. **164 avisos** hoje. O aviso trava o crescimento; o número só cai.

---

## 2. As decisões, com o número que as sustenta

### Grafite QUENTE (matiz 35), não frio

Porque o ambiente onde ele entra não é neutro:

| | Valor | |
|---|---|---|
| `--background` | `42 24% 99.8%` | marfim |
| `--foreground` | `20 81% 10%` | marrom quase preto |
| **grafite** | **`35 10% 26%`** | **cai entre os dois** |

Endereços: `index.css:340` (base) e `index.css:743` (sistema). Um grafite azulado seria a
única cor fria de uma tela inteiramente quente.

### O grafite no `.sistema-theme`, não no piso

Porque o piso é **fallback universal**: toda rota não mapeada cai nele. Medido — das 129
rotas do `App.tsx`, **13 são públicas ou de autenticação** (`/`, `/auth`, `/cliente/*`,
`/novidades*`, `/missao`, `/primeiro-acesso`, `/reset-password`…). Trocar o piso pintaria o
**site público e o portal do cliente** de grafite. O alcance era grande demais para uma
decisão sobre telas de infraestrutura.

> **Revertida em 31/08/2026 — o grafite saiu inteiro, não mudou de lugar.** A decisão acima
> continua certa no que ela afirma: o grafite nunca podia ir para o piso. O que caiu foi o
> grafite em si. Dois fatos, medidos:
>
> - a tela `/equipe/dev/uso-envio` usa os tokens `--bd-*` do design system do Board. Três
>   seguem o `--primary` (viravam grafite) e dois estão **cravados em teal** no `:root` —
>   `--bd-accent-d` (pinta letra, chip cheio e avatar) e `--bd-accent-soft`. Na mesma
>   tabela: link e chip teal, hover de linha e anel de foco grafite. É o defeito de 21/08
>   (Board) e o de 31/08 (Digital) pela terceira vez, numa tela que ninguém tinha aberto;
> - a justificativa do tom **quente** era, literalmente, "o canvas da base é marfim e o
>   texto é marrom". Na mesma data o piso virou frio (superfícies matiz 168,
>   `--foreground: 178 30% 9%`). Decisão cujo motivo evaporou se reexamina.
>
> A regra "a quem a tela serve" **não caiu** — ela deixou de pintar. `sistema` segue sendo
> área em `MAPA_DE_ROTAS`. Aviso a quem for dar cor ao Dev outra vez: o acento sozinho não
> resolve, tem que incluir os `--bd-*`.

### Paleta de área contida, não otimizada para leitura isolada

`index.css:160-207`. Oito tons em faixa estreita (luminosidade 32–42%) — família, não
arco-íris. Separação por **matiz**: os 28 pares passam, o mais próximo a **25°**
(terracota × ocre). Contraste sobre o card entre **4,32 e 8,43**.

Isso só é adequado porque **o nome está sempre ao lado do ponto**. Verificado em **6 sítios**
(4 arquivos), todos com texto imediatamente após o ponto na mesma linha flex:

| Endereço | Texto ao lado |
|---|---|
| `acessos/UsersTab.tsx:190` | `{opt.label}` |
| `acessos/UsersTab.tsx:222` | `{group.area?.name ?? 'Sem área'}` |
| `acessos/EquipesEstruturaField.tsx:125` | `{grupo.caminho}` |
| `equipe/estrutura/EstruturaManager.tsx:318` | `{area.name}` |
| `equipe/estrutura/EstruturaManager.tsx:615` | `nomeDoTomDaArea(...)` — nome do **tom**, não da área |
| `pages/equipe/EquipeControleAcessos.tsx:408` | `{ea.name}` |

`mapeamento/AreaAccordion:48` **não** é um sétimo: pinta `'#94a3b8'` cravado em
`useProcessMapping` — cinza constante que nunca leu esta cor.

`--area-5` está em **202°**, não 195°: a 195 ficava a 20° do teal institucional (175) e uma
tela da Tax mostraria ponto petróleo ao lado de botão teal. Em 202 a distância é 27°.

### Cor de área derivada, não escolhida

`estrutura_areas.color_index` guarda o slot, atribuído no primeiro livre quando a área nasce
(`useEstruturaManager.ts:193-204`).

**O motivo é medido: das 10 áreas com cor escolhida à mão, SETE ficaram no mesmo verde** —
que era o terceiro preset do seletor. Escolha manual não diferenciava.

> **Esse número não é mais re-medível no banco vivo:** a coluna `color` está `NULL` nas 10
> linhas desde 20/08 (conferido por `select color, count(*) from estrutura_areas group by
> color`). Ele está gravado em
> `supabase/migrations/20260820120000_area_color_index.sql:13` e no comentário da coluna
> (`:71`), e citado em `index.css:168`. Confira ali — não no dado.

Não há tela para o campo, e isso é decisão: **campo de formulário que não afeta mais nada é
pior que campo nenhum.** A leitura é `color ?? derivado de color_index`.

**A colisão é tratada em dois lugares**, de propósito: na criação (`src/lib/corDaArea.ts`) e
na ativação (trigger `trg_realoca_color_index_na_ativacao`, migration `20260820150000`) —
porque o app nunca escreve a coluna ao ativar, então só o banco pega.

### Tema por rota, não por cluster

Medido: **11 clusters** (3 ativos) contra **4 temas** (`tax`, `osg`, `rotina`, `sistema`). Os
números não se correspondem porque as duas coisas não são a mesma:

> **Cluster é quem fatura. Ambiente é onde se trabalha.** Um cluster não sabe quais rotas são
> dele; a rota sabe em que ambiente está.

### Checkbox com raio próprio

Com `--radius: 0.75rem` (`index.css:226`), `rounded-sm` resolve para **8px** — metade do lado
de uma caixa de **16px** (`h-4 w-4`). Isso é um **círculo**, e deixava a caixa de seleção
idêntica ao botão de radio no app inteiro: mesmo tamanho, mesma borda, mesma forma. A
diferença entre "escolha uma" e "escolha várias" desaparecia.

Degrau `xs` acrescentado em `tailwind.config.ts:240` (`calc(var(--radius) - 8px)` = 4px);
aplicado em `ui/checkbox.tsx:19`. **`--radius` e `rounded-sm` não foram tocados.**

---

## 2.1. A tabela de mapeamento — cor crua → token

Validada em uso nas duas levas do Controle de Acessos (295 ocorrências). Estava só em
conversa até 20/08/2026; escrita aqui porque regra que não está em lugar nenhum se aplica
diferente a cada vez.

| Papel | Token |
|---|---|
| texto principal, título | `text-foreground` |
| texto secundário, legenda | `text-muted-foreground` |
| terceiro nível, mais fraco que o secundário | `text-muted-foreground/70` |
| borda e divisória | `border-border` / `divide-border` (com `/60` onde já havia opacidade) |
| fundo de cartão | `bg-card` |
| fundo apagado, área secundária | `bg-muted` |
| branco sobre `bg-primary` | `text-primary-foreground` |
| **fundo que significa ESTADO — desligado, cancelado, arquivado, somente leitura** | **`bg-status-neutro-soft` + `text-status-neutro`** |

**A linha de estado é a que faltava, e ela é a única que não se resolve por tom.** As outras
oito olham para a aparência da cor; esta olha para o que a cor *diz*. Um cinza pode ser
superfície (→ `bg-muted`) ou pode ser o recado de que algo está fora (→ papel de status), e a
diferença não está na sintaxe — nenhuma regra de lint a alcança.

**Por que `status-neutro` e não um token novo:** ele já existe, já é declarado por tema, já tem
classe no Tailwind e já era usado em 4 arquivos. Medido em 20/08/2026, o `-soft` vale `#E3E0D3`
(sistema), `#E2DBD4` (tax) e `#E4D8D2` (osg) — acompanha a área, de leve. Contra ele, o
`bg-slate-200` que os sítios usavam vale `#E2E8F0` **nos três**: azulado, sobre chão marfim.

E a assimetria que faz o papel funcionar: **o fundo do desligado quase não muda entre temas; o
texto dele muda muito** (`#5D573C` / `#655443` / `#46332A`), enquanto o fundo do *ativo* muda
muito (`#D7E9CE` / `#C7F0ED` / `#C7F0DB`). O desligado se distingue por **saturação**, não por
tom — que é o que se quer de um estado apagado.

> **Regra de decisão, quando houver dúvida:** se trocar aquele fundo por `bg-muted` faria a
> pessoa perder a informação de que o item está fora, é papel de status. Se não faria diferença
> nenhuma além do tom, é superfície.

Onde a função não for evidente pelo JSX, **não adivinhe**: deixe como está e registre a linha.
Um cinza que virou o token errado é pior que um cinza cru, porque passa a mudar de cor sozinho.

## 3. As premissas — condição de validade, não "limitação conhecida"

### A paleta de área vale enquanto o nome acompanhar o ponto

**Verificada nos 6 sítios da tabela acima.** Se a cor passar a aparecer **sozinha** — legenda
de gráfico, mapa de calor, barra empilhada, ponto sem rótulo — a paleta deixa de servir: sob
protanopia e deuteranopia estes tons colapsam e o pior par cai a **ΔE 1,4**
(terracota × oliva).

Não é limitação tolerada. É premissa: **quebrar a premissa quebra a paleta**, e a resposta é
refazer o conjunto com separação por luminosidade, não ajustar tons.

> ⚠️ `index.css:199` afirma que existe uma versão assim medida (ΔE 10,8 no pior par,
> luminosidade de 26% a 56%) e que ela "está no histórico desta mudança". **Procurei e os
> valores não estão em nenhum arquivo do repositório** — só a menção. O plano B está
> documentado mas não guardado; quem precisar dele vai ter que medir de novo.

### A cor nunca aparece em área inativa

`PontoDaArea` não renderiza sem cor, e `useEstruturaAreas` filtra `is_active`
(`useEstruturaManager.ts:74`). Área inativa não mostra ponto.

### As rotas de redirecionamento não piscam porque hoje os acentos coincidem

`areaTheme.ts:103` registra o motivo de `/equipe/tarefas` estar no mapa: *"mapeadas para não
piscar de tema no meio"*. Medido, o quadro é mais estreito do que a frase sugere — só essa
rota foi mapeada de propósito; as outras três `<Navigate>` herdam do prefixo da área.

Distância de cada tema até o piso, nas 43 (ΔE OKLab-aproximado em sRGB):

| Tema | Difere do piso | Maior salto |
|---|---|---|
| `.rotina-theme` | **0 de 43** | — é duplicata exata do piso |
| `.tax-theme` | 26 de 43 | `--muted-foreground` **ΔE 12,9**; superfícies ΔE 0,6–1,5 (invisíveis) |
| `.osg-theme` | 38 de 43 | `--primary` **ΔE 24,4**, `--foreground` **ΔE 23,5** |
| `.sistema-theme` | 8 de 43 | acento e ícone |

**A premissa:** `/equipe/tarefas*` e `/equipe/tax/auditoria` não piscariam sob resolução por
categoria — mas por razões diferentes, e nenhuma delas é estável.

- `/equipe/tarefas*` é seguro **estruturalmente**: piso e `.rotina-theme` são idênticos nas
  43. Enquanto isso valer, não há o que piscar.
- `/equipe/tax/auditoria` é seguro **por acidente de dois níveis**: o acento coincide (ambos
  `175 82% 29%`), as superfícies diferem abaixo do limiar visual, e o `--muted-foreground`
  salta a ΔE 12,9 mas não pinta porque `<Navigate replace>` não renderiza DOM.
- `/equipe/osg/auditoria` **pisca**: teal → musgo a ΔE 24,4. Precisa de exceção declarada.

> **No dia em que a Tax ganhar acento próprio, `/equipe/tax/auditoria` passa a piscar sem
> ninguém ter tocado nela** — `--primary` entra nas 26 que já diferem. O mesmo vale para a
> Rotina no dia em que `.rotina-theme` deixar de ser duplicata do piso. Quem der acento a
> uma área precisa reler esta lista, não só o bloco do tema.

---

## 3.1. As 9 exceções da Etapa 2, reavaliadas contra a tabela — **9 → 7**

Feito em 20/08/2026, depois que a linha de estado entrou.

**Resolvidas (2):** o badge "Inativo" em `DashboardOverviewDialog:122`, que era `bg-slate-200` +
`text-slate-600`. Era o caso que originou a linha, e a linha o resolve.

**Continuam (7), e todas pela MESMA lacuna:**

| Endereço | | |
|---|---|---|
| `PermissionsTree:221` | 1 | `border-slate-300` num `<Checkbox>` |
| `CreateUserDialog:218,263` | 2 | idem |
| `EditUserDialog:183,228` | 2 | idem |
| `EstruturaManager:651` | 2 | `border-slate-300 hover:border-slate-400` num chip |

**A tabela nova não as alcança, e isso é preciso, não omissão.** A linha que entrou fala de
**fundo** que significa estado. Estas sete são **borda de controle** — o contorno de um checkbox
ou de um chip não-selecionado. Não é estado, não é superfície, não é texto: é uma nona categoria
que a tabela não tem.

E o token disponível não serve, medido: `--input` e `--border` valem ambos `(229,231,235)`, contra
`(203,213,225)` do `slate-300` — **seis pontos de luminosidade mais claro**. Trocar clarearia o
contorno em todos os sete.

> **O que decidiria isto:** ou um token de borda de controle com valor próprio, ou a decisão de
> que checkbox usa `border-primary` (o padrão do `ui/checkbox`) e as sete sobrescritas saem. A
> segunda é mais barata e muda a aparência: os checkboxes ficariam acentuados em vez de neutros,
> e foi justamente isso que alguém decidiu evitar numa árvore densa.

## 4. Pendências nomeadas

### `TEMAS` do `paletaDeArea` é mantida à mão — e o `.rotina-theme` nunca foi verificado

```ts
// src/lib/paletaDeArea.ts:51
export const TEMAS = [':root', '.tax-theme', '.osg-theme'] as const;
```

`.rotina-theme` declara as 43 — **incluindo os 8 papéis de status e as 4 tags** — e **não
está nessa lista** (`grep rotina src/lib/paletaDeArea*.ts` devolve zero). Logo a paleta dela
nunca passou por contraste, faixa de saturação, separação par a par nem separação entre
áreas. Passou só pela contagem de completude do `areaTheme.test.ts`.

**Nenhum teste exige que um tema novo entre em `TEMAS`.** É a única das quatro etapas de
criar um tema que depende de alguém lembrar. Duas portas, uma tranca.

### Neutros `slate` por migrar

**207 ocorrências** de `slate-NNN` em `src/components/acessos`, `ProdutosServicosTab.tsx` e
`EquipeControleAcessos.tsx`. Não acompanham tema. Fora do escopo desta semana de propósito —
é migração grande e independente. (O detalhamento vivia no `inventario-paletas-por-tela.md`,
apagado em 01/09/2026; para a contagem de hoje, medir em vez de citar este número.)

### O Board vai ser refeito, e por isso não serve de exemplo

`--surface-escura` no piso é `229 84% 5%` — **slate frio**, de quando a superfície escura do
Board foi feita. O `.sistema-theme` declara `35 10% 8%`, quente. As telas escuras do Board
não foram migradas porque a tela toda vai mudar; **copiar o padrão dela hoje é copiar o que
está saindo.** Contexto em `inventario-telas-por-cluster.md`.

### "Adm & Fin": nome é exibição, caminho é decisão

Nome oficial confirmado em 20/08. **Se esse cluster ganhar rota, o nome não vira caminho** —
`&` e espaço não sobrevivem a URL. Registrado em `inventario-telas-por-cluster.md:76-88`.

### Chamado sem cluster nasce invisível para quem usa o espelho

A tela de chamados é **espelhada**: `/equipe/chamados?area=osg` mostra os chamados da OSG com o
tema da OSG, e o recorte é por `tickets.cluster_id`. Consequência direta: **chamado sem cluster
não aparece em espelho nenhum.** Só na tela aberta direto, sem parâmetro — que é o caminho que
ninguém percorre, porque todo menu de área leva a chave.

**Hoje são 19 chamados** (18 resolvidos, 1 em andamento), o mais antigo de 08/04/2025 e o mais
recente de **13/08/2026** — ou seja, não é resíduo de migração: continua acontecendo.

**Nada impede.** Verificado em três camadas, em 20/08/2026:

| Camada | Estado |
|---|---|
| Coluna | `tickets.cluster_id` é `NULL`-ável, sem default e sem CHECK |
| Triggers | as 4 de `tickets` tratam atribuição, geração de tarefa, `closed_at` e `updated_at` — nenhuma valida cluster |
| Código | `useCreateTicket.ts:193-203` **auto-resolve** o cluster, e só quando o cliente tem **exatamente um**; `:227` faz `if (resolvedClusterId) insertPayload.cluster_id = …`, então o campo é simplesmente omitido, sem erro nem aviso |

**E a condição falha em 1 de cada 5 clientes:**

| Vínculos do cliente | Clientes | Resultado |
|---|---|---|
| 1 cluster | 235 | nasce com cluster |
| 2 clusters | 45 | **nasce sem** |
| 0 clusters | 18 | **nasce sem** |
| 3 clusters | 1 | **nasce sem** |

**64 de 299 (21,4%)** dos clientes produzem chamado invisível no espelho. A exposição atual é
de um chamado em andamento; o padrão é o que importa.

> **Decisão da usuária, pendente.** Três caminhos, e nenhum é obviamente certo: validação no
> cadastro (bloqueia, mas o cliente com 2 clusters é caso legítimo e alguém teria de escolher);
> uma visão de órfãos (não bloqueia nada e dá onde olhar); ou aceitar e documentar. Registrado
> aqui sem conserto — mexer em criação de chamado não é decisão de quem estava arrumando cor.
>
> Para remedir: `select count(*) from tickets where cluster_id is null`.

### Grant concedido que não abre porta — o `LiderRoute` barra 13 de 25

Segundo caso desta semana de **registro que não exerce controle** (o primeiro foi
`estrutura_areas.page_categories`, cujo rótulo prometia conceder acesso e não concedia).

As três rotas da Gestão de Chamados são `LiderRoute`, e ele é **estrito**: `isAdmin || isLider`,
então **sublíder não passa** (`src/components/auth/LiderRoute.tsx:34`).

| Rota | Tem grant | **Passa o gate** | Diferença |
|---|---|---|---|
| `/equipe/tax/gerencial/chamados` | 25 | **12** | **13** |
| `/equipe/osg/gerencial/chamados` | 19 | **9** | **10** |
| `/equipe/board/chamados` | 6 | **4** | **2** |

Medido em 20/08/2026. As pessoas barradas são `team_member` e `sublider` que **têm a permissão
concedida em `user_page_access`** e são redirecionadas pelo gate de papel.

**Por que isso importa mais do que parece:** quem administra acessos vê a permissão marcada e
conclui que a pessoa tem a tela. A pessoa não tem. Não há erro, não há aviso — o gate
redireciona em silêncio. É a mesma forma do defeito de rótulo: um registro que descreve um
estado que o sistema não produz.

> **Não consertado, e são três caminhos diferentes:** o gate está certo e os grants estão
> errados (revogar); os grants estão certos e o gate é rígido demais (incluir sublíder); ou os
> dois estão certos e falta a tela de acessos **mostrar** que aquele grant não abre porta. A
> terceira é a única que não muda quem vê o quê.
>
> Para remedir, a consulta está no corpo do commit que registrou este item.

### Cor crua de estado: 963 sítios — e a inversão é o achado, não o total

Medido em 20/08/2026, fora de `src/components/ui/`. **O número que importa não é o total: é a
razão entre token e cor crua, e ela é oposta em cada papel.**

| papel | token do contrato | cor crua | razão |
|---|---|---|---|
| **destrutivo** | **392** sítios / 118 arq | 284 / 80 arq (`red`, `rose`) | **1,4 : 1 a favor do token** |
| alerta | 44 / 19 arq | 447 / 120 arq (`amber`, `yellow`, `orange`) | **1 : 10 contra** |
| sucesso | 38 / 15 arq | 569 / 120 arq (`green`, `emerald`, `lime`, `teal`) | **1 : 15 contra** |

**Destrutivo já venceu.** `--destructive` está em 392 sítios contra 284 crus — a migração dele
aconteceu, provavelmente porque o `ui/button` tem variante `destructive` e ela puxou o resto.

**Sucesso e alerta nunca começaram.** 38 e 44 sítios de token contra 1.016 crus somados. Não é
uma dívida de 963 espalhada por igual: são **dois papéis inteiros** que ficaram de fora.

Isso muda o que fazer com ela. Uma migração de 963 sítios é um mutirão; consertar dois papéis
que têm token pronto e quase nenhum uso é outro tipo de trabalho — e o exemplo do destrutivo diz
qual alavanca funcionou: **um componente do `ui/` com a variante certa**, não uma varredura.

> Para remedir: `grep -rEo "\b(bg|text|border)-(green|emerald|lime|teal)-[0-9]{2,3}" src
> --include=*.tsx | grep -v "/ui/" | wc -l` (e as famílias equivalentes para os outros papéis).
>
> `teal` conta em sucesso e é dívida própria — a soma por papel passa de 963 por causa dele.

**Não migrado nesta rodada, de propósito.** O que entrou foi só o papel que não tinha linha na
tabela (desligado, 6 sítios em 5 arquivos).

### O substring que sobrou, e por que sobrou

Removido de `construirMapaDeClusters` no commit `308a0149`. **Sobraram dois:**

| Endereço | Por que ficou |
|---|---|
| `boardExecutivo.ts:109` (`bucketDoItem`) | modo degradado documentado em `usePerformanceData.ts:165-169`: se `estrutura_areas` falhar por RLS ou rede, sem ele **todo** projeto vira "Sem área" |
| `performanceOperacional.ts:400` (`chipDeArea`) | idem, no rótulo |

E em `trabalhoDigital.ts:264,267` ele é **load-bearing**, não resíduo: **7 dos 17** projetos
de `projects` têm `equipe_id` nulo e `area = 'OSG'` em texto livre. Sem área cadastrada não
existe `page_categories` para ler — remover ali desliga a classificação de 41% dos projetos.

**Consequência a declarar:** como `bucketDoItem` continua, o substring está **reduzido, não
eliminado** do Board. Item cuja área não esteja no mapa ainda é adivinhado pelo nome.

---

## 5. Uma correção que precisa constar

Tratamos como urgente que **"os números do Prado entram na Tax"**. Medido:

| | |
|---|---|
| Projetos no cluster Prado Advogados | **0** |
| Equipes | **0** |
| Pessoas | **0** |
| Projetos que resolvem para Prado | **0** de 143 |

O mapa errado **existia** — `TAX LEGAL`, área ativa do cluster Prado sem `page_categories`,
casava `includes('tax')` e fazia o cluster ser contado como Tax. E **nada passava por ele.**

A remoção (commit `308a0149`) valeu pelo mapa, não pela contagem: move zero número hoje e
continua valendo depois da refação do Board.

> **A lição vale mais que o fato: caminho de código errado não é a mesma coisa que número
> errado.** Os dois parecem idênticos na leitura do código, e a diferença só aparece medindo
> o **fluxo** — quantas linhas realmente atravessam aquele caminho. Ler o código estabelece
> que o defeito existe; medir o fluxo estabelece se ele importa, e quando.
>
> A urgência veio da premissa aceita sem medição, não do código.
