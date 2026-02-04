

# Plano: Mover Fiscal e Fixos para dentro de Projetos

## Objetivo

Transformar Fiscal e Fixos em ambientes internos da área Projetos, com um seletor de sub-áreas similar ao Digital (que possui Digital Rotina e Digital Dev).

---

## Visão Geral da Mudança

```text
ANTES:
/equipe → Seletor com 6 áreas (Digital, Gestão, Fiscal, Fixos, OSG, Projetos)
           ↓
/equipe/fiscal/dashboard (área independente)
/equipe/fixos/dashboard (área independente)
/equipe/projetos/dashboard (área independente)

DEPOIS:
/equipe → Seletor com 4 áreas (Digital, Gestão, OSG, Projetos)
           ↓
/equipe/projetos → Seletor de sub-áreas (Fiscal, Fixos)
                    ↓
/equipe/projetos/fiscal/dashboard
/equipe/projetos/fixos/dashboard
```

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/equipe/projetos/ProjetosAreaSelector.tsx` | Seletor de sub-áreas (Fiscal e Fixos), seguindo o padrão do DigitalAreaSelector |

---

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `src/pages/equipe/EquipeAuth.tsx` | Remover Fiscal e Fixos do array de áreas |
| `src/App.tsx` | Adicionar rota `/equipe/projetos` como seletor; mover rotas Fiscal e Fixos para dentro de `/equipe/projetos` |
| `src/config/protectedPages.ts` | Atualizar paths de Fiscal e Fixos para `/equipe/projetos/fiscal/...` e `/equipe/projetos/fixos/...` |
| `src/components/equipe/fiscal/FiscalLayout.tsx` | Atualizar botão "Trocar área" para navegar para `/equipe/projetos` |
| `src/components/equipe/fixos/FixosLayout.tsx` | Atualizar botão "Trocar área" para navegar para `/equipe/projetos` |
| `src/pages/equipe/fiscal/FiscalDashboard.tsx` | Nenhuma mudança (apenas rota muda) |
| `src/pages/equipe/fixos/FixosDashboard.tsx` | Nenhuma mudança (apenas rota muda) |

---

## Estrutura do Seletor de Sub-Áreas

O `ProjetosAreaSelector.tsx` seguirá exatamente o padrão do `DigitalAreaSelector.tsx`:

```typescript
const areas: AreaCard[] = [
  {
    id: 'fiscal',
    label: 'Fiscal',
    description: 'Projetos de Felipe, Washington e Ricardo (ambiente compartilhado)',
    icon: Calculator,
    path: '/equipe/projetos/fiscal/dashboard',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'fixos',
    label: 'Fixos',
    description: 'Ambiente de projetos fixos da equipe',
    icon: Building,
    path: '/equipe/projetos/fixos/dashboard',
    color: 'from-blue-500 to-indigo-500',
  },
];
```

**Visual:**
- Fundo escuro com gradiente (gray-950)
- Logo PSA centralizado
- Título: "Área de Projetos"
- Subtítulo: "Selecione o ambiente de trabalho"
- Cards lado a lado com ícone, nome e descrição
- Botão "Trocar de área" no rodapé que volta para `/equipe`

---

## Mudanças no EquipeAuth.tsx

**Antes:**
```typescript
const areas = [
  { id: 'digital', label: 'Digital' },
  { id: 'gestao', label: 'Gestão' },
  { id: 'fiscal', label: 'Fiscal' },
  { id: 'fixos', label: 'Fixos' },
  { id: 'osg', label: 'OSG' },
  { id: 'projetos', label: 'Projetos' },
];
```

**Depois:**
```typescript
const areas = [
  { id: 'digital', label: 'Digital' },
  { id: 'gestao', label: 'Gestão' },
  { id: 'osg', label: 'OSG' },
  { id: 'projetos', label: 'Projetos' },
];
```

**Atualizar também `checkAreaAccess` e `navigateToArea`:**
- Remover referências a `fiscal` e `fixos` como áreas independentes
- Projetos agora navega para `/equipe/projetos` (seletor)
- Verificação de acesso para projetos deve considerar categorias `fiscal`, `fixos` e `projetos`

---

## Novas Rotas no App.tsx

```typescript
// Projetos - Seletor de Sub-áreas
<Route path="/equipe/projetos" element={
  <TeamRoute>
    <ProjetosAreaSelector />
  </TeamRoute>
} />

// Projetos - Dashboard geral (nova rota)
<Route path="/equipe/projetos/dashboard" element={...} />
<Route path="/equipe/projetos/demandas" element={...} />

// Projetos/Fiscal Routes (movidas)
<Route path="/equipe/projetos/fiscal/dashboard" element={
  <TeamRoute>
    <PageAccessGate pagePath="/equipe/projetos/fiscal/dashboard">
      <FiscalDashboard />
    </PageAccessGate>
  </TeamRoute>
} />

// Projetos/Fixos Routes (movidas)
<Route path="/equipe/projetos/fixos/dashboard" element={
  <TeamRoute>
    <PageAccessGate pagePath="/equipe/projetos/fixos/dashboard">
      <FixosDashboard />
    </PageAccessGate>
  </TeamRoute>
} />
```

---

## Atualização do protectedPages.ts

**Antes:**
```typescript
{
  page_path: '/equipe/fiscal/dashboard',
  category: 'fiscal',
  ...
},
{
  page_path: '/equipe/fixos/dashboard',
  category: 'fixos',
  ...
},
```

**Depois:**
```typescript
{
  page_path: '/equipe/projetos/fiscal/dashboard',
  category: 'projetos',  // Unificado na categoria projetos
  ...
},
{
  page_path: '/equipe/projetos/fixos/dashboard',
  category: 'projetos',  // Unificado na categoria projetos
  ...
},
```

---

## Atualização dos Layouts

Em `FiscalLayout.tsx` e `FixosLayout.tsx`, o botão "Trocar área" mudará de:
```typescript
onClick={() => navigate('/equipe')}
```

Para:
```typescript
onClick={() => navigate('/equipe/projetos')}
```

Isso permite voltar ao seletor de sub-áreas de Projetos (Fiscal/Fixos).

---

## Resumo das Entregas

1. **Novo seletor** - ProjetosAreaSelector.tsx com cards para Fiscal e Fixos
2. **Simplificação do login** - EquipeAuth com apenas 4 áreas principais
3. **Rotas reestruturadas** - Fiscal e Fixos agora sob `/equipe/projetos/`
4. **Navegação consistente** - "Trocar área" dentro de Fiscal/Fixos volta para o seletor de Projetos
5. **Permissões unificadas** - Todas as páginas sob a categoria "projetos"

