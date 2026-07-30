## SQL final, para conferência antes de aplicar

```sql
BEGIN;

-- Matriz de cobertura: uma linha por documento solicitado, com a contagem de
-- arquivos amarrados àquele documento. Linha com zero é buraco; combinação que
-- não aparece é porque não foi solicitada para aquela entidade.
--
-- security_invoker = on é OBRIGATÓRIO: sem ele a view rodaria com a permissão
-- do dono e mostraria o checklist de todos os clientes para qualquer usuário
-- logado. Com ele, valem as policies de checklist_cliente_item e
-- documento_arquivo, e a view não precisa de filtro de segurança próprio.
CREATE OR REPLACE VIEW public.cobertura_documentos_cliente
WITH (security_invoker = on) AS
SELECT
  i.cliente_id,
  i.id AS checklist_item_id,
  CASE
    WHEN i.pessoa_id IS NOT NULL AND p.tipo_pessoa = 'PJ' THEN 'pessoa_pj'
    WHEN i.pessoa_id IS NOT NULL                          THEN 'pessoa_pf'
    WHEN i.matricula_id IS NOT NULL                       THEN 'matricula'
    WHEN i.bem_id IS NOT NULL                             THEN 'bem'
    ELSE 'cliente'
  END AS entidade_tipo,
  COALESCE(i.pessoa_id, i.matricula_id, i.bem_id) AS entidade_id,
  COALESCE(
    p.denominacao,
    CASE WHEN m.id IS NOT NULL
         THEN 'Matrícula ' || m.numero || ' (' || m.municipio_imovel || '/' || m.uf_imovel || ')'
    END,
    -- bem sem referência nem denominação ainda é um bem, não o cliente
    CASE WHEN b.id IS NOT NULL
         THEN COALESCE(NULLIF(concat_ws(' — ', b.referencia_dp, b.denominacao), ''), 'Bem')
    END,
    'Cliente'
  ) AS entidade_rotulo,
  i.entidade AS entidade_catalogo,
  i.modulo,
  i.documento,
  i.categoria,
  i.obrigatorio,
  i.status,
  (
    -- conta só o que está amarrado a ESTE documento. Arquivo ligado à pessoa
    -- mas a nenhum item não entra aqui: cada documento conta para si.
    SELECT count(*)
    FROM public.documento_arquivo d
    WHERE d.checklist_item_id = i.id
      AND d.excluido = false
      AND d.status = 'ativo'::public.osg_doc_status
  )::integer AS arquivos_vinculados
FROM public.checklist_cliente_item i
LEFT JOIN public.pessoa    p ON p.id = i.pessoa_id
LEFT JOIN public.bem       b ON b.id = i.bem_id
LEFT JOIN public.matricula m ON m.id = i.matricula_id;

COMMENT ON VIEW public.cobertura_documentos_cliente IS
  'Matriz de cobertura: um registro por documento solicitado, com a contagem de arquivos vinculados; linha com zero é o buraco e ausência de linha significa documento não solicitado para aquela entidade.';

GRANT SELECT ON public.cobertura_documentos_cliente TO authenticated;

COMMIT;
```

## As três confirmações

1. `WITH (security_invoker = on)` — presente, escrito exatamente assim, imediatamente após o `CREATE OR REPLACE VIEW`.
2. `arquivos_vinculados` — a subconsulta tem três condições e só essas: `d.checklist_item_id = i.id`, `d.excluido = false`, `d.status = 'ativo'`. **Nenhuma** referência a `pessoa_id`, `bem_id` ou `matricula_id` dentro dela. Os joins com `pessoa`/`bem`/`matricula` existem apenas para o rótulo, fora da subconsulta.
3. `GRANT SELECT ON public.cobertura_documentos_cliente TO authenticated;` — só `authenticated`, sem `anon`.

`excluido = false` mantido na subconsulta, exatamente pelo motivo apontado: a policy `admin can view deleted documento_arquivo` deixaria o admin contar arquivo apagado e ver número diferente do resto da equipe.

Comentário com a digitação corrigida (`vinculados`, `para aquela`), mesmo conteúdo.

## Execução

1. Aplicar a migration acima (só a view, o comentário e o grant — nenhuma tabela, coluna, índice, trigger, função ou policy).
2. Regerar `src/integrations/supabase/types.ts`.
3. Rodar o GATE e reportar:
   - **Parte 1**: `reloptions` com `security_invoker=on` e `relacl` com `SELECT` para `authenticated`.
   - **Parte 2** (MMS Agro `40e25d24-…`): (a) `linhas_da_view` = `itens_de_checklist`; (b) `soma_na_view` = `arquivos_com_vinculo`; (c) linhas da Camila — CNH com `1`, todas as demais (CPF, RG, etc.) com `0`.
   - **Parte 3**: recontagem tem que voltar `checklist_cliente_item = 442` e `documento_arquivo = 43` (linha de base do pré-voo).

Ausência de `security_invoker` na Parte 1 = entrega errada, mesmo com os números batendo.
