# TAREFAS — Área do Cliente: documentos por temática

Lista pronta para virar entregável na Sprint 10. **5 tarefas-mãe, 20 subtarefas, ~66h.**

> **Comece pela Tarefa 0.** É a de maior retorno por linha alterada, e as subtarefas 0.1 e 0.2 não dependem de nenhuma outra — dão para subir hoje e já consertam o pior do sintoma (o cliente cai numa lista de chamados vazia enquanto 35 documentos esperam na aba ao lado, sem sinal nenhum).

- Cada **Título** abaixo é uma tarefa-mãe; cada **subtarefa** é um filho dela.
- O "por quê" de cada decisão está em [`TAREFA_area-cliente_documentos-por-tematica.md`](TAREFA_area-cliente_documentos-por-tematica.md). Aqui é só o que fazer.
- Tabela no formato do importador (`Importar Sprint do Excel`) no fim do arquivo.
- **Estimativas são chute inicial** — ajustar com quem for executar.

**Pré-requisito de todas:** ler a "Regra de fronteira" da tarefa explicativa. `obrigatorio`, `modulo`, `origem` e `confidencial` são classificação **interna** e nunca aparecem na tela do cliente.

---

## Tarefa 0 — Entrada do cliente: cair no lugar certo ⭐ PRIORIDADE

**Descrição:** Hoje o cliente entra em `/cliente` e cai na aba **Chamados** (`ClienteDashboard.tsx:154`, `defaultValue="chamados"`). Um cliente novo vê ali uma **lista de chamados vazia com barra de filtros** — enquanto 35 solicitações de documento esperam na aba ao lado, **sem nenhum sinal na interface**. Nada indica que há trabalho pendente.

Contagem de cliques até o seletor de arquivo hoje:

```
cai em Chamados → aba Documentos → card da entidade → modal abre → "Enviar" → seletor
                       1                  2              3            4
```

**Quatro cliques antes de escolher o arquivo.** O alvo é **um**. Esta tarefa é a de maior retorno por linha alterada de todo o lote, e as duas primeiras subtarefas **não dependem de nada** — dão para subir hoje.

**Aceite da tarefa-mãe:** o cliente entra e a primeira coisa que vê é o que a PSA está pedindo, com um botão de enviar visível sem nenhum clique.

### 0.1 — Aba Documentos como entrada quando há pendência · 2h ⚡ independente
Trocar o `defaultValue` fixo por escolha dinâmica: **se o checklist tem item pendente → abre em `documents`**; senão mantém `chamados`. Usar o `useChecklistSolicitadoCliente` que já existe. Enquanto o checklist carrega, não piscar de uma aba para outra (renderizar as abas só depois de resolver, ou usar `value` controlado com estado inicial definido no `onSuccess`).
**Pronto quando:** cliente com pendência entra direto nos documentos; cliente sem pendência continua caindo em Chamados.

### 0.2 — Selo de pendência nas abas · 2h ⚡ independente
A aba Documentos ganha um contador de pendências (`Documentos · 35`) ou um ponto âmbar. Assim, mesmo quem cair em outra aba — ou voltar depois — vê que há coisa a fazer. Aplicar o mesmo padrão a Chamados se houver chamado aguardando o cliente.
**Pronto quando:** dá para saber que há 35 documentos pendentes sem entrar na aba.

### 0.3 — Primeira visita: já abrir na primeira temática · 3h (depois da 1.3)
No primeiro acesso o cliente vê **10 accordions fechados, todos `0 de N`** — uma parede de linhas idênticas. Abrir automaticamente a temática do "Comece por aqui" **e a primeira entidade dentro dela**, para que nomes de documento e botões **Enviar** apareçam sem clique. Só quando nada foi enviado ainda (`recebidos === 0`); depois disso, tudo fechado e o cliente navega.
**Pronto quando:** na primeira entrada existe um botão "Enviar" visível sem rolar nem clicar.

### 0.4 — Boas-vindas de primeira visita · 3h
"35 documentos" intimida. Faixa mostrada só enquanto `recebidos === 0`, dizendo em linguagem humana: quantos documentos a PSA precisa, **que pode enviar aos poucos e nada se perde**, e que dúvida sobre um documento específico abre um chamado (liga com o FAB da 0.5). Some sozinha no primeiro envio.
**Pronto quando:** o cliente novo entende o tamanho da tarefa sem se assustar, e sabe que não precisa resolver tudo de uma vez.

### 0.5 — Envio em 1 clique + linha como área de drop · 4h
**Achado importante:** o "Enviar" por item que existe hoje já vai **direto ao seletor de arquivo** (`abrirSeletorItem` → `itemInputRef.current?.click()`, `MeusDocumentosConteudo.tsx:244`). Ou seja, o **modal de envio da subtarefa 3.2 acrescentaria um clique** em vez de tirar. Revisar: manter o clique único direto ao seletor e transformar **a própria linha do documento em área de drop** (arrastar o arquivo em cima da linha envia). O modal fica só para arrastar vários arquivos de uma vez, não para o envio unitário.
Adicionar o **FAB "Falar com Suporte"** do mockup, abrindo chamado pré-preenchido com a temática e o documento no contexto.
**Pronto quando:** enviar um documento = 1 clique (ou 1 arrasto), e a instrução do documento continua legível durante o envio.

---

## Tarefa 1 — Pedido por temática na Área do Cliente

**Descrição:** Hoje a aba Documentos de `/cliente` abre com 8 cards de entidade (5 pessoas, 1 PJ, 1 matrícula, 1 bem) e o contador `0/35`. O cliente não sabe *o que* está sendo pedido nem por onde começar — a tela é um inventário, não uma solicitação. Esta tarefa inverte a hierarquia para **temática → entidade → documento**, do jeito que o DocBox organiza (por assunto), mas mantendo o que o DocBox não tem: o nome exato do documento, a entidade nominal e a instrução de cada um. A taxonomia já existe no banco (`categoria_docbox`, preenchido nos 63 itens do catálogo e devolvido pela RPC), então **é 100% front-end, sem migration.**

**Aceite da tarefa-mãe:** o cliente abre a aba e lê os pedidos temáticos com descrição, antes de qualquer clique; a soma dos itens de todas as temáticas bate com o total do checklist; nenhum item fica invisível.

### 1.1 — Caracterizar e extrair a lógica da tela (sem mudança visual) · 6h
`MeusDocumentosConteudo.tsx` está com **711 linhas** (teto do `AGENTS.md` é 600) e **não tem nenhum teste**. Antes de mexer na hierarquia: escrever testes golden-master que travem o comportamento atual (ordem das seções, cards menos preenchidos primeiro, pendentes antes de recebidos, item sem instância virando card "geral") e mover a lógica pura para `src/lib/clienteChecklist.ts` — `montarSecoes`, `ordemEntidade`, os mapas `ENTIDADE_*`, `extensaoValida` e a lógica de `gruposModal`. Criar `src/lib/clienteChecklist.test.ts`.
**Pronto quando:** a tela está idêntica, o arquivo caiu abaixo de 600 linhas e os testes novos passam. **Não corrigir bugs aqui** — se achar algum, registrar na tarefa explicativa.

### 1.2 — Mapa das 10 temáticas OSG · 2h
Criar em `src/lib/clienteChecklist.ts` a constante `TEMATICAS`, com **descrição, ícone e ordem** de cada temática. A **chave é o valor de `categoria_docbox`** — não renomear, é o join com o banco.
**O título exibido é a própria chave** (o nome canônico do sistema), removendo só o prefixo `OSG - `: "Documentos Pessoais", "DIRPF", "Documentos Sucessórios", "Documentos Societários", "Documentos Fiscais", "Documentos dos Bens Imóveis", "Documentos da Atividade Rural", "Documentos de Locação", "Documentos do Planejamento Tributário", "Documentos de Governança". **Não inventar rótulo "mais amigável"** — é a mesma palavra que o time usa no DocBox e no memorando; dois vocabulários quebram a conversa com o cliente (DEC-02). Por isso o mapa **não tem campo de título**.
As descrições estão na seção 4 do plano (`docs/planos/area-cliente-documentos-por-tematica.md`). A ordem é fixa e segue a fase do trabalho da OSG: pessoais → DIRPF → sucessórios → societários → fiscais → bens imóveis → atividade rural → locação → planejamento tributário → governança.
**Obrigatório:** item com `categoria_docbox` nulo ou fora do mapa cai numa temática **"Outros documentos"** no fim da lista. Item manual pode vir sem o campo e **não pode desaparecer da tela**.
**Pronto quando:** as 10 temáticas + o fallback estão cobertos por teste.

### 1.3 — Inverter a hierarquia para temática → entidade → documento · 8h
Escrever `agruparPorTematica(itens)` em `src/lib/clienteChecklist.ts`: agrupa por `categoria_docbox`, dentro por `rotulo_instancia` (a entidade), dentro os documentos. Temáticas ordenadas pelo mapa da 1.2, com as **concluídas (100%) indo para o fim**. Trocar os cards de entidade por uma lista de accordions de temática (ícone, título, descrição, selo `X de Y enviados`, barra de progresso, chevron). Dentro da temática aberta, subgrupo por entidade — aberto por padrão **só se tiver pendência**. Manter a busca atual (pessoa, imóvel ou documento): é ela que preserva o acesso pela dimensão entidade.
Criar os subcomponentes em `src/components/cliente/documentos/`: `TematicaAccordion.tsx`, `EntidadeGrupo.tsx`, `DocumentoLinha.tsx`.
**Pronto quando:** buscar por nome de pessoa ainda encontra o documento, e a soma dos itens das temáticas = total do checklist.

### 1.4 — Instrução do documento sempre visível · 2h
O campo `nota` é o diferencial sobre o DocBox — hoje aparece só em item **não recebido** e truncado em uma linha. Passa a ser subtexto fixo de cada `DocumentoLinha`, em duas linhas (`line-clamp-2`), com o texto completo no `title` do hover.
**Pronto quando:** em "Contrato social e alterações" o cliente lê "De constituição e todas as alterações posteriores, incluindo S.A." sem abrir nada.

---

## Tarefa 2 — Prazo do pedido

**Descrição:** O DocBox mostra "Prazo até 31/05/2024" e nós não temos esse dado — `checklist_cliente_item` não tem coluna de prazo. Com a classificação obrigatório/opcional fora da tela do cliente (é interna), **o prazo é o único sinal legítimo de urgência** que a tela pode dar. Sem ele, não há como dizer honestamente "comece por este". Esta tarefa cria a coluna, dá à equipe uma forma prática de preencher e mostra ao cliente.

**⚠️ Contém migração de banco** (rodar no Lovable).

### 2.1 — Migration: coluna `prazo` · 1h
```sql
ALTER TABLE public.checklist_cliente_item
  ADD COLUMN prazo date NULL;

CREATE INDEX IF NOT EXISTS idx_chk_cli_prazo
  ON public.checklist_cliente_item (cliente_id, prazo)
  WHERE prazo IS NOT NULL;
```
Nullable de propósito: item sem prazo **não** pode virar item vencido. Depois, rodar `node scripts/gen-mapa-banco.mjs`.

### 2.2 — Expor `prazo` e `solicitado_em` na RPC · 1h
Uma única alteração em `get_checklist_solicitado_cliente` (migration `20260723173413`) acrescentando ao `RETURNS TABLE` e ao `SELECT`: `i.prazo` e `i.created_at AS solicitado_em`. Depois, os dois campos em `ChecklistSolicitadoItem` (`useDocumentoArquivo.ts:395`).
**Não** expor `obrigatorio` — é classificação interna. **Não** fazer duas rodadas no Lovable: prazo e solicitado_em saem juntos.

### 2.3 — Definir prazo em massa por temática (tela da equipe) · 5h
Definir prazo item a item são 35 preenchimentos por cliente e ninguém vai fazer. Criar na tela da equipe (`src/components/equipe/osg/checklists/DocumentosClienteChecklist.tsx`) a ação "definir prazo para toda esta temática", mantendo a possibilidade de exceção por item. Mutation nova ⇒ **obrigatório usar `useAuditLog`** com o diff campo-a-campo.
**Pronto quando:** dá para pôr prazo nos 35 itens de um cliente em menos de um minuto.

### 2.4 — Prazo na tela do cliente · 3h
Mostrar o prazo no cabeçalho da temática e na linha do item; item vencido em âmbar/vermelho. Item **sem** prazo aparece normal, nunca como vencido.
**Não** replicar o "Venceu há 787 dias" do DocBox — número de dias em vermelho num pedido de 2 anos atrás só constrange o cliente e não muda o que ele faz.

---

## Tarefa 3 — Orientação: por onde começar e como enviar

**Descrição:** Resolver o "por onde começo?" que o contador `0/35` não responde, e dar ao envio de cada documento uma tela própria com a instrução em destaque. É o acabamento que transforma a lista em algo acionável.

### 3.1 — Faixa "Comece por aqui" + filtros de status · 5h
Faixa destacada no topo com **uma** temática e botão que abre o accordion dela. Critério, nesta ordem: 1) temática com pendência de **prazo mais próximo** (ou vencido); 2) empate ou ninguém com prazo → primeira temática pendente na ordem fixa da 1.2. **Nunca "a que tem mais itens"** — isso empurra o cliente para a maior pilha em vez da mais urgente. Filtros em pílula: Todos / Pendentes / Enviados (+ Em análise e Aprovados depois da Tarefa 4). Quando tudo estiver enviado, a faixa vira mensagem de conclusão em esmeralda.
**Pronto quando:** com 0 recebidos o topo mostra ação concreta ("5 documentos pendentes da MMS Participações Ltda · prazo até 15/08"), não só percentual.

### 3.2 — Modal de envio múltiplo (revisada — ver 0.5) · 4h
**Revisado:** o envio unitário **não** passa por modal — o clique em "Enviar" já vai direto ao seletor de arquivo hoje, e pôr um modal no caminho adicionaria um clique (subtarefa 0.5). A instrução do documento já fica visível na linha (1.4), então o modal perdeu sua principal justificativa.
O modal fica só para o caso **múltiplo**: arrastar vários arquivos e distribuí-los entre os documentos pendentes daquela entidade. Dropzone com tipos aceitos e limite de 50 MB (reusar `ACCEPT`/`MAX_BYTES` de `docMeta`) e `useUploadDocumentoSolicitado` (`useDocumentoArquivo.ts:429`) — **não duplicar upload**.
**Sem selo "Confidencial"** — é campo interno, base de uma camada de segurança futura; fica intocado.
**Se a sprint apertar, esta é a primeira a cair:** com a 0.5 entregue, o envio unitário já funciona em 1 clique.

---

## Tarefa 4 — Etapa de aprovação: Enviado → Em análise → Aprovado

**Descrição:** Hoje o cliente envia um documento e nunca mais sabe se foi aceito. O enum `osg_checklist_status` só tem `pendente`, `recebido`, `dispensado`, `nao_aplicavel` — não existe etapa de aprovação. **Não é "adicionar uma coluna": é um fluxo**, e ele só funciona completo. Se a subtarefa 4.4 (botão de aprovar na tela da equipe) não entrar, a feature fica **pior** que hoje: o cliente vê "em análise" para sempre, porque ninguém tem onde aprovar.

**⚠️ Migração de enum + 2 RPCs + tela nova da equipe.** É a tarefa mais cara do lote — se a sprint estiver cheia, esta é a que vai para a Sprint 11 (as Tarefas 1-3 já entregam paridade de informação com o DocBox; esta entrega paridade de fluxo).

### 4.1 — Migration do enum, em arquivo isolado · 1h
```sql
ALTER TYPE public.osg_checklist_status ADD VALUE IF NOT EXISTS 'em_analise' AFTER 'recebido';
ALTER TYPE public.osg_checklist_status ADD VALUE IF NOT EXISTS 'aprovado'   AFTER 'em_analise';
```
**⚠️ Armadilha:** no Postgres um valor de enum recém-adicionado **não pode ser usado na mesma transação** em que foi criado, e as migrations deste repo abrem `BEGIN/COMMIT`. Se este `ALTER TYPE` ficar no mesmo arquivo que uma função referenciando `'em_analise'`, **quebra**. Tem que ser dois arquivos.

### 4.2 — `anexar_documento_solicitado` passa a marcar `em_analise` · 2h
A RPC (migration `20260723173413:64`) hoje só insere em `documento_arquivo` e **nunca toca o status do item**. Passa a marcar `status='em_analise'` no `checklist_cliente_item` ao receber o arquivo. Arquivo de migration separado do 4.1.

### 4.3 — RPC de aprovação para a equipe · 4h
`aprovar_documento_solicitado(_item_id uuid, _aprovado boolean, _motivo text)`, `SECURITY DEFINER`, exigindo `team_member+` via `has_role_or_higher`. Aprovado → `status='aprovado'`. Recusado → volta a `pendente` com o motivo em `observacao` (coluna já existe). Mutation nova ⇒ **obrigatório `useAuditLog`**.
Na leitura: `get_checklist_solicitado_cliente` passa a devolver **também** `i.status::text`, mantendo o booleano `recebido` para não quebrar os consumidores atuais.

### 4.4 — Botão aprovar/recusar na tela da equipe · 5h
Em `src/components/equipe/osg/checklists/DocumentosClienteChecklist.tsx`. **Sem isto o status novo nunca sai de "em análise"** — é a subtarefa que faz a Tarefa 4 valer a pena, não é opcional.

### 4.5 — Estados na tela do cliente · 3h
Três estados por documento: pendente (círculo vazio + botão Enviar), em análise (relógio âmbar), aprovado (check verde). Recusa mostra o **motivo** ao cliente. Filtros da 3.1 ganham "Em análise" e "Aprovados".
**A barra de progresso conta ENVIADOS, não aprovados** — se depender da aprovação da PSA, o cliente manda tudo, a barra não anda, ele acha que é bug e abre chamado. A barra também não regride quando a PSA recusa.

---

## Fora do escopo (não construir)

| Item | Motivo |
|---|---|
| Selo "Obrigatório" / "Opcional" | Classificação **interna** de montagem da solicitação. O cliente não vê. |
| Prioridade Alta/Média/Baixa | Não existe no banco e seria um segundo sinal sobreposto ao obrigatório. |
| Selo "Confidencial" | Campo interno, base de camada de segurança futura. Deixar intocado. |
| "Venceu há 787 dias" | Constrange e não muda o comportamento do cliente. |
| Toggle "ver por pessoa/imóvel" | DEC-01 em aberto — a busca já cobre essa dimensão. |

## Decisões que precisam de resposta antes de começar

| # | Pergunta | Bloqueia |
|---|---|---|
| DEC-04 | Prazo: coluna no item + ação em massa por temática (recomendado) ou tabela por temática? | 2.1 |
| DEC-05 | Barra de progresso conta enviados (recomendado) ou aprovados? | 4.5 |
| DEC-06 | Tarefa 4 entra na Sprint 10 ou vai para a 11? | escopo da sprint |
| DEC-02 | Confirmar os 10 títulos das temáticas | 1.2 |
| DEC-01 | Toggle por entidade? (recomendado: não no primeiro corte) | 1.3 |

**Gate de design:** o mockup no Stitch sai antes da 1.3 — é ele que fecha o layout do accordion. Prompt pronto na seção 6 do plano.

---

## Tabela para o importador de Excel

Colunas na ordem que `Importar Sprint do Excel` espera. Cada linha vira uma subtarefa; linhas com o mesmo **Título** viram filhas da mesma tarefa-mãe. **Preencher Responsável e Data de Entrega antes de importar.**

| Sprint | ID | Título | Subtarefa | Responsável | Descrição | Estimativa (h) | Data de Entrega |
|---|---|---|---|---|---|---|---|
| Sprint 10 | AC-0.1 | Entrada do cliente: cair no lugar certo | Aba Documentos como entrada quando há pendência | | Hoje defaultValue="chamados" (ClienteDashboard.tsx:154) e o cliente novo cai numa lista de chamados vazia. Escolha dinâmica: com pendência abre em documents. Sem piscar de aba. NÃO depende de nada. | 2 | |
| Sprint 10 | AC-0.2 | Entrada do cliente: cair no lugar certo | Selo de pendência nas abas | | Contador ou ponto âmbar na aba Documentos, para saber que há 35 pendentes sem entrar. NÃO depende de nada. | 2 | |
| Sprint 10 | AC-0.3 | Entrada do cliente: cair no lugar certo | Primeira visita já abre na primeira temática | | Na 1a entrada são 10 accordions fechados e idênticos. Abrir a temática do "Comece por aqui" e a 1a entidade, só quando recebidos=0, para o botão Enviar aparecer sem clique. Depois da 1.3. | 3 | |
| Sprint 10 | AC-0.4 | Entrada do cliente: cair no lugar certo | Boas-vindas de primeira visita | | Faixa só enquanto recebidos=0: quantos documentos, que pode enviar aos poucos e nada se perde, e como tirar dúvida. Some no primeiro envio. | 3 | |
| Sprint 10 | AC-0.5 | Entrada do cliente: cair no lugar certo | Envio em 1 clique + linha como área de drop | | O Enviar atual já vai direto ao seletor (linha 244) — modal adicionaria clique. Manter 1 clique e tornar a linha área de drop. Inclui FAB Falar com Suporte abrindo chamado com contexto. | 4 | |
| Sprint 10 | AC-1.1 | Pedido por temática na Área do Cliente | Caracterizar e extrair a lógica da tela | | Testes golden-master do comportamento atual + mover lógica pura para src/lib/clienteChecklist.ts. Arquivo hoje tem 711 linhas (teto 600) e zero testes. Sem mudança visual. | 6 | |
| Sprint 10 | AC-1.2 | Pedido por temática na Área do Cliente | Mapa das 10 temáticas OSG | | Constante TEMATICAS (título, descrição, ícone, ordem) com chave = valor de categoria_docbox. Fallback "Outros documentos" para item sem temática — nenhum item pode desaparecer. | 2 | |
| Sprint 10 | AC-1.3 | Pedido por temática na Área do Cliente | Inverter hierarquia para temática > entidade > documento | | agruparPorTematica() + lista de accordions de temática, subgrupo por entidade, concluídas no fim. Manter a busca por pessoa/imóvel/documento. | 8 | |
| Sprint 10 | AC-1.4 | Pedido por temática na Área do Cliente | Instrução do documento sempre visível | | Campo nota sai do modal e vira subtexto fixo de cada linha (2 linhas + title no hover). É o diferencial sobre o DocBox. | 2 | |
| Sprint 10 | AC-2.1 | Prazo do pedido | Migration: coluna prazo | | ALTER TABLE checklist_cliente_item ADD COLUMN prazo date NULL + índice parcial. Nullable: item sem prazo não vira vencido. Rodar gen-mapa-banco. | 1 | |
| Sprint 10 | AC-2.2 | Prazo do pedido | Expor prazo e solicitado_em na RPC | | Uma única alteração em get_checklist_solicitado_cliente: i.prazo e i.created_at AS solicitado_em. NÃO expor obrigatorio (interno). | 1 | |
| Sprint 10 | AC-2.3 | Prazo do pedido | Definir prazo em massa por temática (tela da equipe) | | Ação "definir prazo para toda esta temática" em DocumentosClienteChecklist.tsx, com exceção por item. Mutation nova exige useAuditLog. | 5 | |
| Sprint 10 | AC-2.4 | Prazo do pedido | Prazo na tela do cliente | | Prazo no cabeçalho da temática e na linha; vencido em âmbar/vermelho; item sem prazo nunca aparece como vencido. Sem "venceu há X dias". | 3 | |
| Sprint 10 | AC-3.1 | Orientação: por onde começar e como enviar | Faixa "Comece por aqui" + filtros de status | | Uma temática destacada por prazo mais próximo; empate resolve pela ordem fixa. Nunca por "mais itens". Filtros Todos/Pendentes/Enviados. | 5 | |
| Sprint 10 | AC-3.2 | Orientação: por onde começar e como enviar | Modal de envio por documento | | Nome do documento, temática > entidade, instrução completa, dropzone 50MB. Reusar useUploadDocumentoSolicitado. Sem selo Confidencial. | 4 | |
| Sprint 10 | AC-4.1 | Etapa de aprovação (Enviado > Em análise > Aprovado) | Migration do enum em arquivo isolado | | ADD VALUE em_analise e aprovado no enum osg_checklist_status. ARMADILHA: valor novo de enum não pode ser usado na mesma transação — arquivo separado das funções. | 1 | |
| Sprint 10 | AC-4.2 | Etapa de aprovação (Enviado > Em análise > Aprovado) | anexar_documento_solicitado marca em_analise | | A RPC hoje nunca toca o status do item. Passa a marcar status=em_analise ao receber o arquivo. Migration separada da 4.1. | 2 | |
| Sprint 10 | AC-4.3 | Etapa de aprovação (Enviado > Em análise > Aprovado) | RPC aprovar_documento_solicitado | | SECURITY DEFINER, team_member+ via has_role_or_higher. Recusa volta a pendente com motivo em observacao. useAuditLog obrigatório. Leitura passa a devolver status. | 4 | |
| Sprint 10 | AC-4.4 | Etapa de aprovação (Enviado > Em análise > Aprovado) | Botão aprovar/recusar na tela da equipe | | Em DocumentosClienteChecklist.tsx. SEM ISTO o status nunca sai de "em análise" e a feature fica pior que hoje. Não é opcional. | 5 | |
| Sprint 10 | AC-4.5 | Etapa de aprovação (Enviado > Em análise > Aprovado) | Estados na tela do cliente | | Pendente / em análise (relógio âmbar) / aprovado (check verde) + motivo da recusa. Barra de progresso conta ENVIADOS, não aprovados, e não regride na recusa. | 3 | |
