-- PT-02: a OS passa a ser obrigatória no estudo.
--
-- A tela já exigia as duas coisas, cliente e OS, e barrava o botão dizendo o que
-- faltava. O banco não: `cliente_id` era `not null` e `ordem_servico_id` aceitava
-- nulo. Enquanto só a tela grava isso não aparece, mas um script ou uma tela nova
-- criaria estudo sem OS, e ele ficaria SEM PORTA DE ENTRADA: o seletor procura
-- pelo par cliente mais OS e nunca acharia aquele registro.
--
-- O enunciado da tarefa pede o vínculo com as duas: "revisão rastreável ligada ao
-- cliente, à OS e ao arquivo original". E a PT-04 resolve os projetos onde publicar
-- o aviso somente por `ordem_servico_id`, sem cair para busca por cliente: sem a
-- OS, aquela etapa não tem endereço.
--
-- Seguro agora e mais caro depois: hoje `wp_estudo` está com zero linhas, então não
-- há registro antigo para quebrar.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'wp_estudo'
      and column_name = 'ordem_servico_id'
      and is_nullable = 'YES'
  ) then
    -- Se algum dia rodar num banco que já tenha estudo sem OS, é melhor falhar aqui
    -- e alguém decidir o que fazer com aquele registro do que apagar em silêncio.
    if exists (select 1 from public.wp_estudo where ordem_servico_id is null) then
      raise exception 'Existe estudo sem ordem de serviço. Resolva antes de tornar a coluna obrigatória.';
    end if;

    alter table public.wp_estudo alter column ordem_servico_id set not null;
  end if;
end $$;
