-- Preenchimento contextual de tarefas por ditado: o perfil comentario-para-tarefa
-- passa a extrair responsável, cliente, projeto e horas estimadas, além de título
-- e descrição. O contrato de saída ganha os metadados opcionais `tipo`
-- ('texto'|'numero') e `nullable` (boolean) por campo — campos sem eles continuam
-- válidos e são interpretados como texto obrigatório, então perfis antigos não
-- precisam ser reescritos.
--
-- A função de validação é REPLACADA antes do update do perfil: o CHECK da tabela
-- chama esta função, e o novo contrato_saida do perfil só passa na versão nova.

create or replace function public.enriquecimento_contrato_saida_valido(contrato jsonb)
returns boolean
language plpgsql
immutable
set search_path to 'public'
as $$
declare
  campo record;
begin
  if jsonb_typeof(contrato) is distinct from 'object' then
    return false;
  end if;

  if contrato = '{"tipo":"texto"}'::jsonb then
    return true;
  end if;

  if contrato->>'tipo' is distinct from 'estruturada'
     or not contrato ?& array['tipo', 'campos']
     or contrato - 'tipo' - 'campos' <> '{}'::jsonb
     or jsonb_typeof(contrato->'campos') is distinct from 'object'
     or contrato->'campos' = '{}'::jsonb then
    return false;
  end if;

  for campo in select key, value from jsonb_each(contrato->'campos')
  loop
    if campo.key !~ '^[a-z][a-z0-9_]*$'
       or jsonb_typeof(campo.value) is distinct from 'object'
       or campo.value - 'descricao' - 'tipo' - 'nullable' <> '{}'::jsonb
       or jsonb_typeof(campo.value->'descricao') is distinct from 'string'
       or nullif(btrim(campo.value->>'descricao'), '') is null then
      return false;
    end if;

    -- `tipo` é opcional; quando presente, só 'texto' ou 'numero'.
    if campo.value ? 'tipo'
       and campo.value->>'tipo' not in ('texto', 'numero') then
      return false;
    end if;

    -- `nullable` é opcional; quando presente, só booleano.
    if campo.value ? 'nullable'
       and jsonb_typeof(campo.value->'nullable') is distinct from 'boolean' then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

revoke execute on function public.enriquecimento_contrato_saida_valido(jsonb) from public;
grant execute on function public.enriquecimento_contrato_saida_valido(jsonb)
  to authenticated, service_role;

-- Atualização EXPLÍCITA do perfil (não depende do ON CONFLICT DO NOTHING da
-- migration original, que não toca em linha já existente). Idempotente por si:
-- rodar de novo grava o mesmo conteúdo.
update public.enriquecimento_perfil
set
  instrucoes =
    'Transforme o comentário em uma única tarefa acionável. '
    || 'titulo e descricao são obrigatórios: preencha-os sempre. '
    || 'Os campos responsavel_mencionado, cliente_mencionado, projeto_mencionado e horas_estimadas '
    || 'capturam APENAS o que a fala mencionar de forma explícita: '
    || 'os três primeiros recebem o nome exatamente como dito, e horas_estimadas recebe o número de horas falado. '
    || 'NÃO deduza, conclua ou complete nomes e valores ausentes: '
    || 'quando a informação não for mencionada, devolva null no campo correspondente. '
    || 'Não invente prazo, responsável, prioridade, estimativa ou contexto que não esteja no comentário. '
    || 'O título deve ser curto e começar com um verbo de ação. '
    || 'A descrição deve preservar contexto, restrições e critérios mencionados no comentário.',
  contrato_saida = '{
    "tipo": "estruturada",
    "campos": {
      "titulo": {
        "descricao": "Título curto da tarefa, sem formatação. Obrigatório."
      },
      "descricao": {
        "descricao": "Descrição da tarefa em Markdown restrito. Obrigatória."
      },
      "responsavel_mencionado": {
        "descricao": "Nome do responsável mencionado na fala, exatamente como dito; null se ninguém for mencionado.",
        "nullable": true
      },
      "cliente_mencionado": {
        "descricao": "Nome do cliente mencionado na fala, exatamente como dito; null se nenhum cliente for mencionado.",
        "nullable": true
      },
      "projeto_mencionado": {
        "descricao": "Nome do projeto mencionado na fala, exatamente como dito; null se nenhum projeto for mencionado.",
        "nullable": true
      },
      "horas_estimadas": {
        "descricao": "Horas estimadas mencionadas na fala, como número; null se nada for falado sobre esforço.",
        "tipo": "numero",
        "nullable": true
      }
    }
  }'::jsonb
where
  nome = 'comentario-para-tarefa';
