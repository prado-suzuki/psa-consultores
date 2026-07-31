# Mapa do Banco — PSA Consultores

> **Gerado automaticamente** a partir de `src/integrations/supabase/types.ts` (autogerado pelo Supabase).
> Nao editar `types.ts` a mao. Regenerar este mapa: `node scripts/gen-mapa-banco.mjs`.
> **Regra:** para consultar o schema, use ESTE arquivo — **nunca** leia `types.ts` inteiro.
> **Acesso (RLS):** a coluna "Acesso" resume "quem acessa" via arquetipos (ver legenda). Reconstruido do `pg_policies` vivo; para o texto exato de uma policy, ver `supabase/migrations`.

**135 tabelas** de negocio · 1 de backup (ignorar) · 28 enums.
Tipos sao TS (`string`/`number`/`boolean`/`Json`); `?` = nullable.

## Convencoes (do CLAUDE.md)
- **Multi-ambiente:** tabelas com flag `ambiente` exigem `.eq('ambiente', currentAmbiente)`.
- **Soft delete:** tabelas com flag `excluido` exigem `.eq('excluido', false)` na leitura.
- **Papeis (roles):** vivem SO em `user_roles` — nunca em `profiles` nem storage local.
- **FK:** referencie `profiles.id` como proxy de usuario — nunca `auth.users` direto.

## Acesso (RLS) — legenda dos arquetipos
- **interno:** time interno (team_member ou acima) ve e opera; admin gerencia. Externos nao acessam.
- **cluster-cliente:** isolado por cluster do cliente (`cliente_visivel_para`).
- **cluster-fiscal:** escopo por contribuinte (`can_view_contribuinte`).
- **cluster-mapa:** isolado por cluster de processos/OSG (`mapa_cluster_visivel` / `resolve_user_cluster_ids`).
- **projeto:** membros do projeto/area (`is_project_member` / `can_view_org_project` / `org_task_visivel`).
- **sprint:** conforme a sprint/cluster (`sprint_visivel` / `is_membro_digital`).
- **desempenho:** modulo de avaliacao: lider gerencia, membro ve o que lhe cabe.
- **chamados:** chamado: interno + o cliente do chamado (`can_view_ticket`; `tickets` tambem role `client`).
- **proprio-usuario:** cada usuario so as proprias linhas (`auth.uid()`); admin quando aplicavel.
- **catalogo:** catalogo/estrutura: leitura interna ampla; escrita restrita (admin/lider).
- **publico:** aberto a nao autenticados (ex.: formulario de contato).
- **admin:** somente admin.

## Funcoes SECURITY DEFINER (checagem de acesso em RLS)
`has_role()` · `has_role_or_higher()` · `is_project_member()` · `is_area_member()` · `is_membro_digital()` · `can_perform()` · `can_view_contribuinte()` · `can_view_org_project()` · `can_view_ticket()` · `cliente_visivel_para()` · `resolve_user_cliente_id()` · `resolve_user_cluster_ids()` · `get_clusters_do_cliente_atual()` · `mapa_cluster_visivel()` · `mapa_cluster_gerenciavel()` · `org_task_visivel()` · `sprint_visivel()` · `user_estrutura_area_ids()` · `user_estrutura_equipe_ids()`

---

## Indice de tabelas

| Tabela | Cols | Flags | Acesso | Referencia (FK →) |
|---|---|---|---|---|
| [`access_change_log`](#accesschangelog) | 8 | — | interno | — |
| [`administracao`](#administracao) | 11 | — | interno | pessoa, profiles |
| [`analises_semestrais`](#analisessemestrais) | 11 | — | desempenho | ciclos_avaliacao |
| [`area_servicos`](#areaservicos) | 3 | — | catalogo | estrutura_areas, servicos_prestados |
| [`atualizacoes_meta`](#atualizacoesmeta) | 7 | — | desempenho | metas |
| [`audit_logs`](#auditlogs) | 10 | — | interno | — |
| [`bem`](#bem) | 24 | — | cluster-cliente | cliente, profiles, pessoa |
| [`capital_integralizacao`](#capitalintegralizacao) | 16 | — | cluster-cliente | bem, cliente, profiles, pessoa |
| [`cartorio`](#cartorio) | 8 | — | interno | profiles |
| [`catalog_clients`](#catalogclients) | 9 | — | interno | estrutura_areas |
| [`centros_custo`](#centroscusto) | 5 | — | catalogo | — |
| [`checklist_cliente_item`](#checklistclienteitem) | 21 | — | cluster-cliente | bem, cliente, checklist_item_padrao, matricula, pessoa |
| [`checklist_item_padrao`](#checklistitempadrao) | 17 | — | interno | — |
| [`ciclos_avaliacao`](#ciclosavaliacao) | 10 | — | desempenho | — |
| [`client_documents`](#clientdocuments) | 12 | — | interno | — |
| [`client_visible_projects`](#clientvisibleprojects) | 7 | — | interno | projects |
| [`cliente`](#cliente) | 13 | ambiente, excluido | cluster-cliente | — |
| [`cliente_clusters`](#clienteclusters) | 4 | — | catalogo | cliente, estrutura_clusters |
| [`codigo_receita`](#codigoreceita) | 6 | — | catalogo | grupo_tributo |
| [`comentarios_avaliacao`](#comentariosavaliacao) | 11 | — | desempenho | ciclos_avaliacao |
| [`contatos`](#contatos) | 14 | — | publico | — |
| [`contribuinte`](#contribuinte) | 25 | ambiente, excluido | cluster-cliente | cliente, setor_cliente |
| [`contribuinte_bal_config`](#contribuintebalconfig) | 5 | — | interno | contribuinte |
| [`correcoes_icms`](#correcoesicms) | 13 | ambiente, excluido | cluster-fiscal | — |
| [`daily_standups`](#dailystandups) | 12 | — | sprint | sprint_deliverables, processes, projects, sprints |
| [`dashboard_cliente_access`](#dashboardclienteaccess) | 5 | — | interno | cliente, profiles, dashboards |
| [`dashboard_cluster_access`](#dashboardclusteraccess) | 5 | — | interno | estrutura_clusters, profiles, dashboards |
| [`dashboards`](#dashboards) | 15 | — | interno | profiles |
| [`dcomp`](#dcomp) | 10 | — | cluster-fiscal | dcomp, per, per_with_contribuinte |
| [`deliverable_attachments`](#deliverableattachments) | 8 | — | sprint | sprint_deliverables |
| [`demand_items`](#demanditems) | 10 | — | sprint | routines |
| [`difal_decisao`](#difaldecisao) | 6 | — | cluster-cliente | difal_sessao |
| [`difal_sessao`](#difalsessao) | 10 | — | cluster-cliente | — |
| [`distribuicao_dcomp`](#distribuicaodcomp) | 12 | — | cluster-fiscal | codigo_receita, grupo_tributo, dcomp |
| [`distribuicao_receita`](#distribuicaoreceita) | 6 | excluido | cluster-cliente | centros_custo, ordem_servico |
| [`documento_arquivo`](#documentoarquivo) | 24 | ambiente, excluido | interno | bem, checklist_cliente_item, cliente, documento_gerado, matricula, pessoa |
| [`documento_gerado`](#documentogerado) | 19 | — | interno | cliente, profiles, documento_gerado, tmpl_documento, pessoa |
| [`documento_horas_historico`](#documentohorashistorico) | 6 | — | interno | documentos_processo |
| [`documento_notificacao_visto`](#documentonotificacaovisto) | 3 | — | proprio-usuario | documento_gerado, profiles |
| [`documento_override`](#documentooverride) | 11 | — | interno | tmpl_bloco, profiles, documento_gerado |
| [`documentos_processo`](#documentosprocesso) | 13 | — | cluster-mapa | documentos_processo, estrutura_clusters |
| [`documents`](#documents) | 8 | — | interno | tickets |
| [`efd_correcoes`](#efdcorrecoes) | 19 | — | cluster-cliente | — |
| [`estrutura_areas`](#estruturaareas) | 10 | — | catalogo | estrutura_clusters, centros_custo, profiles |
| [`estrutura_clusters`](#estruturaclusters) | 8 | — | catalogo | centros_custo |
| [`estrutura_equipe_membros`](#estruturaequipemembros) | 4 | — | catalogo | estrutura_equipes, profiles |
| [`estrutura_equipes`](#estruturaequipes) | 6 | — | catalogo | estrutura_areas, profiles |
| [`etapa_documentos`](#etapadocumentos) | 7 | — | cluster-mapa | documentos_processo, process_stages |
| [`etapa_responsaveis`](#etaparesponsaveis) | 7 | — | cluster-mapa | process_stages, job_roles |
| [`etapa_sistemas`](#etapasistemas) | 6 | — | cluster-mapa | process_stages, sistemas_processo |
| [`exploracao_rural`](#exploracaorural) | 25 | — | cluster-cliente | bem, cliente, pessoa |
| [`export_profiles`](#exportprofiles) | 8 | — | proprio-usuario | — |
| [`feedbacks`](#feedbacks) | 11 | — | desempenho | ciclos_avaliacao |
| [`gargalo_etapas`](#gargaloetapas) | 5 | — | cluster-mapa | process_stages, gargalos |
| [`gargalo_melhorias`](#gargalomelhorias) | 4 | — | cluster-mapa | gargalos, process_improvements |
| [`gargalo_processos`](#gargaloprocessos) | 4 | — | cluster-mapa | gargalos, processes |
| [`gargalo_responsaveis`](#gargaloresponsaveis) | 5 | — | cluster-mapa | gargalos, job_roles |
| [`gargalos`](#gargalos) | 13 | — | cluster-mapa | estrutura_clusters, process_improvements |
| [`grupo_tributo`](#grupotributo) | 5 | — | catalogo | — |
| [`impedimento`](#impedimento) | 17 | — | interno | profiles, pessoa, matricula |
| [`improvement_savings_details`](#improvementsavingsdetails) | 9 | — | interno | process_improvements |
| [`improvement_team_members`](#improvementteammembers) | 7 | — | interno | process_improvements, job_roles, profiles |
| [`inscricao_contribuinte`](#inscricaocontribuinte) | 7 | — | cluster-fiscal | contribuinte |
| [`itens_acao_1a1`](#itensacao1a1) | 8 | — | desempenho | reunioes_1a1 |
| [`job_roles`](#jobroles) | 10 | — | catalogo | estrutura_clusters |
| [`kpis_meta`](#kpismeta) | 9 | — | desempenho | metas |
| [`matricula`](#matricula) | 32 | — | cluster-cliente | bem, cartorio, profiles, matricula |
| [`melhoria_acoes_td`](#melhoriaacoestd) | 5 | — | cluster-mapa | process_improvements |
| [`melhoria_processos`](#melhoriaprocessos) | 4 | — | cluster-mapa | process_improvements, processes |
| [`melhoria_responsaveis`](#melhoriaresponsaveis) | 6 | — | cluster-mapa | process_improvements, job_roles |
| [`melhoria_sistemas`](#melhoriasistemas) | 5 | — | cluster-mapa | process_improvements, sistemas_processo |
| [`metas`](#metas) | 22 | — | desempenho | ciclos_avaliacao, metas |
| [`novidades`](#novidades) | 17 | — | interno | — |
| [`ordem_servico`](#ordemservico) | 20 | excluido | cluster-cliente | estrutura_clusters, produto_segmento, servicos_prestados, setor_cliente |
| [`org_comment_attachments`](#orgcommentattachments) | 10 | — | interno | org_comments, org_comments_feed, profiles |
| [`org_comment_mentions`](#orgcommentmentions) | 6 | — | interno | org_comments, org_comments_feed, profiles |
| [`org_comments`](#orgcomments) | 16 | excluido | interno | profiles, org_comments, org_comments_feed, org_projects |
| [`org_project_members`](#orgprojectmembers) | 5 | — | projeto | org_projects |
| [`org_projects`](#orgprojects) | 19 | — | projeto | profiles, estrutura_equipes, estrutura_areas, ordem_servico, servicos_prestados |
| [`org_task_comments`](#orgtaskcomments) | 7 | — | projeto | org_tasks, profiles |
| [`org_tasks`](#orgtasks) | 24 | — | projeto | profiles, servicos_prestados, cliente, contribuinte, org_tasks, org_projects |
| [`os_produtos_contratados`](#osprodutoscontratados) | 5 | — | cluster-cliente | ordem_servico, produto_segmento |
| [`page_permissions`](#pagepermissions) | 10 | — | catalogo | — |
| [`parentesco`](#parentesco) | 9 | — | cluster-cliente | profiles, pessoa |
| [`per`](#per) | 15 | — | cluster-fiscal | per, per_with_contribuinte |
| [`per_situacao`](#persituacao) | 6 | — | cluster-fiscal | per, per_with_contribuinte |
| [`performance_preferencias`](#performancepreferencias) | 7 | — | proprio-usuario | — |
| [`pessoa`](#pessoa) | 41 | — | cluster-cliente | cliente, pessoa, contribuinte, profiles |
| [`pis_cofins_class`](#piscofinsclass) | 8 | — | catalogo | profiles, contribuinte, pis_cofins_regra |
| [`pis_cofins_regra`](#piscofinsregra) | 15 | — | catalogo | — |
| [`ppr_regras_ciclo`](#pprregrasciclo) | 8 | — | desempenho | ciclos_avaliacao |
| [`procedimentos`](#procedimentos) | 19 | — | interno | — |
| [`process_improvements`](#processimprovements) | 36 | — | cluster-mapa | estrutura_clusters, profiles, processes, projects, sprint_deliverables |
| [`process_scenarios`](#processscenarios) | 28 | — | interno | profiles, process_improvements, process_scenarios, processes, projects |
| [`process_stages`](#processstages) | 27 | — | cluster-mapa | job_roles, processes |
| [`processes`](#processes) | 42 | — | cluster-mapa | catalog_clients, estrutura_clusters, estrutura_equipes, projects |
| [`produto_segmento`](#produtosegmento) | 6 | — | catalogo | estrutura_clusters |
| [`produto_servico`](#produtoservico) | 3 | — | catalogo | produto_segmento, servicos_prestados |
| [`profiles`](#profiles) | 11 | — | proprio-usuario | — |
| [`project_documents`](#projectdocuments) | 13 | — | interno | processes, sprints, profiles |
| [`project_processes`](#projectprocesses) | 6 | — | interno | processes, projects |
| [`project_servicos`](#projectservicos) | 3 | — | interno | org_projects, servicos_prestados |
| [`projects`](#projects) | 21 | — | interno | catalog_clients, estrutura_clusters, estrutura_equipes, cliente, profiles |
| [`projeto_flag_valor`](#projetoflagvalor) | 10 | — | interno | cliente, profiles, tmpl_flag, pessoa |
| [`projeto_justificativas`](#projetojustificativas) | 5 | — | cluster-mapa | projects |
| [`quadro_societario`](#quadrosocietario) | 11 | — | cluster-cliente | profiles, pessoa |
| [`relatorios_gerados`](#relatoriosgerados) | 8 | — | interno | ciclos_avaliacao |
| [`representante`](#representante) | 13 | excluido | interno | cliente |
| [`reunioes_1a1`](#reunioes1a1) | 10 | — | desempenho | ciclos_avaliacao |
| [`rls_precheck_allowed_tables`](#rlsprecheckallowedtables) | 3 | — | catalogo | — |
| [`routines`](#routines) | 13 | — | sprint | profiles |
| [`servicos_prestados`](#servicosprestados) | 3 | — | catalogo | estrutura_clusters |
| [`setor_cliente`](#setorcliente) | 5 | — | catalogo | — |
| [`sistema_clusters`](#sistemaclusters) | 5 | — | cluster-mapa | estrutura_clusters, sistemas_processo |
| [`sistema_responsaveis`](#sistemaresponsaveis) | 5 | — | cluster-mapa | job_roles, sistemas_processo |
| [`sistemas_processo`](#sistemasprocesso) | 16 | — | cluster-mapa | estrutura_clusters |
| [`sprint_backlog_items`](#sprintbacklogitems) | 13 | — | sprint | estrutura_clusters, sprint_deliverables, projects, sprints, profiles |
| [`sprint_deliverables`](#sprintdeliverables) | 17 | — | sprint | profiles, sprint_deliverables, processes, projects, sprints |
| [`sprint_events`](#sprintevents) | 11 | — | sprint | sprints |
| [`sprint_metrics`](#sprintmetrics) | 9 | — | sprint | sprints |
| [`sprints`](#sprints) | 10 | — | sprint | projects |
| [`ticket_attachments`](#ticketattachments) | 8 | — | chamados | tickets, profiles |
| [`ticket_messages`](#ticketmessages) | 6 | — | chamados | tickets |
| [`tickets`](#tickets) | 17 | — | chamados | profiles, cliente, estrutura_clusters, estrutura_areas |
| [`titularidade`](#titularidade) | 11 | — | cluster-cliente | bem, profiles, matricula, pessoa |
| [`tmpl_bloco`](#tmplbloco) | 16 | — | interno | profiles, tmpl_bloco, documento_gerado |
| [`tmpl_bloco_flag`](#tmplblocoflag) | 6 | — | interno | tmpl_bloco, profiles, tmpl_flag |
| [`tmpl_bloco_versao`](#tmplblocoversao) | 13 | — | interno | profiles, tmpl_bloco |
| [`tmpl_documento`](#tmpldocumento) | 9 | — | interno | profiles |
| [`tmpl_documento_bloco`](#tmpldocumentobloco) | 10 | — | interno | tmpl_bloco, profiles, tmpl_documento |
| [`tmpl_flag`](#tmplflag) | 14 | — | interno | profiles |
| [`tool_area_access`](#toolareaaccess) | 5 | — | interno | tools |
| [`tools`](#tools) | 7 | — | interno | — |
| [`user_page_access`](#userpageaccess) | 5 | — | proprio-usuario | page_permissions |
| [`user_roles`](#userroles) | 3 | — | proprio-usuario | — |

---

## Detalhe por tabela

### <a id="accesschangelog"></a>`access_change_log`
**Acesso:** interno
`action` string · `changed_by` string · `created_at` string? · `details` Json? · `id` string · `new_value` string? · `old_value` string? · `user_id` string

### <a id="administracao"></a>`administracao`
**Acesso:** interno
`administrador_pessoa_id` string · `cargo` string? · `created_at` string · `created_by` string? · `data_fim` string? · `data_inicio` string? · `id` string · `pj_pessoa_id` string · `pode_isoladamente` boolean? · `updated_at` string · `updated_by` string?  ·  **FK:** `administrador_pessoa_id`→pessoa.id · `created_by`→profiles.id · `pj_pessoa_id`→pessoa.id · `updated_by`→profiles.id

### <a id="analisessemestrais"></a>`analises_semestrais`
**Acesso:** desempenho
`ajustes_necessarios` string? · `ciclo_id` string? · `comentario_avaliado` string? · `comentario_lider` string? · `created_at` string? · `entregas_realizadas` string? · `id` string · `responsavel_id` string? · `riscos_identificados` string? · `status` string? · `updated_at` string?  ·  **FK:** `ciclo_id`→ciclos_avaliacao.id

### <a id="areaservicos"></a>`area_servicos`
**Acesso:** catalogo
`estrutura_area_id` string · `id` string · `servico_id` string  ·  **FK:** `estrutura_area_id`→estrutura_areas.id · `servico_id`→servicos_prestados.id

### <a id="atualizacoesmeta"></a>`atualizacoes_meta`
**Acesso:** desempenho
`autor_id` string? · `comentario` string? · `created_at` string? · `id` string · `meta_id` string? · `progresso_anterior` number? · `progresso_novo` number?  ·  **FK:** `meta_id`→metas.id

### <a id="auditlogs"></a>`audit_logs`
**Acesso:** interno
`action` string · `area` string · `changed_fields` Json? · `details` string? · `entity_id` string · `entity_name` string · `entity_type` string · `id` string · `performed_at` string · `performed_by` string

### <a id="bem"></a>`bem`
**Acesso:** cluster-cliente
`ccir_codigo` string? · `cliente_id` string · `created_at` string · `created_by` string? · `denominacao` string · `descricao_outros` string? · `empresa_destino_pessoa_id` string? · `id` string · `imposto_anual_exercicio` number? · `inscricao_municipal` string? · `motivo_nao_integralizacao` string? · `observacao` string? · `participa_estruturacao` boolean · `referencia_dp` string · `status_integralizacao` string? · `tipo_bem` string · `updated_at` string · `updated_by` string? · `vlr_benfeitorias` number? · `vlr_contabil` number? · `vlr_contabil_ajustado` number? · `vlr_imposto_anual` number? · `vlr_itr_iptu` number? · `vlr_mercado` number?  ·  **FK:** `cliente_id`→cliente.id · `created_by`→profiles.id · `empresa_destino_pessoa_id`→pessoa.id · `updated_by`→profiles.id

### <a id="capitalintegralizacao"></a>`capital_integralizacao`
**Acesso:** cluster-cliente
`bem_id` string · `cliente_id` string · `created_at` string · `created_by` string? · `empresa_destino_pessoa_id` string · `id` string · `pct_capital` number? · `pct_vlr_contabil` number? · `pct_vlr_mercado` number? · `reserva_capital` number? · `socio_pessoa_id` string · `updated_at` string · `updated_by` string? · `vlr_capital_arredondado` number? · `vlr_contabil` number? · `vlr_mercado` number?  ·  **FK:** `bem_id`→bem.id · `cliente_id`→cliente.id · `created_by`→profiles.id · `empresa_destino_pessoa_id`→pessoa.id · `socio_pessoa_id`→pessoa.id · `updated_by`→profiles.id

### <a id="cartorio"></a>`cartorio`
**Acesso:** interno
`comarca` string · `created_at` string · `created_by` string? · `id` string · `nome_completo` string · `uf` string · `updated_at` string · `updated_by` string?  ·  **FK:** `created_by`→profiles.id · `updated_by`→profiles.id

### <a id="catalogclients"></a>`catalog_clients`
**Acesso:** interno
`color` string? · `created_at` string? · `description` string? · `estrutura_area_id` string? · `id` string · `is_active` boolean? · `name` string · `responsible` string? · `updated_at` string?  ·  **FK:** `estrutura_area_id`→estrutura_areas.id

### <a id="centroscusto"></a>`centros_custo`
**Acesso:** catalogo
`codigo` string · `created_at` string? · `id` string · `is_active` boolean? · `nome` string

### <a id="checklistclienteitem"></a>`checklist_cliente_item`
**Acesso:** cluster-cliente
`bem_id` string? · `categoria` Database["public"]["Enums"]["osg_doc_categoria"]? · `categoria_docbox` string? · `cliente_id` string · `confidencial` boolean · `created_at` string · `created_by` string? · `documento` string · `entidade` string · `id` string · `item_padrao_id` string? · `matricula_id` string? · `modulo` string · `nota` string? · `obrigatorio` boolean · `observacao` string? · `origem` Database["public"]["Enums"]["osg_checklist_origem"] · `pessoa_id` string? · `status` Database["public"]["Enums"]["osg_checklist_status"] · `updated_at` string · `updated_by` string?  ·  **FK:** `bem_id`→bem.id · `cliente_id`→cliente.id · `item_padrao_id`→checklist_item_padrao.id · `matricula_id`→matricula.id · `pessoa_id`→pessoa.id

### <a id="checklistitempadrao"></a>`checklist_item_padrao`
**Acesso:** interno
`ativo` boolean · `categoria` Database["public"]["Enums"]["osg_doc_categoria"]? · `categoria_docbox` string? · `codigo` string · `confidencial` boolean · `created_at` string · `created_by` string? · `documento` string · `entidade` string · `granularidade` string · `id` string · `modulo` string · `nota` string? · `obrigatorio_default` boolean · `ordem` number · `updated_at` string · `updated_by` string?

### <a id="ciclosavaliacao"></a>`ciclos_avaliacao`
**Acesso:** desempenho
`created_at` string? · `created_by` string? · `data_analise_semestral` string? · `data_fim` string · `data_inicio` string · `descricao` string? · `id` string · `nome` string · `status` string? · `updated_at` string?

### <a id="clientdocuments"></a>`client_documents`
**Acesso:** interno
`created_at` string? · `created_by` string? · `description` string? · `document_type` string · `file_name` string? · `file_path` string? · `file_size` number? · `id` string · `name` string · `updated_at` string? · `url` string? · `user_id` string

### <a id="clientvisibleprojects"></a>`client_visible_projects`
**Acesso:** interno
`created_at` string? · `created_by` string? · `id` string · `notes` string? · `project_id` string · `user_id` string · `visible_since` string?  ·  **FK:** `project_id`→projects.id

### <a id="cliente"></a>`cliente`
**Acesso:** cluster-cliente · **Flags:** ambiente, excluido
`ambiente` string · `ativo` boolean? · `categoria` string? · `created_at` string · `excluido` boolean · `fixo` string? · `id` string · `municipio` string? · `nome` string · `observacoes` string? · `telefone` string? · `uf` string? · `updated_at` string

### <a id="clienteclusters"></a>`cliente_clusters`
**Acesso:** catalogo
`cliente_id` string · `cluster_id` string · `created_at` string · `id` string  ·  **FK:** `cliente_id`→cliente.id · `cluster_id`→estrutura_clusters.id

### <a id="codigoreceita"></a>`codigo_receita`
**Acesso:** catalogo
`codigo` string · `created_at` string · `denominacao_receita` string · `grupo_tributo_id` string · `id` string · `updated_at` string  ·  **FK:** `grupo_tributo_id`→grupo_tributo.id

### <a id="comentariosavaliacao"></a>`comentarios_avaliacao`
**Acesso:** desempenho
`autor_id` string · `ciclo_id` string? · `conteudo` string · `created_at` string? · `destinatario_id` string? · `id` string · `lido` boolean? · `lido_em` string? · `tipo` string · `updated_at` string? · `visivel_para_membro` boolean?  ·  **FK:** `ciclo_id`→ciclos_avaliacao.id

### <a id="contatos"></a>`contatos`
**Acesso:** publico
`atendido_por` string? · `como_conheceu` string? · `created_at` string? · `email` string · `empresa` string? · `id` string · `mensagem` string · `nome_completo` string · `notas_internas` string? · `porte_empresa` string? · `servico_interesse` string? · `status` string? · `telefone` string? · `updated_at` string?

### <a id="contribuinte"></a>`contribuinte`
**Acesso:** cluster-cliente · **Flags:** ambiente, excluido
`ambiente` string · `bairro` string? · `cep` string? · `cliente_id` string · `cod_cnae` string? · `complemento` string? · `contribuinte_faturamento` boolean? · `cpf_cnpj` string? · `created_at` string · `excluido` boolean · `id` string · `inscricao_estadual` string? · `logradouro` string? · `municipio` string? · `nome_fantasia` string? · `nome_razao_social` string · `numero` string? · `setor` string? · `setor_cliente_id` string? · `simples_nacional` boolean? · `situacao_inscricao_estadual` string? · `telefone` string? · `tipo_pessoa` string · `uf` string? · `updated_at` string  ·  **FK:** `cliente_id`→cliente.id · `setor_cliente_id`→setor_cliente.id

### <a id="contribuintebalconfig"></a>`contribuinte_bal_config`
**Acesso:** interno
`balancete_detalhamento` boolean? · `created_at` string · `id` string · `id_contribuinte` string · `updated_at` string  ·  **FK:** `id_contribuinte`→contribuinte.id

### <a id="correcoesicms"></a>`correcoes_icms`
**Acesso:** cluster-fiscal · **Flags:** ambiente, excluido
`ambiente` string · `campos` Json · `competencia` string? · `contribuinte_id` string · `created_at` string · `created_by` string? · `data_lancamento` string · `descricao` string · `excluido` boolean · `familia` string · `id` string · `produto` string? · `updated_at` string

### <a id="dailystandups"></a>`daily_standups`
**Acesso:** sprint
`blocked_deliverable_id` string? · `blocker_owner` string? · `blockers` string? · `created_at` string? · `date` string · `did_yesterday` string? · `id` string · `process_id` string? · `project_id` string? · `sprint_id` string? · `user_id` string · `will_do_today` string?  ·  **FK:** `blocked_deliverable_id`→sprint_deliverables.id · `process_id`→processes.id · `project_id`→projects.id · `sprint_id`→sprints.id

### <a id="dashboardclienteaccess"></a>`dashboard_cliente_access`
**Acesso:** interno
`cliente_id` string · `created_at` string · `created_by` string? · `dashboard_id` string · `id` string  ·  **FK:** `cliente_id`→cliente.id · `created_by`→profiles.id · `dashboard_id`→dashboards.id

### <a id="dashboardclusteraccess"></a>`dashboard_cluster_access`
**Acesso:** interno
`cluster_id` string · `created_at` string · `created_by` string? · `dashboard_id` string · `id` string  ·  **FK:** `cluster_id`→estrutura_clusters.id · `created_by`→profiles.id · `dashboard_id`→dashboards.id

### <a id="dashboards"></a>`dashboards`
**Acesso:** interno
`all_clusters` boolean · `created_at` string · `created_by` string? · `embed_url` string · `filter_type` string · `grupo` string? · `id` string · `is_active` boolean · `min_role` Database["public"]["Enums"]["app_role"]? · `name` string · `param_names` string[] · `sop_url` string? · `target_page` string? · `updated_at` string · `updated_by` string?  ·  **FK:** `created_by`→profiles.id · `updated_by`→profiles.id

### <a id="dcomp"></a>`dcomp`
**Acesso:** cluster-fiscal
`atualizado_em` string? · `atualizado_por` string? · `criado_em` string? · `criado_por` string? · `dt_envio` string · `mes_ano_exercicio` string · `nr_dcomp_ret` string? · `nr_documento` string · `nr_per_orig` string · `vlr_compensado` number  ·  **FK:** `nr_dcomp_ret`→dcomp.nr_documento · `nr_per_orig`→per.nr_per · `nr_per_orig`→per_with_contribuinte.nr_per

### <a id="deliverableattachments"></a>`deliverable_attachments`
**Acesso:** sprint
`deliverable_id` string · `file_name` string · `file_path` string · `file_size` number · `file_type` string? · `id` string · `uploaded_at` string · `uploaded_by` string?  ·  **FK:** `deliverable_id`→sprint_deliverables.id

### <a id="demanditems"></a>`demand_items`
**Acesso:** sprint
`assigned_to` string? · `created_at` string? · `demand_id` string · `description` string? · `due_date` string · `estimated_hours` number? · `id` string · `status` string? · `title` string · `updated_at` string?  ·  **FK:** `demand_id`→routines.id

### <a id="difaldecisao"></a>`difal_decisao`
**Acesso:** cluster-cliente
`cod_ncm` string · `decidido_em` string? · `decisao` string · `id` string · `id_icms_st_bq` string? · `sessao_id` string  ·  **FK:** `sessao_id`→difal_sessao.id

### <a id="difalsessao"></a>`difal_sessao`
**Acesso:** cluster-cliente
`cliente_id` string · `cliente_nome` string? · `criado_em` string? · `id` string · `periodo` string · `request_original` Json · `sincronizado_em` string? · `status` string · `uf` string · `usuario_id` string

### <a id="distribuicaodcomp"></a>`distribuicao_dcomp`
**Acesso:** cluster-fiscal
`atualizado_em` string · `atualizado_por` string? · `codigo_receita_id` string? · `competencia` string? · `criado_em` string · `criado_por` string? · `grupo_tributo_id` string? · `id` string · `nr_documento` string · `tributo` string · `valor_original` number? · `valor_tributo` number  ·  **FK:** `codigo_receita_id`→codigo_receita.id · `grupo_tributo_id`→grupo_tributo.id · `nr_documento`→dcomp.nr_documento

### <a id="distribuicaoreceita"></a>`distribuicao_receita`
**Acesso:** cluster-cliente · **Flags:** excluido
`created_at` string? · `excluido` boolean · `id` string · `id_centro_custo` string · `id_ordem_servico` string · `percentual_rateio` number  ·  **FK:** `id_centro_custo`→centros_custo.id · `id_ordem_servico`→ordem_servico.id

### <a id="documentoarquivo"></a>`documento_arquivo`
**Acesso:** interno · **Flags:** ambiente, excluido
`ambiente` string · `area` Database["public"]["Enums"]["osg_doc_area"]? · `bem_id` string? · `categoria` Database["public"]["Enums"]["osg_doc_categoria"] · `checklist_item_id` string? · `checksum` string? · `cliente_id` string · `contribuinte_id` string? · `created_at` string · `created_by` string? · `documento_gerado_id` string? · `excluido` boolean · `fonte` Database["public"]["Enums"]["osg_doc_fonte"] · `gcs_uri` string? · `id` string · `matricula_id` string? · `mime` string? · `nome_original` string · `org_projects_id` string? · `pessoa_id` string? · `status` Database["public"]["Enums"]["osg_doc_status"] · `tamanho` number? · `updated_at` string · `updated_by` string?  ·  **FK:** `bem_id`→bem.id · `checklist_item_id`→checklist_cliente_item.id · `cliente_id`→cliente.id · `documento_gerado_id`→documento_gerado.id · `matricula_id`→matricula.id · `pessoa_id`→pessoa.id

### <a id="documentogerado"></a>`documento_gerado`
**Acesso:** interno
`caminho_arquivo` string? · `cliente_id` string · `created_at` string · `created_by` string? · `documento_anterior_id` string? · `documento_raiz_id` string? · `documento_template_id` string? · `gerado_em` string? · `gerado_por_id` string? · `id` string · `observacao` string? · `pj_pessoa_id` string? · `snapshot_dados` Json? · `snapshot_flags` Json? · `snapshot_validado_em` string? · `snapshot_versoes_blocos` Json? · `status` string · `updated_at` string · `updated_by` string?  ·  **FK:** `cliente_id`→cliente.id · `created_by`→profiles.id · `documento_anterior_id`→documento_gerado.id · `documento_raiz_id`→documento_gerado.id · `documento_template_id`→tmpl_documento.id · `gerado_por_id`→profiles.id · `pj_pessoa_id`→pessoa.id · `updated_by`→profiles.id

### <a id="documentohorashistorico"></a>`documento_horas_historico`
**Acesso:** interno
`alterado_por` string? · `documento_id` string · `horas_antes` number? · `horas_depois` number? · `id` number · `registrado_em` string  ·  **FK:** `documento_id`→documentos_processo.id

### <a id="documentonotificacaovisto"></a>`documento_notificacao_visto`
**Acesso:** proprio-usuario
`documento_gerado_id` string · `user_id` string · `visto_em` string  ·  **FK:** `documento_gerado_id`→documento_gerado.id · `user_id`→profiles.id

### <a id="documentooverride"></a>`documento_override`
**Acesso:** interno
`bloco_alvo_id` string? · `bloco_substituto_id` string? · `created_at` string · `created_by` string? · `documento_gerado_id` string · `id` string · `observacao` string? · `ordem` number? · `tipo` string · `updated_at` string · `updated_by` string?  ·  **FK:** `bloco_alvo_id`→tmpl_bloco.id · `bloco_substituto_id`→tmpl_bloco.id · `created_by`→profiles.id · `documento_gerado_id`→documento_gerado.id · `updated_by`→profiles.id

### <a id="documentosprocesso"></a>`documentos_processo`
**Acesso:** cluster-mapa
`canonico_id` string? · `categoria` string? · `cluster_id` string? · `created_at` string · `estrutura_entrada` string? · `estruturado` string? · `formato` string? · `id` string · `nome` string · `origem` string? · `tempo_minutos` number? · `tipo` string? · `updated_at` string  ·  **FK:** `canonico_id`→documentos_processo.id · `cluster_id`→estrutura_clusters.id

### <a id="documents"></a>`documents`
**Acesso:** interno
`created_at` string? · `file_name` string · `file_path` string · `file_type` string? · `id` string · `ticket_id` string? · `uploaded_by` string? · `user_id` string  ·  **FK:** `ticket_id`→tickets.id

### <a id="efdcorrecoes"></a>`efd_correcoes`
**Acesso:** cluster-cliente
`arquivo_id` string? · `arquivo_tipo` string · `ativo` boolean? · `batch_id` string? · `campos_alterados` Json? · `contribuinte_id` string · `created_at` string? · `empresa_cnpj` string? · `id` string · `motivo` string? · `periodo` string? · `registro_original_id` string? · `registro_tipo` string · `snapshot` Json · `sync_error` string? · `sync_sent_at` string? · `sync_status` string? · `tipo_operacao` string · `usuario_id` string

### <a id="estruturaareas"></a>`estrutura_areas`
**Acesso:** catalogo
`cluster_id` string · `color` string? · `cost_center_id` string? · `created_at` string · `gestor_chamados_id` string? · `id` string · `is_active` boolean · `name` string · `page_categories` string[]? · `updated_at` string  ·  **FK:** `cluster_id`→estrutura_clusters.id · `cost_center_id`→centros_custo.id · `gestor_chamados_id`→profiles.id

### <a id="estruturaclusters"></a>`estrutura_clusters`
**Acesso:** catalogo
`cnpj` string? · `cost_center_id` string? · `created_at` string · `id` string · `is_active` boolean · `name` string · `nome_empresa` string? · `updated_at` string  ·  **FK:** `cost_center_id`→centros_custo.id

### <a id="estruturaequipemembros"></a>`estrutura_equipe_membros`
**Acesso:** catalogo
`created_at` string · `equipe_id` string · `id` string · `user_id` string  ·  **FK:** `equipe_id`→estrutura_equipes.id · `user_id`→profiles.id

### <a id="estruturaequipes"></a>`estrutura_equipes`
**Acesso:** catalogo
`area_id` string · `created_at` string · `gestor_id` string? · `id` string · `is_active` boolean · `name` string  ·  **FK:** `area_id`→estrutura_areas.id · `gestor_id`→profiles.id

### <a id="etapadocumentos"></a>`etapa_documentos`
**Acesso:** cluster-mapa
`created_at` string · `documento_id` string · `etapa_id` string · `id` string · `scenario` string · `sentido` string · `volume` number?  ·  **FK:** `documento_id`→documentos_processo.id · `etapa_id, scenario`→process_stages.id, scenario

### <a id="etaparesponsaveis"></a>`etapa_responsaveis`
**Acesso:** cluster-mapa
`created_at` string · `etapa_id` string · `horas` number? · `id` string · `papel` string · `responsavel_id` string · `scenario` string  ·  **FK:** `etapa_id, scenario`→process_stages.id, scenario · `responsavel_id`→job_roles.id

### <a id="etapasistemas"></a>`etapa_sistemas`
**Acesso:** cluster-mapa
`created_at` string · `etapa_id` string · `id` string · `rateio` number? · `scenario` string · `sistema_id` string  ·  **FK:** `etapa_id, scenario`→process_stages.id, scenario · `sistema_id`→sistemas_processo.id

### <a id="exploracaorural"></a>`exploracao_rural`
**Acesso:** cluster-cliente
`area_explorada` number? · `area_total` number? · `area_unidade` string · `bem_id` string? · `cliente_id` string · `created_at` string · `created_by` string? · `data_assinatura` string? · `data_encerramento` string? · `declarado_irpf` boolean · `explorador_nome` string? · `explorador_pessoa_id` string? · `id` string · `imovel_descricao` string? · `matricula_texto` string? · `municipio` string? · `outorgante_nome` string? · `outorgante_pessoa_id` string? · `referencia` string? · `sacas_por_hectare` number? · `tipo_exploracao` Database["public"]["Enums"]["osg_tipo_exploracao"] · `uf` string? · `updated_at` string · `updated_by` string? · `vigencia` string?  ·  **FK:** `bem_id`→bem.id · `cliente_id`→cliente.id · `explorador_pessoa_id`→pessoa.id · `outorgante_pessoa_id`→pessoa.id

### <a id="exportprofiles"></a>`export_profiles`
**Acesso:** proprio-usuario
`columns` string[] · `created_at` string? · `id` string · `is_default` boolean? · `name` string · `tool_type` string · `updated_at` string? · `user_id` string

### <a id="feedbacks"></a>`feedbacks`
**Acesso:** desempenho
`anonimo` boolean? · `ciclo_id` string? · `comportamento` string · `contexto` string · `created_at` string? · `de_usuario_id` string? · `id` string · `impacto` string · `para_usuario_id` string? · `tipo` string · `visivel_para_avaliado` boolean?  ·  **FK:** `ciclo_id`→ciclos_avaliacao.id

### <a id="gargaloetapas"></a>`gargalo_etapas`
**Acesso:** cluster-mapa
`created_at` string · `etapa_id` string · `gargalo_id` string · `id` string · `scenario` string  ·  **FK:** `etapa_id, scenario`→process_stages.id, scenario · `gargalo_id`→gargalos.id

### <a id="gargalomelhorias"></a>`gargalo_melhorias`
**Acesso:** cluster-mapa
`created_at` string · `gargalo_id` string · `id` string · `melhoria_id` string  ·  **FK:** `gargalo_id`→gargalos.id · `melhoria_id`→process_improvements.id

### <a id="gargaloprocessos"></a>`gargalo_processos`
**Acesso:** cluster-mapa
`created_at` string · `gargalo_id` string · `id` string · `processo_id` string  ·  **FK:** `gargalo_id`→gargalos.id · `processo_id`→processes.id

### <a id="gargaloresponsaveis"></a>`gargalo_responsaveis`
**Acesso:** cluster-mapa
`created_at` string · `gargalo_id` string · `horas` number? · `id` string · `responsavel_id` string  ·  **FK:** `gargalo_id`→gargalos.id · `responsavel_id`→job_roles.id

### <a id="gargalos"></a>`gargalos`
**Acesso:** cluster-mapa
`cluster_id` string? · `created_at` string · `custo_externo_unico` number? · `descricao` string? · `horas_gastas` number? · `horas_implementacao` number? · `id` string · `melhoria_id` string? · `nome` string · `origem` string? · `taxa_captura_apos_melhoria` number? · `taxa_ocorrencia` number? · `updated_at` string  ·  **FK:** `cluster_id`→estrutura_clusters.id · `melhoria_id`→process_improvements.id

### <a id="grupotributo"></a>`grupo_tributo`
**Acesso:** catalogo
`created_at` string · `denominacao` string · `id` string · `sigla` string · `updated_at` string

### <a id="impedimento"></a>`impedimento`
**Acesso:** interno
`area_afetada` number? · `cancelado` boolean · `created_at` string · `created_by` string? · `credor_nome` string? · `credor_pessoa_id` string? · `data_constituicao` string? · `data_validade` string? · `descricao` string? · `id` string · `impede_transferencia` boolean · `matricula_id` string · `referencia` string? · `tipo` string · `updated_at` string · `updated_by` string? · `vlr` number?  ·  **FK:** `created_by`→profiles.id · `credor_pessoa_id`→pessoa.id · `matricula_id`→matricula.id · `updated_by`→profiles.id

### <a id="improvementsavingsdetails"></a>`improvement_savings_details`
**Acesso:** interno
`cost_after` number? · `cost_before` number? · `created_at` string? · `description` string · `id` string · `improvement_id` string · `is_monthly` boolean? · `savings_type` string · `savings_value` number  ·  **FK:** `improvement_id`→process_improvements.id

### <a id="improvementteammembers"></a>`improvement_team_members`
**Acesso:** interno
`created_at` string? · `hours_allocated` number? · `id` string · `improvement_id` string · `is_baseline` boolean? · `job_role_id` string? · `profile_id` string?  ·  **FK:** `improvement_id`→process_improvements.id · `job_role_id`→job_roles.id · `profile_id`→profiles.id

### <a id="inscricaocontribuinte"></a>`inscricao_contribuinte`
**Acesso:** cluster-fiscal
`contribuinte_id` string · `created_at` string? · `id` string · `numero_ie` string? · `situacao` string · `uf` string · `updated_at` string?  ·  **FK:** `contribuinte_id`→contribuinte.id

### <a id="itensacao1a1"></a>`itens_acao_1a1`
**Acesso:** desempenho
`created_at` string? · `descricao` string · `id` string · `prazo` string? · `responsavel_id` string? · `reuniao_id` string? · `status` string? · `updated_at` string?  ·  **FK:** `reuniao_id`→reunioes_1a1.id

### <a id="jobroles"></a>`job_roles`
**Acesso:** catalogo
`category` string? · `cluster_id` string? · `created_at` string? · `hourly_rate` number · `id` string · `is_active` boolean? · `level` string · `monthly_salary_ref` number? · `name` string · `type` string?  ·  **FK:** `cluster_id`→estrutura_clusters.id

### <a id="kpismeta"></a>`kpis_meta`
**Acesso:** desempenho
`created_at` string? · `descricao` string? · `id` string · `meta_id` string? · `nome` string · `unidade` string? · `updated_at` string? · `valor_alvo` number · `valor_atual` number?  ·  **FK:** `meta_id`→metas.id

### <a id="matricula"></a>`matricula`
**Acesso:** cluster-cliente
`area_documento` number · `area_explorada` number? · `area_real` number? · `area_unidade` string · `bem_id` string? · `cartorio_id` string · `confrontacoes_texto` string? · `created_at` string · `created_by` string? · `data_matricula` string? · `descricao_psa_completa` string? · `folha` string? · `georref_prejudica_transferencia` boolean? · `georreferenciado` string? · `id` string · `imposto_anual_exercicio` number? · `livro` string? · `matricula_anterior_id` string? · `matricula_anterior_texto` string? · `municipio_imovel` string · `numero` string · `origem_descricao` string? · `tipo_bem` string? · `tipo_exploracao_posse` string? · `uf_imovel` string · `updated_at` string · `updated_by` string? · `vlr_benfeitorias` number? · `vlr_contabil` number? · `vlr_contabil_ajustado` number? · `vlr_imposto_anual` number? · `vlr_mercado` number?  ·  **FK:** `bem_id`→bem.id · `cartorio_id`→cartorio.id · `created_by`→profiles.id · `matricula_anterior_id`→matricula.id · `updated_by`→profiles.id

### <a id="melhoriaacoestd"></a>`melhoria_acoes_td`
**Acesso:** cluster-mapa
`acao_td` string · `created_at` string · `id` string · `melhoria_id` string · `ordem` number?  ·  **FK:** `melhoria_id`→process_improvements.id

### <a id="melhoriaprocessos"></a>`melhoria_processos`
**Acesso:** cluster-mapa
`created_at` string · `id` string · `melhoria_id` string · `processo_id` string  ·  **FK:** `melhoria_id`→process_improvements.id · `processo_id`→processes.id

### <a id="melhoriaresponsaveis"></a>`melhoria_responsaveis`
**Acesso:** cluster-mapa
`created_at` string · `horas` number? · `id` string · `melhoria_id` string · `papel` string · `responsavel_id` string  ·  **FK:** `melhoria_id`→process_improvements.id · `responsavel_id`→job_roles.id

### <a id="melhoriasistemas"></a>`melhoria_sistemas`
**Acesso:** cluster-mapa
`created_at` string · `id` string · `melhoria_id` string · `rateio` number? · `sistema_id` string  ·  **FK:** `melhoria_id`→process_improvements.id · `sistema_id`→sistemas_processo.id

### <a id="metas"></a>`metas`
**Acesso:** desempenho
`ajuste_qualitativo` string? · `ajuste_qualitativo_publico` string? · `ciclo_id` string? · `classificacao_final` string? · `comentario_membro` string? · `created_at` string? · `created_by` string? · `criterio_evidencia` string? · `descricao` string? · `dimensao` string · `id` string · `meta_pai_id` string? · `nivel` string · `peso` number? · `prazo` string? · `progresso_atual` number? · `recomendacao_decisao` string? · `responsavel_id` string? · `status` string? · `titulo` string · `ultima_atualizacao_membro` string? · `updated_at` string?  ·  **FK:** `ciclo_id`→ciclos_avaliacao.id · `meta_pai_id`→metas.id

### <a id="novidades"></a>`novidades`
**Acesso:** interno
`ativo` boolean? · `botao_texto` string? · `botao_url` string? · `categoria` string · `conteudo_completo` string? · `created_at` string? · `created_by` string? · `data_publicacao` string? · `descricao` string · `id` string · `imagem_lateral_posicao` string? · `imagem_lateral_url` string? · `imagem_url` string? · `itens` string[]? · `texto_original` string? · `titulo` string · `updated_at` string?

### <a id="ordemservico"></a>`ordem_servico`
**Acesso:** cluster-cliente · **Flags:** excluido
`cluster_id` string? · `created_at` string? · `data_emissao` string? · `data_fim` string? · `data_inicio` string? · `excluido` boolean · `id` string · `id_cliente` string · `id_produto_segmento` string? · `id_servico` string? · `numero_os` string? · `observacoes` string? · `regiao` string? · `setor_cliente` string? · `setor_cliente_id` string? · `situacao` string? · `updated_at` string? · `valor_projeto` number? · `valor_reembolso_km` number? · `valor_reembolso_refeicao` number?  ·  **FK:** `cluster_id`→estrutura_clusters.id · `id_produto_segmento`→produto_segmento.id · `id_servico`→servicos_prestados.id · `setor_cliente_id`→setor_cliente.id

### <a id="orgcommentattachments"></a>`org_comment_attachments`
**Acesso:** interno
`comment_id` string · `file_name` string · `file_path` string · `file_size` number · `file_type` string? · `height` number? · `id` string · `uploaded_at` string · `uploaded_by` string? · `width` number?  ·  **FK:** `comment_id`→org_comments.id · `comment_id`→org_comments_feed.id · `uploaded_by`→profiles.id

### <a id="orgcommentmentions"></a>`org_comment_mentions`
**Acesso:** interno
`comment_id` string · `created_at` string · `id` string · `lido_em` string? · `mentioned_user_id` string · `motivo` string ('mencao' | 'resposta')  ·  **FK:** `comment_id`→org_comments.id · `comment_id`→org_comments_feed.id · `mentioned_user_id`→profiles.id

### <a id="orgcomments"></a>`org_comments`
**Acesso:** interno · **Flags:** excluido
`author_id` string? · `author_name` string? · `body` string · `created_at` string · `editado_em` string? · `entity_id` string · `entity_type` Database["public"]["Enums"]["org_comment_entity"] · `excluido` boolean · `excluido_em` string? · `excluido_por` string? · `id` string · `kind` Database["public"]["Enums"]["org_comment_kind"] · `metadata` Json · `parent_id` string? · `project_id` string · `updated_at` string  ·  **FK:** `author_id`→profiles.id · `excluido_por`→profiles.id · `parent_id`→org_comments.id · `parent_id`→org_comments_feed.id · `project_id`→org_projects.id

### <a id="orgprojectmembers"></a>`org_project_members`
**Acesso:** projeto
`created_at` string · `id` string · `project_id` string · `role` string · `user_id` string  ·  **FK:** `project_id`→org_projects.id

### <a id="orgprojects"></a>`org_projects`
**Acesso:** projeto
`contribuinte_id` string? · `created_at` string? · `created_by` string? · `description` string? · `end_date` string? · `equipe_id` string? · `estrutura_area_id` string? · `external_client_id` string? · `id` string · `is_multidisciplinar` boolean · `leader_id` string? · `name` string · `objective` string? · `ordem_servico_id` string? · `responsible_id` string? · `servico_id` string? · `start_date` string? · `status` string? · `updated_at` string?  ·  **FK:** `created_by`→profiles.id · `equipe_id`→estrutura_equipes.id · `estrutura_area_id`→estrutura_areas.id · `leader_id`→profiles.id · `ordem_servico_id`→ordem_servico.id · `responsible_id`→profiles.id · `servico_id`→servicos_prestados.id

### <a id="orgtaskcomments"></a>`org_task_comments`
**Acesso:** projeto
`comment` string · `created_at` string? · `id` string · `is_system` boolean? · `task_id` string · `user_id` string? · `user_name` string?  ·  **FK:** `task_id`→org_tasks.id · `user_id`→profiles.id

### <a id="orgtasks"></a>`org_tasks`
**Acesso:** projeto
`actual_hours` number? · `assigned_to` string? · `assigned_to_name` string? · `category` Database["public"]["Enums"]["fiscal_task_category"] · `client_id` string? · `contribuinte_id` string? · `created_at` string? · `created_by` string? · `description` string? · `due_date` string? · `due_time` string? · `estimated_hours` number? · `id` string · `is_recurring` boolean? · `parent_task_id` string? · `priority` Database["public"]["Enums"]["fiscal_task_priority"] · `project_id` string · `reviewer_id` string? · `servico_id` string? · `start_date` string? · `status` Database["public"]["Enums"]["fiscal_task_status"] · `tags` string[]? · `title` string · `updated_at` string?  ·  **FK:** `assigned_to`→profiles.id · `servico_id`→servicos_prestados.id · `client_id`→cliente.id · `contribuinte_id`→contribuinte.id · `created_by`→profiles.id · `parent_task_id`→org_tasks.id · `project_id`→org_projects.id · `reviewer_id`→profiles.id

### <a id="osprodutoscontratados"></a>`os_produtos_contratados`
**Acesso:** cluster-cliente
`created_at` string? · `horas_contratadas` number? · `id` string · `ordem_servico_id` string · `produto_segmento_id` string  ·  **FK:** `ordem_servico_id`→ordem_servico.id · `produto_segmento_id`→produto_segmento.id

### <a id="pagepermissions"></a>`page_permissions`
**Acesso:** catalogo
`category` string · `created_at` string? · `id` string · `is_active` boolean? · `page_description` string? · `page_name` string · `page_path` string · `requires_admin` boolean? · `requires_team_member` boolean? · `updated_at` string?

### <a id="parentesco"></a>`parentesco`
**Acesso:** cluster-cliente
`created_at` string · `created_by` string? · `id` string · `natureza` string? · `parente_pessoa_id` string · `pessoa_id` string · `tipo` string? · `updated_at` string · `updated_by` string?  ·  **FK:** `created_by`→profiles.id · `parente_pessoa_id`→pessoa.id · `pessoa_id`→pessoa.id · `updated_by`→profiles.id

### <a id="per"></a>`per`
**Acesso:** cluster-fiscal
`atualizado_em` string? · `atualizado_por` string? · `criado_em` string? · `criado_por` string? · `dt_solicitada` string · `exercicio` number · `id_contribuinte` string · `nr_per` string · `nr_proc_ret` string? · `porcentagem_psa` number? · `tp_credito` string · `tri_exercicio` number · `vlr_credito` number · `vlr_ressarcido` number? · `vlr_ressarcido_original` number?  ·  **FK:** `nr_proc_ret`→per.nr_per · `nr_proc_ret`→per_with_contribuinte.nr_per

### <a id="persituacao"></a>`per_situacao`
**Acesso:** cluster-fiscal
`criado_em` string? · `criado_por` string? · `dt_pagamento` string? · `id` string · `nr_proc_per` string · `situacao` string  ·  **FK:** `nr_proc_per`→per.nr_per · `nr_proc_per`→per_with_contribuinte.nr_per

### <a id="performancepreferencias"></a>`performance_preferencias`
**Acesso:** proprio-usuario
`area_padrao` string? · `dashboard_layout` Json? · `id` string · `periodo_padrao` string? · `updated_at` string? · `usuario_id` string? · `widgets_ocultos` string[]?

### <a id="pessoa"></a>`pessoa`
**Acesso:** cluster-cliente
`cliente_id` string · `conjuge_id` string? · `contribuinte_id` string? · `cpf_cnpj` string? · `created_at` string · `created_by` string? · `data_constituicao` string? · `data_nascimento` string? · `denominacao` string · `documento_identidade_numero` string? · `documento_identidade_orgao` string? · `documento_identidade_tipo` string? · `documento_identidade_uf` string? · `endereco_bairro` string? · `endereco_cep` string? · `endereco_complemento` string? · `endereco_logradouro` string? · `endereco_municipio` string? · `endereco_numero` string? · `endereco_uf` string? · `estado_civil` string? · `filiacao_mae` string? · `filiacao_mae_pessoa_id` string? · `filiacao_pai` string? · `filiacao_pai_pessoa_id` string? · `genero` string? · `id` string · `is_fundador` boolean · `junta_comercial_uf` string? · `nacionalidade` string? · `naturalidade_municipio` string? · `naturalidade_uf` string? · `nire` string? · `objeto_social` string? · `profissao` string? · `regime_bens` string? · `status_constituicao` string? · `tipo_empresa` string? · `tipo_pessoa` string · `updated_at` string · `updated_by` string?  ·  **FK:** `cliente_id`→cliente.id · `conjuge_id`→pessoa.id · `contribuinte_id`→contribuinte.id · `created_by`→profiles.id · `filiacao_mae_pessoa_id`→pessoa.id · `filiacao_pai_pessoa_id`→pessoa.id · `updated_by`→profiles.id

### <a id="piscofinsclass"></a>`pis_cofins_class`
**Acesso:** catalogo
`classificado_em` string? · `classificado_por` string? · `cod_ncm` string? · `cod_produto` string? · `created_at` string · `id` string · `id_contribuinte` string? · `id_regra` string?  ·  **FK:** `classificado_por`→profiles.id · `id_contribuinte`→contribuinte.id · `id_regra`→pis_cofins_regra.id

### <a id="piscofinsregra"></a>`pis_cofins_regra`
**Acesso:** catalogo
`base_legal` string? · `cod_ncm` string · `created_at` string · `cst_cofins` string? · `cst_pis` string? · `data_vigencia_fim` number? · `data_vigencia_inicio` number? · `desc_cst` string? · `id` string · `id_segmento` string · `observacoes` string? · `permite_credito` string? · `tipo_credito` string? · `updated_at` string? · `updated_by` string?

### <a id="pprregrasciclo"></a>`ppr_regras_ciclo`
**Acesso:** desempenho
`ciclo_id` string? · `classificacao` string · `created_at` string? · `descricao_publica` string? · `faixa_maxima` number? · `faixa_minima` number · `id` string · `multiplicador_bonus` number  ·  **FK:** `ciclo_id`→ciclos_avaliacao.id

### <a id="procedimentos"></a>`procedimentos`
**Acesso:** interno
`ai_complexidade` string? · `ai_cover_url` string? · `ai_etapas` Json? · `ai_resumo` string? · `ai_tags` string[]? · `ai_titulo` string? · `arquivo_path` string? · `confirmado_em` string? · `confirmado_por` string? · `created_at` string? · `created_by` string? · `erro_mensagem` string? · `id` string · `processos_associados` string[]? · `source_type` string · `source_url` string? · `status_geracao` string? · `status_publicacao` string? · `updated_at` string?

### <a id="processimprovements"></a>`process_improvements`
**Acesso:** cluster-mapa
`baseline_cost_monthly` number? · `baseline_people_involved` number? · `baseline_time_hours` number? · `baseline_volume` number? · `build_vs_buy_savings` number? · `cluster_id` string? · `cost_saved_monthly` number? · `cost_saved_percent` number? · `created_at` string? · `evaluated_by` string? · `evaluation_end_date` string? · `evaluation_period_days` number? · `evaluation_start_date` string? · `evaluation_status` string? · `id` string · `implementation_cost` number? · `implementation_hours` number? · `improved_cost_monthly` number? · `improved_people_involved` number? · `improved_time_hours` number? · `improved_volume` number? · `improvement_description` string? · `improvement_status` string? · `one_time_external_cost` number? · `other_savings_monthly` number? · `process_id` string · `project_id` string? · `roi_fte_annual` number? · `roi_percentage` number? · `roi_time_months` number? · `sprint_deliverable_id` string? · `system_savings_monthly` number? · `time_saved_hours` number? · `time_saved_percent` number? · `training_hours` number? · `updated_at` string?  ·  **FK:** `cluster_id`→estrutura_clusters.id · `evaluated_by`→profiles.id · `process_id`→processes.id · `project_id`→projects.id · `sprint_deliverable_id`→sprint_deliverables.id

### <a id="processscenarios"></a>`process_scenarios`
**Acesso:** interno
`annual_cost` number? · `annual_hours` number? · `annual_savings` number? · `computed_metrics` Json? · `created_at` string · `created_by` string · `description` string? · `hours_freed` number? · `id` string · `improvement_id` string? · `investment` number? · `is_locked` boolean · `locked_fields` string[] · `name` string · `notes` string? · `parameters` Json · `parent_scenario_id` string? · `payback_months` number? · `process_id` string · `project_id` string? · `roi_percent` number? · `scenario_kind` Database["public"]["Enums"]["scenario_kind"] · `scenario_type` Database["public"]["Enums"]["scenario_type"] · `snapshot_at` string? · `status` Database["public"]["Enums"]["scenario_status"] · `unit_basis` Database["public"]["Enums"]["scenario_unit_basis"] · `updated_at` string · `varied_field` string  ·  **FK:** `created_by`→profiles.id · `improvement_id`→process_improvements.id · `parent_scenario_id`→process_scenarios.id · `process_id`→processes.id · `project_id`→projects.id

### <a id="processstages"></a>`process_stages`
**Acesso:** cluster-mapa
`automation_level` string? · `created_at` string? · `description` string? · `error_cost` number? · `error_rate` number? · `error_volume` number? · `execution` string? · `frequency` string? · `id` string · `inputs` Json? · `job_role_id` string? · `lead_time_days` number? · `name` string · `outputs` Json? · `process_id` string? · `related_projects` string[]? · `responsible` string? · `rework_rate` number? · `scenario` string · `stage_as_is_id` string? · `stage_order` number · `systems` Json? · `time_current` string? · `time_target` string? · `updated_at` string? · `volume` string? · `volume_per_process` number?  ·  **FK:** `job_role_id`→job_roles.id · `process_id`→processes.id

### <a id="processes"></a>`processes`
**Acesso:** cluster-mapa
`area` string? · `automation_potential` number? · `client_id` string? · `cluster_id` string? · `code` string? · `complexity_level` string? · `cost_monthly` number? · `created_at` string · `created_by` string? · `deliverable` string? · `description` string? · `document_path` string? · `equipe_id` string? · `evaluation_period_days` number? · `evaluation_status` string? · `financial_impact` string? · `formatted_content` string? · `frequency` string? · `id` string · `last_ai_sync` string? · `last_cost_saved_monthly` number? · `last_improvement_date` string? · `last_roi_percentage` number? · `last_time_saved_hours` number? · `mapped_at` string? · `name` string · `order_index` number? · `people_involved` number? · `priority` string? · `project_id` string? · `sop_before_content` string? · `sop_before_document_path` string? · `sop_before_link` string? · `sop_document_path` string? · `sop_link` string? · `stage` string · `time_spent_frequency` string? · `time_spent_hours` number? · `training_hours` number? · `updated_at` string · `volume_executions` number? · `volume_month` number?  ·  **FK:** `client_id`→catalog_clients.id · `cluster_id`→estrutura_clusters.id · `equipe_id`→estrutura_equipes.id · `project_id`→projects.id

### <a id="produtosegmento"></a>`produto_segmento`
**Acesso:** catalogo
`cluster_id` string? · `codigo` string · `created_at` string? · `id` string · `is_active` boolean? · `nome` string  ·  **FK:** `cluster_id`→estrutura_clusters.id

### <a id="produtoservico"></a>`produto_servico`
**Acesso:** catalogo
`id` string · `produto_segmento_id` string · `servico_prestado_id` string  ·  **FK:** `produto_segmento_id`→produto_segmento.id · `servico_prestado_id`→servicos_prestados.id

### <a id="profiles"></a>`profiles`
**Acesso:** proprio-usuario
`company` string? · `created_at` string? · `email` string? · `first_access_at` string? · `first_access_done` boolean? · `first_name` string · `id` string · `last_name` string? · `last_sign_in_at` string? · `phone` string? · `updated_at` string?

### <a id="projectdocuments"></a>`project_documents`
**Acesso:** interno
`category` string? · `created_at` string? · `description` string? · `file_name` string · `file_path` string · `file_size` number? · `file_type` string? · `id` string · `process_id` string? · `sprint_id` string? · `title` string · `updated_at` string? · `uploaded_by` string?  ·  **FK:** `process_id`→processes.id · `sprint_id`→sprints.id · `uploaded_by`→profiles.id

### <a id="projectprocesses"></a>`project_processes`
**Acesso:** interno
`created_at` string? · `id` string · `impact_type` string? · `impacted_stages` string[]? · `process_id` string? · `project_id` string?  ·  **FK:** `process_id`→processes.id · `project_id`→projects.id

### <a id="projectservicos"></a>`project_servicos`
**Acesso:** interno
`id` string · `project_id` string · `servico_id` string  ·  **FK:** `project_id`→org_projects.id · `servico_id`→servicos_prestados.id

### <a id="projects"></a>`projects`
**Acesso:** interno
`area` string? · `client_id` string? · `client_name` string? · `cluster_id` string? · `created_at` string? · `created_by` string? · `description` string? · `end_date` string? · `equipe_id` string? · `external_client_id` string? · `id` string · `justification_detail` string? · `justification_type` string? · `leader_id` string? · `name` string · `product_service` string? · `project_front` string? · `projects_per_year` number? · `start_date` string? · `status` string? · `updated_at` string?  ·  **FK:** `client_id`→catalog_clients.id · `cluster_id`→estrutura_clusters.id · `equipe_id`→estrutura_equipes.id · `external_client_id`→cliente.id · `leader_id`→profiles.id

### <a id="projetoflagvalor"></a>`projeto_flag_valor`
**Acesso:** interno
`cliente_id` string · `created_at` string · `created_by` string? · `flag_id` string · `id` string · `pj_pessoa_id` string? · `setado_por_id` string? · `updated_at` string · `updated_by` string? · `valor` boolean  ·  **FK:** `cliente_id`→cliente.id · `created_by`→profiles.id · `flag_id`→tmpl_flag.id · `pj_pessoa_id`→pessoa.id · `setado_por_id`→profiles.id · `updated_by`→profiles.id

### <a id="projetojustificativas"></a>`projeto_justificativas`
**Acesso:** cluster-mapa
`created_at` string · `id` string · `justificativa` string · `ordem` number? · `projeto_id` string  ·  **FK:** `projeto_id`→projects.id

### <a id="quadrosocietario"></a>`quadro_societario`
**Acesso:** cluster-cliente
`created_at` string · `created_by` string? · `data_referencia` string? · `empresa_pessoa_id` string · `id` string · `percentual` number? · `quotas` number? · `socio_pessoa_id` string · `updated_at` string · `updated_by` string? · `vlr_total` number?  ·  **FK:** `created_by`→profiles.id · `empresa_pessoa_id`→pessoa.id · `socio_pessoa_id`→pessoa.id · `updated_by`→profiles.id

### <a id="relatoriosgerados"></a>`relatorios_gerados`
**Acesso:** interno
`ciclo_id` string? · `conteudo_ia` string? · `gerado_em` string? · `gerado_por` string? · `id` string · `membro_id` string? · `status` string? · `tipo` string  ·  **FK:** `ciclo_id`→ciclos_avaliacao.id

### <a id="representante"></a>`representante`
**Acesso:** interno · **Flags:** excluido
`acesso_chamados` boolean? · `cargo` string? · `created_at` string? · `email` string? · `excluido` boolean · `id_cliente` string · `id_representante` string · `nome` string · `observacoes` string? · `telefone` string? · `tipo_representante` string? · `updated_at` string? · `user_id` string?  ·  **FK:** `id_cliente`→cliente.id

### <a id="reunioes1a1"></a>`reunioes_1a1`
**Acesso:** desempenho
`ciclo_id` string? · `created_at` string? · `data_reuniao` string · `id` string · `lider_id` string? · `membro_id` string? · `observacoes_lider` string? · `sentimento` number? · `temas_discutidos` string? · `updated_at` string?  ·  **FK:** `ciclo_id`→ciclos_avaliacao.id

### <a id="rlsprecheckallowedtables"></a>`rls_precheck_allowed_tables`
**Acesso:** catalogo
`allowed_ops` string[] · `created_at` string · `table_name` string

### <a id="routines"></a>`routines`
**Acesso:** sprint
`assigned_to` string? · `created_at` string? · `created_by` string? · `description` string? · `due_date` string? · `estimated_hours` number? · `frequency` string · `id` string · `is_recurring` boolean? · `start_date` string? · `status` string · `title` string · `updated_at` string?  ·  **FK:** `assigned_to`→profiles.id · `created_by`→profiles.id

### <a id="servicosprestados"></a>`servicos_prestados`
**Acesso:** catalogo
`cluster_id` string? · `id` string · `nome` string  ·  **FK:** `cluster_id`→estrutura_clusters.id

### <a id="setorcliente"></a>`setor_cliente`
**Acesso:** catalogo
`created_at` string? · `descricao` string? · `id` string · `nome` string · `sigla` string

### <a id="sistemaclusters"></a>`sistema_clusters`
**Acesso:** cluster-mapa
`cluster_id` string · `created_at` string · `id` string · `rateio` number? · `sistema_id` string  ·  **FK:** `cluster_id`→estrutura_clusters.id · `sistema_id`→sistemas_processo.id

### <a id="sistemaresponsaveis"></a>`sistema_responsaveis`
**Acesso:** cluster-mapa
`created_at` string · `horas` number? · `id` string · `responsavel_id` string · `sistema_id` string  ·  **FK:** `responsavel_id`→job_roles.id · `sistema_id`→sistemas_processo.id

### <a id="sistemasprocesso"></a>`sistemas_processo`
**Acesso:** cluster-mapa
`cluster_id` string? · `created_at` string · `custo_licenca_mensal` number? · `custo_por_operacao` number? · `custo_setup` number? · `custo_variavel_por_uso` number? · `descricao` string? · `id` string · `nome` string · `obs_custo_por_operacao` string? · `obs_licenca` string? · `obs_variavel` string? · `origem` string? · `tipo` string? · `tipo_custo` string? · `updated_at` string  ·  **FK:** `cluster_id`→estrutura_clusters.id

### <a id="sprintbacklogitems"></a>`sprint_backlog_items`
**Acesso:** sprint
`cluster_id` string? · `created_at` string? · `description` string? · `estimated_hours` number? · `id` string · `moved_to_deliverable_id` string? · `priority` string? · `project_id` string? · `sprint_id` string? · `status` string? · `suggested_by` string? · `title` string · `updated_at` string?  ·  **FK:** `cluster_id`→estrutura_clusters.id · `moved_to_deliverable_id`→sprint_deliverables.id · `project_id`→projects.id · `sprint_id`→sprints.id · `suggested_by`→profiles.id

### <a id="sprintdeliverables"></a>`sprint_deliverables`
**Acesso:** sprint
`actual_hours` number? · `assigned_to` string? · `completed_at` string? · `created_at` string? · `description` string? · `due_date` string · `estimated_hours` number? · `id` string · `parent_id` string? · `process_id` string? · `project_id` string? · `sprint_id` string? · `start_date` string? · `status` string? · `task_code` string? · `title` string · `updated_at` string?  ·  **FK:** `assigned_to`→profiles.id · `parent_id`→sprint_deliverables.id · `process_id`→processes.id · `project_id`→projects.id · `sprint_id`→sprints.id

### <a id="sprintevents"></a>`sprint_events`
**Acesso:** sprint
`created_at` string? · `description` string? · `end_time` string? · `event_date` string · `event_type` string? · `id` string · `location` string? · `participants` string[]? · `sprint_id` string? · `start_time` string? · `title` string  ·  **FK:** `sprint_id`→sprints.id

### <a id="sprintmetrics"></a>`sprint_metrics`
**Acesso:** sprint
`category` string? · `created_at` string? · `current_value` number? · `id` string · `name` string · `sprint_id` string? · `target_value` number? · `unit` string? · `updated_at` string?  ·  **FK:** `sprint_id`→sprints.id

### <a id="sprints"></a>`sprints`
**Acesso:** sprint
`created_at` string? · `created_by` string? · `end_date` string · `goal` string? · `id` string · `name` string · `project_id` string? · `start_date` string · `status` string? · `updated_at` string?  ·  **FK:** `project_id`→projects.id

### <a id="ticketattachments"></a>`ticket_attachments`
**Acesso:** chamados
`file_name` string · `file_path` string · `file_size` number · `file_type` string? · `id` string · `ticket_id` string · `uploaded_at` string · `uploaded_by` string?  ·  **FK:** `ticket_id`→tickets.id · `uploaded_by`→profiles.id

### <a id="ticketmessages"></a>`ticket_messages`
**Acesso:** chamados
`created_at` string? · `id` string · `is_admin` boolean? · `message` string · `ticket_id` string · `user_id` string  ·  **FK:** `ticket_id`→tickets.id

### <a id="tickets"></a>`tickets`
**Acesso:** chamados
`activity_status` string? · `assigned_at` string? · `assigned_to` string? · `cliente_id` string? · `closed_at` string? · `cluster_id` string? · `created_at` string? · `deadline` string? · `department` string? · `description` string · `estrutura_area_id` string? · `id` string · `priority` string? · `status` string? · `title` string · `updated_at` string? · `user_id` string  ·  **FK:** `assigned_to`→profiles.id · `cliente_id`→cliente.id · `cluster_id`→estrutura_clusters.id · `estrutura_area_id`→estrutura_areas.id

### <a id="titularidade"></a>`titularidade`
**Acesso:** cluster-cliente
`bem_id` string? · `created_at` string · `created_by` string? · `fracao` number? · `id` string · `integralizador` boolean · `matricula_id` string? · `tipo` string · `titular_pessoa_id` string · `updated_at` string · `updated_by` string?  ·  **FK:** `bem_id`→bem.id · `created_by`→profiles.id · `matricula_id`→matricula.id · `titular_pessoa_id`→pessoa.id · `updated_by`→profiles.id

### <a id="tmplbloco"></a>`tmpl_bloco`
**Acesso:** interno
`ancora` string? · `ativo` boolean · `autor_id` string? · `bloco_origem_id` string? · `categoria` string? · `created_at` string · `created_by` string? · `descricao` string? · `escopo_documento_raiz_id` string? · `id` string · `nome` string · `repete_colecao` string? · `tipo` string · `tipo_derivacao` string? · `updated_at` string · `updated_by` string?  ·  **FK:** `autor_id`→profiles.id · `bloco_origem_id`→tmpl_bloco.id · `created_by`→profiles.id · `escopo_documento_raiz_id`→documento_gerado.id · `updated_by`→profiles.id

### <a id="tmplblocoflag"></a>`tmpl_bloco_flag`
**Acesso:** interno
`bloco_id` string · `created_at` string · `created_by` string? · `flag_id` string · `updated_at` string · `updated_by` string?  ·  **FK:** `bloco_id`→tmpl_bloco.id · `created_by`→profiles.id · `flag_id`→tmpl_flag.id · `updated_by`→profiles.id

### <a id="tmplblocoversao"></a>`tmpl_bloco_versao`
**Acesso:** interno
`atual` boolean · `autor_id` string? · `bloco_id` string · `caminho_arquivo` string? · `changelog` string? · `checksum` string? · `conteudo` string? · `created_at` string · `created_by` string? · `id` string · `numero_versao` number · `updated_at` string · `updated_by` string?  ·  **FK:** `autor_id`→profiles.id · `bloco_id`→tmpl_bloco.id · `created_by`→profiles.id · `updated_by`→profiles.id

### <a id="tmpldocumento"></a>`tmpl_documento`
**Acesso:** interno
`ativo` boolean · `created_at` string · `created_by` string? · `descricao` string? · `id` string · `nome` string · `tipo` string? · `updated_at` string · `updated_by` string?  ·  **FK:** `created_by`→profiles.id · `updated_by`→profiles.id

### <a id="tmpldocumentobloco"></a>`tmpl_documento_bloco`
**Acesso:** interno
`bloco_id` string · `created_at` string · `created_by` string? · `documento_id` string · `id` string · `obrigatorio` boolean · `observacao` string? · `ordem` number · `updated_at` string · `updated_by` string?  ·  **FK:** `bloco_id`→tmpl_bloco.id · `created_by`→profiles.id · `documento_id`→tmpl_documento.id · `updated_by`→profiles.id

### <a id="tmplflag"></a>`tmpl_flag`
**Acesso:** interno
`ativo` boolean · `campo` string? · `created_at` string · `created_by` string? · `descricao` string? · `entidade` string? · `escopo` string · `expressao_sql` string? · `id` string · `nome` string · `tipo` string · `updated_at` string · `updated_by` string? · `valor` string?  ·  **FK:** `created_by`→profiles.id · `updated_by`→profiles.id

### <a id="toolareaaccess"></a>`tool_area_access`
**Acesso:** interno
`area` string · `granted_at` string? · `granted_by` string? · `id` string · `tool_id` string?  ·  **FK:** `tool_id`→tools.id

### <a id="tools"></a>`tools`
**Acesso:** interno
`created_at` string? · `created_by` string? · `description` string? · `id` string · `name` string · `status` string? · `updated_at` string?

### <a id="userpageaccess"></a>`user_page_access`
**Acesso:** proprio-usuario
`granted_at` string? · `granted_by` string? · `id` string · `page_permission_id` string · `user_id` string  ·  **FK:** `page_permission_id`→page_permissions.id

### <a id="userroles"></a>`user_roles`
**Acesso:** proprio-usuario
`id` string · `role` Database["public"]["Enums"]["app_role"] · `user_id` string

---

## Enums

- `app_role`: admin, client, team_member, lider, sublider, timecliente
- `fiscal_recurrence_type`: daily, weekly, monthly, yearly
- `fiscal_task_category`: task, fixed_event
- `fiscal_task_department`: commercial, financial, administrative, operations
- `fiscal_task_priority`: low, medium, high, urgent
- `fiscal_task_status`: backlog, waiting_client, todo, in_progress, review, em_ajuste, done
- `org_comment_entity`: org_task, org_project
- `org_comment_kind`: comment, assignment_changed, review_submitted, review_approved, review_adjustments, status_changed
- `osg_checklist_origem`: padrao, manual
- `osg_checklist_status`: pendente, solicitado, recebido, dispensado, nao_aplicavel, nao_solicitado
- `osg_doc_area`: osg, fiscal
- `osg_doc_categoria`: bens_direitos, cadastros_fiscais, declaracao_ir, agrarios, pessoais, societarios, sucessorios, outros, georreferenciamento
- `osg_doc_fonte`: cliente, psa, arquivar
- `osg_doc_status`: pendente, ativo
- `osg_tipo_exploracao`: arrendamento, parceria, composse, comodato, condominio, propria
- `scenario_kind`: scale, efficiency, investment
- `scenario_status`: draft, analyzing, approved, promoted, archived
- `scenario_type`: baseline, variant, target
- `scenario_unit_basis`: per_unit, per_month, per_year
- `task_priority`: low, medium, high, urgent
- `work_cluster`: database, frontend, management
- `work_package_activity_type`: status_change, assignment, comment, file_upload, relation_change, field_update, created
- `work_package_area`: fiscal, osg, fixos, pontuais
- `work_package_priority`: alta, normal, baixa
- `work_package_relation_type`: filho, relacionado, anterior, sucessor, pai, duplicado
- `work_package_stage`: solicitacao_documentos, analise_documentacao, elaboracao_wp, elaboracao_relatorios, entrega_cliente, conclusao
- `work_package_status`: novo, pendente_agendamento, agendado, em_progresso, em_revisao, concluido, rejeitado
- `work_package_type`: fase, tarefa, epico

---

## Tabelas de backup (ignorar em codigo novo)

`roi_snapshots`

---
_Doc gerado por `scripts/gen-mapa-banco.mjs`. Regenerar apos mudancas de schema._
