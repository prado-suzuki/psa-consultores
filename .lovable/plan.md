

## Plano: Otimizar tabela de projetos — unificar colunas e responsividade

### Arquivo: `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`

**1. Unificar "Executor" e "Líder" em coluna "Equipe"**

Substituir as duas colunas separadas por uma única que empilha as informações:

```text
Ricardo Migueis
  (executor)
Felipe Matias
  (líder)
```

- Nome em `text-sm`, label em `text-xs text-muted-foreground`
- Sorting pela coluna "equipe" ordena pelo nome do executor (primário)

**2. Remover coluna "Horas"** (todos exibem "-", sem dados úteis)

**3. Larguras revisadas** (table-fixed mantido):

| Coluna | Largura |
|--------|---------|
| Projeto | 20% |
| Produto | 16% |
| Serviço | 14% |
| Cliente | 13% |
| Área | 10% |
| Equipe | 12% |
| Status | 5% |
| Início | 5% |
| Término | 5% |

**4. Scroll horizontal** — adicionar `overflow-x-auto` e `min-w-[900px]` na tabela para telas pequenas não comprimirem.

**5. Ajustes menores:**
- Atualizar `colSpan` das linhas de loading/empty de 12 para 9
- Remover referência a `projectHours` na tabela (hook pode continuar importado se usado em outro lugar)
- Atualizar `getSortValue` para remover case `lider` separado e usar `executor` na coluna equipe

