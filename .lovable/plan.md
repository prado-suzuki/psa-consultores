

## Plano: Expandir Correções SPED com abas C170, A170, D100 e F100

### Estrutura de arquivos

```text
src/
├── types/correcoesSped.ts              ← adicionar tipos A170, D100, F100
├── hooks/useCorrecoesSped.ts           ← adicionar 3 novos hooks
├── pages/equipe/dev/CorrecoesSped.tsx  ← refatorar: filtros + Tabs
└── components/equipe/dev/correcoes-sped/
    ├── TabC170.tsx                      ← extrair tabela atual
    ├── TabA170.tsx                      ← NFSe (com zona XML esmeralda)
    ├── TabD100.tsx                      ← CTe (com zona XML esmeralda)
    └── TabF100.tsx                      ← Outros (zona esmeralda com traços)
```

---

### 1. Tipos (`src/types/correcoesSped.ts`)

Manter tipos existentes (C170). Adicionar:

```ts
// --- A170 ---
export interface NfseItem {
  xServ: string;
  vServ: number;
}

export interface A170ItemEfd {
  num_item: number;
  descr_item: string;
  vl_item: number;
  cod_ncm: string | null;
  cst_pis: string;
  vl_bc_pis: number;
  aliq_pis: number;
  vl_pis: number;
  cst_cofins: string;
  vl_bc_cofins: number;
  aliq_cofins: number;
  vl_cofins: number;
  cod_cta: string;
  descricao_conta: string;
  nfse_itens: NfseItem[];
}

export interface NotaA170 {
  chv_nfse: string | null;
  dt_doc: string;
  tipo_relacao: 'SEM_NFSE' | '1:1' | 'CONSOLIDADO';
  itens_efd: A170ItemEfd[];
}

export interface A170Response {
  id_contribuinte: string;
  periodo: { dt_ini: string; dt_fin: string };
  notas: NotaA170[];
}

// --- D100 ---
export interface CteItem {
  xServ: string;
  vPrest: number;
}

export interface D100ItemEfd {
  num_item: number;
  descr_item: string;
  vl_item: number;
  cnpj_efd: string;
  simples: string;
  cst_pis: string;
  aliq_pis: number;
  vl_pis: number;
  cst_cofins: string;
  aliq_cofins: number;
  vl_cofins: number;
  cte_itens: CteItem[];
}

export interface NotaD100 {
  chv_cte: string;
  dt_doc: string;
  tipo_relacao: 'SEM_CTE' | '1:1' | 'CONSOLIDADO';
  itens_efd: D100ItemEfd[];
}

export interface D100Response {
  id_contribuinte: string;
  periodo: { dt_ini: string; dt_fin: string };
  notas: NotaD100[];
}

// --- F100 ---
export interface F100Item {
  id_contribuinte: string;
  cpf_cnpj: string;
  tipo_pessoa: string;
  nome: string;
  dt_oper: string;
  simples: string;
  vl_oper: number;
  cst_pis: string;
  aliq_pis: number;
  vl_pis: number;
  cst_cofins: string;
  aliq_cofins: number;
  vl_cofins: number;
}

export interface F100Response {
  id_contribuinte: string;
  periodo: { dt_ini: string; dt_fin: string };
  itens: F100Item[];
}
```

Nota: se a API retornar campos em UPPER_CASE, as interfaces usarão exatamente esse casing — ajustarei na implementação conforme necessário.

---

### 2. Hooks (`src/hooks/useCorrecoesSped.ts`)

Manter `useCorrecoesSped` (C170). Adicionar 3 hooks com mesma assinatura, todos `enabled: false`:

| Hook | Endpoint | Tipo retorno |
|------|----------|-------------|
| `useCorrecoesA170` | `/api/v1/pis_cofins/revisao/a170` | `A170Response` |
| `useCorrecoesD100` | `/api/v1/pis_cofins/revisao/d100` | `D100Response` |
| `useCorrecoesF100` | `/api/v1/pis_cofins/revisao/f100` | `F100Response` |

---

### 3. Refatoração da página (`CorrecoesSped.tsx`)

Seguir padrão AuditoriaCruzada:

- Card de filtros na raiz (cliente, contribuinte, datas, NCM, busca textual).
- `<Tabs defaultValue="c170">` abaixo dos filtros com 4 `TabsTrigger`:
  - **C170 (NFe/NFCe)** · **A170 (NFSe)** · **D100 (CTe)** · **F100 (Outros)**
- Botão "Consultar" dispara `refetch()` dos **4 hooks** simultaneamente.
- Estados de filtro local (ncmFilter, searchText, page) na raiz, passados via props.
- Modais (XML detail + NcmRegrasModal) na raiz — cada aba chama callbacks via props.

---

### 4. Componentes de aba

**TabC170.tsx** — Extração direta da tabela atual (L198-328). Sem alterações visuais.

**TabA170.tsx** — Estrutura de 3 zonas idêntica ao C170:

| Zona EFD (3 cols) | Zona XML Esmeralda (3 cols) | Zona Impostos Slate (7+ cols) |
|---|---|---|
| Descrição, NCM (EFD), Valor (EFD) | Descrição (NFSe), NCM (NFSe), Valor (NFSe) | CST PIS, % PIS, VL PIS, CST COF, % COF, VL COF, Conta |

- Zona XML renderiza `item.nfse_itens[0]` — descrição via `xServ`, valor via `vServ`.
- Badges interativos com `FileSearch`/`Network` para `1:1`/`CONSOLIDADO`.
- Badge vermelho com `AlertCircle` para NCM divergente.

**TabD100.tsx** — Mesma estrutura de 3 zonas:

| Zona EFD (3-4 cols) | Zona XML Esmeralda (2-3 cols) | Zona Impostos Slate (6 cols) |
|---|---|---|
| Descrição, CHV_CTE (badge truncado), Valor (EFD) | Descrição (CTe), Valor (CTe) | CST PIS, % PIS, VL PIS, CST COF, % COF, VL COF |

- Zona XML renderiza `item.cte_itens[0]` — descrição via `xServ`, valor via `vPrest`.
- Mesmos badges interativos e alertas de divergência.

**TabF100.tsx** — Mantém 3 zonas para simetria visual:

| Zona EFD (5 cols) | Zona XML Esmeralda (3 cols) | Zona Impostos Slate (6 cols) |
|---|---|---|
| Data, Nome, CPF/CNPJ, Tipo (badge PF/PJ), Valor | — | — | — | CST PIS, % PIS, VL PIS, CST COF, % COF, VL COF |

- Zona esmeralda inteira preenchida com `<span className="text-muted-foreground/50 italic">—</span>` em todas as células, preservando a simetria da tabela.
- Sem interação na zona XML (não há dados para comparar).

Todas as abas mantêm: Card elevado (`shadow-md ring-1`), paginação (40 itens), contagem de registros, `tabular-nums text-right` em financeiros, empty states mutados.

---

### 5. Modais

- Modal XML detail: relevante para C170, A170 e D100 (adaptar título/conteúdo conforme o tipo de documento — NFe, NFSe, CTe).
- `NcmRegrasModal`: disponível onde houver NCM clicável (C170, A170).
- F100 não aciona nenhum modal.

---

### Resumo de arquivos

| Arquivo | Ação |
|---------|------|
| `src/types/correcoesSped.ts` | Adicionar tipagens A170, D100, F100 |
| `src/hooks/useCorrecoesSped.ts` | Adicionar `useCorrecoesA170`, `useCorrecoesD100`, `useCorrecoesF100` |
| `src/pages/equipe/dev/CorrecoesSped.tsx` | Refatorar: filtros + Tabs + 4 hooks + modais na raiz |
| `src/components/equipe/dev/correcoes-sped/TabC170.tsx` | Novo — extração da tabela C170 |
| `src/components/equipe/dev/correcoes-sped/TabA170.tsx` | Novo — tabela NFSe com zona XML esmeralda |
| `src/components/equipe/dev/correcoes-sped/TabD100.tsx` | Novo — tabela CTe com zona XML esmeralda |
| `src/components/equipe/dev/correcoes-sped/TabF100.tsx` | Novo — tabela F100 com zona esmeralda (traços) |

