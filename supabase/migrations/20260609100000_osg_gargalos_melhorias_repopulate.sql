-- ============================================================================
-- 20260609100000_osg_gargalos_melhorias_repopulate.sql
-- ----------------------------------------------------------------------------
-- Repopula GARGALOS e religa MELHORIAS do cluster OSG, alinhando-os à cascata
-- documental (cascata_data.js / diagramas validados em 19/05) e ao escopo real
-- das melhorias.
--
-- Motivação:
--   • Os 30 gargalos do remap v5 estavam inflados e com nomes estranhos; muitos
--     eram bloqueios de Cliente/Externo FORA da capacidade da OSG (gov.br, ITBI,
--     ITCMD judicial) que nenhuma melhoria ataca.
--   • O vínculo gargalo↔melhoria nunca foi modelado (gargalos.melhoria_id NULL).
--   • A cascata estava alimentada errado: a migração 20260608100000 (aplicada)
--     ligou cada gargalo a TODAS as etapas onde se manifesta, em vez da
--     causa-raiz única. A correção 20260608120000 NÃO foi aplicada e foi
--     descartada; esta migração a substitui.
--
-- Modelo correto (já suportado pelo código — cascataDocumento.ts):
--   • Gargalo-EVENTO de cascata: 1 etapa-origem (causa-raiz) em gargalo_etapas.
--     O footprint a jusante é DERIVADO em tempo real por BFS no doc-chain
--     (etapa-origem → docs de saída → etapas que consomem → ...).
--     Os eventos são exatamente os 6 cenários do cascata_data.js.
--   • Gargalo de QUALIDADE/transversal: sem etapa-origem; vínculo macro só em
--     gargalo_processos.
--
-- Vínculo gargalo↔melhoria: tabela NOVA N:M `gargalo_melhorias` (uma melhoria
--   cobre vários gargalos e vice-versa). Aposenta o uso de gargalos.melhoria_id.
--
-- ⚠️ SEGURANÇA — isolamento OSG vs Digital Rotina:
--   As tabelas são COMPARTILHADAS com a área Digital Rotina (sprints/legado).
--   Digital Rotina = cluster_id IS NULL; OSG = cluster_id '0523512c-…7a80'.
--   Todo DELETE/UPDATE aqui é escopado por cluster OSG (UUID exato) ou por
--   subquery no pai OSG. NENHUMA linha cluster_id IS NULL é tocada — validado
--   no bloco final.
-- ============================================================================

BEGIN;

-- Guarda anti-regressão: contagem Digital Rotina (cluster_id NULL) antes.
DO $guard_before$
BEGIN
  CREATE TEMP TABLE _dr_before ON COMMIT DROP AS
  SELECT 'gargalos'::text AS tabela,
         (SELECT count(*) FROM public.gargalos WHERE cluster_id IS NULL) AS n
  UNION ALL
  SELECT 'process_improvements',
         (SELECT count(*) FROM public.process_improvements WHERE cluster_id IS NULL);
END
$guard_before$;


-- ─── 1. Tabela nova N:M gargalo_melhorias (espelha o padrão gargalo_etapas) ──
CREATE TABLE IF NOT EXISTS public.gargalo_melhorias (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gargalo_id  uuid NOT NULL REFERENCES public.gargalos(id) ON DELETE CASCADE,
  melhoria_id uuid NOT NULL REFERENCES public.process_improvements(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gargalo_melhorias_uniq UNIQUE (gargalo_id, melhoria_id)
);

CREATE INDEX IF NOT EXISTS idx_gargalo_melhorias_gargalo  ON public.gargalo_melhorias (gargalo_id);
CREATE INDEX IF NOT EXISTS idx_gargalo_melhorias_melhoria ON public.gargalo_melhorias (melhoria_id);

ALTER TABLE public.gargalo_melhorias ENABLE ROW LEVEL SECURITY;

DO $rls$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='gargalo_melhorias'
      AND policyname='Team members can read gargalo_melhorias'
  ) THEN
    CREATE POLICY "Team members can read gargalo_melhorias"
      ON public.gargalo_melhorias FOR SELECT
      USING (has_role(auth.uid(),'team_member') OR has_role(auth.uid(),'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='gargalo_melhorias'
      AND policyname='Team members can write gargalo_melhorias'
  ) THEN
    CREATE POLICY "Team members can write gargalo_melhorias"
      ON public.gargalo_melhorias FOR ALL
      USING (has_role(auth.uid(),'team_member') OR has_role(auth.uid(),'admin'))
      WITH CHECK (has_role(auth.uid(),'team_member') OR has_role(auth.uid(),'admin'));
  END IF;
END
$rls$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gargalo_melhorias TO authenticated;
GRANT ALL ON public.gargalo_melhorias TO service_role;


-- ─── 2. Limpa gargalos OSG (cascata limpa gargalo_etapas/processos/melhorias) ─
-- Escopo OSG por UUID exato. cluster_id IS NULL (Digital Rotina) NUNCA casa.
DELETE FROM public.gargalos
WHERE cluster_id = '0523512c-f980-4236-8a7c-53e06c9c7a80';


-- ─── 3. INSERT gargalos consolidados (6 eventos + 13 qualidade = 19) ─────────
INSERT INTO public.gargalos (id, nome, descricao, origem, cluster_id, created_at, updated_at)
VALUES
  -- ===== A1 — Gargalos-EVENTO de cascata (origem em gargalo_etapas) =====
  (mapa_uuid('gar-osg-ev-onus'),
   'Imóvel com ônus desloca para o 2º momento',
   'Ônus na matrícula (hipoteca, penhora, alienação fiduciária, bloqueio) impede a integralização imediata: o imóvel é classificado como 2º momento e dispara, quando saneado, uma alteração contratual posterior (AC Imóvel Adicional) + novo registro + atualização cartorial. Não mata o projeto, mas cria uma cascata posterior.',
   'Externo', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('gar-osg-ev-matricula'),
   'Erro de matrícula/limites trava os documentos derivados',
   'Erro na transcrição de limites e confrontações (até um º que vira O) torna a descrição imobiliária inválida e propaga para todos os documentos que a reaproveitam: cláusula 5ª da AC de Integralização, anexo da Parceria e, no cartório, nota devolutiva que obriga uma AC por exigência cartorial.',
   'Processo', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('gar-osg-ev-nova-area'),
   'Nova área / novo imóvel no meio do projeto',
   'Cliente adquire imóvel ou envia matrícula atualizada durante o projeto. Não é mero anexo: reabre o Diagnóstico Patrimonial, recalcula o Capital Social e dispara alterações contratuais e revisão dos anexos agrários — a cascata de 5 a 8 ACs simultâneas em estruturas multi-PJ.',
   'Cliente', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('gar-osg-ev-reforma'),
   'Reforma tributária invalida os cenários de ITCMD',
   'Mudança na base de cálculo do ITCMD (contábil → mercado) invalida os cenários já calculados: o Planejamento de ITCMD precisa ser refeito, a apresentação de sucessão revisada e a doação fica bloqueada até o novo cálculo. Evento externo que envelhece decisões já tomadas.',
   'Externo', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('gar-osg-ev-acordo-doacao'),
   'Acordo de Quotistas pendente condiciona a doação',
   'Em projetos com cláusula de vinculação, a doação só ocorre se o Acordo de Quotistas estiver assinado. Enquanto a assinatura do acordo não acontece, o instrumento de doação fica bloqueado — a governança deixa de ser trilha paralela e vira pré-condição da sucessão.',
   'Cliente', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('gar-osg-ev-conselho'),
   'Criação de conselho dispara AC de governança',
   'A decisão do cliente de criar conselho de administração não é um card isolado: aciona o Regimento Interno do Conselho e uma alteração no Contrato Social das Participações (AC reflexo da governança) com novo registro na Junta.',
   'Cliente', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),

  -- ===== A2 — Gargalos de QUALIDADE / transversais (só gargalo_processos) =====
  (mapa_uuid('gar-osg-q-dp-revisao'),
   'DP sem revisão de par',
   'O Diagnóstico Patrimonial é executado por uma única pessoa, sem segunda leitura obrigatória, e o assistente nem sempre reabre o DP atualizado ao elaborar minutas. Erros de classificação, de titularidade ou de bens não declarados no IR se propagam para todos os documentos derivados.',
   'Processo', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('gar-osg-q-leitura-impedimentos'),
   'Leitura manual de matrícula e impedimentos',
   'A leitura de averbações para detectar ônus e impedimentos é inteiramente manual e o conhecimento dos tipos de impedimento é informal (repassado em treinamento). Quem interrompe a leitura pode marcar como onerado um imóvel cujo ônus já foi cancelado em averbação posterior. Risco amplificado em alto volume.',
   'Processo', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('gar-osg-q-troca-caracteres'),
   'Revisão excessiva e troca de caracteres na minuta',
   'A minuta passa por várias camadas de revisão e a maior parte do esforço é troca de caracteres e ajustes pontuais ("elabora-se pouco, revisa-se muito"). Agravado pela aprovação centralizada de qualquer mudança no modelo-base, sem versionamento estruturado.',
   'Processo', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('gar-osg-q-capital-centavos'),
   'Soma do capital social com erro de centavos',
   'A planilha de Capital Social é montada manualmente em Excel. A soma das quotas pode divergir por casas decimais (arredondamento), e a diferença de centavos é causa frequente de rejeição na Junta Comercial.',
   'Processo', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('gar-osg-q-docs-dispersos'),
   'Documentos e comunicação dispersos sem canal único',
   'DPs e documentos ficam espalhados entre Docbox, e-mail, WhatsApp e Drive, e a comunicação interna/cliente acontece em múltiplos canais sem plataforma única de abertura e rastreamento. Solicitações se perdem e nada dispara tarefa automática quando algo muda.',
   'Processo', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('gar-osg-q-horas-desacopladas'),
   'Lançamento de horas desacoplado da gestão',
   'O lançamento de horas é feito em planilha separada do sistema de gestão de projetos. Sem integração entre OpenProject e o timesheet, o lançamento atrasa, distorce o ROI e mascara o custo real por projeto — incluindo o overhead de gestão (status, cobrança, suporte pós-implementação) historicamente não medido.',
   'Processo', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('gar-osg-q-visibilidade'),
   'Visibilidade insuficiente do andamento dos projetos',
   'O andamento é acompanhado por uma mistura de planilha, agenda pessoal, Slack, OpenProject e ferramentas externas. Não há visão consolidada de status, prazos e alocação de equipe para sócios e seniores.',
   'Processo', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('gar-osg-q-osg-fiscal'),
   'Interface OSG↔Fiscal sem visibilidade',
   'O estudo tributário (planejamento rural e ITCMD) roda na área Fiscal fora do canal padrão da OSG, que depende da devolutiva sem visibilidade do andamento. Some-se a planilha gerencial que o cliente às vezes preenche com finalidade fiscal, obrigando o Fiscal a recontatá-lo para reconciliar.',
   'Processo', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('gar-osg-q-docs-cliente'),
   'Documentos do cliente incompletos ou atrasados',
   'O envio dos documentos preliminares pelo cliente (IR, matrículas, CCIR, IPTU, escrituras, documentos pessoais) é o maior atraso do início do projeto. Sem documentação completa o DP não fecha e todo o trabalho dependente não avança.',
   'Cliente', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),

  -- ===== A2b — Gargalos-raiz do garimpo de docs (reuniões/formulários/ata) =====
  (mapa_uuid('gar-osg-q-sem-biblioteca-clausulas'),
   'Minutas sem biblioteca de cláusulas padronizada',
   'Não há biblioteca versionada de blocos/cláusulas: preâmbulo e cláusulas são redigidos do zero no Word a cada projeto, sem regras de formatação documentadas, e a própria equipe diverge sobre o nível de padronização (notas 3 a 5). É a causa-raiz do retrabalho de revisão.',
   'Processo', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('gar-osg-q-itcmd-manual'),
   'Cálculo de ITCMD manual e variável por UF',
   'Os três cenários de ITCMD (contábil, ITR, mercado) são calculados manualmente em planilha, com alíquotas e regras que variam por estado. Trabalhoso, propenso a erro de arredondamento e difícil de reaproveitar entre projetos.',
   'Processo', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('gar-osg-q-conhecimento-nao-institucionalizado'),
   'Conhecimento e padrões não institucionalizados (SOPs/manuais)',
   'O conhecimento de governança, acordos e protocolos está concentrado em poucas pessoas (sócios pediram "sucessão interna"). Manuais que existem (cadastro no Docbox) não são seguidos por todos, e modelos de governança ainda referenciam uma apresentação de 2022. Falta uma base viva de SOPs/manuais.',
   'Processo', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('gar-osg-q-geracao-manual-osgwork'),
   'Geração manual de documentos no OSG Work (organograma, preâmbulo, PPTX)',
   'Organograma societário (PF/PJ) é montado à mão, o preâmbulo da matrícula é redigido manualmente no Word e as apresentações (PPTX) são re-digitadas a partir do DP — frequentemente de última hora ("noites de virada"), com risco de inconsistência. Tudo poderia ser gerado dos dados estruturados do OSG Work.',
   'Processo', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW());


-- ─── 4. gargalo_etapas — 1 etapa-origem por gargalo-EVENTO (A1) ──────────────
-- A cascata jusante é derivada por BFS a partir destas seeds.
INSERT INTO public.gargalo_etapas (id, gargalo_id, etapa_id, scenario, created_at)
SELECT mapa_uuid('gar-etp-v3-' || m.suffix), m.gargalo_id, m.etapa_id, 'AS-IS', NOW()
FROM (VALUES
  ('onus',          mapa_uuid('gar-osg-ev-onus'),         mapa_uuid('etp-osg-p1-01-08')),  -- classificar integraliza (2º momento)
  ('matricula',     mapa_uuid('gar-osg-ev-matricula'),    mapa_uuid('etp-osg-p1-03-03')),  -- transcrever limites → WP Matrícula
  ('nova-area',     mapa_uuid('gar-osg-ev-nova-area'),    mapa_uuid('etp-osg-p1-02-02')),  -- reabrir DP (produz DP atualizado)
  ('reforma',       mapa_uuid('gar-osg-ev-reforma'),      mapa_uuid('etp-osg-p4-01-04')),  -- calcular cenários ITCMD
  ('acordo-doacao', mapa_uuid('gar-osg-ev-acordo-doacao'),mapa_uuid('etp-osg-p5-02-07')),  -- assinatura do acordo
  ('conselho',      mapa_uuid('gar-osg-ev-conselho'),     mapa_uuid('etp-osg-p5-01-01'))   -- diagnóstico/decisão de governança
) AS m(suffix, gargalo_id, etapa_id);


-- ─── 5. gargalo_processos — vínculo macro (origem dos eventos + footprint A2) ─
INSERT INTO public.gargalo_processos (id, gargalo_id, processo_id, created_at)
SELECT gen_random_uuid(), m.gargalo_id, m.processo_id, NOW()
FROM (VALUES
  -- Eventos: processo de origem (para filtro/agrupamento; footprint é derivado)
  (mapa_uuid('gar-osg-ev-onus'),          mapa_uuid('prc-osg-p1-01')),
  (mapa_uuid('gar-osg-ev-matricula'),     mapa_uuid('prc-osg-p1-03')),
  (mapa_uuid('gar-osg-ev-nova-area'),     mapa_uuid('prc-osg-p1-02')),
  (mapa_uuid('gar-osg-ev-reforma'),       mapa_uuid('prc-osg-p4-01')),
  (mapa_uuid('gar-osg-ev-acordo-doacao'), mapa_uuid('prc-osg-p5-02')),
  (mapa_uuid('gar-osg-ev-conselho'),      mapa_uuid('prc-osg-p5-01')),
  -- Q1 DP sem revisão
  (mapa_uuid('gar-osg-q-dp-revisao'),     mapa_uuid('prc-osg-p1-01')),
  (mapa_uuid('gar-osg-q-dp-revisao'),     mapa_uuid('prc-osg-p1-02')),
  -- Q2 leitura/impedimentos
  (mapa_uuid('gar-osg-q-leitura-impedimentos'), mapa_uuid('prc-osg-p1-01')),
  (mapa_uuid('gar-osg-q-leitura-impedimentos'), mapa_uuid('prc-osg-p1-03')),
  -- Q3 troca de caracteres (padrão societário + doação + governança)
  (mapa_uuid('gar-osg-q-troca-caracteres'), mapa_uuid('prc-osg-p2-01')),
  (mapa_uuid('gar-osg-q-troca-caracteres'), mapa_uuid('prc-osg-p2-02')),
  (mapa_uuid('gar-osg-q-troca-caracteres'), mapa_uuid('prc-osg-p2-04')),
  (mapa_uuid('gar-osg-q-troca-caracteres'), mapa_uuid('prc-osg-p2-05')),
  (mapa_uuid('gar-osg-q-troca-caracteres'), mapa_uuid('prc-osg-p3-03')),
  (mapa_uuid('gar-osg-q-troca-caracteres'), mapa_uuid('prc-osg-p4-03')),
  (mapa_uuid('gar-osg-q-troca-caracteres'), mapa_uuid('prc-osg-p5-02')),
  -- Q4 capital centavos
  (mapa_uuid('gar-osg-q-capital-centavos'), mapa_uuid('prc-osg-p1-04')),
  (mapa_uuid('gar-osg-q-capital-centavos'), mapa_uuid('prc-osg-p2-01')),
  -- Q5 docs dispersos
  (mapa_uuid('gar-osg-q-docs-dispersos'), mapa_uuid('prc-osg-p6-01')),
  (mapa_uuid('gar-osg-q-docs-dispersos'), mapa_uuid('prc-osg-p6-05')),
  -- Q6 horas desacopladas
  (mapa_uuid('gar-osg-q-horas-desacopladas'), mapa_uuid('prc-osg-p6-05')),
  -- Q7 visibilidade
  (mapa_uuid('gar-osg-q-visibilidade'), mapa_uuid('prc-osg-p6-05')),
  (mapa_uuid('gar-osg-q-visibilidade'), mapa_uuid('prc-osg-p6-01')),
  -- Q8 OSG↔Fiscal
  (mapa_uuid('gar-osg-q-osg-fiscal'), mapa_uuid('prc-osg-p3-01')),
  (mapa_uuid('gar-osg-q-osg-fiscal'), mapa_uuid('prc-osg-p4-01')),
  -- Q9 docs do cliente
  (mapa_uuid('gar-osg-q-docs-cliente'), mapa_uuid('prc-osg-p6-01')),
  (mapa_uuid('gar-osg-q-docs-cliente'), mapa_uuid('prc-osg-p1-01')),
  -- Q10 sem biblioteca de cláusulas (processos de minuta)
  (mapa_uuid('gar-osg-q-sem-biblioteca-clausulas'), mapa_uuid('prc-osg-p2-01')),
  (mapa_uuid('gar-osg-q-sem-biblioteca-clausulas'), mapa_uuid('prc-osg-p2-02')),
  (mapa_uuid('gar-osg-q-sem-biblioteca-clausulas'), mapa_uuid('prc-osg-p2-04')),
  (mapa_uuid('gar-osg-q-sem-biblioteca-clausulas'), mapa_uuid('prc-osg-p2-05')),
  (mapa_uuid('gar-osg-q-sem-biblioteca-clausulas'), mapa_uuid('prc-osg-p3-03')),
  (mapa_uuid('gar-osg-q-sem-biblioteca-clausulas'), mapa_uuid('prc-osg-p4-03')),
  (mapa_uuid('gar-osg-q-sem-biblioteca-clausulas'), mapa_uuid('prc-osg-p5-02')),
  -- Q11 ITCMD manual
  (mapa_uuid('gar-osg-q-itcmd-manual'), mapa_uuid('prc-osg-p4-01')),
  -- Q12 conhecimento/padrões não institucionalizados (governança + cadastro)
  (mapa_uuid('gar-osg-q-conhecimento-nao-institucionalizado'), mapa_uuid('prc-osg-p5-01')),
  (mapa_uuid('gar-osg-q-conhecimento-nao-institucionalizado'), mapa_uuid('prc-osg-p5-02')),
  (mapa_uuid('gar-osg-q-conhecimento-nao-institucionalizado'), mapa_uuid('prc-osg-p6-01')),
  -- Q13 geração manual OSG Work (DP/organograma, apresentações)
  (mapa_uuid('gar-osg-q-geracao-manual-osgwork'), mapa_uuid('prc-osg-p1-01')),
  (mapa_uuid('gar-osg-q-geracao-manual-osgwork'), mapa_uuid('prc-osg-p4-02')),
  (mapa_uuid('gar-osg-q-geracao-manual-osgwork'), mapa_uuid('prc-osg-p6-03'))
) AS m(gargalo_id, processo_id);


-- ─── 6. etapa_documentos — completa o doc-chain p/ os eventos derivarem ──────
-- Sem estas arestas, a BFS de E4/E5/E6 não alcança o footprint esperado.
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume, created_at)
SELECT gen_random_uuid(), v.etapa_id, 'AS-IS', v.documento_id, 'entrada', NULL, NOW()
FROM (VALUES
  -- E5: doação só assina após o Acordo de Quotistas assinado
  (mapa_uuid('etp-osg-p4-03-08'), mapa_uuid('doc-osg-acordo-quotistas-assinado')),
  -- E6: Regimento do Conselho usa o diagnóstico de governança
  (mapa_uuid('etp-osg-p5-05-01'), mapa_uuid('doc-osg-questionario-gov')),
  -- E6: AC reflexo de governança consome o Regimento do Conselho
  (mapa_uuid('etp-osg-p5-06-02'), mapa_uuid('doc-osg-regimento-conselho')),
  -- E4: minuta de doação usa o cenário de ITCMD escolhido
  (mapa_uuid('etp-osg-p4-03-01'), mapa_uuid('doc-osg-planilha-itcmd'))
) AS v(etapa_id, documento_id)
WHERE NOT EXISTS (
  SELECT 1 FROM public.etapa_documentos ed
  WHERE ed.etapa_id = v.etapa_id
    AND ed.documento_id = v.documento_id
    AND ed.scenario = 'AS-IS'
    AND ed.sentido = 'entrada'
);


-- ─── 7. Renomear/realinhar melhorias (UPDATE por slug OSG — sem deletar) ─────
-- Preserva melhoria_acoes_td / melhoria_sistemas / melhoria_responsaveis.
UPDATE public.process_improvements SET improvement_description =
  'DP Inteligente — plataforma de Diagnóstico Patrimonial com extração assistida (matrícula, IR, CCIR/IPTU), validação cruzada obrigatória entre fontes, gate de revisão por par antes de fechar o DP e trilha de alterações por usuário/data. Reduz a propagação de erros do DP em cascata.'
  WHERE id = mapa_uuid('mel-osg-dp-inteligente');
UPDATE public.process_improvements SET improvement_description =
  'Biblioteca de Cláusulas — blocos canônicos versionados (descrição de limites/confrontações, cláusula 5ª de capital, cláusula 7ª de cessão) mantidos uma única vez e reusados na composição de CS Agro, CS Participações, ACs, Parceria, Composse, Doação e Acordo de Quotistas. Cada bloco é aprovado pela gerência e versionado. Corta a revisão e a troca de caracteres.'
  WHERE id = mapa_uuid('mel-osg-biblioteca-clausulas');
UPDATE public.process_improvements SET improvement_description =
  'Integração Horas ↔ OpenProject — o lançamento de horas é disparado automaticamente pela criação/movimentação de tarefa (via n8n). Acopla a gestão de projetos à medição de horas e ao ROI.'
  WHERE id = mapa_uuid('mel-osg-integracao-horas-openproject');
UPDATE public.process_improvements SET improvement_description =
  'Hub + Portal do Cliente — upload único do cliente com checklist do que falta e SLA por pendência, e dashboard de gestão (cronograma, custos, horas, prazos vencidos, evolução por projeto, gargalos) reaproveitando a gestão de projetos do Fiscal. Substitui a dispersão entre Docbox, e-mail, WhatsApp e Drive.'
  WHERE id = mapa_uuid('mel-osg-hub-lovable-portal-cliente');
UPDATE public.process_improvements SET improvement_description =
  'Google Workspace Unificado — Drive, Chat, Docs e Meet como substrato único de comunicação e armazenamento da OSG, com integração ao Lovable para notificações de tarefa e suporte às IAs corporativas (Gemini, NotebookLM, Claude).'
  WHERE id = mapa_uuid('mel-osg-google-workspace-unificado');
UPDATE public.process_improvements SET improvement_description =
  'Calculadora de ITCMD — mini-app que lê o DP e calcula os três cenários (contábil, ITR e mercado) com alíquotas parametrizadas por UF. Saída em PowerPoint padronizado e bloco de texto pronto para a AC reflexo da doação.'
  WHERE id = mapa_uuid('mel-osg-calculadora-itcmd');
UPDATE public.process_improvements SET improvement_description =
  'Calculadora de Capital Social — lê o DP, soma por sócio com arredondamento padronizado e valida contra as regras de cada Junta Comercial. Saída em Excel padronizado e texto pronto para a cláusula 5ª do CS Agro.'
  WHERE id = mapa_uuid('mel-osg-calculadora-capital-social');
UPDATE public.process_improvements SET improvement_description =
  'Checklist de Impedimentos — template padrão com os tipos canônicos de impedimento de matrícula (hipoteca, penhora, alienação fiduciária, bloqueio judicial) e marcação obrigatória durante a leitura ponta a ponta. Formaliza o conhecimento antes repassado informalmente.'
  WHERE id = mapa_uuid('mel-osg-checklist-impedimentos-formalizado');
UPDATE public.process_improvements SET improvement_description =
  'Protocolo OSG–Fiscal — interface padronizada entre OSG, Fiscal e Consultoria: agenda integrada, pasta única por cliente e gatilho automático quando uma mudança no DP exige nova revisão tributária/sucessória. Dá visibilidade bidirecional do andamento.'
  WHERE id = mapa_uuid('mel-osg-protocolo-osg-fiscal');
UPDATE public.process_improvements SET improvement_description =
  'Dashboard de Cascata — ao detectar um evento (imóvel com ônus, erro de matrícula, nova área, reforma tributária, acordo pendente, criação de conselho), o sistema lista automaticamente quais alterações contratuais, anexos agrários e ACs de governança precisam ser atualizados. Torna a cascata rastreável.'
  WHERE id = mapa_uuid('mel-osg-dashboard-cascata-rastreavel');


-- ─── 7b. Melhorias NOVAS (pernas (c) SOPs/manuais e (a) geradores OSG Work) ──
-- Justificadas pelo garimpo dos docs (conhecimento concentrado, padrões não
-- seguidos, geração manual de organograma/preâmbulo/PPTX) — gaps que as 10
-- melhorias anteriores não cobriam.
INSERT INTO public.process_improvements
  (id, process_id, cluster_id, improvement_description, improvement_status, evaluation_status, created_at, updated_at)
VALUES
  (mapa_uuid('mel-osg-biblioteca-sops-manuais'), mapa_uuid('prc-osg-p5-01'), '0523512c-f980-4236-8a7c-53e06c9c7a80',
   'Biblioteca de SOPs e Manuais (MAPA) — base viva de procedimentos-padrão: manuais por UF/Junta Comercial, modelos de governança versionados e o padrão de cadastro/salvamento, institucionalizando o conhecimento hoje concentrado em poucas pessoas e destravando seniores. Ataca a dependência de pessoas-chave e a não-adesão aos padrões existentes.',
   'Não iniciado', 'Não avaliado', NOW(), NOW()),
  (mapa_uuid('mel-osg-geradores-osg-work'), mapa_uuid('prc-osg-p1-01'), '0523512c-f980-4236-8a7c-53e06c9c7a80',
   'Geradores do OSG Work — geração assistida, a partir dos dados estruturados do OSG Work, de: organograma societário (PF e PJ), preâmbulo da matrícula e apresentações (PPTX) sincronizadas com o DP. Elimina a re-digitação manual e as "noites de virada" de apresentações de última hora.',
   'Não iniciado', 'Não avaliado', NOW(), NOW());

INSERT INTO public.melhoria_acoes_td (id, melhoria_id, acao_td, ordem, created_at)
VALUES
  (gen_random_uuid(), mapa_uuid('mel-osg-biblioteca-sops-manuais'), 'Documentar',  1, NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-biblioteca-sops-manuais'), 'Padronizar',  2, NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-biblioteca-sops-manuais'), 'Treinar',     3, NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-geradores-osg-work'),      'Automatizar', 1, NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-geradores-osg-work'),      'Padronizar',  2, NOW());

INSERT INTO public.melhoria_processos (id, melhoria_id, processo_id, created_at)
VALUES
  (gen_random_uuid(), mapa_uuid('mel-osg-biblioteca-sops-manuais'), mapa_uuid('prc-osg-p5-02'), NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-biblioteca-sops-manuais'), mapa_uuid('prc-osg-p6-01'), NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-geradores-osg-work'),      mapa_uuid('prc-osg-p4-02'), NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-geradores-osg-work'),      mapa_uuid('prc-osg-p6-03'), NOW());


-- ─── 8. gargalo_melhorias — vínculo N:M (cada gargalo tem ≥1 melhoria) ───────
INSERT INTO public.gargalo_melhorias (id, gargalo_id, melhoria_id, created_at)
SELECT gen_random_uuid(), m.gargalo_id, m.melhoria_id, NOW()
FROM (VALUES
  -- Eventos
  (mapa_uuid('gar-osg-ev-onus'),          mapa_uuid('mel-osg-dashboard-cascata-rastreavel')),
  (mapa_uuid('gar-osg-ev-onus'),          mapa_uuid('mel-osg-dp-inteligente')),
  (mapa_uuid('gar-osg-ev-matricula'),     mapa_uuid('mel-osg-dp-inteligente')),
  (mapa_uuid('gar-osg-ev-matricula'),     mapa_uuid('mel-osg-biblioteca-clausulas')),
  (mapa_uuid('gar-osg-ev-matricula'),     mapa_uuid('mel-osg-dashboard-cascata-rastreavel')),
  (mapa_uuid('gar-osg-ev-nova-area'),     mapa_uuid('mel-osg-dashboard-cascata-rastreavel')),
  (mapa_uuid('gar-osg-ev-nova-area'),     mapa_uuid('mel-osg-dp-inteligente')),
  (mapa_uuid('gar-osg-ev-reforma'),       mapa_uuid('mel-osg-calculadora-itcmd')),
  (mapa_uuid('gar-osg-ev-reforma'),       mapa_uuid('mel-osg-dashboard-cascata-rastreavel')),
  (mapa_uuid('gar-osg-ev-acordo-doacao'), mapa_uuid('mel-osg-dashboard-cascata-rastreavel')),
  (mapa_uuid('gar-osg-ev-acordo-doacao'), mapa_uuid('mel-osg-biblioteca-clausulas')),
  (mapa_uuid('gar-osg-ev-conselho'),      mapa_uuid('mel-osg-dashboard-cascata-rastreavel')),
  (mapa_uuid('gar-osg-ev-conselho'),      mapa_uuid('mel-osg-biblioteca-clausulas')),
  -- Qualidade
  (mapa_uuid('gar-osg-q-dp-revisao'),           mapa_uuid('mel-osg-dp-inteligente')),
  (mapa_uuid('gar-osg-q-leitura-impedimentos'), mapa_uuid('mel-osg-dp-inteligente')),
  (mapa_uuid('gar-osg-q-leitura-impedimentos'), mapa_uuid('mel-osg-checklist-impedimentos-formalizado')),
  (mapa_uuid('gar-osg-q-troca-caracteres'),     mapa_uuid('mel-osg-biblioteca-clausulas')),
  (mapa_uuid('gar-osg-q-capital-centavos'),     mapa_uuid('mel-osg-calculadora-capital-social')),
  (mapa_uuid('gar-osg-q-docs-dispersos'),       mapa_uuid('mel-osg-hub-lovable-portal-cliente')),
  (mapa_uuid('gar-osg-q-docs-dispersos'),       mapa_uuid('mel-osg-google-workspace-unificado')),
  (mapa_uuid('gar-osg-q-horas-desacopladas'),   mapa_uuid('mel-osg-integracao-horas-openproject')),
  (mapa_uuid('gar-osg-q-visibilidade'),         mapa_uuid('mel-osg-hub-lovable-portal-cliente')),
  (mapa_uuid('gar-osg-q-osg-fiscal'),           mapa_uuid('mel-osg-protocolo-osg-fiscal')),
  (mapa_uuid('gar-osg-q-docs-cliente'),         mapa_uuid('mel-osg-hub-lovable-portal-cliente')),
  (mapa_uuid('gar-osg-q-docs-cliente'),         mapa_uuid('mel-osg-google-workspace-unificado')),
  -- Gargalos-raiz novos
  (mapa_uuid('gar-osg-q-sem-biblioteca-clausulas'),            mapa_uuid('mel-osg-biblioteca-clausulas')),
  (mapa_uuid('gar-osg-q-sem-biblioteca-clausulas'),            mapa_uuid('mel-osg-biblioteca-sops-manuais')),
  (mapa_uuid('gar-osg-q-itcmd-manual'),                        mapa_uuid('mel-osg-calculadora-itcmd')),
  (mapa_uuid('gar-osg-q-conhecimento-nao-institucionalizado'), mapa_uuid('mel-osg-biblioteca-sops-manuais')),
  (mapa_uuid('gar-osg-q-geracao-manual-osgwork'),              mapa_uuid('mel-osg-geradores-osg-work')),
  (mapa_uuid('gar-osg-q-geracao-manual-osgwork'),              mapa_uuid('mel-osg-dp-inteligente'))
) AS m(gargalo_id, melhoria_id);


-- ============================================================================
-- 9. VALIDAÇÃO
-- ============================================================================
DO $validate$
DECLARE
  v_osg               text := '0523512c-f980-4236-8a7c-53e06c9c7a80';
  v_total_garg        integer;
  v_eventos           integer;
  v_etapa_origens     integer;
  v_multi_origem      integer;
  v_orphan_etp        integer;
  v_sem_melhoria      integer;
  v_dr_garg_now       integer;
  v_dr_garg_before    integer;
  v_dr_mel_now        integer;
  v_dr_mel_before     integer;
BEGIN
  SELECT count(*) INTO v_total_garg FROM public.gargalos WHERE cluster_id = v_osg;

  -- Cada gargalo-EVENTO (A1) tem exatamente 1 etapa-origem; qualidade (A2) zero.
  SELECT count(*) INTO v_eventos
  FROM public.gargalos g
  WHERE g.cluster_id = v_osg
    AND EXISTS (SELECT 1 FROM public.gargalo_etapas ge WHERE ge.gargalo_id = g.id);

  SELECT count(*) INTO v_etapa_origens
  FROM public.gargalo_etapas ge
  WHERE ge.gargalo_id IN (SELECT id FROM public.gargalos WHERE cluster_id = v_osg);

  SELECT count(*) INTO v_multi_origem
  FROM (
    SELECT gargalo_id FROM public.gargalo_etapas
    WHERE gargalo_id IN (SELECT id FROM public.gargalos WHERE cluster_id = v_osg)
    GROUP BY gargalo_id HAVING count(*) > 1
  ) AS x;

  -- FK órfã etapa_id+scenario
  SELECT count(*) INTO v_orphan_etp
  FROM public.gargalo_etapas ge
  WHERE ge.gargalo_id IN (SELECT id FROM public.gargalos WHERE cluster_id = v_osg)
    AND NOT EXISTS (
      SELECT 1 FROM public.process_stages ps
      WHERE ps.id = ge.etapa_id AND ps.scenario = ge.scenario
    );

  -- Todo gargalo OSG com ≥1 melhoria
  SELECT count(*) INTO v_sem_melhoria
  FROM public.gargalos g
  WHERE g.cluster_id = v_osg
    AND NOT EXISTS (SELECT 1 FROM public.gargalo_melhorias gm WHERE gm.gargalo_id = g.id);

  -- Guarda Digital Rotina (cluster_id NULL) inalterada
  SELECT n INTO v_dr_garg_before FROM _dr_before WHERE tabela = 'gargalos';
  SELECT n INTO v_dr_mel_before  FROM _dr_before WHERE tabela = 'process_improvements';
  SELECT count(*) INTO v_dr_garg_now FROM public.gargalos WHERE cluster_id IS NULL;
  SELECT count(*) INTO v_dr_mel_now  FROM public.process_improvements WHERE cluster_id IS NULL;

  RAISE NOTICE 'OSG gargalos: % (eventos com origem: %, etapa-origens: %)', v_total_garg, v_eventos, v_etapa_origens;

  IF v_total_garg <> 19 THEN
    RAISE EXCEPTION 'Esperados 19 gargalos OSG (6 eventos + 13 qualidade), encontrados %.', v_total_garg;
  END IF;
  IF v_eventos <> 6 OR v_etapa_origens <> 6 THEN
    RAISE EXCEPTION 'Esperados 6 gargalos-evento com 1 etapa-origem cada (eventos=%, origens=%).', v_eventos, v_etapa_origens;
  END IF;
  IF v_multi_origem > 0 THEN
    RAISE EXCEPTION 'Invariante violada: % gargalo(s) com mais de 1 etapa-origem.', v_multi_origem;
  END IF;
  IF v_orphan_etp > 0 THEN
    RAISE EXCEPTION 'FK órfã: % etapa-origem apontando para etapa inexistente.', v_orphan_etp;
  END IF;
  IF v_sem_melhoria > 0 THEN
    RAISE EXCEPTION '% gargalo(s) OSG sem melhoria vinculada.', v_sem_melhoria;
  END IF;
  IF v_dr_garg_now <> v_dr_garg_before THEN
    RAISE EXCEPTION 'REGRESSÃO Digital Rotina: gargalos cluster_id NULL mudou de % para %.', v_dr_garg_before, v_dr_garg_now;
  END IF;
  IF v_dr_mel_now <> v_dr_mel_before THEN
    RAISE EXCEPTION 'REGRESSÃO Digital Rotina: process_improvements cluster_id NULL mudou de % para %.', v_dr_mel_before, v_dr_mel_now;
  END IF;
END
$validate$;

COMMIT;
