

# Correcoes de Layout, Limpeza de Codigo e Responsividade

## Resumo
Corrigir 4 problemas de UI/UX identificados na validacao de layout: grid quebrado nos filtros, estados ociosos no codigo, feedback visual no botao de busca, e responsividade mobile no modal.

---

## 1. Corrigir Grid dos Filtros (GestaoClientes.tsx)

A soma atual das colunas no desktop e 3+5+2+2+2 = 14 (excede 12). Redistribuir para somar exatamente 12:

- Cliente: `md:col-span-3` (mantido)
- Contribuinte: `md:col-span-3` (era 5)
- Status: `md:col-span-2` (mantido)
- Tipo: `md:col-span-2` (mantido)
- Categoria: `md:col-span-2` (mantido)

Total: 3+3+2+2+2 = 12

---

## 2. Remover Estados Ociosos (GestaoClientes.tsx)

Remover completamente:
- Declaracoes: `const [tipoPessoa, setTipoPessoa]` e `const [cpfCnpj, setCpfCnpj]`
- Referencias em `hasActiveFilters`: remover `|| tipoPessoa || cpfCnpj`
- Referencia em `hasContribuinteFilters`: remover `|| tipoPessoa || cpfCnpj` (ficara apenas `nomeRazaoSocial`)
- Na queryKey da query principal: remover `tipoPessoa, cpfCnpj`
- Na query de contribuinte dentro da query principal: remover as linhas `if (tipoPessoa)` e `if (cpfCnpj)`
- No `handleClear`: remover `setTipoPessoa('')` e `setCpfCnpj('')`

---

## 3. Feedback Visual no Botao Buscar (GestaoClientes.tsx)

- Importar `Loader2` do lucide-react
- No botao "Buscar": adicionar `disabled={isLoading}` e trocar o icone condicionalmente:
  - Se `isLoading`: mostrar `<Loader2 className="h-4 w-4 animate-spin" />` no lugar do `<Search />`
  - Texto muda para "Buscando..." durante o loading

---

## 4. Responsividade Mobile no Modal (NewClientModal.tsx)

Aplicar abordagem mobile-first em todos os grids internos das 4 abas. A regra: todo `col-span-X` fixo (onde X < 12) deve virar `col-span-12 md:col-span-X`.

### Aba Cliente (linhas 863-981)
Campos que usam `col-span-6` passam para `col-span-12 md:col-span-6`.

### Aba Contribuintes -- Inline edit (linhas 1063-1165)
- `col-span-3` vira `col-span-12 md:col-span-3`
- `col-span-9` vira `col-span-12 md:col-span-9`
- `col-span-6` vira `col-span-12 md:col-span-6`
- `col-span-4` vira `col-span-12 md:col-span-4`
- `col-span-8` vira `col-span-12 md:col-span-8`
- `col-span-5` vira `col-span-12 md:col-span-5`

### Aba Contribuintes -- Draft (linhas 1186-1311)
Mesma logica: todos os `col-span-X` (onde X < 12) recebem `col-span-12` como default mobile.

### Aba Participantes -- Inline edit (linhas 1385-1443)
`col-span-6` vira `col-span-12 md:col-span-6`.

### Aba Participantes -- Draft (linhas 1457-1506)
`col-span-6` vira `col-span-12 md:col-span-6`.

### Aba Contratos -- Inline edit (linhas 1584-1651)
- `col-span-6` vira `col-span-12 md:col-span-6`
- `col-span-4` vira `col-span-12 md:col-span-4`

### Aba Contratos -- Draft (linhas 1664-1725)
- `col-span-6` vira `col-span-12 md:col-span-6`
- `col-span-4` vira `col-span-12 md:col-span-4`

---

## Resumo de alteracoes

| Arquivo | O que muda |
|---------|-----------|
| `GestaoClientes.tsx` | Grid 12 cols corrigido, estados ociosos removidos, botao Buscar com loading |
| `NewClientModal.tsx` | Todos os col-span internos adaptados para mobile-first |

