# 13 — Auditoria: cadastro vs. condicional vs. modelo/instrumento

> Levantamento pedido antes de incorporar o mockup à OSG Work de verdade: **não
> edita nada aqui** — só mapeia, campo a campo, se `ExploracaoRuralDraft`
> (`src/previews/contratosExploracaoModel.ts`) invadiu espaço que é de cadastro,
> ou empurrou pra cadastro algo que só devia existir na hora de gerar o
> documento. Método: ler o schema real (Supabase MCP, projeto dev
> `vgzomuwnsdgrxbkyoavq`) e o código que já resolve esse problema pro Contrato
> Social — o único tipo de contrato da OSG Work que já roda em produção — e usar
> os dois como vara de medir.

## 1. O modelo real tem 3 camadas, não 2

A pergunta do pedido ("cadastro é uma coisa, modelo de contrato é outra") supõe
duas camadas. Lendo o Contrato Social de ponta a ponta, ele na verdade resolve
o problema com **três**:

| Camada | O que guarda | Exemplos reais | Onde vive |
|---|---|---|---|
| 1. Cadastro atômico | Atributos de UMA entidade | `pessoa`, `bem`, `matricula`, `cartorio` | tabela própria, 1 linha = 1 entidade |
| 2. Cadastro relacional / instrumento | Relação DURÁVEL entre entidades, com vida própria fora de qualquer PDF | `titularidade` (matrícula×pessoa), `quadro_societario` (empresa×sócio), `administracao` (empresa×administrador), `parentesco` | tabela de junção, sobrevive a qualquer geração de documento |
| 3. Geração de documento | Escolha feita NA HORA de montar UM PDF específico — inclusive texto digitado que não tem cadastro nenhum atrás | `documento_gerado.snapshot_dados` (`selecao`, `registroPorBinding`, `registrosPorLista`, `valoresLivres`), `tmpl_flag` tipo `manual`, `CAMPOS_MANUAIS` (`src/lib/templates/vocabulario.ts`) | jsonb de um evento de geração, ou formulário efêmero da tela Gerar |

A camada 2 é a que o pedido original não nomeou, e é onde `exploracao_rural`
mora. Uma Parceria ou Composse **não é um evento de geração de PDF** — é uma
relação jurídica que dura anos, aparece em relatório fiscal, tem vigência,
pode ser consultada sem que ninguém gere um Word. Ela é estruturalmente igual
a "sócio X tem tal fração da empresa Y" (`quadro_societario`) ou "pessoa X é
titular de tal fração da matrícula Y" (`titularidade`) — não a "este PDF do
Contrato Social específico usou estes dados". `documento_gerado` é o análogo
de "eu gerei um Word citando esse quadro societário hoje", não o análogo de
`exploracao_rural`.

**Isso já responde à preocupação central do pedido**: não houve confusão de
cadastro com modelo. O mockup colocou `exploracao_rural` (+ o que falta nela)
na camada 2 — igual a `titularidade`/`quadro_societario` — e isso é o lugar
certo. O que a auditoria abaixo encontra são gaps de forma dentro da camada 2
(cardinalidade) e uma dúzia de campos que na really deveriam estar na camada 3.

## 2. Achado #1 (o mais importante): `exploracao_rural` já nasceu sem cardinalidade — e a prova de que isso é bug está no próprio Drive da OSG

Confirmado agora no schema real (`information_schema.columns`, 19/08 e
re-confirmado hoje):

```
exploracao_rural: id, cliente_id, referencia, tipo_exploracao, bem_id (nullable, SINGULAR),
  imovel_descricao, matricula_texto, municipio, uf, area_total, area_explorada, area_unidade,
  explorador_pessoa_id (nullable, SINGULAR), explorador_nome, outorgante_pessoa_id (nullable, SINGULAR),
  outorgante_nome, declarado_irpf, data_assinatura, data_encerramento, vigencia, sacas_por_hectare,
  + auditoria
```

Três colunas — `bem_id`, `explorador_pessoa_id`, `outorgante_pessoa_id` — são
todas **singulares**: a tabela assume 1 imóvel e 1 explorador por instrumento.
A própria pasta `Documentos Agrários/` que serviu de insumo para este mockup
prova que isso não é o mundo real:

- `exemplo-05-anexo-imoveis-bela-vista.md`: uma ÚNICA Composse lista **15
  imóveis**, vindos de **6 instrumentos de origem diferentes** com 5
  proprietários diferentes.
- `[BV-PAR]` (a Parceria do mesmo cliente): **3 outorgados** numa parceria só
  (José, Maria e um terceiro).

Ou seja: o próprio material de referência da OSG contradiz o desenho singular
da tabela. Isso não é um problema que o mockup introduziu — a tabela já veio
assim — mas é o motivo pelo qual `ExploracaoRuralDraft` teve que inventar
`imoveis: ExploracaoImovelDraft[]`, `exploradores: ParteSimplesDraft[]` e
`compossuidores: CompossuidorDraft[]` como arrays no rascunho, sem lugar
correspondente no banco ainda.

### A forma certa já existe no schema — só não foi copiada para `exploracao_rural`

`titularidade` resolve EXATAMENTE o mesmo problema para matrícula×pessoa:

```
titularidade: id, matricula_id, titular_pessoa_id, tipo, fracao, integralizador, bem_id, + auditoria
```

Uma matrícula pode ter N titulares, cada um com sua fração — via tabela de
junção, não via array/jsonb na matrícula. **Esse é o precedente a copiar**,
não `documento_gerado.snapshot_dados.registrosPorLista` (que é para a CAMADA 3
— seleção efêmera dentro de um PDF — não para a relação durável da camada 2).

Recomendação de forma (sem tocar no banco agora, só para constar no
levantamento):

- `exploracao_rural_imovel` (exploracao_rural_id, matricula_id, area_explorada,
  tipo_instrumento_origem, instrumento_origem_id → autorreferência a outra
  `exploracao_rural`, situacao_origem) — resolve `imoveis[]`.
- `exploracao_rural_parte` (exploracao_rural_id, pessoa_id, papel
  ['explorador'|'compossuidor'|'administrador_nomeado'], fracao nullable) —
  resolve `exploradores[]`, `compossuidores[]` e `administradoresNomeados[]`
  com uma única tabela, do mesmo jeito que `titularidade.fracao` já serve
  proprietário puro (fracao null) e compossuidor (fracao preenchida).

## 3. Achado #2: `matricula.area_explorada` já existe — e é OUTRO número, não o mesmo

`matricula` tem sua própria coluna `area_explorada` (confirmada agora:
`numeric`, nullable). É tentador achar que
`ExploracaoImovelDraft.areaExplorada` devia ler dali em vez de ser campo do
rascunho — mas os dois são conceitos diferentes:

- `matricula.area_explorada` é um fato sobre O IMÓVEL (quanto dele está em uso,
  de modo geral).
- `ExploracaoImovelDraft.areaExplorada` é quanto ESTE INSTRUMENTO ESPECÍFICO
  cedeu/cobre daquela matrícula — e o próprio `exemplo-05` prova que os dois
  divergem: a "área cedida" de cada item do Anexo Único é sistematicamente
  MENOR que a "área total do imóvel" da mesma linha (ex.: item a, 234,00 ha
  cedidos de um imóvel de 295,86 ha), e uma mesma matrícula pode em tese estar
  repartida entre instrumentos diferentes com áreas diferentes em cada um.

**Não é achado de erro nosso** — é um alerta para quem for migrar: não decida
"já existe matricula.area_explorada, dá pra deletar o campo do item" só porque
o nome bate. São números com significado diferente; o campo do item
(`ExploracaoImovelDraft.areaExplorada`, futuramente
`exploracao_rural_imovel.area_explorada`) é o correto e tem que continuar
existindo ao lado da coluna da matrícula, não em vez dela.

## 4. Achado #3: o mockup já reproduz, sem saber, um padrão que o schema já usa em `matricula`

`ExploracaoImovelDraft` tem `tipoInstrumentoOrigem` + `instrumentoOrigemRef`
(FK para outro instrumento cadastrado) + `origemExterna` (texto/estrutura
livre, para quando a origem é de um terceiro que não é cliente) +
`situacaoOrigem` (computado). Isso é a mesma ideia, campo por campo, de:

```
matricula.matricula_anterior_id (uuid, FK autorreferente)
matricula.matricula_anterior_texto (text, fallback livre)
matricula.origem_descricao (text)
```

`matricula` já resolve "esta matrícula vem de uma anterior, que pode ou não
estar cadastrada aqui" com FK opcional + texto livre de fallback. O mockup
chegou à mesma forma para "este imóvel do instrumento vem de outro
instrumento, que pode ou não estar cadastrado aqui" de forma independente —
o que é evidência de que o desenho está certo (é o padrão que o próprio schema
já usa pra linhagem), e não um vazamento: `origemExterna` está corretamente
fora de qualquer tabela de cadastro, porque descreve um terceiro que
**nunca vai ter registro de `pessoa`** (5 das 6 origens do `exemplo-05` não
são clientes da PSA).

## 5. Achado #4 (o mais tranquilizador): testemunhas já são um mecanismo real, com o MESMO nome

> **Confirmado ao vivo em produção** (capturas de tela da Oficina de Contratos
> real, `psaconsultores.com.br/equipe/osg/work/gerar-documento`, não só pelo
> código): a tela final de "Gerar Documento" separa o painel "Conferência dos
> dados" ("Tudo abaixo veio do cadastro — confira antes de baixar") de um
> segundo painel, **"Preencher à mão" ("Estes campos do modelo não vêm do
> cadastro")**, com exatamente os 10 campos de `CAMPOS_MANUAIS` abaixo, um
> input de texto por campo, terminando num botão "Ajustar dados manualmente".
> Quando um papel de lista vem vazio do cadastro (ex.: "Administradores: 0"),
> a tela não abre um campo de texto substituto — só avisa "Nenhum administrador
> cadastrado para esta empresa." Ou seja: papel de cadastro vazio continua
> cadastro (mostra alerta), nunca migra pra input manual; só os 10 campos que
> já nascem em `CAMPOS_MANUAIS` ganham input de texto na tela de geração. Isso
> é a prova visual, e não só de código, da fronteira entre camada 2 e camada 3
> descrita nesta seção.

`src/lib/templates/vocabulario.ts` declara, em produção, `CAMPOS_MANUAIS` — a
lista oficial e explícita de "campo preenchido na tela Gerar, sem cadastro por
trás":

```ts
export const CAMPOS_MANUAIS: CampoEntidade[] = [
  { id: 'dataAssinatura', ... manual: true, obrigatorio: true },
  { id: 'testemunha1Nome', ... manual: true },
  { id: 'testemunha1Cpf', ... manual: true },
  { id: 'testemunha1Rg', ... manual: true },
  { id: 'testemunha2Nome', ... manual: true },
  { id: 'testemunha2Cpf', ... manual: true },
  { id: 'testemunha2Rg', ... manual: true },
  { id: 'advogadoNome', ... manual: true },
  { id: 'advogadoOabNumero', ... manual: true },
  { id: 'advogadoOabUf', ... manual: true },
];
```

Os nomes `testemunha1Nome/Cpf/Rg` e `testemunha2Nome/Cpf/Rg` do nosso
`ExploracaoRuralDraft` são **idênticos, literalmente**, aos campos que já
existem em produção no Contrato Social. Não é coincidência de nomenclatura —
é o mesmo conceito, e o comentário do código real explica por quê: "não existe
cadastro de testemunha do ato". `signatarios.ts` confirma pelo lado da
composição: `SignatarioAvulso` (`nome`, `cpfCnpj?`, `qualificacao?`, `genero?`)
é literalmente "Signatário que não vem de cadastro (testemunha, advogado),
digitado na tela Gerar" — nunca é um `pessoa.id`, e nunca deveria ser: uma
testemunha de contrato agrário não é parte do cadastro de clientes.

**Conclusão**: `testemunha1/2Nome/Cpf/Rg` no rascunho não é vazamento nem
gap — é a mesma peça, com o mesmo nome, que a OSG já usa. O único cuidado para
a incorporação é de **camada**, não de dado: hoje o mockup apresenta esses 6
campos na mesma tela/aba que `outorganteId`/`exploradores`/`imoveis` (camada 2,
cadastro do instrumento); no OSG Work de verdade, eles devem entrar como
formulário de CAMADA 3 (a exemplo de `GerarDocumentoEscolhas.tsx`, que
renderiza `valoresLivres` na hora de gerar, não como aba de cadastro
permanente do instrumento).

**Correção sobre persistência** (ponto levantado depois da 1ª versão deste
relatório): não é que esses campos "nunca são persistidos" — eles SÃO salvos,
com histórico completo, só que no lugar certo: dentro de `documento_gerado`,
um por VERSÃO do documento. O comentário do próprio código confirma —
"O `documento_gerado` é persistido pelo passo 'Validar versão': ele encerra os
cadastros e CONGELA os valores atuais (`snapshot_flags`/`snapshot_dados`)
**nesta versão**." Cada clique em "Validar versão" grava uma nova linha
encadeada por `documento_anterior_id` até a raiz `documento_raiz_id`, cada uma
com sua própria testemunha congelada dentro de `snapshot_dados.valoresLivres`
— editar e validar de novo NÃO sobrescreve a versão anterior, cria uma nova ao
lado dela, e dá pra navegar entre as duas (é o que a UI chama de
`versaoVisualizadaId`/`versoes`). Ou seja, o histórico de testemunha por
minuta é uma garantia que já vem de graça do mecanismo de versionamento de
`documento_gerado` — não precisa ser reinventado.

O que isso implica pra incorporação: `documento_gerado` hoje se liga a
`cliente_id` + `pj_pessoa_id` (a empresa do contrato) — não existe coluna que
amarre uma cadeia de versões a um `exploracao_rural`. Reaproveitar o MESMO
mecanismo de versionamento para os contratos de exploração rural (em vez de
inventar um novo) pede uma coluna nova, nullable, ao lado de `pj_pessoa_id`:
`documento_gerado.exploracao_rural_id`. Com isso, nem `testemunha1/2*` nem
`numeroVias`/`foroComarca`/`foroUf` (achado #5) precisam de coluna em
`exploracao_rural` nem em tabela de junção nova — moram todos em
`documento_gerado.snapshot_dados`, versionados por minuta, exatamente como já
funciona pro Contrato Social.

### Campos do rascunho que caem na mesma categoria, mas ainda não têm entrada em `CAMPOS_MANUAIS`

| Campo do rascunho | Seria `CAMPOS_MANUAIS` novo? |
|---|---|
| `numeroVias` | Sim — "quantas vias assinadas" é dado do ATO de assinatura, não do instrumento; varia mesmo entre dois contratos idênticos ([BV-PAR] 4 vias, [BV-COM] 3 vias, achado já registrado no rascunho). Nenhuma coluna no banco, nenhuma entidade de cadastro cabe. Candidato direto a `CAMPOS_MANUAIS` novo, mesma forma dos que já existem. |
| `foroComarca` / `foroUf` | Zona cinzenta — ver seção 6. |

## 6. Achado #5: `foroComarca`/`foroUf` — o Contrato Social resolve isso diferente, e não dá pra copiar direto

`binding.ts` trata foro como campo DERIVADO do cadastro para contratos
societários: `REFERENCIAS_LEGADAS` mapeia `foroComarca`/`foroUf` para
`sociedade.sedeMunicipio`/`sociedade.sedeUfExtenso` — ou seja, no Contrato
Social o foro do contrato é (por convenção) a sede da própria sociedade que
está sendo constituída/alterada, um dado que já é cadastro.

Isso não se transporta para exploração rural: não há uma "sociedade sendo
constituída" no instrumento, os imóveis de um único instrumento podem estar em
municípios/UFs diferentes ([BV-COM] atravessa São Desidério/BA e
Barreiras/BA), e o foro é uma escolha contratual das partes — pode ser a
comarca de qualquer um dos imóveis, de uma das partes, ou nenhuma das duas.
Não existe hoje um campo de cadastro (`pessoa.endereco_municipio`,
`matricula.municipio_imovel`) que sirva de fonte automática sem arriscar
resolver errado quando há múltiplos imóveis/partes em municípios diferentes.

**Não é vazamento** — é campo digitado por natureza, só que sem precedente
direto para copiar. Duas opções válidas para a incorporação (decisão de
produto, não de arquitetura):
1. Entra em `CAMPOS_MANUAIS` como campo de geração — pelo achado #4, isso
   quer dizer especificamente `documento_gerado.snapshot_dados.valoresLivres`,
   versionado por minuta (não "fora de qualquer tabela" — dentro da tabela
   certa, com histórico de graça).
2. Vira coluna em `exploracao_rural` se a OSG quiser consultar/filtrar pelo
   foro eleito fora do contexto de um PDF específico (ex.: relatório "quantos
   instrumentos têm foro em Sorriso") — nesse caso perde o versionamento por
   minuta, ganha consulta direta; é o trade-off certo a expor pra decisão de
   produto, não uma lacuna de arquitetura.

## 7. Achado #6: `incluiPecuaria`/`permitePenhor` já cabem numa categoria que existe e está ociosa — `tmpl_flag` tipo `manual`

Query ao constraint real de `tmpl_flag` (hoje):

```sql
CHECK (tipo = ANY (ARRAY['derivada','manual']))
CHECK (
  (tipo = 'manual' AND expressao_sql IS NULL AND entidade IS NULL AND campo IS NULL AND valor IS NULL)
  OR (tipo = 'derivada' AND (...))
)
```

As 3 flags que existem hoje em produção são todas `tipo = 'derivada'`
(deriva de `pessoa.tipo_empresa`) — o que fez a pesquisa anterior desta sessão
concluir, precipitadamente, que "flag manual não existe". **O constraint já
provisiona `tipo = 'manual'` desde a migração original** — só nunca foi usado,
porque nenhum contrato societário até hoje precisou de uma flag que o
consultor liga na mão (todas as variações de PR/CN/SC já são dedutíveis do
cadastro).

`incluiPecuaria` (troca AGROPECUÁRIA↔AGRÍCOLA em 3 lugares do texto) e
`permitePenhor` (liga a cláusula de anuência) são exatamente esse caso: não
tem cadastro de "esta exploração pratica pecuária" ou "esta parceria permite
penhor" em lugar nenhum do schema, e não deveria ter — é uma escolha textual
do instrumento, do tipo que `tmpl_flag` já foi desenhado para carregar.

Uma ressalva real, porém: `escopo` de `tmpl_flag` está restrito por CHECK a
`{'cliente', 'pj'}` — as duas flags nossas são por INSTRUMENTO (uma mesma PJ
outorgante pode ter uma parceria com pecuária e outra sem), um terceiro nível
de escopo que ainda não existe no enum. Se a OSG decidir reaproveitar
`tmpl_flag` literalmente para exploração rural, esse CHECK precisa crescer
(`'exploracao_rural'` ou equivalente) — não é bloqueante, mas é ajuste de
schema, não só reuso.

## 8. Achado #7: `administradoresNomeados` (Composse) não é a mesma coisa que `administracao` (cadastro de PJ) — risco de colisão de nome

`administracao` (cadastro real): `pj_pessoa_id, administrador_pessoa_id, cargo,
pode_isoladamente, data_inicio, data_fim, poderes (jsonb)` — quem administra
uma EMPRESA, para fins de Contrato Social/procuração.

`administradoresNomeados: ParteSimplesDraft[]` no rascunho é outra coisa:
quem, dentre os PRÓPRIOS compossuidores (pessoas físicas ou jurídicas, sem
relação de administração societária nenhuma), foi designado para tomar
decisões do dia a dia da composse rural. `[BV-COM]` usa "maioria dos
percentuais"; `[ROS-COM]` nomeia 2 compossuidores fixos — nenhum dos dois
casos tem relação com a tabela `administracao`, que é sobre poderes de
representação de uma PESSOA JURÍDICA perante terceiros, não sobre gestão
interna de uma composse entre pessoas físicas/jurídicas parceiras.

**Não é gap no rascunho — é um alerta para quem for desenhar as tabelas**: se
alguém, ao ver o nome parecido, tentar reaproveitar `administracao` para
`administradoresNomeados`, vai misturar dois conceitos de negócio diferentes
sob a mesma tabela. O destino correto é o mesmo `exploracao_rural_parte` do
achado #1, com `papel = 'administrador_nomeado'` — não `administracao`.

## 9. Campos do rascunho já corretamente modelados (sem achado)

| Campo | Por que já está certo |
|---|---|
| `outorganteId`, cada `pessoaId` dentro de `exploradores`/`compossuidores`/`administradoresNomeados` | Guardam só o `id` da `pessoa` — nunca duplicam nome/CPF/endereço no rascunho. Igual a `titularidade.titular_pessoa_id`/`quadro_societario.socio_pessoa_id`: ponteiro para cadastro, texto derivado só na hora de montar o contexto (`mapearPessoa`). |
| `matriculaId` (dentro de `ExploracaoImovelDraft`) | Mesma lógica — ponteiro para `matricula`, nenhum campo do imóvel reaparece no rascunho. |
| `estudoFiscalDocumentoId`, `documentoComprobatorioId` | FK para documento cadastrado, não arquivo solto — já tratados como fora do escopo de tooltip desde a sessão anterior ("exceto seção 04 Documento de origem"), consistente com o padrão de ponteiro acima. |
| `declaradoIrpf` | Já documentado no próprio arquivo como "fora do formulário de propósito" — é dado do registro consumido por outro relatório (`FiscalReport.tsx`), não texto de contrato; nenhuma ação pendente aqui. |
| `partesExtras` | Já descartado no próprio arquivo (decisão da OSG em 19/08: "a gente não tá colocando mais") — mantido só de rascunho para o dia em que aparecer contrato que use. |
| `tipo` (`parceria`/`composse`) | Bate com a coluna real `exploracao_rural.tipo_exploracao` — a tela só cobre 2 dos 6 valores do enum por decisão de escopo já registrada, não por esquecimento. |

## 10. Campos genuinamente novos, sem cadastro nem precedente — mas corretamente da CAMADA 2 (merecem coluna futura, não formulário de geração)

Estes não têm cadastro por trás porque são termos NEGOCIADOS do instrumento em
si (o motivo de existir de um contrato de parceria/composse é justamente
definir estes números) — diferente de testemunha/nº de vias, que são só
formalidade do ATO de assinar. Têm valor de consulta fora de qualquer PDF
(planejamento fiscal, dashboard de vigência), o que os coloca na mesma
prateleira de `declarado_irpf`/`data_assinatura`, não na de `valoresLivres`:

- `percentualOutorgante`, `percentualExplorador` (só Parceria, corte agregado)
- `prazoIndivisaoQuantidade`/`Unidade`, `indivisaoProrrogavel`,
  `indivisaoAvisoQuantidade`/`Unidade` (só Composse)
- `liquidacaoPeriodicidade`, `liquidacaoNumeroParcelas` (só Composse)
- `regraAdministracao` (`maioria`/`nomeados`, só Composse)
- `vigenciaProrrogavel` — com a ressalva já registrada no próprio rascunho de
  que nenhum contrato real visto até agora tem essa cláusula por extenso; fica
  pendente de confirmação, não de arquitetura. `prazoRenovacaoVigencia`
  (mesma pendência, sem lastro nenhum) foi removido do mockup em 20/08/2026.

Nenhum destes tem hoje coluna em `exploracao_rural`, e nenhum tem de onde
"vazar" cadastro — são todos texto/número que só existe porque este
instrumento específico o define.

## 11. Tabela-resumo de toda a auditoria

| Campo do rascunho | Classificação | Achado |
|---|---|---|
| `tipo` | Cadastro (enum já existe) | — |
| `dataAssinatura`, `dataEncerramento` | Camada 2 (instrumento) | Diferente do Contrato Social (lá é `CAMPOS_MANUAIS`) por bom motivo — ver texto |
| `declaradoIrpf` | Camada 2, já mapeado | — |
| `vigenciaProrrogavel` | Camada 2, pendente de confirmação | §10 |
| ~~`prazoRenovacaoVigencia`~~ | Removido do mockup em 20/08/2026 — sem lastro | §10 |
| `outorganteId` | Cadastro (FK) | — |
| `exploradores[]` | Camada 2 — falta tabela de junção | §2 (achado #1) |
| `compossuidores[]` | Camada 2 — falta tabela de junção | §2 (achado #1) |
| `partesExtras[]` | Fora de escopo (decisão já tomada) | — |
| `percentualOutorgante/Explorador` | Camada 2, campo novo | §10 |
| `incluiPecuaria` | Encaixa em `tmpl_flag` tipo `manual` | §7 (achado #6) |
| `culturas` | Camada 2, texto por instrumento | — |
| `permitePenhor` | Encaixa em `tmpl_flag` tipo `manual` | §7 (achado #6) |
| `prazoIndivisao*`, `indivisaoAviso*`, `indivisaoProrrogavel` | Camada 2, campo novo | §10 |
| `estudoFiscalDocumentoId`, `documentoComprobatorioId` | Cadastro (FK) | — |
| `imoveis[]` (`matriculaId`) | Cadastro (FK) dentro do item | — |
| `imoveis[]` (`areaExplorada`) | Camada 2, por-instrumento — NÃO confundir com `matricula.area_explorada` | §3 (achado #2) |
| `imoveis[]` (`tipoInstrumentoOrigem`/`instrumentoOrigemRef`/`origemExterna`/`situacaoOrigem`) | Camada 2 — mesma forma de `matricula.matricula_anterior_*` | §4 (achado #3) |
| `foroComarca`, `foroUf` | Zona cinzenta — `CAMPOS_MANUAIS`/`documento_gerado` novo OU coluna | §6 (achado #5) |
| `testemunha1/2Nome/Cpf/Rg` | `CAMPOS_MANUAIS` — JÁ EXISTE, mesmo nome; persistido versionado em `documento_gerado.snapshot_dados`, não em `exploracao_rural` | §5 (achado #4) |
| `numeroVias` | `CAMPOS_MANUAIS` novo, mesma persistência versionada acima | §5 (achado #4) |
| `regraAdministracao` | Camada 2, campo novo | §10 |
| `administradoresNomeados[]` | Camada 2 — falta tabela de junção; NÃO é `administracao` | §8 (achado #7) |
| `liquidacaoPeriodicidade`, `liquidacaoNumeroParcelas` | Camada 2, campo novo | §10 |

## 12. Conclusão

Não há vazamento de cadastro para dentro do modelo de contrato, nem o
inverso — o rascunho, campo a campo, está na camada certa (cadastro
relacional/instrumento, ao lado de `titularidade`/`quadro_societario`, não ao
lado de `documento_gerado`). Os achados reais são:

1. **Estrutural** (achado #1): `exploracao_rural` precisa de duas tabelas de
   junção (imóveis, partes) que ainda não existem — o rascunho já assumiu
   essa forma em array; o banco que está atrasado, seguindo o precedente de
   `titularidade`.
2. **De categoria** (achados #4, #5, #6): cerca de 8 a 10 campos
   (`testemunha1/2*`, `numeroVias`, `foroComarca/Uf`, `incluiPecuaria`,
   `permitePenhor`) são corretamente dados de geração/instrumento, mas hoje
   convivem na mesma aba dos dados de cadastro do instrumento (`outorganteId`,
   `imoveis`, etc.) sem essa separação visual — a própria OSG Work já tem o
   padrão pronto (`CAMPOS_MANUAIS` + `tmpl_flag` tipo `manual`) para dar a
   eles o lugar certo quando a tela for incorporada. Isso não significa que
   ficam sem histórico: confirmado ao vivo na tela de produção e pelo código
   de `documento_gerado`, esses campos são persistidos COM versionamento
   completo (uma linha nova por "Validar versão", encadeada por
   `documento_anterior_id`/`documento_raiz_id`, testemunha da minuta antiga
   preservada) — só que dentro de `documento_gerado.snapshot_dados`, por
   minuta, não como coluna fixa do instrumento em `exploracao_rural`. Único
   ajuste de schema que isso implica: `documento_gerado` precisa de uma
   coluna nova `exploracao_rural_id` (nullable, ao lado do atual
   `pj_pessoa_id`) para amarrar a cadeia de versões a um instrumento de
   exploração rural em vez de só a uma empresa.
3. **De nome, não de dado** (achado #7): `administradoresNomeados` precisa
   nascer na tabela de junção nova, nunca em `administracao` (cadastro de
   administração societária, conceito diferente apesar do nome parecido).

Nenhum dos achados pede alteração agora — ficam registrados para orientar o
desenho das tabelas quando o mockup for de fato incorporado à OSG Work.
