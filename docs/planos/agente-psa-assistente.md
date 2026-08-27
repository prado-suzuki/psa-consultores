# Agente PSA — assistente conversacional das telas

**Status:** implementado na `develop`, **pendente de migration nos dois bancos**.
**Primeira tela:** Board > Estratégico (`/equipe/board/dashboard`).
**Cockpit:** Digital > Acessos > aba **Agente** (`/equipe/acessos`).

---

## 1. O que ele é

Um balão flutuante no canto inferior direito, com a logo da PSA, que responde
sobre **os dados da tela em que o usuário está**, devolve insight estratégico e
**aprende com as correções** de quem usa.

A decisão de arquitetura que sustenta todo o resto:

> **O agente não recalcula nada.** A tela publica um snapshot do que ela já
> desenhou (rótulo, valor formatado, janela, nota, aviso de falha) e a edge
> function responde sobre esse texto.

Se ele consultasse o banco por conta própria, a tela mostraria `R$ 4,1 mi` e ele
responderia `R$ 3,8 mi` — duas verdades para o mesmo número, nenhuma auditável.
Do jeito que está, **todo número que ele cita é localizável na tela com Ctrl+F**.

Consequência: ligar o agente numa aba nova = a tela publicar o seu snapshot +
uma linha em `agente_config`. Nenhuma alteração no balão.

---

## 1.1 Ponto de entrada e avisos — como ficou em 21/08

Esta seção foi reescrita: a primeira versão dela dizia "ponto de entrada ÚNICO,
o balão" e "os cards continuam na grade". As duas coisas mudaram no mesmo dia, e
prosa descrevendo estado que já mudou é o pior tipo de documentação.

**Estado final: um idioma por ambiente.**

| Onde | Entrada | Como acha o escopo |
| --- | --- | --- |
| Dentro do Board | ícone discreto ao lado do título (`AgentePsaTrigger`, montado no `BoardLayout`) | pela ROTA (`src/lib/agenteEscopos.ts`, 18 escopos) |
| Fora do Board (Tax, OSG, Acessos) | balão flutuante (`AgentePsaWidget`) | pelo snapshot publicado pela tela |

O balão se retira dentro do Board (`if (escopoDaRota(location.pathname)) return null`)
para não haver duas portas na mesma tela.

O caminho até aqui, porque o motivo importa mais que a conclusão:

1. Houve uma proposta de **entrada única pelo balão**, com o argumento de que
   dois idiomas para a mesma função é pior que qualquer um dos dois, e que o
   ícone dependia do cabeçalho do `BoardLayout` — que Tax, OSG e Acessos não
   têm. O argumento continua válido e é o que fixou o balão FORA do Board.
2. O que o derrubou dentro do Board foi um FATO: **só 5 das 18 telas do Board
   publicam snapshot**, e o balão exige `contexto` para existir. Nas outras 13
   não sobraria agente nenhum — e é dentro do painel que "Exige decisão" agora
   vive. O ícone resolve o escopo pela rota, então existe nas 18.
3. A objeção de o balão aparecer numa apresentação foi resolvida deixando o
   balão **quieto** (46px, `opacity: .55`, presença no hover e no foco), não com
   uma segunda porta.

**Uma cópia só da máquina de estado.** O widget é layout puro e consome
`useAgenteConversaController`; o ícone usa o mesmo hook. Duas cópias fariam a
correção do usuário virar lição por um caminho e não pelo outro — divergência
que só aparece quando o agente responde diferente para a mesma pergunta em dois
lugares.

### Os cards de aviso SAÍRAM da grade — e o que garante a honestidade agora

A faixa "Exige decisão" e o card "Dados incompletos" deixaram de ocupar a grade
do Estratégico (`BoardAlertas` foi deletado). A decisão da usuária foi explícita:
*"não quero um monte de aviso na tela, quero algo mais sutil."*

O que substituiu a garantia, em três camadas, nenhuma delas um card:

1. **O número não mente mais.** Com `projectsQuery.isError`, a faixa de KPIs
   recebe `null` — não `saude.total` — e desenha **"—"** em `--bd-ink3` (o token
   do que não pode ser medido) em vez de `0`. Na pontualidade, `null` também
   tira o ANEL e a PILL: anel em 0% se lê como "nenhuma entrega saiu no prazo",
   e a pill diria "Abaixo da meta" sobre medida que não existe.
2. **O motivo, em meia linha**, no `.pg-sub` que já existia:
   `21 ago 2026 · Ciclo ativo: — · projetos e tarefas não carregaram`. Zero
   elemento novo na tela. A lista é `todasAsFalhas`, a MESMA que alimenta os
   `avisos` do snapshot — se divergissem, o usuário leria um motivo na tela e
   ouviria outro do agente, sem nenhum dos dois estar errado.
3. **O painel e o ponto no ícone**, para o detalhe: `AgentePainelDecisao` desenha
   a faixa de alertas e os avisos lendo o bloco `alertas` do mesmo snapshot que
   o agente recebeu.

O que era o argumento mais forte para manter os cards — "a consulta do
`org_projects` está quebrada e o card é o único lugar onde isso aparece" —
**deixou de valer no dia**: a FK entrou nos DOIS bancos (medido por REST com a
publishable key, HTTP 200 em `zwoainzzqhudmmknuycq` e em
`vgzomuwnsdgrxbkyoavq`). O "—" continua sendo a coisa certa, mas agora como
proteção contra a PRÓXIMA consulta que morrer, não contra esta.

### A superfície do painel segue o tema

O painel nascia com `#111827` cravado — azul-marinho — e `/equipe/board` resolve
`.sistema-theme`, que é GRAFITE: era cor de fora do sistema fingindo ser token.
Agora `--agente-surface` é `hsl(var(--surface-escura-2))`, o token que a casa já
tinha para cartão escuro, e os degraus internos são branco translúcido, para
seguirem o piso sozinhos. Contrastes medidos nos dois pisos possíveis estão no
comentário do `index.css`; o degrau 3 ficou em 8% e não 10% porque a 10% o
`--agente-ink3` sobre o grafite caía para 4,37.

---

## 2. Peças

### Banco (`supabase/migrations/20260821182647_agente_psa.sql`)

| Tabela | Papel |
| --- | --- |
| `agente_config` | Uma linha por escopo (aba). Prompt personalizado, modelo, temperatura, nível de acesso, máx. de insights, liga/desliga. |
| `agente_conversas` | Thread de um usuário num escopo, com os filtros ativos no início. |
| `agente_mensagens` | Turno + `campos_usados` (o que a resposta processou) + `metricas` (latência, modelo, confiança, lições aplicadas). |
| `agente_insights` | Um insight por linha — é o que torna "volume de insights gerados" mensurável sem varrer jsonb. |
| `agente_aprendizados` | **A memória.** Correção humana virada em lição; toda lição ativa volta no prompt daquele escopo. |

RLS habilitado nas cinco. **Nenhuma policy de INSERT, de propósito:** quem
escreve é o service role dentro da edge function. Se o navegador escrevesse, o
histórico de aprendizado seria adulterável e a métrica de insights não mediria
nada. Leitura: a própria conversa (ou tudo, para admin); lição é conhecimento da
casa e todo autenticado lê; curadoria de lição é do admin.

### Edge function (`supabase/functions/agente-psa/`)

`index.ts` (roteador + auth + persistência), `prompt.ts` (montagem — **funções
puras**, é onde mora a regra de honestidade), `ai.ts` (gateway da Lovable,
tool-calling), `tipos.ts` (contrato com a tela).

Ações: `chat`, `feedback`, `avaliar_insight`, `historico`, `cockpit`,
`salvar_config`.

Regras fixas no prompt (não configuráveis pelo admin, de propósito):
1. responder só sobre o CONTEXTO da tela;
2. dado ausente → dizer o que falta e onde se obtém, **nunca estimar**;
3. aviso de falha de carregamento → tratar como **desconhecido**, nunca zero;
4. respeitar a janela de cada bloco (o Estratégico tem duas);
5. insight sem número que o sustente não deve ser gerado.

### Front

| Arquivo | Papel |
| --- | --- |
| `src/hooks/useAgenteContexto.ts` | Contexto React + `useRegistrarContextoAgente` (a tela publica o snapshot). |
| `src/contexts/AgenteProvider.tsx` | Provider global no `App.tsx`. Renderiza o balão. |
| `src/lib/agenteContextoBoard.ts` | Snapshot do Board Estratégico. **Função pura, com testes.** |
| `src/lib/agenteApi.ts` | Desembrulha o corpo do erro que o `functions.invoke` descarta. |
| `src/hooks/useDomainAgentePsa.ts` | React Query sobre a edge function. Nenhum `supabase.from('agente_*')`. |
| `src/components/ui/ai-prompt-box.tsx` | Compositor (adaptado da referência de design). |
| `src/components/agente/` | Balão, painel, conversa, modos. |
| `src/hooks/useAgenteConversaController.ts` | A máquina de estado da conversa. Cópia única. |
| `src/components/agente/AgentePainelDecisao.tsx` | "Exige decisão" + avisos dentro do painel. |
| `src/components/acessos/AgenteTab.tsx` + `agente/` | Cockpit da aba Agente. |
| `src/index.css` | Tokens `--agente-*` e classes `.agente-*`. |

O Provider é global; **o balão não**. Ele só aparece onde alguma tela publicou
contexto — por isso não vaza para a home pública nem para o portal do cliente.

---

## 3. Os três modos

| Modo | O que muda |
| --- | --- |
| **Dados** | Leitura fiel: número + janela + nota. Sem recomendação. |
| **Estratégia** (padrão) | Cruza pelo menos dois blocos e diz o que implica em decisão. Todo insight cita o número que o sustenta. |
| **Corrigir** | O texto do usuário vira lição em `agente_aprendizados` **antes** da resposta de confirmação — assim a própria confirmação já sai sob a regra nova, e uma falha da IA depois disso não descarta o que foi ensinado. Só aparece quando existe resposta para corrigir. |

O lápis em cada resposta leva direto ao modo Corrigir apontando para aquela
mensagem.

---

## 4. Como ele aprende

1. Usuário corrige (modo Corrigir ou lápis na resposta).
2. `agente_aprendizados` recebe: pergunta original, resposta original, correção
   e a **lição** (nasce igual à correção — reescrever com IA aqui inventaria
   regra que ninguém disse).
3. Toda conversa seguinte **daquele escopo** recebe as lições ativas no system
   prompt, ordenadas por peso, com a instrução de que **valem mais que a
   inferência do modelo**.
4. Admin refina, repesa ou desliga em Digital > Acessos > Agente.

Sem fine-tuning e sem embedding, por escolha: uma regra errada aprendida em
produção precisa ser removível por uma pessoa, na hora, sem retreinar nada.

---

## 5. Cockpit (Digital > Acessos > Agente)

Na ordem em que a dúvida aparece:

1. **Está sendo usado?** — perguntas, respostas, pessoas, latência média, por escopo.
2. **Sobre o que ele responde?** — ranking dos campos do snapshot que
   sustentaram as respostas (`campos_usados`, declarado pela própria resposta).
   Campo que nunca aparece é candidato a sair da tela; campo que aparece sempre
   merece subir nela.
3. **Como se comporta?** — configuração: ativo, rótulo, nível de acesso, modelo,
   temperatura, máx. de insights e **personalização do prompt**.
4. **O que já aprendeu?** — histórico de correções, com peso, liga/desliga e o
   rastro de onde cada lição nasceu.

Mais: insights por categoria, úteis x descartados, distribuição por modo e
contagem de respostas com **confiança baixa** — cada uma é pista de um campo
faltando no snapshot.

A varredura tem teto (3000 registros por janela); ao bater no teto a aba diz que
o número é piso, não total.

---

## 6. PENDENTE — o que falta para ir ao ar

### 6.0 Por que a IA não é testável no sandbox

O `LOVABLE_API_KEY` é **gerado e gerenciado pelo Lovable por projeto**, e a
documentação deles diz que **não existe caminho oficial para obtê-lo fora de um
projeto gerenciado por eles** — para chamar IA fora, mandam usar chave própria
de outro fornecedor. Consequência prática, medida em 25/08:

- **produção** é Lovable Cloud: a chave existe sozinha, como nas outras funções
  de IA da casa (`gerar-sintese-executiva`);
- **sandbox** é um projeto Supabase comum: a chave não existe e não há como
  copiar dela. Tudo o mais do agente roda em dev — painel, alertas, cockpit,
  nível de acesso, mensagens de erro —, **menos a resposta em si**.

Chegou a existir um segundo caminho no `ai.ts` (OpenRouter, escolhido pela chave
presente no ambiente) para destravar o teste em dev. Foi **revertido em 25/08**,
por decisão da usuária: validar direto no Lovable é mais simples do que manter
dois provedores por causa de um ambiente. Se um dia o teste em dev voltar a ser
necessário, o caminho é esse — e o custo medido no dia era de cerca de
US$ 0,0005 por pergunta com um modelo `flash-lite`.

### 6.1 Migration — APLICADA nos dois bancos (25/08)

Deixou de ser bloqueio. Estado medido por REST em 25/08, nos dois projetos:

| | sandbox `vgzomuwn…` | produção `zwoainzz…` |
| --- | --- | --- |
| 7 tabelas `agente_*` | ✅ HTTP 200 | ✅ HTTP 200 |
| 18 escopos em `agente_config` | ✅ | (semeados pela migration) |
| função `agente-psa` | ✅ HTTP 401 (no ar) | ⏳ 404 — sobe com o merge |

Como cada um foi aplicado, porque os caminhos foram diferentes:

- **Sandbox:** `supabase db query -f <arquivo>`, um por vez, com o CLI via
  `npx supabase@latest` (a máquina não tem o CLI instalado; o `npx` resolve sem
  tocar no `package.json` nem no `bun.lock`). **`db push` não serve aqui**: o
  `config.toml` aponta para produção e o push arrastaria tudo o que estivesse
  pendente — na medição do dia, 26 arquivos, incluindo mudança de RLS à espera
  de decisão. Além disso, o histórico de migrations do sandbox tinha 22 versões
  sem arquivo correspondente no repo (vindas do bot do Lovable), e o `push`
  exigia marcá-las como revertidas para prosseguir.
- **Produção:** passo humano, pelo chat do Lovable, como manda o AGENTS.md.

**Consequência de `db query`:** as versões **não** ficam registradas em
`supabase_migrations.schema_migrations` do sandbox. O schema está lá, o registro
não — e a tabela já não era registro confiável antes (ver AGENTS.md). Confira o
schema, nunca a tabela.

**O front não depende do `types.ts`.** Tudo passa pela edge function,
exatamente para o código não ficar preso ao ciclo de regeneração — foi o que
permitiu compilar, buildar e commitar durante os quatro dias em que as tabelas
não existiam em banco nenhum.

**O que falta para o agente responder em produção:** o merge do PR #65. O
Lovable sincroniza da `main` e sobe a função junto; o `LOVABLE_API_KEY` já
existe lá (é o mesmo que a `gerar-sintese-executiva` usa).

### 6.2 Validado com dado real em produção (25/08)

A função subiu em produção pelo chat do Lovable — **merge no GitHub não publica
edge function**, e não há workflow que o faça (o único é a CI). Confirmado do
lado de fora: `POST` sem token devolve `401 {"error":"Não autenticado."}`, a
mensagem em português do próprio código, o que prova que a build no ar é esta.

**O que passou:**

- **Não inventou número.** Cada valor citado numa pergunta de concentração
  ("R$ 197,8 mi", "99,1%", "46 clientes", "99,5% nos 5 maiores") mapeia num
  campo do snapshot. Ele cita, não estima.
- **Cruzou blocos.** Para sustentar uma suspeita de cadastro, trouxe "29 OS sem
  data de início" e "86 clientes sem categoria" do bloco de Preenchimento —
  outro bloco, não o da pergunta.
- **O ciclo de aprendizado fecha de ponta a ponta.** Uma correção real ("concentração
  acima de 90% num cliente é quase sempre erro de cadastro na PSA") foi
  confirmada em forma imperativa, **aplicada na mesma resposta**, persistida em
  `agente_aprendizados` e visível no cockpit com o rastro de onde veio.
- **A curadoria não era enfeite.** Na PRIMEIRA lição real, o texto colado trazia
  junto uma frase de conversa que não era regra. O campo editável do cockpit
  resolveu. É o custo consciente de guardar a correção em texto do usuário, sem
  IA reescrevendo: uma IA "melhorando" a frase inventaria regra que ninguém
  disse; em troca, às vezes uma pessoa apara.

**O que ainda não foi visto:**

- **A pergunta que a tela NÃO responde** ("qual o custo dos projetos?"). É a
  prova de fogo da regra nº2 do prompt — dizer o que falta em vez de estimar.
- ~~**Categorias frouxas.**~~ **CORRIGIDO em 25/08.** O insight sobre cadastro
  incompleto saiu como "Execução" três vezes seguidas. O enum não tinha
  descrição nenhuma — o nome do valor não ensina onde termina um e começa o
  outro. Cada valor ganhou descrição no `ai.ts`, com "dado" explicitamente
  definido como *qualidade do número, não o que o número diz*. **Só tem efeito
  depois de a função ser redeployada pelo Lovable.**
- **O teto de contexto** (24k caracteres). `serializarContexto` avisa no prompt
  quando corta, mas ninguém mediu se o Estratégico chega perto.
- **Antes do agente, um dado a conferir:** 99,1% da receita num só cliente
  (R$ 196 mi). Ou é real, ou é erro de cadastro — e foi isso que originou a
  primeira lição.

### 6.2.1 Telas que publicam snapshot — as 18, desde 25/08

Todas as telas do Board publicam. O agente existe em todas elas pela rota, e
agora conversa sobre números em todas.

| escopo | tela | snapshot |
| --- | --- | --- |
| `board.estrategico` | Estratégico | `agenteContextoBoard.ts` |
| `board.projetos` | Projetos | `agenteContextoProjetos.ts` |
| `board.clientes` | Clientes | `agenteContextoClientes.ts` |
| `board.ferramentas` | Ferramentas | `agenteContextoFerramentas.ts` |
| `board.capacidade` | Capacidade | `agenteContextoCapacidade.ts` |
| `board.operacional` | Operacional | `agenteContextoOperacional.ts` |
| `board.logs` | Logs da equipe | `agenteContextoLogs.ts` |
| `board.chamados` | Chamados | `agenteContextoChamados.ts` |
| `board.dashboards` | Dashboards (Looker) | `agenteContextoDashboards.ts` |
| `board.desempenho` | Desempenho · Visão geral | `agenteContextoDesempenho.ts` |
| `board.desempenho.decisoes` | Desempenho · Decisões | idem |
| `board.desempenho.ciclos` | Ciclos | `agenteContextoDesempenhoTelas.ts` |
| `board.desempenho.metas` | Metas e PPR | idem |
| `board.desempenho.relatorios` | Relatórios | idem |
| `board.desempenho.evolucao` | Evolução | idem |
| `board.desempenho.feedbacks` | Feedbacks | idem |
| `board.desempenho.1a1` | 1:1s | idem |
| `board.desempenho.minha-evolucao` | Minha evolução | idem |

**Ligar uma tela é:** uma função pura em `src/lib/` com testes +
`useRegistrarContextoAgente` na página. Nada no agente muda, nada no banco muda.

Três padrões que valem para a próxima:

1. **Conteúdo reaproveitado recebe o escopo por PROP, com default vazio.**
   `DashboardClientesOsContent` (Projetos), `AreaDashboardContent` (Capacidade) e
   `ChamadosGestaoContent` (Chamados) rodam também na Gerencial da Tax e da OSG.
   Publicar direto faria o agente responder "Board · ..." nas outras áreas —
   mesmo número, tela errada.
2. **O filtro da tela tem que vir da MESMA fonte que a tela lê.** Em Logs, o
   período mora na URL (`useAuditPeriodo`); ler um período próprio faria o
   agente responder sobre uma janela e a tela mostrar outra.
3. **Objeto literal em dependência de `useMemo` fura a memoização.** Aconteceu
   duas vezes (`TIPO_OPTIONS` em Projetos, `stats` em Chamados): identidade nova
   a cada render, snapshot recalculado sempre.

**Duas telas exigiram decisão de conteúdo, não de código:**

- **Logs** publica CONTAGEM DE REGISTRO, não as colunas derivadas das abas
  ("processos executados" tem regra própria e depende de mapas que a aba monta).
  Reproduzir seria uma segunda implementação da mesma regra, e no dia em que uma
  mudasse, tela e agente discordariam sobre a mesma pessoa.
- **Dashboards** é `iframe` do Looker: o número não está no app. O snapshot
  existe para o agente saber DIZER ISSO com precisão — lista os relatórios
  liberados e afirma que não lê o conteúdo — em vez de responder "esta tela não
  publica números", que soa como defeito.

**E uma regra de privacidade para as sete telas de Desempenho:** nenhum snapshot
leva texto de feedback, tema de 1:1 ou comentário de líder. Só contagem e
estado. O agente pode dizer "há 4 feedbacks que a pessoa ainda não pode ler";
não pode recitar o que alguém escreveu sobre outra pessoa. O painel é lido em
reunião, com a tela compartilhada.

### 6.3 Fora do escopo desta entrega

- **Áudio e anexo.** A referência de design trazia microfone e clipe; não
  entraram porque não existe transcrição nem visão no caminho de dados. Botão
  que não faz nada é pior que botão ausente.
- **Streaming da resposta** (hoje espera o turno inteiro).
- **Outras abas.** Cada uma entra publicando o seu snapshot + uma linha em
  `agente_config`. Candidatas naturais: Board > Projetos, Board > Clientes,
  OSG Gerencial.
