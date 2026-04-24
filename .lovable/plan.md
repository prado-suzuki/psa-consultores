## Contexto

A tarefa em questão é a tarefa de **sprint** (entregável), editada em `src/pages/equipe/EquipeSprintDetalhes.tsx` — não em `EquipeRotinas.tsx` (que trata de rotinas recorrentes, sem hierarquia pai/filho).

Nesse arquivo existem **dois `<Dialog>` separados e inline** no mesmo componente:

- **Criar** (linha ~2279): contém o Select **"Tarefa Pai (opcional)"** (linha 2308).
- **Editar** (linha ~2059): **não** contém o Select de Tarefa Pai. Só mostra um texto estático "Subtarefa de: …" (linha 2063) quando o entregável já tem `parent_id`, sem permitir alterar/definir.

Ou seja: **não é um componente compartilhado** — são dois blocos JSX duplicados. O `editForm` no state já tem o campo `parent_id` (linha 150), mas ele nunca é renderizado nem enviado no `update`.

## Decisão sobre unificação

Unificar criar+editar em um único componente `<TaskFormDialog>` é viável, porém:

- Os dois modais já divergem em vários detalhes (texto do header, botão de excluir só na edição, regras de reordenação ligeiramente diferentes, payload de insert vs update).
- O arquivo tem 2634 linhas e o refactor completo seria grande e arriscado.
- A correção do bug em si (campo ausente na edição) é pontual.

**Proposta:** corrigir o bug agora com edição mínima, sem refactor estrutural. Unificação fica como melhoria futura, fora deste escopo.

## Correção

### 1. Adicionar Select "Tarefa Pai" no modal de edição

No `Dialog` de edição (linha 2059), substituir o bloco estático "Subtarefa de: …" (linhas 2063-2070) por um Select equivalente ao do modal de criação, posicionado logo após o campo Descrição (antes do bloco condicional do `task_code`, linha 2095).

Comportamento ao mudar o pai:
- Se mudar para um pai diferente, sugerir novo `task_code` via `suggestNextTaskCode(newParentId)`.
- Se mudar para "Nenhuma", limpar `task_code`.
- Herdar `project_id`/`process_id` do novo pai apenas se estes campos estiverem vazios no `editForm` (preservar escolha manual já feita pelo usuário).
- **Excluir o próprio entregável e seus descendentes** das opções de pai, para evitar ciclos. Filtrar `parentTaskOptions` removendo `editingDeliverable.id` e qualquer task cujo ancestral seja `editingDeliverable.id`.

### 2. Persistir `parent_id` no update

Em `handleSaveEdit` (linha ~395), incluir `parent_id: editForm.parent_id || null` no objeto `updates`.

### 3. Ajustar reordenação de irmãos

A condição atual (linha 391) usa `editingDeliverable.parent_id` (valor antigo). Trocar para `editForm.parent_id` para reordenar no novo pai quando houver mudança de hierarquia.

### 4. Mostrar campo `task_code` quando há pai

A condição da linha 2095 (`editingDeliverable?.parent_id`) deve passar a olhar `editForm.parent_id` para que o campo "ID / Ordem" apareça quando o usuário acabou de promover a tarefa a subtarefa.

### 5. Manter (ou remover) o texto "Subtarefa de:"

Remover, pois o Select já comunica a relação. Reduz duplicação visual.

## Resumo das mudanças (1 arquivo)

`src/pages/equipe/EquipeSprintDetalhes.tsx`:
- Trocar bloco estático (linhas 2063-2070) por `<Select>` de Tarefa Pai com lógica análoga ao modal de criação, filtrando descendentes e o próprio item.
- Trocar guard da linha 2095 de `editingDeliverable?.parent_id` para `editForm.parent_id`.
- Em `handleSaveEdit`: usar `editForm.parent_id` na reordenação e adicionar `parent_id` ao payload de `update`.

## Fora de escopo

- Refactor para unificar os dois modais em um componente compartilhado.
- Mudanças em `EquipeRotinas.tsx` (rotinas não têm conceito de tarefa pai).
- Validação adicional contra ciclos profundos via banco (cobertura via filtro de descendentes no UI é suficiente para esta correção).
