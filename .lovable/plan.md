
# Plano de Migração: ConsultaEFD.tsx para Design "Fiscal" (Golden Standard)

## Resumo Executivo

Este plano detalha a migração do protótipo HTML anexo para a arquitetura React existente, mantendo o DevLayout intacto e aplicando todas as customizações visuais localmente nos componentes.

---

## 1. Análise Comparativa

### Diferenças Visuais Principais (HTML vs Atual)

| Elemento | Estado Atual | Golden Standard (HTML) |
|----------|--------------|------------------------|
| **Tabela - Cabeçalhos** | `bg-muted/50` sutil | `bg-slate-200` com bordas verticais visíveis |
| **Tabela - Linhas** | `py-4` padding padrão | `py-1.5` compacto (densidade fiscal) |
| **Tabela - Scroll** | ScrollArea padrão | Scrollbar visível estilizada (12px) |
| **Filtros de Data** | Popover com Calendar | Input nativo `type="date"` |
| **Botão Limpar Filtros** | Texto simples | Botão com ícone Eraser + hover vermelho |
| **Modal Análise** | View inline com tabs | Modal fullscreen com Sidebar Tree |
| **Modal Exportação** | Tabs + checkboxes | Acordeões verticais + Perfis salvos |
| **Seleção de Registros** | Por colunas | Por registros SPED (C100, M200, etc.) |

---

## 2. Escopo de Alterações

### Arquivos a Modificar

| Arquivo | Tipo de Alteração |
|---------|-------------------|
| `src/pages/equipe/dev/ConsultaEFD.tsx` | **Refatoração completa** |
| `src/components/equipe/dev/EFDExportDialog.tsx` | **Refatoração completa** |
| `src/types/efd.ts` | Adição de tipos (opcional) |
| `src/constants/efdConfig.ts` | Adição de constantes de blocos |

### Arquivos NÃO Alterados (Regra de Ouro)

| Arquivo | Razão |
|---------|-------|
| `src/index.css` / `globals.css` | Estilos globais protegidos |
| `src/components/equipe/dev/DevLayout.tsx` | Layout compartilhado |
| Componentes UI (`button.tsx`, `table.tsx`) | Componentes do design system |

---

## 3. Etapas de Implementação

### FASE 1: Constantes e Tipos

**3.1.1. Adicionar ao `src/constants/efdConfig.ts`:**

```typescript
// Descrições dos blocos SPED
export const BLOCK_DESCRIPTIONS: Record<string, string> = {
  '0': 'Bloco 0 - Abertura e Identificação',
  'A': 'Bloco A - Serviços (ISS)',
  'C': 'Bloco C - Documentos Fiscais (ICMS/IPI)',
  'D': 'Bloco D - Documentos Fiscais (Serviços)',
  'F': 'Bloco F - Demais Documentos',
  'M': 'Bloco M - Apuração e Créditos',
  '1': 'Bloco 1 - Complementos',
  '9': 'Bloco 9 - Controle e Encerramento',
};

// Descrições dos registros comuns
export const REG_DESCRIPTIONS: Record<string, string> = {
  '0000': 'Abertura do Arquivo Digital',
  '0100': 'Dados do Contabilista',
  '0110': 'Regimes de Apuração',
  '0140': 'Cadastro de Estabelecimento',
  'C010': 'Identificação do Estabelecimento',
  'C100': 'Nota Fiscal (NF-e, NFC-e)',
  'C170': 'Itens do Documento',
  'M200': 'Consolidação PIS/Pasep',
  'M600': 'Consolidação COFINS',
  // ... expandir conforme necessário
};

// Perfis pré-definidos de exportação
export const EXPORT_PRESET_PROFILES = {
  all: { name: 'Todos os Registros', registros: 'ALL' as const },
  fiscal: { name: 'Auditoria Fiscal', registros: ['0000', '0140', 'C100', 'C170', 'C190'] },
  apuracao: { name: 'Apuração', registros: ['0000', 'M200', 'M600'] },
};
```

**3.1.2. Adicionar ao `src/types/efd.ts`:**

```typescript
// Tipo para estado de seleção de registros (exportação)
export interface ExportSelection {
  selectedRegistros: Set<string>;
  blocosDisponiveis: Record<string, string[]>;
}
```

---

### FASE 2: Refatoração de ConsultaEFD.tsx

#### 2.1. Seção de Filtros de Busca

**Alterações visuais:**
- Labels em UPPERCASE com `text-xs font-bold tracking-wider`
- Inputs de data nativos (`<input type="date" />`) em vez de Popover/Calendar
- Altura uniforme `h-11` em todos os campos
- Botão "Limpar Filtros" com ícone `Eraser` e hover vermelho
- Ícone de calendário posicionado dentro do input

**Código aproximado:**
```tsx
// Data Início - Input nativo
<div className="relative">
  <Calendar className="absolute left-3 top-3 h-5 w-5 text-slate-400 pointer-events-none" />
  <input
    type="date"
    value={dataInicio ? format(dataInicio, 'yyyy-MM-dd') : ''}
    onChange={(e) => setDataInicio(e.target.value ? new Date(e.target.value) : undefined)}
    className="w-full h-11 pl-10 pr-3 rounded-lg border border-slate-300 bg-white text-sm 
               focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
  />
</div>

// Botão Limpar Filtros
<Button 
  variant="ghost" 
  onClick={handleClearFilters}
  className="text-slate-500 hover:text-red-600 hover:bg-red-50"
>
  <Eraser className="h-4 w-4 mr-2" />
  Limpar Filtros
</Button>
```

#### 2.2. Tabela de Arquivos (Lista)

**Estilo Fiscal aplicado localmente:**
```tsx
<div className="overflow-x-auto [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar-track]:bg-slate-100 
                [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full">
  <table className="w-full text-left border-collapse text-sm">
    <thead>
      <tr className="bg-slate-200 border-b border-slate-300">
        <th className="px-6 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">
          Arquivo
        </th>
        {/* ... mais colunas */}
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-200">
      {arquivos.map(arquivo => (
        <tr key={arquivo.ID_ARQUIVO} className="hover:bg-slate-50 transition-colors">
          <td className="px-6 py-3">{/* ... */}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

**Novas colunas de Ações:**
- Botão "Baixar TXT" (ícone FileText, borda slate)
- Botão "Exportar Excel" (ícone Sheet, borda emerald)
- Botão "Analisar" (primary, abre modal)

#### 2.3. Modal de Análise (Master-Detail)

**Nova estrutura fullscreen:**

```text
+------------------------------------------------------------------+
| Header: Título do Arquivo | Período | PIS Total | COFINS Total | X |
+------------------------------------------------------------------+
| Sidebar        |  Área Principal                                  |
| (Árvore)       |  [REG Badge] [Título do Registro]                |
|                |  +------------------------------------------+    |
| ▶ Bloco 0      |  | Tabela de Dados Fiscais (scroll H+V)     |    |
|   ├ 0000       |  | bg-slate-200 header, bordas verticais    |    |
|   └ 0110       |  +------------------------------------------+    |
| ▶ Bloco C      |                                                  |
|   ├ C100       |                                                  |
|   └ C170       |                                                  |
+------------------------------------------------------------------+
```

**Componentes a criar:**
1. `EFDAnalysisModal` - Modal fullscreen com Dialog
2. `EFDBlockTree` - Sidebar com árvore colapsável
3. `EFDDataTable` - Tabela fiscal com bordas verticais

**Lógica da árvore:**
```tsx
// Estado: árvore inicia colapsada
const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());

const toggleBlock = (bloco: string) => {
  setExpandedBlocks(prev => {
    const next = new Set(prev);
    if (next.has(bloco)) next.delete(bloco);
    else next.add(bloco);
    return next;
  });
};
```

**Estilo da tabela de dados (densidade fiscal):**
```tsx
// Cabeçalho com bg-slate-200 e bordas verticais
<th className="px-4 py-2 text-xs font-bold text-slate-700 uppercase 
               bg-slate-200 border-r border-slate-300 last:border-r-0 
               whitespace-nowrap min-w-[120px]">
  {column.label}
</th>

// Células com bordas verticais
<td className="px-4 py-1.5 text-sm font-medium text-slate-700 
               whitespace-nowrap border-r border-slate-200 last:border-r-0">
  {formatEFDValue(row[column.id], column.id)}
</td>

// Linhas alternadas
<tr className="hover:bg-blue-50 even:bg-slate-50 border-b border-slate-200">
```

---

### FASE 3: Refatoração de EFDExportDialog.tsx

#### 3.1. Nova Estrutura do Modal

**Layout Acordeão Vertical:**

```text
+----------------------------------------------------------+
| Header: Exportar para Excel                            X |
| Descrição: Selecione os registros para o relatório       |
+----------------------------------------------------------+
| [Carregar Perfil ▼] [Salvar] | Selecionar Todos | Limpar |
+----------------------------------------------------------+
| ▼ Bloco 0 - Abertura e Identificação         [2/4]       |
|   ☑ 0000 - Abertura do Arquivo Digital                   |
|   ☑ 0100 - Dados do Contabilista                         |
|   ☐ 0110 - Regimes de Apuração                           |
|   ☐ 0140 - Cadastro de Estabelecimento                   |
+----------------------------------------------------------+
| ▶ Bloco C - Documentos Fiscais               [0/3]       |
+----------------------------------------------------------+
| [Badge: 2 selecionados] | [Cancelar] [Baixar Relatório]  |
+----------------------------------------------------------+
```

#### 3.2. Props Atualizadas

```typescript
interface EFDExportDialogProps {
  // Novo: recebe o arquivo completo em vez de dados
  arquivo: EFDArquivo;
  blocosDisponiveis: Record<string, BlocoRegistro[]>;
  onExport: (selectedRegistros: string[]) => Promise<void>;
  disabled?: boolean;
}
```

#### 3.3. Estados Internos

```typescript
const [open, setOpen] = useState(false);
const [selectedRegistros, setSelectedRegistros] = useState<Set<string>>(new Set());
const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
const [isExporting, setIsExporting] = useState(false);
const [selectedProfile, setSelectedProfile] = useState<string>('none');
```

#### 3.4. Lógica de Seleção em Massa

```typescript
// Toggle individual
const toggleRegistro = (reg: string) => {
  setSelectedRegistros(prev => {
    const next = new Set(prev);
    if (next.has(reg)) next.delete(reg);
    else next.add(reg);
    return next;
  });
};

// Toggle bloco inteiro
const toggleBloco = (bloco: string) => {
  const registros = blocosDisponiveis[bloco]?.map(r => r.codigo) || [];
  const allSelected = registros.every(r => selectedRegistros.has(r));
  
  setSelectedRegistros(prev => {
    const next = new Set(prev);
    registros.forEach(r => {
      if (allSelected) next.delete(r);
      else next.add(r);
    });
    return next;
  });
};

// Aplicar perfil pré-definido
const applyProfile = (profileKey: string) => {
  const profile = EXPORT_PRESET_PROFILES[profileKey];
  if (profile.registros === 'ALL') {
    const allRegs = Object.values(blocosDisponiveis).flat().map(r => r.codigo);
    setSelectedRegistros(new Set(allRegs));
  } else {
    setSelectedRegistros(new Set(profile.registros));
  }
};
```

#### 3.5. Lógica de Exportação

A exportação deve buscar dados de cada registro selecionado via API e consolidar em um único Excel com múltiplas abas:

```typescript
const handleExport = async () => {
  if (selectedRegistros.size === 0) {
    toast({ title: 'Selecione registros', variant: 'destructive' });
    return;
  }
  
  setIsExporting(true);
  
  try {
    // Criar workbook
    const wb = XLSX.utils.book_new();
    
    // Para cada registro selecionado, buscar dados e criar aba
    for (const reg of Array.from(selectedRegistros)) {
      const response = await fetchWithAuth(
        getApiUrl(`/api/v1/efd/contribuicoes/${arquivo.CNPJ}/${arquivo.ID_ARQUIVO}/registro/REG_${reg}`)
      );
      const data = await response.json();
      
      if (data.dados?.length > 0) {
        const ws = XLSX.utils.json_to_sheet(data.dados);
        XLSX.utils.book_append_sheet(wb, ws, reg);
      }
    }
    
    // Download
    const fileName = `EFD_${arquivo.NOME}_${format(new Date(), 'yyyyMMdd')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast({ title: 'Exportação concluída' });
    setOpen(false);
  } catch (error) {
    toast({ title: 'Erro na exportação', variant: 'destructive' });
  } finally {
    setIsExporting(false);
  }
};
```

---

### FASE 4: CSS Local (Classes Tailwind)

#### 4.1. Scrollbar Fiscal (aplicar via classes inline)

```tsx
// Classe a aplicar em containers com scroll
className="overflow-auto 
  [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar]:h-3
  [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-track]:border-l [&::-webkit-scrollbar-track]:border-slate-200
  [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full
  [&::-webkit-scrollbar-thumb:hover]:bg-slate-500"
```

#### 4.2. Estilo Hover Lift (botões de ação)

```tsx
className="transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
```

#### 4.3. Acordeão com Animação

```tsx
// Container do acordeão
<div className={cn(
  "border border-slate-200 rounded-xl overflow-hidden bg-white transition-all",
  isExpanded && "shadow-sm"
)}>
  {/* Header clicável */}
  <button 
    onClick={() => toggleBlock(bloco)}
    className="flex items-center justify-between w-full p-4 hover:bg-slate-50 transition-colors"
  >
    <ChevronDown className={cn(
      "h-5 w-5 text-slate-400 transition-transform duration-300",
      isExpanded && "rotate-180"
    )} />
  </button>
  
  {/* Conteúdo animado */}
  <div className={cn(
    "overflow-hidden transition-all duration-300",
    isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
  )}>
    <div className="p-4 bg-slate-50 border-t border-slate-100">
      {/* Checkboxes de registros */}
    </div>
  </div>
</div>
```

---

## 4. Mapeamento de Dados (Mock → Real)

### Correspondência de Campos

| Campo HTML (Mock) | Campo API Real | Localização |
|-------------------|----------------|-------------|
| `file.nome` | `arquivo.NOME` | EFDArquivo |
| `file.periodo` | `${DT_INI} a ${DT_FIN}` | EFDArquivo |
| `file.tipo` | `TIPO_ESCRIT === 0 ? 'ORIGINAL' : 'RETIFICADORA'` | EFDArquivo |
| `file.pis` | `formatCurrency(pis_devido)` | EFDArquivo |
| `file.cofins` | `formatCurrency(cofins_devido)` | EFDArquivo |
| `file.available_regs` | `overview.blocos_disponiveis` | EFDOverview |
| `file.data_content[reg]` | API: `/registro/REG_${reg}` | useEFDDetail |

---

## 5. Componentes a Criar

| Componente | Responsabilidade |
|------------|------------------|
| `EFDAnalysisModal.tsx` | Modal fullscreen com layout master-detail |
| `EFDBlockTree.tsx` | Sidebar com árvore de blocos colapsável |
| `EFDFiscalTable.tsx` | Tabela de dados com estilo fiscal |
| (Refatorar) `EFDExportDialog.tsx` | Modal de exportação com acordeões |

---

## 6. Resumo de Arquivos

| Arquivo | Ação | Linhas Estimadas |
|---------|------|------------------|
| `src/constants/efdConfig.ts` | Adicionar constantes | +50 linhas |
| `src/types/efd.ts` | Adicionar 1 interface | +5 linhas |
| `src/pages/equipe/dev/ConsultaEFD.tsx` | Refatorar completamente | ~600 → ~400 linhas |
| `src/components/equipe/dev/EFDExportDialog.tsx` | Refatorar completamente | ~340 → ~450 linhas |
| `src/components/equipe/dev/EFDAnalysisModal.tsx` | **NOVO** | ~250 linhas |
| `src/components/equipe/dev/EFDBlockTree.tsx` | **NOVO** | ~100 linhas |
| `src/components/equipe/dev/EFDFiscalTable.tsx` | **NOVO** | ~120 linhas |

---

## 7. Ordem de Execução

1. Atualizar `efdConfig.ts` com constantes de blocos
2. Criar `EFDFiscalTable.tsx` (tabela reutilizável)
3. Criar `EFDBlockTree.tsx` (árvore de navegação)
4. Criar `EFDAnalysisModal.tsx` (modal fullscreen)
5. Refatorar `EFDExportDialog.tsx` (acordeões)
6. Refatorar `ConsultaEFD.tsx` (integrar tudo)
7. Testes visuais e funcionais

---

## 8. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Performance com muitos registros | Paginação já implementada na API |
| Múltiplas chamadas API na exportação | Mostrar progresso, limitar paralelismo |
| Conflitos com estilos globais | Usar apenas classes Tailwind inline |
| Quebra de integração com hooks existentes | Manter mesma interface de useEFDData |

