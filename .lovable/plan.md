

# Remover aba "Categorias" duplicada — manter apenas "Serviços Prestados"

## Contexto
As abas "Categorias" e "Serviços Prestados" operam sobre a mesma tabela `tax_categorias`. A aba "Serviços Prestados" é mais completa (inclui vínculo com Área), tornando "Categorias" redundante.

## Alterações

**Arquivo:** `src/components/equipe/CadastroCategorias.tsx`

1. **Remover** o componente `CategoriasTab` (linhas 21-119)
2. **Remover** a `TabsTrigger` e `TabsContent` de "Categorias" (linhas 686-688 e 703)
3. **Alterar** `defaultValue` das Tabs de `"categorias"` para `"servicos"`
4. Atualizar texto descritivo do `CardHeader` removendo menção a "categorias"

Nenhuma migração SQL necessária — ambas as abas já usam `tax_categorias`.

