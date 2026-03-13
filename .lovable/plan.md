

# Plano: ROI baseado em dados reais das etapas

## Contexto

Atualmente, o modal "Avaliar Melhoria" pede que o usuário preencha manualmente o ANTES e o DEPOIS com cargos e horas. Porém, os dados do ANTES já existem nas etapas do processo (`process_stages`): cada etapa tem `responsible`, `time_current` e `time_target`. Esses dados não são aproveitados.

O campo `responsible` das etapas é texto livre (ex: "Analista Fiscal"), sem vínculo com `job_roles` — logo não há como calcular custo automaticamente.

## Mudanças necessárias

### 1. Banco de dados — Adicionar `job_role_id` em `process_stages`

Adicionar uma coluna `job_role_id` (FK para `job_roles`) na tabela `process_stages`. Isso permite que cada etapa tenha um cargo com `hourly_rate` vinculado, além do texto livre `responsible`.

```sql
ALTER TABLE public.process_stages
  ADD COLUMN job_role_id uuid REFERENCES public.job_roles(id);
```

### 2. `StageEditCard.tsx` — Dropdown de cargo na etapa

No formulário de edição de etapa, adicionar um `<Select>` de "Cargo/Função" populado com `job_roles`. O campo `responsible` (texto) continua para o nome da pessoa, e `job_role_id` vincula ao cargo com custo/hora.

### 3. `NewStageForm.tsx` — Mesmo dropdown no formulário de nova etapa

Adicionar o campo `job_role_id` no formulário de criação de etapa.

### 4. `ProcessImprovementModal.tsx` — Auto-preencher BASELINE a partir das etapas

Ao abrir o modal, buscar `process_stages` do processo com seus `job_role_id` e `time_current`. O lado ANTES (baseline) é preenchido automaticamente:

- Cada etapa com `job_role_id` e `time_current` preenchidos vira um membro baseline
- Parsear `time_current` (ex: "2h", "1 dia", "30min") para horas numéricas
- Exibir como lista read-only mostrando: Etapa → Cargo → Horas → Custo

O lado DEPOIS continua editável manualmente, mas pré-preenche com `time_target` das etapas quando disponível.

### 5. `ProcessImprovementModal.tsx` — Passar `processStages` como prop

O componente pai (`EquipeProcessos.tsx`) já carrega as etapas em `processStages`. Passar como prop para o modal para evitar fetch duplicado.

### 6. Edge Function `calculate-process-roi` — Buscar dados das etapas

Atualizar a edge function para, além dos `improvement_team_members`, buscar as etapas do processo e usar seus `job_role_id` + `time_current` como fonte primária do baseline quando disponível.

## Fluxo revisado

```text
Etapas do Processo (dados existentes)
  ├── Etapa 1: Responsável "João" | Cargo: Analista Fiscal (R$45/h) | Tempo: 2h
  ├── Etapa 2: Responsável "Maria" | Cargo: Analista Fiscal (R$45/h) | Tempo: 1 dia (8h)  
  └── Etapa 3: Responsável "João" | Cargo: Analista Fiscal (R$45/h) | Tempo: 4h
                                        ↓
                              Avaliar Melhoria
                    ┌─────────────────┬──────────────────┐
                    │  ANTES (auto)   │  DEPOIS (manual) │
                    │  14h total      │  3h total        │
                    │  R$ 630/mês     │  R$ 135/mês      │
                    └─────────────────┴──────────────────┘
                                        ↓
                              ROI = 78% economia
```

## Arquivos alterados

| Arquivo | Alteração |
|---|---|
| Migration SQL | Adicionar `job_role_id` em `process_stages` |
| `StageEditCard.tsx` | Adicionar select de `job_roles`, salvar `job_role_id` |
| `NewStageForm.tsx` | Adicionar select de `job_roles` |
| `ProcessImprovementModal.tsx` | Receber `stages` como prop, auto-preencher baseline, helper de parse de tempo |
| `EquipeProcessos.tsx` | Passar `processStages` ao modal |
| `calculate-process-roi/index.ts` | Buscar stages + job_roles para baseline automático |

