

## Plano: Adicionar Visão Geral e Card de Filtros padronizados em Mapa NCM

Aplicar em `src/pages/equipe/dev/MapaNCMPisCofins.tsx` o mesmo padrão visual de `ConsultaXMLs.tsx` e `ControlePerdcomp.tsx`.

### 1. Adicionar `DevPageHeader` (Visão Geral)

Logo abaixo do `<DevLayout>`, antes dos filtros:

```tsx
<DevPageHeader
  description="O **Mapa NCM** centraliza as **regras fiscais de PIS/COFINS** por NCM e segmento de negócio. Use os filtros abaixo para localizar regras específicas, criar novas regras, editar tratamentos tributários (CST, base legal, permissão de crédito) e manter a base atualizada para uso nos cálculos de apuração e correções SPED."
  manualUrl="#"
/>
```

(URL do manual fica como placeholder `#` até existir documentação — mesmo padrão usado nas outras ferramentas quando ainda não há link real.)

### 2. Substituir a barra de filtros atual por Card padronizado

Hoje a página usa um `<div className="bg-slate-50 rounded-xl p-4 mb-6 ...">`. Trocar por `Card` com `CardHeader` (título "FILTROS DE BUSCA" com ícone `Filter` teal) + `CardContent` contendo:

- **Linha 1 (grid)**:
  - **Buscar** (`Search` input) — busca livre por NCM, descrição CST, base legal ou setor.
  - **Setor** (`Select`) — filtro dropdown por segmento (lista de `setores`), opção "Todos".
  - **Permite Crédito** (`Select`) — Todos / Sim / Não (substitui o `Switch` atual, alinhando com padrão de Selects das demais ferramentas).

- **Divider** (`<Separator />`) e linha de ações alinhadas à direita:
  - Botão **Limpar Filtros** (`Eraser`, ghost) — visível quando há filtros ativos.
  - Botão **Nova Regra** (`Plus`, teal) — mantém ação existente.

### 3. Estado e lógica

- Adicionar `setorFilter: string` e `creditFilter: 'all'|'S'|'N'` substituindo o `creditOnly` boolean.
- Atualizar `useMemo filtered` e `uniqueValues` para considerar `setorFilter` e `creditFilter`.
- Adicionar `hasActiveFilters` e `handleClearFilters` (reseta search, setor, crédito, página).

### 4. Imports a adicionar

```ts
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { DevPageHeader } from '@/components/equipe/dev/DevPageHeader';
import { Filter, Eraser } from 'lucide-react';
```

Remover import do `Switch` (não mais usado).

### 5. Resultado

A página passa a ter o mesmo cabeçalho (alert verde "Visão Geral" + link "aqui") e o mesmo card "FILTROS DE BUSCA" das demais ferramentas do módulo Dev, mantendo todas as funcionalidades existentes (CRUD, paginação, filtros de coluna em cascata, modal de regra).

### Arquivos alterados

- `src/pages/equipe/dev/MapaNCMPisCofins.tsx` (único arquivo)

Sem mudanças de banco, hooks ou rotas.

