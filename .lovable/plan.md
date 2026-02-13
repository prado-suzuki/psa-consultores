

## Plano: Campo task_code editavel com reordenacao automatica de subtarefas

### Problema
Atualmente o campo `task_code` (ex: 7.40, 7.41, 7.42) nao pode ser editado nos modais de criacao e edicao de subtarefas. O usuario quer poder definir/alterar a ordem numerica e que o sistema realoque as demais subtarefas automaticamente.

### Solucao

Adicionar o campo `task_code` (chamado "ID / Ordem") nos modais de criacao e edicao, e implementar logica de reordenacao automatica quando o codigo e alterado.

---

### Alteracoes no arquivo `src/pages/equipe/EquipeSprintDetalhes.tsx`

#### 1. Adicionar `task_code` aos estados dos formularios

- `editForm`: adicionar campo `task_code: string`
- `createForm`: adicionar campo `task_code: string`
- `openEditModal`: popular `task_code` com `deliverable.task_code || ''`
- Reset do `createForm`: limpar `task_code`

#### 2. Auto-sugestao de task_code ao selecionar tarefa pai (criacao)

Quando o usuario seleciona uma tarefa pai no modal de criacao:
- Buscar todas as subtarefas existentes daquele pai
- Encontrar o maior sufixo numerico (ex: se pai tem task_code "7" e subtarefas 7.40-7.48, sugerir 7.49)
- Pre-preencher o campo `task_code` com o proximo valor

#### 3. Campo de input nos modais

Adicionar um campo `Input` com label "ID / Ordem" (ex: "7.45") em ambos os modais:
- No modal de criacao: apos o campo "Tarefa Pai", visivel apenas quando um pai e selecionado
- No modal de edicao: apos o campo "Titulo", visivel apenas quando o deliverable tem `parent_id`

#### 4. Reordenacao automatica ao salvar

Quando o `task_code` e alterado (no edit) ou definido (no create):
- Se o novo `task_code` ja existe entre os irmaos (mesma tarefa pai), deslocar os demais para abrir espaco:
  - Todas as subtarefas com `task_code` >= ao novo valor tem seu sufixo incrementado em 1
  - Exemplo: inserir 7.43 entre 7.42 e 7.43 existente faz 7.43 virar 7.44, 7.44 virar 7.45, etc.
- Atualizar no banco em batch via multiplos updates

#### 5. Salvar task_code no banco

- `saveDeliverable`: incluir `task_code` no objeto `updates`
- `createDeliverable`: incluir `task_code` no objeto `newDeliverable`

### Detalhes Tecnicos

| Item | Detalhe |
|---|---|
| Arquivo editado | `src/pages/equipe/EquipeSprintDetalhes.tsx` |
| Campos novos nos forms | `task_code: string` em editForm e createForm |
| Logica de sugestao | Calcula proximo sufixo baseado nas subtarefas existentes do pai |
| Logica de reordenacao | Ao detectar conflito de task_code, incrementa sufixo das subtarefas subsequentes |
| Atualizacao batch | Usa `Promise.all` com updates individuais por subtarefa afetada |
| Visibilidade do campo | So aparece quando ha tarefa pai selecionada (subtarefa) |

