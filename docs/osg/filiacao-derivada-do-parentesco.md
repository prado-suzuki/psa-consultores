# Filiação derivada do parentesco (frente adiada)

**Estado:** fora da entrega do mutirão da sprint 11. Extraída da branch de integração em
`fix/osg-f1-filiacao-extracao`.
**Motivo:** a versão implementada **destrói dado em produção**, em duas populações que existem hoje.
**Nada disso foi para o Lovable:** a migration `20260813120200_filiacao_derivada_do_parentesco.sql`
nasceu nesta sprint (commit `3d33ce64`), nunca foi aplicada, e foi removida do repositório junto do
resto do item. Não há migration de reversão a escrever.

## O que era o item

`pessoa.filiacao_pai` / `filiacao_mae` (texto livre, com ponteiro opcional `filiacao_*_pessoa_id`
para uma PF cadastrada) e a tabela `parentesco` cadastram o mesmo fato por dois caminhos que não se
falam: dava para escrever "Joaquim Pai" no texto e cadastrar outro pai na lista. O B11 pediu uma
origem só.

A tentativa reprovada fez `parentesco` virar a origem e as quatro colunas de `pessoa` virarem
projeção, mantida por gatilho no banco:

- migration `20260813120200_filiacao_derivada_do_parentesco.sql`
  (`projetar_filiacao_da_pessoa`, `trg_parentesco_projeta_filiacao`,
  `trg_pessoa_renome_projeta_filiacao`, mais o backfill);
- componente `pessoa/FiliacaoDerivada.tsx` (slot com vínculo vira leitura);
- `TIPOS_PARENTESCO` trocando o tipo único `Pai/Mãe` por `Pai` e `Mãe` separados;
- `PessoaModal.criarVinculosIniciais`, convertendo o pai/mãe escolhido no combobox em linha de
  `parentesco` no cadastro novo;
- `supabase/tests/b10-conjuge-reciproco/06-filiacao.sql`.

O item **não veio de nenhum dos 21 bugs do e2e**: nasceu de uma reprovação de revisão, e é a única
coisa do mutirão que destrói dado. Por isso saiu inteiro, em vez de ser remendado sob pressão de
entrega.

## As duas perdas, reproduzidas

Dois verificadores independentes reproduziram as duas num Postgres 17 efêmero em Docker, aplicando a
migration real do repositório sem editá-la.

A causa das duas está no mesmo par de linhas
(`20260813120200_filiacao_derivada_do_parentesco.sql:87` e `:92`):

```sql
v_novo_pai := CASE
                WHEN v_pai_id IS NOT NULL THEN v_pai_nome
                WHEN v_atual.filiacao_pai_pessoa_id IS NOT NULL THEN NULL  -- ← aqui
                ELSE v_atual.filiacao_pai
              END;
```

O `filiacao_pai_pessoa_id IS NOT NULL` é usado como **prova de que o valor veio de um vínculo**. Não
é: o `FiliacaoCombobox` antigo grava exatamente esse ponteiro **sem** criar linha em `parentesco`, e
é assim que a população de hoje foi criada. Nada materializa esses ponteiros como vínculos antes da
projeção rodar.

### Perda A — o tio apaga o pai

Pessoa cadastrada pelo fluxo antigo: `filiacao_pai = 'Joaquim Pai'`, `filiacao_pai_pessoa_id`
apontando o Joaquim, e **nenhuma** linha em `parentesco`.

1. alguém cadastra para ela um vínculo qualquer, por exemplo `Tio(a)`;
2. o `AFTER INSERT` em `parentesco` chama `projetar_filiacao_da_pessoa`;
3. a busca do slot de pai não encontra vínculo (`v_pai_id IS NULL`), mas o ponteiro está preenchido,
   então cai no ramo do meio;
4. `filiacao_pai`, `filiacao_pai_pessoa_id`, `filiacao_mae` e `filiacao_mae_pessoa_id` são zerados.

O tio não tem nada a ver com o slot do pai. Basta um vínculo de qualquer tipo para varrer a filiação
inteira de quem foi cadastrado pelo caminho antigo.

### Perda B — o `Pai/Mãe` legado sem gênero, no próprio deploy

Vínculo legado gravado com o tipo único `Pai/Mãe`, cujo parente tem `genero` **NULL**. A coluna
`pessoa.genero` é nullable e nenhum formulário a exige, então essa população existe.

1. a resolução do slot é `v.tipo = 'Pai' OR (v.tipo = 'Pai/Mãe' AND parente.genero = 'M')` (e o
   simétrico com `'F'` para a mãe): com `genero` nulo, os dois lados dão falso e o vínculo **não casa
   com slot nenhum**;
2. o ponteiro `filiacao_*_pessoa_id` está preenchido (foi o combobox antigo que o gravou);
3. o backfill da própria migration percorre `WHERE v.tipo IN ('Pai', 'Mãe', 'Pai/Mãe')` e chama a
   projeção para essa pessoa;
4. texto e ponteiro são zerados **no deploy**, sem `NOTICE` de perda, sem entrada em `audit_logs`
   (os gatilhos não passam por `useAuditLog`, ver `docs/geral/auditoria-gaps-cud.md`) e sem volta.

O cabeçalho da migration afirmava o contrário ("sem gênero, ele não ocupa slot nenhum e o texto que
já estava lá continua intacto"). A afirmação vale para texto **sem ponteiro**; com ponteiro, que é o
caso real, o texto é apagado.

## Requisito para a próxima tentativa

1. **Materializar antes de projetar.** Antes de qualquer projeção (inclusive antes do backfill),
   converter os `filiacao_pai_pessoa_id` / `filiacao_mae_pessoa_id` existentes em linhas `Pai` / `Mãe`
   de `parentesco`, com `NOT EXISTS` / `ON CONFLICT` para a migration continuar idempotente. Sem esse
   passo, a projeção lê ausência de vínculo onde existe fato cadastrado.
2. **Só esvaziar slot que comprovadamente teve vínculo.** O ponteiro não é prova de origem. A
   projeção precisa de uma prova real (o vínculo materializado no passo 1, ou uma marca explícita de
   procedência), e na dúvida **preserva**.
3. **Fixture com as duas populações.** O teste em Postgres efêmero precisa carregar (a) pessoa com
   ponteiro preenchido e sem linha em `parentesco`, e (b) vínculo `Pai/Mãe` legado com `genero` NULL
   no parente — e afirmar, depois do backfill e depois de cadastrar um vínculo alheio (tio), que
   **nada se perdeu**. Hoje o fixture só tinha as populações que a implementação já sabia tratar.
4. **Uma função só para converter ponteiro em vínculo.** A conversão precisa ser função compartilhada,
   chamada por **todo** caminho de criação de PF. Hoje ela existia como cópia dentro de
   `PessoaModal.criarVinculosIniciais`, enquanto
   `src/components/equipe/osg/documentos/classificar/ClassificarDocumentos.tsx` (`cadastrar`, com o
   combobox em `classificar/FichaColuna.tsx`) continuava fabricando ponteiro sem vínculo. Cada pessoa
   criada por ali já nascia armada para a Perda A. O teste tem que cobrir os dois caminhos.
5. **Uma regra só para o `Pai/Mãe` legado, valendo em tela e banco.** As duas divergiam em dois
   pontos:
   - **qual slot ele ocupa:** `FiliacaoDerivada.tsx` punha `Pai/Mãe` nos **dois** slots (`TIPOS_PAI`
     e `TIPOS_MAE` incluíam o tipo legado), enquanto o banco resolvia pelo `genero` do parente. Com
     um vínculo legado, o modal mostrava a mesma pessoa como pai **e** como mãe, e o `useEffect` de
     sincronia escrevia os dois no rascunho: "Salvar alterações" persistia uma filiação que
     contrariava a projeção do banco;
   - **qual vínculo vence na multiparentalidade:** a migration pegava o **mais antigo**
     (`ORDER BY v.created_at, v.id LIMIT 1`) e a tela pegava o **mais novo** (o hook
     `useParentescosByCliente` ordena `created_at` descendente e o componente resolvia com `.find()`).

## Sobras menores que vão junto

Não reprovaram sozinhas, mas pertencem a esta frente e voltam com ela:

- **`TIPOS_PARENTESCO` sem `Pai/Mãe`.** Trocar o tipo único por `Pai` e `Mãe` deixa o campo "Tipo"
  em branco ao editar um vínculo legado, porque o valor gravado não está mais na lista de opções. Com
  a extração, a lista voltou a ter `Pai/Mãe` e o problema não existe hoje; ele reaparece assim que os
  tipos forem separados de novo.
- **`criarVinculosIniciais` não deduplicava.** A mesma pessoa escolhida no trio Parente/Tipo/Natureza
  e no combobox de filiação criava duas linhas iguais em `parentesco`, duplicata que o
  `ParentescoPanel` já sabe recusar na lista. A dedupe precisa entrar na função compartilhada do
  requisito 4.

## O que continua valendo (não faz parte desta frente)

Os sete itens aprovados da raia L5 ficaram na entrega e não dependem da projeção:

- reciprocidade do cônjuge por gatilho (`20260813120000_pessoa_conjuge_reciproco.sql`), com backfill
  sem vencedor arbitrário e barreira de tenancy (inclusive a rejeição quando muda `cliente_id`);
- a lista de parentesco no modal (`pessoa/ParentescoPanel.tsx`), com N vínculos por pessoa;
- a coluna `administracao.poderes` (`20260813120100_administracao_poderes.sql`);
- a limpeza de `conjuge_id` ao sair do estado civil que admite cônjuge
  (`ehEstadoCivilComConjuge` em `src/lib/pessoaModalModel.ts`);
- a coluna Filiação da tela principal mostrando **todos** os vínculos
  (`src/pages/equipe/osg/QualificacaoDasPartes.tsx`, `FiliacaoCell`);
- o registro do gap de auditoria em `docs/geral/auditoria-gaps-cud.md`;
- a prova em Postgres efêmero `supabase/tests/b10-conjuge-reciproco/run.sh`, agora só do B10.

Com a extração, a filiação volta a ter duas entradas (texto livre e lista de vínculos) que não se
falam. Isso é o estado anterior ao mutirão, e é o que esta frente existe para resolver — sem apagar
o que já está cadastrado.
