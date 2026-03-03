

# Renomear aba "Cadastro" para "Entregas" no módulo Tax

## Alterações

| Arquivo | O que muda |
|---|---|
| `src/components/equipe/fiscal/FiscalSidebar.tsx` | Linha 64: `label: 'Cadastro'` → `label: 'Entregas'`, linha 63: `id: 'cadastro-projetos'` → `id: 'entregas-projetos'` |
| `src/config/protectedPages.ts` | Linha 138: `page_name: 'Tax Cadastro'` → `page_name: 'Tax Entregas'`, linha 139: `page_description` atualizado para "Entregas de projetos da área Tax" |

As rotas (`/equipe/tax/projetos/cadastro`) permanecem inalteradas para não quebrar links existentes — apenas o label visível muda.

