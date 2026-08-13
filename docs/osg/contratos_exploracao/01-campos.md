# Tabela de campos

> **NOTA DE ARQUIVO:** esta é uma nota de trabalho anterior e contém hipóteses
> superadas. A fonte canônica de aceite é
> [`../levantamento-contratos-rurais.md`](../levantamento-contratos-rurais.md).

> **Revisão 1 (11/08/2026), depois de auditoria de código:** a primeira rodada não
> tinha lido o código do OSG Work. Corrigiu `quadro_societario.percentual`/
> `.data_referencia` de "confirmado" para célula morta, e removeu a frente
> "Planejamento Tributário Rural" (é da ALE-9/EDU-13, não desta tarefa).
>
> **Revisão 2 (11/08/2026), depois de entender a Oficina de Contratos:** faltava a
> peça que explica **por que** existe uma tabela nova em vez de só um campo em
> `bem`/`matrícula`. A OSG Work é, na essência, cadastro de entidades (pessoa, bem,
> matrícula, quadro societário) que a Oficina de Contratos **lê e transforma em
> documento**. `quadro_societario` não é "cadastro do Contrato Social" — é cadastro
> do fato de negócio (fulano é sócio de tal empresa, com tantas quotas), e o
> Contrato Social é o artefato **derivado** disso, gerado sob demanda
> (`documento_gerado`). Parceria/Composse é a mesma categoria: o fato de negócio é
> "outorgante cede a outorgado o uso de tal imóvel, em tal regime, com tal %" — isso
> é o que este levantamento cadastra. **O contrato não é uma entidade própria para
> cadastrar** (isso seria repetir o erro que a área já sofre com a digitação de
> limites/confrontações duas vezes) — é o documento que a Oficina de Contratos
> vai gerar a partir do cadastro daqui, do mesmo jeito que já gera o Contrato
> Social a partir de `quadro_societario`. Isso muda a seção D (era 50/50, agora tem
> uma recomendação mais firme) e acrescenta a coluna **Marcador do gerador** abaixo
> — o nome de binding (`{{outorgante.nome}}` etc.) que cada campo alimentaria,
> exigido pelo card original e que a Revisão 1 ainda não tinha preenchido.
>
> **Revisão 3 (11/08/2026), depois de reler a ALE-3 ao vivo** (o `/compact` tinha
> perdido o texto completo do card): o card manda ler primeiro o capítulo de
> Parceria/Composse do
> [`catalogo-familias-e-flags.md`](../catalogo-familias-e-flags.md) — as "vagas"
> já escritas do gerador — e converter em campo, não redescobrir do zero. Não
> tinha lido esse arquivo até agora. Ele traz 5 vagas que não estavam nesta
> tabela: **benfeitorias** (indenizáveis/não), **anuência a penhor/
> financiamento**, **culturas permitidas** (lista — já citada no card original,
> nunca tinha entrado aqui), **cultura específica com bloco condicional** (ex.:
> algodão) e **prazo de indivisão** da Composse (separado da vigência da
> Parceria). Ver seção C. Também reconferi `exploracao_rural` coluna a coluna
> contra o schema vivo: duas correções — `sacas_por_hectare` e `declarado_irpf`
> **já existem** como colunas mortas (a rodada anterior tinha marcado um deles
> "sem lar em lugar nenhum", que é diferente de "tem lar, mas morto"); e a coluna
> real do segundo lado da exploração é **`explorador_nome`**, não "outorgado" —
> esse é o nome de um catálogo diferente (o do gerador, `binding.ts`, sem uso).
> É uma inconsistência real entre dois sistemas, não resolvida aqui — ver a nota
> ao fim da seção C e `04-perguntas-abertas.md`.

Chaves de fonte em [`03-fontes-e-lastro.md`](./03-fontes-e-lastro.md). Selo:
**CONFIRMADO** = schema vivo + **UI real usa o campo** · **SCHEMA MORTO** = a
coluna existe, nenhuma tela usa · **MAPEADO** = só análise interna, não verificada.
Marcador do gerador: quando já existe e tem consumidor real, sem aspas de dúvida;
quando é proposta (ninguém implementou ainda), marcado **(novo, a confirmar com o
Bernardo/BER-7)** — é sugestão seguindo a convenção já usada (`papel.campo`), não
decisão fechada.

## A. Já existe e funciona — schema + UI confirmados

| Campo | Tabela.coluna | Marcador do gerador | Lastro | Selo |
|---|---|---|---|---|
| Área do documento / real / explorada / unidade | `matricula.area_documento/.area_real/.area_explorada/.area_unidade` | `imovel.area_documento` etc. — já usados em templates reais | `[AUDIT-DP]` — `MatriculaDadosTab.tsx`, seção "Localização e áreas" | CONFIRMADO |
| Georreferenciamento | `matricula.georreferenciado` | `imovel.georreferenciado` (via `qualificacaoImovel`, já existente) | `[AUDIT-DP]` | CONFIRMADO |
| **Tipo de exploração/posse** | `matricula.tipo_exploracao_posse` | não é marcador de texto — é atributo de UI/relatório, não entra no binding hoje | `[AUDIT-DP]` — select raso, sem contraparte | CONFIRMADO, **raso** — ver C |
| **Tipo de bem = "AP"** | `bem.tipo_bem` | — | `[AUDIT-DP]` — tratado como bem genérico | CONFIRMADO existir, **eixo errado** — ver D |
| Fração de titularidade, opcional por composse indefinida | `titularidade.fracao` | `imovel.percentual`/`.fracionado`/`.remanescente` — já existem, semântica de fração de **propriedade**, não de composse de posse (ver C) | `[AUDIT-DP]` — migration 20260526140000 | CONFIRMADO |
| Cônjuge / regime de bens / parentesco | `pessoa.conjuge_id`, `.regime_bens`, `parentesco` | `pessoa.conjuge.nome`, `pessoa.regime_bens` (caminho pontilhado já existente) | `[AUDIT-QP]` | CONFIRMADO |

## B. Existe no schema, mas é célula morta — corrigido nesta revisão

| Campo | Tabela.coluna | O que a auditoria achou | Selo |
|---|---|---|---|
| Percentual / data de referência do sócio | `quadro_societario.percentual`, `.data_referencia` | `[AUDIT-QP]` — não usados pela tela; participação é sempre `quotas / Σquotas` em runtime | SCHEMA MORTO |
| Tabela `exploracao_rural` inteira | `exploracao_rural.*` | `[AUDIT-DP]`+`[AUDIT-QP]`+`[AUDIT-DOC]`: só `useQuery`, sem mutation, sem modal. Único consumidor: `FiscalReport.tsx` (leitura) | SCHEMA MORTO — mas é o **fato de negócio certo** (ver D) |
| Catálogo `outorgante`/`outorgado`/`doador`/`donatario` | `src/lib/templates/binding.ts:34-37` | `[AUDIT-MOTOR]`+`[AUDIT-QP]`: entrada de catálogo, zero consumidor — nenhum mapeador, nenhuma UI, nenhum template os usa | SCHEMA MORTO (catálogo sem uso) — **é justamente o marcador que falta usar** |
| Sacas por hectare (remuneração fixa) | `exploracao_rural.sacas_por_hectare` | Coluna existe, mas cobre só a unidade fixa "sacas/ha" — sem periodicidade nem unidade livre. Corrige a seção C, que numa rodada anterior tinha marcado este campo como "sem lar em lugar nenhum" | SCHEMA MORTO |
| Declarado no IRPF, por exploração | `exploracao_rural.declarado_irpf` | Coluna existe; distinta do "Declarado IRPF" do Diagnóstico Patrimonial, que é por matrícula/planilha do cliente — esta seria por instrumento de exploração | SCHEMA MORTO |

## C. A lacuna real, admitida no próprio código (+ vagas do catálogo do gerador)

`src/components/equipe/osg/relatorios/EstruturaAtual.tsx:122`:
> *"contraparte (parceiro/arrendador) — pendência de migration"*

`matricula.tipo_exploracao_posse` diz *que tipo* de exploração é, não diz *com quem*.
Campos sem nenhuma coluna genuína — os 6 primeiros confirmados em contratos reais
ou por schema vivo, os 5 seguintes vêm do capítulo de Parceria/Composse do
[`catalogo-familias-e-flags.md`](../catalogo-familias-e-flags.md) (as "vagas" que o
próprio card da ALE-3 manda ler e converter em campo — não achei citação de cláusula
específica nos 3 contratos reais para essas 5, então ficam **MAPEADO** até
reconferir o texto do contrato, não CONFIRMADO só porque o catálogo existe — fonte
não é evidência):

| Campo | Marcador do gerador (proposto) | Lastro | Selo |
|---|---|---|---|
| Partilha de frutos — par de % outorgante/explorador, soma 100% | `exploracao.percentual_outorgante` / `.percentual_explorador` **(novo — nome provisório, ver nota de nomenclatura abaixo)** — não confundir com `imovel.percentual` (fração de propriedade, já existe, outra semântica) | 3 valores reais e distintos: 30/70, 10/90, 20/80 | CONFIRMADO existir, sem lar no schema |
| Remuneração como quantidade fixa por período | `exploracao.quantidade` / `.periodicidade` **(novo, parcial)** — `exploracao_rural.sacas_por_hectare` já existe como coluna morta (ver B), mas só cobre a unidade fixa "sacas/ha" | Contrato real de cana-de-açúcar, quantidade variando por tramo | CONFIRMADO existir, **lar parcial** (corrigido nesta revisão — não é mais "sem lar em lugar nenhum") |
| Fração ideal por compossuidor | `compossuidor.fracao_ideal` **(novo papel — hoje `PAPEIS_LISTA` só tem `socios`/`administradores`/`integralizacoes`/`vertices`)** | Contrato real, 50/50 | CONFIRMADO, sem lar |
| Instrumento de origem da posse — **categórico**: parceria · arrendamento · herança | `exploracao.tipo_instrumento_origem` **(novo)** + vínculo à Parceria de origem quando o tipo for "parceria" | Caso "parceria": CONFIRMADO em contrato real (preâmbulo remete por data e partes, `[CHI-COM]`/`[TV-ADT]`). Casos "arrendamento"/"herança": só `[CAT]` — o catálogo chama de "nova entidade", com partes próprias (outorgante/herdeiros/meeira), não observados em contrato real nesta rodada | CONFIRMADO (parceria) / MAPEADO (arrendamento, herança) |
| Nome de giro do grupo de composse | `composse.nome_giro` **(novo, mas derivado — o gerador computa, não lê de coluna)** | Contrato real: "[nome] E ESPOSA" | CONFIRMADO, campo derivado |
| **Tipo de pessoa "Espólio"** | `pessoa.tipo_pessoa` só oferece PF/PJ — sem "espólio" | `[AUDIT-QP]`; aparece em documento real (Nodari) | Achado colateral, mesmo domínio |
| Benfeitorias — indenizáveis ou não indenizáveis ao fim do contrato | `exploracao.benfeitorias_indenizaveis` **(novo)** | `[CAT]` — flag `benfeitorias_indenizaveis`, manual-projeto | MAPEADO |
| Anuência a penhor/financiamento do imóvel | `exploracao.permite_penhor` **(novo)** | `[CAT]` — flag `permite_penhor`, manual-projeto | MAPEADO |
| Culturas permitidas (lista) | `exploracao.culturas[]` **(novo, iteração)** | `[CAT]` — já citado no card original da ALE-3 ("as culturas permitidas"), nunca tinha entrado nesta tabela até esta revisão | MAPEADO |
| Cultura específica (ex.: algodão) — bloco condicional de qualidade/compensação | `exploracao.tem_cultura_algodao` **(novo)** | `[CAT]` — flag `tem_cultura_algodao` | MAPEADO |
| Prazo de indivisão da Composse — determinado ou prorrogável (separado da vigência da Parceria) | `composse.indivisao_prorrogavel` **(novo)** | `[CAT]` — flag específica da Composse, distinta de `vigencia_prorrogavel` (que é da Parceria) | MAPEADO |

`outorgante` (marcador de A/B) já existe no catálogo do gerador e este
levantamento seria o primeiro consumidor real dele. **Inconsistência de nome
achada nesta revisão:** a coluna real de `exploracao_rural` para o segundo lado
é **`explorador_nome`** (schema vivo, conferido coluna a coluna) — não
`outorgado`, que é o nome do catálogo *do gerador* (`binding.ts:34-37`, célula
morta, catálogo diferente, sem FK com `exploracao_rural`). O card manda usar o
nome que o sistema já usa; aqui há dois sistemas com nomes diferentes para o que
parece o mesmo papel. Proposta desta revisão: marcador `explorador.nome` (segue
a coluna real) — mas é decisão de nomenclatura do dia 1 com o Bernardo (BER-7),
não fato a declarar sozinho. Ver `04-perguntas-abertas.md`. Só compossuidor
(papel plural, N pessoas) exige entrada nova em `PAPEIS_LISTA`, de qualquer forma.

## D. A decisão de arquitetura — agora com recomendação, não 50/50

**O contrato não é uma entidade para cadastrar.** É o documento que a Oficina de
Contratos gera a partir de um cadastro de **relação de negócio** — a mesma
categoria de `quadro_societario` (sócio↔empresa) e `titularidade` (pessoa↔imóvel),
não a categoria de `documento_gerado` (o artefato). A pergunta que sobra é só onde
essa relação mora:

**Caminho 1 — estender `bem.tipo_bem = 'AP'`.** Responde a pergunta errada: `AP` é
sobre **classificar um ativo do cliente** (eixo do diagnóstico patrimonial — "o
cliente possui um direito de arrendamento/parceria"), não sobre **registrar a
relação outorgante↔outorgado** com dois lados, vigência e %. Forçar a relação
dentro do cadastro de um único lado (o bem do cliente) não tem como representar
bem quem é a contraparte nem uma matrícula sendo repartida entre vários contratos.

**Caminho 2 — dar interface a `exploracao_rural`.** Consistente com o padrão que já
existe (`quadro_societario` como tabela de relação, com FK para os dois lados via
`bem_id`/`pessoa_id`, lida ao vivo pelo gerador). Falta: modal (resolvido — ver
padrão de combobox abaixo), mutation, e a 5ª `FonteLista` em `binding.ts` que o
BER-7 já cita como gargalo.

**Recomendação: Caminho 2.** Não é decisão fechada — quem bate o martelo é a
Sprint 12 — mas agora com argumento, não só preferência: é o único dos dois que
segue o mesmo desenho que o resto do sistema já usa para "fato de negócio que
alimenta um gerador".

**Padrão de UI resolvido para o vínculo com o imóvel (independe de qual caminho
vencer):** combobox com CRUD embutido, igual ao `CartorioSelect` que já existe no
`MatriculaModal` (`[AUDIT-DP]`) — busca no que já existe; se não achar, cadastra na
hora, sem sair do modal. Só "área cedida nesta exploração" continua campo
genuinamente novo, sempre — a mesma matrícula pode estar dividida entre vários
contratos (confirmado em `[NOD-DP]`/`[TV-ADT]`).

## E. Relação com Planejamento Tributário — tarefa irmã (ALE-9/EDU-13), não desta

O percentual da parceria **não é campo desta tarefa**. Já tem tabela definida, na
mesma sprint, por outra pessoa (Eduardo, EDU-13):

```
planejamento_tributario.pct_parceria   numeric, 0-100, DIGITADO pelo Fiscal
```

Um valor por `(cliente_id, tipo)`, não por contrato — e a tela que o preenche
(`PlanejamentoTributario.tsx`) é a ALE-9. **Este levantamento trata o percentual
como referência externa**, não recria o input.

Pergunta que sobra, genuinamente desta tarefa: o contrato precisa de uma **cópia**
do percentual no momento da assinatura (histórico imutável) ou só **lê** o valor
vigente? Decide se a relação de exploração precisa de coluna própria de percentual
ou só de uma FK para o estudo.

## F. Achado de arquitetura de documento (contratos reais, não código)

- **Aditivos seguem o mesmo padrão de Alteração Contratual**: delta + consolidação.
  Confirmado em aditivo real (Terra Viva). Reaproveita `documento_anterior_id`/
  `documento_raiz_id` + snapshot já existentes em `documento_gerado`.
- Vigência prorrogável por tempo indeterminado sem aditivo; um imóvel sai da
  Composse automaticamente quando a Parceria correspondente termina, sem aditivo —
  confirmado em 2 contratos reais.
- O motor já itera N pessoas a partir de **uma única PJ escolhida**, via
  `quadro_societario`/`administracao` (`[AUDIT-MOTOR]`). Não serve para
  outorgante/outorgado ad hoc nem compossuidor — gargalo do BER-7: uma 5ª fonte em
  `binding.ts:151` (hoje `quadro_societario | administracao | integralizacao |
  georef`).

## G. Mapeado, não validado (só como hipótese em conversa, nunca como fato)

- As 5 etapas do processo (Planejamento Tributário → Distrato → Parceria →
  Composse → Aditivos) — `[MAP]`.
- Método de montagem do Anexo por cópia do Contrato Social — `[MAP]`, coerente mas
  não confirmado como processo atual.
- Percentual "típico" 20/80 — `[MAP]`/`[ROAD]`; só 1 dos 3 valores reais bate. Moda,
  não regra.
- Documentos/checklists já esperam "Contrato de Composse registrado", "Minuta
  Contrato de Parceria Rural + Anexo" (`docTipos.ts` — CONFIRMADO existir como
  metadado de checklist, não como schema estruturado).
