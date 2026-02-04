
# Plano: Criação de 4 Novas Áreas com Layout Padronizado

## Objetivo

Criar 4 novas áreas de trabalho (Fiscal, Fixos, OSG, Projetos) que aparecem na seleção após autenticação, cada uma com um ambiente interno seguindo o mesmo design do Digital Rotina.

---

## Visão Geral da Arquitetura

```text
/equipe (EquipeAuth)
    ↓ seleciona área
/equipe/{area} (Seletor de subáreas - para Digital)
    ↓ OU
/equipe/{area}/dashboard (Dashboard da área)
```

### Fluxo Proposto

1. Usuário faz login em `/equipe`
2. Seleciona uma das 6 áreas disponíveis:
   - Digital (existente)
   - Gestão (existente)
   - **Fiscal** (nova)
   - **Fixos** (nova)
   - **OSG** (nova)
   - **Projetos** (nova)
3. É redirecionado para o dashboard da área selecionada

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/equipe/fiscal/FiscalLayout.tsx` | Layout da área Fiscal |
| `src/components/equipe/fixos/FixosLayout.tsx` | Layout da área Fixos |
| `src/components/equipe/osg/OsgLayout.tsx` | Layout da área OSG |
| `src/components/equipe/projetos/ProjetosLayout.tsx` | Layout da área Projetos |
| `src/pages/equipe/fiscal/FiscalDashboard.tsx` | Dashboard da área Fiscal |
| `src/pages/equipe/fixos/FixosDashboard.tsx` | Dashboard da área Fixos |
| `src/pages/equipe/osg/OsgDashboard.tsx` | Dashboard da área OSG |
| `src/pages/equipe/projetos/ProjetosDashboard.tsx` | Dashboard da área Projetos |

---

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `src/pages/equipe/EquipeAuth.tsx` | Adicionar as 4 novas áreas no array `areas` e lógica de navegação |
| `src/App.tsx` | Adicionar rotas para as 4 novas áreas |
| `src/config/protectedPages.ts` | Registrar páginas das novas áreas para controle de acesso |

---

## Estrutura de Cada Layout

Cada layout seguirá o padrão do `EquipeLayout.tsx`:

- **Sidebar colapsável** com fundo branco
- **Header** com ícone e nome da área em container teal
- **Navegação** inicialmente vazia (sem abas/subabas como solicitado)
- **Footer** com card do usuário e botões de ação
- **Área principal** com ScrollArea e padding consistente

### Cores e Ícones por Área

| Área | Ícone | Cor do Gradiente |
|------|-------|------------------|
| Fiscal | `Calculator` | from-emerald-500 to-teal-500 |
| Fixos | `Building` | from-blue-500 to-indigo-500 |
| OSG | `Briefcase` | from-orange-500 to-amber-500 |
| Projetos | `FolderKanban` | from-violet-500 to-purple-500 |

---

## Detalhes Técnicos

### 1. Atualização do EquipeAuth.tsx

```typescript
const areas = [
  { id: 'digital', label: 'Digital' },
  { id: 'gestao', label: 'Gestão' },
  { id: 'fiscal', label: 'Fiscal' },
  { id: 'fixos', label: 'Fixos' },
  { id: 'osg', label: 'OSG' },
  { id: 'projetos', label: 'Projetos' },
];

// Atualizar navigateToArea
const navigateToArea = (navigate, area) => {
  if (area === 'digital') navigate('/equipe/digital');
  else if (area === 'gestao') navigate('/gestao');
  else if (area === 'fiscal') navigate('/equipe/fiscal/dashboard');
  else if (area === 'fixos') navigate('/equipe/fixos/dashboard');
  else if (area === 'osg') navigate('/equipe/osg/dashboard');
  else if (area === 'projetos') navigate('/equipe/projetos/dashboard');
  else navigate('/equipe/dashboard');
};

// Atualizar checkAreaAccess para incluir novas categorias
```

### 2. Estrutura do Layout Base (exemplo: FiscalLayout)

```typescript
interface FiscalLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
}

// Sidebar com:
// - Header com ícone Calculator em bg-teal-500/10
// - Nome "Fiscal" e subtítulo
// - Navegação vazia (sem itens por enquanto)
// - Footer com user card, "Trocar área" e "Sair"
```

### 3. Estrutura do Dashboard Base (exemplo: FiscalDashboard)

```typescript
const FiscalDashboard = () => {
  return (
    <FiscalLayout title="Dashboard" subtitle="Visão geral da área">
      <div className="flex items-center justify-center h-[60vh] text-slate-400">
        <div className="text-center">
          <Calculator className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Área em desenvolvimento</p>
        </div>
      </div>
    </FiscalLayout>
  );
};
```

### 4. Novas Rotas no App.tsx

```typescript
// Fiscal Routes
<Route path="/equipe/fiscal/dashboard" element={
  <TeamRoute>
    <PageAccessGate pagePath="/equipe/fiscal/dashboard">
      <FiscalDashboard />
    </PageAccessGate>
  </TeamRoute>
} />

// Fixos Routes
<Route path="/equipe/fixos/dashboard" element={...} />

// OSG Routes
<Route path="/equipe/osg/dashboard" element={...} />

// Projetos Routes
<Route path="/equipe/projetos/dashboard" element={...} />
```

### 5. Registro em protectedPages.ts

Adicionar entradas para cada nova área com categoria própria:

```typescript
// === FISCAL PAGES ===
{
  page_path: '/equipe/fiscal/dashboard',
  page_name: 'Fiscal Dashboard',
  page_description: 'Painel principal da área Fiscal',
  category: 'fiscal',
  requires_admin: false,
  requires_team_member: true,
},
// ... similar para fixos, osg, projetos
```

---

## Resumo de Entregas

1. **4 novos Layouts** - Componentes de layout seguindo o padrão visual existente
2. **4 novos Dashboards** - Páginas iniciais vazias/placeholder para cada área
3. **Atualização do seletor de áreas** - EquipeAuth com as 4 novas opções
4. **Rotas configuradas** - App.tsx com proteção por TeamRoute e PageAccessGate
5. **Controle de acesso** - protectedPages.ts com as novas páginas registradas

---

## Observações

- Os layouts são criados sem navegação interna (sem abas/subabas) conforme solicitado
- O design segue o padrão Light Teal/Slate do sistema
- Cada área terá sua própria categoria para controle granular de permissões
- Os dashboards mostram um placeholder indicando "área em desenvolvimento"
