# Alteração contratual pelo gerador (caminho B)

Documento de contexto e handoff. Escrito em 24/08/2026, na branch
`alteracao-contratual-caminho-b` (criada a partir de `develop`).

## 1. O problema

O gerador hoje sabe produzir **contrato social de constituição**: a empresa nasce, o
consultor preenche o cadastro (sócios, capital, imóveis) e o documento sai pronto.

O que falta é a **alteração contratual**: a empresa já existe e algo mudou (entrou sócio,
saiu sócio, aumentou o capital, mudou o endereço, mudou a administração). Isso é feito à
mão hoje e é o maior volume de horas de toda a frente de contratos.

Uma alteração contratual tem duas partes:

1. **Resoluções**: o diff. "Os sócios resolvem aumentar o capital de X para Y", "o sócio
   Fulano cede suas quotas para Beltrano".
2. **Consolidado**: o contrato social inteiro reescrito com o estado pós-evento, e
   renumerado do zero.

A estrutura completa está descrita em `docs/osg/catalogo-familias-e-flags.md`, seção
"Documento: Alteração Contratual" (linhas 82-113): tabela de partes nas 87-93 e a família
de blocos de resolução nas 97-107.

## 2. A decisão de roteiro: caminho A vs caminho B

Essa decisão precisa estar tomada **antes do primeiro commit**. A diferença é de 20h para
mais de 60h.

### Caminho A (descartado)

Guardar a história da sociedade em **tabelas de eventos datados** (ledger): quotas,
capital e administração com data, e o estado vigente derivado por soma. Aí as flags de
evento (`evento_aumento_capital`, `evento_cessao_quotas`…) saem automáticas e os snapshots
antes/depois são calculados.

Não existe no banco. O próprio material da casa registra a lacuna:
`docs/osg/catalogo-familias-e-flags.md` linhas 109-112 (nota do ledger) e item 3 dos
pontos de schema a decidir (linhas 192-193).

Pela âncora do repositório, só o domínio já consome as horas orçadas **sem entregar
documento nenhum**.

### Caminho B (recomendado, e o que estas 20h assumem)

O sistema **não guarda a história**. O estado pós-evento é o **cadastro atualizado à mão**:
o consultor atualiza o quadro societário e a administração, e então gera.

O "como era antes" não precisa de ledger porque já está congelado no **snapshot do
documento anterior**, ligado pela linhagem.

> **Isto é decisão de produto, não técnica.** É o que faz 20h caberem. Registrar no card.

## 3. As três peças reusadas

### Peça 1 — flags manuais de projeto (a única com código novo de verdade)

Uma flag é o interruptor que decide se um bloco entra no documento. Hoje só existem as
**derivadas declarativas**: o sistema calcula olhando o cadastro.

A alteração contratual precisa das **manuais**: o consultor liga "teve aumento de capital"
e o bloco de resolução correspondente entra. Sem ledger, não há como derivar.

**O que já existe no banco** (confirmado em `supabase/migrations/00000000000000_baseline.sql`;
origem em `supabase/migrations_arquivo/20260601120000_criar_modelo_composicao_documental.sql`):

- `tmpl_flag` (baseline 8030): `nome`, `tipo` (`derivada` | `manual`), `escopo`
  (`cliente` | `pj`), `expressao_sql`, `entidade`/`campo`/`valor`. O CHECK
  `tmpl_flag_definicao_por_tipo` é o que separa manual de derivada: manual **não pode**
  ter `expressao_sql` nem o trio declarativo. A verificação veio em
  `supabase/migrations_arquivo/20260605142038_bb782371-e33b-4d99-b2ec-dcf07ac97e36.sql`
  (linhas 11-24).
- `tmpl_bloco_flag`: liga bloco a flag (conjunção booleana, só AND).
- `projeto_flag_valor` (baseline 7174): `cliente_id` (NOT NULL), `pj_pessoa_id`
  (nullable), `flag_id`, `valor boolean`, `setado_por_id`. Índices únicos parciais por
  escopo: `uq_projeto_flag_valor_escopo_cliente` (quando `pj_pessoa_id IS NULL`) e
  `uq_projeto_flag_valor_escopo_pj`. RLS ligada: insert/update a partir de team_member,
  delete só admin.

**A lacuna, e é o custo real desta peça**: `projeto_flag_valor` **não é lida nem escrita
por nenhum arquivo de `src/`**. O único uso fora das migrations é o tipo gerado em
`src/integrations/supabase/types.ts`. Verificado por grep no repo inteiro.

**Onde a flag manual precisa entrar** (`src/hooks/useGerarDocumentoController.ts`):

- linha 413: `const { data: catalogoFlags = [] } = useFlags();` (o hook está em
  `src/hooks/useBibliotecaModelos.ts:56`, lendo `tmpl_flag`).
- linhas 419-424: `flagsAtivasLive` filtra as que têm `entidade`, `campo` e `valor` e
  chama `avaliarFlags` (`src/lib/templates/flags.ts`). **É aqui que as manuais entram**,
  unidas às derivadas.
- linhas 426-428: `flagsAtivas` escolhe entre snapshot (congelado) e vivas.
- linha 433 (`comporBlocos`) e linha 948 (`gerarComposicao`): o motor consome.

O escopo já está à mão no próprio controlador: `clienteId` (linha 46, de `useOsgWork`) e
`empresaId` (linha 57), que é exatamente o `pj_pessoa_id` de `projeto_flag_valor`. O
mesmo par já é usado nas chamadas de salvar (linhas 276-277 e 331-332).

**Trabalho desta peça**:

1. Hook de domínio sobre `projeto_flag_valor` (leitura por `clienteId` + `empresaId`,
   escrita/toggle com upsert respeitando os dois índices únicos por escopo). Segue o
   padrão dos demais hooks de domínio; consulta nunca no componente.
2. Ligar as flags manuais em `flagsAtivasLive`, ao lado das derivadas.
3. Interface de ligar e desligar. O lugar natural é um passo novo na tela de escolhas
   (`src/components/equipe/osg/gerar/GerarDocumentoEscolhas.tsx`, padrão `PassoCard` de
   `gerarKit.tsx`), aparecendo só quando o modelo tem blocos com flag manual (já existe
   `temBlocosComFlags` na linha 414 do controlador como precedente).
4. Teste de wiring do hook no padrão vitest já usado nos `useDomain*`.

### Peça 2 — snapshots (pronto, zero código novo)

Ao validar, o documento congela: texto resolvido, dados, versões de bloco e flags.

- Forma em `src/hooks/useDocumentoGerado.ts` (359 linhas; interface nas 10-18).
- Escrita em `useSalvarDocumentoGerado` (149 e seguintes), selagem nas 201-238, cópia de
  overrides nas 259-277, leitura de rascunho nas 38-56.
- No controlador: congelamento nas 98-100 e no bloco de render (por volta de 774-800);
  `snapshotFlags` na linha 116.

Os deltas do tipo "o capital atual passará a" entram como **campo editável do binding**
(controlador, ~657-668) ou **texto livre** (~47 e 522-525), e congelam no snapshot ao
validar (~193-206).

### Peça 3 — linhagem (pronto, zero código novo)

Colunas de documento anterior e de raiz; resolução da raiz no controlador (linha 93);
leitura da linhagem em `useDocumentoGerado.ts` (73 e seguintes); ramificação deliberada em
confirmar nova versão (controlador, ~292-301).

O realce por palavra entre versões já está pronto: controlador (~940-966),
`src/lib/templates/renderizarVersao.ts` e `src/lib/templates/diffPalavras.ts`. A interface
é `src/components/equipe/osg/gerar/HistoricoVersoes.tsx`.

### De brinde — renumeração

`src/lib/templates/numeracao.ts` (62-84, chamada em `index.ts:43`) recalcula a numeração
pela ordem real dos blocos, e as referências cruzadas são republicadas (109 e seguintes).
Nenhum código novo.

### Onde o modelo nasce

A tela de montagem (`src/pages/equipe/osg/MontagemDocumentos.tsx`) já sugere o tipo
"alteração contratual". Duplicar modelo mais copiar blocos
(`src/hooks/useModelosDocumento.ts`, 186 e 114-131) permite o modelo nascer da
constituição.

> Os números de linha acima foram conferidos em `develop` em 24/08/2026, mas alguns já
> andaram em relação ao card original. Use-os como âncora, não como endereço exato.

## 4. Atenção

- **Não construir o ledger pela metade.** Meia tabela sem consumidor é dívida pura.
- **Override não é forma de fazer alteração contratual.** A coluna de documento na tabela
  de override é obrigatória, o hook sempre grava com esse escopo, e a tela exige documento
  validado antes (controlador, ~318-322). Override é escopado a um documento e não vira
  modelo.
- **Não expor percentual e data de referência** do quadro societário.
  `src/hooks/useQuadroSocietario.ts:12` já comenta que as colunas existem na tabela e não
  são usadas na tela. Fora do escopo desta tarefa.
- **Quadro societário tem segurança por cluster de cliente.** Qualquer consulta nova passa
  por hook, nunca pelo componente.
- **Reseed destrutivo quebra a reprodução das versões seladas.** O snapshot guarda o texto
  resolvido e é ele que é re-renderizado, mas override e versões de bloco continuam
  apontados por chave. As quatro guardas da migração de junho existem por isso.

## 5. Não faz parte

- O ledger de eventos datados (caminho A).
- A doação de quotas (é da frente de sucessão).
- As flags derivadas de evento, que sem ledger não têm de onde vir.
- Expor percentual e data de referência na tela do quadro societário.
- **Redigir as cláusulas de resolução** (texto jurídico): é a primeira subtarefa do grupo
  anterior, feita por outra pessoa.

## 6. Dependências, e o que está travado hoje

Do card: BER-1, BER-7, o acervo de cláusulas de resolução carregado, e ganha muito se as
**partes ad hoc** já estiverem prontas (cedente e cessionário de cessão de quotas são
exatamente lista ad hoc; o item de motor vem antes deste).

Estado verificado em 24/08/2026:

- **Partes ad hoc**: não existe nada de `ad hoc`/`adhoc`/`ad_hoc` em `src/` nem em
  `docs/`. Não começou.
- **Acervo de cláusulas de resolução**: os blocos são dados no banco, não há seed no
  repositório, e a redação está explicitamente fora do escopo desta tarefa.

**Consequência prática**: a **peça 1 (flags manuais) é a única frente que não depende de
nenhuma das duas** e pode ser feita já. O resto do caminho B é composição do que já roda,
e só fecha quando as cláusulas existirem.

## 7. Pronto quando

Uma alteração contratual sai completa pelo gerador num caso real, ligada pela linhagem à
constituição que ela altera, com numeração coerente e sem edição manual depois.
