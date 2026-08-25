-- 1) contatos: público continua podendo enviar o formulário, mas sem poder
-- semear campos internos nem gravar textos gigantes.
DROP POLICY IF EXISTS rls_contatos_insert ON public.contatos;

CREATE POLICY rls_contatos_insert
  ON public.contatos FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    nome_completo IS NOT NULL AND length(btrim(nome_completo)) BETWEEN 2 AND 200
    AND email IS NOT NULL AND length(email) <= 320 AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-zA-Z]{2,}$'
    AND (telefone IS NULL OR length(telefone) <= 40)
    AND (empresa IS NULL OR length(empresa) <= 200)
    AND (servico_interesse IS NULL OR length(servico_interesse) <= 200)
    AND (mensagem IS NULL OR length(mensagem) <= 5000)
    AND notas_internas IS NULL
    AND atendido_por IS NULL
    AND (status IS NULL OR status = 'novo')
  );

-- 2) solicitacao_item_nao_aplicavel: corrige a tautologia s.cliente_id = s.cliente_id
DROP POLICY IF EXISTS "cluster team_member can insert solicitacao item nao aplicavel"
  ON public.solicitacao_item_nao_aplicavel;

CREATE POLICY "cluster team_member can insert solicitacao item nao aplicavel"
  ON public.solicitacao_item_nao_aplicavel FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND public.cliente_visivel_para(cliente_id)
    AND EXISTS (
      SELECT 1
        FROM public.solicitacao_item si
        JOIN public.solicitacao s ON s.id = si.solicitacao_id
       WHERE si.id = solicitacao_item_nao_aplicavel.solicitacao_item_id
         AND s.cliente_id = solicitacao_item_nao_aplicavel.cliente_id
    )
  );