-- Corrige o comentario de schema que a troca de fonte deixou falso.
--
-- SO COMENTARIO. Nenhuma tabela, coluna, funcao, indice ou dado e alterado aqui.
--
-- O QUE ESTAVA ERRADO
--   A 20260814200000 (EDU-10) criou `produto_tarefa_padrao` e registrou no
--   comentario da tabela a premissa que justificava a existencia dela:
--
--     "produto_servico e taxonomia de escopo N:N, nao lista de trabalho
--      (premissa de 09/08/2026 no cabecalho da migracao)"
--
--   Em 18/08/2026 a sprint reverteu essa premissa (decisao do tech lead,
--   documentada no cabecalho da 20260819180810): `gerar_tarefas_projeto` passou a
--   ler `produto_servico` + `servicos_prestados`, e `produto_tarefa_padrao` foi
--   abandonada. O motivo esta la, com numero: a tabela tem 0 linhas nos dois
--   bancos e `org_tasks.tarefa_padrao_id` e nulo em 521 de 521, entao a funcao
--   devolvia 0 sempre.
--
--   Aquela migracao comentou a FUNCAO, e so ela. O comentario da TABELA
--   continuou afirmando a premissa revertida — no lugar exato onde a proxima
--   pessoa vai procurar antes de mexer no assunto. Prosa que sobrevive a decisao
--   que ela descrevia e pior que prosa nenhuma: ela e lida como verdade atual.
--
-- E `produto_servico` NAO TINHA COMENTARIO NENHUM, apesar de ser hoje a fonte da
-- geracao de tarefas. Ganha um aqui, com o alerta que interessa: ela tem tela de
-- cadastro, entao um clique de tela mexe no que projetos novos recebem.

comment on table public.produto_tarefa_padrao is
  'ABANDONADA em 18/08/2026 (decisao do tech lead; ver cabecalho da migracao 20260819180810). Foi criada pela EDU-10 como catalogo ordenado de tarefas por produto, sob a premissa de 09/08/2026 de que produto_servico era taxonomia de escopo e nao lista de trabalho. Essa premissa FOI REVERTIDA: gerar_tarefas_projeto le produto_servico + servicos_prestados desde entao. Esta tabela nunca recebeu carga (0 linhas nos dois bancos) e org_tasks.tarefa_padrao_id esta nulo em todas as linhas. Nao e apagada porque a coluna org_tasks.tarefa_padrao_id ainda a referencia; nao use como fonte de nada.';

comment on table public.produto_servico is
  'Quais servicos um produto abrange (N:N). Desde 18/08/2026 tem DOIS papeis: continua sendo a taxonomia de escopo e passou a ser a FONTE DA GERACAO DE TAREFAS — gerar_tarefas_projeto cria uma tarefa de nivel superior por servico vinculado ao produto do projeto. Consequencia: esta tabela tem tela de cadastro (/equipe/acessos, aba Produtos & Servicos), entao marcar ou desmarcar ali muda o que um projeto NOVO daquele produto recebe. Nao muda projeto ja criado: a geracao nao insere quando o projeto ja tem tarefa de nivel superior para o servico, e desvincular nao apaga tarefa ja gerada.';
