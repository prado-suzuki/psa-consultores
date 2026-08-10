-- -----------------------------------------------------------------------------
-- Resumo agregado por sprint para a lista /equipe/sprints
--
-- A lista mostra dois números por card: "Xh alocadas" e o impacto
-- ("R$ .../mês" + "Xh liberadas"). Para chegar neles, o front baixava TODOS os
-- entregáveis de TODAS as sprints -- duas vezes, uma para as horas e outra para
-- o impacto, cada uma paginando de 500 em 500 em série -- e depois consultava
-- `process_improvements` em lotes de 50 ids, também em série. Nenhuma tarefa
-- aparece nessa tela: era backlog inteiro da empresa trafegando para exibir dois
-- números.
--
-- Aqui a soma volta para o banco: uma linha por sprint, uma requisição.
--
-- `security_invoker = on`: a visibilidade continua sendo a das tabelas de
-- origem (RLS de `sprints` / `sprint_deliverables` via `sprint_visivel()` e a
-- RLS de cluster de `process_improvements`), exatamente o que o front enxergava
-- ao ler as tabelas direto.
-- -----------------------------------------------------------------------------

-- Os dois caminhos quentes da agregação (e também o `.eq('sprint_id', ...)` da
-- tela de detalhe) não tinham índice.
CREATE INDEX IF NOT EXISTS idx_sprint_deliverables_sprint
  ON public.sprint_deliverables (sprint_id);

CREATE INDEX IF NOT EXISTS idx_process_improvements_sprint_deliverable
  ON public.process_improvements (sprint_deliverable_id);

CREATE OR REPLACE VIEW public.sprint_resumo
WITH (security_invoker = on) AS
WITH horas AS (
  -- Mesmo critério que o cliente aplicava: só entregável com responsável e com
  -- horas estimadas, e nunca uma tarefa-mãe -- a mãe existe como agrupador e
  -- somá-la junto das filhas dobraria as horas. "Mãe" é global, não por sprint:
  -- se a filha foi movida para outra sprint, a mãe continua sendo mãe.
  SELECT
      d.sprint_id,
      SUM(d.estimated_hours) AS horas_alocadas
    FROM public.sprint_deliverables d
   WHERE d.sprint_id       IS NOT NULL
     AND d.assigned_to     IS NOT NULL
     AND d.estimated_hours IS NOT NULL
     AND d.estimated_hours <> 0
     AND NOT EXISTS (
           SELECT 1
             FROM public.sprint_deliverables f
            WHERE f.parent_id = d.id
         )
   GROUP BY d.sprint_id
),
impacto AS (
  SELECT
      d.sprint_id,
      SUM(COALESCE(i.cost_saved_monthly, 0)) AS custo_economizado_mensal,
      SUM(COALESCE(i.time_saved_hours, 0))   AS horas_liberadas,
      COUNT(*)                               AS melhorias
    FROM public.process_improvements i
    JOIN public.sprint_deliverables  d ON d.id = i.sprint_deliverable_id
   WHERE i.evaluation_status = 'completed'
     AND d.sprint_id IS NOT NULL
   GROUP BY d.sprint_id
)
SELECT
    s.id                                        AS sprint_id,
    COALESCE(h.horas_alocadas, 0)::numeric      AS horas_alocadas,
    COALESCE(p.custo_economizado_mensal, 0)::numeric AS custo_economizado_mensal,
    COALESCE(p.horas_liberadas, 0)::numeric     AS horas_liberadas,
    COALESCE(p.melhorias, 0)::bigint            AS melhorias
  FROM public.sprints s
  LEFT JOIN horas   h ON h.sprint_id = s.id
  LEFT JOIN impacto p ON p.sprint_id = s.id;

COMMENT ON VIEW public.sprint_resumo IS
  'Uma linha por sprint com os agregados que a lista /equipe/sprints exibe no card: horas alocadas (entregáveis-folha com responsável) e impacto das melhorias concluídas (custo mensal economizado, horas liberadas, contagem). Existe para a lista não precisar baixar os entregáveis de todas as sprints. Visibilidade = RLS das tabelas de origem (view security_invoker).';

GRANT SELECT ON public.sprint_resumo TO authenticated;
