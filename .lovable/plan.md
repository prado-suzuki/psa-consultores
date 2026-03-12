

## Plano: Remover valor da OS do card

Remover a exibição do valor monetário do card da OS, mantendo apenas:
- Serviço vinculado (badge)
- Datas de início e fim

**Arquivo**: `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`

**Alteração**: Remover o bloco que exibe `getOsValue(os)` (linhas 756-760), deixando apenas as datas e o badge de serviço.

