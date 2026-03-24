

## Plano: Remover colunas Bloco SPED, CST e Alíquota do BalanceteEfdTab

Remover três colunas da tabela e o filtro de Bloco EFD que depende desses dados.

### Alterações em `src/components/equipe/dev/auditoria/BalanceteEfdTab.tsx`:
1. Remover as 3 colunas do `<TableHeader>`: "Bloco SPED", "CST", "Alíquota"
2. Remover as 3 `<TableCell>` correspondentes no `<TableBody>`: `bloco_efd`, `cst_pis`, `aliq_pis`
3. Remover o filtro `<Select>` de "Bloco EFD" e o estado `blocoFilter` + `blocoOptions` que dependiam da coluna `bloco_efd`
4. Remover referências a `bloco_efd` do `filteredItens` e da key do `TableRow`

### Alterações em `src/types/auditoriaCruzada.ts`:
1. Remover `cst_pis`, `aliq_pis` e `bloco_efd` da interface `BalanceteEfdItem`

1 arquivo editado + 1 tipo atualizado.

