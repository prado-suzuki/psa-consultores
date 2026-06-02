# Catálogo de Vagas, Famílias de blocos e Flags

Espinha de design para o gerador de documentos OSG: enumera, a partir dos **contratos
reais analisados**, as *vagas* de cada documento, as *famílias* de blocos que as preenchem
(o "hot swap") e as *flags* que selecionam a variante. Base para desenhar a tela de
**criação de blocos** e a de **montagem de documentos**.

> Status: **documentação de design**. Nada aqui é migration ou schema final — é o mapa que
> orienta as decisões. Complemento de [`arquitetura-sintese.md`](./arquitetura-sintese.md).

## Como ler

- **Vaga (slot)**: uma posição que sempre existe no documento (ex.: "Objeto Social"). Estável.
- **Família**: o conjunto de blocos *alternativos e mutuamente exclusivos* que podem preencher
  uma vaga. Escolhe-se **um** por documento. Trocar o irmão ativo = "hot swap".
- **Partial**: bloco embutível com binding, reusado entre documentos (qualificações).
- **Iteração**: vaga repetida uma vez por item de uma coleção (sócios, imóveis…).
- **Flag**: o seletor que decide qual variante entra. Tipos:
  - `derivada-atributo` — campo direto de um cadastro (`pessoa.tipo_pessoa`, `matricula.georreferenciado`).
  - `derivada-computada` — consulta/contagem sobre os cadastros (nº de sócios = 1 → unipessoal).
  - `manual-projeto` — decisão do consultor, não é fato de cadastro (administração isolada×conjunta).
  - **categórica** — quando a família tem N>2 alternativas, o seletor é um enum (`tipo_administracao ∈ {isolada,conjunta,diretoria}`) em vez de N booleanos.

Origem das flags (resumo): a maioria das `derivada-*` mora **nos cadastros** (matrícula, bem,
pessoa, quadro societário); as `manual-projeto` moram num registro por projeto. Ver
[`arquitetura-sintese.md`](./arquitetura-sintese.md) e a nota `02_Principio_Banco_vs_Template`
do vault.

---

## Primitivos compartilhados (partials) — transversais a todas as famílias

| Partial | Família (variantes) | Flag seletora | Origem |
|---|---|---|---|
| `qualificacaoPessoa` | PF casado · PF solteiro · PF viúvo/separado · **PJ** · **espólio** (+ inventariante) | `tipo_pessoa`, `estado_civil` | `pessoa` (atributo) |
| `qualificacaoImovel` | com memorial georref (azimutes/coord.) · com memorial por rumos magnéticos · sem memorial (só matrícula/CNIR) | `matricula.georreferenciado`, `tem_memorial` | `matricula` (atributo) |
| (modificador de imóvel) | integral · **desmembrado** ("X ha desmembrada de Y ha") | `imovel_desmembrado` | `bem`/`matricula` |
| `endereco` | completo · sem complemento | — (presença de campo) | `pessoa`/`sociedade` |
| `foro` | comarca da sede | — | derivada da sede |
| `assinatura` | sócio · sócio + **outorga conjugal** · representante de PJ · inventariante | `socio_casado_com_outorga` | `pessoa` |

Evidência: a qualificação PF aparece idêntica em MMS Agro, Bragança, Barralcool, Parceria e
Composse; PJ e espólio aparecem em Barralcool (41 sócios, 1 PJ, 3 espólios); memorial georref×rumos
coexiste no mesmo documento (Composse, itens "a–e" vs "c").

---

## Documento: Contrato Social (Constituição)

Vagas na ordem do documento (numeração das cláusulas do modelo Agro/Controladora):

| # | Vaga | Família (variantes) | Flag seletora | Origem |
|---|---|---|---|---|
| Preâmbulo | Qualificação de cada parte | usa `qualificacaoPessoa` (itera sobre sócios) | por pessoa | `pessoa` |
| Cl. 1ª | Denominação + regência | única | — | — |
| Cl. 2ª | Sede + filiais | com filiais · sem filiais | `tem_filiais` | cadastro sede |
| Cl. 4ª | **Objeto Social** | agro (cultivo/pecuária) · holding (participação/CNAE) · misto | `tipo_sociedade` (**categórica**) | atributo da PJ / decisão |
| Cl. 5ª | Capital + subscrição | itera sobre sócios → tabela SÓCIOS/QUOTAS/VALOR + TOTAL | — (iteração) | quadro societário |
| Cl. 5ª §2 | **Forma de integralização** (por sócio) | por bens imóveis · em dinheiro · por quotas de outra PJ · mista | `forma_integralizacao` (**categórica**, por aporte) | cadastro do aporte |
| Cl. 5ª §2 | Outorga conjugal | presente · ausente | `socio_casado_com_outorga` | `pessoa` (estado_civil+regime) |
| Cl. 6ª | **Administração** | isolada · conjunta · diretoria colegiada (3–5) | `tipo_administracao` (**categórica**) | **manual-projeto** |
| Cl. 6ª | Administrador | é sócio · não é sócio (exige qualificação completa) | `administrador_e_socio` | quadro societário |
| Cl. 6ª/17ª | Poderes ampliados ao administrador (campos "amarelos" transferidos da Reunião) | padrão · ampliado | `administrador_poderes_ampliados` | **manual-projeto** |
| Cl. 8ª §3 | Apuração de haveres | fluxo de caixa descontado · patrimônio líquido · ambas | `metodologia_haveres` (**categórica**) | **manual-projeto** |
| Cl. 18ª | Acordo de Quotistas | sem acordo (genérico) · com acordo já assinado (cita data/partes) | `tem_acordo_quotistas` | **manual-projeto** (+ data) |
| Cap. XII | Condição Unipessoal (Cl. 20ª–21ª; desliga cláusulas) | presente · ausente | `sociedade_unipessoal` | `derivada-computada` (nº sócios = 1) |
| Cl. 22ª | Foro | comarca da sede | — | derivada |
| Fecho | Assinaturas | itera sobre sócios → usa partial `assinatura` | por pessoa | `pessoa` |

Notas de evidência:
- **Objeto**: agro em MMS Agro/Bragança; holding em Barralcool/MMS Participações.
- **Integralização**: por imóveis (MMS Agro), em dinheiro (Denise na Bragança), por quotas de outra
  empresa (Barralcool, MMS Participações). Coexistem **no mesmo contrato**, por sócio.
- **Administração**: isolada (MMS Agro), "conjunta ou isoladamente" (Bragança), Diretoria 3–5 (Barralcool).
- **Haveres** e **acordo de quotistas**: o próprio modelo marca como "OPCIONAL – VALIDAR COM LÍDER"
  e "UTILIZAR QUANDO DEIXAR AS DUAS ALÍNEAS" → decisões de projeto.
- **Unipessoal**: o Cap. XII explicitamente desativa cláusulas (9ª, 11ª, 12ª, 13ª, 16ª, 18ª) quando
  a sociedade fica com um sócio só.

---

## Documento: Alteração Contratual

Não é uma família de cláusulas como a constituição — é um **diff versionado sobre o estado da
sociedade**, com **dupla saída**. Estrutura:

| Parte | Conteúdo | Observação |
|---|---|---|
| Preâmbulo | qualificação dos sócios atuais + identificação da PJ (nome/CNPJ/NIRE) + "resolvem alterar e consolidar" | reusa `qualificacaoPessoa` |
| **Resoluções** | um bloco por **evento** ocorrido | ver tabela abaixo |
| Cláusula de cláusulas alteradas | "alteram-se as Cláusulas X, Y; ratificam-se as demais" | lista derivada de quais eventos tocaram quais vagas |
| **Consolidado** | re-render completo e re-numerado do Contrato Social, com estado **pós-evento** | reusa toda a composição da constituição |
| Fecho | assinaturas + testemunhas | |

Família de **blocos-de-resolução** (cada um entra se o evento correspondente ocorreu):

| Bloco de resolução | Flag (evento) | Origem |
|---|---|---|
| Alteração de endereço (delta antigo→novo) | `evento_alteracao_endereco` | ledger de eventos* |
| Aumento de capital (delta + distribuição) | `evento_aumento_capital` | ledger* |
| Integralização (imóveis/quotas) | `evento_integralizacao` | ledger* |
| Renúncia ao direito de preferência | `evento_aumento_capital` (decorrente) | derivada |
| Novo quadro societário (snapshot pós-evento) | sempre que houve evento de capital/sócio | computada |
| Cessão de quotas (cedente→cessionário) | `evento_cessao_quotas` | ledger* |
| Retirada / ingresso de sócio | `evento_mudanca_socios` | ledger* |
| Nova administração | `evento_mudanca_administracao` | ledger* |
| Declaração de desimpedimento | sempre que muda administrador | derivada |

\* O **ledger de eventos / quadro societário ao longo do tempo não existe ainda** — é o
pré-requisito da fase 4 (ver `arquitetura-sintese.md`). Hoje as flags de evento não têm de onde
vir. Evidência: 1ª Alteração MMS Part. (aumento + integralização por quotas); 2ª Alteração MMS Agro
(endereço + aumento + integralização + cessão total → unipessoal + nova administração + consolidação).

---

## Documentos agrários: Parceria e Composse

Reaproveitam os **partials** (qualificação PF/PJ, qualificação de imóvel + memorial, foro,
testemunhas, valores por extenso) e a **iteração de imóveis**; o resto é específico.

### Contrato de Parceria Rural

| Vaga | Família | Flag | Origem |
|---|---|---|---|
| Fundamentação | Estatuto da Terra (constante) | — | — |
| Objeto (cessão de posse) | itera sobre imóveis objeto | — | matrícula/bem |
| **Benfeitorias** | indenizáveis · **não indenizáveis** | `benfeitorias_indenizaveis` | manual-projeto |
| Vigência | determinada · prorrogável por prazo indeterminado | `vigencia_prorrogavel` | manual-projeto |
| Partilha de frutos | % outorgante / % outorgado | — (campo) | projeto |
| Culturas permitidas | lista enumerada | — (iteração) | projeto |
| Anuência a penhor/financiamento | presente · ausente | `permite_penhor` | manual-projeto |
| Cultura específica (ex.: algodão) | bloco condicional de qualidade/compensação | `tem_cultura_algodao` | projeto |

### Contrato de Composse (pro indiviso)

| Vaga | Família | Flag | Origem |
|---|---|---|---|
| Objeto (composse) | itera sobre compossuidores → **fração ideal** por compossuidor | — (iteração) | titularidade/quadro de posse |
| Imóveis | itera sobre imóveis → qualificação + memorial; área objeto ≠ área total | `imovel_desmembrado` | matrícula |
| **Origem da posse** (por imóvel) | parceria · arrendamento · herança | `tipo_instrumento_origem` (**categórica**) | nova entidade "instrumento de origem" |
| Nome de giro | "[compossuidor] E OUTROS" | — (derivada) | — |
| Prazo de indivisão | determinado · prorrogável | `indivisao_prorrogavel` | manual-projeto |

Específico de composse que **não está em cadastro padrão**: fração ideal por compossuidor;
instrumento de origem da posse (com suas próprias partes: outorgante/herdeiros/meeira); área cedida
distinta da área da matrícula.

---

## Catálogo consolidado de flags

| Flag | Tipo | Origem | Governa |
|---|---|---|---|
| `tipo_pessoa` | derivada-atributo | `pessoa` | qualificação PF/PJ/espólio |
| `estado_civil` / `regime_bens` | derivada-atributo | `pessoa` | qualificação + outorga conjugal |
| `socio_casado_com_outorga` | derivada-computada | `pessoa` | bloco/partial de outorga conjugal |
| `matricula.georreferenciado` | derivada-atributo | `matricula` | memorial do imóvel |
| `tem_memorial` | derivada-computada | `matricula` | memorial × sem memorial |
| `imovel_desmembrado` | derivada-atributo | `bem`/`matricula` | menção a área-mãe |
| `sociedade_unipessoal` | derivada-computada | quadro societário (nº=1) | Capítulo da Condição Unipessoal |
| `administrador_e_socio` | derivada-computada | quadro societário | qualificação do administrador |
| `tem_filiais` | derivada-atributo | sede | parágrafo de filiais |
| `tipo_sociedade` | categórica (atributo/decisão) | PJ | Objeto Social |
| `forma_integralizacao` | categórica | cadastro do aporte | parágrafo de integralização |
| `tipo_administracao` | categórica · manual-projeto | projeto | Cláusula de Administração |
| `administrador_poderes_ampliados` | manual-projeto | projeto | poderes ampliados |
| `metodologia_haveres` | categórica · manual-projeto | projeto | apuração de haveres |
| `tem_acordo_quotistas` | manual-projeto | projeto (+ data) | cláusula de acordo de quotistas |
| `evento_*` (endereço, capital, cessão, sócios, administração) | derivada-computada | **ledger (inexistente)** | blocos de resolução da Alteração |
| `benfeitorias_indenizaveis`, `vigencia_prorrogavel`, `permite_penhor` | manual-projeto | projeto | cláusulas de Parceria |
| `tipo_instrumento_origem`, `indivisao_prorrogavel` | categórica / manual | projeto / nova entidade | cláusulas de Composse |

---

## Iterações (coleções) identificadas

- **Sócios** → preâmbulo (qualificação), tabela de capital (quotas/valor), assinaturas.
- **Imóveis integralizados por sócio** → aninhada (sócio → seus imóveis → matrícula → cartório).
- **Compossuidores** → fração ideal por um (Composse).
- **Imóveis objeto** → Parceria/Composse.
- **Filiais**, **atividades do objeto (alíneas)**, **poderes do administrador (alíneas)**,
  **culturas permitidas**, **testemunhas** — coleções menores.

---

## Pontos de schema a decidir (registrados, sem migration)

1. **Famílias N-árias exigem flag categórica.** Hoje `tmpl_bloco_flag` é só conjunção booleana (AND).
   Administração (3), integralização (3+), instrumento de origem (3), qualificação (5) são N-árias —
   pediriam ou N booleanos com "exatamente um verdadeiro" ou um seletor categórico.
2. **Campo de gênero/sexo em `pessoa`** — metade da concordância (sócio/sócia, casado/casada) depende disso.
3. **Quadro societário como ledger de eventos** (quotas/capital/administração datados) — pré-requisito
   das Alterações; é o que produz as flags `evento_*` e os snapshots antes/depois.
4. **Forma de integralização por aporte** — entidade que liga sócio↔capital com origem (dinheiro/bens/quotas de PJ).
5. **Onde moram `tipo_sociedade` e `tipo_administracao`** — atributo da PJ, decisão de projeto, ou ambos.
6. **Instrumento de origem da posse** (Composse) e **fração ideal** — entidades/atributos próprios.

Cada item acima é também uma **flag derivada em potencial** — coerente com o princípio "cada flag
derivada é pista do que falta modelar" (nota `03_Arquitetura` do vault).
