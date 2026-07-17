ALTER TYPE public.osg_checklist_status ADD VALUE IF NOT EXISTS 'solicitado' AFTER 'pendente';
ALTER TYPE public.osg_checklist_status ADD VALUE IF NOT EXISTS 'nao_solicitado' AFTER 'nao_aplicavel';