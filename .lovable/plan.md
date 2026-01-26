

# Diagnóstico: API Retornou Array Vazio

## Problema Identificado

A requisição enviada foi:
```
GET /api/v1/efd/contribuicoes/52102040000148?DT_INI=2023-01-01&DT_FIN=2026-01-31
```

A API retornou `arquivos: []` porque:

**Os parâmetros `DT_INI` e `DT_FIN` são filtros de IGUALDADE EXATA**, não de intervalo.

- `DT_INI=2023-01-01` → busca arquivos onde a data de início é **exatamente** 01/01/2023
- `DT_FIN=2026-01-31` → busca arquivos onde a data fim é **exatamente** 31/01/2026

Como nenhum arquivo EFD tem esse período exato, a resposta é vazia.

---

## Diferença entre os Endpoints

| Endpoint | Parâmetros | Comportamento |
|----------|------------|---------------|
| `GET /api/v1/efd/{tipo}/{cnpj}` (listagem) | `DT_INI`, `DT_FIN` | Filtro de igualdade exata |
| `GET /api/v1/query/download/efd/{tipo}/{cnpj}` (download) | `data_inicio`, `data_fim` | Filtro de intervalo (range) |

---

## Solução Proposta

Como o endpoint de listagem NÃO suporta filtro de intervalo, a solução é:

### Opção 1: Filtrar no Frontend (Recomendada)

1. **Remover os parâmetros de data** da chamada à API de listagem
2. **Buscar todos os arquivos** do contribuinte
3. **Filtrar localmente** os arquivos cujo período intersecciona com o intervalo selecionado

### Alterações Necessárias

#### Arquivo: `src/hooks/useEFDData.ts`

Remover os parâmetros `DT_INI` e `DT_FIN` da requisição de listagem:

```typescript
// REMOVER estas linhas (52-56):
if (params.dataInicio) {
  url.searchParams.set('DT_INI', params.dataInicio);
}
if (params.dataFim) {
  url.searchParams.set('DT_FIN', params.dataFim);
}
```

#### Arquivo: `src/pages/equipe/dev/ConsultaEFD.tsx`

Adicionar filtragem local dos arquivos:

```typescript
// Filtrar arquivos por período (intersecção)
const arquivosFiltrados = useMemo(() => {
  if (!overview?.arquivos) return [];
  
  // Se não há filtro de data, retorna todos
  if (!dataInicio && !dataFim) return overview.arquivos;
  
  return overview.arquivos.filter(arquivo => {
    const arquivoInicio = new Date(arquivo.DT_INI);
    const arquivoFim = new Date(arquivo.DT_FIN);
    const filtroInicio = dataInicio ? new Date(dataInicio) : null;
    const filtroFim = dataFim ? new Date(dataFim) : null;
    
    // Verificar intersecção de períodos
    // Um arquivo está no escopo se:
    // - Seu período TERMINA após o início do filtro (ou não há filtro de início)
    // - Seu período INICIA antes do fim do filtro (ou não há filtro de fim)
    const depoisDoInicio = !filtroInicio || arquivoFim >= filtroInicio;
    const antesDoFim = !filtroFim || arquivoInicio <= filtroFim;
    
    return depoisDoInicio && antesDoFim;
  });
}, [overview?.arquivos, dataInicio, dataFim]);
```

Depois, substituir `overview?.arquivos` por `arquivosFiltrados` na renderização da tabela.

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useEFDData.ts` | Remover parâmetros `DT_INI` e `DT_FIN` da query |
| `src/pages/equipe/dev/ConsultaEFD.tsx` | Adicionar `useMemo` para filtrar arquivos por período (intersecção) |
| `src/pages/equipe/dev/ConsultaEFD.tsx` | Substituir `overview?.arquivos` por `arquivosFiltrados` na tabela |

---

## Comportamento Esperado

Após a correção:

1. **Sem filtro de data**: Exibe todos os arquivos do contribuinte
2. **Com filtro de data**: Exibe arquivos cujo período **intersecciona** com o intervalo selecionado
   - Exemplo: Filtro "Jan/2024 a Mar/2024" mostrará:
     - Arquivo de Dez/2023 a Jan/2024 ✓ (intersecciona)
     - Arquivo de Fev/2024 a Fev/2024 ✓ (dentro do período)
     - Arquivo de Mar/2024 a Abr/2024 ✓ (intersecciona)
     - Arquivo de Mai/2024 a Jun/2024 ✗ (fora do período)

