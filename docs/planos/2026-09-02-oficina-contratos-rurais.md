# Oficina de contratos rurais (AGR-01/AGR-02) — estado e plano

> Revisão 2, de 02/09/2026, **depois de ler os `.docx` de Bela Vista e Mattei**.
> A revisão 1 foi escrita só com os PDFs escaneados do MMS e errou em três pontos;
> as correções estão marcadas com ⚠️ **RETIFICADO**.
> Branch: worktree `psa-consultores` em `develop`. Sandbox: `vgzomuwnsdgrxbkyoavq`.

## Objetivo

Gerar Parceria Rural e Composse Rural Pro Indiviso a partir do cadastro de
Exploração Rural, e comparar com os contratos que a OSG assinou para o cliente
MMS.

## DECISÃO DE ESCOPO (02/09, do usuário) — layout está fora

> "O importante é o texto estar certo. Usa o padrão que já existe nos outros
> contratos para layout, não precisa subir estilo novo específico nem alterar
> nada nesse sentido. Desde que o contrato final dos dois TENHA todos os campos,
> blocos, cláusulas, parágrafos e etc que os originais têm, não importa se o
> layout e estilo estiver diferente."

**Critério de aceite, portanto: completude de conteúdo, não fidelidade visual.**
O layout é o que o `docx.ts` já faz (o do Contrato Social).

Caiu do escopo — e por isso as tarefas 14, 16 e 19 foram apagadas:

| Item | Era | Por que caiu |
|---|---|---|
| C9 — estilo estrutural por documento | coluna em `tmpl_documento` + `types.ts` + `numeracao.ts` + `index.ts` + `docx.ts` | é forma do rótulo. A parceria vai sair com `CAPÍTULO I` + título em 2 linhas, como o Contrato Social. Nenhuma cláusula ou parágrafo se perde: a numeração de cláusula é contínua e não reseta por capítulo (`types.ts:8`) |
| C11 — rodapé descritivo do Anexo | `docx.ts` | é rodapé. E o texto dele é a repetição da frase de abertura do Anexo, que continua no corpo |
| N2 — Anexo como documento próprio | catálogo + front | era numeração de página. Sai um arquivo só, com o Anexo na cauda; o conteúdo está todo lá |
| `estiloNome` (dentro do C1) | `vocabulario.ts` | é caixa do nome. O administrador sai em MAIÚSCULA em vez de Caixa Alta e baixa |
| Caixa dos 5 títulos do composse | catálogo | idem |

Consequência boa: **nenhuma coluna nova em `tmpl_documento`**, então o conjunto de
migrations encurta e o `numeracao.ts` — código compartilhado com o Contrato
Social, o item mais delicado da lista — **não é tocado**.

Segue de pé, porque é conteúdo e não forma: campo que falta, cláusula que falta,
parágrafo que falta, texto resumido onde o original é longo, dado errado
(instituto de preço, preposição do estado), e lacuna quebrada.

---

## 1. Fontes lidas

### Corpus completo (7 instrumentos, 3 clientes)

| Documento | Formato | Serve para |
|---|---|---|
| MMS — `Instrumento Particular de Parceria…MMS Agro Ltda.pdf` | scan, 7 págs (rodapé numera 8) | **o alvo da comparação** |
| MMS — `Anexo Único do_Instrumento…pdf` | scan, 2/2 | alvo |
| MMS — `Contrato _Composse Rural _Jose Eduardo e Esposa.pdf` | scan, 8/8 | **alvo** |
| MMS — `Anexo Único_Composse Rural…pdf` | scan, 2/2 | alvo |
| Bela Vista — `VF_Contrato Parceria Bela Vista Agropecuaria.docx` | **DOCX** | estilo exato + a página que falta no MMS |
| Bela Vista — `V1_Anexo Único_Parceria Bela Vista Agropecuária.docx` | **DOCX** | estrutura do Anexo |
| Bela Vista — `VF_Contrato Composse Rural Sergio Pitt e Outros.docx` | **DOCX** | 2ª instância do composse |
| Mattei — `VF_Contrato Composse Mattei.docx` | **DOCX** | 3ª instância do composse |
| Mattei — `VF_Contrato Parceria Mattei Agropecuária..docx` | **DOCX** | 3ª instância da parceria |
| Bela Vista — `V1_Contrato Modelo Parceria Benfeitorias não indenizaveis.docx` | **DOCX** | **o template com as lacunas** |
| `Parceria_Rural_rascunho.docx` (Downloads/SOPs) | gerado pelo app | o que temos hoje |

**Aditivo continua fora por decisão do usuário.**

Extração dos `.docx` (texto + formatação) por
`scratchpad/docx_estilo.py` — marca negrito `*`, itálico `_`, sublinhado `~`, e
prefixa `[C]` no que está centralizado.

### ⚠️ RETIFICADO 1 — a página 6 do MMS não está perdida

O `.docx` do Bela Vista e o contrato-modelo são o **mesmo template** do MMS,
palavra por palavra nas 16 cláusulas legíveis. As três seções que faltavam no
scan estão inteiras neles:

- `DO USO DO SOLO E MÃO DE OBRA` → Cláusula Décima Primeira + Parágrafo Único
- `DA EXTINÇÃO DO CONTRATO` → Cláusulas Décima Segunda e Décima Terceira
- `DA ANUÊNCIA` → Cláusula Décima Quarta + §1 §2 §3

Prova de que é o mesmo texto: o §3 da Décima Quarta termina em *"…concordando que
ditos bens ali permaneçam até o final da liquidação das dívidas pertinentes,
mantendo-se essa condição mesmo no caso de alienação do imóvel"* — exatamente o
fragmento que sobrou no topo da página 7 do MMS.

**Consequência: o `Contrato de parceria_suinocultura.pdf` fica dispensado e não há
texto de contrato a inventar.** Decisão em aberto nº 1 da revisão 1: resolvida.

---

## 2. O estilo é padronizado — e o motor já bate

Medido nos quatro contratos finais dos três clientes:

| | Parceria BV | Composse BV | Parceria Mattei | Composse Mattei |
|---|---|---|---|---|
| Fonte dos runs | Arial Narrow | Arial Narrow | Arial Narrow | Arial Narrow |
| Corpo | 12pt (`sz=24`) | 12pt | 12pt | 12pt |
| Alinhamento dominante | justificado | justificado | justificado | justificado |
| Margem topo / esquerda | 1135 / 1701 | 1134 / 1701 | 1135 / 1701 | 1134 / 1701 |
| Rodapé | `Página 1 de 6`, à direita, números em negrito | idem | idem | idem |

O cabeçalho do `docx.ts` (linhas 19-25) e `MARGENS` (linha 46) já descrevem e
implementam exatamente isso: Arial Narrow 12pt, `top: 1134, left: 1701`,
capítulo centralizado em negrito sublinhado, rodapé à direita com números em
negrito. **Não há estilo novo a escrever** — a intuição do usuário estava certa.

### O que difere é ESTRUTURA, e é do template do documento

Zero divergência entre clientes; total divergência entre os dois documentos:

| | Parceria (MMS, Bela Vista, Mattei, Modelo) | Composse (MMS, Bela Vista, Mattei) |
|---|---|---|
| Título de seção | `DAS ÁREAS CEDIDAS EM PARCERIA` — centralizado, negrito, sublinhado, MAIÚSCULO, **sem numeral** | `CAPÍTULO I – DO OBJETO` — idem, **numerado** |
| Cláusula | `CLÁUSULA PRIMEIRA: <texto>` inline, MAIÚSCULA, com dois-pontos | `Cláusula Primeira` em **linha própria centralizada**, Caixa Alta e baixa, **sem** dois-pontos |
| Preâmbulo | dois blocos rotulados (`PARCEIRA OUTORGANTE:` / `PARCEIROS OUTORGADOS:`) | um bloco só, sem rótulo, terminando em "doravante denominados COMPOSSUIDORES RURAIS" |
| Considerandos | não tem | `PREÂMBULO` + `CONSIDERANDO que…` ×5 (o MMS numera `I)`…`V)`; BV e Mattei **não numeram**) |

O motor tem UM formato, em `numeracao.ts:71-86`, e ele funde duas coisas:
`capitulo` = "título centralizado sublinhado" **e** "numerado"; `clausula` =
"numerada" **e** "rótulo inline com dois-pontos".

### Estrutura canônica da parceria (12 seções, 20 cláusulas)

1. `DAS ÁREAS CEDIDAS EM PARCERIA` — Cl. 1ª + alíneas a)…f)
2. `DA VIGÊNCIA` — Cl. 2ª + §1 §2
3. `DAS ATIVIDADES AGROPECUÁRIAS` — Cl. 3ª
4. `DAS DESPESAS` — Cl. 4ª
5. `DA PARTICIPAÇÃO DE CADA PARCEIRO NOS FRUTOS DA PARCERIA` — Cl. 5ª + §§; **Cl. 6ª, 7ª, 8ª sem título de seção**
6. `DO DIREITO DE PREFERÊNCIA NOS CASOS DE ALIENAÇÃO E/OU RENOVAÇÃO DA PARCERIA` — Cl. 9ª + §1 §2 §3
7. `DA FUNÇÃO SOCIAL E DA DEVOLUÇÃO DOS BENS CEDIDOS EM PARCERIA` — Cl. 10ª + §1 §2 §3
8. `DO USO DO SOLO E MÃO DE OBRA` — Cl. 11ª + §Único
9. `DA EXTINÇÃO DO CONTRATO` — Cl. 12ª, 13ª
10. `DA ANUÊNCIA` — Cl. 14ª + §1 §2 §3
11. `DISPOSIÇÕES GERAIS` — Cl. 15ª a 19ª
12. `DO FORO` — Cl. 20ª → fecho, assinaturas, testemunhas

Que as seções 5 e 11 cubram várias cláusulas, e que 6ª–8ª fiquem sem título, é
prova de que os títulos **não são capítulos**: são cabeçalhos de assunto.

### Estrutura canônica do composse (5 capítulos, 20 cláusulas)

`PREÂMBULO` (5 considerandos) → `CAPÍTULO I – DO OBJETO` (Cl. 1ª–5ª) →
`CAPÍTULO II – DO RESULTADO DA COMPOSSE RURAL` (6ª–10ª) →
`CAPÍTULO III – ADMINISTRAÇÃO` (11ª–13ª) → `CAPÍTULO IV – DO PENHOR` (14ª–17ª) →
`CAPÍTULO V - DISPOSIÇÕES GERAIS` (18ª–20ª) → fecho.

O penhor da parceria (`DA ANUÊNCIA`, Cl. 14ª §1 §2 §3) trata do mesmo assunto que
o `CAPÍTULO IV – DO PENHOR` do composse (Cl. 14ª–17ª), mas com **redação
diferente** — só a cauda de uma frase coincide. Pela regra do § 13, são blocos
separados. Foi o que serviu para recuperar a página 6, não para unificar.

---

## 3. ⚠️ RETIFICADO 2 — o georreferenciamento É a fonte do Anexo

A revisão 1 dizia que "Elementos do Perímetro" era texto transcrito e que a
maquinaria `{{#vertices}}` não servia. **Errado.** O Anexo Único do Bela Vista
traz 6 tabelas com as colunas:

```
De           | Longitude        | Latitude        | Altitude | Para        | Azimute  | Distância  | Confrontações
AW6-M-00517  | -45°16'28.695"   | -12°25'32.158"  | 710.84   | BHZ-M-3629  | 113°43'  | 1.098,73 m | Fazenda Irmãos Orita I
```

que é exatamente `{{#vertices}}` / `memoriais` com `codVertice`, `azimute`,
`distancia`, `confrontacoes`, `fonte: 'georef'` (BigQuery). O plano original
estava certo e a minha correção estava errada.

**O que varia é a apresentação da mesma coleção:**

- Bela Vista → tabela por imóvel, corpo 9pt (`sz=18`), centralizada.
- MMS → prosa embutida na alínea: `Elementos do Perímetro: M6-M1, 685,00 metros
  322°08'27" Estrada Porto dos Gaúchos; M1-M2-R. 3.138,34 metros 37°09'01"…`

O motor já faz as duas — `{{#colecao sep="" fim=""}}` dá a prosa, a maquinaria de
tabela dá a tabela. **Não precisa de campo de texto livre nem de coluna nova.**
Para a comparação do MMS, a forma é a prosa.

### O Anexo é documento próprio — confirmado

No Drive ele é **arquivo separado** (`V1_Anexo Único_…docx`), com numeração de
página própria (`Página 2 de 2`) e rodapé próprio de 2 parágrafos: o descritivo
centralizado e o `Página X de Y` à direita.

```
Anexo Único do Instrumento Particular de Parceria para fins de Exploração
Agropecuária entre Bela Vista Agropecuária Ltda. e Sérgio Pitt, Jozenil Caetano
de Souza e Delfino Caetano de Souza, pactuado em 28 de agosto de 2.024.
```

Hoje o catálogo tem 2 `tmpl_documento` e o anexo é bloco de cauda do contrato —
por isso o rascunho gerado continua a numeração do contrato. → vira
`tmpl_documento` próprio, e o rodapé passa a ser propriedade dele.

Abertura do Anexo (a mesma frase do rodapé, com outra regência): parceria
`…pactuado entre <outorgante> e <outorgados>, em <data>:`; composse
`…firmado por <compossuidores> em <data>, sendo:`.

**A alínea do Anexo do composse é idêntica, caractere a caractere, à alínea da
Cláusula Primeira da parceria.** A do Anexo da parceria é a mesma + a cauda de
limites/confrontações/perímetro. Um bloco, dois usos — o reuso que a oficina
existe para permitir.

---

## 4. ⚠️ RETIFICADO 3 — os parágrafos da pecuária são opcionais

Meu primeiro modelo fez deles uma família mutuamente exclusiva (errado: o MMS tem
os três juntos). A migration `20260901230122` corrigiu para parágrafos **comuns**,
sempre presentes — **também errado**:

- MMS, Cláusula Quinta: **seis** § — recria/engorda, cria, **ciclo completo**,
  exercício fiscal, limpeza/beneficiamento, mora.
- Bela Vista e o Modelo: **cinco** — sem o de ciclo completo.

São blocos **opcionais** (`obrigatorio = false` + flag), como os 30 blocos com
flag do societário. Como a `230122` ainda não rodou, corrigir nela mesma.

---

## 5. As três formas de qualificação — agora com prova

O `estiloNome` era "decisão em aberto" na revisão 1. O corpus fecha a questão:
são **dois eixos independentes**, e Bela Vista traz os três fragmentos juntos.

| Papel | nome | naturalidade | nascimento | filiação |
|---|---|---|---|---|
| Parceiros Outorgados (MMS) | MAIÚSCULO | ✓ | ✓ | — |
| Administradores da PJ (MMS, preâmbulo) | Nominal, negrito | — | ✓ | ✓ |
| Compossuidores (MMS) | MAIÚSCULO | — | ✓ | ✓ |
| Ambos os papéis (Bela Vista) | MAIÚSCULO / Nominal | ✓ | ✓ | ✓ |

Ou seja: `estiloQualificacao` **não é** um enum naturalidade-XOR-filiação — são
fragmentos opcionais independentes. `estiloNome` (`''` | `'nominal'`) é o eixo
que falta.

Divergências de redação a registrar (segue-se o MMS, que é o alvo):

| | MMS | Bela Vista |
|---|---|---|
| Regime | `casado sob o regime **de** comunhão parcial` | `sob o regime **da** comunhão universal` |
| Ordem | `casado …, agricultor` | `economista, casado …` |
| Percentual | `30,00 % (trinta **inteiros** por cento)` | `10% (dez por cento)`, sublinhado |
| Data da vigência | `10 de outubro de 2.025` (extenso) | `01/10/2.027` (numérico) |
| NIRE | `sob o NIRE n.º 51202129910` | `sob o NIRE 29206274739` |
| Instituto de preço | `IMEA – Instituto Mato-Grossense…` | `IAGRO – Instituto Agropecuário da Bahia` |
| Estado | `Estado **de** Mato Grosso` | `Estado **da** Bahia` |

O ponto no ano (`2.024`, `2.025`, `2.027`) é convenção da casa nas duas formas.

Lacunas do contrato-modelo: `(...)` para dado a preencher e
`[% dos frutos em número e por extenso]` para instrução. O motor usa
`____________________` — é afordância de tela, não precisa mudar.

---

## 6. Diagnóstico do `.docx` gerado (o que ele já revela)

Gerado **antes** da correção do negrito (C6) — o `**a)**` órfão aparece nele.

| Onde | Gerado | Assinado |
|---|---|---|
| Rótulo do preâmbulo | `PARCEIRA OUTORGANTE:` centralizado, linha própria | inline, negrito sublinhado |
| Qualificação PJ | sem capital social, sem `NIRE`, sem `Bairro`, sem os administradores | tem os quatro |
| Qualificação PF | sem naturalidade, sem nascimento, `casado **em** regime` | tem os dois, `sob o regime` |
| Seções | `CAPÍTULO I` + `Das Áreas Cedidas em Parceria`, 2 linhas, Caixa Alta e baixa, 12 capítulos | `DAS ÁREAS CEDIDAS EM PARCERIA`, 1 linha, MAIÚSCULO, sem numeral, 12 seções |
| Alínea | 190 caracteres, sem Livro/Folha/cartório/CCIR/`de propriedade de` | ~450 caracteres |
| Cl. 1ª §Único | `Todos os imóveis são de propriedade de…` | **não existe** (invenção minha) |
| Cl. 2ª | `findará em 10/10/2025` | `findará em 10 de outubro de 2.025` |
| Cl. 3ª culturas | 8, sem algodão e sorgo | 10 |
| Cl. 5ª | 3 §, `30% (trinta por cento)` | 6 §, `30,00 % (trinta inteiros por cento)` |
| Cl. 10ª | §Único com `salvo se as partes pactuarem em instrumento apartado` | §1 §2 §3, **sem** essa ressalva (invenção minha) |
| Cl. 11ª–14ª | resumo meu | texto atestado (§ 1 acima) |
| Fecho | `em ______ () vias`, `____/____, 10/10/2022` | `em 04 (quatro) vias`, `Lucas do Rio Verde/MT, 10 de outubro de 2.022` |
| Cl. 20ª | `Estado de ,` | `Estado de Mato Grosso` |
| Assinaturas | 3 linhas, MMS uma vez | 4 linhas, MMS duas vezes por administrador |
| Testemunhas | **ausentes** | 2 blocos |
| Anexo | tabela de 7 colunas, mesma numeração de página | prosa em alíneas, documento próprio |

---

## 7. Migrations

### Aplicadas no sandbox — CONGELADAS, nunca editar

| Arquivo | Versão no banco |
|---|---|
| `20260901144006_cadastro_exploracao_rural_partes_imoveis_origens.sql` | `20260901145724` + delta `…modalidade_pecuaria_e_origem_por_pessoa` |
| `20260901144839_exploracao_rural_remove_colunas_legadas.sql` | `20260901155557` |
| `20260901154624_exploracao_rural_gravacao_transacional.sql` | `20260901154923` |
| `20260901185015_exploracao_rural_validacao_dos_100_por_cento.sql` | aplicada |
| `20260901190315_catalogo_parceria_e_composse_rural.sql` | aplicada |
| `20260901192155_dev_cliente_teste_exploracao_rural.sql` | aplicada (dev-only, gitignored) |

**Regra do usuário:** o que já rodou não se edita — correção é arquivo novo.
Dados de teste (MMS) podem ser consertados no arquivo local.

### Escritas e NÃO aplicadas — é o que falta rodar

Rodar **nesta ordem**, num conjunto só:

| Ordem | Arquivo | O que faz |
|---|---|---|
| 1 | `20260901230122_catalogo_rural_convencao_de_nome_e_pecuaria.sql` | derruba `modalidade_pecuaria`, renomeia os 95 blocos para a convenção da casa, apaga a cabeça de família e o parágrafo do cartório que eu inventei, e transforma os 3 parágrafos da pecuária em blocos **opcionais** com flag (`pecuaria_recria_engorda`, `pecuaria_cria`, `pecuaria_ciclo_completo`) |
| 2 | `20260902120000_exploracao_rural_capital_do_outorgante.sql` | coluna `outorgante_capital_social_na_assinatura` + CHECK de positivo |
| 3 | `20260902123000_catalogo_rural_transcricao_do_texto_assinado.sql` | **a transcrição**: versão 2 de 47 blocos, 8 blocos novos, a âncora que faltava |
| 4 | `20260901192155_dev_cliente_teste_exploracao_rural.sql` (reaplicar) | dados do MMS corrigidos — capital 872.674,00, prazo de indivisão 3 anos / aviso 3 meses, e os limites e confrontações dos seis imóveis |

Depois: `supabase gen types` (a coluna nova entra em `types.ts` e o `as` de
`entradaDoInstrumento` deixa de ser necessário).

**Combinado com o usuário:** o conjunto roda inteiro de uma vez, e o código já
está escrito assumindo isso — a única concessão é um `as` em
`entradaDoInstrumento`, marcado no comentário.

O que a transcrição valida sozinha, ao rodar: bloco sem versão atual **lança**;
override apontando para bloco rural **lança**; documento já gerado a partir do
catálogo rural **lança**. E ela avisa por `notice` quantos blocos ganharam versão
e quantas cláusulas ficaram abaixo de 200 caracteres.

Verificação feita antes de aplicar: os **50 placeholders e 20 seções** da
migration foram conferidos um a um contra o vocabulário — todos existem. É a
checagem que o arnês fazia e que passou a exigir sessão.

### Produção (Lovable `4cb1f76a-b443-437e-a047-67a69019a54a`)

Muito atrás — normal. `exploracao_rural` existe **sem** as 17 colunas novas; as 3
tabelas filhas **não existem**; `tmpl_documento` **não tem** `escopo`. O tech lead
trata depois. **Não gastar tempo nisso.**

---

## 8. Código

### Feito (typecheck limpo)

| # | Item | Onde |
|---|---|---|
| A1 | Revertido o "por cento" para `percentualExtenso` (forma cartorial `trinta inteiros por cento`). `percentualRuralExtenso` **apagada**. | `extenso.ts`, `vocabulario.ts`, `contextoRural.ts` |
| A2 | Modalidade da pecuária removida do código (6 arquivos) | — |
| C3 | `dataExtenso(iso)` → `10 de outubro de 2.025`, sem passar por `Date` | `extenso.ts` |
| C2+C10 | `pessoa` ganhou `naturalidadeMunicipio/Uf` + derivado, `filiacaoPai/Mae` + derivado, e `estiloQualificacao` | `vocabulario.ts`, `mapeadores.ts` |
| C1 (parte) | `montarQualificacao` PJ escreve o capital social | `vocabulario.ts` |
| C5 | Campo derivado de manual herda a lacuna (`herdaManualDaBase`) | `campos.ts` |
| C6 | **Bug real em código compartilhado**: `linhaComRotulo` media o marcador na string sem marcas e cortava na string com marcas → `*a)` no rótulo, `*` órfão, contagem ímpar, pareamento deslocado. Afetava o Contrato Social. | `docx.ts` |
| C7 | Tela separa erro de vazio (escondia o `PGRST201`) | `ExploracaoRural.tsx` |
| — | `PGRST201`: `exploracao_rural_imovel` tem 2 FKs para `exploracao_rural`; embed nomeado | `useExploracaoRural.ts` |

Reformas de arquitetura já feitas: vocabulário rural declarado
(`ENTIDADES.instrumento` 44 campos, `ENTIDADES.origemPosse`, `PAPEIS.instrumento`,
`FonteLista: 'exploracao_rural'`, 5 listas); papéis de assinatura levados para
`signatarios.ts`; `qualificacaoDaOrigem` apagada (a origem aponta para `pessoa`);
`contextoRural.ts` reduzido a 2 funções despachadas pelos pontos que já existiam;
`formKit.Campo` ganhou `required`/`campo` e o `Field` local de
`MatriculaDadosTab` foi apagado.

### A fazer

**TODO O CÓDIGO ESTÁ FEITO** (02/09, sessão de execução). Nada pendente de
código; falta somente **aplicar as migrations**.

| # | Item | Onde |
|---|---|---|
| 11 | **C1** — capital social e a qualificação completa dos administradores no preâmbulo da PJ, via `instrumento.outorganteQualificacao`; `sob o NIRE nº` | `contextoRural.ts`, `useGeracaoDocumento.ts`, `vocabulario.ts` |
| 24 | **N8** — `ufComPreposicao` (`Estado da Bahia` / `de Mato Grosso` / `do Pará`), com busca reversa para aceitar sigla **e** nome já por extenso | `concordancia.ts`, `vocabulario.ts`, `mapeadores.ts` |
| 12 | **C4** — uma linha de assinatura POR ADMINISTRADOR da PJ, concordada em gênero, mais as testemunhas digitadas | `signatarios.ts`, `contextoRural.ts` |
| 21 | **N6** — verificado: o C5 já resolve. `numeroVias` vira `______` e `numeroViasExtenso` vira `____________________`, cada um com a lacuna do seu tipo | — (teste novo) |
| 26 | **N10** — `instrumento.institutoPreco`, `manual` e não derivado da UF | `vocabulario.ts`, `contextoRural.ts` |
| 20 | **N4** — vértices e cabeçalho georref ligados a `imoveisDoAnexo`; matrículas do Anexo entram na busca do georref | `contextoRural.ts`, `binding.ts`, `useGerarDocumentoController.ts` |
| 18 | **C8** — o arnês lê o catálogo do BANCO (versão `atual` de cada bloco); o parser de SQL saiu inteiro | `scripts/osg/render-contratos-mms.ts` |
| — | **Pré-preenchimento do capital da outorgante** no cadastro (ver abaixo) | `exploracaoRuralModalModels.ts`, `useGeracaoDocumento.ts`, `ExploracaoRuralModal.tsx`, `PartesPanel.tsx` |
| 22 | Testes de C6, C5+N6, C2/C10, C3, C1, C4, N4 e do campo novo | 6 arquivos de teste |

### O capital da outorgante: por que coluna, e como a tela evita o trabalho manual

A justificativa que eu havia escrito ("senão o contrato de 2022 sairia com o
capital de depois do aumento") estava fraca: para contrato NOVO o capital de hoje
é o certo, e `documento_gerado.snapshot_dados` já congela os dados no ato da
geração. As razões que sustentam a coluna são outras duas:

1. **O cadastro registra instrumento que JÁ EXISTE** — é por isso que
   `data_assinatura` é preenchida com data passada e que o Considerando V do
   composse cita uma parceria anterior. Nesses, o número certo é o que está
   escrito no papel, e não há snapshot para consultar: o app não gerou aquele
   documento.
2. **Coerência de fonte** — o retrato já é coluna em
   `exploracao_rural_origem_externa`. Guardar num lado e calcular no outro faria o
   mesmo fato ter duas fontes: o Considerando V do composse e o preâmbulo da
   parceria citam o mesmo capital, e eles podem divergir.

Argumento prático que também pesa: `calcularCapitalSociedade` está amarrado à
*empresa selecionada* na tela Gerar, e no fluxo rural pode não haver empresa
selecionada (as listas rurais têm fonte `exploracao_rural`).

**O custo — digitar um número que o sistema conhece — foi resolvido na tela, não
no motor:** `useCapitalSocialVigente` calcula o capital vigente da outorgante
escolhida (reusando `calcularCapitalSociedade`, porque somar `vlr_total` daria
número diferente do que o Contrato Social imprime) e o modal pré-preenche o campo.

Três guardas, cada uma por um motivo concreto:
- **só em instrumento novo** (`!isEdit`): num que já existe, pré-preencher marcaria
  como alterado um formulário que ninguém tocou e, se salvo, gravaria o capital de
  hoje num contrato de 2022 — o erro que a coluna existe para evitar;
- **nunca sobrescreve valor já preenchido**: trocar de outorgante não pode apagar
  o número copiado do papel;
- **`null` ≠ zero**: sem outorgante, com outorgante pessoa física ou com as listas
  carregando, o hook devolve `null` — pré-preencher com zero poria no preâmbulo um
  capital que a empresa não tem.

Quando o valor digitado divergir do vigente, a tela avisa em texto discreto. Não é
erro: é a razão de o campo ser editável.

### Achados da execução

- **`enderecoProsa` também escrevia "Estado de Bahia"** (`mapeadores.ts:97`). Pesa
  mais que os outros pontos: o endereço entra na qualificação de CADA parte, então
  um contrato com cinco pessoas erra cinco vezes. Corrigido.
- **`estiloQualificacao` por papel**: outorgados saem com naturalidade,
  compossuidores com filiação — é o que os assinados fazem, e agora quem diz é a
  lista do papel.
- **`dataExtenso` passou a aceitar `dd/mm/aaaa`** além do ISO: um campo DERIVADO
  recebe a base já formatada por `formatarDataBR`, e sem isso devolvia a data crua.
- **Duas asserções antigas mudaram de propósito**: pediam `Estado de Bahia` e
  `sob o nº`. As duas eram o defeito, não o contrato.
- **`tmpl_bloco` não tem UNIQUE em `nome`** — `on conflict (nome)` falharia. A
  migration procura e só insere se não achar (é também o que faz o bloco
  compartilhado servir aos dois documentos).
- **O cabeçalho "Elementos do Perímetro:" repetiria por vértice** se ficasse
  dentro de `{{#vertices}}`. Foi para fora, guardado por
  `{{#imovel.georefPerimetro}}` — o mesmo aninhamento do memorial SIGEF.
- **A Cláusula Quarta cita a Sétima** por `{{ refs.caso_fortuito }}`, e o bloco da
  Sétima nasceu **sem âncora**: sem ela o placeholder não resolve e a geração
  lança. A migration cria a âncora.

### Armadilhas conhecidas

- **Não** trocar `PAPEIS.outorgante` de `pessoa` para `sociedade`: quebraria
  qualquer documento que já use `{{ outorgante.* }}`.
- `tsc -p tsconfig.json` **não checa nada** (project references). O comando é
  `bunx tsc --build --noEmit`.
- `numeracao.ts` e `docx.ts` **não são tocados**: o corte de escopo tirou o único
  motivo que havia para mexer em código compartilhado com o Contrato Social — e
  era o item mais delicado da lista.

---

## 9. Migration de transcrição (a grande, ainda não escrita)

**Depende do código acima** — bloco citando placeholder inexistente faz
`gerarComposicao` lançar e derruba a geração inteira.

Cria **versão 2** em `tmpl_bloco_versao` (e baixa `atual` da 1), não `UPDATE` na
versão 1: o histórico precisa mostrar que o catálogo nasceu resumido e foi
transcrito. Zero documentos gerados a partir desses blocos (conferido), então a
recriação é segura.

Escopo, agora com o texto atestado em mãos:

1. Transcrever as Cláusulas 4ª–10ª e 15ª–19ª da parceria (hoje resumidas).
2. Transcrever as Cláusulas 11ª–14ª recuperadas do Bela Vista/Modelo.
3. Alínea da Cláusula Primeira na forma real (~450 caracteres). Todos os
   placeholders já existem em `ENTIDADES.matricula`: `areaCedida`,
   `areaCedidaExtenso`, `area`, `areaExtenso`, `denominacao`, `proprietario`,
   `municipio`, `uf`, `numero`, `livroNumeral`, `livroExtenso`, `folhaNumeral`,
   `folhaExtenso`, `cartorio`, `comarca`, `ufCartorio`, `ccir`.
4. Anexo em prosa (reusa o bloco da alínea) + a cauda do georref.
5. Apagar as duas invenções: o §Único da Cl. 1ª e a ressalva do §Único da Cl. 10ª.
6. Composse: corrigir a citação legal do Considerando IV (é *"Seção VII, artigos
   50 ao artigo 64"* do Decreto 9.580/2.018, mais *"afastando o direito expresso
   no parágrafo primeiro do art. 14 da Lei 4.504/1.964"*, não "artigo 13");
   incluir pecuária na Cláusula Primeira; a Cláusula Décima Primeira tem **9
   alíneas de poderes (a–i)** e **2 de atos restritos**, não parágrafo corrido.
7. Blocos que faltam: parceria §5 da Cl. 5ª, §3 da 9ª, §1 e §3 da 10ª, §Único da
   11ª; composse §Único da 7ª, §1 e §2 da 9ª, e as 4 alíneas da liquidação de
   haveres.
8. Forma: `n.º`, `CEP 78.455-000` (sem dois-pontos), `Bairro Zona Rural`,
   `casado sob o regime de`, `06 (seis)` com zero, `30,00 %` com espaço,
   `Competirão … suportarem`.
9. Referências internas por `{{ refs.<ancora> }}` — a Cl. 4ª cita a Cl. 7ª, a
   composse cita a Cl. 2ª e a 11ª.
10. Reuso: aplicar a **regra de unificação** do § 13 durante a transcrição.

### Defeitos nos assinados, a registrar e não copiar

- O composse cita a parceria como firmada em **11**/10/2022; a parceria diz **10**.
- O composse escreve `Compossuidor Rural` embaixo de Maria Auxiliadora, sem
  concordar, enquanto a parceria concorda (`Parceira Outorgada`).
- O Anexo do composse tem `em, em 11 de outubro`.
- MMS: `seiscentos e setenta e quatros reais`. Bela Vista: `R$ R$ 8.050.169,00`.
- MMS parceria: `Junta Comercial do Estado do Mato Grosso`; o composse, `de`.

---

## 10. Dados de teste (MMS)

`20260901192155_dev_cliente_teste_exploracao_rural.sql` (gitignored, dev-only).
Já corrigido: prefixo `[TESTE] MMS`, vínculo `cliente_clusters` → cluster OSG por
nome, `titularidade.tipo = 'DIREITO'`, 10 culturas, modalidade fora.

**Falta:** `prazo_indivisao_quantidade = 3` / `unidade = 'anos'` /
`indivisao_aviso_quantidade = 3` / `unidade = 'meses'` (Cláusula Quarta do
composse — **a página foi lida**, remover o comentário que diz o contrário);
`numero_vias` 4 na parceria e 3 no composse; foro `Lucas do Rio Verde` / `MT`.

### Armadilhas do banco descobertas ao aplicar

- Trigger `enforce_cliente_tem_cluster` exige vínculo em `cliente_clusters`.
- `titularidade.tipo` só aceita `FATO | DIREITO | USUFRUTO | NUE_PROP`.
- `tmpl_documento.escopo` tinha CHECK com só `sociedade|avulso`.
- `tmpl_documento_bloco` tem UNIQUE `(documento_id, bloco_id)`, não `(…, ordem)`.
- `uq_exploracao_rural_parte` = `(exploracao_rural_id, pessoa_id, papel)`.

---

## 11. Ordem de trabalho e validação

### Feito nesta sessão

| Verificação | Resultado |
|---|---|
| `bunx tsc --build --noEmit` | **limpo** |
| `bunx eslint` nos 14 arquivos tocados | **limpo** |
| `bunx vitest run src/lib/templates` | **608/608** em 24 arquivos |
| Placeholders da migration × vocabulário | **50 campos + 20 seções, todos existem** |
| `bunx vitest run` (suíte completa) | 4.378/4.414 — **36 falhas por timeout** |
| Os 14 arquivos que falharam, rodados isolados | **219/219 passam** |

A suíte completa **é flaky sob carga**, e agora com mais uma amostra: 36 falhas
numa rodada de 211s, e os mesmos 14 arquivos passam em 21s quando rodados sozinhos.
Todas as falhas eram `Test timed out in 5000ms` em testes de componente, nenhuma
tocando código rural. Falha na suíte completa = rodar de novo antes de investigar.

### O que falta

1. **Aplicar as 4 migrations** na ordem do § 7 (pedir confirmação — regra dura).
2. `supabase gen types`.
3. Rodar o arnês (agora precisa de `JWT` e `ANON` no ambiente):
   `bun scripts/osg/render-contratos-mms.ts`
4. Regerar o `.docx` pela tela Gerar e comparar com o assinado.

## 12. Decisões em aberto

**Nenhuma.** As quatro da revisão 1 caíram todas: a página 6 (recuperada do Bela
Vista), o georref (retificado), onde persistir a estrutura (layout saiu do
escopo) e a unificação de blocos (virou regra — § 13).

---

## 13. Regra de unificação de blocos

> Instrução do usuário, 02/09: *"Eu disse de unificar blocos, mas é só se for
> completamente possível. Modificar a redação oficial do contrato não é
> admissível. Mantenha como blocos separados se for o caso de redação diferente
> ou variáveis diferentes. É para isso que existe a montagem de modelos. Eu pedi
> para unificar os que tivessem redação e variáveis 100% iguais."*

**A regra, e não há exceção:** dois blocos só viram um se o texto **e** a lista de
placeholders forem **idênticos, caractere a caractere**. Qualquer diferença de
redação ou de variável = **dois blocos**. A montagem de modelos existe justamente
para que dois documentos possam usar blocos diferentes sem que ninguém reescreva
cláusula nenhuma.

**Retrato de uma ideia minha que estava errada:** eu havia proposto criar uma
redação neutra (`{{ declarante.titulo }} declara(m)…`) para o penhor servir aos
dois contratos. Isso reescreve a cláusula assinada pela banca — está descartado.

### Aplicando a regra ao que já foi lido

O que **não** unifica (verificado, redação diferente):

| Conceito | Parceria | Composse |
|---|---|---|
| Penhor / ciência do prazo | `declara ainda ciência que o penhor … valerá por todo o período de vigência desta parceria` | `declaram ter plena ciência de que o penhor …, previstos no item precedente, valerá pelo prazo da respectiva obrigação garantida … não podendo ser superior ao período de vigência` |
| Destinação do produto | `os frutos oriundos da exploração desta parceria, para liquidação dos débitos contraídos pelos PARCEIROS OUTORGADOS` | `o produto oriundo da venda da produção financiada e/ou os bens vinculados, à liquidação dos respectivos débitos` |
| Fiscalização | `assiste as instituições privadas, incluindo bancárias, comerciais, industriais e financeiras, de fiscalizar os imóveis ora cedidos` | `assiste às Instituições Financeiras de fiscalizar os empreendimentos financiados e vistoriar` |
| Foro | cláusula só de foro | **funde** o acordo irrevogável com o foro numa cláusula |
| Cessão | `vedada aos PARCEIROS OUTORGADOS a cessão` | `Nenhuma das partes poderá ceder ou transferir` |
| Inscrição estadual | `autoriza a abertura das respectivas inscrições estaduais pelas partes` | `A COMPOSSE deverá abrir inscrição estadual …, observado o nome designado` |

Só a cauda da fiscalização é literalmente igual — mas ela é o fim de uma frase,
não um bloco, então não se separa.

O que **unifica** (verificado, 100% igual):

1. **A alínea do imóvel.** A alínea da Cláusula Primeira da parceria é idêntica,
   caractere a caractere e com as mesmas variáveis, à alínea do Anexo Único do
   composse. **Um bloco, dois documentos.**
   (A alínea do Anexo da *parceria* é essa mesma frase **mais** a cauda de
   limites/confrontações/perímetro — e como a cauda está dentro da mesma frase,
   não dá para separar em bloco: fica um bloco próprio.)
2. **O título `Disposições Gerais`.** Mesmo conteúdo, zero variáveis, nos dois
   documentos. (Vale porque o numeral do capítulo é posto pelo motor, não pelo
   bloco.)

**Conclusão honesta:** o reuso real entre os dois instrumentos é **pequeno** — dois
blocos, não os "~10" que eu havia estimado. A estimativa antiga só fechava
porque supunha reescrita de redação. Reuso baixo aqui não é descuido: é o que os
contratos são. Onde há reuso de verdade e em volume é com o cadastro — pessoa,
matrícula, cartório, signatário — e esse já está todo em uso.

Cada bloco novo passa pela regra durante a transcrição: diff caractere a caractere
antes de decidir.

---

## 14. Divergências da própria OSG — levantamento para a banca

18 itens em que a OSG divergiu de si mesma, alguns dentro do mesmo documento.
Não entram no trabalho agora (o critério é completude de conteúdo), mas ficam
registrados para uma eventual padronização com a banca:

percentual `trinta inteiros por cento` vs `dez por cento`; `30,00 %` vs `70%` no
mesmo contrato; data `10 de outubro de 2.025` vs `01/10/2.027`; ponto no ano
inconsistente no mesmo arquivo; `Junta Comercial do Estado **do** Mato Grosso`
(parceria) vs `**de** Mato Grosso` (composse), mesmo cliente; `regime de` vs
`regime da`; ordem profissão/estado civil; campos da testemunha em 3 ordens
diferentes; concordância de gênero na assinatura (a parceria concorda, o composse
não, mesma semana); `Administrador` vs `administrador`; `n.º` vs `nº` no mesmo
documento; CEP em 3 formas no mesmo contrato; considerandos numerados só no MMS;
Anexo em prosa (MMS) vs tabela (Bela Vista); e os três formatos de título de
seção descritos no § 2.

Erros puros, não padrão: o composse cita a parceria como firmada em 11/10 quando
ela diz 10/10; `seiscentos e setenta e quatro**s** reais`; `R$ **R$**`;
`em, em 11 de outubro`; `**A**PÍTULO V` (sem o C, no Contrato Social do Bela
Vista).
