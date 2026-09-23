# TAREFA 1 — A lista geral de solicitações de documentos

> **Pergunta dela em 21/09/2026, ao testar o módulo de onboarding: "e onde que está a lista
> geral das solicitações?"** A resposta é que não existe, e a busca foi exaustiva.
>
> **Banco: não.** Nenhuma migração, nenhuma RPC, nenhuma policy — a leitura já está
> autorizada (T2). É tela e hook.
>
> **Não duplica o plano de UX.** O selo de status e a distinção finalizada/cancelada saem
> de [`osg/ajustes-ux-solicitacao-de-documentos.md`](../../osg/ajustes-ux-solicitacao-de-documentos.md),
> §1.7 e §0. Esta tarefa **consome** aquilo; não redecide.
>
> **Antes de começar, consultar a Patrícia:** qual versão desse plano vale? A versão no
> disco foi reescrita e não foi commitada. Ela tem 284 linhas a menos que a commitada em
> `26e4c87f`. Confira com ela se a §1.7 e a §0 que você vai ler são as que valem.
>
> **Referência visual:** https://claude.ai/artifact/J3Mh8NDjEPMGZMwinKcEbB (privado, precisa
> ser compartilhado). O canvas **não desenha esta tela** — ele é das telas de onboarding —,
> mas é dele que sai a aparência do selo que esta lista usa em cada estado, inclusive o
> contraste entre finalizada e cancelada.

## O que foi medido, e como

Varredura em 21/09/2026 na `develop`. Três caminhos, mesmo resultado:

| onde procurei | o que achei |
|---|---|
| páginas em `src/pages/equipe/osg/` que citam solicitação | **uma**: `Onboarding.tsx` |
| leituras da tabela `solicitacao` em todo o `src/` | **uma**: `buscarSolicitacaoDoCliente` em `useDomainSolicitacao.ts`, e ela é `.eq('cliente_id', clienteId)` |
| views de solicitação nas migrations | **nenhuma** |

A única RPC que busca sem receber cliente é `get_solicitacao_ativa_cliente`, e ela é do
**portal**: resolve por `auth.uid()` e devolve a do próprio cliente logado
(`useDocumentoArquivo.ts`). Não serve à equipe.

**Consequência operacional:** descobrir quais clientes têm solicitação, em que status e
desde quando, hoje só abrindo cliente por cliente na barra do OSG Work. Foi exatamente o
que ela relatou no teste — e a causa não é falta de selo na tela, é a lista nunca ter
existido.

## Subtarefas

### T0 — Medir em produção antes de desenhar

SELECT pelo MCP do Lovable (**só SELECT**, conforme o `AGENTS.md`): quantas solicitações
existem, a distribuição por status, quantos clientes distintos, e quantas são `encerrada`
com `enviada_em` nulo — que são as **canceladas** do §0 do plano de UX, e precisam aparecer
na lista com o rótulo certo desde o primeiro dia.

Sem esse número não dá para decidir se a tela precisa de paginação, e é barato.

### T1 — O recorte de leitura já existe; confirmar e não reinventar

A policy de SELECT é
`CREATE POLICY "cluster can view solicitacao" ON public.solicitacao FOR SELECT USING (public.cliente_visivel_para(cliente_id))`
(baseline, linha 15495). **Uma consulta sem filtro de cliente já volta recortada pelo
cluster de quem olha** — não é preciso policy nova, nem função nova, nem passar cluster na
query.

Confirmar por SELECT com dois usuários de clusters diferentes antes de seguir.

### T2 — ⚠️ O recorte de ambiente é manual, e é aqui que mora o risco

`solicitacao` **não tem coluna `ambiente`** e **não está em `src/lib/ambienteScope.ts`**.
Isso nunca foi problema porque a tela lê uma por vez, e o ambiente vem implícito no cliente
escolhido. **Uma lista que atravessa clientes quebra essa premissa**: no sandbox ela
mostraria clientes de produção e vice-versa, e em produção apareceriam os cadastros
`[TESTE]`.

O maquinário já existe e é o mesmo que projetos e tarefas usam: `ambientePorClienteQuery`
mais `isDoAmbiente(clienteId, ...)`. **Usar, não inventar.** É o mesmo defeito que o
comentário de `ambienteScope.ts` descreve: *"sem isso as listas de projetos e tarefas do
preview mostravam o trabalho de produção"*.

### T3 — O hook

`useSolicitacoesDaEquipe` em `src/hooks/`, React Query, sem Supabase no componente (regra
inegociável nº 1). Traz cliente, status, `enviada_em`, `encerrada_em`, responsável
(`created_by` → `profiles`) e a contagem de itens ativos.

**Preservar o que a tela de hoje já faz certo:** o estado é derivado com
`estadoDaSolicitacao()` (plano de UX §1.7), não com `status` cru — senão a lista chama de
"Finalizada" um rascunho que foi cancelado, que é o defeito que o plano existe para
corrigir.

### T4 — A tela

Rota nova, **registrada em `src/config/protectedPages.ts`** (regra inegociável). Colunas:
cliente, selo de estado, data de envio, data de encerramento, documentos, responsável.
Filtro por estado e busca por cliente.

O selo usa `solicitacaoStatusColors.ts` — o sétimo mapa da família, entregue pela fatia 5
do plano de UX. **Esta tarefa depende daquela fatia** ou entrega o mapa junto; não pinta
status à mão (`paleta-por-area.md`, "Status tem mapa, não classe").

### T5 — A ponte com a tela de trabalho

Clicar numa linha leva ao `/equipe/osg/work/onboarding` com aquele cliente já selecionado.
Hoje o cliente do OSG Work vive em `OsgWorkContext`, em memória, sem URL — então isso é
uma decisão de desenho pequena mas real: ou o contexto passa a aceitar cliente por
parâmetro de rota, ou a lista só informa e a pessoa seleciona à mão.

**Decidir antes de codar**, e a resposta mais barata provavelmente é a segunda.

## Aceite

- Existe uma tela que responde "quais clientes têm solicitação e em que estado" **sem
  abrir cliente por cliente**.
- Um analista de um cluster não vê solicitação de cliente de outro cluster.
- No sandbox a lista não mostra nenhum cliente de produção; em produção não mostra nenhum
  `[TESTE]`.
- Uma solicitação encerrada **que nunca foi enviada** aparece como **Cancelada**, não como
  Finalizada.
- Nenhum selo da tela usa o verde da área.

## O que esta tarefa NÃO faz

Não alcança solicitações **anteriores** de um mesmo cliente — a lista mostra a que a
consulta de hoje já alcança. Isso é a [tarefa 2](TAREFA_historico-de-solicitacoes-do-cliente.md),
e é problema diferente.
