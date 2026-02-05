-- Tabela para armazenar detalhamento das economias opcionais
CREATE TABLE public.improvement_savings_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  improvement_id uuid REFERENCES public.process_improvements(id) ON DELETE CASCADE NOT NULL,
  savings_type text NOT NULL CHECK (savings_type IN ('system', 'build_vs_buy', 'other')),
  description text NOT NULL,
  cost_before numeric DEFAULT 0,
  cost_after numeric DEFAULT 0,
  savings_value numeric NOT NULL DEFAULT 0,
  is_monthly boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.improvement_savings_details ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Team members can view savings details"
ON public.improvement_savings_details
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('team_member', 'admin')
  )
);

CREATE POLICY "Team members can create savings details"
ON public.improvement_savings_details
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('team_member', 'admin')
  )
);

CREATE POLICY "Team members can update savings details"
ON public.improvement_savings_details
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('team_member', 'admin')
  )
);

CREATE POLICY "Team members can delete savings details"
ON public.improvement_savings_details
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('team_member', 'admin')
  )
);

-- Index para performance
CREATE INDEX idx_improvement_savings_details_improvement_id 
ON public.improvement_savings_details(improvement_id);

CREATE INDEX idx_improvement_savings_details_type 
ON public.improvement_savings_details(savings_type);