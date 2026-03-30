

## Plano: Copiar valor ao dar duplo clique nas células das tabelas

### Alteração (arquivo único: `ApuracaoDataTable.tsx`)

Adicionar um handler `onDoubleClick` nas `TableCell` de valores (moeda e texto) que copia o conteúdo para a área de transferência e exibe um toast de confirmação.

**Implementação:**

1. Criar função utilitária `handleCellDoubleClick` no componente que recebe o valor (string ou número), copia via `navigator.clipboard.writeText()` e chama `toast("Copiado!")` com ícone.

2. Aplicar `onDoubleClick` + `className="cursor-copy"` em:
   - Células sticky (CST, Conta, Descrição, Bloco)
   - Células de valores monetários (períodos)
   - Célula de total
   - Células da linha de totais gerais

3. Importar `toast` de `sonner`.

| Arquivo | Alteração |
|---------|-----------|
| `ApuracaoDataTable.tsx` | Handler `onDoubleClick` em todas as `TableCell` + cursor copy + toast |

