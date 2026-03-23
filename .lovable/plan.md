

## Plano: Corrigir AuditoriaCruzada — nome, abas e filtros

### Arquivo 1: `src/pages/equipe/dev/AuditoriaCruzada.tsx`

3 correções:

1. **Título**: Trocar `title="Cruzamento de Dados"` para `title="Auditoria Cruzada"` e subtitle para "Auditoria cruzada entre fontes de dados fiscais"

2. **Accordions → Tabs**: Substituir os 3 `AccordionItem` por um componente `Tabs` com `TabsList` + `TabsTrigger` + `TabsContent`, mesmo padrão da ApuracaoPisCofins (usando `activeTab` state). As 3 abas:
   - "Balancete vs EFD Contribuições"
   - "EFD Contribuições vs EFD ICMS"  
   - "EFD Contribuições vs XMLs"
   - Conteúdo de cada aba: placeholder "Em construção"

3. **Filtros**: Trocar filtro "Nome" por "Cliente" (Select com dados de `useClientesList` ou query direta à tabela `cliente`). Adicionar filtro "Contribuinte" (Select carregado da tabela `contribuinte` filtrado pelo cliente selecionado, usando `useContribuintesByCliente`). Manter NCM, Alíquota e Tipo de Produto. Grid passa de 4 para 5 colunas (`lg:grid-cols-5`).

### Arquivo 2: `src/components/equipe/dev/DevLayout.tsx`

- Linha 60: Trocar label de `'Cruzamento de Dados'` para `'Auditoria Cruzada'`

2 arquivos, ~60 linhas alteradas.

