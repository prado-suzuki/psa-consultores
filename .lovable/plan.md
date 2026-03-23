

## Plano: Nova ferramenta "Cruzamento de Dados" no card Levantamento de Créditos

### Arquivos

**1. `src/pages/equipe/dev/AuditoriaCruzada.tsx`** (novo, ~80 linhas)
- Layout com `DevLayout` (título "Cruzamento de Dados", subtitle "Cruzamento entre fontes de dados fiscais")
- Filtros globais em card `bg-muted/50`: Nome (Input text), NCM (Input text), Alíquota (Input text), Tipo de Produto (Select com opções "Todos", "Mercadoria", "Serviço")
- Botões Limpar e Consultar alinhados à direita
- 3 Accordions (`Accordion type="multiple"`):
  1. "Balancete vs EFD Contribuições"
  2. "EFD Contribuições vs EFD ICMS"
  3. "EFD Contribuições vs XMLs (NFe e CTe)"
- Cada accordion com placeholder "Em construção"

**2. `src/components/equipe/dev/DevLayout.tsx`** (~2 linhas)
- Adicionar em `pisCofinsSubItems`:
  ```ts
  { icon: FileSpreadsheet, label: 'Cruzamento de Dados', path: '/equipe/dev/cruzamento-dados' },
  ```

**3. `src/App.tsx`** (~3 linhas)
- Import `AuditoriaCruzada` e rota `/equipe/dev/cruzamento-dados` com `TeamRoute + PageAccessGate`

3 arquivos, ~90 linhas novas.

