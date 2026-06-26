BEGIN;

DO $$ DECLARE n int;
BEGIN
  IF EXISTS (SELECT 1 FROM public.job_roles WHERE name='Consultor Assistente') THEN RAISE EXCEPTION 'cargo Consultor Assistente já existe — migração já aplicada?'; END IF;
  SELECT count(*) INTO n FROM public.processes WHERE code IN ('PROC-GERAL-037','PROC-GERAL-038','PROC-GERAL-039','PROC-GERAL-040','PROC-GERAL-041');
  IF n <> 5 THEN RAISE EXCEPTION 'esperados 5 processos novos (037-041), há %', n; END IF;
  SELECT count(*) INTO n FROM public.process_stages WHERE process_id IN (SELECT id FROM public.processes WHERE code IN ('PROC-GERAL-037','PROC-GERAL-038','PROC-GERAL-039','PROC-GERAL-040','PROC-GERAL-041'));
  IF n <> 0 THEN RAISE EXCEPTION 'processos novos já têm % etapas — migração já aplicada?', n; END IF;
END $$;

INSERT INTO public.job_roles (id, name, level, category, hourly_rate, monthly_salary_ref, is_active, type)
  VALUES (gen_random_uuid(), 'Consultor Assistente', 'junior', 'Consultoria', 35.0, 3500.0, true, 'Interno');

UPDATE public.etapa_responsaveis
   SET responsavel_id = (SELECT id FROM public.job_roles WHERE name='Consultor Assistente')
 WHERE responsavel_id = 'aa77a98a-74a3-438d-af72-d2100beb9763'
   AND etapa_id IN (SELECT ps.id FROM public.process_stages ps JOIN public.processes p ON p.id=ps.process_id
                    WHERE p.cluster_id='0523512c-f980-4236-8a7c-53e06c9c7a80');

INSERT INTO public.process_stages (id, process_id, stage_order, name, scenario, execution, volume_per_process)
  VALUES ('ae1b9bcc-d812-4df3-95e5-4d08b0211a37', (SELECT id FROM public.processes WHERE code='PROC-GERAL-037'), 1, 'Conferir documentos recebidos × solicitados', 'AS-IS', 'manual', 1.0);
INSERT INTO public.etapa_responsaveis (id, etapa_id, scenario, responsavel_id, papel, horas)
  VALUES (gen_random_uuid(), 'ae1b9bcc-d812-4df3-95e5-4d08b0211a37', 'AS-IS', (SELECT id FROM public.job_roles WHERE name='Consultor Assistente'), 'executado', 0.5);
INSERT INTO public.process_stages (id, process_id, stage_order, name, scenario, execution, volume_per_process)
  VALUES ('bd4f54a2-248c-4dd5-bfa0-358d06a10861', (SELECT id FROM public.processes WHERE code='PROC-GERAL-037'), 2, 'Gerar relatório de pendências', 'AS-IS', 'manual', 1.0);
INSERT INTO public.etapa_responsaveis (id, etapa_id, scenario, responsavel_id, papel, horas)
  VALUES (gen_random_uuid(), 'bd4f54a2-248c-4dd5-bfa0-358d06a10861', 'AS-IS', (SELECT id FROM public.job_roles WHERE name='Consultor Assistente'), 'executado', 0.5);
INSERT INTO public.process_stages (id, process_id, stage_order, name, scenario, execution, volume_per_process)
  VALUES ('1dcfc2eb-b941-4fde-a080-48a875ce528f', (SELECT id FROM public.processes WHERE code='PROC-GERAL-037'), 3, 'Enviar e cobrar o cliente', 'AS-IS', 'manual', 1.0);
INSERT INTO public.etapa_responsaveis (id, etapa_id, scenario, responsavel_id, papel, horas)
  VALUES (gen_random_uuid(), '1dcfc2eb-b941-4fde-a080-48a875ce528f', 'AS-IS', (SELECT id FROM public.job_roles WHERE name='Coordenador'), 'executado', 0.25);

INSERT INTO public.process_stages (id, process_id, stage_order, name, scenario, execution, volume_per_process)
  VALUES ('dbf291c1-ecec-4e26-9360-0620d79c70a1', (SELECT id FROM public.processes WHERE code='PROC-GERAL-038'), 1, 'Receber documentos complementares', 'AS-IS', 'manual', 1.0);
INSERT INTO public.etapa_responsaveis (id, etapa_id, scenario, responsavel_id, papel, horas)
  VALUES (gen_random_uuid(), 'dbf291c1-ecec-4e26-9360-0620d79c70a1', 'AS-IS', (SELECT id FROM public.job_roles WHERE name='Consultor Assistente'), 'executado', 0.5);
INSERT INTO public.process_stages (id, process_id, stage_order, name, scenario, execution, volume_per_process)
  VALUES ('51224ac0-5375-400e-929e-a0a1b5c91d1f', (SELECT id FROM public.processes WHERE code='PROC-GERAL-038'), 2, 'Conferir e arquivar no Docbox', 'AS-IS', 'manual', 1.0);
INSERT INTO public.etapa_responsaveis (id, etapa_id, scenario, responsavel_id, papel, horas)
  VALUES (gen_random_uuid(), '51224ac0-5375-400e-929e-a0a1b5c91d1f', 'AS-IS', (SELECT id FROM public.job_roles WHERE name='Consultor Assistente'), 'executado', 0.5);
INSERT INTO public.process_stages (id, process_id, stage_order, name, scenario, execution, volume_per_process)
  VALUES ('dd51dd27-2e5a-49b9-9b7f-d01fac9be7f1', (SELECT id FROM public.processes WHERE code='PROC-GERAL-038'), 3, 'Atualizar checklist do projeto', 'AS-IS', 'manual', 1.0);
INSERT INTO public.etapa_responsaveis (id, etapa_id, scenario, responsavel_id, papel, horas)
  VALUES (gen_random_uuid(), 'dd51dd27-2e5a-49b9-9b7f-d01fac9be7f1', 'AS-IS', (SELECT id FROM public.job_roles WHERE name='Consultor Assistente'), 'executado', 0.25);

INSERT INTO public.process_stages (id, process_id, stage_order, name, scenario, execution, volume_per_process)
  VALUES ('34fd25ec-95cc-4124-8438-f17cbf915209', (SELECT id FROM public.processes WHERE code='PROC-GERAL-039'), 1, 'Identificar regime de bens e situação matrimonial', 'AS-IS', 'manual', 1.0);
INSERT INTO public.etapa_responsaveis (id, etapa_id, scenario, responsavel_id, papel, horas)
  VALUES (gen_random_uuid(), '34fd25ec-95cc-4124-8438-f17cbf915209', 'AS-IS', (SELECT id FROM public.job_roles WHERE name='Consultor Tributário Sr'), 'executado', 0.5);
INSERT INTO public.process_stages (id, process_id, stage_order, name, scenario, execution, volume_per_process)
  VALUES ('5c1153d4-2a10-4b38-9066-e6d9fdcf5ac1', (SELECT id FROM public.processes WHERE code='PROC-GERAL-039'), 2, 'Elaborar minuta de escritura de união estável / pacto', 'AS-IS', 'manual', 1.0);
INSERT INTO public.etapa_responsaveis (id, etapa_id, scenario, responsavel_id, papel, horas)
  VALUES (gen_random_uuid(), '5c1153d4-2a10-4b38-9066-e6d9fdcf5ac1', 'AS-IS', (SELECT id FROM public.job_roles WHERE name='Consultor Tributário Sr'), 'executado', 2.0);
INSERT INTO public.process_stages (id, process_id, stage_order, name, scenario, execution, volume_per_process)
  VALUES ('b1e14219-e064-4124-be45-323c5528f493', (SELECT id FROM public.processes WHERE code='PROC-GERAL-039'), 3, 'Cliente formaliza em cartório (acompanhamento)', 'AS-IS', 'manual', 1.0);
INSERT INTO public.etapa_responsaveis (id, etapa_id, scenario, responsavel_id, papel, horas)
  VALUES (gen_random_uuid(), 'b1e14219-e064-4124-be45-323c5528f493', 'AS-IS', (SELECT id FROM public.job_roles WHERE name='Consultor Assistente'), 'executado', 0.5);

INSERT INTO public.process_stages (id, process_id, stage_order, name, scenario, execution, volume_per_process)
  VALUES ('d41670e5-c4e6-432f-b4cc-a553fb2399a0', (SELECT id FROM public.processes WHERE code='PROC-GERAL-040'), 1, 'Avaliar estrutura atual e necessidade de reorganização', 'AS-IS', 'manual', 1.0);
INSERT INTO public.etapa_responsaveis (id, etapa_id, scenario, responsavel_id, papel, horas)
  VALUES (gen_random_uuid(), 'd41670e5-c4e6-432f-b4cc-a553fb2399a0', 'AS-IS', (SELECT id FROM public.job_roles WHERE name='Consultor Tributário Sr'), 'executado', 2.0);
INSERT INTO public.process_stages (id, process_id, stage_order, name, scenario, execution, volume_per_process)
  VALUES ('dde4c5e3-61a0-4299-9df4-c8b290d2c8ba', (SELECT id FROM public.processes WHERE code='PROC-GERAL-040'), 2, 'Elaborar Protocolo e Justificação', 'AS-IS', 'manual', 1.0);
INSERT INTO public.etapa_responsaveis (id, etapa_id, scenario, responsavel_id, papel, horas)
  VALUES (gen_random_uuid(), 'dde4c5e3-61a0-4299-9df4-c8b290d2c8ba', 'AS-IS', (SELECT id FROM public.job_roles WHERE name='Consultor Tributário Sr'), 'executado', 3.5);
INSERT INTO public.process_stages (id, process_id, stage_order, name, scenario, execution, volume_per_process)
  VALUES ('f73ad9fa-7b04-4c94-8056-973cfc43c747', (SELECT id FROM public.processes WHERE code='PROC-GERAL-040'), 3, 'Elaborar laudo de avaliação', 'AS-IS', 'manual', 1.0);
INSERT INTO public.etapa_responsaveis (id, etapa_id, scenario, responsavel_id, papel, horas)
  VALUES (gen_random_uuid(), 'f73ad9fa-7b04-4c94-8056-973cfc43c747', 'AS-IS', (SELECT id FROM public.job_roles WHERE name='Especialista Tributário'), 'executado', 3.0);
INSERT INTO public.process_stages (id, process_id, stage_order, name, scenario, execution, volume_per_process)
  VALUES ('48d4900a-2b60-4c59-a6e3-8d265dd7c27d', (SELECT id FROM public.processes WHERE code='PROC-GERAL-040'), 4, 'Elaborar AC das sociedades envolvidas', 'AS-IS', 'manual', 1.0);
INSERT INTO public.etapa_responsaveis (id, etapa_id, scenario, responsavel_id, papel, horas)
  VALUES (gen_random_uuid(), '48d4900a-2b60-4c59-a6e3-8d265dd7c27d', 'AS-IS', (SELECT id FROM public.job_roles WHERE name='Consultor Tributário Sr'), 'executado', 2.0);
INSERT INTO public.process_stages (id, process_id, stage_order, name, scenario, execution, volume_per_process)
  VALUES ('2493e536-5b38-4c4e-ab6b-6f27630e82e8', (SELECT id FROM public.processes WHERE code='PROC-GERAL-040'), 5, 'Revisão sênior', 'AS-IS', 'manual', 1.0);
INSERT INTO public.etapa_responsaveis (id, etapa_id, scenario, responsavel_id, papel, horas)
  VALUES (gen_random_uuid(), '2493e536-5b38-4c4e-ab6b-6f27630e82e8', 'AS-IS', (SELECT id FROM public.job_roles WHERE name='Consultor Tributário Sr'), 'aprovado', 1.0);
INSERT INTO public.process_stages (id, process_id, stage_order, name, scenario, execution, volume_per_process)
  VALUES ('2c7be6b5-7a21-4ad6-8fca-d988a7c5bda8', (SELECT id FROM public.processes WHERE code='PROC-GERAL-040'), 6, 'Registro na Junta Comercial', 'AS-IS', 'manual', 1.0);
INSERT INTO public.etapa_responsaveis (id, etapa_id, scenario, responsavel_id, papel, horas)
  VALUES (gen_random_uuid(), '2c7be6b5-7a21-4ad6-8fca-d988a7c5bda8', 'AS-IS', (SELECT id FROM public.job_roles WHERE name='Consultor Assistente'), 'executado', 0.75);

INSERT INTO public.process_stages (id, process_id, stage_order, name, scenario, execution, volume_per_process)
  VALUES ('8d8d024a-2772-4c4b-b6f1-512e0b951d1e', (SELECT id FROM public.processes WHERE code='PROC-GERAL-041'), 1, 'Receber novo imóvel / alteração de área', 'AS-IS', 'manual', 1.0);
INSERT INTO public.etapa_responsaveis (id, etapa_id, scenario, responsavel_id, papel, horas)
  VALUES (gen_random_uuid(), '8d8d024a-2772-4c4b-b6f1-512e0b951d1e', 'AS-IS', (SELECT id FROM public.job_roles WHERE name='Consultor Tributário Sr'), 'executado', 0.5);
INSERT INTO public.process_stages (id, process_id, stage_order, name, scenario, execution, volume_per_process)
  VALUES ('85abdebd-6c01-4627-a3bb-1b17af6e380a', (SELECT id FROM public.processes WHERE code='PROC-GERAL-041'), 2, 'Revisar anexo (matrícula × hectares × %)', 'AS-IS', 'manual', 1.0);
INSERT INTO public.etapa_responsaveis (id, etapa_id, scenario, responsavel_id, papel, horas)
  VALUES (gen_random_uuid(), '85abdebd-6c01-4627-a3bb-1b17af6e380a', 'AS-IS', (SELECT id FROM public.job_roles WHERE name='Consultor Assistente'), 'executado', 1.5);
INSERT INTO public.process_stages (id, process_id, stage_order, name, scenario, execution, volume_per_process)
  VALUES ('7db2266e-6176-4348-9d50-eb1a24377315', (SELECT id FROM public.processes WHERE code='PROC-GERAL-041'), 3, 'Atualizar minuta de Parceria/Composse', 'AS-IS', 'manual', 1.0);
INSERT INTO public.etapa_responsaveis (id, etapa_id, scenario, responsavel_id, papel, horas)
  VALUES (gen_random_uuid(), '7db2266e-6176-4348-9d50-eb1a24377315', 'AS-IS', (SELECT id FROM public.job_roles WHERE name='Consultor Tributário Sr'), 'executado', 2.0);
INSERT INTO public.process_stages (id, process_id, stage_order, name, scenario, execution, volume_per_process)
  VALUES ('b7281545-9bae-4085-ad7d-100b65c97bd1', (SELECT id FROM public.processes WHERE code='PROC-GERAL-041'), 4, 'Checklist do revisor', 'AS-IS', 'manual', 1.0);
INSERT INTO public.etapa_responsaveis (id, etapa_id, scenario, responsavel_id, papel, horas)
  VALUES (gen_random_uuid(), 'b7281545-9bae-4085-ad7d-100b65c97bd1', 'AS-IS', (SELECT id FROM public.job_roles WHERE name='Consultor Tributário Sr'), 'executado', 0.5);
INSERT INTO public.process_stages (id, process_id, stage_order, name, scenario, execution, volume_per_process)
  VALUES ('6bfcd905-cb68-4618-9f21-b2509def88df', (SELECT id FROM public.processes WHERE code='PROC-GERAL-041'), 5, 'Registro em cartório', 'AS-IS', 'manual', 1.0);
INSERT INTO public.etapa_responsaveis (id, etapa_id, scenario, responsavel_id, papel, horas)
  VALUES (gen_random_uuid(), '6bfcd905-cb68-4618-9f21-b2509def88df', 'AS-IS', (SELECT id FROM public.job_roles WHERE name='Consultor Assistente'), 'executado', 0.75);

COMMIT;