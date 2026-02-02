

# Plano: Ajustes na Ferramenta DIFAL Inteligente

## Alterações Solicitadas

1. **Trocar a ordem dos cards**: "Pendentes" primeiro, depois "Total de Itens", depois "Validados"
2. **Corrigir capitalização**: "Total de itens" → "Total de Itens" (já está correto no código, mas confirmaremos)
3. **Pré-selecionar "Pendentes"**: Ao clicar em "Buscar Itens", o filtro deve iniciar com status `pending`
4. **Modal - Layout do Resumo do Grupo**: Mover "Valor Total" para baixo de "Itens" e "NFes"

## Análise do Código Atual

### Cards de Estatísticas (linhas 876-930)
A ordem atual é: Total de Itens → Validados → Pendentes

O código está correto com "Total de Itens" (capitalização correta).

### Filtro de Status (linha 119)
```typescript
const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
```

### Modal - Resumo do Grupo (linhas 246-261)
Layout atual em `grid-cols-3`:
```
| Itens | NFes | Valor Total |
```

O valor fica cortado devido ao espaço limitado.

## Mudanças Técnicas

### 1. AuditoriaFiscal.tsx - Reordenar Cards

**Antes (linhas 878-930):**
```
Card 1: Total de Itens (all)
Card 2: Validados (validated)
Card 3: Pendentes (pending)
```

**Depois:**
```
Card 1: Pendentes (pending) - primeiro pois é o mais importante
Card 2: Total de Itens (all) - mantém capitalização correta
Card 3: Validados (validated)
```

### 2. AuditoriaFiscal.tsx - Pré-selecionar Pendentes ao Buscar

Na função `handleSearch` (linha 458), após `setSearchTriggered(true)`, adicionar:
```typescript
setSearchTriggered(true);
setStatusFilter('pending'); // Pré-selecionar Pendentes
```

### 3. DifalAuditModal.tsx - Layout do Resumo do Grupo

Mudar de `grid-cols-3` para layout vertical empilhado:

**Antes (linhas 246-261):**
```tsx
<div className="grid grid-cols-3 gap-3 mt-3">
  <div>Itens</div>
  <div>NFes</div>
  <div>Valor Total (truncado)</div>
</div>
```

**Depois:**
```tsx
<div className="grid grid-cols-2 gap-3 mt-3">
  <div>Itens</div>
  <div>NFes</div>
</div>
<div className="mt-3">
  <div>Valor Total (largura total)</div>
</div>
```

Isso dá espaço completo para o valor monetário sem truncar.

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/equipe/dev/AuditoriaFiscal.tsx` | Reordenar cards (Pendentes, Total, Validados) + Pré-selecionar 'pending' no handleSearch |
| `src/components/equipe/dev/DifalAuditModal.tsx` | Mudar grid de 3 colunas para 2 colunas + linha separada para Valor Total |

## Detalhes das Mudanças

### AuditoriaFiscal.tsx

**Linha 458** - Adicionar após `setSearchTriggered(true)`:
```typescript
setStatusFilter('pending'); // Pré-selecionar Pendentes ao buscar
```

**Linhas 876-930** - Nova ordem dos cards:
1. Card Pendentes (amber) com `onClick={() => handleStatusFilterChange('pending')}`
2. Card Total de Itens (slate) com `onClick={() => handleStatusFilterChange('all')}`
3. Card Validados (green) com `onClick={() => handleStatusFilterChange('validated')}`

### DifalAuditModal.tsx

**Linhas 246-261** - Novo layout:
```tsx
<div className="grid grid-cols-2 gap-3 mt-3">
  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
    <p className="text-2xl font-bold text-slate-900 dark:text-white">{group.count}</p>
    <p className="text-xs text-slate-500">Itens</p>
  </div>
  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
    <p className="text-2xl font-bold text-slate-900 dark:text-white">{group.nfesCount}</p>
    <p className="text-xs text-slate-500">NFes</p>
  </div>
</div>
<div className="mt-3">
  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
    <p className="text-lg font-bold text-slate-900 dark:text-white">
      {formatCurrency(group.totalValue)}
    </p>
    <p className="text-xs text-slate-500">Valor Total</p>
  </div>
</div>
```

## Fluxo Esperado Após Implementação

1. Usuário seleciona contribuinte e clica "Buscar Itens"
2. Sistema automaticamente seleciona filtro "Pendentes"
3. Cards aparecem na ordem: **Pendentes** (destacado) | Total de Itens | Validados
4. Ao abrir modal de classificação, o "Valor Total" aparece em linha separada com espaço completo

