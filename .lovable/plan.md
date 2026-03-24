

## Plano: Ferramenta "Correções no SPED"

Nova página em `/equipe/dev/correcoes-sped` para auditoria EFD vs XML com edição inline de campos.

---

### Arquitetura

```text
src/
├── types/correcoesSped.ts          ← Tipagem da resposta da API
├── hooks/useCorrecoesSped.ts       ← Hook de data fetching (useQuery + fetchWithAuth)
├── pages/equipe/dev/CorrecoesSped.tsx  ← Página principal (filtros + tabela + modal)
```

---

### 1. Tipos (`src/types/correcoesSped.ts`)

```typescript
export interface NfeItem {
  nItem: number;
  cProd: string;
  xProd: string;
  ncm: string;
  vProd: number;
}

export interface ItemEfd {
  num_item: number;
  descr_item: string;
  vl_item: number;
  cod_ncm: string | null;
  cst_pis: string;
  aliq_pis: number;
  vl_pis: number;
  cst_cofins: string;
  aliq_cofins: number;
  vl_cofins: number;
  cod_cta: string;
  nfe_itens: NfeItem[];
}

export interface NotaRevisao {
  chv_nfe: string;
  dt_doc: string;
  tipo_relacao: 'SEM_NFE' | '1:1' | 'CONSOLIDADO';
  itens_efd: ItemEfd[];
}

export interface CorrecoeSpedResponse {
  id_contribuinte: string;
  periodo: { dt_ini: string; dt_fin: string };
  notas: NotaRevisao[];
}
```

---

### 2. Hook (`src/hooks/useCorrecoesSped.ts`)

Segue o padrão exato de `useBalanceteEfd`:
- `useQuery` com `enabled: false`, disparado via `refetch`
- `fetchWithAuth` via `useApiAuth`
- Endpoint: `GET /api/v1/pis_cofins/revisao/notas-itens?id_contribuinte=X&dt_ini=Y&dt_fin=Z`
- QueryKey: `['correcoes-sped', id_contribuinte, dt_ini, dt_fin]`

---

### 3. Página (`src/pages/equipe/dev/CorrecoesSped.tsx`)

Envolvida pelo `DevLayout`. Estrutura:

**Filtros** (Card com border-dashed, igual à Auditoria Cruzada):
- Select: Cliente (via `useClientesList`)
- Select: Contribuinte (via `useContribuintesByCliente`)
- Input date: Data Início / Data Fim (type="date", formato YYYY-MM-DD)
- Select: Filtro NCM (Todos / Com NCM / Sem NCM) — filtro client-side
- Botões: Consultar + Limpar

**Tabela principal** (componente `Table` do shadcn):
- Dados são "achatados" (flatMap notas → itens_efd), cada linha = 1 item EFD
- Colunas: Chave NFe (mono, espaçada a cada 4 chars) | Descrição | NCM | Valor EFD | PIS (CST|%|R$) agrupado | COFINS (CST|%|R$) agrupado | Auditoria XML (Badge com tipo_relacao)
- Células editáveis inline (inputs transparentes que ganham borda no focus, como no HTML de referência)
- Badge colorido na coluna Auditoria XML:
  - `1:1` → verde (bg-green-100 text-green-700)
  - `SEM_NFE` → vermelho (bg-red-100 text-red-700)
  - `CONSOLIDADO` → amarelo (bg-amber-100 text-amber-700)
- Clicar no badge abre modal de detalhe XML
- Paginação client-side (40 itens por página, componente `TablePagination` existente)

**Modal de detalhe XML** (shadcn `Dialog`):
- Header: descrição do item EFD + valor
- Body: lista de cards com os `nfe_itens` (cProd, xProd, NCM com badge OK/Divergente, vProd)
- Se `nfe_itens` vazio: mensagem "Nenhum item XML encontrado (SEM_NFE)"

**Estado local**: os dados editados ficam em `useState` (a edição é local, sem persistência por agora — igual ao HTML de referência).

---

### 4. Navegação e Rota

| Arquivo | Alteração |
|---|---|
| `src/App.tsx` | Adicionar `Route` para `/equipe/dev/correcoes-sped` com `TeamRoute` + `PageAccessGate` |
| `src/config/protectedPages.ts` | Registrar entrada com `category: 'dev'` |
| `src/components/equipe/dev/DevLayout.tsx` | Adicionar item em `pisCofinsSubItems` (ícone `FileSearch`, label "Correções no SPED") |
| `src/pages/equipe/dev/DevDashboard.tsx` | Não alterar (o catálogo `tools[]` é separado do sidebar — a entrada no sidebar é suficiente) |

---

### 5. Ficheiros criados/alterados

| Arquivo | Ação |
|---|---|
| `src/types/correcoesSped.ts` | Criar |
| `src/hooks/useCorrecoesSped.ts` | Criar |
| `src/pages/equipe/dev/CorrecoesSped.tsx` | Criar |
| `src/App.tsx` | +1 import + 1 Route |
| `src/config/protectedPages.ts` | +1 entrada |
| `src/components/equipe/dev/DevLayout.tsx` | +1 item no `pisCofinsSubItems` |

