

# Plano: Reordenar Áreas e Adicionar "Board"

## Objetivo

Ajustar a ordem das áreas no seletor de login da equipe, renomear "Gestão" para "Controle Site" e criar uma nova área chamada "Board".

---

## Mudanças Solicitadas

| Antes | Depois |
|-------|--------|
| Digital | Digital |
| Gestão | Projetos |
| OSG | OSG |
| Projetos | Controle Site *(renomeado de Gestão)* |
| - | Board *(nova)* |

**Nova ordem final:**
1. Digital
2. Projetos
3. OSG
4. Controle Site
5. Board

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/equipe/board/BoardDashboard.tsx` | Dashboard inicial da área Board |
| `src/components/equipe/board/BoardLayout.tsx` | Layout comum para páginas do Board |

---

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `src/pages/equipe/EquipeAuth.tsx` | Reordenar áreas, renomear gestao→controle_site, adicionar board |
| `src/App.tsx` | Adicionar rotas do Board |
| `src/config/protectedPages.ts` | Adicionar categoria 'board' e páginas do Board |

---

## Detalhamento das Mudanças

### 1. EquipeAuth.tsx - Array de áreas

**Antes:**
```typescript
const areas = [
  { id: 'digital', label: 'Digital' },
  { id: 'gestao', label: 'Gestão' },
  { id: 'osg', label: 'OSG' },
  { id: 'projetos', label: 'Projetos' },
];
```

**Depois:**
```typescript
const areas = [
  { id: 'digital', label: 'Digital' },
  { id: 'projetos', label: 'Projetos' },
  { id: 'osg', label: 'OSG' },
  { id: 'controle_site', label: 'Controle Site' },
  { id: 'board', label: 'Board' },
];
```

### 2. EquipeAuth.tsx - Mapeamento de categorias

**Antes:**
```typescript
const areaCategories: Record<string, string[]> = {
  digital: ['rotina', 'dev'],
  gestao: ['gestao'],
  osg: ['osg'],
  projetos: ['projetos', 'fiscal', 'fixos'],
};
```

**Depois:**
```typescript
const areaCategories: Record<string, string[]> = {
  digital: ['rotina', 'dev'],
  projetos: ['projetos', 'fiscal', 'fixos'],
  osg: ['osg'],
  controle_site: ['gestao'],  // Mantém a categoria interna 'gestao'
  board: ['board'],           // Nova categoria
};
```

### 3. EquipeAuth.tsx - Rotas de navegação

**Antes:**
```typescript
const areaRoutes: Record<string, string> = {
  digital: '/equipe/digital',
  gestao: '/gestao',
  osg: '/equipe/osg/dashboard',
  projetos: '/equipe/projetos',
};
```

**Depois:**
```typescript
const areaRoutes: Record<string, string> = {
  digital: '/equipe/digital',
  projetos: '/equipe/projetos',
  osg: '/equipe/osg/dashboard',
  controle_site: '/gestao',
  board: '/equipe/board/dashboard',
};
```

---

## Nova Estrutura: Board

### BoardDashboard.tsx

Dashboard inicial para a área Board, seguindo o padrão visual das demais áreas:

- Fundo escuro com tema consistente
- Cards de métricas/ações rápidas
- Integração com BoardLayout

### BoardLayout.tsx

Layout compartilhado com:
- Sidebar colapsável
- Header com título da página
- Botão "Trocar área" que volta para `/equipe`

---

## Atualização do protectedPages.ts

Adicionar nova categoria ao tipo:
```typescript
category: 'dev' | 'rotina' | 'gestao' | 'geral' | 'fiscal' | 'fixos' | 'osg' | 'projetos' | 'board';
```

Adicionar página do Board:
```typescript
{
  page_path: '/equipe/board/dashboard',
  page_name: 'Board Dashboard',
  page_description: 'Painel principal da área Board',
  category: 'board',
  requires_admin: false,
  requires_team_member: true,
},
```

---

## Novas Rotas no App.tsx

```typescript
// Board Routes
<Route path="/equipe/board/dashboard" element={
  <TeamRoute>
    <PageAccessGate pagePath="/equipe/board/dashboard">
      <BoardDashboard />
    </PageAccessGate>
  </TeamRoute>
} />
```

---

## Resumo das Entregas

1. **Reordenação** - Nova ordem: Digital → Projetos → OSG → Controle Site → Board
2. **Renomeação** - "Gestão" passa a se chamar "Controle Site" na interface (internamente mantém categoria 'gestao')
3. **Nova área Board** - Dashboard e Layout criados do zero
4. **Permissões** - Nova categoria 'board' no sistema de controle de acessos
5. **Rotas** - Novas rotas configuradas no App.tsx

