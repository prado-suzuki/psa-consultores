# O texto que explica a tela

**Em vigor desde 17/09/2026.** Padrão único das explicações contextuais: rótulo, texto de apoio,
tooltip, mensagem contextual e placeholder. Vale para rota nova e para tela que se mexe.

Abra na árvore (§2), confirme a regra do recurso (§3) e olhe um exemplo (§5). Se levar mais de
dois minutos, o problema é deste documento.

## 1. Princípio geral

**Antes de acrescentar uma explicação, torne o próprio controle mais claro.** Texto explicativo é
o último recurso, não o primeiro: ele custa espaço, envelhece sozinho e compete com o rótulo que
a pessoa está lendo. Explicação não conserta fluxo confuso — só o adia.

E a regra que decide os casos difíceis: **informação necessária para preencher, decidir ou
interpretar não pode depender de passar o mouse.**

## 2. Árvore de decisão

Do mais barato ao mais caro. Só desce um degrau quem não resolveu no anterior.

| | Pergunta | O que fazer |
|---|---|---|
| **0** | O controle tem nome claro? | **Não:** dê nome a ele. Se for só ícone, **nome acessível** (`aria-label`) e, quando ajudar a descoberta visual, `<Tooltip>` com o mesmo texto |
| **1** | O próprio rótulo pode resolver a dúvida? | **Sim:** melhore o rótulo e não acrescente nada |
| **2** | O que a pessoa procura pode ficar visível na tela? | **Sim:** mostre o valor, em vez de explicar onde encontrá-lo |
| **3** | A orientação precisa estar disponível durante a ação? | **Texto de apoio**, permanente, abaixo do controle |
| **4** | É complementar, curta, e não é necessária para concluir? | **Tooltip** |
| **5** | Nada disso agrega? | **Não escreva nada** |

**Placeholder e mensagem contextual não são degraus desta árvore**, e isso é de propósito: a
árvore responde "a pessoa não entendeu este controle". Placeholder é **forma do campo** e nunca
resolve dúvida; mensagem contextual não nasce de dúvida, nasce de um **estado do sistema**. Os
dois têm regra própria em §3.

**No degrau 0, "não repita o rótulo" não vale.** Botão só de ícone não tem rótulo para repetir:
aquele texto **é** o nome. Tooltip e nome acessível cumprem funções diferentes ali — um é
percebido por quem olha, o outro por quem navega — e dizer a mesma coisa nos dois está certo.

Por isso o documento nomeia **dois papéis diferentes**, e eles nunca se misturam:

- **Rótulo exposto de controle** — "Editar OS", "Minimizar", "Dispensar". É nome.
- **Explicação contextual** — explica conceito, consequência, origem do dado ou comportamento.

Teto, pontuação e a regra de repetição valem para o segundo. Aplicá-los ao primeiro apaga o único
nome que aquele botão tem.

## 3. Padrão por recurso

### Rótulo de campo ou de controle (degrau 1)

| | |
|---|---|
| **Quando usar** | sempre; é ele que carrega o significado |
| **Quando não usar** | — |
| **Estrutura** | substantivo ou expressão nominal; 1 a 3 palavras |
| **Tamanho** | até 30 caracteres |
| **Tom** | neutro, sem artigo inicial |
| **Terminologia** | o nome que o item tem na tela (§4) |
| **Adequado** | `Válido até` |
| **Inadequado** | `Validade` + tooltip "Informe o período de validade desta configuração." |

### Rótulo exposto de controle (degrau 0)

| | |
|---|---|
| **Quando usar** | botão, aba ou ícone **sem texto visível** |
| **Quando não usar** | o controle já tem texto — aí é redundância |
| **Estrutura** | verbo no infinitivo + objeto: "Editar OS" |
| **Tamanho** | até 30 caracteres, **sem ponto final** |
| **Tom** | imperativo impessoal, nomeia a ação |
| **Terminologia** | o mesmo verbo do botão equivalente com texto |
| **Marcação** | `aria-label` **sempre**; `<Tooltip>` com o mesmo texto quando a descoberta visual ajudar |
| **Adequado** | `Remover contribuinte` |
| **Inadequado** | `Clique aqui para remover o contribuinte desta lista.` |

### Texto de apoio (degrau 3)

| | |
|---|---|
| **Quando usar** | instrução ou restrição que vale **toda vez** que a pessoa preenche |
| **Quando não usar** | é curiosidade, definição ou detalhe secundário → tooltip |
| **Estrutura** | uma frase, afirmativa, começando pela consequência |
| **Tamanho** | até 120 caracteres |
| **Tom** | fala com a pessoa quando há ação; impessoal quando descreve o dado |
| **Terminologia** | §4 |
| **Marcação** | `<FormDescription>` dentro da composição `FormItem` (10 arquivos hoje). Fora dela, `<p className="text-sm text-muted-foreground">` **com `id` e `aria-describedby` no campo** — sem isso o texto existe e não é anunciado |
| **Adequado** | `O cliente precisa estar vinculado a pelo menos um cluster.` |
| **Inadequado** | a mesma frase escondida em tooltip |

### Explicação contextual — tooltip (degrau 4)

| | |
|---|---|
| **Quando usar** | explicar conceito secundário, origem do dado ou consequência de uma ação |
| **Quando não usar** | o rótulo está ambíguo (degrau 1) · a informação é necessária para concluir (degrau 3) · depende do estado (mensagem contextual) · explica o óbvio |
| **Estrutura** | **uma ideia**, 1 a 2 frases curtas; a ação, quando houver, no fim |
| **Tamanho** | até 140 caracteres, **com ponto final**. Acima disso não é tooltip: é nota de leitura e mora visível na tela |
| **Tom** | descreve o dado; fala com a pessoa só quando há ação |
| **Terminologia** | §4 |
| **Marcação** | `<Tooltip>`, atrás de um ícone (i). **`title=` não é mecanismo de explicação** (ver §4) |
| **Adequado** | `Produto contratado nesta OS sem projeto criado. Clique para abrir um.` |
| **Inadequado** | `Use os campos abaixo para filtrar a consulta das notas fiscais.` |

### Mensagem contextual

| | |
|---|---|
| **Quando usar** | a orientação depende do **estado**, da etapa ou de uma recusa |
| **Quando não usar** | vale sempre → texto de apoio |
| **Estrutura** | duas partes: **o que aconteceu** · **o que fazer agora** |
| **Tamanho** | até 140 caracteres por parte |
| **Tom** | 2ª pessoa; nunca afirma causa que o sistema não conhece |
| **Terminologia** | **sai do catálogo** `src/lib/rlsMessages.ts` — frase nova só entra ali, e só quando a orientação for diferente das que já existem |
| **Adequado** | `Selecione um cliente para listar os contribuintes disponíveis.` |
| **Inadequado** | `Erro ao atualizar cliente: violates row-level security policy` |

### Placeholder

| | |
|---|---|
| **Quando usar** | mostrar **formato esperado**, ou marcar o estado vazio de um campo de escolha ou busca |
| **Quando não usar** | no lugar do rótulo · para instrução essencial · repetindo o rótulo |
| **Estrutura** | uma das quatro formas canônicas, e nada mais: `Selecione…` · `Buscar…` · `Ex: 12.345.678/0001-90` · vazio |
| **Tamanho** | até 40 caracteres; reticências é `…`, nunca `...` |
| **Tom** | instrução genérica, igual em todas as telas do mesmo componente |
| **Terminologia** | quando o componente compartilhado já traz um texto, é ele que vale — texto sob medida compete com o rótulo em vez de ajudar |
| **Adequado** | `Selecione…` |
| **Inadequado** | `Selecionar gestor...` |

**Texto de lista vazia é a exceção conhecida:** ele fica **específico** ("Nenhum cliente
encontrado."), porque nomeia o que não foi achado, e isso é informação.

## 4. Voz e terminologia

Sete regras, e nenhuma que o exemplo já ensine:

1. Comece pela informação que faz a pessoa **decidir ou agir**.
2. Voz ativa e frase direta.
3. **Não repita o rótulo** — exceto no degrau 0, onde o texto é o nome.
4. Não explique o óbvio.
5. **Uma ideia por texto.** Duas ideias são dois textos, e quase sempre dois recursos diferentes.
6. A mesma palavra para o mesmo conceito, sempre.
7. Informação necessária para preencher, decidir ou interpretar **não depende de hover**.

**O vocabulário não se inventa aqui.** Já está decidido em dois lugares, e os dois valem:

- **`src/lib/rlsMessages.ts`** (catálogo da sprint 12) — o item é nomeado **pelo nome que aparece
  na tela** ("o contribuinte", "a OS {número}", "o rateio de receita"); `É necessário ter…` para
  condição; `Não foi possível {ação} {item}.` para falha; fecho fixo por categoria.
- **`src/lib/rotulosDeStatus.test.ts`** — uma palavra por chave de status, no masculino.

**Nunca aparecem no texto que a pessoa lê:** nome de tabela, coluna, função ou RPC; identificador
interno; código de erro; inglês do Postgres ou do PostgREST. Isso vai para o `console.error`, que
é o que permite abrir chamado sem reproduzir o erro.

**O mecanismo também é vocabulário.** Explicação nova usa `<Tooltip>`; nome de botão de ícone usa
`aria-label`; `title=` só em `<iframe>`, que é título de quadro. Os **143 `title=`** de hoje são
dívida inventariada na tarefa 14 da sprint 13 — este documento não os converte, **impede o
144º**.

## 5. Antes → depois, do próprio produto

**Explica o óbvio** — `ConsultaXmlFilters.tsx:36`
`Use os campos abaixo para filtrar a consulta das notas fiscais.` → **sem tooltip.** Um campo de
filtro rotulado já diz isso.

**Dois papéis no mesmo balão** — `DevFilterFormPattern.tsx:204`
`Contribuinte é a inscrição estadual associada ao cliente. Selecione um cliente primeiro para
listar os contribuintes disponíveis.` → **tooltip:** "Inscrição estadual associada ao cliente." ·
**mensagem contextual, quando não há cliente escolhido:** "Selecione um cliente para listar os
contribuintes." A redação não conserta isso: o texto nasceu fazendo trabalho de dois recursos.

**Duas ideias** — `TabA170.tsx:602`
`Mostra se a linha já possui correção aplicada e se a tabela está em modo de edição.` → duas
colunas, ou dois textos. Uma ideia por texto (regra 5).

**Vocabulário divergente** — `ContribuintesTab.tsx:425`
`Excluir contribuinte já cadastrado exige o papel Sublíder ou superior` → a mesma informação já
existe curada no catálogo: `É necessário ter o papel de Sublíder ou superior para realizar esta
ação.` Duas redações do mesmo fato, a dois arquivos de distância.

**Mecanismo errado** — `BoardPreenchimentoSistema.tsx:66` e `:98`
`title="Não foi possível medir -- a consulta falhou."` → é **mensagem contextual**, e por estar em
`title` some no toque. Vai para a tela, com travessão de verdade (`—`).

**Tamanho errado, conteúdo certo** — `DocumentoCentroRail.tsx:246`
`Fecha esta versão (fica preservada como está) e abre uma nova a partir dela, com os mesmos dados
e ajustes — para seguir editando sem perder o que já validou.` (158) → `Fecha esta versão e abre
uma nova a partir dela, para seguir editando sem perder o que já validou.` Cortar não piorou.

**Nota de leitura presa num hover** — `AbaPorAnexo.tsx:127`
521 caracteres começando com "Como ler esta tabela" → texto visível acima da tabela. Ninguém
descobre por hover o que precisa ler uma vez.

**E o que já está certo**, para o padrão não ser só correção:
`ControleDeProjetosTabela.tsx:70` — `Produto contratado nesta OS sem projeto criado. Clique para
abrir um.` (uma ideia, ação no fim) · `CorrecoesSped.tsx:619` — explica **de onde o dado vem**,
que é o melhor uso de tooltip em tabela.

## 6. Checklist de revisão

Antes de abrir PR de tela nova:

- [ ] Dois textos equivalentes, em telas diferentes, sairiam parecidos?
- [ ] Está claro por que **não** foi usado tooltip onde não há tooltip?
- [ ] Texto de apoio e tooltip estão distinguidos — nada necessário depende de hover?
- [ ] O placeholder é só formato/estado vazio, nunca rótulo nem instrução?
- [ ] A terminologia bate com o catálogo (`rlsMessages.ts`) e com a palavra de status?
- [ ] Cada recurso usado tem exemplo equivalente neste documento?
- [ ] O documento diz **qual marcação** usar — e foi ela que entrou (`<Tooltip>`, `aria-label`,
      `FormDescription`), sem `title=` novo?
- [ ] Todo botão de ícone continua tendo nome depois da revisão?
- [ ] Alguém de produto ou de desenvolvimento aplicaria isso sem perguntar?

---

**Relacionado:** [tarefa 14 da sprint 13](../sprints/sprint-13/TAREFA_padrao-de-texto-explicativo.md)
(medições, decisões e a dívida dos 143 `title=`) · [catálogo de mensagens de recusa](../sprints/sprint-12/TAREFA_mensagens-de-recusa.md).
