

## Plano: Consolidar tabelas `_dev` com coluna `ambiente` — ✅ CONCLUÍDO

### Alterações realizadas

| Etapa | Alterações |
|---|---|
| Migration SQL | Adicionada coluna `ambiente` em `cliente` e `contribuinte` (default `'producao'`). Dados migrados de `cliente_dev`, `contribuinte_dev`, `participante_dev`. Triggers e functions atualizados. Tabelas `_dev` removidas. |
| GerenciarDados.tsx | Removido `getTableName` local. Seletor de ambiente agora insere/deleta via coluna `ambiente`. |
| config/api.ts | Removidos `TABLE_NAMES` e `getTableName`. Adicionado tipo `Ambiente`. |
| Hooks e queries | Adicionado `.eq('ambiente', 'producao')` em: `useFiscalClients`, `useDevClients`, `useTaxReferenceData`, 4x Consulta*.tsx, ConsultaXMLs, ControleBalancetes, ControlePerdcomp, PerFormModal, CargaPerdcompCSV, UploadBalanceteModal |
