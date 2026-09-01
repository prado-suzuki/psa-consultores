-- O RETRATO FISCAL DA SIMULAÇÃO É IMUTÁVEL, e isso não é RLS.
--
-- A policy de UPDATE decide QUEM altera QUAL LINHA. Ela não sabe dizer "pode alterar o
-- nome, não pode alterar o imposto" — RLS não vê coluna. Então, mesmo com o ciclo de
-- aprovação valendo, sobrava o furo: um `team_member` podia reescrever `vlr_imposto_*`,
-- `vlr_acervo_*`, `quotas_total`, `competencia`, `vlr_upf` ou até `empresa_pessoa_id` de
-- uma simulação `gerada`, e um sublíder podia fazer o mesmo numa `aprovada`, sem mudar o
-- status. O retrato mudava por baixo do que o cliente já tinha visto, e a tela de
-- histórico continuaria mostrando a mesma versão.
--
-- Isso contraria o desenho da feature — "abrir uma simulação é ler, nunca reapurar" — e
-- o `Pontos de atenção` do próprio card: mudança de cadastro ou de parâmetro não pode
-- alterar silenciosamente uma revisão antiga.
--
-- CONGELA A PARTIR DA CRIAÇÃO, não a partir da aprovação. Revisar não é editar: cada
-- geração é uma linha nova, e a tela nunca oferece edição desses campos. Se o número
-- estava errado, o caminho é gerar de novo e apagar a errada — o DELETE existe para
-- quem criou, enquanto não aprovada.
--
-- A LISTA É DE EXCEÇÕES, e é curta de propósito: coluna nova nasce congelada. Se algum
-- dia um campo passar a ser editável, ele entra aqui explicitamente, e o commit dessa
-- decisão fica visível — melhor do que descobrir que uma coluna nunca foi protegida.

-- ── O QUE ESTA MIGRAÇÃO PRESSUPÕE, CONFERIDO ANTES DE CRIAR QUALQUER COISA ───
--
-- A lista de exceções é o coração da trigger: se ela citar coluna que não existe, a
-- exceção não protege nada — e a coluna que ela deveria liberar passaria a ser
-- bloqueada, quebrando renomear e aprovar. `nome` é o caso concreto: produção ainda
-- não a tem, porque ela nasce na 20260828170000.
--
-- Produção não roda esta pasta em ordem — quem aplica é uma pessoa, pelo chat do
-- Lovable —, então a ordem não está garantida por mecanismo nenhum.
do $$
declare
  c text;
begin
  if to_regclass('public.itcd_simulacao') is null then
    raise exception
      'public.itcd_simulacao não existe. Aplique antes a 20260826154524_itcd_calculadora_schema.';
  end if;

  foreach c in array array['nome', 'observacao', 'status', 'aprovada_por', 'aprovada_em',
                           'updated_at', 'updated_by']
  loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'itcd_simulacao' and column_name = c
    ) then
      raise exception
        'itcd_simulacao.% não existe, e a trigger a trataria como campo do retrato. Aplique antes a 20260828170000_itcd_simulacao_usufruto.', c;
    end if;
  end loop;
end $$;

create or replace function public.itcd_simulacao_retrato_imutavel()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  -- O que a tela realmente edita: renomear (`nome`), mudar status (`status`,
  -- `aprovada_por`, `aprovada_em`) e a anotação livre. Mais as colunas de quem/quando,
  -- que acompanham as duas ações.
  v_editaveis text[] := array[
    'nome', 'observacao', 'status', 'aprovada_por', 'aprovada_em',
    'updated_at', 'updated_by'
  ];
begin
  if (to_jsonb(new) - v_editaveis) <> (to_jsonb(old) - v_editaveis) then
    raise exception
      'O retrato da simulação de ITCD é imutável: só nome, observação e status mudam. '
      'Para corrigir número, gere uma nova simulação — a versão anterior é o que foi '
      'entregue.';
  end if;
  return new;
end $$;

comment on function public.itcd_simulacao_retrato_imutavel() is
  'Congela o retrato fiscal da simulação de ITCD. RLS decide linha; imutabilidade de '
  'coluna precisa de trigger.';

drop trigger if exists itcd_simulacao_retrato_imutavel on public.itcd_simulacao;
create trigger itcd_simulacao_retrato_imutavel
  before update on public.itcd_simulacao
  for each row execute function public.itcd_simulacao_retrato_imutavel();

-- AS FILHAS não precisam de trigger: elas não têm campo editável nenhum. A RLS já as
-- bloqueia quando o pai está aprovado, e antes disso a gravação é a RPC, que só insere.
-- Se um dia existir edição de filha, ela vem com a mesma pergunta respondida aqui.

