

## Plano: Seleção Múltipla para Exportação Excel - EFD ICMS

### Objetivo
Adicionar checkboxes para seleção múltipla de arquivos na tabela de EFD ICMS. Nenhum arquivo será selecionado inicialmente. Um botão "Exportar Excel" no topo se atualizará conforme a quantidade selecionada:
- **1 arquivo selecionado**: Abre o modal normal de exportação (`EFDExportDialog`)
- **Múltiplos arquivos**: Exibe toast informando que a funcionalidade está em desenvolvimento

---

### Alterações Técnicas

#### Arquivo: `src/pages/equipe/dev/ConsultaEFDICMS.tsx`

| Seção | Alteração |
|-------|-----------|
| Imports | Adicionar `Checkbox` de `@/components/ui/checkbox` |
| Estados | Adicionar `selectedArquivos: Set<string>` |
| Estado | Adicionar `exportDialogOpen: boolean` para controlar modal externamente |
| Funções | Criar `handleToggleArquivo`, `handleToggleAll` |
| Memo | Criar `allSelected`, `arquivoParaExportar` |
| UI Header | Adicionar botão "Exportar Excel" + Badge de selecionados |
| UI Tabela | Adicionar coluna de checkbox (header + linhas) |
| Handler | Criar `handleExportSelecionados` com lógica condicional |
| Clear | Resetar `selectedArquivos` ao limpar filtros |

---

### Detalhes de Implementação

#### 1. Import Adicional

```typescript
import { Checkbox } from '@/components/ui/checkbox';
```

#### 2. Novos Estados (sem auto-seleção)

```typescript
const [selectedArquivos, setSelectedArquivos] = useState<Set<string>>(new Set());
const [exportDialogOpen, setExportDialogOpen] = useState(false);
```

#### 3. Funções de Seleção

```typescript
// Obter IDs de todos os arquivos filtrados
const getAllArquivoIds = (): string[] => {
  return arquivosFiltrados.map(arq => arq.ID_ARQUIVO);
};

// Verificar se todos estão selecionados
const allSelected = useMemo(() => {
  const ids = getAllArquivoIds();
  return ids.length > 0 && ids.every(id => selectedArquivos.has(id));
}, [selectedArquivos, arquivosFiltrados]);

// Obter arquivo para exportar (quando apenas 1 selecionado)
const arquivoParaExportar = useMemo(() => {
  if (selectedArquivos.size !== 1) return null;
  const [id] = Array.from(selectedArquivos);
  return arquivosFiltrados.find(a => a.ID_ARQUIVO === id) || null;
}, [selectedArquivos, arquivosFiltrados]);

// Toggle individual
const handleToggleArquivo = (id: string) => {
  setSelectedArquivos(prev => {
    const next = new Set(prev);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    return next;
  });
};

// Toggle todos
const handleToggleAll = () => {
  const ids = getAllArquivoIds();
  if (allSelected) {
    // Desmarcar todos
    setSelectedArquivos(new Set());
  } else {
    // Marcar todos
    setSelectedArquivos(new Set(ids));
  }
};
```

#### 4. Handler para Exportação

```typescript
const handleExportSelecionados = () => {
  if (selectedArquivos.size === 0) {
    toast({
      title: "Nenhum arquivo selecionado",
      description: "Selecione ao menos um arquivo para exportar.",
      variant: "destructive",
    });
    return;
  }
  
  if (selectedArquivos.size === 1) {
    // Se apenas 1 selecionado, abrir modal de exportação
    setExportDialogOpen(true);
    return;
  }
  
  // Múltiplos arquivos - mostrar toast informativo
  toast({
    title: "Funcionalidade em desenvolvimento",
    description: `A exportação em lote de ${selectedArquivos.size} arquivos ainda está sendo implementada. Por enquanto, exporte cada arquivo individualmente.`,
    duration: 5000,
  });
};
```

#### 5. Limpar seleção ao mudar filtros/busca

```typescript
const handleClearFilters = () => {
  setSelectedCliente("");
  setSelectedContribuinte("");
  setSelectedFilial("todas");
  setMesInicio(null);
  setMesFim(null);
  setSearchTriggered(false);
  setSelectedArquivos(new Set());  // Limpar seleção
};

// Também limpar ao trocar de contribuinte
onValueChange={(value) => {
  setSelectedContribuinte(value);
  setSelectedFilial("todas");
  setSearchTriggered(false);
  setSelectedArquivos(new Set());  // Limpar seleção
}}
```

#### 6. UI - Botão "Exportar Excel" no Header (linha ~592-615)

Adicionar antes do botão "Baixar Todos":

```tsx
{/* Lado Direito - Ações */}
<div className="flex items-center gap-2">
  {/* Contador de selecionados */}
  {selectedArquivos.size > 0 && (
    <Badge variant="secondary" className="text-xs">
      {selectedArquivos.size} selecionado(s)
    </Badge>
  )}
  
  {/* Exportar Excel */}
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportSelecionados}
          disabled={selectedArquivos.size === 0}
          className="gap-2"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Exportar Excel
          {selectedArquivos.size > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {selectedArquivos.size}
            </Badge>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          {selectedArquivos.size === 0 
            ? "Selecione arquivos para exportar" 
            : `Exportar ${selectedArquivos.size} arquivo(s) para Excel`
          }
        </p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>

  {/* Baixar Todos (existente) */}
  <TooltipProvider>
    ...
  </TooltipProvider>
</div>
```

#### 7. UI - Coluna de Checkbox na Tabela

**Header (linha ~654):**
```tsx
<th className="px-4 py-4 w-12">
  <Checkbox
    checked={allSelected}
    onCheckedChange={handleToggleAll}
    aria-label="Selecionar todos"
  />
</th>
```

**Linha da tabela (linha ~681):**
```tsx
<td className="px-4 py-4">
  <Checkbox
    checked={selectedArquivos.has(arquivo.ID_ARQUIVO)}
    onCheckedChange={() => handleToggleArquivo(arquivo.ID_ARQUIVO)}
    aria-label={`Selecionar ${arquivo.NOME}`}
  />
</td>
```

#### 8. EFDExportDialog Controlado Externamente

Adicionar um `EFDExportDialog` separado (fora da tabela) que abre via estado:

```tsx
{/* Modal de Exportação para arquivo selecionado */}
{arquivoParaExportar && (
  <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      {/* Reutilizar o conteúdo interno do EFDExportDialog */}
      {/* Ou criar uma variante que aceita open/onOpenChange */}
    </DialogContent>
  </Dialog>
)}
```

**Alternativa mais simples:** Modificar `EFDExportDialog` para aceitar props `open` e `onOpenChange` opcionais, permitindo controle externo. Se não fornecidas, usa o comportamento atual com `DialogTrigger`.

---

### Comportamento Esperado

1. Usuario busca arquivos - nenhum arquivo vem selecionado
2. Checkboxes aparecem na primeira coluna da tabela
3. Checkbox mestre no header permite selecionar/desmarcar todos
4. Badge e botão mostram quantidade selecionada
5. Botão "Exportar Excel" fica desabilitado sem seleção
6. **1 arquivo selecionado**: Clique abre o modal de exportação normal
7. **2+ arquivos**: Clique exibe toast "Funcionalidade em desenvolvimento"
8. "Limpar Filtros" reseta a seleção

---

### Toast Informativo (Múltiplos Arquivos)

```text
┌────────────────────────────────────────────────┐
│  ⚠️ Funcionalidade em desenvolvimento          │
│                                                │
│  A exportação em lote de X arquivos ainda      │
│  está sendo implementada. Por enquanto,        │
│  exporte cada arquivo individualmente.         │
└────────────────────────────────────────────────┘
```

---

### Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/pages/equipe/dev/ConsultaEFDICMS.tsx` | Estados, funções, checkboxes, botão exportar |
| `src/components/equipe/dev/EFDExportDialog.tsx` | Adicionar props `open`/`onOpenChange` para controle externo (opcional) |

