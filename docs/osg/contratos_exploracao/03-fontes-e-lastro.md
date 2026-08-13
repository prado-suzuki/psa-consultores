# Fontes e lastro

Dossiê de tudo que foi aberto para este levantamento. Cada fonte tem uma chave
(`[DB]`, `[CHI-PAR]`, ...) usada em [`01-campos.md`](./01-campos.md) e
[`02-fluxo-processo.md`](./02-fluxo-processo.md) para não repetir a citação inteira
em cada linha.

> **Nota de revisão (11/08/2026):** a primeira rodada deste levantamento leu
> contratos reais e o schema do banco, mas **não leu o código do OSG Work**.
> As fontes `[AUDIT-*]` abaixo cobrem essa lacuna — foram lidas por completo
> (não por busca de palavra-chave) por agentes dedicados, um por módulo do
> app, e corrigem pelo menos dois erros da rodada anterior (ver nota no topo
> de `01-campos.md`).

## Confirmado — auditoria de código do OSG Work (11/08/2026)

### `[AUDIT-DP]` Módulo Diagnóstico Patrimonial

Leitura completa de `src/pages/equipe/osg/DiagnosticoPatrimonial.tsx`,
`BemModal.tsx` + `bem/BemDadosTab.tsx` + `bem/MatriculasSection.tsx`,
`MatriculaModal.tsx` + `matricula/MatriculaDadosTab.tsx`,
`titularidade/TitularInicialSection.tsx`, `TitularidadesPanel.tsx`,
`impedimentos/ImpedimentosPanel.tsx`, `CartorioSelect.tsx`,
`VincularMatriculaDialog.tsx`, `areaUtils.ts`, `useDiagnosticoPatrimonial.ts`,
`diagnosticoPatrimonialModalModels.ts`, mais os dois `.test.tsx`. Seguiu pistas
de parceria/composse até `useExploracaoRural.ts`, `FiscalReport.tsx`,
`EstruturaAtual.tsx` e `vocabulario.ts` por serem diretamente relevantes.
Produziu o inventário campo-a-campo de `BemModal`/`MatriculaModal`/
`TitularidadesPanel`/`ImpedimentosPanel` usado em `01-campos.md`, e achou:
- `bem.tipo_bem = 'AP'` já existe, tratado genericamente.
- `titularidade.fracao` opcional por decisão de produto (migration
  20260526140000, "composse sem percentual definido").
- `EstruturaAtual.tsx:122` — comentário de produção: *"contraparte
  (parceiro/arrendador) — pendência de migration"*.
- `vocabulario.ts:461-466` — comentário admitindo que o campo `posse` do
  gerador é um proxy, sem campo próprio no cadastro.
- `docTipos.ts`/`checklistPadrao.ts` já citam "Contrato de Composse
  registrado", "Minuta Contrato de Parceria Rural + Anexo" como tipo de
  documento esperado (metadado de checklist, não schema estruturado).

### `[AUDIT-QP]` Qualificação das Partes + Quadro Societário

Leitura completa de `QualificacaoDasPartes.tsx`, `PessoaModal.tsx` +
`pessoa/PessoaDadosTab.tsx` (`PfFields`/`PjFields`/`ParentescoFields`) +
`pessoa/AdministracaoPanel.tsx`, `QuadroSocietario.tsx`,
`QuadroEmpresaProprietaria.tsx`, `SocioModal.tsx`, `useQuadroSocietario.ts`.
Achados centrais:
- `pessoa.tipo_pessoa` só oferece PF/PJ na UI — sem opção "espólio" (grep
  confirmou zero ocorrências de "espólio" em `src/`).
- `quadro_societario.percentual`/`.data_referencia` existem na tabela mas
  **não são lidos nem gravados pela tela** — comentário explícito em
  `useQuadroSocietario.ts:12-13`. Participação é sempre `quotas / Σquotas`
  calculada em runtime.
- Catálogo `outorgante`/`outorgado`/`doador`/`donatario` (`binding.ts:34-37`)
  confirmado sem nenhum consumidor de cadastro em Qualificação das
  Partes/Quadro Societário nem em nenhum outro módulo lido.
- "Vértice" é termo geográfico (georreferenciamento de matrícula),
  desconectado do conceito de compossuidor — descarta uma hipótese que este
  levantamento havia levantado antes.

### `[AUDIT-MOTOR]` Motor de geração de documentos

Leitura completa de `src/lib/templates/{binding,mapeadores,composition,
render,vocabulario,index}.ts`, `useGerarDocumentoController.ts`,
`useDocumentoGerado.ts`, `GerarDocumento.tsx`, e os componentes de `gerar/`,
`montagem/`, `biblioteca/`. Confirmou, com citação exata de linha:
- `FonteLista` (`binding.ts:151`) tem só 4 valores: `quadro_societario |
  administracao | integralizacao | georef` — bate com o texto da BER-7.
- `PAPEIS_LISTA` (`binding.ts:173-224`) tem só 4 entradas plurais: `socios`,
  `administradores`, `integralizacoes`, `vertices` — nenhuma para
  compossuidores.
- O mecanismo de "N pessoas a partir de bloco único" é real e está em
  produção, mas é amarrado a uma única PJ escolhida via FK
  (`quadro_societario`/`administracao`) — não generaliza para outorgante/
  outorgado ad hoc nem compossuidor.
- A UI de Biblioteca/Montagem de Documentos é agnóstica ao tipo de
  documento (só uma exceção de compatibilidade legada) — um 6º template
  (Parceria/Composse) não precisaria de UI nova ali, só de dados/papéis
  novos no motor.
- Nenhum TODO, tipo ou função relacionado a "parceria"/"composse"/
  "compossuidor"/"instrumento de origem"/"fração ideal" existe no motor
  propriamente dito.

### `[AUDIT-DOC]` Documentos do Cliente, Checklists, Relatórios, Onboarding

Leitura completa de `FiscalReport.tsx`, `Relatorios.tsx`,
`DocumentosCliente.tsx` + `OrganizarDocumentos.tsx`, `ChecklistsDocumentos.tsx`
+ `ChecklistPendentes.tsx` + `DocumentosClienteChecklist.tsx`,
`CadastroPorDocumento.tsx` + `ClassificarDocumentos.tsx`, `Onboarding.tsx` e
todo `documentos/`, `checklists/`, `onboarding/`. Confirmou:
- O fallback exato do `FiscalReport.tsx`: `usaExploracoes =
  exploracoes.length > 0` (linha 77); vazio hoje → usa matrículas com
  Explorador/Outorgante/IRPF/Assinatura/Vigência/Sacas fixos em "—"
  (linhas 78-101).
- Nenhuma tela em `documentos/`, `checklists/` ou `onboarding/` grava em
  `exploracao_rural` — confirma que não há mutation em lugar nenhum do repo.
- `ChecklistsDocumentos.tsx` já tem uma aba "Planejamento tributário" — mas é
  checklist de **coleta de documento do cliente** para entregar ao Fiscal
  (`DocumentosClienteChecklist.tsx`), que cria um projeto quando completo.
  É diferente da tela nova `PlanejamentoTributario.tsx` (ALE-9) e das tabelas
  `planejamento_tributario`/`.._cenario` (EDU-13) — três peças complementares.

### `[DB-2]` Consultas ao vivo complementares (11/08/2026)

Via MCP do Lovable, mesmo `project_id`. Só `SELECT`.
- `sprints.goal` da Sprint 11 (`406dcfa9-...`): texto completo lido — é a
  fonte de `[SPRINT11-GOAL]` abaixo. Sprint 12 (`612b2c89-...`): `goal IS
  NULL`, 0 `sprint_deliverables` — confirmado duas vezes.
- `cliente` com `ambiente` (prod/dev) — achados: **Mms Agro** (prod,
  `40e25d24-...`), **José Eduardo (Mms)** (prod, `65071c03-...`), **Alessio
  Sansão** (prod `0c363319-...` / dev `63289a75-...`). Contagem cruzada:
  22 `pessoa`, 19 `titularidade`, 8 `quadro_societario`, 9 `matricula` — são
  clientes reais e substancialmente preenchidos, não stubs.
- `exploracao_rural`: `count(*) = 0`, confirmado de novo (terceira vez na
  sessão) — nenhuma linha, em nenhum ambiente, para nenhum cliente.
- `tmpl_documento`: só 6 templates ativos (`Apresentação Patrimonial PSA`,
  `Apresentação Societária PSA`, `Contrato Social — Sociedade Limitada
  [Agro/Participações]`, `Matrícula Digitada`, `Teste V1`) — nenhum
  Parceria/Composse/agrário.
- `documento_gerado`: só 6 linhas, todas do Alessio Sansão (dev), todas
  template `Contrato Social — Sociedade Limitada (Agro)`, status
  `revisao`/`rascunho` — nenhum documento gerado para Mms Agro (prod) nem
  para nenhum tipo agrário.
- Git log de `src/hooks/useExploracaoRural.ts`: 1 único commit,
  `2026-07-17`, autor `gpt-engineer-app[bot]` — criado há ~3 semanas, sem
  histórico de evolução.

### `[SPRINT11-GOAL]` Objetivo da Sprint 11 (`sprints.goal`)

Texto completo da sprint em andamento (10-21/08/2026), não lido antes desta
revisão. Trecho decisivo: *"Duas frentes de levantamento que são portão da
Sprint 12: governança (...) e contratos rurais (campos de parceria e composse
+ o motor de partes escolhidas à mão). Quem levanta constrói na próxima."* E,
sobre a tarefa irmã: *"Telas novas de cadastro (28h) — proposta comercial (...)
e a tela onde o Fiscal preenche o planejamento tributário e devolve o
resultado para a área."* Esta é a fonte que resolve, sem ambiguidade, o que
esta tarefa pede e para onde o resultado vai.

## Catálogo de design do gerador (interno — base em contratos, mas sem citação por cláusula)

### `[CAT]` Catálogo de Vagas, Famílias de blocos e Flags (11/08/2026)

`docs/osg/catalogo-familias-e-flags.md` — documentação de design do gerador de
documentos, listada no próprio card da ALE-3 como leitura obrigatória antes de
mapear campo ("não reescreva, converta em campo"). Não lido nas rodadas
anteriores deste levantamento — lido agora, por completo. Cobre o capítulo
"Documentos agrários: Parceria e Composse", que lista vagas que não estavam
nesta tabela: benfeitorias, anuência a penhor, culturas permitidas, cultura
específica (algodão), instrumento de origem categórico (parceria/arrendamento/
herança) e prazo de indivisão da Composse. O documento diz que é "a partir dos
contratos reais analisados", mas **por linha, a seção de Parceria/Composse não
cita cláusula nem cliente específico** (diferente da seção de Contrato Social,
que cita evidência por nome) — por isso essas vagas entram como **MAPEADO**, não
**CONFIRMADO**, em `01-campos.md`: o catálogo define a vaga, não corrobora que
ela está no contrato assinado. Fonte não é evidência.

## Confirmado — fonte primária

### `[DB]` Schema do banco em produção

Consultado ao vivo via MCP do Lovable (`query_database`), `project_id
4cb1f76a-b443-437e-a047-67a69019a54a`, em 11/08/2026. Só `SELECT` — nenhuma escrita.

- `information_schema.columns` de `matricula`, `titularidade`, `quadro_societario`,
  `pessoa`, `exploracao_rural`.
- Enum `osg_tipo_exploracao` via `pg_enum`/`pg_type`.
- `SELECT count(*) FROM exploracao_rural` → **0 linhas em produção** (confirma a
  suspeita do próprio card de que a tabela existe mas está vazia).
- `pessoa` tem 41 colunas (o card estimava "cerca de 40" — bateu).

### `[CHI-PAR]` Chiapinotto — Instrumento Particular de Parceria

Google Drive, pasta `Agro São José / 1. Execução / Doc. Cliente / Documentos
Agrários / Contrato de Parceria`. Dois arquivos:
`Contrato de Parceria Irmãos Chiapinotto.pdf` (assinado, 10/10/2022, 8 páginas) e o
`Anexo Único` correspondente (2 páginas, 6 imóveis a–f). Lido página a página
(visão, PDF escaneado sem camada de texto).

### `[CHI-COM]` Chiapinotto — Instrumento de Composse Rural Pro Indiviso

Mesma árvore do Drive, pasta `Contrato de Composse`.
`Contrato de Composse Rural Irmãos Chiapinotto.pdf` (assinado, 11/10/2022, 8
páginas) + Anexo Único (2 páginas, os **mesmos** 6 imóveis do `[CHI-PAR]`). Lido
página a página.

### `[MMS-DP]` MMS Agro — Diagnóstico Patrimonial

Local, `Downloads\SOPs\MMS -Exemplos\Exemplo organizado - recebido da
OSG\Diagnóstico Patrimonial\`. Dois arquivos abertos com `openpyxl`:
`VF_Diagnóstico Patrimonial_MMS.xlsx` (preenchido, 2 abas: `Bens da Sucessão` +
`Aumento MMS Agro`) e `Diagnóstico Patrimonial_ Modelo.xlsx` (template em branco, 3
abas: `Bens da Sucessão` + **`EXPLORAÇÃO RURAL`** + `EMPRESAS DO GRUPO`).

### `[MMS-PAR]` MMS Agro — Instrumento Particular de Parceria

Mesma pasta local. `Instrumento Particular de Parceria para Fins de Exploração
Agropecuária _MMS Agro Ltda.pdf` (assinado, 10/10/2022, 8 páginas) + `Anexo Único
do_Instrumento Particular de Parceria...pdf` (2 páginas, 6 imóveis a–f). Extraído
com `pypdf` — texto nativo, sem OCR necessário.

### `[MMS-COM]` MMS Agro — Contrato de Composse Rural

Mesma pasta local. `Contrato _Composse Rural _Jose Eduardo e Esposa.pdf` (assinado,
11/10/2022, 8 páginas) + `Anexo Único_Composse Rural_ José Eduardo e Esposa.pdf` (2
páginas, os **mesmos** 6 imóveis do `[MMS-PAR]`). Extraído com `pypdf`.

### `[NOD-DP]` Grupo Nodari — Diagnóstico Patrimonial v10

`G:\Drives compartilhados\TAX - Clientes Pontuais\Pontuais\Grupo Nodari\1.
Execução\Doc. Prado\Diagnóstico Patrimonial, Nodari, v10.xlsx`. Cliente TAX (não
OSG), família rural em Barra do Bugres/MT e Salto do Céu/MT. 6 abas:
`IMÓVEIS RURAIS`, `IMÓVEL URBANO`, **`CONTRATOS AGRÍCOLAS`** (usada, 20 linhas
reais), `CONTRATOS DE COMPRA E VENDA`, `EMPRESAS`, `INFORMAÇÕES PESSOAIS`.
**Arquivo em edição no momento da leitura** (`.~lock` de outro usuário) — trabalho
vivo, não um exemplar fechado.

### `[NOD-WP]` Grupo Nodari — Working Paper de Planejamento Tributário

Mesma pasta. `WP_Grupo Nodari_Planejamento Tributário_MM082025.xlsx`. Aba
`Imóveis Rurais` usada — tem a coluna `Tipo de Exploração` com valores reais
("Imóvel Próprio", "Cessão de parceria agrícola por Usinas Itamarati S.A.",
"Parceria agrícola com Guanabara Agrícola Ltda") e a coluna `Contribuinte`
(distinta de `Proprietário`), com uma coluna `Risco` que já documenta casos de
declaração indevida no IRPF.

### `[TV-ADT]` Terra Viva Agropecuária — 1º Termo Aditivo ao Contrato de Parceria

`G:\Drives compartilhados\OSG - Sucessão\Terra Viva\Documentos Psa\Documentos
Definitivos\Diagnóstico Tributário e Contratos Agrários Atuais\Contrato de
Parceria\1° Termo Aditivo ao Contrato de Parceria Terra Viva x Nilson, Luciano e
Debora.pdf`. 15 páginas, texto nativo extraído com `pypdf`. Contrato original de
01/07/2020, vigência de 3 anos; este é o 1º aditivo (há também um 2º, e o mesmo
padrão para a Composse — não abertos, só listados). A mesma pasta do cliente tem
ainda `Contrato de Arrendamento` e contratos antigos marcados no próprio nome do
arquivo como `VENCIDO` / `PARC. VENCIDA`.

### `[SERIO]` Estudo cálculo da parceria na atividade pecuária — família Serio

Google Drive, `Estudo cálculo da parceria na atividade pecuária.pdf/.docx`
(Prado Suzuki Associados, Cuiabá, 02/05/2018). Estudo técnico real, entregue,
explicando o cálculo do percentual da parceria (10% PJ / 90% PF) por etapa do
ciclo pecuário (cria → recria/engorda), com sociedades diferentes do grupo em cada
etapa. Existe também uma versão rascunho (`VR_...docx`) com comentários de revisão
ainda em aberto — **essa versão não é fonte**, só mostra que o posicionamento sobre
nota fiscal de transferência de frutos era, à época, uma dúvida não resolvida
internamente.

## Mapeado, não validado — análise/entrevista de terceiro

### `[MAP]` `MAPEAMENTO_Agrarios.md`

Documento de mapeamento de processo ("Pilar 3 — Instrumentos Agrários"), baseado em
entrevistas datadas de 14/05/2026 (falas atribuídas a "Anne" e "Jaqueline"). Descreve
5 etapas (Planejamento Tributário → Distrato → Parceria → Composse →
Aditivos/Manutenção) com gargalos, responsáveis e documentos de entrada/saída.
**Tem `[A MAPEAR]` em quase todo campo de horas, taxa de erro e volume** — quem
escreveu deixou claro que aquilo não estava fechado.

### `[ROAD]` `RELATORIO_ROADMAP_P2_CONTRATOS.txt`

Relatório datado de 24/06/2026, cruza o mapeamento de processos do P2 com horas por
projeto e status de template no gerador ("OSG Work"). Lista os 16 processos do P2,
inclusive P2.09 (Planejamento Tributário Rural, 7,55h), P2.14 (Contrato de Parceria,
12,55h) e P2.15 (Contrato de Composse, 6,6h) — todos com `template_documento:
AUSENTE`.

### `[PAR]` `2026-07-25_PARECER_Metodologia_Migracao_Rural_PFxPJ.md`

Parecer de 25/07/2026 (solicitado pela Patrícia), que audita um estudo de
metodologia (autoria do Felipe) contra o roadmap v7. Aplicado no `roadmap.json` na
mesma data — criou marcos novos (`P2-SPEC-ESTRUTURA-RURAL` em S16,
`P2-INSTRUMENTOS-RURAIS`/`P2-AC-INTEGRALIZACAO` em S19–S21) e **descartou** a
proposta de um produto P8 separado. É a fonte mais recente e mais formal sobre o
assunto, mas ainda assim é parecer — não é decisão fechada nos pontos que o próprio
documento lista na seção 8 ("Decisões que não são minhas").

## Não abertos nesta rodada (candidatos, se quiser aprofundar)

Clientes com pasta própria de "Instrumentos/Contratos Agrários" no
`OSG - Sucessão`, ainda não lidos: **Cortezia**, **Rossato**, **Zuttion**,
**Potrich**. Mapeamento de onde estão em
`OSG - Sucessão/<Cliente>/Documentos.../Instrumentos Agrários` ou
`.../Contratos Agrários` — achado por busca de nome de pasta, não por leitura de
conteúdo.
