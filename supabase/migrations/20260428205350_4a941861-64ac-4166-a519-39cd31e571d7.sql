-- 1. Registrar a limpeza no audit_logs (performed_by = autora original identificada)
INSERT INTO public.audit_logs (
  area, entity_type, entity_id, entity_name, action, performed_by, changed_fields, details
)
SELECT
  'client-management',
  'representante',
  '52e1b819-45d5-4b0e-97e9-6a4b25c82afc'::uuid,
  'Rafael Castro',
  'updated',
  '4ddd05d2-c199-4907-8fb7-55c8e5de1a21'::uuid,
  jsonb_build_object('email', jsonb_build_object('old', email, 'new', NULL)),
  jsonb_build_object(
    'reason', 'Limpeza de email placeholder (xxxxxxx@xxxxx.xxx.xx) para liberar o representante do filtro de Carga de Chamados',
    'original_author_inferred', 'monica.matunaga@psaconsultores.com.br',
    'original_author_evidence', 'Cliente associado (Álvaro De Oliveira Castro) criado por Monica Matunaga em 2026-04-09 18:42:11, 2 segundos após a criação do representante (mesmo fluxo NewClientModal)',
    'cleaned_by', 'migration: clean-rafael-castro-placeholder-email',
    'note', 'performed_by atribuído à autora original do cadastro para preservar rastreabilidade histórica'
  )
FROM public.representante
WHERE id_representante = '52e1b819-45d5-4b0e-97e9-6a4b25c82afc'
  AND email = 'xxxxxxx@xxxxx.xxx.xx';

-- 2. Limpar o email placeholder
UPDATE public.representante
SET email = NULL,
    updated_at = now()
WHERE id_representante = '52e1b819-45d5-4b0e-97e9-6a4b25c82afc'
  AND email = 'xxxxxxx@xxxxx.xxx.xx';

-- 3. Reportar (NOTICE) outros emails com padrão placeholder
DO $$
DECLARE
  rec RECORD;
  total INT := 0;
BEGIN
  FOR rec IN
    SELECT r.id_representante, r.nome, r.email, c.nome AS cliente_nome, c.ambiente
    FROM public.representante r
    JOIN public.cliente c ON c.id = r.id_cliente
    WHERE r.excluido = false
      AND r.email IS NOT NULL
      AND (
        r.email ~* 'x{3,}'
        OR r.email ~* '(placeholder|teste@teste|exemplo@exemplo|email@email)'
        OR r.email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$'
      )
  LOOP
    total := total + 1;
    RAISE NOTICE 'Possivel email placeholder remanescente: id=% nome=% email=% cliente=% ambiente=%',
      rec.id_representante, rec.nome, rec.email, rec.cliente_nome, rec.ambiente;
  END LOOP;
  RAISE NOTICE 'Total de emails suspeitos detectados (sem alteracao): %', total;
END$$;