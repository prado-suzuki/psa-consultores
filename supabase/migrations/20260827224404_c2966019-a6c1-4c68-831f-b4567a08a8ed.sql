UPDATE public.tmpl_bloco
   SET ancora = 'capital_social',
       updated_at = now()
 WHERE id = '0e65aae6-bffe-41a6-be5c-f39498acf100'::uuid
   AND ancora IS DISTINCT FROM 'capital_social';