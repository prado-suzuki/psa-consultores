## Problema
No modal de detalhe do projeto (`/equipe/projetos`), ao clicar em **Editar** o formulário só expõe: Nome, Descrição, Cliente (texto livre), Datas e Status. Os demais campos preenchidos na criação ficam inacessíveis para edição:

- Cliente PSA (`external_client_id`)
- Líder Interno (`leader_id`)
- Área (`area`)
- Produto/Serviço (`product_service`)
- Frente do Projeto (`project_front`)
- Justificativa do Projeto (`justification_type` + `justification_detail`)

## Causa
Em `src/pages/equipe/EquipeProjetos.tsx` (bloco `isEditMode` ~linhas 1435-1495) o JSX do modo edição é uma versão reduzida do modal de criação (~linhas 970-1200). Os campos existem no estado `editProject` (já populado em linhas 414-431) e em `handleUpdateProject`, mas não foram renderizados.

## Correção (apenas frontend)
Reorganizar o bloco de edição para espelhar o modal de criação, na mesma ordem visual:

1. Nome do Projeto *
2. Linha 2 colunas: **Cliente PSA** (Select com `externalClients`) | **Líder Interno** (Select com `teamMembers`)
3. Linha 2 colunas: **Área** (Select com `PROJECT_AREAS`) | **Produto/Serviço** (Input)
4. **Frente do Projeto** (Select)
5. **Justificativa do Projeto** (grid de cards selecionáveis com `justification_type` + textarea opcional `justification_detail` se já existir no create — replicar o mesmo componente)
6. Descrição (Textarea)
7. Datas Início / Fim
8. Status (mantém)
9. Footer: Excluir / Cancelar / Salvar Alterações (mantém)

Todos os handlers usam `setEditProject({ ...editProject, campo: valor })`. Nenhuma mudança em `handleUpdateProject`, banco, RLS ou hooks.

Substituir o input livre "Cliente" (texto) pelo Select de `external_client_id`, mantendo `client_name` sincronizado automaticamente (ou removendo do payload de update se já vier do `external_client_id`) — alinhar com o que `handleCreateProject` faz hoje para consistência.

## Verificação
1. Criar projeto preenchendo todos os campos.
2. Abrir o projeto, clicar **Editar** → todos os campos aparecem com valores carregados.
3. Alterar cada campo e salvar → persistência confirmada na listagem e ao reabrir.
4. Auditoria (`useAuditLog`) registra diff dos novos campos editados.
