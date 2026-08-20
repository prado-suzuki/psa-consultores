# 10 — Conferência direta contra os .docx oficiais do Drive

Pedido: reconferir se pegamos todas as variáveis do modelo — não confiando só na
transcrição em `05-`/`06-` (que pode ter erro), e sim lendo os `.docx` oficiais de
verdade, direto do Drive (mesmos IDs já citados no cabeçalho de `05-`/`06-`):

- `VF_Contrato Modelo Parceria Benfeitorias não indenizaveis_Com cláusula do Ciclo
  Completo.docx` (`1g9vN7avGEBdOALJ9N7adjj8GjFnzFzVR`)
- `VF_Modelo Anexo Único_Parceria.docx` (`1oQyVvkuxNnFe4jR41o4i_U-X75GGRixS`)
- `VF_Contrato Modelo_Composse Rural.docx` (`1OpoA2d2_uJNYGuAta6IhcBXAb0_vLi7H`)
- `VF_Modelo Anexo Único_Composse.docx` (`1dpbHBMTmZmuCrx7p2mN36Ubs5aB6RpcP`)

## Resultado, em números

Medi quanto do texto final é de fato variável (fixture completa, os dois tipos):

| | Blocos | Caracteres totais | Caracteres de variável | % |
|---|---|---|---|---|
| Parceria | 48 | 10.695 | 1.166 | 10,9% |
| Composse | 40 (1 descartado) | 11.722 | 1.474 | 12,6% |

**~11-13% do texto é variável — o resto (87-89%) é redação fixa da banca.** Isso é
esperado: os dois instrumentos são regidos por lei (Estatuto da Terra, Decreto
59.566/66, Código Civil) e a banca não reescreve cláusula de responsabilidade, direito
de preferência, extinção de contrato etc. por cliente. O estranhamento fazia sentido
verificar, mas o padrão não é anormal.

## O que a conferência linha a linha confirmou (sem gap)

Cada `{{campo}}` dos dois `.docx` foi cruzado contra `contratoRuralBlocos.ts` — todo
campo do modelo está capturado, ainda que com nome de placeholder diferente porque
reaproveitamos os mapeadores do Contrato Social (`denominacao`→`razaoSocial`,
`cpf_cnpj`→`cnpj`, `capitalSocial`→`capitalValor`, `endereco_logradouro`+`numero`+
`bairro`+`municipio`+`uf`+`cep` → um único `endereco` em prosa via `enderecoProsa`,
que confirmei incluir todos os 6 componentes — nenhum foi descartado ao virar prosa).

A qualificação PF/PJ do preâmbulo (nascido em, natural de, portador do RG…) **não
está escrita no `.docx`** — ele só tem a instrução `[Qualificação completa da
empresa/dos outorgados]`. Essa redação detalhada foi reconstruída, corretamente, a
partir do contrato assinado real (`exemplo-02-parceria-bela-vista.md`), como o
cabeçalho de `05-` já registrava — não é erro, é a fonte documentada certa pra um
campo que o `.docx` deixa em aberto.

## O que a conferência achou de novo (4 gaps reais, corrigidos)

1. **Anexo Único inteiro faltando na Parceria.** A Cláusula Primeira já promete
   "...dispostos no ANEXO ÚNICO deste instrumento" e existe um `.docx` oficial
   próprio pro anexo da Parceria — mas `BLOCOS_PARCERIA` nunca teve esse bloco, só a
   Composse tinha. Adicionado `par-anexo` (mesma tabela do `com-anexo`) com a frase
   de cabeçalho que os dois `.docx` de anexo têm ("Descrição das áreas objeto do
   Instrumento... pactuado entre/firmado por [partes], em [data], sendo:") — que
   também faltava no anexo da Composse. Os dois ganharam a frase agora.
2. **Percentuais sem "por extenso".** Os dois `.docx` pedem "[% em número e por
   extenso]", confirmado no contrato assinado ("10% (dez por cento)"). Nosso
   `percentualOutorgante`/`percentualExplorador`/`compossuidor.fracao` só tinham o
   número. Corrigido com um wrapper novo (`comExtensoPorCento`, em
   `contratoRuralContexto.ts`) que usa `cardinalExtenso` do motor real — não usa
   `percentualExtenso` do motor porque aquele é o registro cartorial do Contrato
   Social ("dez inteiros por cento"); o exemplo rural real omite "inteiros" pra
   número redondo.
3. **"antes do vencimento" faltando na Cláusula Quarta da Composse.** O `.docx` diz
   "...se não houver, por escrito, 03 (três) meses **antes do vencimento**, o
   requerimento de divisão..." — a transcrição (`06-` e `contratoRuralBlocos.ts`)
   tinha o prazo mas não a frase, então o texto saía sem dizer em relação a quê os 3
   meses contam.
4. **Letra de alínea sem suporte a "aa"/"bb" além de "z".** O `.docx` da Composse
   documenta um exemplo com origens "Itens 'a' ao 'z' advém de..." **e** "AA ao BB
   Arrendamento.." — confirmando que a banca tem casos reais com mais de 26 grupos.
   Nossa geração de letra usava `String.fromCharCode(97 + n)`, que produz caractere
   inválido a partir do 27º item — em dois lugares (`agruparOrigensDistintas` e o
   auto-numerador de imóveis em `ExploracaoRuralImoveisTab.tsx`). Troquei os dois
   por `letraAlinea` — função já existente e testada no motor real (`extenso.ts`),
   que já faz "27 → aa" no estilo planilha. Reuso, não código novo.

## O que a conferência achou e decidiu NÃO ser gap

A lista de culturas do `.docx` da Parceria vem com ~14 culturas já escritas
("soja, milho, algodão, cana de açúcar, sorgo, milheto, feijão, arroz, girassol,
crotalária, braquiária, capim sudão, eucalipto, milho pipoca") — mas o contrato
assinado real usa uma lista **diferente e mais curta** ("soja, algodão herbáceo,
milho, café, cana-de-açúcar, cacau, feijão, outros cereais"). Isso prova que a lista
do `.docx` é só um ponto de partida editado por cliente na prática — `culturas` como
campo livre por cliente (o que já fazíamos) está certo, não é erro de modelagem.
