-- Reatribui os slots de cor para que nenhuma colisao envolva area ATIVA.
--
-- O QUE ESTAVA ERRADO
--   A 20260820120000 fez o backfill com `((row_number() over (order by
--   created_at)) - 1) % 8 + 1`. Com 10 areas e 8 slots duas colisoes sao
--   INEVITAVEIS — mas o modulo escolheu mal QUEM colide:
--
--     slot 1   Area Fixos (inativa)  +  Tax (ATIVA)
--     slot 2   Area Fiscal (inativa) +  TAX LEGAL (ATIVA)
--
--   Cada par tem uma ativa. Como area inativa nao mostra ponto, a colisao fica
--   ADORMECIDA — e acorda no dia em que alguem reativa a Area Fixos, meses
--   depois, sem contexto e sem ninguem ligando a causa ao efeito.
--
--   Reatribuir hoje e de graca: a paleta nasceu horas atras e ninguem aprendeu
--   cor nenhuma ainda. Daqui a um mes o custo passa a ser "por que a cor do
--   PRADO mudou?".
--
-- A REGRA, e por que nao e simplesmente "primeiro slot livre em ordem de criacao"
--   Aquela regra tambem falha, e foi medido: em ordem de criacao pura as duas
--   colisoes caem exatamente nos mesmos pares de agora. Nao e a ordem que
--   importa, e QUEM sobra para dobrar.
--
--   Duas passadas:
--     1. as ATIVAS pegam slots distintos, em ordem de criacao (5 cabem em 8);
--     2. as INATIVAS pegam o primeiro livre e, esgotados, dobram num slot que
--        NENHUMA ativa usa.
--
--   Resultado: toda colisao e inativa-com-inativa. Reativar UMA area nunca
--   colide; so colide se as duas de um par forem ativadas — e para esse caso a
--   checagem vive no codigo (`realocarSlotSeColide`, em src/lib/corDaArea.ts),
--   disparada na ativacao.
--
--   Com mais de 8 areas ATIVAS a paleta precisa crescer, e isso e decisao
--   humana: o codigo mantem o slot e avisa, em vez de escolher em silencio.
--
-- IDEMPOTENTE: reexecutar reproduz a mesma atribuicao (a ordem e `is_active`,
-- `created_at`, `id`, todos estaveis).

do $$
declare
  r record;
  s int := 0;
  livre int;
  alvo int;
  ativos int[] := '{}';
  usados int[] := '{}';
begin
  -- Passo 1: ATIVAS, slots distintos em ordem de criacao.
  for r in select id from public.estrutura_areas where is_active order by created_at, id loop
    s := s + 1;
    if s > 8 then
      raise notice 'mais de 8 areas ativas: a paleta --area-* precisa crescer';
      s := 8;
    end if;
    update public.estrutura_areas set color_index = s where id = r.id;
    ativos := ativos || s;
    usados := usados || s;
  end loop;

  -- Passo 2: INATIVAS, primeiro livre; esgotado, o slot menos usado entre os
  -- que nenhuma ativa ocupa.
  for r in select id from public.estrutura_areas where not is_active order by created_at, id loop
    livre := null;
    for alvo in 1..8 loop
      if not (alvo = any(usados)) then livre := alvo; exit; end if;
    end loop;

    if livre is null then
      select v into livre
        from (select v, (select count(*) from unnest(usados) u where u = v) as n
                from generate_series(1, 8) v
               where not (v = any(ativos))
               order by n, v
               limit 1) q;
    end if;

    -- Sem nenhum slot fora das ativas (mais de 8 ativas), cai no menos usado.
    if livre is null then
      select v into livre
        from (select v, (select count(*) from unnest(usados) u where u = v) as n
                from generate_series(1, 8) v order by n, v limit 1) q;
    end if;

    update public.estrutura_areas set color_index = livre where id = r.id;
    usados := usados || livre;
  end loop;
end $$;
