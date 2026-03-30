

## Plano: Adaptar BalanceteEfdTab para formato hierárquico

### Contexto
O endpoint `efdc_balancete` agora retorna `{ periodos: [{ dt_ini, contas: ContaNode[] }] }` (mesma estrutura hierárquica do JSON enviado) em vez de `{ itens: BalanceteEfdItem[], metadata }`.

### Alterações

**1. `src/types/auditoriaCruzada.ts`** — Atualizar tipo de resposta

- Alterar `BalanceteEfdResponse` para `{ periodos: { dt_ini: string; contas: ContaNode[] }[] }` (reutilizando `ContaNode` de `pisCofins.ts`)
- Manter os tipos antigos para não quebrar imports existentes

**2. `src/hooks/useBalanceteEfd.ts`** — Ajustar tipo de retorno

- Trocar o generic do `useQuery` para o novo `BalanceteEfdResponse`

**3. `src/components/equipe/dev/auditoria/BalanceteEfdTab.tsx`** — Reescrever

- Receber `periodos: { dt_ini: string; contas: ContaNode[] }[]` em vez de `itens[]` e `contas[]`
- Manter os filtros existentes: busca por conta contábil, toggle "Período Fechado", e estados de loading/error/empty
- Integrar `BalanceteTreeTable` do PIS/COFINS para renderizar a árvore hierárquica
- Adicionar filtro de busca que filtra recursivamente os nós da árvore (match em `cod_cta` ou `descricao_conta`)
- Toggle "Período Fechado" controla quais colunas de saldo são visíveis (já suportado pelo tree table)
- Destacar divergências (vlr_efd vs saldo) em vermelho — delegado ao componente de árvore via prop ou lógica interna
- Botões "Expandir Tudo" / "Colapsar Tudo" já existem no `BalanceteTreeTable`

**4. `src/pages/equipe/dev/AuditoriaCruzada.tsx`** — Ajustar passagem de props

- Passar `balanceteQuery.data?.periodos` em vez de `itens` e `contas`

### Detalhes técnicos

| Arquivo | Alteração |
|---------|-----------|
| `types/auditoriaCruzada.ts` | Novo tipo de resposta com `periodos[].contas: ContaNode[]` |
| `hooks/useBalanceteEfd.ts` | Ajustar tipo genérico |
| `auditoria/BalanceteEfdTab.tsx` | Reescrever para usar `BalanceteTreeTable` com filtros mantidos |
| `AuditoriaCruzada.tsx` | Ajustar props passadas ao tab |

