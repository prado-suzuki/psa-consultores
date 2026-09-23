# O texto que explica a tela

**Em vigor desde 17/09/2026.** Padrão único das explicações contextuais: rótulo, texto de apoio,
tooltip, mensagem contextual e placeholder. Vale para rota nova e para tela que se mexe.

Este documento tem **duas camadas, e só duas**:

- **§1 a §3 — qual recurso usar.** Decide se o caso pede texto, e qual.
- **§4 — como escrever em português.** Decide a redação final.

Quem faz auditoria de rota sai daqui com as duas respostas e preenche a ficha da §6. A
implementação executa aquela ficha e **não reescreve o texto aprovado**. Se um caso levar mais de
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
| **Estrutura** | a ação no infinitivo, direta e neutra: "Editar OS" |
| **Tamanho** | até 30 caracteres, **sem ponto final** |
| **Tom** | nomeia a ação; sem "clique", sem "aqui" |
| **Terminologia** | o mesmo verbo do botão equivalente com texto |
| **Marcação** | `aria-label` **sempre**; `<Tooltip>` com o mesmo texto quando a descoberta visual ajudar |
| **Adequado** | `Remover contribuinte` |
| **Inadequado** | `Clique aqui para remover o contribuinte desta lista.` |

### Texto de apoio (degrau 3)

| | |
|---|---|
| **Quando usar** | instrução ou restrição que vale **toda vez** que a pessoa preenche |
| **Quando não usar** | é curiosidade, definição ou detalhe secundário → tooltip |
| **Estrutura** | uma frase afirmativa; comece pela informação necessária para agir — condição, restrição ou consequência |
| **Tamanho** | até 120 caracteres, **com ponto final** |
| **Tom** | fala com a pessoa quando há ação; impessoal quando descreve o dado |
| **Terminologia** | §4 |
| **Marcação** | `<FormDescription>` dentro da composição `FormItem`. Fora dela, `<p className="text-sm text-muted-foreground">` **com `id` e `aria-describedby` no campo** — sem isso o texto existe e não é anunciado |
| **Adequado** | `O cliente precisa estar vinculado a pelo menos um cluster.` |
| **Inadequado** | a mesma frase escondida em tooltip |

### Explicação contextual — tooltip (degrau 4)

| | |
|---|---|
| **Quando usar** | explicar conceito secundário, origem do dado ou consequência de uma ação |
| **Quando não usar** | o rótulo está ambíguo (degrau 1) · a informação é necessária para concluir (degrau 3) · depende do estado (mensagem contextual) · explica o óbvio |
| **Estrutura** | **uma ideia**, 1 a 2 frases curtas; a ação, quando houver, no fim |
| **Tamanho** | até 140 caracteres, **com ponto final**. Acima disso não é tooltip: é nota de leitura e mora visível na tela |
| **Tom** | **depende do que o balão faz.** Se ele NOMEIA a ação de um controle — botão, ícone —, é **terceira pessoa do indicativo**: "Encerra esta solicitação e impede novos envios." Eles ficam lado a lado e a mistura de pessoa aparece na hora. Se ele EXPLICA um dado — célula, selo, número —, descreve o dado, e a frase de ação pode falar com a pessoa. As duas formas estão no ar e as duas estão certas |
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
| **Tamanho** | até 140 caracteres por parte, **com ponto final** |
| **Tom** | 2ª pessoa; nunca afirma causa que o sistema não conhece |
| **Terminologia** | **Recusa, permissão ou falha:** sai do catálogo `src/lib/rlsMessages.ts`, e frase nova só entra ali quando a orientação for diferente das que já existem. **Qualquer outra mensagem contextual** (estado, etapa, pré-requisito) segue §4 e mora onde o estado é tratado — o catálogo é de recusa, não repositório universal de microcopy |
| **Adequado** | `Selecione um cliente para listar os contribuintes disponíveis.` |
| **Inadequado** | `Erro ao atualizar cliente: violates row-level security policy` |

### Placeholder

| | |
|---|---|
| **Quando usar** | mostrar **formato esperado**, ou marcar o estado vazio de um campo de escolha ou busca |
| **Quando não usar** | no lugar do rótulo · para instrução essencial · repetindo o rótulo |
| **Estrutura** | uma das quatro formas canônicas: `Selecione…` · `Buscar…` · `Ex: 12.345.678/0001-90` · vazio. A única coisa fora dessa lista é o rótulo da opção "todos", logo abaixo — e aquilo não é placeholder |
| **Tamanho** | até 40 caracteres, **sem ponto final**; reticências é `…`, nunca `...` |
| **Tom** | instrução genérica, igual em todas as telas do mesmo componente |
| **Terminologia** | quando o componente compartilhado já traz um texto, é ele que vale — texto sob medida compete com o rótulo em vez de ajudar |
| **Adequado** | `Selecione…` |
| **Inadequado** | `Selecionar gestor...` |

**"Todos os clientes", "Todas as OS" não é placeholder — é o valor do filtro.** Quando o filtro
tem a opção "todos", o texto do estado vazio é o **rótulo dessa opção** e precisa casar com o
`SelectItem` correspondente, palavra por palavra. `Selecione…` não se aplica aí: não há nada a
selecionar, há um recorte já valendo. E a concordância acompanha o substantivo — "Todos os
clientes", "Todas as empresas" —, que é a mesma exceção da palavra única de status: gênero em
prosa é gramática, não rótulo.

**Texto de lista vazia é a outra exceção conhecida:** ele fica **específico** ("Nenhum cliente
encontrado."), porque nomeia o que não foi achado, e isso é informação.

## 4. Como escrever

Escolhido o recurso, a redação sai destas sete regras, da lista do que não entra e das formas
canônicas. Nada aqui depende de gosto: dois textos equivalentes, escritos por duas pessoas,
precisam sair parecidos.

### As sete regras

1. Comece pela informação que faz a pessoa **decidir ou agir**.
2. Voz ativa, ordem direta: sujeito, verbo, complemento.
3. **Não repita o rótulo** — exceto no degrau 0, onde o texto é o nome.
4. Não explique o óbvio.
5. **Uma ideia por texto.** Duas ideias são dois textos, e quase sempre dois recursos diferentes.
6. A mesma palavra para o mesmo conceito, sempre.
7. Informação necessária para preencher, decidir ou interpretar **não depende de hover**.

E o corte final, depois de escrever: **tire toda palavra que, saindo, não muda o sentido.** É o
que mais encurta texto de interface, e não é estilo — é o que faz caber no teto do recurso.

### O que não entra

| Não escreva | Escreva |
|---|---|
| `Para que seja possível realizar a exclusão deste contribuinte, é necessário que o usuário possua o perfil Sublíder ou superior.` | `É necessário ter o papel de Sublíder ou superior para excluir o contribuinte.` |
| `Caso queira realizar a busca, utilize os filtros abaixo.` | **nada.** Os filtros já dizem isso (regra 4) |
| `Favor selecionar um cliente.` | `Selecione um cliente.` |
| `O mesmo será enviado para aprovação.` | `O documento vai para aprovação.` |
| `O arquivo deverá estar sendo processado.` | `O arquivo está em processamento.` |
| `Clique aqui para abrir o projeto.` | `Abrir projeto` — é rótulo, não frase (degrau 0) |
| `Realizar a validação dos dados` | `Validar os dados` |
| `O usuário deve informar a data de início.` | `Informe a data de início.` |

O que essas oito linhas têm em comum, e vale para o caso que não está na tabela:

- **nada de "favor", "por gentileza", "caso queira"** — a frase já é um pedido;
- **nada de "o mesmo", "a mesma"** como pronome; repita o nome do item;
- **nada de gerundismo nem de futuro composto** ("vai estar sendo", "deverá estar"); presente;
- **nada de "clique aqui"**, "clique no botão abaixo", "utilize o campo ao lado" — a pessoa está
  olhando para o controle;
- **verbo no lugar de "realizar/efetuar/proceder + substantivo"**: validar, não realizar a
  validação;
- **"ter", não "possuir"**; **"precisa de", não "faz-se necessário"**;
- **não escreva "o usuário"** — ou fale com a pessoa (2ª pessoa), ou descreva o dado;
- **nada de termo técnico interno**: nome de tabela, coluna, função ou RPC; identificador;
  código de erro; inglês do Postgres ou do PostgREST. Isso vai para o `console.error`, que é o
  que permite abrir chamado sem reproduzir o erro.

### Pontuação e formas canônicas

- **Ponto final:** rótulo (dos dois tipos) e placeholder **não têm**; texto de apoio, tooltip e
  mensagem contextual são frase completa e **têm**.
- **Reticências é `…`**, nunca `...`. **Travessão é `—`**, nunca `--`.
- **Formas fixas, que não se reescrevem por tela:** `Selecione…` · `Buscar…` · `Ex: …` ·
  `É necessário ter…` (condição) · `Não foi possível {ação} {item}.` (falha).

### O vocabulário não se inventa aqui

Já está decidido em dois lugares, e os dois valem:

- **`src/lib/rlsMessages.ts`** (catálogo da sprint 12) — o item é nomeado **pelo nome que aparece
  na tela** ("o contribuinte", "a OS {número}", "o rateio de receita"); fecho fixo por categoria.
  Havendo equivalência, a redação sai de lá em vez de nascer de novo.
- **`src/lib/rotulosDeStatus.test.ts`** — uma palavra por chave de status, no masculino.

**O mecanismo também é vocabulário.** Explicação nova usa `<Tooltip>`; nome de botão de ícone usa
`aria-label` mais `<Tooltip>` — e para isso existe o `ButtonTooltip` de
`@/components/ui/button-tooltip`, que faz os dois de uma vez; `title=` só em `<iframe>`, que é
título de quadro. **`title=` não é mecanismo de
explicação** — os legados estão inventariados na tarefa 14 da sprint 13 e são conversão à parte;
este documento existe para não criar mais nenhum.

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

## 6. A ficha, e de onde vem o achado

As duas coisas **moram na skill `texto-na-tela`**, porque são processo e não norma: o formato da
ficha de sete linhas, as quatro fontes de evidência em ordem de peso, onde procurar cada uma
neste ambiente, os treze critérios recorrentes de revisão e como fechar contra a catraca.

O que fica aqui, porque é norma e a ficha depende disso:

- **A redação final está na ficha.** A implementação executa a ficha; se o texto aprovado
  parecer errado, volta para quem escreveu — **não se conserta no PR**.
- **"Intervenção: nenhuma" é resultado válido**, e é o resultado dos degraus 1, 2 e 5. A ficha
  registra o que muda no controle, ou que nada muda, e por quê. Auditoria que produz texto para
  todo controle não usou a árvore.

## 7. Checklist de revisão

Antes de fechar a ficha, ou antes de abrir PR de tela nova:

**Escolha do recurso**

- [ ] Está claro por que **não** foi usado tooltip onde não há tooltip?
- [ ] Texto de apoio e tooltip estão distinguidos — nada necessário depende de hover?
- [ ] O placeholder é só formato/estado vazio, nunca rótulo nem instrução?
- [ ] Todo botão de ícone continua tendo nome depois da revisão?
- [ ] A ficha diz **qual marcação** usar (`<Tooltip>`, `aria-label`, `FormDescription`), sem
      `title=` novo?

**Redação**

- [ ] Dois textos equivalentes, em telas diferentes, sairiam parecidos?
- [ ] Nenhuma palavra sai sem mudar o sentido?
- [ ] Nada da tabela "o que não entra" sobreviveu?
- [ ] A terminologia bate com o catálogo (`rlsMessages.ts`) e com a palavra de status?
- [ ] Ponto final, reticências e travessão seguem §4?
- [ ] Alguém de produto ou de desenvolvimento aplicaria isso sem perguntar?

---

**Relacionado:** [tarefa 14 da sprint 13](../tarefas-executadas/2026_09_17_padrao-de-texto-explicativo.md)
(as medições que originaram o padrão e a dívida técnica, que é backlog paralelo) ·
[catálogo de mensagens de recusa](../tarefas-executadas/2026_09_02_mensagens-de-recusa-do-cadastro.md).
