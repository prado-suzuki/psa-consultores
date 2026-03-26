

## Plano: Ajustar espaçamentos e larguras na tabela de projetos

### Arquivo: `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`

A coluna "Serviço" já existe na tabela e o `servico_nome` já é resolvido no hook. O ajuste é apenas de larguras e truncamento.

**Alterações nas colunas do `TableHeader` e `TableBody`:**

| Coluna | width | Truncamento |
|--------|-------|-------------|
| Projeto | 18% | `truncate max-w-0` + `title` |
| Produto | 15% | `truncate max-w-0` + `title` |
| Serviço | 13% | `truncate max-w-0` + `title` |
| Cliente | 12% | `truncate max-w-0` + `title` |
| Área | 10% | `whitespace-nowrap` |
| Executor | w-auto | `break-words` (responsável) |
| Líder | w-auto | `break-words` |
| Status | w-auto | `whitespace-nowrap` |
| Início | w-auto | `whitespace-nowrap` |
| Término | w-auto | `whitespace-nowrap` |
| Horas | w-auto | — |
| Ações | w-auto | — |

**Implementação:**
- Adicionar `style={{ width: 'X%' }}` nos `TableHead` das colunas principais
- Nas `TableCell` correspondentes, usar `className="truncate max-w-0"` e envolver o conteúdo com `title={texto}` para tooltip nativo
- Para Executor/Líder, usar `break-all` ou `break-words`
- Adicionar `table-fixed` na `Table` para forçar larguras proporcionais

