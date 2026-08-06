# TAREFA — Área do Cliente: solicitação de documentos por temática

> **Origem:** diagnóstico feito com a Patrícia em 2026-07-28 — "a área que a equipe criou não está intuitiva, está servindo mais como dashboard do que o cliente já enviou". Comparação com o DocBox (`docbox.psa.agr.br/dashboard/project/solicitations`), que pede por temática mas não especifica *qual* documento.
> **Plano de design e briefing do mockup:** `docs/planos/area-cliente-documentos-por-tematica.md`
> **Dois lotes:** T1-T6 são **100% front-end** (a taxonomia já existe no banco — ver "O achado"). T7-T9 são o lote de banco pedido pela equipe em 2026-07-28 — 1 mudança de RPC, 1 coluna nova e 1 fluxo de aprovação. Ver "Lote de banco".

## Contexto (o que está errado hoje)

A aba **Documentos** de `/cliente` (`src/components/cliente/MeusDocumentosConteudo.tsx`) abre com **8 cards de entidade** (5 pessoas físicas, 1 PJ, 1 matrícula, 1 bem) e o contador `0/35 recebidos · 0%`.

| Problema | Efeito no cliente |
|---|---|
| Agrupa por **entidade** (`montarSecoes`, linha 97) | 5 cards de pessoa visualmente idênticos, todos "5 A ENVIAR". Nada diz *o que* está sendo pedido. |
| Não existe o pedido | Sem título, sem descrição, sem "a PSA está pedindo isto". É inventário, não solicitação. |
| Abre em `0/35` | Desanima e não sugere primeiro passo. |
| A temática está enterrada | `categoria_docbox` só aparece como subtítulo cinza **dentro do modal** (linhas 321-333), a 2 cliques. |

### O achado (por que isso é barato)

A coluna **`categoria_docbox`** já está preenchida nos 63 itens do catálogo padrão (`supabase/migrations/20260707130100_osg_checklist_seed_padrao.sql`) e é copiada para cada `checklist_cliente_item`. Os valores são **exatamente as 10 temáticas OSG** do DocBox — conferido item a item, nem sobra nem falta (7+2+4+22+3+12+2+1+7+3 = 63).

A RPC que a tela do cliente consome **já devolve o campo** (`get_checklist_solicitado_cliente`, migration `20260723173413`, linha 11) e o tipo já o expõe (`ChecklistSolicitadoItem.categoria_docbox`, `useDocumentoArquivo.ts:400`).

**Inverter a hierarquia é 100% front-end. Zero migration, zero mudança de RPC** (a RPC só é tocada no T7, que é opcional).

### Hierarquia-alvo

```
NÍVEL 1  Temática      "Empresas do grupo (societário)"   ← o pedido (o que o DocBox faz)
NÍVEL 2  Entidade      "MMS Participações Ltda"           ← diferencial da PSA
NÍVEL 3  Documento     "Contrato social e alterações"     ← diferencial da PSA
                       + instrução específica (campo `nota`)
```

O DocBox pede *"disponibilizar os atos societários das empresas do Grupo"* e larga o cliente. Nós pedimos o documento nominal, da entidade nominal, com a instrução. Os níveis 2 e 3 **não podem sumir** — é onde ganhamos.

---

## ⚠️ Restrição de arquitetura (ler antes de começar)

`MeusDocumentosConteudo.tsx` está com **711 linhas** — já acima do teto de 600 do `AGENTS.md`. **Não dá para só adicionar código nesse arquivo.** A ordem obrigatória é a da "Anatomia da decomposição": funções puras para `src/lib/` **com testes** → subcomponentes com responsabilidade real → arquivo original como fachada enxuta.

Também não existe teste para essa tela hoje (só `DocumentosClienteChecklist.test.tsx`, que é do lado equipe). Por isso o T1 é caracterização + extração, **sem mudança visual**.

---

## Subtarefas

### T1 — Caracterizar e extrair a lógica pura (sem mudança visual) 🔒 PRÉ-REQUISITO
**Objetivo:** travar o comportamento atual e tirar a lógica do componente antes de mexer na hierarquia.

- Escrever teste golden-master de `montarSecoes` (ordem das seções via `ENTIDADE_ORDEM`, cards menos preenchidos primeiro, pendentes antes de recebidos dentro do card, item sem instância virando card "geral").
- Mover para `src/lib/clienteChecklist.ts`: `montarSecoes`, `ordemEntidade`, `ENTIDADE_ICON`/`ENTIDADE_SECAO`/`ENTIDADE_ORDEM`, `extensaoValida`, a lógica de `gruposModal`.
- Criar `src/lib/clienteChecklist.test.ts`.

**Aceite:** tela idêntica na aparência e no comportamento; `MeusDocumentosConteudo.tsx` abaixo de 600 linhas; testes novos passando.
**Não corrigir bugs aqui** — se achar algum, registrar como Bn nesta tarefa.

### T2 — Mapa das 10 temáticas (constante no front)
**Objetivo:** dar título, descrição, ícone e ordem a cada temática. Não vai para o banco — são 10 textos fixos.

Em `src/lib/clienteChecklist.ts`, um `TEMATICAS: Record<string, { titulo, descricao, ordem, icone }>` alimentado pela tabela da seção 4 do plano. A **chave é o valor de `categoria_docbox`** — não renomear, é o join.

| chave (banco) | título na tela | ordem |
|---|---|---|
| `Documentos Pessoais` | Documentos pessoais da família | 1 |
| `DIRPF` | Imposto de Renda (DIRPF) | 2 |
| `Documentos Sucessórios` | Doações e testamentos | 3 |
| `Documentos Societários` | Empresas do grupo (societário) | 4 |
| `Documentos Fiscais` | Cadastros e impostos dos imóveis | 5 |
| `Documentos dos Bens Imóveis` | Imóveis: matrículas e escrituras | 6 |
| `Documentos da Atividade Rural` | Atividade rural (áreas e contratos) | 7 |
| `Documentos de Locação` | Contratos de locação | 8 |
| `Documentos do Planejamento Tributário` | Planejamento tributário (planilhas) | 9 |
| `Documentos de Governança` | Governança e organização do grupo | 10 |

A ordem segue o campo `modulo` do catálogo, que já codifica a fase do trabalho: Qualificação das Partes (1-4) → Diagnóstico Patrimonial (5-9) → Quadro Societário (10).

**Fallback obrigatório:** item com `categoria_docbox` nulo ou fora do mapa cai numa temática "Outros documentos" no fim da lista — **nunca** desaparecer da tela. Itens manuais (`origem='manual'`) podem vir sem o campo.

**Aceite:** todas as 10 temáticas + fallback cobertos por teste; nenhum item do checklist fica invisível.

### T3 — Inverter a hierarquia (o coração da tarefa)
**Objetivo:** temática no nível 1, entidade no 2, documento no 3.

- `agruparPorTematica(itens)` em `src/lib/clienteChecklist.ts`: agrupa por `categoria_docbox` → dentro, por `rotulo_instancia` (a entidade) → dentro, os documentos. Ordena as temáticas pelo mapa do T2; **concluídas (100%) vão para o fim**.
- Trocar o render de cards-de-entidade por **lista de accordions de temática**: ícone, título, descrição em 1-2 linhas, selo `X de Y enviados`, barra de progresso, chevron.
- Dentro da temática aberta, subgrupo por entidade (ícone + nome + `X de Y`), aberto por padrão **só se tiver pendência**.
- Manter a busca atual (pessoa, imóvel ou documento) — ela é o que preserva o acesso pela dimensão "entidade".
- Subcomponentes novos: `TematicaAccordion.tsx`, `EntidadeGrupo.tsx`, `DocumentoLinha.tsx` (em `src/components/cliente/documentos/`).

**Aceite:** o cliente abre a aba e lê *o que* a PSA está pedindo antes de qualquer clique; a soma dos itens de todas as temáticas = total do checklist (35 no caso do Grupo Sebben); busca por nome de pessoa ainda encontra.

### T4 — A `nota` sai do modal e vira instrução permanente
**Objetivo:** o diferencial sobre o DocBox precisa estar visível, não escondido.

Hoje a `nota` só aparece em item **não recebido**, truncada em uma linha (`truncate`, linha 603). Passa a ser subtexto fixo de cada `DocumentoLinha`, em 2 linhas (`line-clamp-2`), com `title` completo no hover.

**Aceite:** em "Contrato social e alterações" o cliente lê "De constituição e todas as alterações posteriores, incluindo S.A." sem abrir nada.

### T5 — "Comece por aqui" + filtros de status
**Objetivo:** responder "por onde começo?", que o `0/35` não responde.

- Faixa destacada no topo com **uma** temática, com botão que abre o accordion dela.
- **Critério de escolha** (nesta ordem, já que a classificação interna está fora — ver regra de fronteira): 1) temática com pendência de **prazo mais próximo** (ou já vencido), depois do T8; 2) empate ou ninguém com prazo → a primeira temática pendente na **ordem fixa do T2**, que segue a fase do trabalho da OSG. Nunca "a que tem mais itens" — isso empurra o cliente para a maior pilha em vez da mais urgente.
- Filtros em pílula: Todos / Pendentes / Enviados. Só **Pendente** e **Enviado** — ver "Lacunas".
- Quando tudo estiver recebido, a faixa vira mensagem de conclusão em esmeralda.

**Aceite:** com 0 recebidos o topo mostra ação concreta ("6 documentos pendentes da MMS Participações Ltda"), não só percentual.

### T6 — Modal de envio por documento
**Objetivo:** a tela C do plano.

Título = nome do documento; subtítulo = `temática › entidade`; instrução (`nota`) completa em destaque; dropzone com tipos aceitos e limite de 50 MB (reusar `ACCEPT`/`MAX_BYTES` de `docMeta`).

**Sem selo "Confidencial"** — ver DEC-07. O campo `confidencial` fica intocado.

Reusar o fluxo existente: `useUploadDocumentoSolicitado` (`useDocumentoArquivo.ts:429`). Não duplicar upload.

**Aceite:** o upload continua passando pela mesma RPC `anexar_documento_solicitado`; o modal não introduz nenhum campo novo nem renderiza classificação interna.

---

## Lote de banco — paridade com o DocBox

> A equipe sinalizou em 2026-07-28 que os campos que faltavam **devem ser criados**. Antes de escrever migration, o quadro real: **de quatro campos, dois já existem** (só não estão expostos na RPC), **um é coluna nova de verdade** e **um não é coluna — é fluxo de trabalho**.

| Campo do DocBox | Situação verificada no banco | O que precisa |
|---|---|---|
| Prioridade Alta/Média/Baixa | `checklist_cliente_item.obrigatorio boolean` **já existe** (schema `20260707130000`:57) — mas é **classificação interna**, ver a regra de fronteira abaixo | **Nada.** Não expor ao cliente |
| "Solicitado em (data)" | `checklist_cliente_item.created_at` **já existe** (`20260707130000`:65) | **Nenhuma migration.** Só expor na RPC → T7 |
| Prazo / "Venceu há X dias" | **não existe** em lugar nenhum (nem no schema, nem no `mapa-do-banco.md`) | Coluna nova → T8 |
| "Em análise" / "Aprovado" | enum `osg_checklist_status` só tem `pendente`, `recebido`, `dispensado`, `nao_aplicavel` (`20260707114633`:17) | Enum + 2 RPCs + **tela da equipe** → T9 |

### 🔒 Regra de fronteira: classificação interna não vaza para o cliente

> Esclarecido pela Patrícia em 2026-07-28.

`obrigatorio` (e o `obrigatorio_default` do catálogo) é **classificação interna de montagem da solicitação**:

- **obrigatório** = aquele produto sempre exige o documento → entra automaticamente na solicitação;
- **opcional** = o funcionário da OSG decide caso a caso se pede.

Ou seja, a classificação é usada **antes** de o pedido existir, para montar a solicitação. **Depois de o item estar no checklist do cliente, ele está sendo pedido — ponto.** Mostrar "obrigatório × opcional" ao cliente:

- convida a ignorar o "opcional", quando a OSG só o incluiu porque **precisa** dele naquele caso;
- expõe uma regra de produto que não é assunto do cliente.

**Portanto:** `obrigatorio` **não vai** para a `get_checklist_solicitado_cliente` nem para a tela. Nada de selo "Obrigatório", nada de contador "8 de 12 obrigatórios". Some do escopo do cliente.

Vale para os outros campos internos do mesmo jeito:

| Campo | Uso | Vai pra tela do cliente? |
|---|---|---|
| `obrigatorio` / `obrigatorio_default` | montar a solicitação (interno) | **Não** |
| `modulo` ("Qualificação das Partes", …) | fase do trabalho da OSG | **Não** — usado só para **ordenar** as temáticas (T2), nunca renderizado |
| `origem` (`padrao`/`manual`) | proveniência do item | **Não** |
| `confidencial` | marca documento sensível que não pode vazar; base de uma **camada de segurança futura** | **Não** — não renderizar. Deixar exatamente como está (ver DEC-07) |
| `categoria_docbox` | temática | **Sim** — é o nível 1 |
| `nota` | instrução ao cliente | **Sim** — é o diferencial (T4) |
| `prazo` (T8) | compromisso de data | **Sim** |

**O sinal de urgência para o cliente é o `prazo`, não a classificação.** Isso torna o T8 mais importante do que eu tinha colocado: sem ele, a tela não tem nenhuma forma legítima de dizer "comece por este".

### T7 — Expor `solicitado_em` na RPC (sem migration) ⚠️ MUDANÇA DE RPC
**Objetivo:** mostrar desde quando o documento está sendo pedido — dá contexto e cria urgência honesta, sem inventar classificação.

A coluna existe; falta no `RETURNS TABLE` de `get_checklist_solicitado_cliente`:

```sql
-- acrescentar ao RETURNS TABLE:  solicitado_em timestamptz
-- e ao SELECT:                   i.created_at AS solicitado_em
```

Fazer **na mesma alteração** que expõe o `prazo` do T8 — uma rodada só no Lovable.

Depois, adicionar o campo em `ChecklistSolicitadoItem` (`useDocumentoArquivo.ts`:395).

Habilita: "solicitado em 16/05" no cabeçalho da temática.

**Aceite:** a temática mostra desde quando o pedido está aberto; **nenhuma** classificação interna aparece na tela do cliente.

### T8 — Prazo do item ⚠️ MIGRAÇÃO
**Objetivo:** o "Prazo até 31/05/2024" do DocBox.

```sql
ALTER TABLE public.checklist_cliente_item
  ADD COLUMN prazo date NULL;

CREATE INDEX IF NOT EXISTS idx_chk_cli_prazo
  ON public.checklist_cliente_item (cliente_id, prazo)
  WHERE prazo IS NOT NULL;
```

Nullable de propósito: item sem prazo não deve virar item vencido. Depois, expor `i.prazo` na RPC (junto com o T7, na mesma alteração).

**Decisão necessária antes (DEC-04):** definir prazo item a item são 35 preenchimentos por cliente — ninguém vai fazer. Recomendo **coluna no item + ação em massa na tela da equipe** ("definir prazo para toda esta temática"), o que mantém a leitura simples e ainda permite exceção por item. A alternativa (tabela `checklist_cliente_prazo` por temática) economiza digitação mas impede a exceção e complica o join.

**Na tela do cliente:** prazo vencido em âmbar/vermelho na linha e no selo da temática. **Não** replicar o "Venceu há 787 dias" do DocBox — número de dias em vermelho num pedido de 2 anos atrás só constrange o cliente e não muda o que ele faz.

**Aceite:** a temática mostra o prazo; item vencido fica visualmente distinto; item sem prazo aparece normal, nunca como vencido.

### T9 — Etapa de aprovação: Enviado → Em análise → Aprovado ⚠️ MIGRAÇÃO DE ENUM + 2 RPCs + TELA DA EQUIPE
**Objetivo:** o cliente saber se o que ele mandou foi aceito. Hoje ele manda e nunca mais sabe.

**Este é o item mais caro do lote — não é uma coluna, é um fluxo.** Precisa de quatro coisas:

**1. Enum** — em **migration própria, sozinha**:
```sql
ALTER TYPE public.osg_checklist_status ADD VALUE IF NOT EXISTS 'em_analise' AFTER 'recebido';
ALTER TYPE public.osg_checklist_status ADD VALUE IF NOT EXISTS 'aprovado'   AFTER 'em_analise';
```
> ⚠️ **Armadilha:** no Postgres, um valor de enum recém-adicionado **não pode ser usado na mesma transação** em que foi criado. As migrations do repo abrem `BEGIN/COMMIT` (ver o seed `20260707130100`). Se o `ADD VALUE` e o `CREATE OR REPLACE FUNCTION` que referencia `'em_analise'` forem no mesmo arquivo, **quebra**. Devem ser dois arquivos.

**2. `anexar_documento_solicitado`** (migration `20260723173413`:64) — hoje só insere em `documento_arquivo` e **nunca toca o status do item**. Passa a marcar `status='em_analise'` no item ao receber o arquivo.

**3. RPC nova de aprovação para a equipe** — `aprovar_documento_solicitado(_item_id uuid, _aprovado boolean, _motivo text)`, `SECURITY DEFINER`, exigindo `team_member+` via `has_role_or_higher`. Aprovado → `status='aprovado'`; recusado → volta a `pendente` com o motivo em `observacao` (a coluna já existe). **Mutation nova ⇒ obrigada a usar `useAuditLog`** (regra do `AGENTS.md`).

**4. Tela da equipe** — botão aprovar/recusar em `src/components/equipe/osg/checklists/DocumentosClienteChecklist.tsx`. **Sem isso o status novo nunca sai de "em análise"** e a feature fica pior que hoje: o cliente vê "em análise" pra sempre.

**Impacto na leitura (cuidado):** a RPC deriva `recebido` como `status='recebido' OR EXISTS(documento ativo)` (`20260723173413`:35-43). Com os status novos isso continua devolvendo `true` por causa do `EXISTS`, então **não quebra** — mas o cliente não distingue enviado de aprovado. A RPC precisa devolver **também** `i.status::text`; manter o `recebido` booleano para não quebrar os consumidores atuais.

**Decisão necessária antes (DEC-05):** a barra de progresso do cliente conta **enviados** ou **aprovados**? Recomendo **enviados** — é o que ele controla. Se a barra depender da aprovação da PSA, o cliente manda tudo e a barra não se move, o que parece bug e gera chamado. A aprovação aparece por item (check verde "aprovado" × relógio "em análise"), não na barra.

**Aceite:** cliente envia → vê "em análise"; PSA aprova → vê "aprovado"; PSA recusa → o item volta a pendente **com o motivo visível**; a barra de progresso não regride quando a PSA recusa (ela conta enviados).

---

## Decisões pendentes (Patrícia)

- **DEC-01 — Visão por entidade:** o nível 1 passa a ser temática. Manter um toggle "ver por pessoa/imóvel"? **Recomendação: não** no primeiro corte — a busca já cobre a dimensão entidade e um toggle traz de volta a confusão de hoje. Reavaliar depois de o cliente usar.
- ~~**DEC-02 — Rótulos**~~ **RESOLVIDO (2026-07-28):** usar o **nome canônico do sistema**, igual ao valor de `categoria_docbox`, removendo só o prefixo `OSG - `. Nada de rótulo "mais amigável" — o time diz "Documentos Societários" no DocBox, no memorando e no catálogo; se a tela do cliente dissesse outra coisa, toda ligação teria dois vocabulários. E "DIRPF"/"ITR"/"CCIR" é a língua do produtor rural, não jargão a evitar. Glossário completo (termo do mockup → termo do sistema, com a linha no código) na seção 6c do plano.
- ~~**DEC-03 — Coluna `prioridade`**~~ **RESOLVIDO (2026-07-28):** não criar. A Patrícia esclareceu que `obrigatorio`/`opcional` é classificação interna de montagem da solicitação e **o cliente não vê**. Logo não há selo de prioridade nem de obrigatoriedade na tela do cliente — a urgência é comunicada pelo **prazo** (T8). Ver "Regra de fronteira".
- ~~**DEC-07 — Selo "Confidencial" (T6)**~~ **RESOLVIDO (2026-07-28):** `confidencial` marca documento sensível que não pode vazar e é a base de uma **camada de segurança a ser implementada no futuro** — fora do escopo desta tarefa. **Deixar exatamente como está:** não renderizar selo, não mexer na RPC, não mexer na coluna. O T6 perde o selo.
  - *Fato para quem construir a camada de segurança depois:* a RPC `get_checklist_solicitado_cliente` **já devolve** `confidencial` ao navegador do cliente (`20260723173413`:13/27), mesmo sem nada renderizar. É só um booleano sobre um nome de documento que o cliente já vê, então não é vazamento — mas é o ponto de partida natural quando a camada for desenhada. **Não alterar agora.**
- **DEC-04 — Granularidade do prazo (T8):** coluna no item + ação em massa por temática (recomendado) ou tabela por temática?
- **DEC-05 — Barra de progresso (T9):** conta enviados (recomendado) ou aprovados?
- **DEC-08 — Paleta da Área do Cliente:** o 1º mockup do Stitch vestiu a tela com o `.osg-theme` (verde musgo + canvas areia), que **já existe em `src/index.css`** mas hoje é aplicado só na área interna `/equipe/osg` — o `/cliente` usa o teal padrão. Adotar a paleta OSG no cliente é decisão de marca e **tem que valer para as 4 abas** (Chamados, Projetos, Documentos, Dashboards), senão a área fica rachada. Avaliação completa na seção 6b do plano.
- **DEC-06 — T9 entra na Sprint 10?** É o único item do lote que exige tela nova da equipe. Se a sprint estiver cheia, T7+T8 já entregam paridade de informação com o DocBox; o T9 entrega paridade de **fluxo** e pode ir para a 11.

## Ordem sugerida

**T1 → T2 → T3 → T4 → T7 → T8 → T5 → T6 → T9.**

- **T1 é bloqueante** (teto de linhas + rede de testes).
- **T3** é o que resolve o sintoma que a Patrícia relatou.
- **T4** é barato e é o que nos diferencia do DocBox.
- **T8 antes do T5**, e o T7 junto: sem o `prazo`, o "Comece por aqui" não tem critério legítimo de urgência (a classificação interna está fora — ver regra de fronteira), e sobra só a ordem fixa das temáticas. As duas exposições de RPC (`solicitado_em` do T7 e `prazo` do T8) vão **numa única alteração** da `get_checklist_solicitado_cliente` — não fazer duas rodadas no Lovable.
- **T9 por último**, e só se couber: é o único item que exige tela nova da equipe (ver DEC-06).

**Gate de design:** o mockup no Stitch (Tela A do plano) sai antes do T3 — é ele que fecha o layout do accordion. Prazo e "em análise" **podem** entrar no mockup agora que T8/T9 foram aprovados pela equipe; o que continua fora é a prioridade em 3 níveis (ver DEC-03) e o "Venceu há 787 dias".

## Aceite geral

1. O cliente abre `/cliente` → Documentos e vê **10 pedidos temáticos** com descrição, não 8 cards de entidade anônimos.
2. Cada documento mostra **nome + entidade + instrução** sem precisar abrir modal.
3. Nenhum campo na tela sem dado por trás: prazo só depois do T8, "em análise"/"aprovado" só depois do T9 (incluindo a tela de aprovação da equipe).
3b. **Nenhuma classificação interna na tela do cliente** — `obrigatorio`, `modulo` e `origem` não aparecem nem são devolvidos pela `get_checklist_solicitado_cliente`. Vale como item de revisão do PR.
4. Nenhum item do checklist fica invisível (fallback "Outros documentos" coberto por teste).
5. `MeusDocumentosConteudo.tsx` < 600 linhas; lógica pura em `src/lib/clienteChecklist.ts` com testes; zero `supabase.from()` em componente.
6. `bun run typecheck` limpo e suíte completa passando.

## Referências de código

- **Tela:** `src/components/cliente/MeusDocumentosConteudo.tsx` (711 linhas) — `montarSecoes`:97 · `CardBotao`:137 · `gruposModal`:321 · progresso animado:342-370 · modal por entidade:563 · `nota` truncada:603
- **Host:** `src/pages/cliente/ClienteDashboard.tsx` (aba Documentos)
- **Hooks:** `src/hooks/useDocumentoArquivo.ts` — `ChecklistSolicitadoItem`:395 · `useChecklistSolicitadoCliente`:409 · `useUploadDocumentoSolicitado`:429
- **RPCs:** `supabase/migrations/20260723173413_...sql` — `get_checklist_solicitado_cliente`:5 · `anexar_documento_solicitado`:64
- **Schema:** `supabase/migrations/20260707130000_osg_checklist_schema.sql` (`checklist_cliente_item`:45, coluna `obrigatorio`) · enum `osg_checklist_status`:17
- **Catálogo/seed:** `supabase/migrations/20260707130100_osg_checklist_seed_padrao.sql` (63 itens, `categoria_docbox` preenchido) · espelho no front: `src/components/equipe/osg/documentos/checklistPadrao.ts`
- **Limites de upload:** `src/components/equipe/osg/documentos/docMeta.ts` (`ACCEPT`, `MAX_BYTES`)
- **Fonte externa (temáticas OSG):** `Modelos_de_Solicitacao_Docbox_Consolidado.md` no Drive — só os modelos com prefixo `OSG` (10 dos 40)
