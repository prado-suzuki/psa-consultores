

## Plano: Simplificar filtros globais da Auditoria Cruzada

### Arquivo: `src/pages/equipe/dev/AuditoriaCruzada.tsx`

Manter apenas 4 filtros globais: **Cliente**, **Contribuinte**, **Data Início** e **Data Fim**. Remover NCM, Alíquota e Tipo de Produto (serão adicionados dinamicamente por aba no futuro).

1. **Remover states**: `ncm`, `aliquota`, `tipoProduto` e suas referências no `handleLimpar`
2. **Remover imports** não mais usados (Input se não houver outro uso)
3. **Reorganizar grid**: Uma única linha com 4 colunas (`lg:grid-cols-4`) contendo Cliente, Contribuinte, Data Início, Data Fim
4. **Mover botões** Limpar/Consultar para a mesma linha ou logo abaixo

1 arquivo, ~30 linhas removidas/simplificadas.

