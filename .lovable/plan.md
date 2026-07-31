## Objetivo

Executar exatamente a migration `supabase/migrations/20260731170000_carga_clientes_contratos_a_faturar.sql` (já na main, commit 095f7c96) contra o banco, sem alterar seu conteúdo nem tocar em mais nada.

## O que a migration faz (lida, não alterada)

- Cria uma temp table `carga_cliente` com 40 linhas (nome, telefone, município, UF, clusters).
- Roda 4 travas pré-carga: contagem = 40, nome repetido na própria carga, colisão de nome com cliente `prod` não excluído, cluster inexistente em `estrutura_clusters`.
- Insere os 40 clientes em `public.cliente` (`ambiente='prod'`, `ativo=true`, `excluido=false`) e, na mesma transação, os 43 vínculos em `public.cliente_clusters` — necessário porque `trg_cliente_tem_cluster` é DEFERRABLE INITIALLY DEFERRED.
- Roda 3 conferências pós-carga: 40 clientes, 43 vínculos, zero cliente sem cluster.
- `COMMIT` e, depois do commit, o SELECT final com `id, nome, municipio, uf, clusters`.

Nenhum schema, policy, trigger ou código de front é tocado. Nada em `dev`.

## Execução

1. **Pré-voo (leitura)**: contar clientes `prod`/`excluido=false` e vínculos em `cliente_clusters` antes, para ter baseline; conferir que os 6 cluster ids usados existem em `estrutura_clusters`.
2. **Executar a migration** via ferramenta de migration, com o SQL do arquivo exatamente como está.
3. **Rodar o SELECT final** (o bloco que fica após o `COMMIT`) e devolver as **40 linhas inteiras**, sem resumir, com os ids completos.
4. **Pós-voo**: confirmar delta de +40 clientes e +43 vínculos e que nenhuma trava `Abortado:` disparou.

## Se algo abortar

Se qualquer `RAISE EXCEPTION 'Abortado: ...'` disparar, a transação inteira é desfeita e nada é gravado. Nesse caso devolvo a mensagem completa, sem contornar, sem ajustar a migration e sem tentar novamente.

## Observação técnica

O `nome` passa pelo trigger `normalize_name_title_case`; se ele alterar a grafia de algum nome, o `IN (...)` do SELECT final pode devolver menos de 40 linhas. Se isso acontecer, não altero a migration: reporto e complemento a listagem com uma consulta equivalente por id, deixando claro o que foi ajustado só na leitura.
