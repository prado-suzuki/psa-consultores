-- 20260922150000_migra_ferramentas_para_tax_work.sql
--
-- O NOME DESTE ARQUIVO NAO PODE CONTER `_dev_`. Ele se chamava
-- `..._digital_dev_vira_tax_work.sql` e o `.gitignore` o engolia calado, pela
-- regra `supabase/migrations/*_dev_*.sql`, que existe para os SEEDS do sandbox
-- nunca serem versionados (o Lovable roda o que estiver na pasta). Commitado
-- assim, o arquivo simplesmente nao existiria para producao — e ai o primeiro
-- clique em "Atualizar lista" faria as 21 pessoas perderem as 31 telas, que e
-- exatamente o que esta migracao existe para impedir. Achado em 22/09/2026, ao
-- conferir por que ele nao aparecia no `git status`.
-- Tarefa [4] da sprint 14: o Digital Dev passa a ser o Tax Work, dentro da area
-- Tax, com rota e nome novos. Nao e atalho: as 30 rotas mudam de `/equipe/dev`
-- para `/equipe/tax/work`.
--
-- POR QUE ISTO E MIGRACAO, E NAO SO CODIGO. O controle de acessos casa pagina
-- por CAMINHO (`page_permissions.page_path`, que e UNIQUE), e o sincronizador
-- do `src/config/protectedPages.ts` INSERE e ATUALIZA, mas NUNCA APAGA. Esta
-- escrito no proprio arquivo, e ja obrigou migracao em 12/09/2026, quando
-- `/gestao/acessos` saiu.
--
-- Trocando os caminhos so no codigo, a proxima vez que alguem clicar em
-- "Atualizar" no Controle de Acessos:
--
--   * nascem 31 linhas novas em `/equipe/tax/work...`, SEM NINGUEM dentro;
--   * as 31 antigas continuam de pe, com todas as concessoes penduradas nelas,
--     apontando para rotas que nao existem mais.
--
-- Resultado: as 21 pessoas perdem as 31 telas de uma vez. Renomear o
-- `page_path` NO LUGAR preserva o `id`, e as concessoes seguem sozinhas, porque
-- `user_page_access` aponta para o id e nao para o texto do caminho.
--
-- E NAO SERVE APAGAR E RECRIAR: a FK `user_page_access_page_permission_id_fkey`
-- e ON DELETE CASCADE, entao o DELETE levaria as concessoes junto.
--
-- MEDIDO EM PRODUCAO EM 22/09/2026:
--
--    31  linhas em page_permissions sob /equipe/dev, todas ativas
--    31  delas na categoria 'dev', e ZERO paginas 'dev' fora desse caminho: a
--        categoria se esvazia e se aposenta com esta migracao
--   648  concessoes em user_page_access penduradas nessas linhas
--    21  pessoas distintas, com 20 ou 21 paginas cada
--    21  dessas 21 JA TEM a categoria 'tax' por outras paginas, entao trocar a
--        categoria nao amplia audiencia: ninguem passa a ver o que nao via
--     0  linhas ja existentes em /equipe/tax/work (sem colisao com o UNIQUE)
--
-- O DE-PARA DE QUEM TINHA O QUE, ANTES, levantado em producao em 22/09/2026.
-- Sem esta foto nao da para provar depois que ninguem perdeu nada:
--
--   24  pessoas tem Tax e/ou as ferramentas
--   21  tem AS DUAS COISAS (11 paginas Tax + 31 ferramentas; uma delas com 28)
--    3  tem SO TAX, e nenhuma delas ganha ferramenta por esta migracao:
--         layara.maranguelli@...      11 paginas Tax, 0 ferramentas
--         welber@...                  11 paginas Tax, 0 ferramentas
--         funaro@prado-advogados.com   4 paginas Tax, 0 ferramentas (externo,
--                                      recorte estreito e deliberado)
--    0  tem SO AS FERRAMENTAS — ninguem depende da area Digital para chegar
--       nelas, entao tirar o cartao de la nao isola ninguem
--
-- ESTA MIGRACAO NAO CONCEDE NEM REVOGA NADA. Ela so renomeia. Quem tinha as 31
-- ferramentas continua com as 31; quem nao tinha continua sem. Dar as
-- ferramentas a quem tem Tax e ato separado, pelo botao "conceder area" do
-- Controle de Acessos, que fica auditado e e do administrador decidir.
--
-- A CATEGORIA VAI JUNTO, de 'dev' para 'tax'. Ela decide quais CARTOES DE AREA
-- a pessoa ve, porque `useUserAccessibleCategories` deriva a lista das paginas
-- que ela tem, e e o rotulo do bloco no Controle de Acessos. Deixar 'dev' faria
-- a area Tax hospedar 31 paginas rotuladas "Digital Dev", e faria o
-- `AREA_CATEGORIES_MAP.digital` seguir reivindicando paginas que mudaram de
-- casa. A categoria 'dev' se esvazia e se aposenta aqui.
--
-- UMA CATEGORIA SO, COMO NO OSG, e a decisao passou por duas voltas em
-- 22/09/2026. Vale registrar as duas, porque a primeira estava mal fundamentada.
--
-- A primeira versao deu categoria propria as ferramentas ('tax_work'), com o
-- argumento de que conceder a area em lote viraria "tudo ou nada" e entregaria
-- SPED, ECD, ECF e PERDCOMP a quem so devia ter o quadro de projetos — pensando
-- no caso real do `funaro@prado-advogados.com`, externo, com QUATRO paginas.
--
-- O ARGUMENTO ESTAVA ERRADO. `paginasDaArea()` resolve pela LISTA de categorias
-- da area, e `AREA_CATEGORIES_MAP.tax` listava as duas. Ou seja, o botao de
-- conceder area ja entregava as 42 paginas nos DOIS desenhos. A separacao nao
-- protegia ninguem: ela so mudava o agrupamento da arvore de permissoes.
--
-- Com isso medido, a decisao do Bernardo fecha: a Tax fica como a OSG, uma
-- categoria cobrindo as duas portas. O que se perde e o gesto de marcar "as 31
-- ferramentas" de uma vez na arvore; dar so as ferramentas passa a ser selecao
-- pagina a pagina, que ja e como o OSG vive.
--
-- O QUE NAO DEPENDE DISSO, e chegou a ser usado como argumento errado: o cartao
-- que leva a "Acesso Negado" no OSG, onde as duas portas sao liberadas pela
-- mesma categoria. O `TaxAreaSelector` pergunta pela PAGINA exata no cartao do
-- Tax Work, entao aqui esse defeito nao se repete nem com a permissao igual.
--
-- CUSTO COLATERAL, honesto: a Tax era a ultima area com duas categorias, entao
-- a regra "UMA categoria ja da a area" (`some`, e nao `every`, em
-- `areasDoUsuario.ts`) fica sem nenhum caso REAL que a exercite. O motivo dela
-- ficou escrito naquele arquivo, ja que o teste nao pode mais prova-la com dado
-- de verdade.
--
-- ORDEM: esta migracao vai ANTES de o codigo chegar, e o motivo NAO e perda de
-- acesso. `usePageAccess` trata pagina sem linha como ACESSO LIVRE (o
-- `if (!page) return true` do hook), entao nas duas ordens existe uma janela em
-- que 30 telas ficam ABERTAS a qualquer pessoa autenticada. O que muda e o
-- tamanho da exposicao:
--
--   * migracao antes: quem fica sem linha sao as telas VELHAS. E o cartao do
--     Digital Dev some junto, porque ninguem mais tem a categoria 'dev' e o
--     seletor da area e decidido por ela. So chega la quem tiver a URL salva;
--   * codigo antes: quem fica sem linha sao as telas NOVAS, e o cartao "TAX
--     Work" aparece para TODO MUNDO, porque a visibilidade dele tambem sai do
--     `usePageAccess`. Botao visivel e porta aberta.
--
-- Por isso, migracao primeiro. E no sandbox ela so deve ser aplicada quando o
-- codigo estiver pronto para testar: antes disso ela nao serve para nada e a
-- janela fica aberta a toa.
--
-- Idempotente: rodar duas vezes nao faz diferenca.

do $$
declare
  v_linhas_antes      integer;
  v_concessoes_antes  integer;
  v_linhas_depois     integer;
  v_concessoes_depois integer;
  v_colisao           integer;
begin
  /* Casamento por SEGMENTO, e nao por prefixo cru: `like '/equipe/dev%'` pegaria
     um `/equipe/developer` se um dia existisse. Mesma regra do `casa()` em
     `src/lib/areaTheme.ts`. */
  select count(*) into v_linhas_antes
    from public.page_permissions
   where page_path = '/equipe/dev' or page_path like '/equipe/dev/%';

  if v_linhas_antes = 0 then
    raise notice 'Nada a mover: nenhuma pagina em /equipe/dev. Migracao ja aplicada.';
    return;
  end if;

  select count(*) into v_concessoes_antes
    from public.user_page_access u
    join public.page_permissions p on p.id = u.page_permission_id
   where p.page_path = '/equipe/dev' or p.page_path like '/equipe/dev/%';

  /* `page_path` e UNIQUE: destino ocupado abortaria o UPDATE no meio do
     caminho, deixando metade movida. Melhor falhar antes de tocar em nada. */
  select count(*) into v_colisao
    from public.page_permissions
   where page_path = '/equipe/tax/work' or page_path like '/equipe/tax/work/%';

  if v_colisao > 0 then
    raise exception 'GATE: ja existem % linhas em /equipe/tax/work; resolva a colisao antes', v_colisao;
  end if;

  /* Nas expressoes do SET, `page_path` ainda e o valor ANTIGO da linha, que e o
     que faz o recorte e o nome da raiz funcionarem numa passada so. */
  update public.page_permissions
     set page_path = '/equipe/tax/work' || substring(page_path from length('/equipe/dev') + 1),
         category  = 'tax',
         page_name = case when page_path = '/equipe/dev'
                          then 'Ferramentas Tax Work'
                          else page_name
                     end
   where page_path = '/equipe/dev' or page_path like '/equipe/dev/%';

  select count(*) into v_linhas_depois
    from public.page_permissions
   where page_path = '/equipe/tax/work' or page_path like '/equipe/tax/work/%';

  select count(*) into v_concessoes_depois
    from public.user_page_access u
    join public.page_permissions p on p.id = u.page_permission_id
   where p.page_path = '/equipe/tax/work' or p.page_path like '/equipe/tax/work/%';

  if v_linhas_depois <> v_linhas_antes then
    raise exception 'GATE: moveu % linhas, esperava %', v_linhas_depois, v_linhas_antes;
  end if;

  /* O ponto inteiro da migracao: a concessao segue o id. Se este numero mudar,
     alguem perdeu acesso e a transacao inteira volta atras. */
  if v_concessoes_depois <> v_concessoes_antes then
    raise exception 'GATE: as concessoes nao seguiram; antes %, depois %',
      v_concessoes_antes, v_concessoes_depois;
  end if;

  if exists (
    select 1 from public.page_permissions
     where page_path = '/equipe/dev' or page_path like '/equipe/dev/%'
  ) then
    raise exception 'GATE: sobrou pagina em /equipe/dev';
  end if;

  if exists (select 1 from public.page_permissions where category = 'dev') then
    raise exception 'GATE: sobrou pagina na categoria dev, que deveria ter se esvaziado';
  end if;

  raise notice 'Movidas % paginas e % concessoes de /equipe/dev para /equipe/tax/work',
    v_linhas_depois, v_concessoes_depois;
end $$;
