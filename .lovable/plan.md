

# Plano de Ação — Fase 2: Extrair dicionários para `useClientFormOptions`

## Arquivo a Criar

**`src/hooks/useClientFormOptions.ts`**

Conterá os seguintes blocos extraídos de `NewClientModal.tsx` (linhas 528–608):

| Query/Memo | queryKey | Linhas atuais |
|---|---|---|
| `userRoles` | `user-roles-lider` | 528–534 |
| `profiles` | `profiles-all` | 536–542 |
| `catalogServices` | `servicos_prestados_services` | 544–553 |
| `allClusters` | `estrutura_clusters_for_os_filter` | 555–565 |
| `produtoSegmentoOptions` | `produto_segmento` | 567–573 |
| `CENTRO_CUSTO_OPTIONS` | `centros_custo_options` | 575–585 |
| `produtoSegmentoFullOptions` | `produto_segmento_full` | 595–601 |
| `lideres` (useMemo) | — | 603–608 |
| `PRODUTO_SEGMENTO_OPTIONS` (useMemo) | — | 589–592 |

O hook exportará:
```typescript
export function useClientFormOptions() {
  // ... todas as queries e memos acima
  return {
    lideres,
    catalogServices,
    allClusters,
    produtoSegmentoOptions,
    produtoSegmentoFullOptions,
    CENTRO_CUSTO_OPTIONS,
    PRODUTO_SEGMENTO_OPTIONS,
  };
}
```

## Arquivo a Editar

**`src/components/equipe/fiscal/NewClientModal.tsx`**

1. Remover as linhas 528–608 (queries + memos)
2. Adicionar import do hook
3. Desestruturar no início do componente:
```typescript
const { lideres, catalogServices, allClusters, produtoSegmentoOptions,
        produtoSegmentoFullOptions, CENTRO_CUSTO_OPTIONS,
        PRODUTO_SEGMENTO_OPTIONS } = useClientFormOptions();
```

## Escopo Protegido (NÃO será tocado)

- `useEffect` de `loadData` (edição)
- `executeSave` e toda lógica de mutação
- Estados do formulário, abas, drafts, `showExitConfirm`
- Tipos/interfaces, funções auxiliares, sub-componentes

## Resumo

| Ação | Arquivo |
|---|---|
| **Criar** | `src/hooks/useClientFormOptions.ts` |
| **Editar** | `src/components/equipe/fiscal/NewClientModal.tsx` (remover ~80 linhas, adicionar 1 import + 1 desestruturação) |

