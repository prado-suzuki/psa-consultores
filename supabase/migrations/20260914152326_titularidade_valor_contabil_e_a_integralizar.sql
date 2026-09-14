-- Valor contábil e valor a integralizar POR TITULAR da matrícula.
--
-- Fatia 1 de docs/planos/valor-contabil-por-titular-e-integralizacao-parcial.md.
-- Dois problemas relatados pela OSG em 14/09/2026:
--
--   1. INTEGRALIZAÇÃO PARCIAL. Um sócio integraliza só a fração dele (33%); os
--      67% restantes ficam de fora, seja porque pertencem a quem nem vai estar
--      no quadro societário, seja porque o titular prefere segurar a parte
--      dele. Hoje o capital da PR e o rateio de quotas contam os 67% de fora.
--   2. O VALOR CONTÁBIL NÃO É RATEADO POR IGUAL. Ele é a soma do que cada
--      titular declarou na DIRPF, e titular erra para mais ou para menos; o
--      contador do cliente decide então quanto cada um integraliza. Não havia
--      lugar para "A declarou 60, B declarou 40, e integralizam 50 e 50".
--
-- A verdade mora na linha de titularidade DE DIREITO (`DIREITO`/`NUE_PROP`):
-- quem integraliza é quem tem a propriedade. Vazio em `vlr_integralizar` é o
-- estado "NÃO integraliza" — é assim que os 67% de fora se expressam.
--
-- Nada aqui aplica em produção. Sandbox pelo `bun run db:sync --apply`.

alter table public.titularidade
  add column if not exists vlr_contabil     numeric(15,2),
  add column if not exists vlr_integralizar numeric(15,2);

comment on column public.titularidade.vlr_contabil is
  'R$ que ESTE titular declarou na DIRPF para o imóvel. A soma dos titulares é o valor contábil da matrícula (matricula.vlr_contabil vira cache mantido pela aplicação). Nulo = não informado.';

comment on column public.titularidade.vlr_integralizar is
  'R$ que ESTE titular integraliza na sociedade, decidido pelo contador do cliente — pode divergir do contábil dele. NULO É SIGNIFICATIVO: o titular não integraliza, não entra no capital, não recebe quotas e segue no texto como área remanescente.';

-- Não-negativo pelo par drop+add (constraint não tem cláusula de guarda).
alter table public.titularidade
  drop constraint if exists titularidade_vlr_contabil_nao_negativo;
alter table public.titularidade
  add constraint titularidade_vlr_contabil_nao_negativo
    check (vlr_contabil is null or vlr_contabil >= 0);

alter table public.titularidade
  drop constraint if exists titularidade_vlr_integralizar_nao_negativo;
alter table public.titularidade
  add constraint titularidade_vlr_integralizar_nao_negativo
    check (vlr_integralizar is null or vlr_integralizar >= 0);

-- ── BACKFILL ────────────────────────────────────────────────────────────────
--
-- O contrato gerado tem de sair IGUAL antes e depois desta migration: a
-- divergência só pode nascer quando alguém editar. Então cada titular recebe,
-- nas DUAS colunas, exatamente o que `ratearMatriculaEntreTitulares`
-- (src/lib/templates/mapeadores.ts) calcula hoje:
--
--   · uma linha por PESSOA na matrícula (as de fato e de direito da mesma
--     pessoa são a mesma titularidade — é o `dedupTitulares` do mapeador), com
--     a primeira fração não nula dela;
--   · quem tem fração leva fração × valor, em centavos; quando todos têm
--     fração e elas somam 100% ("matrícula fechada"), o último absorve o
--     resíduo do arredondamento;
--   · quem não tem fração divide igualmente o que sobrou, e o último absorve o
--     resíduo de novo.
--
-- O valor da matrícula é `matricula.vlr_contabil`, com o do bem como fallback —
-- a mesma leitura de `valorParaCapital`.
--
-- O valor é escrito na linha DE DIREITO da pessoa (`DIREITO`/`NUE_PROP`); quem
-- só tem linha de fato recebe nela, porque o alvo é preservar o contrato, e
-- deixá-la vazia tiraria essa pessoa da integralização.
--
-- `where vlr_integralizar is null` deixa rodar duas vezes sem estragar o que
-- alguém já editou — e é o que torna esta migration idempotente.

with valor_da_matricula as (
  select m.id as matricula_id,
         coalesce(m.vlr_contabil, b.vlr_contabil) as vlr
    from public.matricula m
    left join public.bem b on b.id = m.bem_id
),
-- Uma linha por (matrícula, pessoa): a titularidade que RECEBE o valor, a
-- primeira fração não nula da pessoa, e a ordem de aparição dela no cadastro.
por_pessoa as (
  select t.matricula_id,
         t.titular_pessoa_id,
         (array_agg(t.id order by
            case when t.tipo in ('DIREITO', 'NUE_PROP') then 0 else 1 end,
            t.created_at, t.id))[1] as alvo_id,
         (array_agg(t.fracao order by (t.fracao is null), t.created_at, t.id))[1] as fracao,
         min(t.created_at) as ordem_em,
         min(t.id::text) as ordem_id
    from public.titularidade t
   where t.matricula_id is not null
   group by t.matricula_id, t.titular_pessoa_id
),
base as (
  select p.matricula_id, p.alvo_id, p.fracao, p.ordem_em, p.ordem_id,
         round(v.vlr * 100) as total_cent,
         count(*)      over (partition by p.matricula_id) as n_titulares,
         count(p.fracao) over (partition by p.matricula_id) as n_com_fracao,
         sum(p.fracao) over (partition by p.matricula_id) as soma_fracao
    from por_pessoa p
    join valor_da_matricula v on v.matricula_id = p.matricula_id
   where v.vlr is not null
),
fechamento as (
  select base.*,
         (n_com_fracao = n_titulares and abs(coalesce(soma_fracao, 0) - 100) < 0.001) as fechada
    from base
),
-- Quem tem fração: fração × valor, com o último absorvendo o resíduo quando a
-- matrícula fecha em 100%.
com_fracao as (
  select f.*,
         round(f.total_cent * f.fracao / 100) as cent_bruto,
         row_number() over (partition by f.matricula_id order by f.ordem_em, f.ordem_id) as rn,
         count(*)     over (partition by f.matricula_id) as n
    from fechamento f
   where f.fracao is not null
),
com_fracao_cent as (
  select c.*,
         case
           when c.fechada and c.rn = c.n
             then c.total_cent - coalesce(
                    sum(c.cent_bruto) over (
                      partition by c.matricula_id order by c.rn
                      rows between unbounded preceding and 1 preceding), 0)
           else c.cent_bruto
         end as cent
    from com_fracao c
),
alocado as (
  select matricula_id, sum(cent) as cent from com_fracao_cent group by matricula_id
),
-- Quem não tem fração: divide igualmente o que sobrou.
sem_fracao as (
  select f.*,
         f.total_cent - coalesce(a.cent, 0) as restante,
         row_number() over (partition by f.matricula_id order by f.ordem_em, f.ordem_id) as rn,
         count(*)     over (partition by f.matricula_id) as n
    from fechamento f
    left join alocado a on a.matricula_id = f.matricula_id
   where f.fracao is null
),
sem_fracao_cent as (
  select s.*,
         case
           when s.rn = s.n then s.restante - round(s.restante::numeric / s.n) * (s.n - 1)
           else round(s.restante::numeric / s.n)
         end as cent
    from sem_fracao s
),
rateio as (
  select alvo_id, cent from com_fracao_cent
  union all
  select alvo_id, cent from sem_fracao_cent
)
update public.titularidade t
   set vlr_contabil     = coalesce(t.vlr_contabil, r.cent / 100.0),
       vlr_integralizar = r.cent / 100.0
  from rateio r
 where t.id = r.alvo_id
   and t.vlr_integralizar is null;
