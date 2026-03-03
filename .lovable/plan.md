

# Corrigir proporção do card de permissões

## Problema
O card "Acessos de [usuário]" (coluna direita na aba Usuários) não tem limite de altura nem scroll, ficando desproporcional quando há muitas páginas/categorias. O conteúdo transborda e não é possível ver/ajustar todas as opções.

Mesma situação nos dialogs de criação e edição de usuário -- com 6 papéis + 5 áreas, o conteúdo excede a viewport.

## Correções

### 1. Card de permissões do usuário (linhas 1279-1389)
- Adicionar `ScrollArea` com `max-h-[600px]` no `CardContent` interno (onde lista as categorias e páginas)
- Isso permite rolar dentro do card sem perder o header com botões "Editar/Excluir"

### 2. Dialog de criação de usuário (linha 1007)
- Alterar `DialogContent` para `sm:max-w-lg` e adicionar `max-h-[85vh] overflow-y-auto` no container do formulário

### 3. Dialog de edição de usuário (linha 1476)
- Mesma correção: `sm:max-w-lg` e `max-h-[85vh] overflow-y-auto` no container do formulário

### Arquivo
- `src/pages/equipe/EquipeControleAcessos.tsx` — 3 pontos de alteração

