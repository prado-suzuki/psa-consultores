

# Remover campo Contribuinte do formulário PER

## Contexto
O contribuinte já está selecionado no filtro da página principal (`ControlePerdcomp`), e o `contribuinteId` já é passado como prop para o `PerFormModal`. O campo de seleção de contribuinte no formulário é redundante.

## Alterações

**Arquivo:** `src/components/equipe/dev/perdcomp/PerFormModal.tsx`

1. **Remover o campo visual do formulário** (linhas 480-503): Deletar o bloco `<FormField name="id_contribuinte">` que renderiza o `<Select>` de contribuinte.

2. **Manter o valor no schema e no form**: O campo `id_contribuinte` continua existindo no `perSchema` e no `defaultValues` do `useForm`, pois é necessário para o insert/update no banco. O valor já é preenchido automaticamente via `contribuinteId` prop (linha 132: `id_contribuinte: contribuinteId || ''`).

3. **Remover a query de contribuintes** (linhas 148-161): A query `['contribuintes', clienteId]` que busca a lista de contribuintes para popular o Select pode ser removida, já que o Select não existirá mais.

Nenhuma alteração necessária em `ControlePerdcomp.tsx`, pois ele já passa `contribuinteId` corretamente para o modal.

