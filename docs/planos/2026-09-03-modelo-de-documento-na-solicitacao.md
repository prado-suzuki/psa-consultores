# Documento com MODELO na solicitação de documentos (OSG WORK)

**Data:** 03/09/2026 · **Status:** 🔵 ABERTO · **Origem:** pedido do Alexandre em 03/09/2026

## 1. O problema

Alguns documentos que a OSG pede não são um documento que o cliente **já tem** (CPF,
comprovante de endereço, matrícula). São **planilhas que a PSA manda em branco e o cliente
preenche** — "Relação de áreas exploradas por imóvel", planilha de diagnóstico, planilha de
resultado projetado. O catálogo já reconhece isso na própria nota de um deles:

> "Projeção do resultado (PF e PJ), separada por tipo de atividade, **conforme modelo
> enviado**." — `documento_tipo` `bem--planilha-de-resultado-projetado-pf-e-pj`

"Modelo enviado" hoje quer dizer: alguém anexou por e-mail, fora do portal. O portal pede o
documento e não entrega o formulário — e o cliente responde pedindo o arquivo.

**O que se quer:**

1. Na tela de **solicitação inicial** (analista), o documento que tem modelo aparece marcado, e
   o analista consegue **ver o modelo que será encaminhado**. Ele não apaga, não troca, não
   sobe outro: é fixo para todos os clientes.
2. Depois de **enviada a solicitação**, o modelo aparece **no item do documento**, na área do
   cliente, para download.

## 2. O que existe hoje (verificado em produção, 03/09/2026)

### 2.1 Onde o texto do documento mora

`documento_tipo` é o catálogo (67 tipos padrão, `cliente_id is null`) e `solicitacao_item` é a
linha pedida ao cliente. A regra dura da frente, documentada em `src/lib/solicitacao.ts`, é que
**item de catálogo não copia texto**: `documento`, `entidade` e `nota` ficam nulos na linha e a
exibição resolve por herança. Foi cópia que produziu o drift de 31/07/2026.

O modelo segue essa regra: **é campo do catálogo, nunca da linha do cliente.** Isso é o mesmo
que o pedido "pode ser fixo para todos, é um modelo".

Colunas de `documento_tipo` hoje: `codigo, modulo, entidade, documento, nota, categoria,
categoria_docbox, confidencial, obrigatorio_default, granularidade, ordem, ativo, grupo,
cliente_id, solicitacao_item_id` + auditoria. **Não há nenhuma coluna de arquivo.**

### 2.2 Os dois lados da tela

**Analista** — `/equipe/osg/...` → `Onboarding.tsx` → `OnboardingWorkspace` → `DocumentGroups`.
A lista vem de `useDomainSolicitacao` (embed `catalogo:documento_tipo!solicitacao_item_item_padrao_id_fkey`)
e os "Opcionais" vêm de `useOnboarding` (o catálogo inteiro).

**Cliente** — `/cliente` → `ColetaDocumentosCliente`, que tem **duas telas** conforme o status
da solicitação:

| Status | Componente | De onde vem a lista |
|---|---|---|
| `enviada` | `CardGrupoColeta` (4 gavetas) | RPC `get_solicitacao_ativa_cliente` |
| `em_checklist` | `ChecklistDocumentosCliente` (documento × entidade) | RPC `get_pendencias_documentos_cliente` |
| `rascunho` / `encerrada` | as mesmas, em leitura | idem |

**As duas RPCs são `SECURITY DEFINER` e o cliente não lê `documento_tipo` direto.** Elas são o
único caminho por onde o modelo chega ao cliente — não adianta acrescentar coluna e mexer só no
front. As duas fazem `LEFT JOIN documento_tipo t ON t.id = i.item_padrao_id` e resolvem o texto
com `COALESCE(i.<campo>, t.<campo>)`; é ali que o modelo entra.

### 2.3 Onde ficam os arquivos hoje — e por que o bucket importa

São **dois armazenamentos diferentes**, e é fácil escolher o errado:

- **Documento que o cliente ENVIA** → não é Supabase Storage. Vai para o **GCS**
  (`psa-osg-documentos`) por uma API própria (`/api/v1/osg/documentos/sign-upload`, `finalize`,
  `sign-download`), que roda no `psa-backend-api`, **fora deste repositório**.
- **Arquivo interno da plataforma** → Supabase Storage, 10 buckets, **todos privados**.

Buckets existentes em produção: `documents`, `ticket-attachments`, `deliverable-attachments`,
`project-documents`, `work-package-files`, `sop-documents`, `osg-templates`,
`osg-apresentacoes`, `comment-attachments`, `database_export_14_08_26`.

`osg-templates` é tentador pelo nome e **não serve**: guarda os dois `.pptx` de geração de
apresentação (`TEMPLATE_PATRIMONIAL.pptx`, `TEMPLATE_SOCIETARIA.pptx`) e a policy de leitura é
`has_role_or_higher(auth.uid(), 'team_member')`. Abrir esse bucket para o cliente entregaria
junto os templates internos de apresentação.

**Nenhum bucket do Supabase tem hoje policy que alcance o papel `client`.** É uma policy nova,
em qualquer caminho que se escolha.

O padrão de leitura/escrita já existe no front e é curto — `SOPViewerModal.tsx:37`
(`createSignedUrl(path, 3600)`) e `SOPConfigModal.tsx:184` (`upload(path, file, {upsert:true})`).

## 3. Decisões

### D1 — Bucket novo `osg-modelos`, privado, leitura para qualquer usuário logado

Não reusar `osg-templates` (§2.3). Não usar bucket público: os 10 buckets do projeto são
privados e um link público de planilha da PSA fica indexável para sempre.

```
SELECT  → bucket_id = 'osg-modelos' AND auth.uid() IS NOT NULL   (role authenticated)
ALL     → bucket_id = 'osg-modelos' AND has_role(auth.uid(),'admin')
```

O `SELECT` amplo é deliberado e é o ponto a bater o martelo: o modelo é **material genérico da
PSA**, não dado de cliente nenhum, e o cliente logado precisa dele. Ligar a leitura ao cliente
dono do pedido custaria um join com `solicitacao` dentro da policy de `storage.objects` para
proteger um formulário em branco.

### D2 — O modelo é coluna do CATÁLOGO, resolvido por herança

Três colunas em `documento_tipo`, tudo-ou-nada:

| Coluna | Para quê |
|---|---|
| `modelo_bucket` | qual balde (precedente: `procedimentos.arquivo_bucket`, migration `20260825182302`) |
| `modelo_path` | caminho dentro do balde; **nulo = documento sem modelo** |
| `modelo_nome` | nome que aparece na tela e no arquivo baixado |

Nada é gravado em `solicitacao_item`. Trocar o arquivo do modelo passa a valer para todo mundo
no mesmo instante, que é o comportamento pedido.

### D3 — Aparece em três lugares, com o mesmo componente

1. Analista, linha do documento **solicitado** (`DocumentGroups`) — e também nos **Opcionais**,
   porque é lá que ele decide incluir.
2. Cliente, fase `enviada` — na relação "Ver quais documentos" do card da gaveta e no modal da
   lista completa (`CardGrupoColeta`).
3. Cliente, fase `em_checklist` — na linha da pendência, ao lado de "Enviar arquivo"
   (`ChecklistDocumentosCliente`).

### D4 — O modelo NÃO vai como anexo no aviso ao cliente

O aviso de `solicitacao_enviada` sai por e-mail e WhatsApp pela edge function `notificar` →
n8n. Anexar arquivo ali é mexer no workflow do n8n e no template aprovado da Meta. O aviso
continua levando o cliente ao portal, e o modelo está lá. Fora de escopo — registrar, não fazer.

### D5 — Na primeira onda, quem sobe o arquivo é um humano; não há tela

Não existe CRUD de `documento_tipo` no front (o catálogo é só leitura; a única escrita é o tipo
avulso que acompanha um pedido manual). São **dois arquivos**. Onda 1: upload manual no bucket
+ `UPDATE` dos dois tipos na própria migration. Onda 2, se e quando aparecer o terceiro modelo:
tela de admin no padrão do `SOPConfigModal`.

## 4. Quais documentos ganham modelo

Os quatro arquivos candidatos foram abertos e comparados em 03/09/2026. Eles **não são quatro
modelos**: são dois formulários de cliente, uma planilha interna e uma lista de pedidos.

| Arquivo | O que é | Serve de modelo? |
|---|---|---|
| `01 Solicitações Preliminares\Diagnósticos\Planilha de Áreas Exploradas.xlsx` | Formulário vazio, 1 aba, 7 colunas: Fazenda · Matrícula · Área total · Área lavoura · Área pastagem · Condição (própria/terceiro) · Município/UF | ✅ **Sim** |
| `02 Elaboração do Projeto\Diagnóstico Tributário\Solicitação de informações para Diagnóstico Tributário.xlsx` | Formulário vazio, 1 aba "Projeção": receitas por cultura de área própria, venda de bens, receitas financeiras, despesas dedutíveis / não dedutíveis, prejuízo fiscal. **Só PF**, colunas 2024–2027 | ✅ Sim, mas ver abaixo |
| `Downloads\SOPs\Lista de solicitação - Planejamento Tributário (2).xlsx` | **Duas coisas num arquivo:** aba "Solicitações" = os 9 itens do pedido inicial do PT; aba "DRE Projetada" = formulário vazio, **PF e PJ**, 2027–2029, M.I./M.E., própria/arrendada por cultura, custos, despesas administrativas, resultado financeiro | ⚠️ **Só a aba DRE Projetada** |
| `02 Elaboração do Projeto\Diagnóstico Tributário\Modelo_Planilha de Diag. Tributário para ppt.xlsx` | Abas 2024/2023/2022 com "CENÁRIO ANTERIOR" × "MODELO ATUAL", alíquotas de IR/CSLL, "REDUÇÃO ESPERADA" — e **já vem preenchida** | ❌ **Não.** É insumo do slide, produzido pela PSA |

### 4.1 Por que "diagnóstico" e "resultado projetado" parecem a mesma coisa — e não são

Parecem porque o topo dos dois é igual: receita por cultura, arrendamento, folha, tributos,
juros, resultado. **Mas cada um tem blocos que o outro não tem, e os blocos exclusivos são
justamente o que define para que serve cada um.**

| | Diagnóstico Tributário | DRE Projetada (Lista de PT) |
|---|---|---|
| Anos | 2024–2027 | 2027–2029 |
| Linhas | ~20 | ~80 |
| Regime | **caixa** | **competência** |
| Fecha em | "Resultado" | "(=) Lucro/Prejuízo do exercício" |

**Só no Diagnóstico Tributário** — tudo do eixo fiscal da pessoa física:

- classificação **despesa dedutível × não dedutível** (a regra da DIRPF do produtor rural)
- "(-) Prejuízo Fiscal por CPF/MF declarado na DIRPF"
- "Novos Financiamentos adquiridos pelas pessoas físicas" — entrada de caixa, não é receita
- "(-) Amortização de financiamentos (principal, exceto juros)" — saída de caixa, não é despesa
- "(-) Investimentos na aquisição de imóveis (apenas terra nua…)"
- "(-) Arrendamentos (pagamento **NÃO** declarado no IRPF)"
- "Venda de imóvel - apenas terra nua"

**Só na DRE Projetada** — tudo do eixo operacional/contábil:

- mercado interno × mercado externo (M.I./M.E.)
- própria × arrendada, cultura por cultura (soja, milho, algodão, milheto, sorgo, arroz, feijão,
  sementes, gado cria/recria, gado abate)
- beneficiamento (soja grãos, milho grãos, algodão pluma, sementes)
- custo aberto por insumo (defensivos, fertilizantes, máquinas aquisição × serviço, DDG/ureia/
  sais, reposição de gado, consultoria agronômica, avião agrícola, estradas, combustível)
- despesas administrativas (comissões, escritório, copa, honorários, telefone, água)
- resultado financeiro separado (receita × despesa financeira)

Leitura provável, **a confirmar com a Anne**: um apura a **base do IRPF do produtor** (caixa) e
o outro projeta **resultado contábil** para comparar regimes de PJ — e é o par deles que
alimenta o `Modelo_Planilha de Diag. Tributário para ppt.xlsx`, cujas colunas são exatamente
"Pessoa física" (cenário anterior) × "Pessoa física + Pessoa jurídica" (modelo atual).

⚠️ Um detalhe que reforça a confusão: o título dentro da planilha de Diagnóstico Tributário diz
**"Projeção do Cálculo dos impostos como Pessoa Jurídica"**, mas todo o corpo é de pessoa
física (DIRPF, CPF/MF, IRPF, "financiamentos adquiridos pelas pessoas físicas"). Título e
conteúdo discordam no próprio arquivo.

E o catálogo do banco **copiou a lista de PT quase palavra por palavra.** A nota de
`bem--planilha-de-resultado-projetado-pf-e-pj` diz "Projeção do resultado (PF e PJ), separada
por tipo de atividade, conforme modelo enviado"; a linha 23 da aba "Solicitações" diz "Projeção
do resultado (PF e PJ), separado por tipo de atividade, para os anos-calendário de 2027 a 2029,
**conforme modelo encaminhado junto a esta solicitação**". O "modelo encaminhado junto" é a
segunda aba do próprio arquivo.

Não é só esse item: **cinco** dos itens hoje marcados "CONDICIONAL — fase TAX" no catálogo saem
dessa mesma lista de 9 — Livro-caixa (2), Relatório de bens (4), Relatório de dívidas (5),
Projeção de investimentos (6), Resultado projetado (9).

### 4.2 O que isso implica

- Pedir os dois ao mesmo cliente é **pedir o mesmo número duas vezes**, em dois layouts.
- A "Lista de solicitação - Planejamento Tributário" **não pode ir inteira** para o portal: a
  aba "Solicitações" é uma segunda lista de pedidos, concorrente da que o próprio portal
  mostra, com data-base fixa. Só a aba "DRE Projetada" vira modelo, num arquivo próprio.
- Os anos estão **escritos dentro** das planilhas (2024–2027 / 2027–2029). O modelo envelhece a
  cada ciclo. O desenho de D2 é o que torna isso barato: troca-se o arquivo no bucket e vale
  para todos os clientes no mesmo instante.

### 4.3 Autoria e data dos arquivos (metadados internos, lidos em 03/09/2026)

| Arquivo | Criado por | Criado em | Salvou por último | Em |
|---|---|---|---|---|
| Solicitação de informações p/ Diag. Tributário | "Usuário do Microsoft Office" | **22/02/2017** | Anne Tunes | 12/11/2025 |
| Lista de solicitação – Planej. Tributário | **Mônica Matunaga** | **13/07/2026** | Mônica Matunaga | 13/07/2026 |
| Modelo_… para ppt | Laura | 14/06/2021 | Mauricio Rodrigues | 27/01/2026 |
| Planilha de Áreas Exploradas | Ana Alves | 22/08/2022 | Anne Tunes | 13/10/2025 |

O que isso sustenta: a planilha de Diagnóstico Tributário **nasceu em 2017**, muito antes da
reestruturação da TAX; a Anne aparece só como quem salvou por último em 11/2025, assinatura de
quem organizou a pasta e não de quem redesenhou o formulário. A Lista de PT foi criada e salva
pela Mônica no mesmo dia, em quatro minutos — é a versão viva, de quem executa o PT hoje.

**Fechado nesta conversa:** o modelo de `bem--planilha-de-resultado-projetado-pf-e-pj` é a aba
**"DRE Projetada"** da Lista de PT. A nota do catálogo é cópia literal da linha 23 daquela aba
de Solicitações.

### 4.4 O que validar com a Anne (03/09/2026, tarde)

Uma pergunta fechada, e uma de saída:

> "Anne, essa planilha de Diagnóstico Tributário é de 2017. A Mônica me mandou em julho a Lista
> de solicitação do Planejamento Tributário, que já traz o modelo dentro (aba DRE Projetada). A
> de 2017 ainda é usada em algum cliente, ou foi substituída?"

Se a resposta for "ainda é usada": **quem pede, e em que fase?** A de 2017 está em
`02 Elaboração do Projeto`, a da Mônica é do pedido inicial do PT — e hoje os dois itens do
catálogo estão no mesmo balde ("Outros documentos", grão `cliente`), sem distinção de fase.

Se ficar de pé como formulário próprio, dois acertos antes de virar modelo:

- o título por dentro diz "Projeção do Cálculo dos impostos como Pessoa **Jurídica**" e o corpo
  é todo de pessoa física (DIRPF, CPF/MF, IRPF). No portal, é esse título que o cliente lê;
- os anos estão escritos dentro (2024–2027). Quem atualiza a cada ciclo?

**O que pedir a ela:** o arquivo em branco, com o nome que o cliente deve ver na tela.

### 4.5 O arquivo que NÃO pode subir

`Modelo_Planilha de Diag. Tributário para ppt.xlsx` **vem preenchido com números reais** —
receita de R$ 164 milhões, alíquotas, IR/CSLL apurados, redução esperada. São dados de um
cliente. Além de ser peça interna de apresentação, subi-lo ao bucket de modelos seria expor
informação de terceiro a todos os clientes logados (§3, D1: a leitura é de qualquer usuário
autenticado). Não entra no `UPDATE` do §5.1 em hipótese nenhuma.

**Extração da aba "DRE Projetada"** (tirar a aba "Solicitações" do arquivo da Lista de PT): o
Alexandre faz no Excel, para não perder formatação condicional nem fórmula.

## 5. O trabalho

### 5.1 Banco — uma migration

`supabase/migrations/<timestamp>_documento_tipo_modelo.sql`:

1. `create bucket 'osg-modelos'` (privado) + as duas policies de D1.
2. As três colunas de D2 + `check (num_nonnulls(modelo_bucket, modelo_path, modelo_nome) in (0,3))`
   + `comment on column` explicando que nulo = sem modelo.
3. `create or replace function get_solicitacao_ativa_cliente()` — o `jsonb_build_object` de cada
   item ganha `'modelo'`, objeto ou `null`, montado a partir do `t` que já está no `LEFT JOIN`.
4. `create or replace function get_pendencias_documentos_cliente()` — mesma coisa; a CTE `itens`
   já faz `COALESCE(i.item_padrao_id, av.id)`, então o modelo sai por `COALESCE(t.modelo_path, av.modelo_path)`
   e desce até o `JSONB_BUILD_OBJECT` de `pendencias`.
5. `UPDATE documento_tipo SET modelo_... WHERE codigo IN (...)` para os documentos do §4.

**Ordem de aplicação:** subir os arquivos no bucket **antes** de aplicar, senão a tela oferece
download de objeto que não existe.

Sandbox (`vgzomuwnsdgrxbkyoavq`): `supabase db push` — com aviso e confirmação, uma a uma.
Produção: **passo humano pelo chat do Lovable**, nunca por aqui. Depois, regerar o `types.ts`
pelo CLI.

### 5.2 Front

| Arquivo | O que muda |
|---|---|
| `src/lib/solicitacao.ts` | tipo `ModeloDocumento {bucket, path, nome}`; `CatalogoDocumento` e `ItemSolicitacao` ganham `modelo: ModeloDocumento \| null`; `resolverItem` herda do catálogo. Função pura `modeloDoCatalogo(row)` — **com teste** |
| `src/hooks/useDomainSolicitacao.ts` | as 3 colunas entram no embed `catalogo:documento_tipo!...` de `SELECT_SOLICITACAO` |
| `src/hooks/useOnboarding.ts` | as 3 colunas entram no `.select(...)` de `documento_tipo` — **string literal única**, concatenar derruba a inferência de tipo |
| `src/lib/onboarding.ts` | `OnboardingDocument` ganha `modelo` |
| `src/hooks/useModeloDocumento.ts` **(novo)** | `createSignedUrl(path, 60)` + `window.open`. Erro **propaga** com toast — sem fallback silencioso |
| `src/components/.../BotaoModelo.tsx` **(novo)** | o chip "Modelo · baixar". Usado nos 3 lugares; recebe a paleta por prop (osg na equipe, teal no portal) |
| `DocumentGroups.tsx` | chip nas linhas "Solicitados" e "Opcionais" |
| `src/lib/coletaDocumentosCliente.ts` | `DocumentoPedido` ganha `modelo`; `montarGruposColeta` propaga — **com teste** |
| `CardGrupoColeta.tsx` | chip no `<li>` da prévia e no modal da lista completa |
| `useDomainPendenciasCliente.ts` | `PendenciaCliente` ganha `modelo` |
| `ChecklistDocumentosCliente.tsx` | chip na linha, ao lado de "Enviar arquivo" |

⚠️ **`ChecklistDocumentosCliente.tsx` tem 744 linhas** e o teto do `AGENTS.md` é 600. Antes de
acrescentar qualquer coisa: extrair `LinhaPendencia` + `ArquivoEnviado` para
`src/components/cliente/checklist/LinhaPendencia.tsx`. É decomposição por responsabilidade real,
não wrapper passa-tudo.

### 5.3 O que NÃO fazer

- Gravar caminho de modelo em `solicitacao_item` — fere a regra de não copiar do catálogo.
- Reusar `osg-templates` ou abrir bucket público.
- Deixar o cliente ler `documento_tipo` direto: quem entrega é a RPC.
- Mexer no `sign-download` do GCS: ele é para documento de cliente e vive em outro repositório.

## 6. Validação

- Testes das funções puras tocadas (`solicitacao.test.ts`, novo teste de `coletaDocumentosCliente`).
- `bunx eslint <arquivos>` + `bun run typecheck` (depois de regerar o `types.ts`).
- Manual, no sandbox: analista vê o chip → envia → cliente logado (papel `client`) baixa nas
  duas fases. O download por um papel que não seja da equipe é o único ponto onde a policy nova
  pode falhar em silêncio.
