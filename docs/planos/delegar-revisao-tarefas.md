# Feature - Delegar revisao de tarefas + status "Em Ajuste"

## Objetivo

Permitir que o responsavel por uma tarefa delegue sua revisao a um sublider, lider ou administrador do mesmo cluster, sem alterar `assigned_to`.

Fluxo esperado:

1. O responsavel altera a tarefa para `review`, escolhe um revisor e informa o que deve ser revisado.
2. A tarefa aparece para o revisor, inclusive quando pertence a outro projeto ou area.
3. O revisor devolve a tarefa como `em_ajuste` e informa o que deve ser corrigido.
4. A tarefa sai da fila do revisor e volta para a fila do responsavel.
5. O responsavel realiza os ajustes, preenche as horas realizadas e conclui a tarefa.

O `reviewer_id` deve persistir para fins de auditoria. A visibilidade adicional do revisor deve existir somente enquanto a tarefa estiver em `review`.

## Estado atual

Ja existem no repositorio:

- Coluna `org_tasks.reviewer_id`, com FK para `profiles.id`, `ON DELETE SET NULL` e indice.
- Valor `em_ajuste` no enum `fiscal_task_status`.
- Tipos Supabase regenerados com `reviewer_id` e `em_ajuste`.
- Infraestrutura generica de auditoria para criacao e atualizacao de tarefas.

Esses itens devem ser confirmados no banco de staging antes do deploy. A migration atual ainda precisa de ajustes de RLS descritos neste plano.

## Task 1 - Banco, RLS e integridade

### Implementacao

- Ajustar a policy de `SELECT` de `org_tasks` para conceder acesso adicional ao revisor somente quando `reviewer_id = auth.uid()` e `status = 'review'`.
- Ajustar a policy de `UPDATE` para permitir que um revisor de outro projeto ou area devolva uma tarefa que esteja em `review`.
- Restringir a atualizacao feita pelo revisor aos campos permitidos para a devolucao. (no momento todos os campos são permitidos)
- Impedir que um revisor diferente do responsavel altere a tarefa diretamente para `done`.
- Atualizar `org_task_visivel()` para considerar o revisor enquanto a tarefa estiver em `review`, permitindo a leitura dos comentarios.
- Impedir `reviewer_id = assigned_to`.
- Validar que o revisor possui papel `sublider`, `lider` ou `admin`.
- Validar que o revisor possui vinculo com o cluster da tarefa; nao considerar a inclusao global de admins em listas de responsaveis como prova desse vinculo.
- Manter RLS habilitado e usar `profiles.id` como referencia, nunca `auth.users`.
- Substituir o gate SQL vazio da migration atual por cenarios que realmente executem e validem as operacoes.

### Cenarios de validacao

- Revisor do mesmo cluster consegue ler e devolver uma tarefa em `review`.
- Revisor de outro projeto ou area consegue ler e devolver a tarefa delegada.
- Revisor consegue ler os comentarios enquanto a tarefa estiver em `review`.
- Revisor perde o acesso adicional quando a tarefa sai de `review`.
- Revisor nao consegue concluir a tarefa.
- Revisor nao consegue alterar campos fora do fluxo permitido.
- Usuario sem papel ou vinculo adequados nao pode ser definido como revisor.
- Responsavel nao pode ser definido como revisor da propria tarefa.

### Pronto quando

- Policies e funcoes auxiliares cobrem os cenarios acima.
- Testes SQL executam operacoes reais e passam em staging.
- Nao e possivel contornar as regras por chamada direta a API.

## Task 2 - Hooks de tarefas, candidatos e comentarios

### Implementacao em `src/hooks/useOrgTasks.ts`

- Adicionar `em_ajuste` a `OrgTaskStatus`, depois de `review`.
- Adicionar `reviewer_id: string | null` a `OrgTask`.
- Adicionar `reviewer_id?: string | null` a `CreateOrgTaskInput`.
- Garantir que `reviewer_id` seja preservado no mapeamento de leitura.
- Fazer o filtro "Minhas" considerar `assigned_to === targetId` ou `reviewer_id === targetId && status === 'review'`.
- Aplicar a mesma regra ao detectar subtarefas que fazem o pai aparecer na hierarquia.
- Incluir `waiting_client` e `em_ajuste` em `useTaskStatusCounts`.
- Proteger a contagem contra status ausente no acumulador.
- Fazer `useCreateOrgTaskComment` aceitar `isSystem`, com valor padrao `false`.
- Manter o log de auditoria com diff campo a campo nas mutacoes.

### Novo hook `useReviewerCandidates`

- Buscar em `user_roles` usuarios com papel `sublider`, `lider` ou `admin`.
- Buscar os nomes correspondentes em `profiles_safe`.
- Retornar `{ id, name }[]` ordenado por nome com locale `pt-BR`.
- Nao consultar Supabase diretamente em componentes React.
- Deixar a validacao de cluster explicita, sem depender da inclusao global de admins em `teamMembers`.

### Pronto quando

- Build e verificacao TypeScript passam.
- O filtro "Minhas" inclui tarefas atribuidas e tarefas em revisao delegadas ao usuario.
- A tarefa sai da fila do revisor ao deixar `review`.
- Contagens de todos os status sao numericas e corretas.
- Comentarios comuns e de sistema sao persistidos corretamente.

## Task 3 - Suporte visual completo a `em_ajuste`

### Implementacao

- Adicionar `em_ajuste` ao `statusColors` com label "Em Ajuste" e paleta rose.
- Inserir `em_ajuste` no `statusList` depois de `review` e antes de `done`.
- Adicionar a opcao em `TaskFilters` depois de `review`.
- Adicionar um icone para `em_ajuste` no mapa proprio de `TaskCard`.
- Garantir que `TaskTable` renderize `em_ajuste` sem acessar configuracao inexistente.
- Revisar `TaskKanban`, `TaskTodayView`, KPIs, badges e demais controles que listam ou alteram status.
- Adicionar `reviewer_id: 'Revisor'` a `FIELD_LABELS` em `auditFieldFormatter`.
- Adicionar `reviewer_id: 'profiles'` a `UUID_FIELDS`.
- Adicionar `em_ajuste: 'Em Ajuste'` a `STATUS_LABELS`.
- Em `PainelTarefas`, incluir no escopo as tarefas com `reviewer_id === user.id && status === 'review'`, mesmo fora do cluster visivel.
- Incluir `user.id` nas dependencias do memo de escopo.

### Pronto quando

- A coluna "Em Ajuste" aparece entre "Revisao" e "Concluido" no Kanban.
- Filtros, tabela, cards, KPIs e visao de hoje renderizam o novo status sem erro.
- A tarefa delegada aparece para o revisor de outro projeto ou area.
- O historico exibe nomes e labels legiveis, sem UUID ou valor cru de status.

## Task 4 - `TaskModal`: delegacao e devolucao

### Schema e dados

- Adicionar `em_ajuste` ao enum de status do Zod.
- Adicionar `reviewer_id` opcional e nullable.
- Adicionar `review_comment` opcional como campo transitorio, sem envia-lo para `org_tasks`.
- Carregar candidatos com `useReviewerCandidates`.
- Montar as opcoes de revisor pela intersecao entre candidatos elegiveis e membros reais do cluster.
- Excluir o responsavel atual das opcoes.
- Calcular `currentUserIsReviewer` quando o usuario e o revisor, mas nao o responsavel.

### Interface

- Exibir "Delegar revisao para" somente quando o status selecionado for `review`.
- Adicionar "Em Ajuste" ao dropdown de status.
- Esconder "Concluido" quando `currentUserIsReviewer`.
- Exibir "O que precisa ser revisado?" ao entrar em `review` com revisor ou trocar o revisor.
- Exibir "O que precisa ser ajustado?" ao entrar em `em_ajuste`.
- Exigir comentario somente na transicao, sem duplicar comentarios ao editar outros campos.

### Persistencia

- Validar o comentario antes de executar a mutacao.
- Persistir `reviewer_id` sem alterar `assigned_to`.
- Manter `reviewer_id` preenchido depois de `em_ajuste` e `done` para auditoria.
- Capturar o ID retornado ao criar uma tarefa.
- Criar comentario de sistema com prefixo de contexto depois da criacao ou atualizacao.
- Usar "Enviado para revisao de <revisor>: <texto>" ao delegar.
- Usar "Devolvido para ajustes: <texto>" ao devolver.
- Tratar falha na criacao do comentario sem apresentar a operacao como totalmente concluida.
- Preferir uma RPC transacional para salvar a transicao e o comentario de forma atomica.

### Bloqueio em outros caminhos

- Aplicar a regra de permissao no hook central de atualizacao.
- Impedir conclusao pelo revisor na `TaskTable`.
- Impedir conclusao pelo revisor por drag-and-drop ou acoes do `TaskKanban`.
- Impedir conclusao pelo revisor em `TaskCard` e `TaskTodayView`.
- Manter a protecao equivalente no banco para chamadas diretas a API.

### Pronto quando

- O responsavel delega sem perder a atribuicao da tarefa.
- O comentario e obrigatorio somente nas transicoes previstas.
- O revisor devolve a tarefa como `em_ajuste`.
- O revisor nao consegue concluir por nenhum caminho da aplicacao ou da API.
- Somente o responsavel conclui e preenche as horas realizadas.

## Task 5 - Historico da tarefa

### Hook de dados

- Criar um custom hook para consultar `audit_logs` por `area` e `entity_id`.
- Consultar `profiles_safe` no hook para montar os `LookupMaps` necessarios.
- Nao fazer chamadas diretas ao Supabase em `TaskHistorico`.
- Tratar loading, erro e lista vazia.

### Componente `TaskHistorico`

- Criar `src/components/equipe/fiscal/tasks/TaskHistorico.tsx`.
- Receber `entityId: string` e `area: AreaKey`.
- Reutilizar `formatChangedFields` e `LookupMaps` de `auditFieldFormatter`.
- Mostrar criacao, ator, data e alteracoes campo a campo.
- Usar labels de entidade `{ task: 'Tarefa', subtask: 'Subtarefa' }`.
- Usar classes neutras do tema, sem classes `osg-*`.
- Renderizar painel `absolute left-full`, recolhido por padrao.
- Exibir "Ver mais" depois de cinco itens.
- Aplicar `shiftX` para manter o painel dentro da viewport.
- Ocultar o painel em telas pequenas com `hidden lg:flex`.
- Renderizar o componente dentro do `DialogContent` somente ao editar uma tarefa existente.

### Confiabilidade da auditoria

- Confirmar que falhas de insercao em `audit_logs` sao detectadas e reportadas pelo `useAuditLog`.
- Preservar `changed_fields` com diff campo a campo para `status`, `reviewer_id`, `assigned_to`, datas e horas.

### Pronto quando

- O historico abre no modal e mostra a criacao e os diffs da tarefa.
- Revisor, responsavel e demais UUIDs aparecem como nomes.
- Falhas de leitura ou auditoria nao sao ignoradas silenciosamente.

## Task 6 - Testes automatizados

### Hooks e componentes

- Testar o filtro "Minhas" para responsavel e revisor.
- Testar a saida da fila do revisor ao mudar para `em_ajuste`.
- Testar contagens com `waiting_client`, `em_ajuste` e status inesperado.
- Testar candidatos por papel, cluster e exclusao do responsavel.
- Testar comentario obrigatorio somente na delegacao, troca de revisor e devolucao.
- Testar que edicoes comuns nao duplicam comentario de sistema.
- Testar renderizacao de `em_ajuste` em tabela, card, filtros e Kanban.
- Testar que todos os caminhos da UI impedem o revisor de concluir.
- Testar o historico com criacao, update, lookup de perfil e paginacao visual.

### Banco e RLS

- Testar leitura e update por revisor de outro projeto ou area.
- Testar leitura dos comentarios pelo revisor.
- Testar perda do acesso adicional depois de sair de `review`.
- Testar bloqueio de conclusao pelo revisor.
- Testar bloqueio de candidato sem papel, sem cluster ou igual ao responsavel.
- Testar que um usuario nao relacionado continua sem acesso.

### Pronto quando

- Suite automatizada passa.
- Build e verificacao TypeScript passam.
- Os testes cobrem os caminhos positivos e as tentativas de contornar as regras.

## Task 7 - Deploy e validacao ponta a ponta

### Ordem obrigatoria

1. Aplicar as migrations de coluna, enum, RLS, funcoes e validacoes.
2. Regenerar `src/integrations/supabase/types.ts` pelo processo oficial.
3. Subir o frontend.
4. Executar a validacao em staging.

### Roteiro de staging

1. Joao altera a tarefa para "Revisao", escolhe Washington e informa o que deve ser revisado.
2. `assigned_to` continua sendo Joao e `reviewer_id` passa a ser Washington.
3. A tarefa aparece em "Minhas" para Washington, inclusive se estiver em outra area.
4. Washington consegue ler o comentario e o historico.
5. Washington nao ve nem consegue executar "Concluido" por nenhum caminho.
6. Washington devolve como "Em Ajuste" e informa o ajuste necessario.
7. A tarefa sai da fila de Washington e permanece na fila de Joao.
8. Joao corrige, preenche as horas realizadas e conclui.
9. O historico mostra delegacao, devolucao, comentarios e conclusao.

### Regressao

- Criacao e edicao de tarefas sem revisor continuam funcionando.
- Tarefas em `waiting_client` continuam com contagem e renderizacao corretas.
- Filtros por responsavel, status, projeto e cluster continuam funcionando.
- Usuarios sem relacao com a tarefa nao ganham visibilidade adicional.
- Fluxos Tax e OSG continuam respeitando seus clusters.

### Pronto quando

- O roteiro completo passa em staging.
- Nao existem erros no console ou falhas de RLS.
- Build de producao passa.
- Nao ha regressao nos fluxos existentes de tarefas.
