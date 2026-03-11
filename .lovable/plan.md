

## Plano: Mover campos de cliente para exibição na aba OS (sem mudar tabela)

Alteração puramente de UI — nenhuma migration, nenhuma mudança de banco.

### Arquivo: `src/components/equipe/dev/NewClientModal.tsx`

**1. Remover os dois campos da aba "Dados do Cliente"**
- Remover linhas ~1728-1826 (bloco "Tipo de produto/segmento" + bloco "Empresa / Faturamento")

**2. Inserir no topo da aba "contratos", antes da section de OS**
- Adicionar um bloco separado visualmente (card próprio com header "Dados Comerciais do Cliente" ou similar) entre a abertura do `TabsContent value="contratos"` (linha 3093) e a `section` de OS (linha 3094)
- Usar uma `section` com `bg-card rounded-xl border shadow-sm` e header distinto (ex: ícone + "Classificação do Cliente") para deixar claro que são dados do cliente, não da OS
- Manter exatamente o mesmo markup e bindings (`clientData.tipo_produto_segmento`, `clientData.empresa_faturamento`, `toggleEmpresaFaturamento`)
- Separar visualmente com `mb-4` entre este bloco e a section de OS abaixo

**3. Sem alterações em:**
- Estado, lógica de save/load, validação, queries, banco de dados
- Os campos continuam salvos na tabela de cliente como hoje

