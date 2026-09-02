-- Reset do cenário de demonstração ao PONTO DE PARTIDA da seção 3 de
-- `demonstracao.md`: livro de movimentos vazio, nenhum documento gerado, nenhuma
-- resposta de assistente, e os bens nos status de antes da passagem.
--
-- NÃO É MIGRATION, e não deve virar uma. Migration de reset entra em `db push` e
-- apagaria, sem ninguém pedir, o cenário que alguém estivesse montando. Este
-- arquivo se roda À MÃO, contra o SANDBOX, quando quem conduz decide zerar:
--
--   supabase db query --linked -f docs/planos/aumento-capital-novos-imoveis/reset-cenario.sql
--
-- (com `-f`, e não com `$(cat …)`: o CLI lê as linhas de comentário `--` do
-- começo do arquivo como se fossem flags dele.)
--
-- Antes de rodar, guarde o que vai embora (o cenário costuma valer mais do que
-- parece depois que já foi apagado):
--
--   select json_agg(to_jsonb(d)) from documento_gerado d where d.cliente_id = '<cliente>';
--   -- idem movimentacao_quotas, projeto_flag_valor, ato_societario, e o
--   -- status_integralizacao dos bens.
--
-- SANDBOX, e só ele. Toda condição é presa ao id do cliente de teste: não há
-- comando aqui que alcance outro cliente. Ainda assim, confira a branch antes
-- (fora da `main` o app fala com o sandbox) e nunca rode isto contra produção.
--
-- Idempotente: rodar duas vezes deixa o mesmo estado.

do $$
declare
  v_cliente uuid := '8f9c2796-b9f3-4349-923b-b04e86bc6012'; -- [TESTE] Dinossauro Aposentado
  v_docs    int;
  v_movs    int;
begin
  -- Guarda de segurança: o cliente tem de existir E ser de teste. O prefixo
  -- `[TESTE]` é a convenção que identifica cadastro de desenvolvimento (ver
  -- docs/geral/clientes-de-teste-dev.md); sem ele, não apaga nada.
  if not exists (
    select 1 from public.cliente
     where id = v_cliente and nome like '[TESTE]%'
  ) then
    raise notice 'Cliente % não existe ou não é de teste: nada foi apagado.', v_cliente;
    return;
  end if;

  select count(*) into v_docs from public.documento_gerado where cliente_id = v_cliente;
  select count(*) into v_movs from public.movimentacao_quotas where cliente_id = v_cliente;

  -- 1. As respostas do assistente. Elas apontam para a peça registrada em
  --    `documento_base_id`, então saem ANTES dos documentos.
  delete from public.projeto_flag_valor where cliente_id = v_cliente;

  -- 2. O livro de movimentos, inteiro, inclusive o que já foi carimbado por uma
  --    peça: aqui não há peça a preservar, todas vão embora no passo 4.
  delete from public.movimentacao_quotas where cliente_id = v_cliente;

  -- 3. Os atos que agrupavam esses movimentos.
  delete from public.ato_societario where cliente_id = v_cliente;

  -- 4. Os documentos gerados, com o que pende deles. `documento_raiz_id`,
  --    `documento_anterior_id` e `substitui_documento_id` apontam para dentro da
  --    própria tabela, então um delete só, do conjunto inteiro, resolve as três.
  delete from public.documento_override
   where documento_gerado_id in (select id from public.documento_gerado where cliente_id = v_cliente);
  delete from public.documento_notificacao_visto
   where documento_gerado_id in (select id from public.documento_gerado where cliente_id = v_cliente);
  update public.documento_arquivo set documento_gerado_id = null
   where documento_gerado_id in (select id from public.documento_gerado where cliente_id = v_cliente);
  delete from public.documento_gerado where cliente_id = v_cliente;

  -- 5. Os bens voltam ao status de antes da passagem.
  --
  --    Registrar a peça vira o bem para 'Integralizado' (D5), e é isso que o tira
  --    da lista de elegíveis. Os três da constituição voltam a
  --    'Aprovado para 2ª Instancia'; os da reserva do aumento voltam a
  --    'Pendente', que NÃO é elegível, e é justamente por isso que eles ficam
  --    fora da constituição até alguém aprová-los no passo 11.
  update public.bem
     set status_integralizacao = 'Aprovado para 2ª Instancia'
   where cliente_id = v_cliente
     and referencia_dp in ('BS 60', 'BS 61', 'BS 62');

  update public.bem
     set status_integralizacao = 'Pendente'
   where cliente_id = v_cliente
     and referencia_dp in ('BS 01', 'BS 02', 'BS 03', 'BS 08', 'BS 09');

  -- `BS 51` fica fora: ele não participa da estruturação e o roteiro manda não
  -- encostar nele.

  raise notice 'Cenário zerado: % documento(s) e % movimento(s) apagados.', v_docs, v_movs;
end $$;
