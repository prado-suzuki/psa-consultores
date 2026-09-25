-- SUC-02: a coluna alternativa da guia aceita a base integral (100%), além da reduzida.
--
-- A 20260924131341 pôs a outra base na própria guia e travou a alternativa em 70%,
-- porque nas simulações NOVAS as colunas de sempre guardam a integral. Faltou o caso da
-- simulação gravada ANTES dela: ali as colunas de sempre guardam a base que estava
-- marcada na tela — na instituição de usufruto, quase sempre 70% —, e o percentual do
-- cabeçalho (`pct_base_instituicao`) não muda, porque o retrato é imutável
-- (20260901120000). Recontar a base que falta nessas guias é pôr a INTEGRAL na coluna
-- alternativa, e a trava recusava.
--
-- RECONTAR, E NÃO GERAR DE NOVO. Tudo o que a calculadora usa para apurar está gravado na
-- simulação — acervo, UPF, capital e as guias com as quotas de cada par —, e o motor dela,
-- rodado sobre esses dados, reproduz ao centavo o que foi gravado (conferido nas oito
-- simulações da Agro Aliança do sandbox em 24/09/2026). A base que falta sai como sairia
-- numa geração nova, e mais fiel ao aprovado: com o acervo da época, não o de hoje.
--
-- O que muda é só a trava: a alternativa é 70% ou 100%, e continua tudo ou nada. Quem lê
-- não confunde as duas, porque a linha diz qual base guarda (`pct_base_alternativa`) e o
-- cabeçalho diz qual está nas colunas de sempre. A gravação da calculadora continua
-- mandando só 70%.
--
-- Idempotente: as travas pelo par `drop ... if exists` + `add`, e os comentários por
-- `comment on`, que substitui.

alter table public.itcd_simulacao_gia
  drop constraint if exists itcd_simulacao_gia_alternativa_ck;
alter table public.itcd_simulacao_gia
  add constraint itcd_simulacao_gia_alternativa_ck check (
    num_nulls(pct_base_alternativa,
              vlr_base_alternativa_contabil, vlr_base_alternativa_itr,
              vlr_base_alternativa_mercado, vlr_imposto_alternativo_contabil,
              vlr_imposto_alternativo_itr, vlr_imposto_alternativo_mercado) = 7
    or (num_nulls(pct_base_alternativa,
                  vlr_base_alternativa_contabil, vlr_base_alternativa_itr,
                  vlr_base_alternativa_mercado, vlr_imposto_alternativo_contabil,
                  vlr_imposto_alternativo_itr, vlr_imposto_alternativo_mercado) = 0
        and pct_base_alternativa in (70, 100))
  );

alter table public.itcd_simulacao_concessao
  drop constraint if exists itcd_simulacao_concessao_alternativa_ck;
alter table public.itcd_simulacao_concessao
  add constraint itcd_simulacao_concessao_alternativa_ck check (
    num_nulls(pct_base_alternativa,
              vlr_base_alternativa_contabil, vlr_base_alternativa_itr,
              vlr_base_alternativa_mercado, vlr_imposto_alternativo_contabil,
              vlr_imposto_alternativo_itr, vlr_imposto_alternativo_mercado) = 7
    or (origem = 'instituicao'
        and num_nulls(pct_base_alternativa,
                      vlr_base_alternativa_contabil, vlr_base_alternativa_itr,
                      vlr_base_alternativa_mercado, vlr_imposto_alternativo_contabil,
                      vlr_imposto_alternativo_itr, vlr_imposto_alternativo_mercado) = 0
        and pct_base_alternativa in (70, 100))
  );

comment on column public.itcd_simulacao_gia.pct_base_alternativa is
  'A mesma guia na outra base de cálculo, ao lado da que está nas colunas de sempre. Nenhuma '
  'das duas é a decisão: quem escolhe é o cliente. 70,00 nas simulações gravadas desde '
  '24/09/2026 (as colunas de sempre têm a integral); 100,00 na guia antiga recontada, cujas '
  'colunas de sempre têm 70%. Nulo sem reserva de usufruto (a guia só existe em 100%).';
comment on column public.itcd_simulacao_concessao.pct_base_alternativa is
  'A mesma guia de instituição na outra base de cálculo, ao lado da que está nas colunas de '
  'sempre. Nenhuma das duas é a decisão: quem escolhe é o cliente. 70,00 nas simulações '
  'gravadas desde 24/09/2026; 100,00 na guia antiga recontada, cujas colunas de sempre têm '
  '70%. Nulo na reserva, que não tem guia.';
