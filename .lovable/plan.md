

## Estruturar chamados por área/cluster — Frontend

As colunas `estrutura_area_id` e `cliente_id` já existem no banco mas ainda não constam no `types.ts` auto-gerado. Usaremos casts `as any` onde necessário até a regeneração dos tipos.

---

### 1. CreateTicketDialog.tsx — Select de Área + auto-fill department

**Alterações:**
- Adicionar state `areas` (lista de `estrutura_areas`) e `loadingAreas`
- No `useEffect` de `open`, chamar `fetchAreas()` que busca `estrutura_areas` (`id, name`) onde `is_active = true`, ordenado por `name`
- Adicionar campo `estrutura_area_id` ao `formData` (inicialmente `''`)
- Adicionar Select "Área" acima do campo Departamento. Ao selecionar uma área, preencher `estrutura_area_id` e auto-preencher `department` com o nome da área (lowercase, sem acentos — ou simplesmente o nome da área como string)
- O select de Departamento hardcoded permanece como fallback editável
- No INSERT, adicionar `estrutura_area_id: formData.estrutura_area_id || null` (cast `as any` no objeto)
- Validação: exigir `estrutura_area_id` OU `department` (pelo menos um)

### 2. NovoChamado.tsx — Preencher cliente_id

**Alterações:**
- Após criar o ticket com sucesso, buscar `representante` onde `user_id = auth.uid()` para obter `id_cliente`
- Se encontrar, fazer update no ticket recém-criado: `cliente_id = representante.id_cliente`
- Alternativa mais limpa: antes do INSERT, buscar o `representante` e incluir `cliente_id` diretamente no INSERT (cast `as any`)
- Se não houver vínculo, `cliente_id` fica `null` — comportamento esperado

### 3. GestaoChamados.tsx — Coluna e filtro "Área"

**Alterações:**
- No `fetchTickets`, adicionar `estrutura_area_id` ao select
- Buscar `estrutura_areas` (id, name) para montar um mapa `areaMap`
- Adicionar `estrutura_area_id` à interface `Ticket`
- Na tabela: adicionar coluna "Área" após "Departamento", exibindo `areaMap.get(ticket.estrutura_area_id)` ou "—"
- Nos filtros: adicionar Select "Área" com as opções de `estrutura_areas`. Adicionar `area` ao state `filters` (default `'todos'`)
- No `filteredAndSortedTickets`: filtrar por `estrutura_area_id` quando `filters.area !== 'todos'`

### 4. EquipeChamados.tsx — Coluna e filtro "Área"

**Alterações idênticas ao item 3:**
- Buscar `estrutura_area_id` no select de tickets
- Buscar `estrutura_areas` para mapa de nomes
- Adicionar coluna "Área" na tabela
- Adicionar filtro "Área" no painel de filtros
- Filtrar no `filteredAndSortedTickets`

### 5. GestaoDetalhesChamado.tsx — Exibir área

**Alterações:**
- O `fetchTicketDetails` já faz `select('*')`, então `estrutura_area_id` virá automaticamente
- Buscar nome da área: query em `estrutura_areas` pelo `estrutura_area_id` do ticket
- Adicionar Badge "Área: {nomeArea}" ao lado dos badges de Prioridade e Departamento

### 6. EquipeDetalhesChamado.tsx — Exibir área

**Alterações idênticas ao item 5:**
- Buscar nome da área pelo `estrutura_area_id`
- Adicionar Badge "Área: {nomeArea}" nos badges de detalhes

---

### Resumo de arquivos alterados

| Arquivo | Alteração |
|---|---|
| `src/components/gestao/CreateTicketDialog.tsx` | Select de área, auto-fill department, salvar `estrutura_area_id` |
| `src/pages/cliente/NovoChamado.tsx` | Buscar `representante` e preencher `cliente_id` no INSERT |
| `src/pages/gestao/GestaoChamados.tsx` | Coluna "Área" + filtro por área |
| `src/pages/equipe/EquipeChamados.tsx` | Coluna "Área" + filtro por área |
| `src/pages/gestao/GestaoDetalhesChamado.tsx` | Badge "Área" nos detalhes |
| `src/pages/equipe/EquipeDetalhesChamado.tsx` | Badge "Área" nos detalhes |

Nenhuma alteração de RLS, rotas ou páginas novas.

