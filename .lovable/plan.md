## Objetivo

Executar exatamente `supabase/migrations/20260731170000_carga_clientes_contratos_a_faturar.sql` (commit e8442858), sem alterar uma linha do arquivo e sem tocar em mais nada.

## Pré-voo já executado (leitura)

- Baseline: **126** clientes `prod`/`excluido=false`, **275** vínculos em `cliente_clusters`.
- Nenhum dos 40 ids da carga existe hoje em `public.cliente` (0 colisões).
- Os **7** cluster ids da carga existem em `estrutura_clusters`: PSA AUDITORES `ce7f2633`, Prado Advogados `39e30aff`, TAX `b21b0b89`, OSG `0523512c`, PROFITTO `00f188e3`, PSA NORTE `2dbd46f8` e **Familly Business `4e53c13d`**. Distribuição conferida no arquivo: 17 / 14 / 3 / 3 / 3 / 2 / 1 = 43 vínculos.
- Observação (não bloqueia): 5 desses clusters estão com `is_active = false` — as travas só exigem existência, não atividade.

## O que a migration faz (lida, não alterada)

- Temp tables `carga_cliente` (40 linhas, **id fixo** por cliente) e `carga_cliente_cluster` (43 pares).
- **11 travas**, todas com mensagem iniciada em `Abortado:` — **8 antes** da carga (contagem 40; contagem 43; nome repetido na própria carga, agora com `string_agg` dentro do grupo, corrigindo o 42803 da 1ª tentativa; colisão de nome com cliente `prod` vivo; cliente sem cluster na carga; cluster inexistente no banco; vínculo apontando para cliente fora da carga; id já existente em `cliente`) e **3 depois** do insert (40 clientes gravados; 43 vínculos gravados; zero cliente sem cluster).
- INSERT dos 40 clientes com id explícito (`ambiente='prod'`, `ativo=true`, `excluido=false`) e, na mesma transação, os 43 vínculos direto da temp table — sem JOIN por nome e sem `RETURNING`, que era a causa do aborto da 2ª tentativa (`Araguaia S.A.` → `Araguaia S.a.` pelo `normalize_name_title_case`). Cabe numa transação só porque `trg_cliente_tem_cluster` é DEFERRABLE INITIALLY DEFERRED.
- `DROP` das temp tables, `COMMIT`, e depois o SELECT final por lista de ids.

Nenhum schema, policy, trigger ou código de front é tocado. Nada em `dev`.

## Execução

1. Rodar a migration pela ferramenta de migration, com o SQL do arquivo exatamente como está.
2. Rodar o SELECT final (`id, nome, municipio, uf, clusters`) e devolver as **40 linhas inteiras**, sem resumir, com ids completos.
3. Pós-voo: confirmar delta de **+40** clientes (126 → 166) e **+43** vínculos (275 → 318), e declarar explicitamente que **nenhuma das 11 travas** disparou.

## Se algo abortar

Qualquer `RAISE EXCEPTION 'Abortado: ...'` desfaz a transação inteira e nada é gravado. Nesse caso devolvo a mensagem completa e o diagnóstico da causa, sem contornar, sem ajustar a migration e sem tentar de novo.
