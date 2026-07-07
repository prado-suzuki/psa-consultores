-- OSG · Checklist de documentos por cliente.
--   checklist_item_padrao  = catálogo editável (o "modelo" dos 63 tipos).
--   checklist_cliente_item = o que CADA cliente de fato deve: obrigatórios copiados do
--                            padrão + condicionais adicionados à mão + status, por
--                            INSTÂNCIA (pessoa/bem/matrícula).
--   documento_arquivo.checklist_item_id = liga o arquivo recebido ao item que ele
--                            satisfaz (mata o casamento por categoria).
-- Campos/FKs validados contra o schema vivo (cliente, pessoa, bem, matricula, documento_arquivo).
BEGIN;

-- enums (CREATE TYPE não tem IF NOT EXISTS → guard)
do $$ begin
  if not exists (select 1 from pg_type where typname = 'osg_checklist_origem') then
    create type public.osg_checklist_origem as enum ('padrao', 'manual');
  end if;
  if not exists (select 1 from pg_type where typname = 'osg_checklist_status') then
    create type public.osg_checklist_status as enum ('pendente', 'recebido', 'dispensado', 'nao_aplicavel');
  end if;
end $$;

-- ───────────────────────── catálogo padrão (global; a OSG edita aqui) ─────────────────────────
create table if not exists public.checklist_item_padrao (
  id                  uuid primary key default gen_random_uuid(),
  codigo              text not null unique,
  modulo              text not null,
  entidade            text not null,
  documento           text not null,
  nota                text,
  categoria           public.osg_doc_categoria,
  categoria_docbox    text,
  confidencial        boolean not null default false,
  obrigatorio_default boolean not null default false,
  granularidade       text not null default 'cliente',
  ordem               integer not null default 0,
  ativo               boolean not null default true,
  created_at          timestamptz not null default now(),
  created_by          uuid default auth.uid(),
  updated_at          timestamptz not null default now(),
  updated_by          uuid default auth.uid()
);

-- ───────────────────── itens por cliente (padrão copiado + condicionais manuais) ─────────────────────
create table if not exists public.checklist_cliente_item (
  id                  uuid primary key default gen_random_uuid(),
  cliente_id          uuid not null references public.cliente(id) on delete cascade,
  item_padrao_id      uuid references public.checklist_item_padrao(id) on delete set null,
  modulo              text not null,
  entidade            text not null,
  documento           text not null,
  nota                text,
  categoria           public.osg_doc_categoria,
  categoria_docbox    text,
  confidencial        boolean not null default false,
  obrigatorio         boolean not null default false,
  origem              public.osg_checklist_origem not null default 'padrao',
  status              public.osg_checklist_status  not null default 'pendente',
  pessoa_id           uuid references public.pessoa(id)    on delete cascade,
  bem_id              uuid references public.bem(id)       on delete cascade,
  matricula_id        uuid references public.matricula(id) on delete cascade,
  observacao          text,
  created_at          timestamptz not null default now(),
  created_by          uuid default auth.uid(),
  updated_at          timestamptz not null default now(),
  updated_by          uuid default auth.uid()
);

create index if not exists idx_chk_cli_cliente   on public.checklist_cliente_item (cliente_id);
create index if not exists idx_chk_cli_padrao    on public.checklist_cliente_item (item_padrao_id);
create index if not exists idx_chk_cli_pessoa    on public.checklist_cliente_item (pessoa_id);
create index if not exists idx_chk_cli_bem       on public.checklist_cliente_item (bem_id);
create index if not exists idx_chk_cli_matricula on public.checklist_cliente_item (matricula_id);

-- liga o arquivo recebido ao item que ele satisfaz
alter table public.documento_arquivo
  add column if not exists checklist_item_id uuid
  references public.checklist_cliente_item(id) on delete set null;
create index if not exists idx_doc_arq_checklist_item
  on public.documento_arquivo (checklist_item_id) where excluido = false;

-- updated_at automático
create or replace function public.checklist_touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_chk_padrao_updated_at on public.checklist_item_padrao;
create trigger trg_chk_padrao_updated_at
  before update on public.checklist_item_padrao
  for each row execute function public.checklist_touch_updated_at();

drop trigger if exists trg_chk_cli_updated_at on public.checklist_cliente_item;
create trigger trg_chk_cli_updated_at
  before update on public.checklist_cliente_item
  for each row execute function public.checklist_touch_updated_at();

-- ───────────────────────────────────── RLS ─────────────────────────────────────
alter table public.checklist_item_padrao  enable row level security;
alter table public.checklist_cliente_item enable row level security;

drop policy if exists "team_member+ can view checklist_item_padrao" on public.checklist_item_padrao;
create policy "team_member+ can view checklist_item_padrao" on public.checklist_item_padrao
  for select to authenticated
  using (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

drop policy if exists "team_member+ can write checklist_item_padrao" on public.checklist_item_padrao;
create policy "team_member+ can write checklist_item_padrao" on public.checklist_item_padrao
  for all to authenticated
  using (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  with check (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

drop policy if exists "cluster can view checklist_cliente_item" on public.checklist_cliente_item;
create policy "cluster can view checklist_cliente_item" on public.checklist_cliente_item
  for select to authenticated
  using (public.cliente_visivel_para(cliente_id));

drop policy if exists "cluster team_member can insert checklist_cliente_item" on public.checklist_cliente_item;
create policy "cluster team_member can insert checklist_cliente_item" on public.checklist_cliente_item
  for insert to authenticated
  with check (public.has_role_or_higher(auth.uid(), 'team_member'::app_role) and public.cliente_visivel_para(cliente_id));

drop policy if exists "cluster team_member can update checklist_cliente_item" on public.checklist_cliente_item;
create policy "cluster team_member can update checklist_cliente_item" on public.checklist_cliente_item
  for update to authenticated
  using (public.has_role_or_higher(auth.uid(), 'team_member'::app_role) and public.cliente_visivel_para(cliente_id))
  with check (public.has_role_or_higher(auth.uid(), 'team_member'::app_role) and public.cliente_visivel_para(cliente_id));

drop policy if exists "cluster team_member can delete checklist_cliente_item" on public.checklist_cliente_item;
create policy "cluster team_member can delete checklist_cliente_item" on public.checklist_cliente_item
  for delete to authenticated
  using (public.has_role_or_higher(auth.uid(), 'team_member'::app_role) and public.cliente_visivel_para(cliente_id));

COMMIT;

BEGIN;
INSERT INTO public.checklist_item_padrao
  (codigo, modulo, entidade, documento, nota, categoria, categoria_docbox, confidencial, obrigatorio_default, granularidade, ordem)
VALUES
  ('pessoa-fisica--comprovante-de-endereco', 'Qualificação das Partes', 'Pessoa Física', 'Comprovante de endereço', 'Atualizado e completo (rua, nº, bairro, cidade, estado, CEP) dos fundadores, sócios, herdeiros e cônjuges/companheiros(as).', 'pessoais'::public.osg_doc_categoria, 'Documentos Pessoais', false, true, 'pessoa_pf', 1),
  ('pessoa-fisica--cpf', 'Qualificação das Partes', 'Pessoa Física', 'CPF', 'Dos fundadores, sócios, herdeiros e respectivos cônjuges/companheiros(as).', 'pessoais'::public.osg_doc_categoria, 'Documentos Pessoais', false, true, 'pessoa_pf', 2),
  ('pessoa-fisica--dirpf-ultimo-exercicio', 'Qualificação das Partes', 'Pessoa Física', 'DIRPF – Último Exercício', 'Declaração entregue referente ao último ano-calendário, de todos os envolvidos (fundadores, sócios e herdeiros).', 'declaracao_ir'::public.osg_doc_categoria, 'DIRPF', false, true, 'pessoa_pf', 3),
  ('pessoa-fisica--rg-cnh', 'Qualificação das Partes', 'Pessoa Física', 'RG / CNH', 'Identidade Civil com órgão expedidor, dos fundadores, sócios, herdeiros e respectivos cônjuges/companheiros(as).', 'pessoais'::public.osg_doc_categoria, 'Documentos Pessoais', false, true, 'pessoa_pf', 4),
  ('pessoa-fisica--certidao-de-casamento-uniao-estavel', 'Qualificação das Partes', 'Pessoa Física', 'Certidão de casamento / união estável', 'Se casado ou em união estável (informar a data inicial da união).', 'pessoais'::public.osg_doc_categoria, 'Documentos Pessoais', false, false, 'pessoa_pf', 5),
  ('pessoa-fisica--certidao-de-nascimento', 'Qualificação das Partes', 'Pessoa Física', 'Certidão de nascimento', 'Se solteiro ou menor de idade.', 'pessoais'::public.osg_doc_categoria, 'Documentos Pessoais', false, false, 'pessoa_pf', 6),
  ('pessoa-fisica--contrato-de-doacao', 'Qualificação das Partes', 'Pessoa Física', 'Contrato de doação', 'Eventuais contratos de doação realizados a favor ou pelos fundadores, sócios e/ou herdeiros (pré-existentes).', 'sucessorios'::public.osg_doc_categoria, 'Documentos Sucessórios', true, false, 'pessoa_pf', 7),
  ('pessoa-fisica--dirpf-exercicios-anteriores', 'Qualificação das Partes', 'Pessoa Física', 'DIRPF – Exercícios Anteriores', 'Dos anos-calendário anteriores àqueles em que bens imóveis e/ou quotas foram integralizados em outras empresas.', 'declaracao_ir'::public.osg_doc_categoria, 'DIRPF', false, false, 'pessoa_pf', 8),
  ('pessoa-fisica--gia-dar-de-itcmd-itcd', 'Qualificação das Partes', 'Pessoa Física', 'GIA / DAR de ITCMD/ITCD', 'Declaração/apuração do imposto (distinta do comprovante de pagamento), quando houver doação/transmissão.', 'sucessorios'::public.osg_doc_categoria, 'Documentos Sucessórios', false, false, 'pessoa_pf', 9),
  ('pessoa-fisica--guia-comprovante-de-recolhimento-do-itcmd', 'Qualificação das Partes', 'Pessoa Física', 'Guia / comprovante de recolhimento do ITCMD', 'Quando houver doação/transmissão.', 'sucessorios'::public.osg_doc_categoria, 'Documentos Sucessórios', false, false, 'pessoa_pf', 10),
  ('pessoa-fisica--organograma-composicao-familiar', 'Qualificação das Partes', 'Pessoa Física', 'Organograma / composição familiar', 'Nomes e grau de parentesco de fundadores, sócios, herdeiros e respectivos cônjuges/companheiros(as). Base da legítima × disponível na sucessão.', 'pessoais'::public.osg_doc_categoria, 'Documentos Pessoais', false, false, 'pessoa_pf', 11),
  ('pessoa-fisica--pacto-antenupcial', 'Qualificação das Partes', 'Pessoa Física', 'Pacto antenupcial', 'Se existente / regime diverso da comunhão parcial.', 'pessoais'::public.osg_doc_categoria, 'Documentos Pessoais', false, false, 'pessoa_pf', 12),
  ('pessoa-fisica--testamento', 'Qualificação das Partes', 'Pessoa Física', 'Testamento', 'Eventuais testamentos realizados a favor ou pelos fundadores, sócios e/ou herdeiros (pré-existentes).', 'sucessorios'::public.osg_doc_categoria, 'Documentos Sucessórios', true, false, 'pessoa_pf', 13),
  ('pessoa-juridica--balanco-balancete-dre', 'Qualificação das Partes', 'Pessoa Jurídica', 'Balanço / Balancete / DRE', 'Dos três últimos exercícios, ainda que não registrados, e último balancete do ano-calendário vigente.', 'societarios'::public.osg_doc_categoria, 'Documentos Societários', false, true, 'pessoa_pj', 14),
  ('pessoa-juridica--cnpj-situacao-cadastral-e-regime-tributario', 'Qualificação das Partes', 'Pessoa Jurídica', 'CNPJ (situação cadastral e regime tributário)', 'Atualizado, das PJ do Grupo, indicando o regime tributário adotado.', 'societarios'::public.osg_doc_categoria, 'Documentos Societários', false, true, 'pessoa_pj', 15),
  ('pessoa-juridica--contrato-social-e-alteracoes', 'Qualificação das Partes', 'Pessoa Jurídica', 'Contrato social e alterações', 'De constituição e todas as alterações posteriores (incluindo S.A.), das empresas do Grupo ou relacionadas, ainda que em nome de PF, PJ ou de terceiros.', 'societarios'::public.osg_doc_categoria, 'Documentos Societários', false, true, 'pessoa_pj', 16),
  ('pessoa-juridica--declaracao-de-inexistencia-de-simples-nacional', 'Qualificação das Partes', 'Pessoa Jurídica', 'Declaração de inexistência de Simples Nacional', 'Firmada por representante do Grupo. Caso existam, encaminhar contratos sociais e balanços dessas PJ. (DocBox OSG-Societários — não constava no modelo de Memorando de 2019.)', 'societarios'::public.osg_doc_categoria, 'Documentos Societários', false, true, 'pessoa_pj', 17),
  ('pessoa-juridica--boletins-de-subscricao-e-laudos-de-avaliacao', 'Qualificação das Partes', 'Pessoa Jurídica', 'Boletins de subscrição e laudos de avaliação', 'Em caso de sociedades anônimas (inclui livro de ações e transferências).', 'societarios'::public.osg_doc_categoria, 'Documentos Societários', false, false, 'pessoa_pj', 18),
  ('pessoa-juridica--contrato-de-compra-e-venda-de-quotas-acoes', 'Qualificação das Partes', 'Pessoa Jurídica', 'Contrato de compra e venda de quotas/ações', 'Firmados entre sócios atuais ou com terceiros (incluindo sócios antigos).', 'societarios'::public.osg_doc_categoria, 'Documentos Societários', false, false, 'pessoa_pj', 19),
  ('pessoa-juridica--deliberacao-comprovante-de-aporte-em-moeda', 'Qualificação das Partes', 'Pessoa Jurídica', 'Deliberação / comprovante de aporte em moeda', 'Só se o aumento de capital for por aporte em moeda (insumo da Planilha de Capital Social — consta no PDF de validação; NÃO no Memorando nem na solicitação DocBox).', 'societarios'::public.osg_doc_categoria, 'Documentos Societários', false, false, 'pessoa_pj', 20),
  ('pessoa-juridica--documentos-de-afac-mutuo', 'Qualificação das Partes', 'Pessoa Jurídica', 'Documentos de AFAC / mútuo', 'Só se houver conversão de AFAC/mútuo em capital (insumo da Planilha de Capital Social — consta no PDF de validação; NÃO no Memorando nem na solicitação DocBox).', 'societarios'::public.osg_doc_categoria, 'Documentos Societários', false, false, 'pessoa_pj', 21),
  ('pessoa-juridica--informacao-de-percentual-de-participacao-do-grup', 'Qualificação das Partes', 'Pessoa Jurídica', 'Informação de percentual de participação do grupo', 'Percentual de participação dos membros do grupo, devidamente reconhecido, independentemente de outros atos societários.', 'societarios'::public.osg_doc_categoria, 'Documentos Societários', false, false, 'pessoa_pj', 22),
  ('pessoa-juridica--instrumento-de-cessao-de-quotas-acoes', 'Qualificação das Partes', 'Pessoa Jurídica', 'Instrumento de cessão de quotas/ações', 'Eventuais cessões (gratuitas ou onerosas).', 'societarios'::public.osg_doc_categoria, 'Documentos Societários', false, false, 'pessoa_pj', 23),
  ('pessoa-juridica--livros-societarios', 'Qualificação das Partes', 'Pessoa Jurídica', 'Livros societários', 'Conforme o tipo societário: ações nominativas, transferências, debêntures, partes beneficiárias, administração, presença e registro de assembleias/reuniões (termo de abertura/encerramento e páginas preenchidas).', 'societarios'::public.osg_doc_categoria, 'Documentos Societários', false, false, 'pessoa_pj', 24),
  ('pessoa-juridica--protocolo-acordo-societario-ou-familiar', 'Qualificação das Partes', 'Pessoa Jurídica', 'Protocolo/acordo societário ou familiar', 'De qualquer natureza, ainda que não formalizados na Junta Comercial ou Cartório.', 'societarios'::public.osg_doc_categoria, 'Documentos Societários', false, false, 'pessoa_pj', 25),
  ('matricula-imovel-rural--ccir', 'Diagnóstico Patrimonial', 'Matrícula (Imóvel Rural)', 'CCIR', 'Atualizado, para levantamento do número de cadastro do imóvel rural.', 'cadastros_fiscais'::public.osg_doc_categoria, 'Documentos Fiscais', false, true, 'matricula_rural', 26),
  ('matricula-imovel-rural--itr', 'Diagnóstico Patrimonial', 'Matrícula (Imóvel Rural)', 'ITR', 'Atualizado dos imóveis rurais. (Obrigatório pelo DocBox atual OSG-Fiscais; o modelo de Memorando de 2019 pedia só CCIR+IPTU — DocBox prevalece.)', 'cadastros_fiscais'::public.osg_doc_categoria, 'Documentos Fiscais', false, true, 'matricula_rural', 27),
  ('matricula-imovel-rural--matricula-do-imovel-inteiro-teor', 'Diagnóstico Patrimonial', 'Matrícula (Imóvel Rural)', 'Matrícula do imóvel (inteiro teor)', 'Certidão de Inteiro Teor atualizada dos imóveis rurais, em nome das PF ou de terceiros, e também das PJ.', 'bens_direitos'::public.osg_doc_categoria, 'Documentos dos Bens Imóveis', false, true, 'matricula_rural', 28),
  ('matricula-imovel-rural--car-cadastro-ambiental-rural', 'Diagnóstico Patrimonial', 'Matrícula (Imóvel Rural)', 'CAR (Cadastro Ambiental Rural)', 'Quando usado no acervo do cliente (a validar com a OSG — não consta no Modelo Docbox/memorando padrão).', 'bens_direitos'::public.osg_doc_categoria, 'Documentos dos Bens Imóveis', false, false, 'matricula_rural', 29),
  ('matricula-imovel-rural--contrato-particular-de-compra-e-venda-ccv', 'Diagnóstico Patrimonial', 'Matrícula (Imóvel Rural)', 'Contrato particular de compra e venda (CCV)', 'Imóvel não quitado e/ou transferência não registrada à margem da matrícula (inclusive em nome de terceiros).', 'bens_direitos'::public.osg_doc_categoria, 'Documentos dos Bens Imóveis', false, false, 'matricula_rural', 30),
  ('matricula-imovel-rural--documento-de-georreferenciamento-sigef', 'Diagnóstico Patrimonial', 'Matrícula (Imóvel Rural)', 'Documento de georreferenciamento (SIGEF)', 'Se o imóvel for georreferenciado.', 'bens_direitos'::public.osg_doc_categoria, 'Documentos dos Bens Imóveis', false, false, 'matricula_rural', 31),
  ('matricula-imovel-rural--escritura-publica-de-compra-e-venda', 'Diagnóstico Patrimonial', 'Matrícula (Imóvel Rural)', 'Escritura pública de compra e venda', 'Imóvel não quitado e/ou transferência não registrada à margem da matrícula (inclusive em nome de terceiros).', 'bens_direitos'::public.osg_doc_categoria, 'Documentos dos Bens Imóveis', false, false, 'matricula_rural', 32),
  ('matricula-imovel-rural--matricula-anterior-remissao', 'Diagnóstico Patrimonial', 'Matrícula (Imóvel Rural)', 'Matrícula anterior (remissão)', 'Quando a matrícula atual faz remissão à matrícula-mãe/anterior.', 'bens_direitos'::public.osg_doc_categoria, 'Documentos dos Bens Imóveis', false, false, 'matricula_rural', 33),
  ('matricula-imovel-urbano--iptu-inscricao-municipal', 'Diagnóstico Patrimonial', 'Matrícula (Imóvel Urbano)', 'IPTU / Inscrição Municipal', 'Carnê/título do último exercício, para levantamento do número de cadastro do imóvel urbano.', 'cadastros_fiscais'::public.osg_doc_categoria, 'Documentos Fiscais', false, true, 'matricula_urbana', 34),
  ('matricula-imovel-urbano--matricula-do-imovel-inteiro-teor', 'Diagnóstico Patrimonial', 'Matrícula (Imóvel Urbano)', 'Matrícula do imóvel (inteiro teor)', 'Certidão de Inteiro Teor atualizada dos imóveis urbanos, em nome das PF ou de terceiros, e também das PJ.', 'bens_direitos'::public.osg_doc_categoria, 'Documentos dos Bens Imóveis', false, true, 'matricula_urbana', 35),
  ('matricula-imovel-urbano--contrato-particular-de-compra-e-venda-ccv', 'Diagnóstico Patrimonial', 'Matrícula (Imóvel Urbano)', 'Contrato particular de compra e venda (CCV)', 'Imóvel urbano não quitado e/ou transferência não registrada à margem da matrícula.', 'bens_direitos'::public.osg_doc_categoria, 'Documentos dos Bens Imóveis', false, false, 'matricula_urbana', 36),
  ('matricula-imovel-urbano--escritura-publica-de-compra-e-venda', 'Diagnóstico Patrimonial', 'Matrícula (Imóvel Urbano)', 'Escritura pública de compra e venda', 'Imóvel urbano não quitado e/ou transferência não registrada à margem da matrícula.', 'bens_direitos'::public.osg_doc_categoria, 'Documentos dos Bens Imóveis', false, false, 'matricula_urbana', 37),
  ('bem--relacao-de-areas-exploradas-por-imovel', 'Diagnóstico Patrimonial', 'Bem', 'Relação de áreas exploradas por imóvel', 'Rol dos imóveis explorados (próprios × de terceiros) com área total e explorada por unidade produtora — Memorando item 8 / DocBox OSG-Atividade Rural. Obrigatório quando há atividade rural.', 'agrarios'::public.osg_doc_categoria, 'Documentos da Atividade Rural', false, true, 'cliente', 38),
  ('bem--contrato-de-exploracao-rural-pre-existente', 'Diagnóstico Patrimonial', 'Bem', 'Contrato de exploração rural pré-existente', 'Arrendamento, parceria, composse, comodato e/ou condomínio das unidades produtoras, devidamente assinados/reconhecidos.', 'agrarios'::public.osg_doc_categoria, 'Documentos da Atividade Rural', false, false, 'cliente', 39),
  ('bem--contrato-de-locacao-de-imovel-urbano', 'Diagnóstico Patrimonial', 'Bem', 'Contrato de locação de imóvel urbano', 'Imóveis urbanos do grupo cedidos a terceiros e/ou PF/PJ, devidamente assinados.', 'outros'::public.osg_doc_categoria, 'Documentos de Locação', false, false, 'cliente', 40),
  ('bem--informacoes-contabeis-das-pjs-envolvidas', 'Diagnóstico Patrimonial', 'Bem', 'Informações contábeis das PJs envolvidas', 'Dados contábeis das PJs (ECD/DRE e demais), quando aplicável ao planejamento tributário.', 'outros'::public.osg_doc_categoria, 'Documentos do Planejamento Tributário', false, false, 'cliente', 41),
  ('bem--laudo-de-avaliacao-de-valor-de-mercado', 'Diagnóstico Patrimonial', 'Bem', 'Laudo de avaliação de valor de mercado', 'Quando o estudo utilizar valor de mercado dos bens.', 'bens_direitos'::public.osg_doc_categoria, 'Documentos dos Bens Imóveis', false, false, 'cliente', 42),
  ('bem--livro-caixa-do-produtor-rural', 'Diagnóstico Patrimonial', 'Bem', 'Livro-caixa do Produtor Rural', 'CONDICIONAL — insumo do Planejamento Tributário Rural (fase TAX); NÃO é pedido no Memorando inicial da OSG. Só quando o escopo inclui planejamento tributário rural.', 'outros'::public.osg_doc_categoria, 'Documentos do Planejamento Tributário', false, false, 'cliente', 43),
  ('bem--passivos-riscos-ambientais-informacao', 'Diagnóstico Patrimonial', 'Bem', 'Passivos / riscos ambientais (informação)', 'Processos de regularização agrária/ambiental, processos que impeçam transferência, ou imóvel em área de moratória da soja (após 2008).', 'bens_direitos'::public.osg_doc_categoria, 'Documentos dos Bens Imóveis', false, false, 'cliente', 44),
  ('bem--planilha-de-diagnostico-tributario-receitas-desp', 'Diagnóstico Patrimonial', 'Bem', 'Planilha de Diagnóstico Tributário (receitas/despesas)', 'CONDICIONAL — receitas/despesas por safra/cultura p/ o planejamento tributário rural (fase TAX). Só quando o escopo inclui planejamento tributário.', 'outros'::public.osg_doc_categoria, 'Documentos do Planejamento Tributário', false, false, 'cliente', 45),
  ('bem--planilha-de-resultado-projetado-pf-e-pj', 'Diagnóstico Patrimonial', 'Bem', 'Planilha de resultado projetado (PF e PJ)', 'Projeção do resultado (PF e PJ), separada por tipo de atividade, conforme modelo enviado.', 'outros'::public.osg_doc_categoria, 'Documentos do Planejamento Tributário', false, false, 'cliente', 46),
  ('bem--projecao-de-investimentos-proximos-anos', 'Diagnóstico Patrimonial', 'Bem', 'Projeção de investimentos (próximos anos)', 'Descrição do projeto e possíveis valores a desembolsar (ex.: 2027-2029), se aplicável.', 'outros'::public.osg_doc_categoria, 'Documentos do Planejamento Tributário', false, false, 'cliente', 47),
  ('bem--relatorio-de-bens-da-atividade-rural-aquisicao-e', 'Diagnóstico Patrimonial', 'Bem', 'Relatório de bens da atividade rural (aquisição e mercado)', 'Em Excel: bens da atividade rural com datas de aquisição, valores de aquisição e valores de mercado.', 'outros'::public.osg_doc_categoria, 'Documentos do Planejamento Tributário', false, false, 'cliente', 48),
  ('bem--relatorio-de-dividas-da-atividade-rural', 'Diagnóstico Patrimonial', 'Bem', 'Relatório de dívidas da atividade rural', 'Em Excel: valores a pagar para os próximos anos, conforme as datas de vencimento.', 'outros'::public.osg_doc_categoria, 'Documentos do Planejamento Tributário', false, false, 'cliente', 49),
  ('bem--relacao-de-bens-com-intencao-de-alienacao', 'Diagnóstico Patrimonial', 'Bem', 'Relação de bens com intenção de alienação', 'Matrículas em processo e/ou com previsão/desejo de alienação.', 'bens_direitos'::public.osg_doc_categoria, 'Documentos dos Bens Imóveis', false, false, 'cliente', 50),
  ('pessoa-juridica--diagnostico-de-outras-consultorias', 'Quadro Societário', 'Pessoa Jurídica', 'Diagnóstico de outras consultorias', 'Diagnósticos Sucessórios, Societários e/ou de Governança realizados por outras consultorias.', 'societarios'::public.osg_doc_categoria, 'Documentos de Governança', false, false, 'pessoa_pj', 51),
  ('pessoa-juridica--laudo-simulacao-de-valor-das-quotas', 'Quadro Societário', 'Pessoa Jurídica', 'Laudo / simulação de valor das quotas', 'Avaliação ou simulação do valor das quotas, quando existente (insumo do estudo sucessório).', 'societarios'::public.osg_doc_categoria, 'Documentos Societários', false, false, 'pessoa_pj', 52),
  ('pessoa-juridica--matriz-de-alcadas-existente', 'Quadro Societário', 'Pessoa Jurídica', 'Matriz de alçadas existente', 'Matriz e eventuais políticas de alçadas (financeiras e/ou de atos e negócios jurídicos), ainda que em planilha ou minuta não formalizada.', 'societarios'::public.osg_doc_categoria, 'Documentos de Governança', false, false, 'pessoa_pj', 53),
  ('pessoa-juridica--organograma-societario-do-grupo', 'Quadro Societário', 'Pessoa Jurídica', 'Organograma societário do grupo', 'Estrutura societária atual (holdings, sociedades controladas, sócios e participações).', 'societarios'::public.osg_doc_categoria, 'Documentos Societários', false, false, 'pessoa_pj', 54),
  ('pessoa-juridica--respostas-do-questionario-de-governanca', 'Quadro Societário', 'Pessoa Jurídica', 'Respostas do questionário de governança', 'Respostas do cliente/família ao questionário de governança da PSA.', 'societarios'::public.osg_doc_categoria, 'Documentos de Governança', false, false, 'pessoa_pj', 55),
  ('pessoa-juridica-cooperativa--acordo-com-cooperativas-centrais-federacoes', 'EXTRAS POR PROJETO', 'Pessoa Jurídica (Cooperativa)', 'Acordo com cooperativas centrais/federações', 'Cooperativa.', 'societarios'::public.osg_doc_categoria, 'Documentos Societários', false, false, 'pessoa_pj', 56),
  ('pessoa-juridica-cooperativa--ata-de-assembleia', 'EXTRAS POR PROJETO', 'Pessoa Jurídica (Cooperativa)', 'Ata de assembleia', 'Ordinária/Extraordinária, dos últimos 3 anos (cooperativa).', 'societarios'::public.osg_doc_categoria, 'Documentos Societários', false, false, 'pessoa_pj', 57),
  ('pessoa-juridica-cooperativa--edital-de-convocacao', 'EXTRAS POR PROJETO', 'Pessoa Jurídica (Cooperativa)', 'Edital de convocação', 'Das assembleias (cooperativa).', 'societarios'::public.osg_doc_categoria, 'Documentos Societários', false, false, 'pessoa_pj', 58),
  ('pessoa-juridica-cooperativa--estatuto-social', 'EXTRAS POR PROJETO', 'Pessoa Jurídica (Cooperativa)', 'Estatuto Social', 'Atualizado (cooperativa).', 'societarios'::public.osg_doc_categoria, 'Documentos Societários', false, false, 'pessoa_pj', 59),
  ('pessoa-juridica-cooperativa--lista-de-cooperados', 'EXTRAS POR PROJETO', 'Pessoa Jurídica (Cooperativa)', 'Lista de cooperados', 'Atualizada (cooperativa).', 'societarios'::public.osg_doc_categoria, 'Documentos Societários', false, false, 'pessoa_pj', 60),
  ('pessoa-juridica-cooperativa--livro-de-presenca-das-assembleias', 'EXTRAS POR PROJETO', 'Pessoa Jurídica (Cooperativa)', 'Livro de presença das assembleias', 'Cooperativa.', 'societarios'::public.osg_doc_categoria, 'Documentos Societários', false, false, 'pessoa_pj', 61),
  ('pessoa-juridica-cooperativa--politica-de-distribuicao-de-sobras-perdas', 'EXTRAS POR PROJETO', 'Pessoa Jurídica (Cooperativa)', 'Política de distribuição de sobras/perdas', 'Controle de sobras/perdas e sua destinação (cooperativa).', 'societarios'::public.osg_doc_categoria, 'Documentos Societários', false, false, 'pessoa_pj', 62),
  ('pessoa-juridica-cooperativa--registro-na-junta-comercial', 'EXTRAS POR PROJETO', 'Pessoa Jurídica (Cooperativa)', 'Registro na Junta Comercial', 'Registro da cooperativa na Junta Comercial.', 'societarios'::public.osg_doc_categoria, 'Documentos Societários', false, false, 'pessoa_pj', 63)
ON CONFLICT (codigo) DO UPDATE SET
  modulo=EXCLUDED.modulo, entidade=EXCLUDED.entidade, documento=EXCLUDED.documento,
  nota=EXCLUDED.nota, categoria=EXCLUDED.categoria, categoria_docbox=EXCLUDED.categoria_docbox,
  confidencial=EXCLUDED.confidencial, obrigatorio_default=EXCLUDED.obrigatorio_default,
  granularidade=EXCLUDED.granularidade, ordem=EXCLUDED.ordem, updated_at=now();
COMMIT;