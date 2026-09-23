# O teto de instanciações do TypeScript, medido

**A decisão:** o `bun run typecheck` está vermelho na `develop` em quatro arquivos, e
nenhum deles tem defeito. O compilador estoura um teto global e desiste no arquivo em que
estiver. Há duas saídas, e elas custam coisas diferentes — a recomendação é **aplicar a
fachada nos três arquivos quebrados agora** (meia hora, devolve o typecheck verde, custa a
conferência de coluna em três arquivos) e **decidir depois** entre dividir o programa em
dois ou varrer as consultas. Varrer é o único caminho que devolve a tipagem inteira, e são
~760 consultas: não cabe numa tarefa.

Medido em 15/09/2026, na `develop`, com TypeScript 5.8.3 e `@supabase/supabase-js` 2.84.0.

## O teto, e onde estamos

O TypeScript conta as instanciações de tipo do **programa inteiro** e para em
**5.000.000**. Passado o teto, ele abandona o tipo que estiver expandindo e acusa
`TS2589 — type instantiation is excessively deep`, ou entrega o tipo degradado (é o
`{ error: true } & String` do `useDomainAcordoQuotistas`). O erro pousa onde a fila chegou,
não onde está a causa: por isso ele **muda de arquivo** conforme a ordem da compilação.

    bunx tsc --noEmit -p tsconfig.app.json --diagnostics

| Programa | Instanciações | Teto |
|---|---:|---:|
| Como está hoje | **8.241.692** | 5.000.000 |
| Com o `createClient<Database>` sem o genérico | **4.718.730** | 5.000.000 |

**43% das instanciações do app são o tipo gerado do Supabase**, e sem ele o programa passa
a caber no teto com folga. Não é uma tela, não é um arquivo: são as ~760 consultas.

Os quatro arquivos que hoje falham — `useDomainAcordoQuotistas`, `useDomainOrgaoGovernanca`,
`useTaxReferenceData` e, até ganhar a fachada, `useDomainFaturamentoOs` — são apenas onde a
conta cruzou a linha.

## Quanto custa cada coisa

Medido isolando cada caso num programa de teste e lendo o `--diagnostics` (baseline: 7.642,
que é o custo de importar o cliente).

| Padrão | Instanciações por uso |
|---|---:|
| `insert` / `update` / `upsert` | ~30 |
| `useQuery<T>` | ~45 |
| `select('*')` | ~107 |
| `useMutation` + `invalidateQueries` | ~210 |
| `select` de 3 colunas | ~300 |
| `select` de 12 colunas | ~1.200 |
| `select` de 20 colunas | ~2.200 |
| `z.object` de 5 campos + `z.infer` | ~2.270 |
| `select` de 12 colunas numa tabela larga (`bem`) | ~4.300 |
| `select` com **join de 1 nível** | ~10.300 |
| `select` com **join de 3 níveis** (o de `useGeracaoDocumento`) | **~71.700** |
| qualquer consulta pela fachada sem tipo gerado | ~0 |

Três leituras que mudam o que vale atacar:

1. **Escrita é de graça.** `insert`, `update` e `upsert` custam ~30. O gasto é todo na
   leitura, porque é a string do `select` que o compilador precisa interpretar.
2. **O custo é por coluna listada**, cerca de 110 cada — e por isso `select('*')` é **dez
   vezes mais barato** que listar doze colunas. (Mais barato para o compilador; mais caro na
   rede, que é outra conta.)
3. **Join aninhado é o vilão.** Um `select` com três níveis custa ~72.000: sessenta vezes
   uma consulta plana. São eles que concentram o gasto em poucos arquivos.

## O inventário das consultas

    node .medicao-ts/inventario2.mjs   (o script está no fim deste documento)

| Profundidade do join | Consultas | Custo estimado |
|---|---:|---:|
| plana (sem join) | 701 | ~0,8M |
| 1 nível | 54 | ~0,6M |
| 2 níveis | 6 | ~0,2M |
| 3 níveis | 11 | ~0,8M |

Os arquivos que mais somam: `useGargalos`, `useDiagnosticoPatrimonial`, `useGeracaoDocumento`,
`useModelosDocumento`, `useExploracaoRural`, `useRelatorioDP`. Os seis primeiros concentram
cerca de um terço do custo das consultas.

O ranking por tempo de checagem, que sai do trace (`tsc --generateTrace`), aponta os mesmos
arquivos — e dentro deles, a expressão cara é sempre a mesma: a linha do `.select(` com join.

## O que cada saída custa

**1. A fachada, nos três arquivos quebrados. Recomendado agora.**
O arquivo passa a chamar o Supabase por um tipo escrito à mão (o padrão está em
`src/hooks/useDomainFaturamentoOs.ts`), e o compilador não expande nada. Devolve o
typecheck verde hoje. **Custa** a conferência de nome de coluna nesses arquivos — que se
compensa conferindo as colunas contra o `types.ts` na hora de escrever, e com teste na
camada pura. Não reduz o total: tira do teto só o que passou a não ser expandido.

**2. Dividir o programa em dois (project references).**
O teto é por programa: dois programas, dois tetos. Mantém a tipagem inteira, em todo lugar.
**Custa** desenhar a fronteira (o `src` teria de se separar em camadas que não se importam
em círculo) e mexer na CI. É a única saída que não perde nada, e é frente de projeto.

**3. Varrer as consultas.**
Trocar os 17 joins de 2 e 3 níveis por consultas planas cruzadas no JavaScript (é o que
`useDashboardClientesOs` já faz, e por isso ele é barato) tira ~1M. Passar as listas longas
de coluna para `select('*')` onde o código usa a linha inteira tira mais ~1,8M. Junto, o
programa fica logo abaixo do teto — mas são ~760 consultas revisadas uma a uma, com risco de
regressão em cada. Não cabe numa tarefa; cabe como política para consulta nova.

**4. Não fazer nada.** É a que custa mais caro: com quatro erros falsos permanentes, um erro
de verdade passa no meio deles sem ninguém ver.

## Política para consulta nova (vale desde já, custa zero)

- Join aninhado só quando o cruzamento no JavaScript for inviável. Duas consultas planas e um
  `Map` custam ~2.000 no compilador; o mesmo join custa ~72.000.
- Nunca mais de dois níveis de aninhamento.
- Quando o código usa a linha inteira, `select('*')` em vez de listar as colunas.

## Como refazer a medição

    bunx tsc --noEmit -p tsconfig.app.json --diagnostics          # o número total
    bunx tsc --noEmit -p tsconfig.app.json --generateTrace <dir>  # onde o tempo vai

Para medir um padrão isolado, um `tsconfig` mínimo apontando para o `src` do repositório, um
arquivo com N repetições do padrão, e a diferença de `Instantiations` dividida por N.

O inventário por profundidade de join é uma varredura de texto: para cada `.select(` do
`src`, resolver a string (literal, template ou constante `SELECT_*`) e contar o aninhamento
máximo de parênteses; o custo por nível é a tabela acima.
