-- Unifica as duas linhas de "Apoio no fechamento contábil" em servicos_prestados.
--
-- O QUE ACONTECEU
--
-- `servicos_prestados` não tem coluna de código: o número que a operação usa
-- para se referir a um serviço é digitado dentro da própria coluna `nome`. Sem
-- código não há busca por código; sem busca, quem não achou o serviço cadastrou
-- outro. Ficaram duas linhas para o mesmo trabalho, uma com o prefixo "1.1." e
-- outra sem número nenhum -- e o pior: os vínculos se partiram entre elas.
--
--   "Apoio no fechamento contábil"       1 produto (03-CC), 1 tarefa,  0 projetos
--   "1.1.Apoio no fechamento contábil"   0 produtos,        0 tarefas, 2 projetos
--
-- Nenhuma das duas está inteira. Quem abre o produto 03-CC não vê os projetos;
-- quem abre os projetos não chega ao produto.
--
-- POR QUE ISTO NÃO SE RESOLVE PELA TELA
--
-- Das seis tabelas que referenciam `servicos_prestados`, a que segura é
-- `org_projects`. O Excluir da tela recusaria com 23503 ("serviço em uso"), e
-- não existe formulário no sistema que troque o serviço de um projeto: o
-- cadastro de projeto grava `servico_id` mas nunca oferece o campo. Os outros
-- casos de duplicidade do catálogo SÃO resolvíveis pela tela, e é por lá que
-- vão -- com a vantagem de passarem pelo `useAuditLog`, que este arquivo não tem
-- como acionar.
--
-- QUEM FICA
--
-- Fica a linha SEM prefixo, porque é ela que carrega o vínculo com o produto --
-- o dado que define o que nasce em projeto novo. O número dela não é escolhido
-- aqui de propósito: "1.1" está em oito serviços do TAX, e carimbá-lo de volta
-- repetiria o problema. O formulário de serviço já propõe o próximo número
-- livre do cluster, e é lá que a numeração se resolve, com registro em auditoria.
--
-- O QUE ESTE ARQUIVO NÃO FAZ
--
-- `org_tasks.title` guarda uma CÓPIA do nome, feita quando a tarefa nasceu.
-- Apagar o serviço não reescreve título de tarefa que já existe, e este arquivo
-- deliberadamente não os toca: são 273 títulos com número no catálogo inteiro, e
-- mexer neles é outra decisão.
--
-- IDEMPOTÊNCIA
--
-- Rodar de novo é no-op: o bloco só age quando ACHA as duas linhas, e ao fim de
-- uma execução bem-sucedida a duplicada não existe mais.

do $$
declare
  v_fica uuid;
  v_sai  uuid;
  v_projetos integer;
begin
  -- Casa pelo NOME, e não por uuid: este arquivo roda em dois bancos (sandbox e
  -- produção) e os ids não são garantidamente os mesmos. `strict` não serve
  -- aqui -- a ausência é o estado normal depois da primeira execução.
  select id into v_fica
    from public.servicos_prestados
   where nome = 'Apoio no fechamento contábil'
   limit 1;

  select id into v_sai
    from public.servicos_prestados
   where nome = '1.1.Apoio no fechamento contábil'
   limit 1;

  if v_fica is null or v_sai is null then
    raise notice 'unifica_apoio_no_fechamento_contabil: nada a fazer';
    return;
  end if;

  -- 1. Os vínculos com produto. A tabela tem unicidade em
  --    (produto_segmento_id, servico_prestado_id), então apagar a colisão ANTES
  --    do update é o que impede um 23505 no meio da migration. Hoje a linha que
  --    sai não tem vínculo nenhum, mas o arquivo roda em dois bancos e precisa
  --    sobreviver a um estado diferente do medido.
  delete from public.produto_servico d
   where d.servico_prestado_id = v_sai
     and exists (
       select 1 from public.produto_servico m
        where m.servico_prestado_id = v_fica
          and m.produto_segmento_id = d.produto_segmento_id
     );
  update public.produto_servico set servico_prestado_id = v_fica where servico_prestado_id = v_sai;

  -- 2. Os projetos -- o motivo de esta migration existir.
  update public.org_projects set servico_id = v_fica where servico_id = v_sai;
  get diagnostics v_projetos = row_count;

  -- 3. O resto das referências. Hoje zeradas nas duas linhas; ficam aqui porque
  --    uma referência esquecida vira erro de chave estrangeira no delete abaixo,
  --    e porque o banco continua andando entre a medição e a aplicação.
  update public.org_tasks      set servico_id = v_fica where servico_id = v_sai;
  update public.ordem_servico  set id_servico = v_fica where id_servico = v_sai;

  delete from public.project_servicos d
   where d.servico_id = v_sai
     and exists (
       select 1 from public.project_servicos m
        where m.servico_id = v_fica and m.project_id = d.project_id
     );
  update public.project_servicos set servico_id = v_fica where servico_id = v_sai;

  delete from public.area_servicos d
   where d.servico_id = v_sai
     and exists (
       select 1 from public.area_servicos m
        where m.servico_id = v_fica and m.estrutura_area_id = d.estrutura_area_id
     );
  update public.area_servicos set servico_id = v_fica where servico_id = v_sai;

  -- 4. Só agora a linha pode sair.
  delete from public.servicos_prestados where id = v_sai;

  raise notice 'unifica_apoio_no_fechamento_contabil: % projeto(s) remapeado(s), duplicata removida', v_projetos;
end $$;