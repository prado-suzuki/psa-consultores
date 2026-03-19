

# Plano: Consolidar tabelas `_dev` com coluna `ambiente`

## Contexto

Hoje existem 4 tabelas separadas: `cliente` (55 registros), `cliente_dev` (45), `contribuinte` (138), `contribuinte_dev` (110). Os dados _dev não têm IDs duplicados com produção. A separação confunde a IA e exige triggers de validação bidirecional complexos.

## Estratégia

Adicionar coluna `ambiente` (`'producao'` ou `'desenvolvimento'`) nas tabelas `cliente` e `contribuinte`, migrar os dados das tabelas `_dev` para dentro delas, atualizar frontend e funções do banco, e depois remover as tabelas `_dev`.

---

## Etapa 1 — Migration SQL (schema + dados)

Uma única migration que:

1. **Adiciona coluna `ambiente`** em `cliente` e `contribuinte` com default `'producao'`
2. **Migra dados** de `cliente_dev` → `cliente` (com `ambiente = 'desenvolvimento'`) e `contribuinte_dev` → `contribuinte` (idem)
3. **Remove FKs** de `contribuinte_dev` e `participante_dev` para `cliente_dev`
4. **Atualiza triggers de validação** (`validate_per_contribuinte`, `validate_tax_project_external_client`, `validate_tax_project_contribuinte`) para consultar apenas a tabela unificada (sem mais referência a `_dev`)
5. **Atualiza a função `get_ordens_by_client_name`** para buscar apenas em `cliente` (filtrando por nome, sem mais UNION com `_dev`)
6. **Atualiza `normalize_name_title_case`** para não mais referenciar `_dev`
7. **Remove tabelas** `participante_dev`, `contribuinte_dev`, `cliente_dev`

## Etapa 2 — Atualizar `GerenciarDados.tsx`

- Remover o `getTableName` local que gera nomes `_dev`
- O seletor de ambiente ("dev"/"prod") agora insere na mesma tabela `cliente`/`contribuinte`, setando `ambiente = 'desenvolvimento'` ou `ambiente = 'producao'`
- Limpar tabela filtra por `ambiente` antes de deletar

## Etapa 3 — Atualizar `src/config/api.ts`

- Remover `TABLE_NAMES` e `getTableName` (não mais necessários)

## Etapa 4 — Atualizar hooks e queries do frontend

Todos os hooks que consultam `cliente`/`contribuinte` precisam adicionar `.eq('ambiente', 'producao')` para o frontend normal:

- `useDevClients.ts` → `useClientesList`, `useExternalClients`, `useContribuintesByCliente`
- `useFiscalClients.ts` → `useFiscalClientsList`
- `useTaxReferenceData.ts` → `useExternalClients`, `useContribuintes`
- `ConsultaEFD.tsx`, `ConsultaECF.tsx`, `ConsultaECD.tsx`, `ConsultaEFDICMS.tsx` — queries de clientes/contribuintes
- `NewClientModal.tsx` — ao criar/editar, setar `ambiente = 'producao'` (ou conforme contexto)
- `GestaoClientes.tsx` — filtrar por ambiente
- `FiscalDashboard.tsx` — adicionar filtro faltante
- `TaskModal.tsx` — dropdown de clientes

## Etapa 5 — Limpar tipos gerados

Após a migration rodar, o `types.ts` será regenerado automaticamente sem as tabelas `_dev`.

---

## Impacto e riscos

- **Dados**: Zero perda — os 45 clientes e 110 contribuintes _dev são copiados antes da remoção
- **BigQuery/ETL**: Se o pipeline do BigQuery lê `cliente_dev` diretamente, ele precisará ser atualizado para filtrar por `ambiente = 'desenvolvimento'` na tabela unificada. Confirme isso antes de executar.
- **Rollback**: Se necessário, a migration pode ser revertida recriando as tabelas `_dev` a partir dos registros com `ambiente = 'desenvolvimento'`

