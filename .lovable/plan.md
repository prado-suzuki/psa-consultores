

# Fix: Botão "Excluir Perfil" na Consulta de XMLs

## Problema
O botão de excluir (ícone Trash2) está renderizado **dentro** de um `SelectItem` do Radix Select. O Radix Select captura eventos de ponteiro nos itens, impedindo que o `onClick` do botão de excluir funcione corretamente -- o clique seleciona o item ao invés de abrir a confirmação de exclusão.

## Solução
Mover o botão de excluir para **fora** do `Select`. Adicionar um botão "Excluir" visível ao lado do seletor de perfis, habilitado apenas quando um perfil está selecionado. Ao clicar, abre o `AlertDialog` de confirmação existente.

### Alterações em `src/components/equipe/dev/ExportDialog.tsx`

1. **Remover o botão inline** dentro do `SelectItem` (linhas 621-631) -- o ícone Trash2 dentro de cada item do dropdown.

2. **Adicionar botão "Excluir" na toolbar** (ao lado dos botões "Salvar" e "Favoritar", ~linha 646), visível quando `selectedProfileId` está preenchido:
   ```tsx
   <Button
     variant="outline"
     className="flex flex-col items-center justify-center h-auto py-1.5 px-2 gap-0.5 min-w-[48px] text-destructive hover:text-destructive"
     onClick={() => setDeleteConfirmId(selectedProfileId)}
   >
     <Trash2 className="h-4 w-4" />
     <span className="text-[10px] leading-tight">Excluir</span>
   </Button>
   ```

Isso resolve o conflito de eventos do Radix Select e torna a exclusão funcional e acessível.

