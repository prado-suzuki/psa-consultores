

# Criar ferramentas ECD e ECF baseadas no layout EFD ICMS

## Objetivo

Criar duas novas paginas de consulta -- "Consulta ECD" e "Consulta ECF" -- replicando fielmente o layout, estrutura de filtros, tabela de resultados e acoes do EFD ICMS, adaptando apenas os campos especificos de cada obrigacao. Como os endpoints ainda nao existem, o frontend sera criado com estrutura pronta para integracao futura, usando o mesmo hook `useEFDOverview` com tipos `ecd` e `ecf`.

## Arquivos a criar

### 1. `src/pages/equipe/dev/ConsultaECD.tsx`
Pagina completa baseada na ConsultaEFDICMS, com as seguintes adaptacoes:

- **DevLayout**: title="Consulta ECD", subtitle="Analise e auditoria de Escrituracao Contabil Digital"
- **Filtros**: Mesma estrutura (Cliente 3col, Contribuinte 5col, Data Inicio 2col, Data Fim 2col) -- SEM filtro de Filial
- **Tabela de resultados**: Colunas adaptadas para ECD:
  - Checkbox (selecao multipla)
  - Arquivo (nome + ID)
  - Periodo (DT_INI a DT_FIN)
  - Tipo (Original/Retificadora)
  - Finalidade (campo COD_FIN: 0=Original, 1=Substituta, etc.)
  - Acoes (Baixar TXT, Exportar Excel, Analisar)
- **Header de resultados**: CNPJ + Refresh + acoes de selecao (Exportar excel, Baixar txt) -- sem dropdown de filial
- **Empty states**: Identicos ao EFD ICMS
- **Hooks**: Usa `useEFDOverview` com `tipo: 'ecd'`
- **Downloads**: URLs adaptadas para `/api/v1/query/download/efd/ecd/...`
- **Modais**: Usa os mesmos `EFDAnalysisModal` e `EFDExportDialog` com `tipo="ecd"`

### 2. `src/pages/equipe/dev/ConsultaECF.tsx`
Pagina completa baseada na ConsultaEFDICMS, com as seguintes adaptacoes:

- **DevLayout**: title="Consulta ECF", subtitle="Analise e auditoria de Escrituracao Contabil Fiscal"
- **Filtros**: Mesma estrutura (Cliente 3col, Contribuinte 5col, Data Inicio 2col, Data Fim 2col) -- SEM filtro de Filial
- **Tabela de resultados**: Colunas adaptadas para ECF:
  - Checkbox (selecao multipla)
  - Arquivo (nome + ID)
  - Periodo (DT_INI a DT_FIN)
  - Tipo (Original/Retificadora)
  - Situacao Especial (IND_SIT_ESP)
  - Acoes (Baixar TXT, Exportar Excel, Analisar)
- **Header de resultados**: CNPJ + Refresh + acoes de selecao -- sem dropdown de filial
- **Hooks**: Usa `useEFDOverview` com `tipo: 'ecf'`
- **Downloads**: URLs adaptadas para `/api/v1/query/download/efd/ecf/...`
- **Modais**: Usa os mesmos `EFDAnalysisModal` e `EFDExportDialog` com `tipo="ecf"`

## Arquivos a modificar

### 3. `src/types/efd.ts`
- Adicionar `'ecd' | 'ecf'` ao tipo `EFDTipo` (atualmente apenas `'contribuicoes' | 'icms'`)

### 4. `src/components/equipe/dev/DevLayout.tsx`
- Adicionar 2 entradas no array `navItems`:
  - `{ icon: FileText, label: 'ECD', path: '/equipe/dev/consulta-ecd' }`
  - `{ icon: FileText, label: 'ECF', path: '/equipe/dev/consulta-ecf' }`
- Posicionar logo apos "EFD ICMS" na lista

### 5. `src/App.tsx`
- Importar `ConsultaECD` e `ConsultaECF`
- Adicionar 2 rotas com TeamRoute + PageAccessGate:
  - `/equipe/dev/consulta-ecd`
  - `/equipe/dev/consulta-ecf`

## Detalhes tecnicos

### Estrutura do componente (identica para ECD e ECF)

```text
DevLayout
  Card (Filtros)
    CardHeader: icone Filter + "FILTROS DE BUSCA" uppercase
    CardContent: grid 12 colunas
      - Cliente (3col): Select com clientes ativos
      - Contribuinte (5col): Select filtrado por cliente
      - Data Inicio (2col): MonthYearPicker
      - Data Fim (2col): MonthYearPicker
    Barra de acoes: Limpar filtros (ghost) + Buscar (primary)
  Card (Resultados)
    Header: CNPJ + Refresh + Exportar Excel + Baixar TXT
    Tabela com colunas especificas
    Empty states (inicial, loading, sem resultados)
  EFDAnalysisModal
  EFDExportDialog (controlado externamente)
```

### Colunas da tabela ECD
| Coluna | Campo | Alinhamento |
|--------|-------|-------------|
| Checkbox | selecao | esquerda |
| Arquivo | NOME + ID_ARQUIVO | esquerda |
| Periodo | DT_INI a DT_FIN | esquerda |
| Tipo | TIPO_ESCRIT (Original/Retificadora) | esquerda |
| Finalidade | COD_FIN | esquerda |
| Acoes | Baixar, Exportar, Analisar | centro |

### Colunas da tabela ECF
| Coluna | Campo | Alinhamento |
|--------|-------|-------------|
| Checkbox | selecao | esquerda |
| Arquivo | NOME + ID_ARQUIVO | esquerda |
| Periodo | DT_INI a DT_FIN | esquerda |
| Tipo | TIPO_ESCRIT (Original/Retificadora) | esquerda |
| Situacao Especial | IND_SIT_ESP | esquerda |
| Acoes | Baixar, Exportar, Analisar | centro |

### Hook reutilizado
O `useEFDOverview` ja aceita o parametro `tipo` que define a rota da API (`/api/v1/efd/{tipo}/{cnpj}`). Basta passar `'ecd'` ou `'ecf'`. Quando o endpoint nao existir, a tela mostrara o erro normalmente via toast.

### Funcionalidades incluidas (identicas ao EFD ICMS)
- Selecao multipla com checkbox (toggle individual + toggle all)
- Download individual TXT
- Download em lote (ZIP)
- Exportacao Excel (via EFDExportDialog)
- Analise detalhada (via EFDAnalysisModal)
- Auto-selecao de contribuinte quando cliente tem apenas um
- Filtragem local por periodo (interseccao de datas)
- Formatadores: CNPJ, moeda, periodo

