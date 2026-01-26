
# Plano: Adicionar Botão "Exportar" para Sprint

## Objetivo
Adicionar um botão **"Exportar"** ao lado do botão **"Nova Tarefa"** na página de detalhes da Sprint, que exporta todas as informações da sprint para um arquivo Excel.

## Localização Atual (referência visual)
A imagem mostra a área de botões com:
- "Importar Excel" (variant="outline")
- "+ Nova Tarefa" (botão primário teal)

O novo botão "Exportar" será adicionado entre esses dois.

---

## Alterações Necessárias

### Arquivo: `src/pages/equipe/EquipeSprintDetalhes.tsx`

#### 1. Adicionar import do ícone Download
```tsx
import { Download } from "lucide-react";
```

#### 2. Adicionar função de exportação
Nova função `handleExportExcel` que:
- Mapeia os entregáveis para um formato tabular
- Inclui informações da sprint e de cada tarefa
- Resolve nomes de responsáveis, projetos e processos
- Gera o arquivo Excel usando a biblioteca XLSX (já instalada)

#### 3. Adicionar botão na interface
Inserir botão entre "Importar Excel" e "Nova Tarefa":
```tsx
<Button 
  variant="outline" 
  size="sm"
  onClick={handleExportExcel}
>
  <Download className="h-4 w-4 mr-2" />
  Exportar
</Button>
```

---

## Dados a serem Exportados

### Planilha "Entregáveis"
| Coluna | Origem |
|--------|--------|
| Código | task_code |
| Título | title |
| Descrição | description |
| Responsável | profiles (first_name + last_name) |
| Projeto | projects.name |
| Processo | processes.name |
| Data Início | start_date |
| Data Entrega | due_date |
| Horas Estimadas | estimated_hours |
| Status | status (traduzido: Pendente/Em Progresso/Concluído) |
| Tipo | "Tarefa" ou "Subtarefa" (baseado em parent_id) |
| Tarefa Pai | título da tarefa pai (se subtarefa) |

### Nome do Arquivo
`{nome_sprint}_{data_atual}.xlsx`

---

## Padrão de Exportação
Seguindo o padrão já existente em `EquipeDaily.tsx`:
```tsx
const data = deliverables.map(d => ({
  'Código': d.task_code || '-',
  'Título': d.title,
  // ... demais colunas
}));

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Entregáveis');
XLSX.writeFile(wb, `${sprint.name}_${today}.xlsx`);
```

---

## Resultado Visual Esperado

```text
┌─────────────────┐ ┌──────────┐ ┌──────────────┐
│ Importar Excel  │ │ Exportar │ │ + Nova Tarefa│
└─────────────────┘ └──────────┘ └──────────────┘
     outline          outline        primary
```

---

## Resumo das Alterações

| Local | Alteração |
|-------|-----------|
| Imports (linha 19) | Adicionar `Download` ao import de lucide-react |
| Novas funções (~linha 730) | Criar `handleExportExcel` |
| UI (linha ~1076) | Adicionar botão "Exportar" entre os existentes |
