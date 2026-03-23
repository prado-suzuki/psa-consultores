

## Plano: Aba "EFD Contribuições vs EFD ICMS"

### Arquitetura

```text
AuditoriaCruzada.tsx (página — adicionar hook + renderizar nova aba)
  └─ EfdcIcmsTab.tsx (componente isolado)
       ├─ Filtro local: busca por Chave NFe (debounce 300ms)
       ├─ Switch: "Mostrar apenas divergências" (UI only, sem lógica)
       └─ Tabela lado a lado (EFD ICMS vs EFD Contribuições)

types/efdcIcms.ts       (tipagem)
hooks/useEfdcIcms.ts    (fetch controlado)
```

### Arquivos

**1. `src/types/efdcIcms.ts`** (novo)
- `EfdcIcmsEfdSide` — campos comuns: `CNPJ`, `NOME`, `CFOP: number[]`, `COD_CTA: (string|null)[]`, `VL_DOC: number`, e opcionais `DT_INI`, `DT_FIN` (presentes só no lado ICMS)
- `EfdcIcmsNota` — `CHV_NFE: string`, `EFD_ICMS: EfdcIcmsEfdSide`, `EFD_CONTRIB: EfdcIcmsEfdSide`
- `EfdcIcmsResponse` — `ID_CONTRIBUINTE: string`, `NOTAS: EfdcIcmsNota[]`

**2. `src/hooks/useEfdcIcms.ts`** (novo)
- `useQuery` com `enabled: false`, fetch via `refetch()`
- Endpoint: `getApiUrl('/api/v1/pis_cofins/comparacoes/efdc_icms')`
- Param único na query: `id_contribuinte` (sem datas)
- Mesmo padrão do `useBalanceteEfd`

**3. `src/components/equipe/dev/auditoria/EfdcIcmsTab.tsx`** (novo, ~120 linhas)
- **Props**: `notas: EfdcIcmsNota[]`, `isLoading`, `hasQueried`
- **Filtros locais**:
  - Input Chave NFe com debounce 300ms (mesmo padrão do BalanceteEfdTab)
  - Switch "Mostrar apenas divergências" — apenas UI, sem filtragem por enquanto
- **Tabela com cabeçalho agrupado**:
  - Linha superior do header: célula vazia (Chave NFe), colSpan=3 "EFD ICMS", colSpan=3 "EFD Contribuições"
  - Linha inferior: Chave NFe | CFOP | Conta Contábil | Valor Doc | CFOP | Conta Contábil | Valor Doc
  - Body: itera `filteredNotas`, arrays CFOP e COD_CTA exibidos com `.join(', ')`, valores em BRL
  - Sem lógica de divergência ou cores condicionais

**4. `src/pages/equipe/dev/AuditoriaCruzada.tsx`** (edição)
- Importar `useEfdcIcms` e `EfdcIcmsTab`
- Instanciar `useEfdcIcms({ id_contribuinte: contribuinteId })`
- No `handleConsultar`: chamar `efdcIcmsQuery.refetch()` além do `balanceteQuery.refetch()`
- No `TabsContent value="efd-icms"`: renderizar `<EfdcIcmsTab notas={efdcIcmsQuery.data?.NOTAS} isLoading={efdcIcmsQuery.isLoading} hasQueried={hasQueried} />`

4 arquivos (3 novos + 1 editado), ~180 linhas.

