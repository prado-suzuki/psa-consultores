INSERT INTO public.rls_precheck_allowed_tables(table_name, allowed_ops)
VALUES ('sprint_backlog_items', ARRAY['update','delete'])
ON CONFLICT (table_name) DO UPDATE SET allowed_ops = EXCLUDED.allowed_ops;