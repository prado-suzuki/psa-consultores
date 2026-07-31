## Objetivo

Executar exatamente `supabase/migrations/20260731200000_carga_contribuintes_contratos_a_faturar.sql` (commit cfb148c1), sem alterar uma linha e sem tocar em mais nada.

## Pré-voo já executado (somente leitura)

- `contribuinte` prod / não excluído: **189** — bate com o esperado.
- `cliente` prod / não excluído: **166** — bate com o esperado.

Simulei também as travas do arquivo contra a base ao vivo, sem gravar nada:

- 39 linhas na carga, **39 documentos distintos** (nenhum repetido internamente).
- **0 colisões de documento** com `contribuinte` prod vivo, já usando a mesma normalização do arquivo (`lpad` com o zero à esquerda reposto, 11 ou 14 dígitos).
- **0 colisões de id** — nenhum dos 39 uuid v5 existe hoje na tabela.
- **0 clientes de destino faltando**: os 39 `cliente_id` existem, estão em `prod` e não estão excluídos (35 da etapa 1 + os 4 pré-existentes: São Francisco Agronegócios, Grupo Piccini, Alessio Sansão e Sch Agrícola).

Nenhuma das seis travas deve disparar.

## O que a migration faz (lida, não alterada)

`BEGIN` → temp table `carga_contribuinte` (39 linhas, id fixo) → bloco `DO` com **6 travas** pré-carga (contagem 39; documento não numérico ou fora de 11/14 dígitos; `tipo_pessoa` incoerente com o tamanho do documento; documento repetido na carga; documento já existente em `contribuinte` prod; cliente de destino inexistente/excluído/não-prod; id já existente) → `INSERT` dos 39 com `NULL` explícito em inscrição estadual, situação, CNAE, setor, `simples_nacional` e `setor_cliente_id`, `contribuinte_faturamento=false`, `excluido=false`, `ambiente='prod'` → bloco `DO` de conferência com **3 checagens** pós-insert (39 gravados; nenhum sem documento; nenhum sem cliente) → `DROP TABLE` → `COMMIT` → `SELECT` final por lista de ids.

Nenhum schema, policy, trigger, índice ou coluna é tocado. Nenhum UPDATE ou DELETE. Nada em `dev`.

## Execução

1. Rodar a migration pela ferramenta de migration, com o SQL do arquivo exatamente como está.
2. Rodar o GATE: `SELECT count(*) FROM public.contribuinte WHERE ambiente='prod' AND excluido=false` — esperado **228** (189 + 39).
3. Rodar o `SELECT` final da própria migration e devolver as **39 linhas inteiras** (id, documento, razão social, município, UF, cliente), sem resumir.
4. Declarar explicitamente que nenhuma das 6 travas pré-carga nem das 3 conferências pós-insert disparou.

## Se algo abortar

Qualquer `RAISE EXCEPTION 'Abortado: ...'` desfaz a transação inteira e nada é gravado. Nesse caso devolvo a mensagem completa e o diagnóstico da causa, sem corrigir o arquivo, sem contornar e sem tentar de novo.

## Nota de leitura (não é erro)

O trigger `normalize_name_title_case` roda `initcap()` na gravação, então `ARAGUAIA S.A.` e `Morro Da Mesa Concessionaria S/A.` aparecerão com caixa ajustada no SELECT final. Como os ids são fixos, isso não afeta nada.
