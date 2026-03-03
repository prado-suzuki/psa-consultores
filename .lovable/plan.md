

# Tornar linhas da tabela de projetos clicáveis

## Problema
As linhas da tabela de projetos não são clicáveis. O usuário precisa clicar no pequeno ícone de lápis para editar, o que é difícil de encontrar/usar.

## Solução
Adicionar `onClick={() => handleOpenModal(project)}` e `className="cursor-pointer hover:bg-slate-50"` em cada `<TableRow>` da listagem de projetos, permitindo que clicar em qualquer lugar da linha abra o modal de edição.

Para evitar duplo disparo, adicionar `e.stopPropagation()` nos botões de ação (editar/excluir) dentro da linha.

## Arquivo impactado
| Arquivo | Alteração |
|---|---|
| `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx` | Adicionar onClick + cursor-pointer nas TableRows + stopPropagation nos botões |

