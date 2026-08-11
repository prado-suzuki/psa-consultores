# Handoff · mutirão de correções do e2e de geração de contrato (OSG)

Estado em **13/08/2026**, escrito para quem assume a orquestração numa sessão nova (outra conta, outro
agente). Este arquivo é a fonte de verdade do andamento.

> **Atualização da retomada:** L1, L2, L3, L4, L5, L6 e L7 foram revisadas e integradas na branch
> `fix/osg-mutirao-base` até o commit `09ce68ec` (com uma correção posterior de testes da L6). A L5 ganhou
> barreira também para mudança de `cliente_id`; a L2/L3 ganharam `imovel.temCartorio`; a L6 ligou
> signatários, pendências/rascunho e seleção múltipla com georref por matrícula. Validação integrada:
> `bun run lint` sem erros (539 warnings preexistentes), `bun run typecheck`, 2.909 testes, build e provas
> PostgreSQL B1/B10/B11 verdes. **L8/B7 continua bloqueada por decisão do Bernardo.** O que falta agora é
> o Lovable aplicar as migrations e a reexecução manual P00–P26, sempre confirmando com o Bernardo antes
> do primeiro insert. As seções antigas abaixo preservam a cronologia e podem descrever raias como
> pendentes; esta atualização prevalece.

A lista de bugs continua em
`TAREFA_correcoes-e2e-geracao-contrato.md`, nesta mesma pasta, e o contrato técnico entre as raias do
motor de documentos em `docs/osg/contrato-l2-l3-motor-e-blocos.md`.

---

## 1 · O que é este trabalho

Um teste e2e manual do fluxo de geração de contrato da área OSG (roteiro em `e2e/dados/roteiro.md`, caso
`[TESTE E2E] Grupo MMS`) achou **21 bugs**, `B1` a `B21`. Cada um tem sintoma, causa raiz, rastro de código,
correção esperada, uma seção **Não faça** e um critério de aceite escrito sobre um cenário **diferente** do
testado.

**A regra que vale para todos, e que é o coração do trabalho:** nenhuma correção pode assumir "contrato
social de constituição com um imóvel e dois sócios". O mesmo motor atende doação, alteração contratual e
matrícula digitada. Um fix que só faz o caso testado passar está errado, e é por isso que cada bug tem
"Não faça" e um aceite sobre outro cenário. **Todo teste escrito tem que usar o cenário do aceite, não o
caso MMS.**

---

## 2 · Como o trabalho está dividido

Por **dono exclusivo de caminho**, não por severidade: duas raias nunca escrevem no mesmo arquivo. Cada raia
tem worktree própria e branch própria, todas saindo de `fix/osg-mutirao-base`.

| Raia | Bugs | Dono de caminho | Worktree | Branch |
|---|---|---|---|---|
| L1 | B1 | `supabase/migrations/` (arquivos novos) | `psa-wt/l1` | `fix/osg-l1-identidade-matricula` |
| L2 | B4·mapeador, B5·motor, B6, B12, B13, B19, B2·motor | `src/lib/templates/**` **exceto** `binding.ts`, `vocabulario.test.ts`, `docx.test.ts` | `psa-wt/l2` | `fix/osg-l2-motor-documentos` |
| L3 | B4·texto, B5·bloco, B12, B13, B14, B6·texto | migrations novas de conteúdo + `vocabulario.test.ts` + `docx.test.ts` | `psa-wt/l3` | `fix/osg-l3-conteudo-blocos` |
| L4 | B3, B8, B9, B16 | `diagnostico-patrimonial/**`, `DiagnosticoPatrimonial.tsx`, `useDiagnosticoPatrimonial.ts`, `useGeracaoDocumento.ts`, `diagnosticoPatrimonialModalModels.ts` | `psa-wt/l4` | `fix/osg-l4-diagnostico-patrimonial` |
| L5 | B10, B11, B18·administração | `qualificacao-das-partes/**`, `useQualificacaoDasPartes.ts`, + liberados `QualificacaoDasPartes.tsx` e `pessoaModalModel.ts` | `psa-wt/l5` | `fix/osg-l5-qualificacao-partes` |
| L6 | B2, B15 | `gerar/**`, `useGerarDocumentoController.ts`, `src/lib/templates/binding.ts` | `psa-wt/l6` | `fix/osg-l6-tela-gerar` |
| L7 | B17, B18·cliente, B20, B21 | modal e lista de cliente, `useSaveClientTransaction.ts`, `AuthContext.tsx`, + liberados `useApiAuth.ts`, `ContribuintesTab.tsx`, `camposObrigatorios.ts`, `clientFormValidation.ts`, `client-form/ClienteTab.tsx` | `psa-wt/l7` | `fix/osg-l7-cliente-sessao` |
| L8 | B7 | não é código: documento de decisão | — | — |

**Regra de escape:** se um agente precisar tocar arquivo de outra raia, ele **para e escala** para o
orquestrador, que decide se estende o contrato, troca a ordem ou move o bug de raia. Vários caminhos acima
foram liberados exatamente assim.

**Migrations:** qualquer raia pode criar arquivo **novo** em `supabase/migrations/` com prefixo de timestamp
próprio. Ninguém edita migration existente. Ninguém aplica migration: quem aplica é o Lovable.

### Infra do isolamento

As worktrees estão em `/home/bernardo/Documentos/repos/psa-wt/`, fora do checkout do Bernardo
(`/home/bernardo/Documentos/repos/psa-consultores`, que está em `test/e2e-geracao-contrato` e **não deve ser
tocado**). Cada worktree tem `node_modules` próprio criado por `cp -al` (hardlink) a partir do checkout
principal: custa ~1,1 GB no total em vez de 6,5 GB e dá cache de vite/eslint separado por raia, o que importa
quando várias rodam em paralelo. Se precisar criar outra worktree, repita o padrão:

```bash
git worktree add -b fix/osg-<raia>-<slug> /home/bernardo/Documentos/repos/psa-wt/<raia> fix/osg-mutirao-base
cp -al /home/bernardo/Documentos/repos/psa-consultores/node_modules /home/bernardo/Documentos/repos/psa-wt/<raia>/node_modules
```

---

## 3 · O ciclo de cada raia

Máximo **3 rodadas** antes de escalar para o Bernardo.

1. **IMPLEMENTAR** — um subagente pega a raia inteira, lê a seção do bug, implementa a correção
   generalizada e escreve teste que prova a generalização **usando o cenário do aceite**.
2. **VERIFICAR**, ele mesmo: `bunx eslint <só os arquivos alterados>`, `bunx vitest run <só os testes
   relacionados>`, `bun run typecheck`. **Não** rodar `bun run build` a cada mudança.
3. **REVISAR** — um subagente **diferente**, que não implementou, com estas perguntas nesta ordem:
   - O fix viola alguma linha do **Não faça** do bug? Se sim, reprova.
   - **Descreva um segundo cenário real, diferente do MMS** (outro tipo de documento, outro tipo de bem,
     outra composição societária, outro cartório) e diga se o fix continua correto nele. Se não continuar,
     reprova. **Este passo é obrigatório e é a defesa concreta contra overfitting.**
   - O aceite está coberto por teste **automatizado**, e não só por inspeção visual?
   - Viola `AGENTS.md`? (`supabase.from` fora de hook, `alert`/`confirm`, papel em `localStorage`, FK para
     `auth.users`, arquivo de produção acima de 600 linhas, filtro de `ambiente`/`excluido` perdido, mutation
     nova sem `useAuditLog`, edição de autogerado)
   - Sobrou detrito: hook sem consumidor, dead code, teste comentado?
   O revisor devolve **APROVADO** ou lista numerada de correções. Ele **não corrige**.
4. **CORRIGIR** e voltar ao 3.

O revisor deve verificar no código, não no relatório: "relatório de implementador é alegação, não prova"
tem sido a frase que mais rendeu nesta rodada.

**Padrão de prova para migration**, estabelecido pela L1 e repetido pela L5: subir um **Postgres 17 efêmero
em Docker**, aplicar a **migration real do repo sem editá-la**, e afirmar o aceite. Ver
`supabase/tests/b1-matricula-identidade-por-cliente/run.sh` (na worktree `l1`) e
`supabase/tests/b10-conjuge-reciproco/` (na worktree `l5`). Ninguém consulta o banco de produção.

---

## 4 · Estado por raia

> **Atenção primeiro:** havia agentes rodando quando a sessão foi encerrada (rodada 2 da **L2** e da **L3**,
> rerrevisão da **L5**, rodada 2 da **L7**). Esses agentes morreram com a sessão. **Antes de qualquer coisa,
> rode `git -C <worktree> log --oneline fix/osg-mutirao-base..HEAD` e `git status` em cada raia** para ver o
> que de fato ficou commitado, e trate o que estiver sujo (não commitado) como trabalho interrompido, a
> conferir ou refazer.

| Raia | Situação | Último commit conhecido |
|---|---|---|
| L1 | ✅ **APROVADO** | `2161d157` |
| L2 | rodada 2 **interrompida**, árvore suja | `768e4eaa` + alterações não commitadas |
| L3 | rodada 2 **interrompida**, árvore suja | `1276efe8` + alterações não commitadas |
| L4 | ✅ **APROVADO** (rodada 2) | `b871ff60` |
| L5 | ❌ **REPROVADA** na rodada 2 (7 de 8 itens fechados; o 8º **destrói dado**) | `3d33ce64` |
| L6 | **não despachada** (ver §6) | — |
| L7 | rodada 2 fechada pelo implementador, **falta rerrevisar** | `9e7141d3` |
| L8 | **bloqueada** por decisão do Bernardo | — |

### L1 · B1 — APROVADO

Matrícula passou a ser única **por cliente**. `matricula` não tinha `cliente_id` nem `ambiente`, e `bem_id`
é anulável, então o cliente só chegava pela cadeia `matricula → bem → cliente`. A migration desnormaliza
`cliente_id` em `matricula`, mantido por trigger (havendo bem, o dono é o do bem; sem bem, vale o cliente
da criação, que sobrevive à desvinculação; órfã ganha dono no primeiro titular), retro-preenche as antigas
e troca a unicidade global por `UNIQUE (cliente_id, cartorio_id, numero)`. O escopo de ambiente sai de graça:
cliente de dev e de prod são linhas diferentes de `cliente`.

A **deriva de nome da constraint** (produção respondeu `matricula_numero_cartorio_unq`, que não existe em
migration nenhuma) foi resolvida derrubando **por coluna, não por nome**: varredura de `pg_constraint` e
`pg_index` pelo par `(cartorio_id, numero)`.

**Riscos que o Lovable precisa saber ao aplicar:**
1. A migration segura `ACCESS EXCLUSIVE` sobre `matricula` do início ao fim. Janela de baixo uso.
2. Se a checagem de duplicatas abortar, é decisão humana de dado, não bug da migration.
3. Dois erros de UI passam a poder aparecer crus, com mensagem do Postgres: vincular matrícula a bem de
   cliente que já tem o número, e adicionar o primeiro titular a uma órfã na mesma situação. Correção é
   TypeScript, ficou fora do escopo da raia. **Vale virar item novo.**
4. Se `bem.cliente_id` for alterado por fora (SQL manual, Lovable), `matricula.cliente_id` fica defasado.
   Hoje nenhum caminho da aplicação altera esse campo; se passar a alterar, precisa de trigger em `bem`.
5. A policy de `UPDATE` de `matricula` continua sem `WITH CHECK`: "nunca sai do cluster do dono" é
   convenção, não constraint.
6. Se produção tiver deriva também no **nome da policy** de SELECT, o `DROP POLICY IF EXISTS` não acha nada
   e as duas convivem por OR (efeito benigno, mas confira `pg_policies` depois de aplicar).

**Pendente fora de raia:** regerar `src/integrations/supabase/types.ts` (coluna nova, autogerado) e atualizar
o verbete `matricula` em `docs/rls/mapa-do-banco.md`.

### L2 · motor de documentos — rodada 2 interrompida

Rodada 1 entregou: regra de descarte de bloco sem dado (`descarte.ts`), capital fechando com as quotas
(`capital.ts`, em centavos inteiros, com teste de propriedade de 1.000 casos e semente fixa), lista de
signatários (`signatarios.ts`), lacuna de campo manual (`campos.ts`), fallback de cartório (`cartorio.ts`),
e os marcadores + `pendenciasDoDocumento` que a L6 consome.

**REPROVADA** com 10 itens. Os que **não** estavam commitados quando a sessão caiu precisam ser conferidos.
Lista completa, em ordem de gravidade:

1. **`mapeadores.ts:202` e `:404` anulam o B5.** `quotaValorNominal` publicado sempre e `imovel.cartorio`
   nunca vazio (obrigações do contrato) fazem o bloco de capital ter segmentos nunca vazios, então o
   documento sem sócios volta a sair com `O capital social será de R$ (), dividido em () quotas`. Saída
   contratada (emenda 9.1): o motor **marca o valor que ele próprio sintetizou** e `blocoSemDado` não o
   conta como dado.
2. **`index.ts:36`** deixa `{{ ref }}` obsoleto no item cujo bloco repetidor foi descartado (imprime
   referência para cláusula que não existe).
3. **`index.ts:37`** transforma bloco com `ancora` descartado em `Placeholder não resolvido` (falha dura
   nova; latente porque nenhum bloco seeded usa `ancora` hoje).
4. **`signatarios.ts:106`** apaga a outorga do cônjuge que é **administrador não sócio**: `idsProprios`
   mistura sócios com administradores. Restringir aos sócios. Ver decisão 9.9 no §5.
5. **Descarte tem que se anunciar** (emenda 9.2): `gerarBlocos` reporta os blocos descartados. Sem isso, um
   laço não fiado renderiza vazio e o bloco **desaparece sem sinal**. A extensão da regra que a L2 fez por
   conta (render em branco, repetição sem itens) está **ratificada** pela emenda 9.3.
6. **`mapeadores.ts:167-168` + `:486`: quadro misto não fecha.** Sócio lançado só com `vlr_total` contribui
   zero para o total mas imprime `vlr_total` cru na linha.
7. **`mapeadores.ts:160-163` vs `:598-602`:** a identidade não vale para PR quando uma matrícula tem valor e
   não tem titular (uma função soma todas as integralizações, a outra pula a sem titular).
8. **`cartorio.ts:37` usa substring cru:** suprime a comarca **Registro** (comarca real, SP) em qualquer
   "Cartório de Registro de Imóveis". Comparar por limite de palavra.
9. **B14 é da L2** (emenda 9.4): implementar `imovel.livroNumeral` e `imovel.folhaNumeral`.
10. **Emenda 9.6:** publicar `''` para todo campo opcional declarado (`ufCartorio`, `comarca`, `ccir`,
    `livro`, `folha`, `inscricaoMunicipal`).

**Verificado e aprovado pelo revisor, não refazer:** fatiamento byte a byte preservado (`proveniencia.ts`,
`marcas.ts`, `diffPalavras.ts` conferidos), teste de propriedade com semente fixa de verdade, decomposição
real e não wrapper, fronteiras limpas, nenhum "Não faça" violado.

### L3 · conteúdo dos blocos — rodada 2 interrompida

Quatro migrations novas com prefixo `20260813 0003xx`. **REPROVADA** com 7 itens:

1. **`20260813000300...sql:101-111`:** guarda sobre `imovel.ufCartorio` **derruba o render**, porque o motor
   lança em seção cujo campo está ausente e `set()` omite null. Manter a guarda (a L2 vai publicar `''` pela
   emenda 9.6) e **corrigir o comentário**, que afirma falsamente que sem UF "escrevia `, Estado de ,`".
2. **A contagem de vermelhos está errada:** são 9 pelo gap do `livroNumeral` e **1 por outra razão**
   (`vocabulario.test.ts:396`). Fazer a simulação da mescla antes de devolver.
3. **A composição do modelo Agro ESTÁ em migration** (`20260603143244...sql:41` e `:287`; seed original em
   `20260602200000...sql:256`). A conclusão prática não muda, a justificativa escrita está errada.
4. **Emenda 9.7:** nova redação canônica de livro e folha, com guarda no parêntese.
5. **Emenda 9.8:** `{{#imovel.cartorio}}` virou guarda morta e passa a imprimir rótulo genérico solitário.
6. **Risco na migration 302:** advogado e testemunhas continuam em linhas fixas no fecho; quem fiar a lista
   de signatários **não pode passá-los**, sob pena de duplicar. Deixar em comentário.
7. `limit 1` sem `order by` na seleção da cópia do memorial (`303:127`).

**Verificado e aprovado, não refazer:** idempotência das quatro migrations (o revisor rodou as regexes num
Postgres 17), preservação de override (`bloco_origem_id is null` no cursor de todas as varreduras, nota
idempotente em `documento_override.observacao`), versão nova em vez de emenda no lugar, documento selado
não afetado, localização por forma do conteúdo julgada legítima, zero detrito.

### L4 · Diagnóstico Patrimonial — APROVADO

`STATUS_ELEGIVEIS_PARA_INTEGRALIZACAO` como predicado nomeado e único; precisão de área com casa decimal
única (4) para todas as unidades; valor do bem derivado das matrículas; utilitário único de falha de
validação com toast, troca de aba e foco.

**Observações residuais que não bloquearam, para virarem itens novos:**
- `MatriculaDadosTab.tsx:52-55`: o aviso de arredondamento degenera quando o destino é `ha e m²` (mostra
  antes e depois idênticos).
- `statusIntegralizacao.ts:40`: `statusLevaBemAoDocumento` ficou sem consumidor de produção.
- **`useRelatorioDP.ts:44` ainda lê `bem.vlr_contabil` direto**, então o relatório do DP mostrará `R$ 0,00`
  para imóvel enquanto a lista mostra a soma. **Fora de todas as raias; precisa de dono.**

### L5 · Qualificação das partes — REPROVADA na rodada 2, três itens, PERDA DE DADO

Rodada 1 reprovada com 8 itens. Rodada 2 (`3d33ce64`) fechou **sete**: o B11 na tela principal, a limpeza do
vínculo ao sair do estado civil casado (que vale também para a ficha de Classificar, por estar no construtor
de payload), o backfill sem vencedor arbitrário, o índice alheio, a prova do gatilho em Postgres efêmero
(rodada pelo revisor: exit 0, 44 afirmações que leem estado depois de cada operação, não só execução), o
registro do gap de auditoria, e a barreira de tenancy (a exceção do "valor legado inalterado" foi
investigada e **não abre porta**: só é alcançada quando o valor já é cruzado e idêntico ao `OLD`, e nesse
ramo o gatilho não escreve nada).

**O item 8 (filiação derivada) reprovou, e o primeiro achado destrói dado em produção.** Os três:

1. **`20260813120200_filiacao_derivada_do_parentesco.sql:86-96` apaga filiação que nunca veio de vínculo.**
   A projeção usa `filiacao_pai_pessoa_id IS NOT NULL` como prova de que o valor veio de um vínculo, mas a
   população que existe hoje foi criada pelo `FiliacaoCombobox` antigo, que gravava esse ponteiro **sem**
   criar linha em `parentesco`. O revisor reproduziu num Postgres com o fixture: pessoa com
   `filiacao_pai = 'Joaquim Pai'` e ponteiro preenchido perde o pai no instante em que alguém cadastra um
   vínculo **de tio** para ela, que não tem nada a ver com o slot. E o caso que o cabeçalho da migration jura
   ser seguro falha: vínculo `Pai/Mãe` cujo parente tem `genero` nulo não casa com slot nenhum, o ponteiro
   está preenchido, e a projeção zera texto e ponteiro **dentro do backfill da própria migration, no
   deploy**. Sem `NOTICE`, sem auditoria, sem volta. Requisito: materializar os ponteiros existentes como
   vínculos `Pai`/`Mãe` **antes** de qualquer projeção; a projeção não pode esvaziar slot cujo ponteiro nunca
   teve vínculo; e o fixture precisa das duas populações com afirmação de que nada se perdeu.
2. **`classificar/FichaColuna.tsx:161` + `ClassificarDocumentos.tsx:331-343` continuam fabricando essa
   população:** os pais escolhidos no combobox viram ponteiro sem vínculo. A conversão para vínculo real
   ficou só em `PessoaModal.criarVinculosIniciais`. A segunda verdade que o B11 mandou eliminar continua
   nascendo por esse caminho, e cada pessoa criada por ele já nasce armada para o apagamento do item 1.
   Requisito: conversão numa função só, compartilhada por todo caminho de criação, com teste na Classificar.
3. **`FiliacaoDerivada.tsx:11-16` põe `'Pai/Mãe'` nos dois slots**, enquanto a migration resolve o mesmo tipo
   pelo `genero` do parente. Com um vínculo legado, o modal mostra a mesma pessoa como pai e como mãe, e o
   `useEffect` de sincronia escreve os dois no rascunho, de modo que "Salvar alterações" persiste uma
   filiação que **contraria a projeção do banco**. Requisito: uma regra só para o mesmo fato.

Duas sobras menores, que não reprovaram: `TIPOS_PARENTESCO` deixou de oferecer `Pai/Mãe`, então editar um
vínculo legado mostra o campo Tipo em branco; e `criarVinculosIniciais` não deduplica, então a mesma pessoa
escolhida no trio e no combobox cria duas linhas iguais, coisa que o `ParentescoPanel` já sabe recusar.

**Duas sobras do item de tenancy, para não se perderem:** o lado do outro cliente nunca é limpo (por
desenho, o gatilho não escreve fora do tenant), e como o gatilho é `UPDATE OF conjuge_id`, **mover uma pessoa
de cliente** (`UPDATE ... SET cliente_id`) criaria um par cruzado sem passar por checagem nenhuma.

**Leitura para quem assumir:** o item 8 é o mais ambicioso da raia e foi o único que nasceu de uma
reprovação, não do bug original. Vale considerar **separá-lo** numa frente própria e mesclar os sete itens
fechados, em vez de segurar a L5 inteira por uma migration que mexe em dado histórico.

**Anotado e não corrigido:** `poderes.excecoes` é hoje dado só de cadastro, que **nenhum documento imprime**.
Fazer a cláusula de administração percorrer a lista é trabalho do motor (L2) e não foi pedido em bug nenhum.

### L6 · Tela Gerar — NÃO DESPACHADA

Segurada de propósito: a worktree sai da base, que não tem o código da L2, então a L6 não teria como testar
contra `mapearSignatarios`. Escrever às cegas é aceitável para texto de bloco (foi o que a L3 fez), não para
um controller de UI. **Despachar depois que a L2 for aprovada e mesclada na base.**

**Sem a L6, o contrato sai sem nenhuma linha de assinatura, em silêncio:** o controller injeta `''` para
seção que o motor não conhece, o laço é pulado sem erro, o bloco fica vazio e a regra do B5 o descarta.

Especificação exata do que a L6 precisa entregar, levantada pelos revisores da L2 e da L3:
- entrada `signatarios` em `PAPEIS_LISTA` (`src/lib/templates/binding.ts`), com `tipo: 'pessoa'`,
  `itemKey: 'signatario'`, fonte própria, e campos extras `nome`, `nomeMaiusculo`, `papel`, `cpfCnpj`,
  `qualificacao`, `eSocio`, `eAdministrador`, `eConjuge`, `eTestemunha`, `eAdvogado`;
- `itensPorLista.signatarios` no `useGerarDocumentoController`, alimentado por `mapearSignatarios(...)`;
- **carregar as pessoas dos cônjuges**, que hoje não estão no conjunto carregado: `pessoaPorId` precisa
  resolver `conjuge_id` de sócio para uma `PessoaRow` completa, e cônjuge não é necessariamente sócio nem
  administrador;
- **não passar `advogado` nem `testemunhas`** para `mapearSignatarios`: eles continuam em linhas fixas no
  bloco de fecho e sairiam duplicados;
- incluir `signatarios` no snapshot e em `reidratarItensPorLista`, senão versão selada perde os signatários;
- B2: usar `pendenciasDoDocumento(blocos)` como terceiro gate ao lado de `selecoesCompletas` e `erro`, com
  confirmação nomeando o que falta e arquivo saindo marcado como rascunho;
- B15: papel do binding declara cardinalidade (um ou muitos), tela oferece seleção múltipla, e o georref
  segue a matrícula de cada item do laço, não um binding único.

**Efeito colateral do B5 que a L6 precisa decidir:** antes de o consultor escolher os registros, blocos cujos
campos ainda não resolveram **somem da prévia** em vez de aparecer com buracos, e voltam conforme os dados
entram. É consequência literal do contrato; a L6 decide se a prévia encolhendo merece aviso próprio.

### L7 · Cliente e sessão — rodada 2 commitada, falta rerrevisar

Rodada 1 reprovada com 5 itens, 3 bloqueantes. Rodada 2 tem dois commits novos (`f79dcda2`, `9e7141d3`).
**Falta a rerrevisão**, checando os cinco:
1. O diálogo de reautenticação **trancava a tela de login** no boot frio (o `SIGNED_OUT` chega antes de
   `getSession()` resolver, o campo de senha fica inoperante e o diálogo mente dizendo "confira a senha").
2. A migration do B20 derrubava uma invariante viva: `get_ordens_by_client_name` (`20260319152802...sql:61-73`,
   consumida por `useTaxReferenceData.ts:194`) casa clientes **por nome exato** e é o pareamento dev/prod; e
   `useSaveClientTransaction.ts:200-211` checa duplicata por nome exato. Sem o `initcap()` as duas quebram
   em silêncio. Decisão do Bernardo: **correção completa**, as duas comparações ficam insensíveis a caixa e
   espaço no mesmo pacote.
3. `useApiAuth.ts:125-132` (`handleSessionExpired` → `navigate('/equipe')`) é o outro caminho destrutivo, e
   roda em **qualquer refetch de fundo** do React Query (~30 hooks fiscais, mais `useDocumentoArquivo` e
   `useGeorefByMatricula` do OSG). Caminho liberado para a L7.
4. O vigia abria "sessão expirou" **por relógio**, antes de tentar renovar, dando falso alarme ao acordar da
   suspensão (o `auth-js` para o auto-refresh com a aba escondida; o `setInterval` de 30s não para).
5. `ContribuintesTab.tsx:461` ficou sem a normalização na digitação que compensa a queda do gatilho.

**A rodada 2 fechou os cinco** (relatório recebido depois dos commits acima). O que o rerrevisor deve
verificar com mais rigor, porque são as escolhas que o implementador tomou sozinho:
- `nome_cliente_normalizado(text)` (`IMMUTABLE PARALLEL SAFE`) + índice funcional
  `idx_cliente_nome_normalizado`, com `get_ordens_by_client_name` comparando **através da chamada de
  função** e não com `lower()` solto, para casar a expressão do índice. Ele manteve `SET search_path` de
  propósito para **bloquear o inlining** e preservar esse casamento: confira que o plano usa o índice.
- A checagem de duplicata ficou **no front** (`chaveDeNomeCliente`, gêmea em TS da função SQL), não em RPC,
  por dois motivos que ele documentou: `ilike` no PostgREST trataria `%`, `_` e `*` como curinga, e a
  migration é aplicada pelo Lovable **depois** de o código subir, então uma RPC inexistente deixaria o aviso
  mudo no intervalo. Julgue se as duas implementações podem divergir com o tempo.
- Ele **removeu** a renovação preventiva de `getValidToken`, que disparava a cada chamada de API, deixando
  só o vigia de 30s. Confirme que o caminho reativo (401 renova e repete) continua intacto.
- `ContribuintesTab.tsx` ficou em **599 linhas**, a duas do teto. Qualquer coisa nova ali exige decompor.
- Ele afirma ter conferido os testes **contra o código antigo** (removendo a guarda, os testes do boot frio
  e do despertar reprovam). Isso é o que separa teste que prova de teste que acompanha: confirme.

**O B20 mudou de natureza e o arquivo de tarefa ainda não reflete isso:** o rastro está errado. Não é
renderização, é o gatilho de banco `normalize_name_title_case` rodando `initcap()` **antes de gravar** em
`cliente.nome`, `contribuinte.nome_razao_social` e `nome_fantasia`. O valor no banco é que está errado, e a
grafia original foi destruída na escrita. O bug passa a ter **⚠️ MIGRAÇÃO** e alcance no módulo fiscal.
**Atualizar o bloco B20 no arquivo de tarefa.**

**Diagnóstico do B21 (causa provável, não medida):** corrida entre renovadores disputando o mesmo refresh
token — o ticker do supabase-js, a renovação preventiva de `useApiAuth.getValidToken` (que dispara a 5 min do
fim **a cada chamada de API**, sobre um `session` capturado do estado React, possivelmente defasado) e o
retry de 401. Não foi reproduzida. A correção ataca a **reação** (destrutiva por construção), não a causa, e
é sólida independentemente do diagnóstico.

### L8 · B7 — BLOQUEADA

O Bernardo decidiu **segurar**. Nada foi despachado, nem código nem documento de decisão. A participação numa
empresa Proprietária pode vir de integralização, cessão, aumento de capital ou doação, e hoje só a primeira
existe. Volta quando ele fechar a semântica da participação. **Não despachar sem ele pedir.**

---

## 5 · Decisões do Bernardo (fechadas, não reabrir)

1. **B1 · escopo da matrícula:** única **por cliente**. A alternativa (entidade compartilhada com N:N para
   bem) foi descartada.
2. **B6 · capital:** **capital segue as quotas**. Quota de R$ 1,00; o capital do contrato é o valor inteiro
   correspondente às quotas, e a diferença de centavos vira ajuste do valor integralizado. Descartadas: quota
   fracionada de R$ 0,01 e valor nominal parametrizado por sociedade. Mas o valor nominal deixa de ser
   constante implícita e vira campo exposto.
3. **B3 · status elegível:** `Integralizado` fica **fora**. Conjunto = `['Aprovado', 'Aprovado para 2ª
   Instancia']`. O desenho tem que permitir mudar isso em **uma linha**.
4. **B7:** parado.
5. **B20:** **correção completa** — derrubar o gatilho nos três campos **e**, no mesmo pacote, tornar
   `get_ordens_by_client_name` e a checagem de duplicata insensíveis a caixa e espaço. Nomes já achatados
   continuam achatados: a grafia original foi destruída e conserto automático inventaria caixa.
6. **B12 · assinatura de quem é sócia E cônjuge outorgante:** **uma linha só, papel combinado** ("Sócia e
   cônjuge outorgante"). O dedupe **não** vale para cônjuge que é apenas administrador não sócio, que ganha
   linha própria.

---

## 6 · O contrato L2↔L3

Vive em `docs/osg/contrato-l2-l3-motor-e-blocos.md`. Foi congelado **antes** de as duas raias serem
despachadas, que é o que permitiu elas correrem em paralelo, e **emendado duas vezes** durante o trabalho,
as duas por defeito do contrato e não da implementação. A seção 9 concentra as emendas: valor sintetizado não
conta como dado (9.1), descarte se anuncia (9.2), regra de descarte mais ampla (9.3), dono do B14 (9.4),
`ref` e âncora sobrevivem ao descarte (9.5), campo opcional publica `''` (9.6), guarda no extenso de livro e
folha (9.7), guarda morta do cartório (9.8), signatários com papel combinado (9.9).

**Quem assumir e precisar mudar um item do contrato: mude por escrito, commite na branch `base`, e avise as
duas raias.** Foi assim que funcionou; divergência silenciosa entre L2 e L3 é o cenário caro.

---

## 7 · Achado transversal que ainda não tem dono

**Guarda sobre campo publicado por `set()` está quebrada em produção hoje.** O motor lança em seção cujo
campo está **ausente**, e o mapeador omite a chave quando o valor é nulo. Logo `{{#imovel.ccir}}` derruba o
render para qualquer matrícula rural sem CCIR, e `{{#imovel.livro}}` / `{{#imovel.folha}}` para qualquer
matrícula sem livro ou folha, tudo isso no **texto vivo** de `20260810120000...sql:91-107`, nas cinco
variantes da família "Descrição de imóvel". O e2e não pegou porque a matrícula do caso tinha os três campos.

A emenda 9.6 resolve pelo lado da L2 (publicar `''`), mas **isso é um bug de produção que ninguém tinha
notado e que merece bloco próprio no arquivo de tarefa**.

---

## 8 · Regras do repositório que os subagentes erram se não forem repetidas

Repita isto em **todo** prompt de subagente. Custa pouco e evita retrabalho.

- **Bun sempre.** Nunca `npm`/`yarn`/`pnpm`. Não tocar em `package-lock.json` nem em `bun.lock`/`bun.lockb`.
- **Existe UM banco Supabase e ele é PRODUÇÃO.** Ninguém roda SQL, ninguém aplica migration, ninguém procura
  credencial. Migration é arquivo novo no repo, aplicada pelo Lovable. Nunca editar migration existente.
- Componente React **não conhece Supabase**: query e mutation vivem em hook em `src/hooks/`.
- Feedback visual por **toast** (`useToast`/`sonner`), nunca `alert`/`confirm`/`prompt`.
- Mutation **nova** usa `useAuditLog` com diff campo-a-campo.
- Filtros `.eq('ambiente', ...)` e `.eq('excluido', false)` não podem se perder.
- Papel (role) nunca em `localStorage`/`sessionStorage`/`profiles`. FK nunca para `auth.users`.
- Nenhum `.tsx` de produção acima de **600 linhas**.
- Não editar autogerados: `src/integrations/supabase/*`, `components.json`, `supabase/config.toml`.
- Schema: ler `docs/rls/mapa-do-banco.md`, **nunca** `types.ts` inteiro.
- Documentação em `docs/`, nunca na raiz.
- Commits em **português**, conventional commits, **sem trailer de co-autoria**. Ver
  `.claude/skills/commit/SKILL.md`.

---

## 9 · O que falta para fechar

Em ordem.

1. Conferir o que ficou sujo nas worktrees da **L2** e da **L3** e retomar a rodada 2 das duas. Os dois
   agentes foram **parados no meio**, então a árvore suja é trabalho a meio caminho, não trabalho pronto: leia
   o diff antes de aproveitar qualquer coisa. A lista das 10 correções da L2 e das 7 da L3 está no §4.
2. Decidir o que fazer com a **L5**: ou rodada 3 no item da filiação derivada, ou separá-lo numa frente
   própria e mesclar os sete itens já fechados. **Nada da migration `20260813120200` pode ir para o Lovable
   como está**: ela apaga filiação de pessoas cadastradas pelo fluxo antigo, no próprio backfill do deploy.
3. Rerrevisar **L7** (rodada 2 fechada, os cinco itens têm pontos de atenção listados no §4).
4. Aprovar a **L2**, mesclar na base, recriar a worktree da **L6** a partir dela e despachar a L6 com a
   especificação do §4.
5. Mesclar na ordem: **L1, L4, L5, L7** em qualquer ordem; depois **L2**, então **L3**, então **L6**.
6. Antes de propor merge para `develop`: `bun run lint`, `bun run typecheck`, `bun run test` e
   `bun run build`, tudo verde.
7. **Reexecutar o roteiro `e2e/dados/roteiro.md` do P00 ao P26**, num cliente de teste **novo**, apontando
   para **localhost** (nunca produção), e **confirmar com o Bernardo antes do primeiro insert**.
8. Confirmar que a seção "Confirmações que devem continuar passando" no fim do arquivo de tarefa continua
   verdadeira: CCIR compartilhado entre duas matrículas do mesmo bem; bem fora da estruturação ausente do
   documento; modal de matrícula adaptando ITR/IPTU por tipo; área em hectare com quatro casas; outorga
   conjugal só para quem o regime exige; CNAE virando lista.
9. Marcar `✅ CONCLUÍDO (data)` bug a bug no arquivo de tarefa e atualizar a coluna Status no `README.md` da
   sprint. **Isso é do orquestrador, não das raias** (arquivo compartilhado, conflito garantido), e por isso
   ainda não foi feito para nenhum bug.
10. Itens novos que nasceram do mutirão e precisam de dono, listados ao longo do §4: os dois erros crus de UI
   do B1, `useRelatorioDP.ts:44`, o aviso de arredondamento em `ha e m²`, a guarda quebrada do §7, e o
   rastro errado do B20 no arquivo de tarefa.

## 10 · Dados de teste que continuam no banco

O teste deixou de pé o cliente `[TESTE E2E] Grupo MMS` (id `8f9c2796-b9f3-4349-923b-b04e86bc6012`,
`ambiente='dev'`). Duas coisas nele estão fora do dossiê **de propósito** e podem confundir quem for
verificar: o bem BS 08 está com status "Aprovado" em vez de "Integralizado", e as sete matrículas têm o
número prefixado com `[TESTE] ` por causa do próprio B1. **Não corrija esses dados: eles são a evidência.**
