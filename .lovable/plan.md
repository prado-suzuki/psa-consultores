
# Plano: Sistema de Gestão de Demandas Padronizado na Área de Projetos

## Objetivo

Criar um sistema de gestão de demandas padronizado dentro da área de Projetos que consolida todas as equipes (Fiscal, OSG) com visibilidade configurável, inspirado no OpenProject e baseado nos padrões do ClickUp existente.

---

## Visão Geral da Estrutura

```text
/equipe/projetos/dashboard      → Visão geral unificada
/equipe/projetos/demandas       → Lista de pacotes de trabalho (Work Packages)
/equipe/projetos/demandas/:id   → Detalhes do pacote (atividade, arquivos, relações)
```

### Hierarquia Organizacional

- **Área Fiscal**: Projetos compartilhados entre Felipe, Washington e Ricardo
- **Área OSG**: Ambiente isolado para Cuba (não compartilha informações)
  - Sub-abas: Fixos (Ricardo), Pontuais (Felipe), outras conforme necessidade

### Etapas Padrão de Projeto Fiscal

1. Solicitação de documentos ao cliente
2. Análise de documentação
3. Elaboração de WP (Working Paper)
4. Elaboração de relatórios
5. Entrega ao cliente
6. Conclusão

---

## Modelo de Dados

### Nova Tabela: `project_work_packages` (Pacotes de Trabalho)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | ID único |
| `code` | integer | Código numérico sequencial (#116, #117, etc.) |
| `title` | text | Assunto do pacote |
| `description` | text | Descrição detalhada |
| `type` | enum | FASE, TAREFA, ÉPICO |
| `status` | enum | Novo, Pendente agendamento, Agendado, Em progresso, Em revisão, Concluído, Rejeitado |
| `priority` | enum | Alto, Normal, Baixo |
| `assigned_to` | uuid | Atribuído para (FK profiles) |
| `responsible` | uuid | Responsável (FK profiles) |
| `parent_id` | uuid | Pacote pai (hierarquia) |
| `project_id` | uuid | Projeto do cliente (FK projects) |
| `client_id` | uuid | Cliente (FK catalog_clients) |
| `area` | enum | fiscal, osg, fixos, pontuais |
| `estimated_hours` | decimal | Horas estimadas |
| `spent_hours` | decimal | Tempo gasto |
| `remaining_hours` | decimal | Trabalho restante |
| `completion_percent` | integer | % de conclusão |
| `start_date` | date | Data de início |
| `due_date` | date | Data de conclusão |
| `stage` | enum | Etapa padrão do projeto |
| `created_by` | uuid | Criado por |
| `created_at` | timestamp | Data de criação |
| `updated_at` | timestamp | Última atualização |

### Nova Tabela: `work_package_activities` (Histórico de Atividades)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | ID único |
| `work_package_id` | uuid | FK work_packages |
| `user_id` | uuid | Quem realizou a ação |
| `action_type` | text | Tipo: status_change, assignment, comment, file_upload |
| `old_value` | text | Valor anterior |
| `new_value` | text | Novo valor |
| `comment` | text | Comentário opcional |
| `created_at` | timestamp | Data da ação |

### Nova Tabela: `work_package_relations` (Relações entre Pacotes)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | ID único |
| `source_id` | uuid | Pacote origem |
| `target_id` | uuid | Pacote destino |
| `relation_type` | enum | filho, relacionado, anterior, sucessor, pai, duplicado |
| `created_at` | timestamp | Data de criação |

### Nova Tabela: `work_package_files` (Arquivos)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | ID único |
| `work_package_id` | uuid | FK work_packages |
| `file_name` | text | Nome do arquivo |
| `file_path` | text | Caminho no storage |
| `file_size` | integer | Tamanho em bytes |
| `uploaded_by` | uuid | Quem enviou |
| `created_at` | timestamp | Data de upload |

### Nova Tabela: `work_package_watchers` (Observadores)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | ID único |
| `work_package_id` | uuid | FK work_packages |
| `user_id` | uuid | Usuário observador |
| `created_at` | timestamp | Data de criação |

---

## Arquivos a Criar

### Componentes

| Arquivo | Descrição |
|---------|-----------|
| `src/components/projetos/WorkPackageList.tsx` | Lista de pacotes com tabela hierárquica |
| `src/components/projetos/WorkPackageFilters.tsx` | Barra de filtros lateral (padrão OpenProject) |
| `src/components/projetos/WorkPackageDetail.tsx` | Detalhes do pacote com abas |
| `src/components/projetos/WorkPackageForm.tsx` | Modal de criação/edição |
| `src/components/projetos/ActivityTimeline.tsx` | Timeline de atividades |
| `src/components/projetos/RelationsPanel.tsx` | Painel de relações (Pais/Filhos) |
| `src/components/projetos/StatusBadge.tsx` | Badge de status com cores |
| `src/components/projetos/ProjectSelector.tsx` | Dropdown de seleção de projeto |

### Páginas

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/equipe/projetos/ProjetosDemandas.tsx` | Lista principal de demandas |
| `src/pages/equipe/projetos/ProjetosDemandasDetalhe.tsx` | Detalhes de uma demanda |
| `src/pages/equipe/projetos/ProjetosVisaoGeral.tsx` | Dashboard com métricas |

---

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `src/components/equipe/projetos/ProjetosLayout.tsx` | Adicionar navegação lateral |
| `src/pages/equipe/projetos/ProjetosDashboard.tsx` | Transformar em visão geral |
| `src/App.tsx` | Adicionar novas rotas |
| `src/config/protectedPages.ts` | Registrar novas páginas |

---

## Interface de Usuário (Baseada no OpenProject)

### Sidebar de Filtros (Esquerda)

```text
PADRÃO
├── Todos abertos
├── Última atividade  
├── Criado recentemente
├── Atrasado
├── Sumário
├── Criado por mim
├── Atribuído a mim
├── Compartilhado com usuários
└── Compartilhados comigo

ÁREAS
├── Fiscal
├── OSG
│   ├── Fixos
│   └── Pontuais
└── [Criar novo filtro salvo]
```

### Tabela Principal (Centro)

| ID | ↓ ASSUNTO | TIPO | PAI | STATUS | PRIORIDADE | ATRIBUIÇÃO | RESPONSÁVEL |
|----|-----------|------|-----|--------|------------|------------|-------------|
| 116 | Folha de pagamentos | FASE | #115 Diagnóstico... | Novo | Normal | - | - |
| 117 | Admissões | TAREFA | #116 Folha... | Em revisão | Normal | João | Maria |

### Painel de Detalhes (Direita - Ao clicar em item)

**Cabeçalho:**
- Pai: Link para pacote pai
- [←] [→] Navegação entre itens
- Badge: FASE Folha de pagamentos
- Botão: [+ Criar ▼]

**Informações:**
- Status (dropdown): Novo → Agendado → Em progresso → Em revisão → Concluído
- Criado por: Nome. Última atualização em DD/MM/YYYY HH:MM

**PESSOAS:**
- Atribuído para: [Seletor de usuário]
- Responsável: [Seletor de usuário]
- Local*: [Seletor] (Cliente/Projeto)

**DETALHES:**
- % de conclusão: 0% · Σ 0%
- Prioridade*: ● Normal

**ESTIMATIVAS E PROGRESSO:**
- Trabalho: - · Σ 20h
- Tempo gasto: 15h ⏱
- Pontos de história: -
- Trabalho restante: - · Σ 20h

**Abas:**
- ATIVIDADE | ARQUIVOS | RELAÇÕES (5) | OBSERVADORES | REUNIÕES

### Aba ATIVIDADE (Histórico completo)

```text
[Avatar] Arnon Locks  06/06/2023 11:19 PM
Pai definido como Diagnóstico de levantamento...

[Avatar] System  05/07/2025 09:14 AM
Atualização do sistema OpenProject:
- Cálculo de progresso automaticamente ajustado
- Trabalho restante excluído 20h
- % total concluída definido como 0%

[Avatar] Patricia Melo  03/02/2026 02:25 PM
Status alterado de Novo para Agendado
Local definido como Prado Suzuki

[Campo de comentário: "Adicione um comentário. Digite @ para notificar..."]
```

### Aba RELAÇÕES

```text
Pais (1)                              [+ Relação ▼]
┌──────────────────────────────────────────────┐
│ FASE #115 [Em progresso]                 ··· │
│ Diagnóstico de levantamento...               │
│ 📅 06/06/2023                                │
└──────────────────────────────────────────────┘

Filhos (4)                            [+ Filho ▼]
┌──────────────────────────────────────────────┐
│ TAREFA #117 [Em revisão]                 ··· │
│ Admissões                                    │
│ 📌 06/06/2023 -                              │
├──────────────────────────────────────────────┤
│ TAREFA #118 [Concluído]                  ··· │
│ Demissões                                    │
│ 📌 06/06/2023 -                              │
└──────────────────────────────────────────────┘

Menu [+ Relação]:
├── Novo filho
├── Filho
├── Relacionado a
├── Anterior (antes)
├── Sucessor (depois)
├── Pai
└── Duplicados
```

---

## Status Disponíveis (Workflow)

| Status | Cor | Descrição |
|--------|-----|-----------|
| Novo | Azul | Recém criado |
| Pendente agendamento | Amarelo | Aguardando data |
| Agendado | Laranja | Data definida |
| Em progresso | Azul escuro | Em execução |
| Em revisão | Roxo | Aguardando validação |
| Concluído | Verde | Finalizado |
| Rejeitado | Vermelho | Cancelado/rejeitado |

---

## Etapas Padrão de Projeto (Campo `stage`)

| Etapa | Ordem | Descrição |
|-------|-------|-----------|
| Solicitação de documentos | 1 | Solicitação inicial ao cliente |
| Análise de documentação | 2 | Análise dos documentos recebidos |
| Elaboração de WP | 3 | Criação do Working Paper |
| Elaboração de relatórios | 4 | Montagem dos relatórios |
| Entrega ao cliente | 5 | Envio dos resultados |
| Conclusão | 6 | Projeto finalizado |

---

## Melhorias sobre OpenProject/ClickUp

1. **Integração nativa com clientes PSA**: Dropdown já conectado a `catalog_clients`
2. **Segregação por área**: Fiscal compartilhado, OSG isolado com sub-abas
3. **Etapas padrão fiscais**: Workflow específico para projetos contábeis
4. **Timeline de atividades**: Histórico completo de alterações
5. **Hierarquia visual**: Indentação na tabela para Pai → Filho
6. **Filtros salvos**: Usuário pode criar e salvar filtros personalizados
7. **Cálculo automático**: % conclusão calculado de filhos
8. **Notificações @menção**: Mencionar usuários em comentários

---

## Integração Futura: Slack

Webhooks para notificar via Slack quando:
- Novo pacote atribuído
- Status alterado
- Menção em comentário
- Data limite se aproximando

---

## Rotas a Adicionar

```typescript
// Projetos - Gestão de Demandas
<Route path="/equipe/projetos/demandas" element={...} />
<Route path="/equipe/projetos/demandas/:id" element={...} />
```

---

## Navegação no ProjetosLayout

```typescript
const navItems = [
  { path: '/equipe/projetos/dashboard', label: 'Visão Geral', icon: LayoutDashboard },
  { path: '/equipe/projetos/demandas', label: 'Demandas', icon: ListTodo },
];
```

---

## Resumo de Entregas

1. **Modelo de dados**: 4 novas tabelas para gestão completa de pacotes de trabalho
2. **Interface similar ao OpenProject**: Lista hierárquica + painel de detalhes
3. **Sistema de filtros**: Sidebar com filtros padrão e salvos
4. **Histórico de atividades**: Timeline de todas as alterações
5. **Sistema de relações**: Pai/Filho/Relacionado/Anterior/Sucessor
6. **Gestão de arquivos**: Upload e download de documentos
7. **Segregação por área**: Fiscal compartilhado, OSG isolado
8. **Etapas padrão**: Workflow específico para projetos fiscais
9. **Preparação para Slack**: Estrutura pronta para webhooks de notificação
