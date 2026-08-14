-- Anonimiza os dados carregados de produção.
--
-- Rode DEPOIS de scripts/carregar-dados-locais.sh, e SEMPRE antes de subir dados
-- para um ambiente compartilhado. Num banco que quatro pessoas acessam, CPF, CNPJ,
-- endereço e matrícula de cliente real não têm o que fazer.
--
-- Princípios:
--   1. Determinístico. O valor falso deriva de md5(id), então recarregar duas vezes
--      dá o mesmo resultado e o mesmo cliente tem o mesmo nome falso em toda tela.
--   2. Preserva formato. CPF continua com 11 dígitos e dígito verificador válido,
--      CNPJ com 14, email continua email, telefone continua telefone. Se o formato
--      quebrar, os validadores do front quebram junto e o ambiente não serve.
--   3. Não toca catálogo. produto_segmento, grupo_tributo, tmpl_*, centros_custo e
--      afins são dados de negócio, não pessoais. Embaralhar isso inutilizaria o app.
--
-- O que este script NÃO resolve: texto livre. Corpo de chamado, mensagem, observação
-- e nota interna podem citar nome e valor de cliente, e não há como limpar isso sem
-- destruir o conteúdo. Veja o bloco final.

-- Desliga triggers de usuário e checagem de FK só nesta sessão. Sem isso, as
-- guardas da aplicação recusam a reescrita (org_comments_guard_update exige que
-- só o autor edite) e os triggers de auditoria e updated_at gravariam ruído por
-- cima de tudo que for anonimizado.
set session_replication_role = replica;

begin;

-- ---------------------------------------------------------------------------
-- Auxiliares
-- ---------------------------------------------------------------------------

-- Inteiro estável a partir de qualquer semente
create or replace function pg_temp.semente(txt text) returns bigint
language sql immutable as $$
  select ('x'||substr(md5(txt), 1, 8))::bit(32)::bigint;
$$;

-- CPF com dígito verificador válido
create or replace function pg_temp.cpf_falso(txt text) returns text
language plpgsql immutable as $$
declare
  d int[]; i int; s int; r int;
begin
  d := array(select ((pg_temp.semente(txt||k::text) % 10))::int from generate_series(1,9) k);
  s := 0;
  for i in 1..9 loop s := s + d[i] * (11 - i); end loop;
  r := 11 - (s % 11); if r >= 10 then r := 0; end if;
  d := d || r;
  s := 0;
  for i in 1..10 loop s := s + d[i] * (12 - i); end loop;
  r := 11 - (s % 11); if r >= 10 then r := 0; end if;
  d := d || r;
  return array_to_string(d, '');
end;
$$;

-- CNPJ com dígito verificador válido
create or replace function pg_temp.cnpj_falso(txt text) returns text
language plpgsql immutable as $$
declare
  d int[]; p1 int[] := array[5,4,3,2,9,8,7,6,5,4,3,2];
  p2 int[] := array[6,5,4,3,2,9,8,7,6,5,4,3,2];
  i int; s int; r int;
begin
  d := array(select ((pg_temp.semente(txt||'c'||k::text) % 10))::int from generate_series(1,12) k);
  s := 0;
  for i in 1..12 loop s := s + d[i] * p1[i]; end loop;
  r := s % 11; if r < 2 then r := 0; else r := 11 - r; end if;
  d := d || r;
  s := 0;
  for i in 1..13 loop s := s + d[i] * p2[i]; end loop;
  r := s % 11; if r < 2 then r := 0; else r := 11 - r; end if;
  d := d || r;
  return array_to_string(d, '');
end;
$$;

-- Mantém a pontuação original: só troca os dígitos
create or replace function pg_temp.doc_falso(original text, semente text) returns text
language plpgsql immutable as $$
declare
  digitos text; novo text; res text := ''; i int; j int := 1;
begin
  if original is null then return null; end if;
  digitos := regexp_replace(original, '\D', '', 'g');
  if length(digitos) = 14 then novo := pg_temp.cnpj_falso(semente);
  elsif length(digitos) = 11 then novo := pg_temp.cpf_falso(semente);
  else return regexp_replace(original, '\d', '0', 'g');
  end if;
  for i in 1..length(original) loop
    if substr(original, i, 1) ~ '\d' then
      res := res || substr(novo, j, 1); j := j + 1;
    else
      res := res || substr(original, i, 1);
    end if;
  end loop;
  return res;
end;
$$;

create or replace function pg_temp.nome_pf(txt text) returns text
language sql immutable as $$
  select (array['Ana','Bruno','Carla','Diego','Elisa','Fábio','Gabi','Heitor','Íris',
                'João','Karina','Lucas','Marina','Nuno','Olívia','Pedro','Rita','Sérgio',
                'Tânia','Vitor'])[(pg_temp.semente(txt) % 20) + 1]
      || ' ' ||
         (array['Almeida','Barros','Cardoso','Dias','Esteves','Freitas','Gomes','Horta',
                'Iglesias','Junqueira','Lima','Moraes','Nogueira','Otero','Pires','Quadros',
                'Rocha','Salgado','Teixeira','Vieira'])[(pg_temp.semente(txt||'s') % 20) + 1];
$$;

create or replace function pg_temp.nome_pj(txt text) returns text
language sql immutable as $$
  select (array['Aurora','Bandeirante','Cerrado','Diamantina','Estiva','Farroupilha',
                'Guapore','Horizonte','Ipê','Jatobá','Lageado','Muriti','Nascente',
                'Ouro Verde','Pantanal','Querência','Rondon','Sinop','Tapajós','Vale Azul'])
         [(pg_temp.semente(txt) % 20) + 1]
      || ' ' ||
         (array['Agropecuária','Participações','Transportes','Comércio','Agroindustrial',
                'Administradora de Bens','Sementes','Logística'])
         [(pg_temp.semente(txt||'r') % 8) + 1]
      || ' ' ||
         (array['Ltda','S.A.','Eireli'])[(pg_temp.semente(txt||'t') % 3) + 1];
$$;

create or replace function pg_temp.fone_falso(original text, semente text) returns text
language sql immutable as $$
  select case when original is null then null
    else '(' || lpad(((pg_temp.semente(semente) % 89) + 11)::text, 2, '0') || ') 9'
         || lpad((pg_temp.semente(semente||'a') % 10000)::text, 4, '0') || '-'
         || lpad((pg_temp.semente(semente||'b') % 10000)::text, 4, '0')
  end;
$$;

-- ---------------------------------------------------------------------------
-- Pessoas físicas e jurídicas
-- ---------------------------------------------------------------------------

update public.pessoa set
  denominacao = case when tipo_pessoa ilike 'p%j%' or length(regexp_replace(coalesce(cpf_cnpj,''), '\D', '', 'g')) = 14
                     then pg_temp.nome_pj(id::text) else pg_temp.nome_pf(id::text) end,
  cpf_cnpj                    = pg_temp.doc_falso(cpf_cnpj, id::text),
  filiacao_pai                = case when filiacao_pai is null then null else pg_temp.nome_pf(id::text||'pai') end,
  filiacao_mae                = case when filiacao_mae is null then null else pg_temp.nome_pf(id::text||'mae') end,
  documento_identidade_numero = case when documento_identidade_numero is null then null
                                     else lpad((pg_temp.semente(id::text||'rg') % 100000000)::text, 8, '0') end,
  data_nascimento             = case when data_nascimento is null then null
                                     else data_nascimento + (((pg_temp.semente(id::text||'dn') % 60) - 30))::int end,
  endereco_logradouro         = case when endereco_logradouro is null then null
                                     else 'Rua ' || pg_temp.nome_pf(id::text||'end') end,
  endereco_numero             = case when endereco_numero is null then null
                                     else ((pg_temp.semente(id::text||'nr') % 2000) + 1)::text end,
  endereco_complemento        = case when endereco_complemento is null then null else 'Sala 1' end,
  endereco_bairro             = case when endereco_bairro is null then null else 'Centro' end,
  endereco_cep                = case when endereco_cep is null then null
                                     else lpad((pg_temp.semente(id::text||'cep') % 100000)::text, 5, '0') || '-000' end;

-- O prefixo [TESTE] é reposto depois do sorteio do nome, porque o app usa ele
-- para separar ambiente e perdê-lo mudaria comportamento de tela.
update public.cliente set
  nome     = case when ambiente <> 'prod' then '[TESTE] ' else '' end || pg_temp.nome_pj(id::text),
  telefone = pg_temp.fone_falso(telefone, id::text),
  fixo     = pg_temp.fone_falso(fixo, id::text||'f');

update public.contribuinte set
  nome_razao_social = pg_temp.nome_pj(id::text),
  nome_fantasia     = case when nome_fantasia is null then null else pg_temp.nome_pj(id::text||'nf') end,
  cpf_cnpj          = pg_temp.doc_falso(cpf_cnpj, id::text),
  telefone          = pg_temp.fone_falso(telefone, id::text),
  logradouro        = case when logradouro is null then null else 'Rua ' || pg_temp.nome_pf(id::text||'end') end,
  cep               = case when cep is null then null
                           else lpad((pg_temp.semente(id::text||'cep') % 100000)::text, 5, '0') || '-000' end;

update public.representante set
  nome     = pg_temp.nome_pf(id_representante::text),
  email    = 'rep' || substr(md5(id_representante::text), 1, 8) || '@exemplo.dev',
  telefone = pg_temp.fone_falso(telefone, id_representante::text);

update public.contatos set
  nome_completo = pg_temp.nome_pf(id::text),
  email         = 'contato' || substr(md5(id::text), 1, 8) || '@exemplo.dev',
  telefone      = pg_temp.fone_falso(telefone, id::text),
  empresa       = case when empresa is null then null else pg_temp.nome_pj(id::text) end,
  mensagem      = '[anonimizado]',
  notas_internas = case when notas_internas is null then null else '[anonimizado]' end;

-- A equipe da PSA preserva nome e email: são as pessoas que efetivamente logam
-- no ambiente, e trocar isso quer dizer ninguém conseguir entrar com a própria
-- conta. O que é sensível aqui é o usuário de cliente, e esse continua trocado.
create or replace view pg_temp.usuario_interno as
  select id from auth.users where email ilike '%@psaconsultores.com.br';

update public.profiles set
  first_name = split_part(pg_temp.nome_pf(id::text), ' ', 1),
  last_name  = split_part(pg_temp.nome_pf(id::text), ' ', 2),
  phone      = pg_temp.fone_falso(phone, id::text),
  company    = case when company is null then null else pg_temp.nome_pj(id::text) end
where id not in (select id from pg_temp.usuario_interno);

-- telefone da equipe também sai, o que fica é nome e email
update public.profiles set phone = pg_temp.fone_falso(phone, id::text)
where id in (select id from pg_temp.usuario_interno);

-- ---------------------------------------------------------------------------
-- Bens, cartórios, exploração rural
-- ---------------------------------------------------------------------------

update public.bem set
  denominacao         = 'Imóvel ' || upper(substr(md5(id::text), 1, 6)),
  endereco_logradouro = case when endereco_logradouro is null then null
                             else 'Rua ' || pg_temp.nome_pf(id::text||'end') end,
  endereco_numero     = case when endereco_numero is null then null
                             else ((pg_temp.semente(id::text||'nr') % 2000) + 1)::text end,
  endereco_complemento = case when endereco_complemento is null then null else 'Bloco A' end,
  endereco_bairro     = case when endereco_bairro is null then null else 'Centro' end,
  endereco_cep        = case when endereco_cep is null then null
                             else lpad((pg_temp.semente(id::text||'cep') % 100000)::text, 5, '0') || '-000' end;

update public.cartorio set nome_completo = pg_temp.nome_pj(id::text) || ' Registro de Imóveis';

update public.exploracao_rural set
  explorador_nome = case when explorador_nome is null then null else pg_temp.nome_pf(id::text||'ex') end,
  outorgante_nome = case when outorgante_nome is null then null else pg_temp.nome_pf(id::text||'ou') end;

update public.impedimento set
  credor_nome = case when credor_nome is null then null else pg_temp.nome_pj(id::text) end;

update public.difal_sessao set
  cliente_nome = case when cliente_nome is null then null else pg_temp.nome_pj(id::text) end;

update public.estrutura_clusters set
  nome_empresa = case when nome_empresa is null then null else pg_temp.nome_pj(id::text) end,
  cnpj         = pg_temp.doc_falso(cnpj, id::text);

update public.efd_correcoes set
  empresa_cnpj = pg_temp.doc_falso(empresa_cnpj, id::text);

-- ---------------------------------------------------------------------------
-- Rastros: log, notificação, nome de arquivo
-- ---------------------------------------------------------------------------

update public.audit_logs        set entity_name = '[anonimizado]';
update public.documento_arquivo set nome_original = 'documento-' || substr(md5(id::text), 1, 8) || '.pdf';
update public.notificacao_envio set
  destinatario_email    = case when destinatario_email is null then null
                               else 'dest' || substr(md5(id::text), 1, 8) || '@exemplo.dev' end,
  destinatario_telefone = pg_temp.fone_falso(destinatario_telefone, id::text);
update public.org_comments      set author_name = case when author_name is null then null
                                                       else pg_temp.nome_pf(id::text) end;

-- ---------------------------------------------------------------------------
-- Login
-- ---------------------------------------------------------------------------
-- A senha de TODO MUNDO, equipe inclusive, vira devlocal123. Dois motivos: dá
-- para entrar como qualquer papel, e hash bcrypt de senha real de funcionário
-- não fica guardado num banco de desenvolvimento compartilhado.
--
-- O email da equipe é preservado, senão ninguém loga com a própria conta. Só o
-- usuário de cliente vira userNNN@exemplo.dev.

update auth.users u set
  email = 'user' || lpad(row_number::text, 3, '0') || '@exemplo.dev',
  phone = null,
  raw_user_meta_data = jsonb_build_object('nome_anonimizado', true)
from (select id, row_number() over (order by created_at, id) from auth.users) s
where u.id = s.id
  and u.id not in (select id from pg_temp.usuario_interno);

update auth.users set
  encrypted_password = extensions.crypt('devlocal123', extensions.gen_salt('bf'));

update auth.identities i set
  identity_data = jsonb_set(
    coalesce(identity_data, '{}'::jsonb), '{email}',
    to_jsonb((select email from auth.users u where u.id = i.user_id)))
where i.provider = 'email';

update public.profiles p set email = u.email from auth.users u where u.id = p.id;

commit;

set session_replication_role = origin;

-- ---------------------------------------------------------------------------
-- O que sobrou de propósito
-- ---------------------------------------------------------------------------
-- Texto livre não foi tocado, porque limpar destruiria o conteúdo que se quer testar:
--   tickets.description / .title, ticket_messages.message, org_comments.body,
--   documento_gerado.snapshot_dados, e campos de observacao espalhados.
-- Esses podem citar nome e valor de cliente real. Se o ambiente compartilhado for
-- exposto para além da equipe, trate esses campos antes.
--
-- Senha de todos os usuários depois deste script: devlocal123
