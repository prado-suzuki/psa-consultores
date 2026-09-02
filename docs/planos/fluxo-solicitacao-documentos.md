# Fluxo de Solicitação de Documentos — decisões e estado

Documento de handoff. Consolida as decisões tomadas em **31/07/2026** sobre a frente de
solicitação de documentos, e o estado do código e do banco levantado no mesmo dia.

Serve de entrada para as duas frentes seguintes: a execução da sprint (Eduardo e Alexandre) e a
frente de **cadastro/vínculo de documentos aos cadastros** (Bernardo), que ainda não tem tarefas.

---

## 1. Escopo

**Dentro desta frente:** só a solicitação. O consultor abre a solicitação na tela de onboarding
(`/equipe/osg/...`), ela aparece na área do cliente (`/cliente`, aba Documentos) organizada em
4 gavetas, e o cliente envia os arquivos. A tela de onboarding, a área do cliente e todo o
upload/armazenamento no GCS já existem e funcionam.

**Fora, por decisão:**

| o que | por quê |
|---|---|
| a frente de **checklist** (multiplicar cada documento por pessoa/imóvel cadastrado) | vai ser repensada; `checklist_cliente_item` sofrerá alterações severas |
| a **classificação** do arquivo recebido (amarrar arquivo a documento e a pessoa/imóvel) | é a frente seguinte, ainda sem tarefas |
| **verificação/aprovação** de documento | nunca saiu do plano; o enum não tem `em_analise` nem `aprovado` |
| **prazo** por item ou por temática | coluna nunca criada |
| hierarquia por **temática** na área do cliente | o plano de 28/07 (`area-cliente-documentos-por-tematica.md`) foi substituído pelas 4 gavetas em 28-29/07 |

## 2. As decisões fechadas em 31/07/2026

> **Revisão de 13/08/2026:** as decisões **4** (sem progresso nem contador de pendência) e **5** (o
> arquivo não se liga ao item pedido) foram revertidas. O upload do cliente passa a ser por documento
> pedido × entidade, e o arquivo nasce classificado. As demais seguem valendo, inclusive a 3
> (encerramento manual). Ver `docs/planos/checklist-por-subtracao.md`.

1. **Uma solicitação ativa por cliente.** Encerrar para abrir outra.
2. **`solicitacao.status` é enum próprio**, 3 valores: `rascunho`, `enviada`, `encerrada`.
3. **A solicitação é encerrada manualmente**, por botão na tela de onboarding. Não há fechamento
   automático por completude.
4. **Não existe estado de "concluído"** por gaveta nem por item. Tudo fica aberto até o botão.
   Consequência: sem progresso, sem contador de pendência, sem "a gaveta fechou".
5. **O arquivo NÃO se liga ao item pedido.** O cliente joga o arquivo no balde da gaveta e o
   consultor classifica depois. Não existe `documento_arquivo.solicitacao_item_id`, nem restrição de
   exclusividade, nem RPC de anexo por item — só um `solicitacao_id` **nulável** em
   `documento_arquivo`, para saber de qual pedido veio o lote.
6. **A herança do catálogo é resolvida na RPC de leitura**, por `coalesce`. Par obrigatório do lado
   da gravação: **a tela do consultor não copia** do catálogo — item de catálogo entra com
   `documento`, `entidade` e `nota` nulos.
7. **O modal de documento manual pede a granularidade** (o grão, 5 opções) e **o grupo**, este
   pré-selecionado a partir do grão e editável. Motivo: no grão `cliente` o grupo não é dedutível.
8. **`solicitacao_item.status` é só intenção do analista** (`ativo` / `dispensado`), nunca
   "recebido". Remover item não deleta a linha: muda o status, preservando o rastro.
9. **`granularidade` é `NOT NULL`** em `solicitacao_item`.
10. **Renomeações**, para "checklist" sobrar só no que é checklist de verdade:
    `checklist_item_padrao` → **`documento_tipo`**;
    `produto_checklist_item` → **`produto_documento_tipo`**;
    `checklist_cliente_item` **mantém o nome**.

### Os 4 grupos (o agrupador)

| chave do enum | rótulo na tela |
|---|---|
| `pf` | Pessoas Físicas |
| `pj` | Pessoas Jurídicas |
| `bens_imoveis` | **Bens e Imóveis** |
| `outros` | Outros documentos |

O nome do terceiro estava errado nos **dois** lados do código: a área do cliente dizia
"Matrículas e Imóveis" e a tela do consultor "Bens e Direitos". Os dois saem. Atenção: a chave no
front hoje é `imoveis`, não `bens_imoveis` — a renomeação de chave faz parte do trabalho.

### O problema central: o grupo era palpite, vira dado

O grupo de um documento era **inferido**, e cada tela inferia diferente:
`grupoDaEntidade(entidade)` em `src/lib/coletaDocumentosCliente.ts` (switch sobre texto livre),
`grupoDaCategoria(categoria)` em `src/lib/agrupadorDocumentos.ts` (sobre o enum), e
`ONBOARDING_GROUPS` em `src/lib/onboarding.ts` (o quarto vocabulário).

Em **4 dos 58** itens do catálogo as duas primeiras discordavam — o documento pedido aparecia numa
gaveta e o arquivo recebido caía em outra. A correção: `grupo` vira coluna gravada,
`grupoDaEntidade()` é apagada, `grupoDaCategoria()` fica só para arquivo legado, e `categoria` volta
a ser só classificação do arquivo e prefixo da chave no GCS (`{categoria}/{cliente_id}/{uuid}.ext`).

Os 4 itens ambíguos foram decididos à mão: **Relação de áreas exploradas por imóvel**,
**Relação de bens com intenção de alienação** e **Contrato de locação de imóvel urbano** →
Bens e Imóveis; **Livro-caixa do Produtor Rural** → Pessoas Físicas.

## 3. Estado do banco em 31/07/2026 (produção; todos os cadastros são de teste)

- **`checklist_item_padrao`:** 58 itens, 56 ativos (2 desativados de propósito pela migration
  `20260717212455_*.sql`). `entidade` tem só 5 valores e é **1:1 exato** com `granularidade`:
  Pessoa Jurídica↔`pessoa_pj` (19) · Pessoa Física↔`pessoa_pf` (16) ·
  Matrícula (Imóvel Rural)↔`matricula_rural` (11) · Cliente↔`cliente` (7) ·
  Matrícula (Imóvel Urbano)↔`matricula_urbana` (5). Por isso `entidade` deixa de ser campo próprio.
- **Distribuição final do `grupo`:** 19 `pj`, 18 `bens_imoveis`, 16 `pf`, 5 `outros`.
  Os 5 de "Outros" são todos de grão `cliente` e todos de "Documentos do Planejamento Tributário" —
  na prática essa gaveta é a do planejamento tributário, não um resto heterogêneo.
- **`produto_checklist_item`:** 260 vínculos, 11 produtos, 53 itens distintos. **5 itens não estão
  em nenhum produto** (3 ativos, todos de matrícula rural). A planilha de origem previa 228 vínculos
  sobre 50 documentos — divergência a conferir.
- **`checklist_cliente_item`:** 475 linhas, 8 clientes. 434 com personagem, 41 sem. 435 `pendente`,
  40 `solicitado` — e os separadores não são confiáveis: 6 linhas *com* personagem estão
  `solicitado` e 7 *sem* personagem estão `pendente`. `obrigatorio = true` em 457 de 475 (campo
  morto). **Zero** linhas com `item_padrao_id` nulo.
- **7 linhas** dizem `entidade = 'Bem'` enquanto o catálogo, corrigido depois, diz `'Cliente'`.
  É a prova de que copiar campo do catálogo para a linha do cliente defasa.
- **`get_checklist_solicitado_cliente`** filtra só `status NOT IN ('dispensado','nao_aplicavel')` e
  não existe nenhuma linha nesses status — hoje **todo cliente vê 100% das próprias linhas**,
  rascunho incluído; o maior vê 239.
- **`documento_arquivo`:** 43 linhas, 22 ativas, 5 sem vínculo nenhum. Uploads com
  `fonte = 'cliente'` já gravam categorias fora das 4 da gaveta (`bens_direitos`,
  `cadastros_fiscais`, `georreferenciamento`), vindas do caminho por item.

## 4. Achados no código que contrariam suposições comuns

Levantados ao escrever as tarefas; conferidos no código em 31/07/2026.

1. **`gerar_solicitacao_os` não é chamada por lugar nenhum do front.** Zero `.rpc(...)` em `src/`.
   O envio atual é 100% client-side (`select` + `upsert` em `checklist_cliente_item`). A RPC foi
   entregue na sprint 10 (EDU-16) e ninguém plugou.
2. **O `onConflict: 'id'` de `useOnboarding.ts` não "nunca dispara".** Ele faz um `select` antes e
   reusa o `id` das linhas existentes por identidade de negócio. O que é verdade é que **nunca
   protege contra duplicata de identidade**: linha nova recebe `crypto.randomUUID()` e sempre entra.
3. **O modal de documento manual nunca pediu "entidade"** e **já pede "Grupo"** — mas só no modo
   adicionar, e a `entidade` é derivada do grupo. O trabalho é apagar a derivação, acrescentar o
   grão, e tornar o grupo editável nos dois modos.
4. **`ONBOARDING_GROUPS` tem consumidores fora do óbvio:**
   `src/components/equipe/osg/onboarding/onboardingKit.ts` (`GROUP_ICONS`, com
   `'Bens e Direitos': Landmark`) e `src/lib/exploradorDocumentos.ts` (`case 'imoveis'`).
5. **A view `cobertura_documentos_cliente` não é afetada pelas renomeações** — ela lê só
   `checklist_cliente_item`, `pessoa`, `bem`, `matricula` e `documento_arquivo`. Idem
   `get_checklist_solicitado_cliente` e `anexar_documento_solicitado`. A única função de banco
   afetada pelo rename é `gerar_solicitacao_os`.
6. **A área do cliente não tem a acessibilidade que se supunha.** `ColetaDocumentosCliente.tsx` tem
   zero `aria-*` e zero `focus-visible`. O único `focus-visible` está em
   `ChecklistDocumentosConteudo.tsx`, que sai do ar — vale copiar o padrão antes de removê-lo.
7. **O harness de e2e (Playwright, `e2e/` com `writeGuard.ts`) é read-only** e não tem script no
   `package.json`; o `webServer.command` usa `npm run dev`, contra a regra "sempre bun" do
   `AGENTS.md`. Por isso o teste de integração da sprint é manual roteirizado.
8. **`osg_checklist_status` tem 6 valores, não 4** — `solicitado` e `nao_solicitado` foram
   acrescentados por `20260717184002_*.sql`, para acomodar o nível de solicitação dentro da tabela
   de checklist. Ficam mortos depois da separação.

## 5. Questões abertas

| # | questão | onde toca |
|---|---|---|
| 1 | **O índice `(solicitacao_id, documento, entidade)` de `solicitacao_item` não dedupe documento manual**, porque `entidade` passa a ser nula e o Postgres trata nulos como distintos. Alternativa proposta: índice sobre `(solicitacao_id, lower(documento))` restrito a `item_padrao_id is null`. Refinado em 03/08/2026 — ver o apêndice de `cadastro-vinculo-documentos.md`: o índice não protege **nenhum** dos dois casos, e a saída são dois índices parciais, um por tipo de linha. | schema, antes da sprint começar |
| 2 | Os 5 itens de catálogo sem produto e a divergência 260 vínculos × 228 da planilha. | carga (ALE-27) |
| 3 | Coluna `ambiente` em `solicitacao`: decidido **não** criar (as tabelas irmãs do módulo não têm), mas é decisão reversível. | schema |

## 6. Artefatos

| arquivo | o que é |
|---|---|
| `~/Downloads/GAP_solicitacao_x_area_cliente_2026-07-31.xlsx` | o gap medido no banco, 9 abas. A aba **"Carga do grupo"** é a entrada literal da migração: os 58 itens com o `grupo` definitivo |
| `~/Downloads/11_Sprint_OSG_fluxo-solicitacao.xlsx` | a sprint, 15 tarefas / 47h, no formato da equipe (EDU-19..27, ALE-26..31) |
| `~/Downloads/SPRINT_solicitacao_documentos_RASCUNHO_2026-07-31.xlsx` | rascunho de validação (Tarefas / Sequência / Decisões / Fora de escopo) |
| `RELATORIO_estrutura_solicitacao_checklist.md` (Alexandre, 30/07) | os 9 débitos E1-E3 / A1-A6 e as 3 opções de modelagem. A recomendação era a Opção 3, que é o que foi adotado no núcleo |
| ~~`docs/planos/area-cliente-documentos-por-tematica.md`~~ | plano de 28/07, **superado** pelas 4 gavetas e **apagado em 01/09/2026** junto das duas tarefas da sprint 10 que dele derivavam. Está no histórico do git se alguém precisar do diagnóstico da tela antiga |

## 7. O que a frente seguinte herda

A frente de **cadastro/vínculo de documentos aos cadastros** (classificar o arquivo recebido,
amarrando-o ao documento pedido e à pessoa/bem/matrícula) começa com estas amarras já postas:

- o arquivo chega **sem vínculo**, no balde de uma das 4 gavetas, com `categoria` e
  `solicitacao_id` preenchidos e nada mais — é este o material de entrada da tela de classificação;
- `documento_arquivo` já tem `checklist_item_id`, `pessoa_id`, `bem_id` e `matricula_id`;
- **N arquivos para a mesma entidade é caso normal** (três alterações de contrato social, por
  exemplo) — a tela não pode travar no "já tem um";
- `checklist_cliente_item` **vai ser reescrita** — não construir nada em cima dela sem antes decidir
  o modelo novo;
- a view `cobertura_documentos_cliente` existe (sprint 10, EDU-17) e **não tem consumidor**;
- a regra de "documento faltante" nunca foi definida (era o BER-32 da sprint 10, não executado): sem
  quantidade esperada por entidade, "faltante" não é uma subtração.

> **Nota de 03/08/2026:** a direção dessa frente seguinte foi decidida e está em
> `docs/planos/cadastro-vinculo-documentos.md`. Duas amarras acima foram **superadas** por ela: o
> vínculo é **1:1** (um arquivo, um dono), e não existe tela de classificação separada — a
> classificação é efeito colateral do cadastro.
