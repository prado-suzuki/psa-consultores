

## Plano: Aba "EFD Contribuições vs XMLs" (CT-e Lotes)

### Arquitetura

```text
AuditoriaCruzada.tsx (página — adicionar hook + renderizar nova aba)
  └─ EfdcXmlTab.tsx (componente isolado)
       ├─ Filtro local: busca CFOP/Intervalo (debounce 300ms)
       ├─ Tabela expansível Master-Detail (Collapsible)
       └─ Highlight divergência VLR_LOTE ≠ SUM_LOTE

types/efdcXml.ts        (tipagem)
hooks/useEfdcXml.ts     (fetch controlado)
```

### Arquivos

**1. `src/types/efdcXml.ts`** (novo)
- `EfdcXmlCte` — `CHV_CTE: string`, `NR_CTE: number`, `VLR_CTE: number`
- `EfdcXmlLote` — `ID_CONTRIBUINTE`, `CNPJ_EMIT`, `NOME_EMIT`, `MOD`, `SERIE`, `CFOP`, `DT_LOTE`, `INTERVALO`, `VLR_LOTE`, `SUM_LOTE`, `CTES: EfdcXmlCte[]`
- Resposta da API é `EfdcXmlLote[]` diretamente (array raiz)

**2. `src/hooks/useEfdcXml.ts`** (novo)
- `useQuery` com `enabled: false`, fetch via `refetch()`
- Endpoint: `getApiUrl('/api/v1/pis_cofins/comparacoes/cte_lote')`
- Params: `id_contribuinte` sempre; `dt_ini` e `dt_fim` somente se ambos preenchidos (mesma lógica do `useBalanceteEfd`)
- Retorna `EfdcXmlLote[]`

**3. `src/components/equipe/dev/auditoria/EfdcXmlTab.tsx`** (novo, ~160 linhas)
- **Props**: `lotes: EfdcXmlLote[]`, `isLoading`, `hasQueried`
- **Filtros locais**:
  - Input busca por CFOP ou Intervalo com debounce 300ms (mesmo padrão das outras abas)
- **Tabela Master-Detail** usando `Collapsible`:
  - **Linha Master**: ícone chevron (expand/collapse), Data Lote, Emitente, CFOP, Intervalo, Valor Lote (BRL), Soma CT-es (BRL)
  - **Área Detail**: Sub-tabela com Chave CT-e, Número, Valor (BRL)
  - State `expandedRows: Set<number>` para controlar quais linhas estão abertas
- **Divergência de Lote**: Se `VLR_LOTE !== SUM_LOTE`, a linha master recebe `bg-amber-50 dark:bg-amber-950/20` + ícone `AlertTriangle` ao lado do valor

**4. `src/pages/equipe/dev/AuditoriaCruzada.tsx`** (edição)
- Importar `useEfdcXml` e `EfdcXmlTab`
- Instanciar `useEfdcXml({ id_contribuinte, dt_ini, dt_fim })` com mesma lógica de formatação de datas
- No `handleConsultar`: chamar `efdcXmlQuery.refetch()`
- No `TabsContent value="efd-xml"`: renderizar `<EfdcXmlTab>` substituindo o placeholder "Em construção"

### Restrições mantidas
1. Hook desativado no mount (`enabled: false`)
2. Debounce 300ms no filtro local
3. Datas opcionais: só envia se ambas preenchidas

4 arquivos (3 novos + 1 editado), ~220 linhas.

