DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.checklist_item_padrao WHERE codigo = 'pessoa-fisica--rg') THEN
    RAISE NOTICE 'OSG-BE-03 Parte 2 ja aplicada; no-op.';
    RETURN;
  END IF;

  -- 1) desativar os combinados
  UPDATE public.checklist_item_padrao
     SET ativo = false, updated_at = now()
   WHERE codigo IN ('pessoa-fisica--rg-cnh','pessoa-juridica--balanco-balancete-dre');

  -- 2) abrir espaco na ordem (apenas ativos)
  UPDATE public.checklist_item_padrao SET ordem = ordem + 3 WHERE ativo = true AND ordem >= 15;
  UPDATE public.checklist_item_padrao SET ordem = ordem + 1 WHERE ativo = true AND ordem BETWEEN 5 AND 13;

  -- 3) inserir os itens separados
  INSERT INTO public.checklist_item_padrao
    (codigo, modulo, entidade, documento, nota, categoria, categoria_docbox,
     confidencial, obrigatorio_default, granularidade, ordem, ativo)
  VALUES
    ('pessoa-fisica--rg','Qualificação das Partes','Pessoa Física','RG',
     'Registro Geral (identidade civil) com órgão expedidor, dos fundadores, sócios, herdeiros e respectivos cônjuges/companheiros(as).',
     'pessoais'::public.osg_doc_categoria,'Documentos Pessoais',false,true,'pessoa_pf',4,true),
    ('pessoa-fisica--cnh','Qualificação das Partes','Pessoa Física','CNH',
     'Carteira Nacional de Habilitação (identidade civil) com órgão expedidor, dos fundadores, sócios, herdeiros e respectivos cônjuges/companheiros(as).',
     'pessoais'::public.osg_doc_categoria,'Documentos Pessoais',false,true,'pessoa_pf',5,true),
    ('pessoa-juridica--balanco','Qualificação das Partes','Pessoa Jurídica','Balanço',
     'Dos três últimos exercícios, ainda que não registrados, das empresas do Grupo.',
     'societarios'::public.osg_doc_categoria,'Documentos Societários',false,true,'pessoa_pj',15,true),
    ('pessoa-juridica--balancete','Qualificação das Partes','Pessoa Jurídica','Balancete',
     'Último balancete disponível das empresas do Grupo.',
     'societarios'::public.osg_doc_categoria,'Documentos Societários',false,true,'pessoa_pj',16,true),
    ('pessoa-juridica--dre','Qualificação das Partes','Pessoa Jurídica','DRE',
     'Demonstração do Resultado do Exercício dos três últimos exercícios das empresas do Grupo.',
     'societarios'::public.osg_doc_categoria,'Documentos Societários',false,true,'pessoa_pj',17,true);

  -- 4) migrar cópias existentes em checklist_cliente_item
  INSERT INTO public.checklist_cliente_item
    (cliente_id, item_padrao_id, modulo, entidade, documento, nota, categoria, categoria_docbox,
     confidencial, obrigatorio, origem, status, pessoa_id, bem_id, matricula_id, observacao)
  SELECT c.cliente_id, np.id, np.modulo, np.entidade, np.documento, np.nota, np.categoria, np.categoria_docbox,
         np.confidencial, np.obrigatorio_default, c.origem, c.status, c.pessoa_id, c.bem_id, c.matricula_id, c.observacao
    FROM public.checklist_cliente_item c
    JOIN public.checklist_item_padrao op ON op.id = c.item_padrao_id AND op.codigo = 'pessoa-fisica--rg-cnh'
    JOIN public.checklist_item_padrao np ON np.codigo IN ('pessoa-fisica--rg','pessoa-fisica--cnh');

  INSERT INTO public.checklist_cliente_item
    (cliente_id, item_padrao_id, modulo, entidade, documento, nota, categoria, categoria_docbox,
     confidencial, obrigatorio, origem, status, pessoa_id, bem_id, matricula_id, observacao)
  SELECT c.cliente_id, np.id, np.modulo, np.entidade, np.documento, np.nota, np.categoria, np.categoria_docbox,
         np.confidencial, np.obrigatorio_default, c.origem, c.status, c.pessoa_id, c.bem_id, c.matricula_id, c.observacao
    FROM public.checklist_cliente_item c
    JOIN public.checklist_item_padrao op ON op.id = c.item_padrao_id AND op.codigo = 'pessoa-juridica--balanco-balancete-dre'
    JOIN public.checklist_item_padrao np ON np.codigo IN ('pessoa-juridica--balanco','pessoa-juridica--balancete','pessoa-juridica--dre');

  DELETE FROM public.checklist_cliente_item c
   USING public.checklist_item_padrao p
   WHERE c.item_padrao_id = p.id
     AND p.codigo IN ('pessoa-fisica--rg-cnh','pessoa-juridica--balanco-balancete-dre');
END $$;