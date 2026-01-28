

## Configurar EFD ICMS para Usar Rotas Reais da API

### Contexto
A API agora suporta EFD ICMS com as mesmas rotas do Contribuições, apenas trocando o parâmetro `tipo` de "contribuicoes" para "icms". O endpoint principal agora retorna campos específicos de ICMS:
- `icms_total_debitos`
- `icms_total_creditos`
- `icms_saldo_devedor`
- `icms_a_recolher`
- `icms_st_a_recolher`

### Arquivos a Editar

| Arquivo | Mudança |
|---------|---------|
| `src/types/efd.ts` | Adicionar novos campos ICMS ao tipo `EFDArquivo` |
| `src/hooks/useEFDData.ts` | Remover lógica de mock para ICMS e usar API real |
| `src/pages/equipe/dev/ConsultaEFDICMS.tsx` | Implementar handlers reais de download |

---

### 1. Atualizar Tipos (src/types/efd.ts)

Adicionar os novos campos retornados pela API ICMS:

```typescript
export interface EFDArquivo {
  // ... campos existentes ...
  
  // Campos EFD ICMS (novos da API)
  icms_total_debitos?: string | null;
  icms_total_creditos?: string | null;
  icms_saldo_devedor?: string | null;
  icms_a_recolher?: string | null;
  icms_st_a_recolher?: string | null;
  
  // Campos adicionais do ICMS
  num_matriz?: string;
  num_filial?: string;
  COD_FIN?: number;
  IE?: string;
  IND_PERFIL?: string;
}
```

---

### 2. Atualizar Hook (src/hooks/useEFDData.ts)

**Remover mock e usar API real:**

```typescript
// useEFDOverview
// ANTES: if (tipo === 'icms') return fetchMockFromStorage('M1_EFD_ICMS.json');
// DEPOIS: usar API real com rota dinâmica

const url = new URL(getApiUrl(`/api/v1/efd/${tipo}/${params.cnpj}`));

// useEFDDetail
// ANTES: if (tipo === 'icms') return fetchMockFromStorage('M2_EFD_ICMS.json');
// DEPOIS: usar API real

const url = new URL(
  getApiUrl(`/api/v1/efd/${tipo}/${params.cnpj}/${params.idArquivo}/registro/${params.registro}`)
);
```

---

### 3. Atualizar Página (src/pages/equipe/dev/ConsultaEFDICMS.tsx)

**3.1 Adicionar imports necessários:**
- `getApiUrl` do `@/config/api`
- `useApiAuth` do `@/hooks/useApiAuth`
- `format` do `date-fns` (se necessário)

**3.2 Adicionar estado para download individual:**
```typescript
const [downloadingTxt, setDownloadingTxt] = useState<string | null>(null);
```

**3.3 Implementar handler de download individual:**
```typescript
const handleDownloadTxt = async (arquivo: EFDArquivo) => {
  setDownloadingTxt(arquivo.ID_ARQUIVO);
  try {
    const url = getApiUrl(`/api/v1/query/download/efd/icms/arquivo/${encodeURIComponent(arquivo.ID_ARQUIVO)}`);
    const response = await fetchWithAuth(url);
    // ... resto da lógica igual ao ConsultaEFD.tsx
  } finally {
    setDownloadingTxt(null);
  }
};
```

**3.4 Implementar handler de download em lote (Baixar Todos):**
```typescript
const handleDownloadAll = async () => {
  if (!cnpjContribuinte) return;
  setDownloadingAll(true);
  try {
    const url = new URL(getApiUrl(`/api/v1/query/download/efd/icms/${cnpjContribuinte}`));
    if (dataInicio) url.searchParams.set('data_inicio', dataInicio);
    if (dataFim) url.searchParams.set('data_fim', dataFim);
    // ... resto da lógica igual ao ConsultaEFD.tsx
  } finally {
    setDownloadingAll(false);
  }
};
```

**3.5 Atualizar tabela para mostrar campos corretos:**

A tabela já usa `icms_devido` e `icms_st_devido`, mas a API retorna campos diferentes. Atualizar para usar os campos reais:

| Campo na Tabela | Campo da API |
|-----------------|--------------|
| ICMS | `icms_a_recolher` ou `icms_saldo_devedor` |
| ICMS ST | `icms_st_a_recolher` |

**3.6 Adicionar botão de download TXT individual na tabela:**

Igual ao ConsultaEFD.tsx, adicionar botão com ícone `FileText` antes do botão "Analisar".

---

### Rotas da API

| Funcionalidade | Rota |
|----------------|------|
| Listar arquivos | `GET /api/v1/efd/icms/{cnpj}` |
| Consultar registro | `GET /api/v1/efd/icms/{cnpj}/{id_arquivo}/registro/{codigo}` |
| Download TXT | `GET /api/v1/query/download/efd/icms/arquivo/{id_arquivo}` |
| Download batch (ZIP) | `GET /api/v1/query/download/efd/icms/{cnpj}?data_inicio=&data_fim=` |
| Exportar Excel | `POST /api/v1/efd/icms/{cnpj}/{id_arquivo}/exportar` |

---

### Resumo de Mudanças

1. **Tipos**: Expandir `EFDArquivo` com novos campos ICMS
2. **Hook**: Remover mock, usar `tipo` na rota real
3. **Página**: Adicionar downloads reais + ajustar campos da tabela
4. **Modal de Análise**: Já passa `tipo="icms"`, então funcionará automaticamente

