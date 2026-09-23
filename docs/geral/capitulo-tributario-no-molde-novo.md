# O capítulo tributário no molde novo — contrato e de-para

**Em vigor desde 21/09/2026.** Descreve o que a `gerar-slides-tributarios` monta a partir do
papel de trabalho, com o padrão visual novo da consultoria. Quem for mexer nos slides irmãos
(Diagnóstico patrimonial e Organograma societário) começa por aqui.

---

## A coisa que mais custa descobrir sozinho

**O desenho inteiro mora no `.pptx`, e o código só escreve em buracos com nome.** O molde vive
no bucket `osg-templates` de cada ambiente, não no repositório. Isso significa que **molde e
código não compilam juntos e nada acusa a divergência**: um molde velho com código novo
devolve slide em branco, sem erro.

Três consequências práticas:

| | |
|---|---|
| **Ordem de publicação** | **código primeiro, molde depois.** Na ordem inversa a função antiga vê tokens que não espera, apaga, e o slide sai vazio. Na ordem certa, a pior janela é a função nova ver zero token e o slide manter os números do modelo |
| **Nome versionado** | o molde é `TEMPLATE_TRIBUTARIO_V2.pptx`, não sobrescrita do antigo. Ambiente sem o arquivo responde 503 dizendo o que falta, que é falha visível |
| **Trava contra drift** | `TOKENS_DO_MOLDE` em `_shared/planejamento-tributario/tokens.ts` fixa **209**, e o gerador confere a contagem de cada slide antes de escrever |

## O contrato, slide por slide

| Slide | Tokens | Famílias |
|---|---|---|
| 1 capa do capítulo | 0 | estático |
| 2 Premissas, QUADRO 01 | 40 | `Q1_L{01..11}_A{1..3}`, `ANO1-3`, `ANO_BASE`, `CRESCIMENTO` |
| 3 Cenários avaliados | 4 | `PARC_C1_PF/PJ`, `PARC_C2_OPER/PATR` |
| 4 Diferenças nos modelos | 0 | estático: é citação de lei |
| 5 Quadro comparativo da carga | 28 | `F5_*`, 15 distintos |
| 6 Transferência | 14 | `TR_BENS`, `TR_DIVIDAS`, `TR_P{1..6}`, `ANO_P{1..6}` |
| 7 Resumo, QUADRO 02 | 140 | `Q2_L{01..14}_A{1..3}C{1..3}`, `Q2_VAR_*`, `RES_*` |

`{{CLIENTE}}` mora em `ppt/slideLayouts/slideLayout9.xml`, que é o rodapé, e não num slide.

## O QUADRO 01: reagrupamento, não recorte

O modelo novo tem **11 linhas de rótulo fixo** onde o WP tem até 80 contas. A escolha saiu do
consultor e entrou no desenho do slide: não existe mais "entra tudo o que foi preenchido e a
poda acontece no PowerPoint".

O de-para não foi inventado, e **a prova é aritmética**: as partes fecham nos totais e a última
linha dá, ao centavo, o `(=) Lucro/Prejuízo do exercício` da própria planilha.
`montaQuadro01` confere isso em toda geração e registra um problema quando não fecha, porque
número errado plausível é o defeito que ninguém vê.

| Linha | De onde sai |
|---|---|
| Receita bruta da atividade rural | `Receita` |
| Venda da produção agrícola | os cinco subtotais de M.I./M.E. agrícola e beneficiamento |
| Outras receitas da atividade | `Arrendamento/Aluguel` + `M.I. - Outras receitas` |
| (–) Despesas de custeio | `Custos` + `Desp. administrativas` − investimento |
| Insumos, serviços e arrendamentos | `Custos` − investimento − `Tributos e contribuições` |
| Despesas administrativas e tributos | `Desp. administrativas` + `Tributos e contribuições` |
| (=) Resultado operacional | soma das duas primeiras faixas |
| (–) Resultado financeiro | `(+/-) Resultado financeiro` |
| (=) Resultado antes dos investimentos | operacional + financeiro |
| (–) Investimentos | `(-) Máquinas/Equip. (aquisições)` |
| (=) Resultado final do exercício | fecha no lucro da planilha |

**Investimento é aquela conta e só ela**, e isso foi lido, não escolhido: o WP antigo da Família
Lunardi tinha uma linha `(-) Investimentos` somando `Aquisição de imobilizado`, `Benfeitorias`
e `Taxa de manutenção`. No WP atual ela foi dissolvida dentro de `(-) Custos` e a única conta
de capex que sobrou é a de aquisição de máquinas. Reposição de gado fica em custo.

### A convenção de sinal se descobre, não se adivinha

Medido na planilha: `Receita` vem positiva, `(-) Custos` vem com **magnitude positiva** (o
sinal está no rótulo) e `(+/-) Resultado financeiro` vem **já sinalizado**. O parser não mexe
em sinal, e **as duas convenções existem em WP de verdade**. Então o gerador calcula o lucro
dos dois modos e adota o que reconcilia com o que a planilha escreve. Adivinhar pelo prefixo
do rótulo seria frágil.

## O QUADRO 02: agrupa pela LINHA, nunca pelo rótulo

A aba `Resumo` **repete rótulo**: `IRPJ/CSLL` aparece duas vezes e `INSS` três, uma sob cada
grupo. Casar por nome transformava as três numa e as últimas sobrescreviam as anteriores. O
código abre grupo quando encontra o cabeçalho e mapeia o que vem depois.

Duas linhas da aba caem no mesmo slot de propósito: `PIS/Cofins` e `CBS` viram a única linha
`IBS e CBS`. Os dois regimes não convivem no mesmo exercício, então somar dá a carga de consumo
do ano e fecha contra o total do grupo.

**A variação é recalculada dos totais, não lida da aba.** A linha `Redução` guarda a RAZÃO
(`E33/D33 = 0,68`), não a variação. Lida literalmente, o slide diria "68%" sob um rótulo que
diz "variação em relação ao cenário 01", quando a verdade é −32%.

**Linha da aba sem destino no modelo vira aviso**, não desaparece calada. Na Lunardi são
`ITBI`, `Fundos de Investimento` e `Custo da estrutura`, e as três ficam fora do `Total`, então
descartá-las não desequilibra nada.

## O slide 5: metade lida, metade calculada

Seis das oito alíquotas base vêm de `wp_farol`, e seis números do slide são soma delas. A
metade de **arrendamento** a aba não descreve: está conferido número por número que as quatro
colunas dela são parceria rural. Então duas constantes vivem no código, cada uma com a citação:
a redução da CBS para arrendamento de imóvel (que a nota de rodapé da própria aba cita) e a
presunção sobre receita de aluguel. **As duas saem num aviso em toda geração.**

Dois cuidados que o código toma:

1. **O bloco faz parte da chave de busca.** `Tributação com base no faturamento` existe sob
   IRPF/IRPJ/CSLL, sob PIS/Cofins e sob IBS e CBS, e a linha do FUNRURAL é a mesma frase com
   expoente. Sem o bloco a busca traz 5,50% onde deveria vir 1,63%.
2. **Valor de texto passa como está.** O consultor pendura a chamada de nota no valor, e o
   rodapé do slide cita essa nota. Reformatar perderia a âncora; o número é extraído do texto
   só para somar.

**WP sem aba `Farol` continua funcionando.** Os estudos anteriores ao modelo novo não têm essa
aba, porque o quadro era digitado direto no PowerPoint. Nesse caso as alíquotas saem pelo valor
de lei declarado em `ALIQUOTAS_BASE` e um aviso diz quantas não vieram da planilha.

**O modelo da consultoria imprimia 3,08% onde a aba diz 3,22%.** Resolvido em favor da aba, por
decisão de 21/09: o slide não contradiz a planilha. O composto acompanhou, de 16,51% para
16,65%.

## O que ficou estático, e por quê

Rótulo de estrutura (`QUADRO 01`, `CENÁRIO 01`), citação de lei (Código Civil, Lei 4.504/64,
RICMS/MT, LC 224/2025) e os textos editoriais dos slides 1, 3, 4 e 6. O `100%` do slide 3
também: exploração direta é sempre 100%.

## O que saiu do capítulo

O slide do Farol como checklist e as caixas de comentário por tributo. `wp_farol` segue sendo
lido, agora pelo quadro comparativo; **`wp_comentario` segue sendo importado e não vai mais ao
slide**. O dado não se perde, ele só não tem mais lugar aqui. Regra do dono do produto: o
modelo é autoridade sobre o conteúdo, e o que ele não mostra deixa de sair.

A apuração do IRPF também encolheu: de uma tabela de 18 linhas para dois números e um fluxo de
seis parcelas. **O 7º ano da aba não tem coluna no fluxo**, e o corte deixou de ser calado: o
aviso diz quanto ficou de fora, o que importa porque a faixa do slide afirma que o recebimento
quita as dívidas.

## Estado, e o que falta

| | |
|---|---|
| **Sandbox** | molde no bucket e função publicada |
| **Produção** | **nada.** O bucket de lá só tem o molde antigo, e a função de lá é a anterior. Subir o molde é passo humano, e tem de acontecer **antes** de o código chegar na `main` |
| **Provas** | 199 testes em `slides.test.ts`, `tokens.test.ts` e no parser |

**Duas decisões abertas, e são da consultoria:**

1. **O modelo se contradiz no nome dos cenários.** O slide 3 escreve "CENÁRIO ATUAL / 01 / 02",
   igual ao WP; o slide 7 escreve "CENÁRIO 01 / 02 / 03". É texto estático, conserta em uma
   linha, mas alguém tem de escolher.
2. **A aba `Farol` ganha um bloco de arrendamento?** Se ganhar, as duas constantes do slide 5
   saem do código e a metade direita passa a acompanhar a planilha.

## Referências

- `supabase/functions/_shared/planejamento-tributario/slides.ts` — o conteúdo, puro
- `supabase/functions/_shared/planejamento-tributario/tokens.ts` — o contrato com o molde
- `supabase/functions/gerar-slides-tributarios/index.ts` — a escrita no arquivo
- `src/lib/planejamento-tributario/mapa.ts` — de onde cada célula do WP é lida
- [As fixtures da PT-01](../../src/lib/planejamento-tributario/__fixtures__/README.md) — os gabaritos contra os quais os números são conferidos
