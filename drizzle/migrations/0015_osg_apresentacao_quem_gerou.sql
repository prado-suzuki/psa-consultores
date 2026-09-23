-- `osg_apresentacao.gerado_por` nasceu sem default, e por isso sem autor.
--
-- A tabela foi desenhada como espelho da `wp_apresentacao` — mesmas 13 colunas de
-- artefato, mais `cliente_id`, `tipo` e `snapshot_dados`. Eram tres diferencas
-- intencionais; esta era uma quarta, nao intencional: a `wp_apresentacao.gerado_por`
-- tem `default auth.uid()` e a nossa saiu sem nada.
--
-- A migration original foi escrita a partir do schema VIVO da tabela irma, porque
-- o arquivo dela nao esta neste repositorio (esta entre as 32 aplicadas por fora
-- que o `db:sync` lista). Copiar de uma descricao de colunas perde o que nao e
-- coluna — e default nao e coluna.
--
-- O efeito era concreto: as 8 primeiras linhas gravadas sairam com autor nulo. Sem
-- isto, a tabela repetiria o que aconteceu no Controle PERDCOMP, onde
-- `criado_por` e quase 100% nulo e "quem usou" deixou de ser respondivel.
--
-- NAO HA BACKFILL. As linhas existentes sao de cliente de teste, geradas pela
-- conferencia; preencher agora seria inventar autoria a partir de suposicao.

alter table public.osg_apresentacao
  alter column gerado_por set default auth.uid();

comment on column public.osg_apresentacao.gerado_por is
  'Quem disparou a geracao. Vem do `default auth.uid()`, e nao do codigo: a '
  'insercao passa pela conexao do usuario, sob RLS, e o banco e quem sabe quem e.';
