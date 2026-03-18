

# Limpeza de referências `_dev` — 9 arquivos

## Alterações

### 1. `src/config/api.ts`
- `TABLE_NAMES`: hardcode `cliente: 'cliente'` e `contribuinte: 'contribuinte'` (sem ternário). Manter export para não quebrar consumidores (ControlePerdcomp, ConsultaECF, ConsultaXMLs, PerFormModal, CargaPerdcompCSV etc.)
- `getTableName`: mantém, agora retorna sempre produção
- `isProductionEnvironment`: mantém (usado para API_BASE_URL e syncCadastrosToDW)

### 2. `src/hooks/useFiscalClients.ts`
- Remover import `isProductionEnvironment`
- Query: trocar ternário por `supabase.from('cliente')` direto

### 3. `src/hooks/useDevClients.ts`
- L10-12: hardcode `'cliente'`, `'contribuinte'`, `'participante'`
- Remover import `isProductionEnvironment`
- `useContribuintesByCliente` (L53-81): remover fallback bidirecional (L66-76), buscar só de `'contribuinte'`
- `useExternalClients` (L85-112): remover `fallbackTable` e lógica de fallback (L99-107), buscar só de `'cliente'`
- QueryKeys: remover variáveis de tabela

### 4. `src/hooks/useTaxProjects.ts`
- L58-61: remover 4 variáveis de roteamento
- Remover import `isProductionEnvironment`
- `useTaxProjects` (L87-96): trocar `clienteTable`/`fallbackClienteTable` por `'cliente'`, remover fallback (L91-95)
- Idem contribuintes (L98-107): trocar por `'contribuinte'`, remover fallback (L102-106)
- QueryKey L67: remover variáveis

### 5. `src/pages/equipe/fiscal/GestaoClientes.tsx`
- L18-19: hardcode `'cliente'` e `'contribuinte'`
- Remover import `isProductionEnvironment`
- 6 queries usam `clienteTable`/`contribuinteTable` — substituir pelo string hardcoded

### 6. `src/components/equipe/fiscal/NewClientModal.tsx`
- L55-57: hardcode `'cliente'`, `'contribuinte'`, `'participante'`
- **Manter** import de `isProductionEnvironment` — usado em `syncCadastrosToDW` (L265) para determinar o environment enviado à edge function

### 7. `src/pages/equipe/fiscal/FiscalDashboard.tsx`
- L49: trocar `'cliente_dev'` por `'cliente'` (bug fix)
- Sem import de `isProductionEnvironment` a remover

### 8. `src/pages/equipe/dev/AuditoriaFiscal.tsx`
- L126-127: hardcode `'cliente'` e `'contribuinte'`
- Import de `isProductionEnvironment` (L26): manter se `API_BASE_URL` também é importado na mesma linha, apenas remover `isProductionEnvironment` do import

### 9. `src/pages/equipe/dev/CalculadoraIbsCbs.tsx`
- L127-128: hardcode `'cliente'` e `'contribuinte'`
- Mesmo tratamento de import que AuditoriaFiscal

## Verificação final
Buscar `cliente_dev` e `contribuinte_dev` em `src/` (exceto GerenciarDados.tsx) para confirmar zero referências restantes.

## Escopo
- 9 arquivos editados
- Sem migração de banco
- `TABLE_NAMES` e `getTableName` continuam existindo (outros arquivos os consomem), mas retornam sempre tabelas de produção

