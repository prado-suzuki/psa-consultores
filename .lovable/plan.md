
# Plano de Implementação: Consulta EFD ICMS

## Resumo

Criar uma nova ferramenta de desenvolvimento chamada **Consulta EFD ICMS** que será uma réplica da ferramenta existente de EFD Contribuições, mas adaptada para análise de arquivos EFD ICMS/IPI. Nesta versão inicial, os dados serão consumidos a partir de arquivos JSON mockados no storage.

---

## Arquivos a Criar

### 1. Nova Página: `src/pages/equipe/dev/ConsultaEFDICMS.tsx`
- Cópia baseada em `ConsultaEFD.tsx`
- Textos alterados de "EFD Contribuições" para "EFD ICMS"
- Passará `tipo="icms"` para os componentes filhos
- Usará hooks adaptados para buscar dados mockados

---

## Arquivos a Modificar

### 2. Tipagem: `src/types/efd.ts`
Adicionar:
- Tipo `EFDTipo = 'contribuicoes' | 'icms'`
- Expandir `EFDArquivo` para incluir campos ICMS opcionais:
```text
icms_devido?: string | null
icms_st_devido?: string | null
```

### 3. Hook de Dados: `src/hooks/useEFDData.ts`
Adicionar parâmetro `tipo` aos hooks:
- `useEFDOverview`: Quando `tipo === 'icms'`, buscar dados do bucket `project-documents/M1_EFD_ICMS.json` via Supabase Storage
- `useEFDDetail`: Quando `tipo === 'icms'` e registro === `REG_C100`, buscar de `project-documents/M2_EFD_ICMS.json`
- Manter comportamento atual (chamada à API) quando `tipo === 'contribuicoes'` ou não especificado

### 4. Modal de Análise: `src/components/equipe/dev/EFDAnalysisModal.tsx`
Adicionar prop `tipo: 'contribuicoes' | 'icms'`:
- No header de totais:
  - Se `tipo === 'icms'`: exibir "Total ICMS" e "Total ICMS ST" mapeados para `icms_devido` e `icms_st_devido`
  - Se `tipo === 'contribuicoes'`: manter "Total PIS" e "Total COFINS" (comportamento atual)
- Passar `tipo` para `useEFDDetail`

### 5. Dialog de Exportação: `src/components/equipe/dev/EFDExportDialog.tsx`
Adicionar prop `tipo: 'contribuicoes' | 'icms'`:
- URL de exportação dinâmica:
```text
/api/v1/efd/${tipo}/${cnpj}/${id_arquivo}/exportar
```
- Usar tool_type adequado para perfis (opcional: `efd-icms` vs `efd`)

### 6. Layout/Navegação: `src/components/equipe/dev/DevLayout.tsx`
Adicionar novo item de menu:
```text
{ icon: FileText, label: 'EFD ICMS', path: '/equipe/dev/consulta-efd-icms' }
```

### 7. Roteamento: `src/App.tsx`
Adicionar:
- Import do novo componente `ConsultaEFDICMS`
- Rota: `/equipe/dev/consulta-efd-icms`

### 8. Configurações: `src/constants/efdConfig.ts`
Expandir as descrições de grupos para incluir ICMS:
```text
'ICMS',
'ICMS-ST',
```
Atualizar `inferGroupFromKey` para detectar colunas ICMS:
```text
if (key.includes('ICMS_ST')) return 'ICMS-ST';
if (key.includes('ICMS')) return 'ICMS';
```

---

## Fluxo de Dados (Mock)

```text
┌─────────────────────────────────────────────────────────────────┐
│                    ConsultaEFDICMS.tsx                          │
│                   (tipo = 'icms')                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  useEFDOverview(tipo='icms')                    │
│  → Supabase Storage: project-documents/M1_EFD_ICMS.json         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│               EFDAnalysisModal (tipo='icms')                    │
│  → Header: "Total ICMS" / "Total ICMS ST"                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│            useEFDDetail(tipo='icms', registro='REG_C100')       │
│  → Supabase Storage: project-documents/M2_EFD_ICMS.json         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   EFDFiscalTable                                │
│  → Colunas dinâmicas: VL_BC_ICMS, VL_ICMS, VL_BC_ICMS_ST, etc. │
└─────────────────────────────────────────────────────────────────┘
```

---

## Detalhes Técnicos

### Leitura do Mock (Storage)
```text
const { data } = await supabase.storage
  .from('project-documents')
  .download('M1_EFD_ICMS.json');

const json = JSON.parse(await data.text());
```

### Estrutura Esperada do Mock M1 (Overview)
```text
{
  "cnpj": "12345678000190",
  "blocos_disponiveis": {
    "0": [{"codigo": "REG_0000", "descricao": "..."}],
    "C": [{"codigo": "REG_C100", "descricao": "..."}],
    ...
  },
  "arquivos": [
    {
      "ID_ARQUIVO": "...",
      "CNPJ": "...",
      "NOME": "...",
      "DT_INI": "2024-01-01",
      "DT_FIN": "2024-01-31",
      "icms_devido": "15000.00",
      "icms_st_devido": "3500.00",
      ...
    }
  ]
}
```

### Estrutura Esperada do Mock M2 (Detail REG_C100)
```text
{
  "registro": "REG_C100",
  "descricao": "Nota Fiscal (ICMS/IPI)",
  "paginacao": { "page": 1, "limit": 100, "total_registros": 50, "total_paginas": 1 },
  "dados": [
    {
      "REG": "C100",
      "NUM_DOC": "123456",
      "VL_BC_ICMS": "1000.00",
      "VL_ICMS": "180.00",
      "VL_BC_ICMS_ST": "500.00",
      "VL_ICMS_ST": "90.00",
      ...
    }
  ]
}
```

---

## Componentes Reutilizados (Sem Alteração)
- `EFDBlockTree.tsx` - Navegação lateral de blocos SPED
- `EFDFiscalTable.tsx` - Tabela dinâmica (já suporta novos campos via `generateColumnsFromData`)

---

## Ordem de Implementação

1. Atualizar tipagem em `src/types/efd.ts`
2. Expandir `src/constants/efdConfig.ts` para grupos ICMS
3. Modificar `src/hooks/useEFDData.ts` para suportar tipo e mock
4. Atualizar `EFDAnalysisModal.tsx` com prop tipo
5. Atualizar `EFDExportDialog.tsx` com URL dinâmica
6. Criar `ConsultaEFDICMS.tsx`
7. Adicionar rota em `App.tsx`
8. Adicionar menu em `DevLayout.tsx`
