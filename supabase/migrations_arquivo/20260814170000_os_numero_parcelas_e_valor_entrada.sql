-- A OS passa a guardar o parcelamento do contrato: nº de parcelas e entrada.
--
-- O PROBLEMA
--    A OS só tinha `valor_projeto`, e o contrato com o cliente é parcelado. O
--    financeiro controla o parcelamento fora do sistema, na planilha
--    `CONTAS A RECEBER - CONTRATOS A FATURAR` (coluna `Parcela`, "08/12", e
--    `Valor A Faturar`, o valor de UMA parcela). Sem lugar para o parcelamento:
--      · não dá para saber, pela OS, quanto o cliente paga por mês;
--      · quem cadastra não sabe se `valor_projeto` é a parcela ou o total, e por
--        isso o campo ficou zerado em 61 das 67 OS ativas — das 6 preenchidas,
--        ao menos duas guardam UMA parcela (Agro Amazônia 035/2026 com 10.000 de
--        um contrato de 12 × 10.000; Paiol 018/2026, 8.000 de 12 × 8.000). A
--        ambiguidade já produziu dado errado no banco;
--      · o financeiro segue na planilha.
--    Daqui em diante `valor_projeto` significa sempre o TOTAL do contrato.
--
-- O QUE ENTRA
--    · `numero_parcelas` — inteiro, nulo aceito, faixa 1 a 360. É do CONTRATO,
--      não do exercício: 24 parcelas que atravessam 2026 e 2027 são UMA OS com
--      24, não duas de 12 (na planilha do financeiro isso aparece como o mesmo
--      cliente repetido em dois exercícios). 1 = pagamento único.
--    · `valor_entrada` — numeric, default 0, mesmo padrão de `valor_projeto`,
--      `valor_reembolso_km` e `valor_reembolso_refeicao`. Sai do contrato, não
--      da planilha: a planilha lista só o que falta faturar, então entrada já
--      paga não está lá — é digitação manual.
--
-- POR QUE O DEFAULT DE `numero_parcelas` VEM EM UM SEGUNDO PASSO
--    `add column ... default 1` preencheria com 1 as OS que já existem, e isso é
--    um backfill acidental: as 67 OS de prod passariam a afirmar "pagamento em
--    1 parcela", que ninguém informou. Criada sem default, a coluna deixa as OS
--    antigas em NULO ("não informado", que a tela mostra como "—") e o
--    `set default 1` seguinte vale só para OS nova. `valor_entrada` não tem esse
--    problema: 0 é o valor certo para quem não teve entrada.
--
-- POR QUE O VALOR DA PARCELA NÃO É COLUNA
--    `(valor_projeto − valor_entrada) ÷ numero_parcelas` é derivado na tela
--    (`src/lib/osParcelamento.ts`), ao lado dos três campos, para conferência
--    contra a planilha na hora do cadastro. Gravá-lo criaria um quarto valor a
--    manter em sincronia com os outros três — e a diferença de centavos da
--    última parcela é tratada no faturamento, não aqui.
--
-- SEM BACKFILL, E SEM TOCAR EM `valor_projeto`
--    O preenchimento é manual, a partir de `OS - VALORES E PARCELAS (base para
--    cadastro).xlsx`, que consolida a planilha do financeiro em 75 contratos.
--    Nenhum chute: valor total só entra por quem confere contrato a contrato.
--
-- PERIODICIDADE E DIA DE VENCIMENTO
--    Todo o parcelamento de hoje é mensal — não há campo de periodicidade de
--    propósito. Dia de vencimento (a planilha tem: 5, 9, 15, 20, 25, 28) é o
--    passo seguinte, fora desta entrega.
--
-- RLS: nada a fazer. As policies de `ordem_servico` (arquétipo cluster-cliente)
-- são por linha, não por coluna; as colunas novas entram nelas automaticamente.
--
-- IDEMPOTENTE: `if not exists` nas colunas e `drop constraint if exists` antes
-- do check. Reaplicar não dá erro, e aplicar depois de o DDL já ter sido rodado
-- à mão no SQL Editor também não.
--
-- CONFERÊNCIA DEPOIS DE APLICAR:
--    select count(*) as os_ativas,
--           count(numero_parcelas) as com_parcelas,   -- deve ser 0 logo após
--           count(*) filter (where valor_entrada = 0) as entrada_zerada
--      from public.ordem_servico where excluido = false;
--    -- a faixa recusa fora de 1..360:
--    -- update public.ordem_servico set numero_parcelas = 0 where id = '...';  → erro
--
-- REVERSÃO:
--   alter table public.ordem_servico
--     drop constraint if exists ordem_servico_numero_parcelas_faixa;
--   alter table public.ordem_servico drop column if exists numero_parcelas;
--   alter table public.ordem_servico drop column if exists valor_entrada;

BEGIN;

alter table public.ordem_servico
  add column if not exists numero_parcelas integer,
  add column if not exists valor_entrada numeric default 0;

-- Só para OS nova — ver "POR QUE O DEFAULT VEM EM UM SEGUNDO PASSO".
alter table public.ordem_servico
  alter column numero_parcelas set default 1;

alter table public.ordem_servico
  drop constraint if exists ordem_servico_numero_parcelas_faixa;

-- Faixa, não NOT NULL: nulo continua significando "não informado". 360 é o teto
-- que a tela também aplica na digitação (PARCELAS_MAX).
alter table public.ordem_servico
  add constraint ordem_servico_numero_parcelas_faixa
  check (numero_parcelas is null or numero_parcelas between 1 and 360);

comment on column public.ordem_servico.numero_parcelas is
  'Parcelas do contrato inteiro, não do exercício: 24 parcelas que atravessam dois anos são UMA OS com 24. Nulo = não informado, estado das OS anteriores a esta coluna; 1 = pagamento único. Periodicidade é sempre mensal (não há campo de periodicidade). O valor da parcela NÃO é coluna: é (valor_projeto - valor_entrada) / numero_parcelas, derivado na tela em src/lib/osParcelamento.ts.';

comment on column public.ordem_servico.valor_entrada is
  'Entrada paga fora do parcelamento, digitada a partir do contrato. Não vem da planilha do financeiro, que lista só o que falta faturar — entrada já paga não aparece lá. 0 quando não houver.';

comment on column public.ordem_servico.valor_projeto is
  'Total do contrato — nunca o valor de uma parcela. A ambiguidade anterior deixou OS com valor de parcela gravado aqui (Agro Amazônia 035/2026, Paiol 018/2026); a correção é manual, pela planilha consolidada. Para o valor mensal, ver numero_parcelas e valor_entrada.';

COMMIT;
