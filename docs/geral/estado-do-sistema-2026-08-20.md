# Estado do sistema — 20/08/2026

Documento de passagem. Serve para três coisas: retomar noutro dia, entregar ao Bernardo, ou
salvar no repositório (sugestão: `docs/geral/estado-do-sistema-2026-08-20.md`).

Escrito para ser lido por alguém que não estava na conversa.

> **Arquivado em 21/08/2026.** Ao salvar, remedi as contagens da seção 7 e **três estavam fora
> de escopo** — a dívida do teal (9 → 164), o total de cor crua de estado (947 → 1.190) e a
> razão do papel `sucesso`. A terceira **muda a conclusão**: o pior papel é alerta, não sucesso.
> As correções estão marcadas no lugar, não escondidas aqui. É a seção 8 aplicada ao próprio
> documento.

---

## 0. Para retomar a cor amanhã — o atalho

Se a sessão de amanhã é sobre cor, o caminho curto é este. O resto do documento é contexto.

**As duas comparações renderizadas** (feitas para decidir olhando, não por número):

Estão **no repositório**, em `docs/geral/comparacoes-de-cor/` — abra no navegador, são
autocontidas. As URLs publicadas existem também, mas o arquivo é a copia que não depende de
link resolver.

- `cinza-de-desligado.html` — o cinza de desligado acompanha o tema ou fica neutro em todos?
  Decidido: **acompanha**, com `--status-neutro` que já existia. Nenhum token novo.
  (também em https://claude.ai/code/artifact/3f78cf45-6525-4e1b-a39f-83086069db30)
- `vermelho-de-excluir.html` — o par `destructive` dá 3,62:1; quais saídas passam em 4,5:1?
  Decidido: **opção A**, `--destructive` a `0 84% 48%`. Aplicado.
  (também em https://claude.ai/code/artifact/b45f3470-f08a-4b2e-a359-2c7d71bf29ad)

⚠️ Os valores dentro desses arquivos são de 20/08 e **não se atualizam**. A fonte corrente é
sempre o `index.css`.

**A tabela de mapeamento** (cor crua → token) está em `docs/geral/decisoes-tema-e-cor.md`,
seção 2.1, com as nove linhas e a regra de decisão para o caso de estado. **Ela é o primeiro
lugar a abrir** — foi escrita porque a regra viveu semanas em conversa e se aplicava diferente
a cada vez.

**Onde olhar na tela** (`bun run dev`, porta 8083):

| o que | onde |
|---|---|
| a bancada Produtos & Serviços | `/equipe/acessos` → aba Produtos & Serviços |
| a árvore de permissões densa (contorno de checkbox agora no tema) | `/equipe/acessos` → aba Usuários → clique num usuário |
| o vermelho novo, em botão | `/equipe/acessos` → aba Dashboards → lixeira num cartão |
| o vermelho novo, em texto de erro (o ganho maior, 227 sítios) | aba Usuários → "Criar Novo Usuário" → salvar com e-mail vazio |
| o badge de estado desligado | aba Dashboards → um dashboard inativo |
| o tema por área, para ver token respondendo | `/equipe/tax/...` (teal) contra `/equipe/osg/...` (musgo) |

**A próxima decisão de cor**, e é pequena: a tabela ainda não tem linha para **borda de
controle**. As sete sobrescritas de checkbox que a motivavam foram removidas em 21/08 (voltaram
ao `border-primary` do `ui/`), então a lacuna deixou de ter sítio — mas ela reaparece no
primeiro controle que alguém quiser neutralizar. `--input` e `--border` valem o mesmo
`(229,231,235)`, o que significa que hoje **não existe** token de borda de controle distinto
de borda de superfície.

---

## 1. O que este dia foi

Um dia inteiro de **fechar**, não de abrir. O pedido que organizou tudo foi dela:

> *"pelo menos p gente poder finalizar algo e ter um plano de etapas pois a gente via tentar
> concertar tudo e nao finalizar nada"*

E a regra que veio junto:

> *"concordo em finalizar os q ja estao aberto, mas nao ficar abrindo demanda nova so salvar na
> fila para proximo"*

Treze coisas fecharam. A fila cresceu de propósito — achado vira linha registrada, não desvio.

---

## 2. Quem faz o quê

Três partes, e confundi-las causa erro:

| parte | o que faz | o que NÃO faz |
|---|---|---|
| **Claude na conversa** | mede, analisa, escreve prompts | não edita o repositório |
| **Agente do repositório** | edita, testa, commita | não alcança produção |
| **Lovable** | único caminho até o banco de produção | não vê a branch `develop` |

Acessos diretos da conversa: o navegador em `localhost:8083`, e o Supabase MCP — que aponta para
o banco de **dev** (`vgzomuwnsdgrxbkyoavq`), **não** para produção.

Branch de trabalho: `develop`. Produção: `main`.

---

## 3. Restrições permanentes

- **RLS não se toca.** *"rls nao é p mexer / pq ja ta tudo arrumandinho / cada usuario tem o seu
  papel no sistema"*. Nenhuma política, papel ou permissão muda sem decisão explícita dela, com o
  efeito por papel na mesa.
- **Não ampliar o que um admin pode conceder** sem aprovação dela.
- **Produção só por passo humano**, pelo chat do Lovable.
- **Não abrir demanda nova.** Achado vira linha de fila.

---

## 4. O sistema, em resumo

React + React Router · Tailwind + shadcn/ui + Radix · CVA · Supabase · Vitest · ESLint.
299 arquivos de teste, 3.535 testes.

### Tema por ambiente

- `.base-theme` é o piso: contrato completo (hoje **46** variáveis), cor de marca teal.
- Por cima vem **uma** classe de área, no mesmo `<html>`, mesma especificidade — **a ordem no
  `index.css` decide**, e `.base-theme` vem primeiro.
- Temas **congelados** (`tax`, `osg`, `rotina`) declaram as 46. Tema **delta** (`sistema`) declara
  só as 9 que diferem.
- Rota não mapeada herda a cor de marca, nunca cinza. A falha segura vai para o lado da marca.
- A resolução de tema fica **acima dos portões de autenticação** — `LiderRoute` retornava `null`
  enquanto o papel carregava, o layout não montava, e o tema nunca aplicava.

Valores medidos (não deduzir, não inventar):

```
--primary      175 82% 29%   #0D877C   base, tax, rotina
--primary      149 66% 22%             osg (musgo)
--primary       35 10% 26%             sistema (grafite quente)
--foreground    20 81% 10%   #2E1305   marrom quente — intencional
--destructive    0 84% 48%   #E11414   alterado em 20/08 (era 0 84% 60%)
```

O `:root` mantém `--destructive` em 60% de propósito: nenhuma rota o alcança, e mexer nele
alargaria o raio sem mudar pixel. Mesma divergência deliberada que já existe no `--ring`.

### Espelhamento

Uma rota só, contexto no query param `?area=`. A mesma chave de categoria de página resolve
**tema (síncrono) e filtro de cluster (assíncrono)**, para cor e conteúdo não poderem divergir.
`/equipe/chamados` é o caso vivo; `VOLTA_DO_ESPELHO` cuida do botão Voltar.

Três níveis: carregado → escopo (espelho) → filtros do usuário. **Cartões de estatística vivem no
nível 2** — foi defeito real mostrarem 354 numa tela de escopo vazio.

Arquivos-chave: `src/lib/areaTheme.ts`, `src/components/AreaThemeProvider.tsx`, `src/index.css`.

### O Board é a exceção declarada

É o único lugar onde rodar **sem escopo** é legítimo: é o consolidado da empresa, e cor de
infraestrutura sobre lista de todas as áreas é par coerente. Está em `SEM_ESCOPO_DE_PROPOSITO`
(`areaTheme.test.ts:576`) — um invólucro novo sem escopo reprova o build.

### Dois bancos, e eles divergem

| | dev | produção |
|---|---|---|
| alcance | Supabase MCP, `localhost:8083` | só pelo Lovable |
| áreas | 10 | **11** — "Adm & Fin" ativa só lá |
| `color_index` | `NOT NULL` | aceita nulo, **de propósito** |

O `NOT NULL` ficou de fora em produção porque o código da `main` insere área sem essa coluna — o
`INSERT` falharia. Vira `NOT NULL` quando o código novo subir.

**A comparação completa dos dois esquemas nunca foi feita.** É item de fila, e as três migrações
aplicadas por engano em 20/08 (§7) são sintoma disso.

### Regras de lint em vigor

| regra | avisos | o que pega |
|---|---|---|
| teal cru | 9 | `teal-500\|600\|700` |
| `ui/token-nao-sobrescrito` | **306** | cor crua sobre a **mesma propriedade** que um componente do `ui/` já traz tokenizada |

A segunda é regra própria, em `eslint-rules/`, modo `warn`. **Tem teste que reconstrói o mapa a
partir de `src/components/ui/`** — se alguém mexer num componente e o mapa não acompanhar, quebra.
Sem isso a regra viraria o próprio defeito que ela existe para pegar.

### A tabela de mapeamento saiu da conversa

Até 20/08 ela existia só dentro de prompts, e por isso era aplicada um pouco diferente a cada vez.
Agora está em **`docs/geral/decisoes-tema-e-cor.md`**, com nove linhas e a regra de decisão:

> Se trocar aquele fundo por `bg-muted` faria a pessoa perder a informação de que o item está
> fora, é **papel de status**. Se não faria diferença além do tom, é **superfície**.

---

## 5. O que fechou em 20/08 — não reabrir

| # | o quê | resultado |
|---|---|---|
| 1 | Commits pendentes | 12 empurrados; seletor de Cluster da gestão travado de verdade (`disabled={!!escopo}`, e não existe "Limpar filtros" nessa tela) |
| 2 | Produtos & Serviços | aprovada em uso real — era a tela que originou toda a sequência |
| 3 | Controle de Acessos | **259 de 295** cores cruas migradas, 12 commits, os 4 diálogos conferidos |
| 4 | Chamados | **fechada sem trabalho** — verificada, não sobrou nada |
| 5 | `color_index` em produção | coluna, função, gatilho, 11 áreas com slot, zero sem |
| 6 | Regra `ui/token-nao-sobrescrito` | criada, com teste que reconstrói o mapa; modo `warn` |
| 7 | Os 3 piores arquivos | 102 → 0; total do sistema **416 → 306** |
| 8 | Tokens de cor de estado | contrato 43 → 46, teste travando o par, 6 sítios migrados |
| 9 | A tabela de mapeamento | escrita no repositório |
| 10 | Contraste do destrutivo | botão 3,62 → 4,66 **e 227 sítios de texto de erro 3,77 → 4,85** |
| 11 | As 7 exceções de checkbox | sobrescrita removida — as exceções da Etapa 2 vão a **zero** |
| 12 | `dark:` do módulo Dev | 591 classes em 46 arquivos apagadas, 5 commits |
| 13 | Código morto | `CTA.tsx`, o export default de `GestaoChamados.tsx`, 20 `dark:` fora do Dev |

**O maior ganho do dia não estava planejado.** Ao pedir "o que mais essa mudança toca além do
botão", apareceu que `text-destructive` sobre fundo claro estava em 3,77:1 — abaixo do mínimo de
legibilidade — em **227 sítios**, que é todo texto de erro do sistema. O botão eram 36. Ninguém
tinha medido.

Comparações renderizadas geradas no dia:

- contraste do destrutivo — https://claude.ai/code/artifact/b45f3470-f08a-4b2e-a359-2c7d71bf29ad
- estado "desligado" nos três temas — https://claude.ai/code/artifact/3f78cf45-6525-4e1b-a39f-83086069db30

---

## 6. Os 23 componentes órfãos — a conversa com o Alexandre

Verificados **por caminho**, não por símbolo (busca por símbolo não pega `import` default
renomeado). **3.736 linhas.** Nada foi apagado.

Três falsos positivos já removidos da lista: `ThEstatico`, `ReviewRichTextContent`,
`DefaultAreaLoader`. Mais `TestProviders`, que é infraestrutura de teste usada por 20 arquivos.

| linhas | símbolo | onde |
|---|---|---|
| 451 | `EquipeUsuarios` | `pages/equipe/` |
| 379 | `SeletorEtapasOrigem` | `components/equipe/mapa/` |
| 355 | `IbsCbsAuditModal` | `components/equipe/dev/` |
| 355 | `DevFilterFormPattern` | `components/equipe/dev/` |
| 348 | `AdminUsuarios` | `pages/administracao/` |
| 309 | `GerarDemandasDialog` | `components/sprint/` |
| 294 | `SituacaoFormModal` | `components/equipe/dev/perdcomp/` |
| 294 | `EquipeDemandas` | `pages/equipe/` — **1 teste importa** |
| 141 | `AdminPerformance` | `pages/administracao/` |
| ~140 | `WizardRoi` | **1 teste importa** |
| 132 | `ProjectCard` | `components/equipe/mapa/` |
| 82 | `DemandaAlertCards` | `components/equipe/fiscal/` |
| 72 | `LocationsSection` | `components/` |
| 71 | `DailyTaskPicker` | `components/equipe/daily/` |
| 65 | `TestimonialsSection` | `components/` |
| 61 | `GroupedTasks` | `components/sprint/` |
| 58 | `GrupoAccordion` | `components/equipe/mapa/` |
| 53 | `TimelineSection` | `components/` |
| 19 | `SectionTransition` | `components/` |
| 19 | `FixosDashboard` | `pages/equipe/fixos/` |
| 16 | `PageLoader` | `components/` |
| — | `AdminAcessos` · `FiscalDemandasClientes` | `pages/administracao/` · `components/equipe/fiscal/` |

Três agrupamentos que a conversa deveria tratar em bloco:

- **`pages/administracao/` inteiro** — 4 arquivos, 553 linhas. Área administrativa aparentemente
  superada.
- **Quatro seções do site institucional** — `LocationsSection`, `TestimonialsSection`,
  `TimelineSection`, `SectionTransition`, 209 linhas. Mesmo lote do `CTA.tsx` que já saiu.
- **Cinco de `equipe/mapa/`**.

**Os dois casos com custo colateral:** `EquipeDemandas` e `WizardRoi` têm um teste cada. São
mortos em produção e vivos no teste — o teste é o único vestígio de que alguém já os quis.
Apagar o componente apaga o teste junto.

**A pergunta para o Alexandre é humana, não técnica:** algum destes é trabalho que você está
prestes a ligar, ou é tudo superado?

### E a dívida NÃO está no código morto

Medido: das 306 regressões, **2** estão em órfãos (0,7%). Das 947 cores cruas de estado, **39**
(4,1%). As duas listas são quase disjuntas.

Isso responde a pergunta que motivou a medição: **apagar os órfãos não desconta a dívida de cor.**
As duas coisas podem ser decididas de forma independente, e nenhuma bloqueia a outra.

---

## 7. A fila — nada aqui está em andamento

Nenhum item vira trabalho sem passar pela regra do §8.

### Banco

| item | endereço |
|---|---|
| migrações de `color_index` não existem como arquivo | aplicadas direto no banco; gravar em `supabase/migrations/` |
| `color_index` vira `NOT NULL` | quando o código novo subir |
| comparar esquema dev × produção | **não é possível daqui** — precisa de acesso aos dois bancos; as consultas prontas estão em `levantamentos-2026-08-21.md`, seção 3 |
| **três migrações de tarefas/RLS aplicadas em produção sem decisão** | inclui troca de `rls_org_tasks_insert` — ver abaixo |

**Sobre a troca de RLS**, porque é o item mais delicado da fila: em 20/08 uma mensagem montada
para o Lovable trocou de assunto e aplicou três migrações de tarefas/chamados na produção. Uma
delas substituiu a política `rls_org_tasks_insert`.

A mudança é **estreita**: permite criar **subtarefa** de tarefa que a pessoa **já enxerga**; não
abre tarefa de topo, não abre visibilidade. Ainda assim é mudança de permissão que ela não
escolheu.

O que falta antes de decidir reverter ou manter: o `WITH CHECK` da política anterior (está no
histórico de `supabase/migrations/`) e a diferença expressa **por papel** — *existe algum INSERT
que a nova permite e a antiga não, além de subtarefa de tarefa já visível?*

**Não reverter sem esse levantamento.**

> **LEVANTADO em 21/08/2026** — `docs/geral/levantamentos-2026-08-21.md`, seção 1. A resposta é
> **não**: a política nova é puramente aditiva (os três ramos antigos idênticos), o guardrail
> `org_task_visivel` é literalmente o `USING` do `SELECT`, e o ramo novo atinge **só os 15
> `team_member`** — `client` (33) e `marketing` (1) não têm nenhuma `org_task` em nenhum dos três
> papéis, então é inalcançável para eles. E o ramo novo concede **menos** que o
> `assigned_to = auth.uid()` que já vigorava, porque aquele permitia criar tarefa **de topo**.
> O delta inteiro: subtarefa **sem responsável** sob tarefa já visível. **Sobra decisão, não
> medição.**

### Chamado → tarefa

O gatilho `trg_tickets_gera_tarefa` está **ativo em produção**: delegar chamado cria tarefa no
projeto de Canal de Chamados do cliente. **A função é desejada** — ela confirmou. O que falta é a
tela: identificar a tarefa como vinda de chamado e linkar para o chamado. Escopo escolhido: **só o
link mínimo.**

Ponto aberto que valia medir antes de construir: **quantos clientes têm projeto de Canal de
Chamados?** Sem esse projeto, delegar não gera tarefa e ninguém é avisado — o gatilho grava
`RAISE WARNING` no log e segue. Falha silenciosa. Se for raro, é linha de fila; se for comum, é o
problema principal.

> **MEDIDO em 21/08/2026** — `levantamentos-2026-08-21.md`, seção 2. **É comum: 6 dos 11 clientes
> com chamado não têm canal (55%).** Pelo critério acima, é o problema principal e não linha de
> fila. Mas a incidência é mínima — **1 falha silenciosa em 4 delegações** desde que o gatilho
> existe, porque delegar é raro. Não é incêndio; é armadilha aberta. E o número é do **dev**: em
> produção o dado é outro.
>
> Dois achados que a fila não previa: existe **1 só** produto marcado `is_canal_chamados`, e a
> função tem um **segundo** aviso invisível — cliente com mais de um canal usa o mais antigo e
> grava `raise warning`.

### Cor

> **Escopo de todas as contagens desta seção**, remedidas em 21/08/2026 ao arquivar este
> documento: `src/**/*.tsx`, **excluindo** `src/components/ui/` (dono do padrão) e arquivos de
> teste. Escopo diferente dá número diferente — foi o que aconteceu com dois números da versão
> original, corrigidos abaixo.

| item | número |
|---|---|
| regressões restantes | 306 — cercadas pela regra em `warn`; caem quando alguém tocar o arquivo |
| cores cruas de estado | **1.190 — e a inversão é o achado** |
| composições cruas nos 3 arquivos limpos | ~156; propriedade que o componente não traz, **não** é regressão |
| regressões nos compartilhados do Acessos | 27 (`NewClientModal` + subárvore `client-form`, 5 rotas) |
| dívida do teal | **164 avisos em 48 arquivos** (195 ocorrências) |
| `dark:` fora do Dev | 1 (`ui/alert.tsx`, shadcn vendorizado — divergir do upstream custa mais que vale) |
| `--status-fila` para "planejado" | `DesempenhoCiclos:24`, papel diferente |

**A inversão das cores de estado** é a parte acionável, e não é o total:

| papel | token | cor crua | famílias contadas | razão |
|---|---|---|---|---|
| destrutivo | **392** | 263 | `red`, `rose` | **1,49 : 1 a favor do token** |
| alerta | 42 | **402** | `amber`, `yellow`, `orange` | **1 : 10 contra** |
| sucesso | 38 | 278 | `green`, `emerald`, `lime` | **1 : 7 contra** |
| *(teal, dívida própria)* | — | 247 | `teal` | tem regra de lint dedicada |

Destrutivo **já venceu** — provavelmente porque o `ui/button` tem variante `destructive` e ela
puxou o resto. Alerta e sucesso **nunca começaram**. Não é uma dívida de 1.190 espalhada por
igual: são **dois papéis inteiros** que ficaram de fora. E o exemplo do destrutivo diz qual
alavanca funcionou: **um componente do `ui/` com a variante certa**, não uma varredura.

> **Correção que muda a conclusão da versão original.** Ela dava sucesso como o pior papel
> (1 : 15) porque contava `teal` dentro de sucesso. `teal` **não é cor de sucesso** — é a
> primitiva institucional, tem dívida própria e regra de lint própria. Tirando-a da conta,
> **o pior papel é ALERTA (1 : 10), não sucesso (1 : 7)**. Quem for atacar um papel só ataca
> `--warning`, e a diferença entre os dois não é grande: 402 contra 278.

### Outros

| item | endereço |
|---|---|
| `ChamadosGestaoContent` sem teste de comportamento | 780 linhas, sem harness |
| grant que não abre porta | `LiderRoute` bloqueia 13/25, 10/19, 2/6 |
| 19 chamados sem cluster | invisíveis em todo espelho; 64 de 299 clientes os produzem |
| canal de chamados internos | confirmado inexistente; futuro declarado pela dona |
| **o Board** | segundo design system inteiro; plano em `plano-board.md`; começa matando o `v3`, que é CSS morto |
| ambientes novos | Prado, PSA Auditores, Adm & Fin — o gatilho é a **primeira tela existir**, não o cluster existir |

---

## 8. Como trabalhar — as regras que custaram caro

### Verificar antes de virar tarefa

Nenhum item da fila vira trabalho sem alguém medir se ele ainda existe. A etapa de chamados fechou
com **zero conserto**: dos três itens registrados, dois descreviam código que tinha mudado horas
antes e o terceiro nunca existiu do jeito descrito.

### Saber o que se está medindo é parte de verificar

Medi o banco de dev achando que era produção e conclui que três migrações já estavam aplicadas.
Não estavam. A medição veio com números, coluna, gatilho — parecia prova. **Medição no lugar
errado é pior que nenhuma, porque convence.**

Aconteceu de novo em outra escala: contei 176 regressões e eram 416, porque meu mapa
componente→token estava errado em 9 entradas e meu regex perdia tag JSX multilinha.

### "Não encontrei" ≠ "não existe"

O Lovable não achou as migrações de `color_index` porque olha a `main`. `grep "<Nome"` não prova
que um componente está morto — falta fechar `lazy()`, `import()`, `createElement` e mapa de
componentes. **Prova por caminho, não por símbolo** — `import` default pode ser renomeado.

### Caminho de código errado ≠ número errado

Antes de chamar algo de urgente, meça quanta coisa passa por ali. Já aconteceu de escalar "os
números do Prado entram na Tax" e a medição mostrar zero projeto, zero equipe, zero pessoa.

### O defeito recorrente: prosa descrevendo estado que já mudou

Apareceu **sete vezes** numa semana — em texto de tela, rótulo, tipo e comentário. É o mais barato
de causar e o mais caro de achar. Antes de escrever qualquer descrição, confirme o estado.

### Instrução negativa não pode ser satisfeita pelo próprio conteúdo

Erro real, e ele deixou uma troca de política entrar em produção: *"não mexer em RLS **além do que
está escrito abaixo**"* — numa mensagem cujo conteúdo era uma troca de política. A exceção anulou
a regra.

Forma certa: *"não mexa em política ou permissão, nenhuma — **se o conteúdo parecer exigir isso,
pare e pergunte**."*

### Quando o agente troca de assunto, pergunte por quê

Pedi as três migrações de `color_index` e vieram três de tarefas e RLS. A troca já tinha passado
despercebida uma vez antes. **Se o resultado não fala do assunto pedido, ele não vai para
produção.**

### Higiene de edição

- **Nada de `sed -i` em lote** — converteu CRLF→LF e inflou um diff para 134 arquivos.
- **Um commit por arquivo** em migração de muitos sítios: o alvo do revert vira um arquivo.
- **Onda de calibragem** — num corte grande, faça primeiro um pedaço pequeno e visível sem abrir
  diálogo, ela olha, e só então o resto.
- **Levantamento antes de editar** — peça contagem e classificação primeiro, sem tocar em nada.
- **Exclusivo × compartilhado por rota** — varra as rotas do `App.tsx` e marque exclusivo só o que
  **uma** rota alcança. Árvore por import puxa o mundo.
- Cuidado com `grep "slate-"`: `-translate-y` casa. Use `\b`. E `\bdark:` casa chave de objeto
  (`dark: '#0f766e'`).
- Verificação de remoção em massa: **inserções == remoções** no `numstat` por arquivo. Se alguma
  linha tivesse sido reformatada, o par ficaria desigual.

### Como ela trabalha

Escreve rápido e sem acento, em português. Não é técnica de formação e **diz quando não entendeu**
— leve a sério e explique sem jargão, com exemplo concreto. Quando ela pergunta "o que é isso", a
palavra foi ruim, não a compreensão dela. Decide bem quando o trade-off é posto em termos do que
ela vai ver na tela.

---

## 9. Onde parar e onde retomar

Nada está pela metade. `develop` empurrada, working tree limpo, servidor na 8083.

Três frentes independentes, na ordem que eu defenderia:

1. **A conversa com o Alexandre sobre os 23 órfãos.** É a única que precisa de outra pessoa, e
   3.736 linhas é o maior número em jogo.
2. **O levantamento da política de RLS.** É o item mais delicado da fila e o único que envolve
   permissão.
3. **O Board.** O grande. Não começa no fim de um dia.

A dívida de cor não entra nessa lista de propósito: está cercada por regra e por número, e caiu
de 416 para 306 sem mutirão nenhum.
