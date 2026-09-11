# Proveniência serializada no snapshot

**Estado:** ✅ entregue na `develop` em 10/09/2026. Sem migration: `snapshot_dados`
é `jsonb` e a mudança é de forma do conteúdo, não de schema.

## O problema

`documento_gerado.snapshot_dados` é a fotocópia congelada do contexto que
renderizou o documento. A proveniência de cada objeto de campos — de qual linha
do cadastro ele veio — viajava como propriedade **Symbol**, em
`src/lib/templates/origem.ts`. `JSON.stringify` descarta chave Symbol.

O próprio arquivo previa e prescrevia a saída, desde antes desta frente:

> CUIDADO: `structuredClone` e `JSON.parse(JSON.stringify(...))` DESCARTAM chaves
> Symbol (...). Se um dia o contexto passar por serialização, a origem precisa
> migrar para uma chave reservada comum.

Estado medido em 10/09/2026 por `SELECT` no sandbox, nos documentos do cliente
`[TESTE] Furão Notário Cartório Subterrâneo S.A.` — não inferido do código:

| entidade | `id` no jsonb | `__motorOrigemId` no jsonb |
| --- | --- | --- |
| sociedade | sim | não |
| `socios[].socio` | sim | não |
| `administradores[].administrador` | sim | não |
| `signatarios[].signatario` | **não** | não |

Isto é, a identidade que existia vinha de dois `set('id', row.id)` avulsos
(`mapearPessoa`, `mapearSociedade`), e mais nada. Bem, matrícula, cartório,
vértice, instrumento agrário e origem da posse não gravavam nenhuma.

Os estragos, todos medidos antes desta frente:

1. O comparador de alteração contratual (`alteracaoPorEventos.ts`) casa
   ocorrências por id e se recusa a usar CPF como identidade — corrigir um CPF
   viraria "sócio saiu, sócio entrou". Sem id, ele cobrava a pendência
   "qualificacao sem id estavel" com o cadastro intocado.
2. O endereço aprovado numa AC não chegava à cláusula de administração, porque o
   administrador não tinha id. Foi remendado em `da80f593` com um casamento por
   CPF dentro do mesmo estado.
3. `copiarOrigemProfunda` reconstruía a proveniência casando as duas estruturas
   **por índice**, admitindo no comentário: "onde as formas divergirem, copia o
   que casa e ignora o resto".

## A decisão

A origem passa a viajar em **duas chaves reservadas de string**,
`__motorOrigemTipo` e `__motorOrigemId`, gravadas num lugar só (`comOrigem`) e
lidas num lugar só (`origemDe`).

**Por que duas chaves de string, e não um objeto aninhado.** `Campos` é
`Record<string, string>`. Um `{ tipo, id }` aninhado quebraria o tipo e vazaria
para dezenas de laços `Object.entries(campos)` que assumem valor string
(`comporEstadoProposto`, `aplicarEnderecosDeSocios`, `normalizarSelecaoLegada`, o
`assinatura()` do comparador). Duas chaves de string preservam o tipo; o custo é
o par não poder ser lido nem escrito pela metade.

**Por que o prefixo `__motor`.** É o mesmo de `__motorCamposSintetizados`
(`sintetizado.ts`), que já resolvia o mesmo problema pelo mesmo caminho — marca
do motor, valor string, sobrevive ao jsonb. Quem procurar `__motor` acha a
família inteira.

**O que passou a carregar identidade:** cartório (`cartorio.id`), vértice
(`<id_georef>:<código do vértice>` — é a única entidade sem linha de cadastro,
vem do SIGEF pelo BigQuery), instrumento agrário (`exploracao_rural.id`), origem
da posse (a `chave`, que é o id da linha) e o signatário (que já passava por
`comOrigem` e agora sobrevive ao JSON).

**O que saiu:** os dois `set('id', row.id)` avulsos e o `id: parte.id` de
`mapearPartesSelecionadas`. Identidade se grava num lugar só, senão o oitavo
mapeador esquece.

**O filtro de qualificação virou declaração de papel.** `mapearCartorio` publica
`nome`, e a heurística "tem cpfCnpj, tipoPessoa ou nome" punha a serventia na
comparação de qualificação de pessoa. Sem id isso era inofensivo; com id, o
cartório renomeado viraria candidato de qualificação. Agora quem declara o tipo
sai por declaração, e a heurística responde só pelo acervo.

`copiarOrigemProfunda` casa por id. Ela existe só pelo acervo: snapshot novo já
traz a própria origem.

## O que ficou como decisão de produto

Carregar origem e ser clicável na folha são coisas diferentes. Cartório, vértice,
instrumento agrário e origem da posse passaram a carregar identidade, mas
continuam **sem clique** para abrir o cadastro: não há modal para eles. O
`default: return false` de `origemClicavel` (`useGerarDocumentoController.ts`) é
essa decisão escrita, não um esquecimento.

O casamento por CPF de `aplicarEnderecosDeSocios` **fica**. Ele foi testado por
remoção: o teste "aplica tambem na ocorrencia SEM id, reconhecida pelo CPF do
mesmo estado" falha sem ele, porque o estado sobre o qual essa função escreve
nasce da BASE, e base do acervo não tem identidade em `administradores`. Em peça
nova ele já não é acionado. Ele sai quando não houver mais base sem identidade.

## Não-objetivo declarado: o acervo

**Peça registrada antes desta mudança continua sem id, para sempre.** Não há
migração que conserte isso sem falsificar documento: `snapshot_dados` é o que a
peça publicou na junta, e reescrevê-lo é mudar o que o documento diz que disse.

Consequências que continuam verdadeiras depois desta frente:

- Ocorrência do acervo sem `id` nem CPF segue fora do diff de alteração
  contratual, e segue cobrando a pendência "sem id estavel" — que ali é verdade,
  não ruído.
- Matrícula, bem e cartório de peça antiga não voltam a ser clicáveis na prévia.
  O casamento por índice que existia antes "acertava" esses casos alinhando
  listas pela posição, o que é adivinhação: com o quadro reordenado desde a
  validação, ele carimbava a origem da pessoa errada.

## Onde está a prova

- `src/lib/templates/identidade.test.ts` — varre `TIPOS_ENTIDADE` do vocabulário:
  toda entidade precisa de linha na tabela de identidade e precisa provar que a
  origem sobrevive ao jsonb. Entidade nova sem identidade quebra no ato.
- `src/lib/osg/identidadeNoSnapshotReal.test.ts` — monta o snapshot pelos
  mapeadores DE VERDADE e passa pelo round-trip do jsonb, em vez de fixture
  sintética. Foi a fixture sintética, que dava id a todo mundo, que deixou a
  suíte verde enquanto o documento saía errado.
- `src/lib/templates/origem.test.ts` — o mecanismo, o acervo e o não-objetivo.
