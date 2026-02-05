
# Plano: Liberacao de Edicao de Etapas e Botoes de Versoes

## Resumo

Este plano visa resolver o bloqueio de edicao de etapas na pagina Digital Rotina (EquipeProcessos) e adicionar botoes para visualizar o SOP original mapeado e as versoes de melhoria implementadas.

## Alteracoes Propostas

### 1. Liberar Edicao de Etapas

**Arquivo:** `src/pages/equipe/EquipeProcessos.tsx`

Atualmente, a aba "Etapas" esta desabilitada quando em modo de edicao. Vou:

- Remover a restricao `disabled={isEditing}` da aba "Etapas"
- Adicionar modo de edicao inline para cada etapa:
  - Botao de editar em cada card de etapa
  - Formulario expandivel com campos editaveis (nome, descricao, responsavel, tempo atual/alvo, frequencia, volume)
  - Botoes de salvar/cancelar
- Adicionar botao "+ Nova Etapa" para criar novas etapas
- Adicionar botao de excluir etapa com confirmacao

### 2. Adicionar Botao "SOP Mapeado"

**Arquivo:** `src/pages/equipe/EquipeProcessos.tsx`

No cabecalho da aba "Etapas", adicionar botao que:

- Abre um modal/drawer exibindo o conteudo original do mapeamento
- Utiliza o campo `formatted_content` do processo (conteudo Markdown gerado pela funcao AI `restructure-process`)
- Permite visualizar como o processo foi originalmente documentado
- Estilizado como visualizacao somente-leitura

### 3. Adicionar Botao "Versoes de Melhoria"

**Arquivos:** 
- `src/pages/equipe/EquipeProcessos.tsx`
- `src/components/equipe/ProcessImprovementModal.tsx`

Adicionar na interface:

- Botao "Avaliar Melhoria" que abre o `ProcessImprovementModal` ja existente
- Botao "Historico de Versoes" que exibe lista de melhorias registradas
- Modal de historico mostrando:
  - Data de cada avaliacao
  - Status (em avaliacao, concluida)
  - Resumo das metricas (economia de tempo/custo)
  - Descricao da melhoria

### Interface Visual Proposta

```text
+--------------------------------------------------+
|  Etapas (5)                                      |
|  +------------------------------------------+    |
|  | [SOP Mapeado]  [+ Nova Etapa]            |    |
|  | [Avaliar Melhoria]  [Historico Versoes]  |    |
|  +------------------------------------------+    |
|                                                  |
|  +------------------------------------------+    |
|  | 1. Nome da Etapa           [Editar] [X]  |    |
|  | Descricao...                             |    |
|  | Responsavel | Tempo | Frequencia         |    |
|  +------------------------------------------+    |
|                                                  |
|  +------------------------------------------+    |
|  | 2. Proxima Etapa           [Editar] [X]  |    |
|  | ...                                      |    |
|  +------------------------------------------+    |
+--------------------------------------------------+
```

## Secao Tecnica

### Estrutura de Dados Utilizadas

**Tabela `process_stages`:**
- `id`, `process_id`, `stage_order`, `name`, `description`
- `responsible`, `time_current`, `time_target`, `frequency`, `volume`
- `automation_level`, `inputs`, `outputs`, `systems` (JSONB)

**Tabela `process_improvements`:**
- `process_id`, `evaluation_status`, `improvement_description`
- Metricas baseline vs improved (time_hours, cost_monthly, volume, people)
- Resultados calculados (roi_percentage, time_saved_hours, cost_saved_monthly)

### Componentes a Criar/Modificar

1. **StageEditForm** (novo componente inline)
   - Formulario para edicao de etapa individual
   - Validacao de campos obrigatorios

2. **SOPViewerModal** (novo componente)
   - Renderizador de Markdown para `formatted_content`
   - Estilo de documento somente-leitura

3. **ImprovementHistoryModal** (novo componente)
   - Lista de `process_improvements` para o processo
   - Detalhes de cada versao de melhoria

### Funcoes de Backend Existentes

- `restructure-process`: Gera documentacao formatada
- `calculate-process-roi`: Calcula metricas de ROI

### Operacoes de Banco de Dados

```sql
-- Criar nova etapa
INSERT INTO process_stages (process_id, stage_order, name, ...)

-- Atualizar etapa
UPDATE process_stages SET name=?, description=? WHERE id=?

-- Excluir etapa
DELETE FROM process_stages WHERE id=?

-- Buscar historico de melhorias
SELECT * FROM process_improvements 
WHERE process_id = ? 
ORDER BY created_at DESC
```

## Arquivos a Modificar

1. `src/pages/equipe/EquipeProcessos.tsx`
   - Remover `disabled` da aba Etapas
   - Adicionar estado para edicao de etapas
   - Adicionar barra de acoes com botoes
   - Implementar CRUD de etapas
   - Integrar modais

2. `src/components/equipe/SOPViewerModal.tsx` (novo)
   - Modal para visualizar SOP original

3. `src/components/equipe/ImprovementHistoryModal.tsx` (novo)
   - Modal para historico de versoes

4. `src/lib/markdownRenderer.tsx` (reutilizar)
   - Renderizacao do conteudo formatado

## Dependencias

- Componentes UI existentes: Dialog, Button, Card, Badge, ScrollArea
- Hook useAuth para permissoes
- Supabase client para operacoes de banco
