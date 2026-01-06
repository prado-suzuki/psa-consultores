-- Tabela de ferramentas automatizadas
CREATE TABLE public.tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'development',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para tools
CREATE POLICY "Team members can view tools"
ON public.tools FOR SELECT
USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can create tools"
ON public.tools FOR INSERT
WITH CHECK (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can update tools"
ON public.tools FOR UPDATE
USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete tools"
ON public.tools FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Tabela de acesso por área
CREATE TABLE public.tool_area_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID REFERENCES public.tools(id) ON DELETE CASCADE,
  area TEXT NOT NULL,
  granted_by UUID,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tool_id, area)
);

-- Habilitar RLS
ALTER TABLE public.tool_area_access ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para tool_area_access
CREATE POLICY "Team members can view tool access"
ON public.tool_area_access FOR SELECT
USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage tool access"
ON public.tool_area_access FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update tool access"
ON public.tool_area_access FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete tool access"
ON public.tool_area_access FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_tools_updated_at
BEFORE UPDATE ON public.tools
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();