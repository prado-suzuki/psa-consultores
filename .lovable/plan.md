

## Correção dos 3 Bugs — Exibição de Produtos

3 edições cirúrgicas em 2 arquivos:

### 1. `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`
- **L676**: Mudar concatenação de `p.produto_codigo` para `${p.produto_codigo} — ${p.produto_nome}` nos cards de OS
- **L730**: Mudar condição `selectedOsProdutos.length > 1` para `selectedOsProdutos.length >= 1` para sempre mostrar o select de produto

### 2. `src/components/equipe/client-form/ContratosTab.tsx`
- **L46**: Mudar `p!.codigo` para `${p!.codigo} — ${p!.nome}` no header colapsado das OS

Nenhuma lógica de dados ou hook alterada. 3 linhas, 2 arquivos.

