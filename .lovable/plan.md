

# Plano: Atualizar AI_CONTEXT.md

Atualização documental apenas — nenhuma alteração em código ou banco.

## Mudanças no documento

### Seção 3.1 — Estrutura de diretórios
- Adicionar `src/types/clientForm.ts` na descrição de `types/`

### Seção 3.2 — Catálogo de hooks
Adicionar hooks novos:
- `useClientFormOptions` — opções de formulário de clientes (líderes, serviços, clusters, centros de custo)
- `useClientEditData` — carrega dados existentes de cliente para edição
- `useExternalConsults` — consultas externas (BrasilAPI CNPJ, ViaCEP)
- `useSaveClientTransaction` — persistência transacional de cliente (upsert contribuintes, participantes, ordens de serviço)
- `useTaxAreas` — áreas organizacionais com category 'tax' (consulta `estrutura_areas`)
- `useTaxProjects` — CRUD de projetos fiscais (JOIN com `estrutura_areas` via `estrutura_area_id`)
- `useTaxReferenceData` — dados de referência para módulo Tax
- `useEstruturaArea` — gestão de áreas organizacionais
- `useEstruturaManager` — gestão completa da estrutura organizacional
- `useCategorias` — gestão de serviços prestados (catálogo)
- `useServicosContratados` — serviços contratados por cliente
- `useFiscalClients` — clientes do módulo fiscal
- `useDevClients` — clientes do módulo Dev

### Seção 3.5 (nova) — Componentes client-form
Documentar a pasta `src/components/equipe/fiscal/client-form/` com:
- `constants.ts` — máscaras, formatação BRL, opções de dropdown
- `DateFieldWithInput.tsx` — input de data com máscara
- `CurrencyField.tsx` — input monetário BRL (centavos → valor)
- `ClienteTab.tsx`, `ContribuintesTab.tsx`, `ParticipantesTab.tsx`, `ContratosTab.tsx`, `FaturamentoTab.tsx` — abas do NewClientModal

### Seção 5.3 — Conexão Tax ↔ Estrutura
Substituir:
```
tax_areas.estrutura_area_id → estrutura_areas.id (FK)
Caminho: tax_projects → tax_areas → estrutura_areas → ...
```
Por:
```
tax_projects.estrutura_area_id → estrutura_areas.id (FK direta)
area_servicos.estrutura_area_id → estrutura_areas.id (FK direta)
Caminho: tax_projects → estrutura_areas → estrutura_equipes → membros/líderes
Nota: tax_areas ainda existe como backup; Fase 5 (drop) pendente.
```

### Seção 6.2 — Tabelas-chave
- **Tax/Fiscal**: remover `tax_areas` da lista principal, adicionar nota de legado. Adicionar `project_servicos`.
- Renomeações aplicadas: `tax_categorias` → `servicos_prestados`, `tax_area_categorias` → `area_servicos`, `tax_project_categorias` → `project_servicos`, `categoria_id` → `servico_id`.
- Adicionar **Cadastros de serviços**: `servicos_prestados`, `area_servicos`, `project_servicos`, `produto_segmento`.

### Seção 8.1 — useAuditLog types
Atualizar o interface para refletir os tipos atuais:
```typescript
type AuditArea = 'tax' | 'osg' | 'estrutura' | 'cadastros' | 'dev';
type AuditEntityType = 'project' | 'task' | 'subtask'
  | 'cluster' | 'area' | 'equipe' | 'membro' | 'lider'
  | 'produto_segmento' | 'servico' | 'centro_custo' | 'empresa'
  | 'cliente' | 'contribuinte' | 'participante' | 'ordem_servico';
```

### Seção 6.4 (nova) — Migração tax_areas → estrutura_areas (status)
Resumo conciso do estado:
- Fases 1-4 concluídas
- Frontend usa `estrutura_area_id` em `useTaxAreas`, `useTaxProjects`, `FiscalDashboard`, `FiscalProjetosCadastro`, `TaskModal`, `AuditLogTable`, `auditFieldFormatter`
- RLS policies simplificadas (sem JOIN `tax_areas`)
- Fase 5 pendente: drop `tax_areas` e colunas `area_id` legadas

### Seção 3.6 (nova) — Refatoração NewClientModal (status)
- Fases 1-6.2 concluídas
- Hooks extraídos, tipos centralizados, componentes de aba isolados
- Fase 6.3 (aba Faturamento) em execução

