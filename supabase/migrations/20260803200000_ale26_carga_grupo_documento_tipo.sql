-- ALE-26 · Carga da coluna `grupo` e fechamento do catálogo `documento_tipo`.
--
-- A EDU-19 (20260803120000) criou o tipo `osg_doc_grupo` e a coluna `grupo` nulável,
-- e deixou escrito que a carga e o NOT NULL entram aqui. É o que esta migration faz,
-- junto com o fechamento do catálogo que saiu da validação com a OSG e com o TAX.
--
-- Os 4 valores do enum são as 4 gavetas da área do cliente. Até aqui cada tela deduzia
-- a gaveta do seu jeito (uma pelo texto de `entidade`, outra pela `categoria`) e as duas
-- discordavam em 4 dos 58 itens. Daqui pra frente a gaveta é dado gravado.
--
-- Estado de partida conferido no banco em 03/08/2026, por consulta direta:
--   58 linhas · `grupo` preenchido em 0 delas · max(ordem) = 67
--   unique(codigo) · FKs -> documento_tipo: produto_documento_tipo ON DELETE CASCADE,
--   checklist_cliente_item ON DELETE SET NULL · nenhuma view e nenhuma função citam `grupo`.
--
-- O que muda: 3 linhas saem, 55 recebem grupo, 2 têm a nota reescrita,
-- 12 entram. Fica com 67 linhas, todas com grupo. Depois disso `grupo` vira NOT NULL.
--
-- Idempotente: os UPDATE casam por `codigo`, o INSERT tem ON CONFLICT (codigo) DO NOTHING
-- e o DELETE é por lista de `codigo`. Rodar duas vezes dá o mesmo resultado. O passo 0 e o
-- passo 5 são travas: se o banco não estiver no estado esperado, a migration aborta inteira
-- em vez de aplicar metade.
--
-- Reversão: não há volta automática. As 3 linhas apagadas e as 2 notas antigas não voltam
-- por rollback depois do COMMIT. Para soltar só o NOT NULL:
--   alter table public.documento_tipo alter column grupo drop not null;

BEGIN;

-- ── Passo 0 · trava de entrada ───────────────────────────────────────────────
-- Não confiar que o banco está como foi medido: conferir.
do $$
declare v_total int; v_com_grupo int;
begin
  select count(*), count(grupo) into v_total, v_com_grupo from public.documento_tipo;
  if v_total <> 58 then
    raise exception 'ALE-26 abortada: esperava 58 linhas em documento_tipo, encontrei %. O catálogo mudou depois de 03/08/2026 — reconferir a planilha antes de rodar.', v_total;
  end if;
  if v_com_grupo <> 0 then
    raise notice 'ALE-26: % linhas já tinham grupo. Os UPDATE abaixo sobrescrevem com o valor validado.', v_com_grupo;
  end if;
end $$;

-- ── Passo 1 · sai o que não é documento a pedir para o cliente ───────────────
-- Duas foram desmembradas em 29/07 e estão inativas desde então, sem vínculo e sem
-- referência de cliente:
--   RG / CNH                  -> virou `pessoa-fisica--rg` + `pessoa-fisica--cnh`
--   Balanço / Balancete / DRE -> virou as três linhas separadas
-- A terceira sai por decisão de escopo: a ECD é escrituração que o contador do cliente
-- entrega ao fisco, e o que a OSG precisa dela (balanço, balancete, DRE) já é pedido
-- item a item. Ela tem 3 vínculos de produto (CFI, DSS, ES) e 1 item de cliente:
-- os vínculos saem em cascata e o item de cliente fica, só perde o item_padrao_id (SET NULL).
delete from public.documento_tipo
 where codigo in ('pessoa-fisica--rg-cnh', 'pessoa-juridica--balanco-balancete-dre', 'pessoa-juridica--ecd');

-- ── Passo 2 · a gaveta de cada documento que fica ────────────────────────────
-- Valor validado item a item na planilha `documento_tipo_FINAL_carga_grupo.xlsx`.
-- Não é derivado de `entidade` nem de `categoria` — é a decisão de onde o documento
-- aparece para o cliente. Por isso vem escrito, e não calculado.
update public.documento_tipo d
   set grupo = v.grupo
  from (values
    ('bem--planilha-de-diagnostico-tributario-receitas-desp', 'outros'),
    ('bem--planilha-de-resultado-projetado-pf-e-pj', 'outros'),
    ('bem--projecao-de-investimentos-proximos-anos', 'outros'),
    ('bem--relatorio-de-bens-da-atividade-rural-aquisicao-e', 'outros'),
    ('bem--relatorio-de-dividas-da-atividade-rural', 'outros'),
    ('bem--relacao-de-bens-com-intencao-de-alienacao', 'bens_imoveis'),
    ('bem--relacao-de-areas-exploradas-por-imovel', 'bens_imoveis'),
    ('matricula-imovel-rural--car-cadastro-ambiental-rural', 'bens_imoveis'),
    ('matricula-imovel-rural--ccir', 'bens_imoveis'),
    ('bem--contrato-de-exploracao-rural-pre-existente', 'bens_imoveis'),
    ('matricula-imovel-rural--contrato-particular-de-compra-e-venda-ccv', 'bens_imoveis'),
    ('matricula-imovel-rural--documento-de-georreferenciamento-sigef', 'bens_imoveis'),
    ('matricula-imovel-rural--escritura-publica-de-compra-e-venda', 'bens_imoveis'),
    ('matricula-imovel-rural--itr', 'bens_imoveis'),
    ('bem--laudo-de-avaliacao-de-valor-de-mercado', 'bens_imoveis'),
    ('matricula-imovel-rural--matricula-anterior-remissao', 'bens_imoveis'),
    ('matricula-imovel-rural--matricula-do-imovel-inteiro-teor', 'bens_imoveis'),
    ('bem--passivos-riscos-ambientais-informacao', 'bens_imoveis'),
    ('bem--contrato-de-locacao-de-imovel-urbano', 'bens_imoveis'),
    ('matricula-imovel-urbano--contrato-particular-de-compra-e-venda-ccv', 'bens_imoveis'),
    ('matricula-imovel-urbano--escritura-publica-de-compra-e-venda', 'bens_imoveis'),
    ('matricula-imovel-urbano--iptu-inscricao-municipal', 'bens_imoveis'),
    ('matricula-imovel-urbano--matricula-do-imovel-inteiro-teor', 'bens_imoveis'),
    ('pessoa-fisica--cnh', 'pf'),
    ('pessoa-fisica--cpf', 'pf'),
    ('pessoa-fisica--certidao-de-casamento-uniao-estavel', 'pf'),
    ('pessoa-fisica--certidao-de-nascimento', 'pf'),
    ('pessoa-fisica--comprovante-de-endereco', 'pf'),
    ('pessoa-fisica--contrato-de-doacao', 'pf'),
    ('pessoa-fisica--dirpf-exercicios-anteriores', 'pf'),
    ('pessoa-fisica--dirpf-ultimo-exercicio', 'pf'),
    ('pessoa-fisica--gia-dar-de-itcmd-itcd', 'pf'),
    ('pessoa-fisica--guia-comprovante-de-recolhimento-do-itcmd', 'pf'),
    ('bem--livro-caixa-do-produtor-rural', 'pf'),
    ('pessoa-fisica--organograma-composicao-familiar', 'pf'),
    ('pessoa-fisica--pacto-antenupcial', 'pf'),
    ('pessoa-fisica--rg', 'pf'),
    ('pessoa-fisica--testamento', 'pf'),
    ('pessoa-juridica--balancete', 'pj'),
    ('pessoa-juridica--balanco', 'pj'),
    ('pessoa-juridica--boletins-de-subscricao-e-laudos-de-avaliacao', 'pj'),
    ('pessoa-juridica--cnpj-situacao-cadastral-e-regime-tributario', 'pj'),
    ('pessoa-juridica--contrato-de-compra-e-venda-de-quotas-acoes', 'pj'),
    ('pessoa-juridica--contrato-social-e-alteracoes', 'pj'),
    ('pessoa-juridica--dre', 'pj'),
    ('pessoa-juridica--declaracao-de-inexistencia-de-simples-nacional', 'pj'),
    ('pessoa-juridica--deliberacao-comprovante-de-aporte-em-moeda', 'pj'),
    ('pessoa-juridica--documentos-de-afac-mutuo', 'pj'),
    ('pessoa-juridica--informacao-de-percentual-de-participacao-do-grup', 'pj'),
    ('pessoa-juridica--instrumento-de-cessao-de-quotas-acoes', 'pj'),
    ('pessoa-juridica--laudo-simulacao-de-valor-das-quotas', 'pj'),
    ('pessoa-juridica--livros-societarios', 'pj'),
    ('pessoa-juridica--matriz-de-alcadas-existente', 'pj'),
    ('pessoa-juridica--organograma-societario-do-grupo', 'pj'),
    ('pessoa-juridica--protocolo-acordo-societario-ou-familiar', 'pj')
  ) as v(codigo, grupo)
 where d.codigo = v.codigo
   and (d.grupo is distinct from v.grupo::public.osg_doc_grupo);

-- ── Passo 3 · duas notas reescritas ─────────────────────────────────────────
-- `nota` é texto que o cliente lê. As duas estavam incompletas do ponto de vista dele:
-- a planilha de diagnóstico não dizia que a PSA manda o modelo, e o livro-caixa não
-- dizia que o arquivo do LCDPR serve.
update public.documento_tipo
   set nota = 'Planilha de receitas e despesas da atividade rural por ano-calendário e cultura, conforme modelo fornecido pela PSA. Necessária quando o trabalho inclui planejamento tributário rural.'
 where codigo = 'bem--planilha-de-diagnostico-tributario-receitas-desp';

update public.documento_tipo
   set nota = 'Livro-caixa do produtor rural, na escrituração ou no arquivo digital do LCDPR (.txt ou Excel), dos dois últimos anos-calendário. Necessário quando o trabalho inclui planejamento tributário rural.'
 where codigo = 'bem--livro-caixa-do-produtor-rural';

-- ── Passo 4 · os documentos que faltavam ────────────────────────────────────
-- Seis de cooperativa e governança (validados na 4ª reunião), quatro de estruturação
-- e migração PF x PJ (validados com a Monica e conferidos contra o papel de trabalho
-- do TAX) e dois cadastros fiscais que o catálogo não tinha.
--
-- `categoria_docbox` usa só rótulo que já existe no DocBox: a classificação de lá é
-- imutável e não se inventa rótulo novo por causa do OSG Work.
--
-- `codigo` segue a regra do gerador (scripts/build_checklist.py): slug(entidade) +
-- '--' + slug(documento), truncado em 48. Assim uma regeração futura do seed casa por
-- codigo em vez de inserir a linha de novo com outro nome.
--
-- Nenhum deles nasce vinculado a produto: o vínculo é a carga seguinte
-- (produto_documento_tipo). Até lá eles existem no catálogo e o analista adiciona à mão.
insert into public.documento_tipo
  (codigo, modulo, entidade, documento, nota, categoria, categoria_docbox,
   confidencial, obrigatorio_default, granularidade, ordem, grupo, ativo)
values
  -- Estatuto Social (cooperativa)
  ('pessoa-juridica--estatuto-social-cooperativa', 'Qualificação das Partes', 'Pessoa Jurídica', 'Estatuto Social (cooperativa)',
   'Estatuto social atualizado da cooperativa.',
   'societarios'::public.osg_doc_categoria, 'Documentos Societários',
   false, false, 'pessoa_pj',
   68, 'pj'::public.osg_doc_grupo, true),
  -- Atas de Assembleias (cooperativa)
  ('pessoa-juridica--atas-de-assembleias-cooperativa', 'Qualificação das Partes', 'Pessoa Jurídica', 'Atas de Assembleias (cooperativa)',
   'Atas de assembleia ordinária e extraordinária dos últimos três anos, com a lista de presença.',
   'societarios'::public.osg_doc_categoria, 'Documentos Societários',
   false, false, 'pessoa_pj',
   69, 'pj'::public.osg_doc_grupo, true),
  -- Editais de Convocação (cooperativa)
  ('pessoa-juridica--editais-de-convocacao-cooperativa', 'Qualificação das Partes', 'Pessoa Jurídica', 'Editais de Convocação (cooperativa)',
   'Editais de convocação das assembleias realizadas.',
   'societarios'::public.osg_doc_categoria, 'Documentos Societários',
   false, false, 'pessoa_pj',
   70, 'pj'::public.osg_doc_grupo, true),
  -- Regimentos, políticas e regulamentos (cooperativa)
  ('pessoa-juridica--regimentos-politicas-e-regulamentos-cooperativa', 'Quadro Societário', 'Pessoa Jurídica', 'Regimentos, políticas e regulamentos (cooperativa)',
   'Regimento interno, política de governança, regulamentos internos, lista de cooperados e acordos com centrais ou federações, quando houver.',
   'societarios'::public.osg_doc_categoria, 'Documentos de Governança',
   false, false, 'pessoa_pj',
   71, 'pj'::public.osg_doc_grupo, true),
  -- Controle de sobras e perdas e sua destinação (cooperativa)
  ('pessoa-juridica--controle-de-sobras-e-perdas-e-sua-destinacao-coo', 'Quadro Societário', 'Pessoa Jurídica', 'Controle de sobras e perdas e sua destinação (cooperativa)',
   'Controle das sobras e perdas do exercício e a respectiva destinação.',
   'societarios'::public.osg_doc_categoria, 'Documentos de Governança',
   false, false, 'pessoa_pj',
   72, 'pj'::public.osg_doc_grupo, true),
  -- Diagnóstico de outras consultorias
  ('pessoa-juridica--diagnostico-de-outras-consultorias', 'Quadro Societário', 'Pessoa Jurídica', 'Diagnóstico de outras consultorias',
   'Diagnósticos sucessórios, societários e/ou de governança eventualmente realizados por outras consultorias ou profissionais.',
   'societarios'::public.osg_doc_categoria, 'Documentos de Governança',
   false, false, 'pessoa_pj',
   73, 'pj'::public.osg_doc_grupo, true),
  -- Inscrição municipal e alvará
  ('pessoa-juridica--inscricao-municipal-e-alvara', 'Diagnóstico Patrimonial', 'Pessoa Jurídica', 'Inscrição municipal e alvará',
   'Inscrição municipal e alvará de funcionamento das PJ do grupo.',
   'cadastros_fiscais'::public.osg_doc_categoria, 'Documentos Fiscais',
   false, false, 'pessoa_pj',
   74, 'pj'::public.osg_doc_grupo, true),
  -- Inscrição estadual (SEFAZ)
  ('matricula-imovel-rural--inscricao-estadual-sefaz', 'Diagnóstico Patrimonial', 'Matrícula (Imóvel Rural)', 'Inscrição estadual (SEFAZ)',
   'Inscrição estadual do imóvel rural junto à SEFAZ, por produtor.',
   'cadastros_fiscais'::public.osg_doc_categoria, 'Documentos Fiscais',
   false, false, 'matricula_rural',
   75, 'bens_imoveis'::public.osg_doc_grupo, true),
  -- NF de insumos e serviços de preparo do solo
  ('matricula-imovel-rural--nf-de-insumos-e-servicos-de-preparo-do-solo', 'Diagnóstico Patrimonial', 'Matrícula (Imóvel Rural)', 'NF de insumos e serviços de preparo do solo',
   'Notas fiscais dos insumos e dos serviços de preparo do solo da área, quando a parceria usar a cota de 25%.',
   'agrarios'::public.osg_doc_categoria, 'Documentos da Atividade Rural',
   false, false, 'matricula_rural',
   76, 'bens_imoveis'::public.osg_doc_grupo, true),
  -- Planilha dos bens imóveis do grupo
  ('cliente--planilha-dos-bens-imoveis-do-grupo', 'Diagnóstico Patrimonial', 'Cliente', 'Planilha dos bens imóveis do grupo',
   'Planilha, conforme modelo enviado pela PSA, com os bens imóveis considerados do grupo.',
   'bens_direitos'::public.osg_doc_categoria, 'Documentos dos Bens Imóveis',
   false, false, 'cliente',
   77, 'bens_imoveis'::public.osg_doc_grupo, true),
  -- NF dos bens móveis e veículos transferidos
  ('cliente--nf-dos-bens-moveis-e-veiculos-transferidos', 'Diagnóstico Patrimonial', 'Cliente', 'NF dos bens móveis e veículos transferidos',
   'Notas fiscais dos bens móveis e dos veículos transferidos entre as pessoas do grupo.',
   'bens_direitos'::public.osg_doc_categoria, 'Documentos dos Bens Imóveis',
   false, false, 'cliente',
   78, 'outros'::public.osg_doc_grupo, true),
  -- DIRPF do ano da operação
  ('pessoa-fisica--dirpf-do-ano-da-operacao', 'Qualificação das Partes', 'Pessoa Física', 'DIRPF do ano da operação',
   'Declaração do ano da operação, com a baixa dos bens transferidos e a inclusão das quotas; e o GCAP/DARF, se a transferência foi a valor de mercado.',
   'declaracao_ir'::public.osg_doc_categoria, 'DIRPF',
   false, false, 'pessoa_pf',
   79, 'pf'::public.osg_doc_grupo, true)
on conflict (codigo) do nothing;

-- ── Passo 5 · trava de saída, e só então o NOT NULL ─────────────────────────
-- O NOT NULL é o ponto sem volta: se sobrar uma linha sem grupo ele falha e derruba
-- a transação inteira. A checagem antes dele existe para a mensagem de erro dizer
-- qual linha ficou de fora, em vez de só 'violates not-null constraint'.
do $$
declare v_total int; v_sem_grupo int; v_faltando text;
begin
  select count(*), count(*) filter (where grupo is null) into v_total, v_sem_grupo
    from public.documento_tipo;
  if v_sem_grupo > 0 then
    select string_agg(codigo, ', ' order by codigo) into v_faltando
      from public.documento_tipo where grupo is null;
    raise exception 'ALE-26 abortada: % linha(s) sem grupo -> %', v_sem_grupo, v_faltando;
  end if;
  if v_total <> 67 then
    raise exception 'ALE-26 abortada: esperava 67 linhas no fim, encontrei %.', v_total;
  end if;
  raise notice 'ALE-26 ok: % linhas, todas com grupo.', v_total;
end $$;

alter table public.documento_tipo
  alter column grupo set not null;

comment on column public.documento_tipo.grupo is
  'Gaveta da área do cliente em que o documento aparece (pf, pj, bens_imoveis, outros). Dado gravado e obrigatório desde a ALE-26: não inferir de entidade nem de categoria.';

COMMIT;

-- ── Conferência depois de rodar ─────────────────────────────────────────────
-- select grupo, count(*) from public.documento_tipo group by grupo order by grupo;
--   esperado: pf 16 · pj 24 · bens_imoveis 21 · outros 6
-- select count(*) from public.produto_documento_tipo;   -- 260 - 3 (ECD) = 257
-- select count(*) from public.documento_tipo where ativo;   -- 67
