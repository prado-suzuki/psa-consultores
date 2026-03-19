

## Plano: Exibir nome completo do produto no painel esquerdo

### Alteração única em `src/components/equipe/ProdutoServicoTab.tsx`

Na linha onde renderiza `{p.codigo}` dentro do botão do produto (linha ~95), trocar para:

```
{p.codigo} — {p.nome}
```

Isso aplica-se em dois pontos:
1. **Lista de produtos** (painel esquerdo) — o `<span className="truncate">` que hoje mostra só `p.codigo`
2. **Header do painel direito** — onde mostra o código do produto selecionado após "Serviços —"

Nenhuma outra alteração necessária.

