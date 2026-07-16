# Gaps de auditoria — mutations CUD sem `useAuditLog`

**Origem:** achado durante a refatoração da camada de dados (ver `refatoracao-camada-dados-ledger.md`, Fase 0).
**Fato:** a auditoria só é gravada quando o frontend chama `src/hooks/useAuditLog.ts`. **Não há trigger no banco.**
As mutations abaixo (encontradas nos 42 arquivos com `supabase.from/rpc` direto) **não gravam em `audit_logs` hoje**.

**Escopo deste arquivo:** apenas *inventariar* o gap. A refatoração da camada de dados **preserva o
comportamento atual** (não adiciona auditoria). Fechar estes gaps é uma **tarefa futura, revisada à parte**,
pois muda comportamento (novas linhas em `audit_logs`) e exige `changed_fields` campo-a-campo por operação.

> Os agentes que executarem a Fase 1/2 devem **acrescentar** aqui cada mutation que moverem, marcando a
> tabela e o tipo de operação. Não remover linhas.

## Inventário (preencher durante a execução)

| Arquivo (origem) | Hook destino | Tabela | Operação | Observação |
|---|---|---|---|---|
| `components/ContactSection.tsx` | — | `contatos` | insert | form público (talvez não deva auditar — decidir na tarefa) |
| `components/equipe/dev/correcoes-sped/CorrecoesActionButtons.tsx` | `useCorrecoesSped` | `efd_correcoes` | delete | limpar tudo |
| `components/equipe/dev/correcoes-sped/TabD100.tsx` | `useCorrecoesSped` | `efd_correcoes` | update, insert | |
| `components/equipe/dev/correcoes-sped/TabF100.tsx` | `useCorrecoesSped` | `efd_correcoes` | update, insert | |
| `components/equipe/dev/correcoes-sped/TabF120.tsx` | `useCorrecoesSped` | `efd_correcoes` | update, insert | |
| `components/equipe/dev/correcoes-sped/TabF130.tsx` | `useCorrecoesSped` | `efd_correcoes` | update, insert | |
| `components/equipe/dev/perdcomp/CargaPerdcompCSV.tsx` | (hook perdcomp) | `per`, `per_situacao`, `dcomp` | upsert, insert | carga em massa |
| `components/equipe/dev/perdcomp/PerFormModal.tsx` | (hook perdcomp) | `per`, `per_situacao` | insert | |
| `components/equipe/dev/perdcomp/SituacaoFormModal.tsx` | (hook perdcomp) | `per_situacao` | insert | |
| `components/equipe/dev/perdcomp/PerDetailModal.tsx` | (hook perdcomp) | `per_situacao`, `per` | insert, update | god-component |
| `components/equipe/dev/perdcomp/DcompFormModal.tsx` | (hook perdcomp) | `distribuicao_dcomp`, `dcomp` | delete, insert | god-component |
| `pages/equipe/EquipeControleAcessos.tsx` | — | `catalog_clients` | insert, update, delete | |
| `pages/equipe/EquipeNovaTarefa.tsx` | — | `tasks` | insert | |
| `pages/equipe/EquipeRotinas.tsx` | — | `routines` | insert | |
| `pages/equipe/EquipeSprints.tsx` | — | `sprints` | insert | |
| `pages/equipe/EquipeDemandas.tsx` | — | `routines`, `demand_items` | insert, delete | god-component |
| `pages/equipe/EquipeProjetos.tsx` | — | `projects`, `processes` | insert | god-component |
| `pages/equipe/EquipeProcessos.tsx` | — | `processes` | insert | god-component |
| `pages/equipe/dev/ProcessoDifal.tsx` | — | `difal_decisao` | delete | god-component |
| `pages/gestao/GestaoNovidades.tsx` | — | `novidades` | insert, update, delete | |
| `pages/gerencial/desempenho/DesempenhoDecisoes.tsx` | — | `metas` | update | |
