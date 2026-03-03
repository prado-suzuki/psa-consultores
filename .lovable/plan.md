

# Remover sub-aba "Clientes" do Controle de Acessos

## Alterações em `src/pages/equipe/EquipeControleAcessos.tsx`

1. **Remover o `TabsTrigger`** "Clientes" (linhas 837-843)
2. **Remover o `TabsContent`** "clientes" inteiro (linhas 1499-1655)
3. **Remover estados não mais utilizados**: `selectedClientId` (linha 121) e `clientSearch` (linha 122)

Nenhum outro arquivo é afetado.

