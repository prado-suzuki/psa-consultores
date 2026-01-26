
# Plano: Ajustar Formato de Exportação para Corresponder à Importação

## Problema Identificado
A exportação atual gera colunas diferentes do formato de importação, impossibilitando reimportação ou consistência de dados.

## Formato Correto (Importação)

| Coluna | Descrição |
|--------|-----------|
| Sprint | Nome da sprint |
| ID | Código da tarefa (task_code) |
| Título | Título da tarefa pai |
| Subtarefa | Título da subtarefa |
| Responsável | Nome do responsável (primeiro nome) |
| Descrição | Descrição da tarefa |
| Estimativa (h) | Horas estimadas (número) |
| Data de Entrega | Data no formato DD/MM/YYYY |
| Projeto | Nome do projeto |
| Processo | Nome do processo |

---

## Alterações Necessárias

### Arquivo: `src/pages/equipe/EquipeSprintDetalhes.tsx`

#### Modificar a função `handleExportExcel`

**Lógica de exportação:**
1. Para cada entregável, determinar se é tarefa pai ou subtarefa
2. Usar o título da tarefa pai na coluna "Título" 
3. Se for subtarefa, colocar o título na coluna "Subtarefa"
4. Formatar data como DD/MM/YYYY (formato brasileiro)
5. Usar apenas o primeiro nome do responsável (para facilitar reimportação)

**De:**
```tsx
const data = deliverables.map(d => ({
  'Código': d.task_code || '-',
  'Título': d.title,
  'Descrição': d.description || '-',
  'Responsável': getProfileName(d.assigned_to),
  'Projeto': getProjectName(d.project_id),
  'Processo': getProcessName(d.process_id),
  'Data Início': d.start_date ? format(parseDate(d.start_date), 'dd/MM/yyyy') : '-',
  'Data Entrega': format(parseDate(d.due_date), 'dd/MM/yyyy'),
  'Horas Estimadas': d.estimated_hours || '-',
  'Status': translateStatus(d.status),
  'Tipo': d.parent_id ? 'Subtarefa' : 'Tarefa',
  'Tarefa Pai': getParentTitle(d.parent_id)
}));
```

**Para:**
```tsx
const data = deliverables.map(d => {
  const isSubtask = !!d.parent_id;
  const parentTask = isSubtask ? deliverables.find(p => p.id === d.parent_id) : null;
  
  return {
    'Sprint': sprint.name,
    'ID': d.task_code || '',
    'Título': isSubtask ? (parentTask?.title || '') : d.title,
    'Subtarefa': isSubtask ? d.title : '',
    'Responsável': getFirstName(d.assigned_to),
    'Descrição': d.description || '',
    'Estimativa (h)': d.estimated_hours || '',
    'Data de Entrega': format(parseDate(d.due_date), 'dd/MM/yyyy'),
    'Projeto': getProjectName(d.project_id),
    'Processo': getProcessName(d.process_id)
  };
});
```

**Nova função auxiliar:**
```tsx
const getFirstName = (userId: string | null) => {
  if (!userId) return '';
  const profile = profiles.find(p => p.id === userId);
  return profile?.first_name || '';
};
```

---

## Resultado Esperado

### Arquivo Exportado (exemplo)
| Sprint | ID | Título | Subtarefa | Responsável | Descrição | Estimativa (h) | Data de Entrega | Projeto | Processo |
|--------|-----|--------|-----------|-------------|-----------|----------------|-----------------|---------|----------|
| Sprint 1 | 1 | Implementar API | | João | | 8 | 27/01/2026 | Portal | Desenvolvimento |
| Sprint 1 | 1.1 | | Criar endpoints | João | Endpoints REST | 4 | 27/01/2026 | Portal | Desenvolvimento |
| Sprint 1 | 1.2 | | Testes unitários | Maria | | 4 | 28/01/2026 | Portal | Desenvolvimento |

Este formato é **100% compatível** com a importação, permitindo:
1. Editar o arquivo e reimportar
2. Usar como template para novas sprints
3. Manter consistência entre importação/exportação

---

## Resumo das Alterações

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Colunas | 12 colunas diferentes | 10 colunas idênticas à importação |
| Formato data | dd/MM/yyyy | dd/MM/yyyy ✓ |
| Responsável | Nome completo | Primeiro nome (compatível com import) |
| Status/Tipo | Incluídos | Removidos (não existem na importação) |
| Sprint | Não incluído | Incluído na primeira coluna |
