# Plano: adicionar slot de cor em `estrutura_areas`

## O que será feito

1. Aplicar migration 1 — adicionar a coluna `color_index` em `public.estrutura_areas` e preencher as áreas existentes com slots de 1 a 8 (ativas primeiro, depois inativas, ciclando quando passar de 8).
2. Aplicar migration 2 — criar a função `public.realoca_color_index_na_ativacao()` e o trigger `trg_realoca_color_index_na_ativacao` para realocar o slot quando uma área inativa for ativada e houver colisão.
3. Rodar as queries de confirmação solicitadas e reportar os resultados.

## Restrições respeitadas

- Nenhuma alteração em RLS, políticas, papéis ou permissões.
- Nenhuma alteração em arquivos de frontend.
- Nenhuma outra migration será aplicada além das duas desta mensagem.
- A coluna `color_index` permanece nullable conforme solicitado.
- Nenhum índice, constraint, renomeação ou função extra será adicionada.

## Validação

Após aplicar, executar:
- Verificar existência/tipo da coluna `color_index`.
- Verificar existência do trigger `trg_realoca_color_index_na_ativacao`.
- Listar `name, is_active, color_index` ordenado.
- Confirmar que `count(*) where color_index is null` retorna zero.
