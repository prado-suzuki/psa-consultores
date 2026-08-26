# Spec 01 — Motor de ITCD/MT e a tela da calculadora

**Para:** subagent em **Opus 5**
**Branch:** `suc-01-calculadora-itcmd` (worktree local, pareada em `develop`)
**Tarefas que isto atende:** SUC-01B (motor) e SUC-01C (tela)
**Método obrigatório:** TDD — teste primeiro, vermelho, depois código

Você constrói o motor de cálculo e a tela real dentro da OSG WORK. **Você não toca no banco.** O que faltar de campo é insumo da spec 02, e o que faltar de dado é insumo da spec 03.

---

## 1. Antes de escrever a primeira linha

Leia, nesta ordem. O cálculo já está homologado — você implementa, não redecide.

| Arquivo | O que tirar dele |
|---|---|
| `docs/osg/sucessao/Relatorios/SPEC-motor-itcmd-mt.md` | a especificação do cálculo: fórmula, faixas, UPF, legítima, acumulação, arredondamento |
| `docs/osg/sucessao/Relatorios/FLUXO-calculo-itcmd.md` | entradas, os seis passos, saídas — é o desenho da tela em uma página |
| `docs/osg/sucessao/Relatorios/CADASTRO-para-calculadora.md` | quais campos e tabelas já existem, com preenchimento real |
| `docs/osg/sucessao/painel/golden-master.json` | registro da homologação. Consulte se precisar de contexto; **não** é insumo dos testes (ver §2.2). |
| `AGENTS.md` | convenções do repositório. **Leia inteiro.** |

Depois, **pesquise o sandbox** (`vgzomuwnsdgrxbkyoavq`) via MCP do Supabase, **somente SELECT**, para confirmar nomes de coluna e o que está preenchido antes de escrever hook nenhum. Não confie na memória nem em documento: confirme.

---

## 2. Parte A — o motor

### 2.1 Onde mora

`src/lib/osg/itcmd/`, testes colocados ao lado, como o resto de `src/lib/osg/`:

```
dinheiro.ts        aritmética exata
faixas.ts          tabela de faixas e série de UPF
imposto.ts         a forma fechada
acumulacao.ts      acumulação por donatário
legitima.ts        legítima e parte disponível
simulacao.ts       orquestra: entradas → quadro de saída
```

### 2.2 O que os testes cobrem, e o que eles não são

Os testes cobrem **os ramos do código**, não as células de uma planilha. Nada de referência a `E97` ou `L127` dentro de `src/`: o motor não conhece planilha, e comparar contra planilha era o trabalho da homologação, que já terminou.

Três tipos de teste, e cada um tem um motivo:

**Ramos e limites.** A fórmula tem cinco faixas, logo precisa de um caso por faixa e um em cada um dos quatro limites. Limite pertence à faixa **de baixo**, e é isso que o teste do limite prende.

**Continuidade nos limites.** É o teste que mais paga. As deduções de 0, 10, 30, 110 e 310 UPF existem justamente para a função não dar salto ao trocar de faixa — em cada limite, o imposto pouco antes e pouco depois têm de ser praticamente o mesmo. Se uma dedução estiver errada, aparece um degrau ali. Um único teste de propriedade cobre uma classe inteira de erro que nenhuma lista de valores pega.

**Casos de referência, com procedência real.** Poucos, e cada um vale por vir do mundo:

| Caso | De onde vem |
|---|---|
| `(188.500,94 − 110.515,00) × 2% = 1.559,72` | guia real da SEFAZ/MT, GIA-ITCD nº A 213388 de 02/09/2022 |
| base 3.324.700,00 · UPF 255,20 → 186.864,00 | caso homologado do Santa Terezinha, cenário contábil |
| base 14.577.996,03 → 1.087.127,68 | idem, cenário de ITR |
| base 161.480.140,91 → 12.839.299,27 | idem, cenário de mercado |

Esses quatro números estão em `SPEC-motor-itcmd-mt.md` §2.4 e §8. Copie de lá e **não recalcule** — recalcular com o próprio código que você está testando torna o teste circular.

O que **não** entra em teste: valor errado que alguém já produziu, par antes/depois, e caso cuja única razão de existir é ter aparecido numa planilha. Isso é registro da homologação e vive em `docs/osg/sucessao/painel/golden-master.json`, que **não** entra no repositório e **não** é lido por teste nenhum. Não altere aquele arquivo nem o `selftest-golden.py`.

### 2.3 Aritmética: `bigint`, escala 1e-4

A especificação proíbe float, e o projeto **não tem** biblioteca decimal. Não adicione uma. Use `bigint` nativo em escala fixa de 4 casas decimais.

Isso é **exato por construção**, não aproximado, e a razão é aritmética: a base tem no máximo 2 casas, e a alíquota é `n/100`, então `alíquota × base` tem no máximo 4 casas. A dedução é `inteiro × upf`, e a UPF tem 2 casas. Logo todo resultado intermediário cabe exatamente em 1e-4.

```ts
// dinheiro.ts — contrato
export type Money = bigint;              // escala 1e-4 (1 centavo = 100n)
export function parseMoney(s: string): Money;        // "3324700.00" → 33247000000n
export function formatMoney(m: Money): string;       // 2 casas, meio para cima
export function quantizar2(m: Money): Money;         // arredonda a 2 casas, meio para cima
```

Regras:

- **`number` é proibido para dinheiro dentro de `src/lib/osg/itcmd/`.** A fronteira pública recebe e devolve `string` decimal; `bigint` fica interno.
- Arredondamento é **meio para cima**, sempre.
- A **base por donatário é quantizada a 2 casas antes de entrar na fórmula.** É o que reproduz o WP: no cenário de ITR a base exata é `14.577.996,025` e a publicada é `14.577.996,03`. Escreva um teste que prenda isso.
- O **imposto é arredondado uma única vez**, por donatário e por cenário. Somar valores já arredondados e somar valores exatos dá resultados diferentes de um centavo no cenário de mercado; a convenção é arredondar cada donatário e então somar.
- Imposto negativo é **erro**: `throw`. Nunca truncar em zero.

### 2.4 Ordem do TDD

Cada passo termina verde antes do seguinte.

1. **`dinheiro.ts`** — parse, format, quantizar. Ida e volta; meio centavo exato para cima; o valor grande do total de mercado (R$ 322.960.281,82); string malformada rejeitada com erro.
2. **`faixas.ts`** — as cinco faixas e a série de UPF por competência. Dois testes: a série **não** é linear, e resolver uma competência desconhecida **falha** em vez de extrapolar.
3. **`imposto.ts`** — um caso por faixa; um em cada um dos quatro limites, provando que o limite cai na faixa de baixo; a continuidade nos quatro limites; os quatro casos de referência da §2.2; e imposto negativo lançando erro.
4. **`acumulacao.ts`** — a **invariante** é o teste principal: a soma dos devidos de todos os atos é igual à apuração da base consolidada, em qualquer ordem e qualquer número de atos. Mais dois casos concretos: quatro atos de R$ 831.175 somam o mesmo que um de R$ 3.324.700; e 35 atos de R$ 127.100, cada um isento sozinho, somam R$ 276.768,00 em vez de zero.
5. **`legitima.ts`** — a legítima é `teto(patrimônio_do_doador ÷ 2 ÷ nº herdeiros)` somado **por doador**. Três testes: reproduz o 1.831.720 do caso Santa Terezinha; somar os patrimônios antes de dividir daria 1.831.719 e portanto a ordem das operações importa; e total ímpar de quotas fecha com a disponível absorvendo o resto.
6. **`simulacao.ts`** — orquestra os seis passos do FLUXO. Um teste de ponta a ponta com o caso Santa Terezinha: entram o universo de 6.649.400 quotas e os três totais do acervo, saem R$ 186.864,00 por donatário no contábil, R$ 1.087.127,68 no de ITR e R$ 12.839.299,27 no de mercado.

São da ordem de vinte e cinco testes. Se você chegar a oitenta, provavelmente está testando valores em vez de ramos — pare e reporte antes de continuar.

### 2.5 O que o motor **não** faz

Não aplica fator de usufruto (a base é sempre integral), não calcula Patrimônio Líquido Ajustado, não equaliza participação final, não deriva valor de mercado de produtividade por hectare, não lê banco e não conhece React.

---

## 3. Parte B — a tela

### 3.1 Não é protótipo

É a tela final, dentro da OSG WORK. Reaproveite ao máximo: layout, componentes, hooks, libs, design, padrões de UI e de UX que já existem. **Não** crie página paralela, HTML solto, nem componente duplicado de algo que já existe.

### 3.2 Rota e arquivo

```
rota     /equipe/osg/work/calculadora-itcmd   (com PageAccessGate, como as irmãs)
página   src/pages/equipe/osg/CalculadoraItcmd.tsx
registro src/App.tsx, ao lado das outras rotas /equipe/osg/work/*
```

Entre na navegação da OSG WORK no mesmo lugar em que as outras páginas entram — procure como `ControleMatriculas` e `QuadroSocietario` aparecem no menu e siga.

### 3.3 O que reaproveitar — confirmado existindo

| Precisa de | Use |
|---|---|
| Layout e cliente selecionado | `OsgLayout` de `@/components/equipe/osg/OsgLayout`; `useOsgWork()` de `@/contexts/OsgWorkContext` dá `clienteId` |
| Imóveis e os três valores | `useBensByCliente`, `useMatriculasByBem`, `useAllMatriculas` de `@/hooks/useDiagnosticoPatrimonial` |
| Derivar e totalizar valor de bem | `derivarValoresDoBem`, `totalizarValoresDosBens`, `origemDoValor` de `@/lib/osg/valoresDoBem` |
| Quadro societário | `useQuadroSocietarioByEmpresa` de `@/hooks/useQuadroSocietario` |
| Pessoas e parentesco | `usePessoasByCliente`, `useParentescosByCliente` de `@/hooks/useQualificacaoDasPartes` |
| Diálogos | `@/components/equipe/osg/OsgDialog` |
| Tabela, card, select, badge, input | `@/components/ui/*` |

`DiagnosticoPatrimonial.tsx` é a página de referência mais próxima: leia antes de começar.

**`valoresDoBem` cobre contábil e mercado, e não a terceira métrica.** Estender para o valor de ITR depende de decidir o campo canônico, que é a spec 02. Nesta spec, leia o que existir e sinalize a ausência na tela — **não** invente campo nem escolha um por conta própria. Reporte.

Se faltar hook, crie em `src/hooks/`, seguindo o padrão de domínio. **Nunca** Supabase dentro de componente — o AGENTS.md é explícito.

### 3.4 O que a tela faz

Siga o FLUXO. Em blocos, na ordem em que o cálculo acontece:

1. **Imóveis** — a lista do cliente com os três valores por imóvel e os três totais.
2. **Sociedade** — a empresa cujas quotas serão doadas, com o total de quotas e os sócios.
3. **Participantes** — doadores e donatários. Os candidatos vêm do cadastro (`is_fundador`, `parentesco` tipo `Filho(a)`), e **o analista confirma**. A tela não decide quem é herdeiro necessário e não aplica o art. 1.829, I.
4. **Doação anterior** — por donatário, valor já recebido antes. Campo declarado pelo analista. **Não** derive do quadro societário: ele é foto do estado, não histórico.
5. **Distribuição** — a legítima aparece **calculada** (o analista não digita); a parte disponível o analista distribui, com total visível e travando quando não fecha.
6. **Competência da UPF** — seletor de mês; a UPF do mês escolhido.
7. **Quadro de saída** — base e imposto por donatário em cada um dos três cenários, com os totais.

Sem persistência nesta spec: estado em React. Salvar, revisar e aprovar são a spec 02 em diante.

### 3.5 Falta de dado nunca vira zero

No sandbox de hoje, o valor de mercado está vazio em **26 de 26** matrículas e o de ITR em tudo. Isso é esperado — a spec 03 preenche.

Então: onde não há valor, a tela mostra **`—`**, nunca `R$ 0,00`, e o cenário correspondente aparece marcado como **incompleto**, dizendo quantos imóveis estão sem valor. O padrão já existe no repositório (`v == null ? '—' : ...`) e o `origemDoValor` já sabe declarar soma parcial. Zero e ausência são coisas diferentes, e um cenário que soma parcial e se apresenta como total é a pior saída possível numa ferramenta de decisão.

---

## 4. Regras duras

1. **Nada de banco.** Nenhuma migration, nenhum DDL, nenhum `INSERT`/`UPDATE`/`DELETE`. Só `SELECT`, e só para descobrir schema.
2. **Não toque no `golden-master.json` nem no `selftest-golden.py`.** Eles são a origem, ficam onde estão e não entram no repositório. Se um caso do gabarito parecer errado, **pare e reporte** — não conserte e não "ajuste" o valor esperado para o teste passar.
3. **Nenhuma dependência nova** em `package.json`.
4. **Sem dado mockado.** A tela lê o sandbox de verdade. Vazio se mostra como vazio.
5. **Sem fallback silencioso.** Erro de consulta se propaga e a UI trata; não devolva valor neutro.
6. Se a especificação do cálculo e o que você acha divergirem, **a especificação ganha**. Reporte a dúvida; não reescreva a spec.
7. Não toque em `src/integrations/supabase/types.ts` — ele se regenera pelo CLI.

---

## 5. Entregáveis

**Código**

- o motor com todos os testes verdes;
- a tela na rota nova, registrada e navegável;
- `bun run test` verde; `bunx tsc --build --noEmit` limpo; `bunx eslint <arquivos alterados>` limpo.

**Documentos**

Duas retrospectivas e dois anexos, **versão inicial** — a SUC-01B e a SUC-01C são tarefas separadas e cada uma tem os seus. Leia as duas skills antes, pelo caminho absoluto (elas não estão nesta worktree):

```
…\PSA Lovable\psa-consultores\.claude\skills\criar-retrospectiva\SKILL.md
…\PSA Lovable\psa-consultores\.claude\skills\criar-anexo\SKILL.md
```

Grave em, criando as pastas:

```
…\PSA Lovable\retrospectivas\SUC-01B\SUC-01B-retrospectiva.md
…\PSA Lovable\retrospectivas\SUC-01B\anexo-SUC-01B.md
…\PSA Lovable\retrospectivas\SUC-01C\SUC-01C-retrospectiva.md
…\PSA Lovable\retrospectivas\SUC-01C\anexo-SUC-01C.md
```

Divisão: o que é motor, domínio e teste vai na SUC-01B; o que é tela, navegação e experiência vai na SUC-01C.

---

## 6. Como se autoverificar antes de reportar

- `bun run test` passa, e cada teste tem um motivo declarado no nome — faixa, limite, continuidade, referência ou invariante.
- Abrir `/equipe/osg/work/calculadora-itcmd`, escolher um cliente do sandbox e chegar num quadro de saída sem erro no console.
- Nenhum número na tela sem origem: cada valor vem do cadastro ou do motor. Nada digitado no código.
- Onde falta dado, aparece `—` e o aviso de cenário incompleto.

---

## 7. O que reportar de volta

Relatório curto, em três listas:

1. **Reaproveitado** — cada tabela, coluna, hook, componente e função que você usou em vez de criar.
2. **Faltou** — cada campo, tabela ou hook que não existe e que a calculadora precisa, com o que a tela faz hoje sem ele. **É o insumo da spec 02, então seja específico:** nome esperado, tabela onde deveria morar, e por quê.
3. **Decidido por você** — toda decisão que esta spec não cobria. Quem lê depois precisa saber o que foi escolha sua para poder discordar.

Não conserte o que estiver fora do escopo, e não amplie a entrega. Se travar, pare e reporte com o que já está verde.
