

## ✅ Concluído: Roteamento de chamados por cluster do cliente

### Arquivo: `src/components/gestao/CreateTicketDialog.tsx`

**Implementado**:
1. Select de **Empresa** (tabela `cliente`, filtrado por `ativo`, `excluido`, `ambiente`)
2. Select de **Área** filtrado pelos clusters da empresa via `cliente_clusters` → `estrutura_areas`
3. Auto-seleção quando há 1 área só; fallback para todas as áreas se empresa sem clusters
4. Label "Departamento" renomeado para "Assunto"
5. `cliente_id` e `estrutura_area_id` incluídos no INSERT do ticket
6. Filtro `.eq('ambiente', currentAmbiente)` na query de empresas

**TODO pendente (Ação 4)**: Quando `representante.user_id` estiver preenchido, filtrar empresas pelo vínculo representante → cliente.
