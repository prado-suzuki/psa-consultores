## Objetivo

Permitir que, nas sub-abas **Açúcar**, **Etanol Interestadual** e **Biodiesel** de T03.1, o usuário lance linhas de correção que são salvas em uma nova tabela `correcoes_icms`, exibidas junto aos lançamentos vindos da API e somadas ao Resumo Mensal do respectivo mês/ano.

Sub-abas **Etanol Interno**, **Resíduos Produção** e **Sucata** ficam de fora (sem botão de correção).

## Modelo de dados

Nova tabela `public.correcoes_icms`:

- `id uuid pk default gen_random_uuid()`
- `contribuinte_id uuid not null` (FK lógica → `contribuinte.id`)
- `familia text not null check (familia in ('acucar','etanol_interestado','biodiesel'))`
- `data_lancamento date not null` — usada para derivar `MES_ANO` (ex.: `2025-03`)
- `competencia text` — só preenchido em etanol_interestado/biodiesel
- `descricao text not null`
- `produto text`
- `campos jsonb not null default '{}'::jsonb` — guarda os campos numéricos específicos da família (alíquota, valor, ICMS_12, créditos, FUNDEs, etc.)
- `ambiente text not null default current_setting padrão do projeto`
- `excluido boolean not null default false`
- `created_by uuid` (auth.uid), `created_at timestamptz default now()`
- `updated_at timestamptz default now()` + trigger `update_updated_at_column`

Índices: `(contribuinte_id, familia, data_lancamento)` filtrando `excluido=false`.

RLS habilitado:
- SELECT/INSERT/UPDATE para `team_member` ou superior via `has_role_or_higher(auth.uid(),'team_member')`.
- Sem DELETE físico — exclusão é soft via UPDATE `excluido=true`.

## Esquema dos `campos` jsonb por família

Mantém nomes canônicos compatíveis com os já usados no detalhe/resumo (para que `deriveTotalsChecks` continue funcionando):

- **acucar** (sem competência): `ALIQUOTA`, `VALOR_MERCADORIA`, `VALOR_CREDITO`, `FUNDES`, `FUNDED`. Calculado/derivado: `ICMS_NORMAL = VALOR_MERCADORIA * ALIQUOTA/100` (campo derivado para entrar no Resumo).
- **etanol_interestado**: `ICMS_12`, `VALOR_MERCADORIA`, `VALOR_ICMS`, `CREDITO_OUTORGADO` (rótulo "Crédito Outor. 73,3333% / 0,21/L"), `FUNDEIC`, `FUNDED`. Derivado: `ICMS_DEVIDO = VALOR_ICMS - CREDITO_OUTORGADO` (segue padrão do resumo existente).
- **biodiesel**: `CREDITO_OUTORGADO` (rótulo "Crédito Outor. 85%"), `ICMS_DEVIDO`, `FUNDEIC`, `FUNDED`. Sem cálculo derivado adicional.

Campos comuns: `DATA_NOTA` ← `data_lancamento`, `MES_ANO` ← `YYYY-MM` da data, `DESCRICAO_PRODUTO` ← `produto`, `NUM_NOTA` ← `"CORREÇÃO"` (marca visual), e uma flag interna `__correcao = true` para destacar/ habilitar exclusão.

## Hooks

`src/hooks/useCorrecoesIcms.ts`:
- `useCorrecoesIcms({ contribuinteId, familia, dataInicio, dataFim, enabled })` — query filtrada por contribuinte + família + intervalo de `data_lancamento`, `excluido=false`, `ambiente=currentAmbiente`. Retorna lista já no formato canônico (mesmas chaves do detail).
- `useCreateCorrecaoIcms()` — mutation insert + `useAuditLog` (`area:'tax'`, `entity_type:'correcao_icms'`, `action:'created'`, `changed_fields` com diff completo).
- `useDeleteCorrecaoIcms()` — UPDATE `excluido=true` + audit `action:'deleted'`. Invalida queries de `correcoes-icms` e (via callback) força refresh do `useSaidaIcms` correspondente.

## UI

### `FamiliaSaidaTab`
- Recebe nova prop opcional `allowCorrecoes` (boolean derivado da família). Quando true:
  - Botão **"Adicionar correção"** no header da Card "Análise Detalhada".
  - Carrega `useCorrecoesIcms` e faz `merge` com `rawRows` da API antes do `deriveDetailChecks`. Linhas de correção recebem badge visual ("Correção") e botão de lixeira na primeira coluna.
  - Recalcula `Resumo Mensal`: para cada correção, agrupa por `MES_ANO`, soma os campos numéricos correspondentes na linha de resumo do mesmo mês (ou cria nova linha se mês não existir nos totalizadores).

### `NovaCorrecaoDialog`
Novo componente em `src/components/equipe/dev/icms-saidas/familias/NovaCorrecaoDialog.tsx`:
- Recebe `familia`, `contribuinteId`, callback de sucesso.
- Renderiza formulário condicional com os campos solicitados:
  - **Açúcar**: Data, Descrição, Produto, Alíquota, Valor, Crédito, FUNDES 6%, FUNDED 1%.
  - **Etanol Interestadual**: Competência, Data, Descrição, Produto, ICMS 12%, Valor, ICMS, Crédito Outor. 73,3333%/0,21L, FUNDEIC 1%, FUNDED 1%.
  - **Biodiesel**: Competência, Data, Descrição, Produto, Crédito Outor. 85%, ICMS Devido, FUNDEIC 1%, FUNDED 1%.
- Valida campos obrigatórios (Data + Descrição), converte string→number com locale BR, monta `campos` jsonb e chama `useCreateCorrecaoIcms`.
- Toast de sucesso/erro via `useToast`.

## Lógica de merge no Resumo

Função pura `mergeCorrecoesIntoTotals(totals, correcoes, familia)` em `familias/mergeCorrecoes.ts`:
- Deriva `MES_ANO` da `data_lancamento` da correção.
- Soma nos campos do resumo conforme família:
  - acucar: `ICMS_NORMAL`, `ICMS_RECOLHER` (= ICMS_NORMAL - VALOR_CREDITO), `FUNDES`, `FUNDED`.
  - etanol_interestado: `VALOR_ICMS`, `ICMS_DEVIDO`, `FUNDEIC`, `FUNDED`.
  - biodiesel: `ICMS_17` (= 0 ou ignorado), `ICMS_DEVIDO`, `FUNDEIC`, `FUNDED`.
- Retorna nova lista; `deriveTotalsChecks` é aplicado depois para recalcular os Checks vs EFD/C190.

## Arquivos afetados

- **Novo**: migration `correcoes_icms` + RLS.
- **Novo**: `src/hooks/useCorrecoesIcms.ts`.
- **Novo**: `src/components/equipe/dev/icms-saidas/familias/NovaCorrecaoDialog.tsx`.
- **Novo**: `src/components/equipe/dev/icms-saidas/familias/mergeCorrecoes.ts`.
- **Editar**: `FamiliaSaidaTab.tsx` — botão, merge no detail, merge no totals, ação de excluir linha de correção.
- **Editar**: `familias/columnLabels.ts` — adicionar rótulos pt-BR para campos novos (CREDITO_OUTORGADO já existe, conferir).

## Não-objetivos

- Não altera as outras 3 sub-abas (Etanol Interno, Resíduos, Sucata).
- Não toca em T01/T02/T03.2.
- Não há edição inline; correção errada é excluída e relançada.
