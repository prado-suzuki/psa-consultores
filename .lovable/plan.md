

# Botão de exclusão de cliente na tabela de Gestão de Clientes

## Problema
Não há forma de excluir um cliente pela interface. O usuário quer um botão de excluir em cada linha da tabela, com confirmação antes de executar.

## Solução

**Arquivo:** `src/pages/equipe/dev/GestaoClientes.tsx`

### 1. Adicionar coluna "Ações" na tabela
- Nova `TableHead` no header: "Ações"
- Nova `TableCell` em cada linha com um botão de ícone `Trash2` (vermelho)
- O clique no botão de excluir usa `e.stopPropagation()` para não abrir o modal de edição

### 2. Estado para controle do AlertDialog
- `deletingCliente`: armazena `{ id, nome }` do cliente selecionado para exclusão
- Quando preenchido, exibe o `AlertDialog` de confirmação

### 3. AlertDialog de confirmação
- Título: "Excluir cliente"
- Descrição: "Tem certeza que deseja excluir o cliente **{nome}**? Esta ação não pode ser desfeita."
- Botão "Cancelar" e botão "Excluir" (destructive)

### 4. Lógica de exclusão
- Deletar registros dependentes da tabela de contribuintes (`contribuinteTable`) com `cliente_id` igual ao cliente
- Deletar registros dependentes das tabelas de contratos/OS vinculadas ao cliente
- Deletar o cliente da tabela `clienteTable`
- Invalidar queries e exibir toast de sucesso
- Respeita a variável `isProductionEnvironment` para apontar às tabelas corretas

### Imports adicionais
- `Trash2` (já usado em outros lugares do projeto)
- `AlertDialog` e componentes relacionados

