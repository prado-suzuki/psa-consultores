-- Adicionar campos de ROI calculado na tabela processes
ALTER TABLE public.processes
ADD COLUMN IF NOT EXISTS last_roi_percentage numeric,
ADD COLUMN IF NOT EXISTS last_cost_saved_monthly numeric,
ADD COLUMN IF NOT EXISTS last_time_saved_hours numeric,
ADD COLUMN IF NOT EXISTS last_improvement_date timestamptz;

-- Adicionar campos de economia adicional em process_improvements
ALTER TABLE public.process_improvements
ADD COLUMN IF NOT EXISTS system_savings_monthly numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS build_vs_buy_savings numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_savings_monthly numeric DEFAULT 0;