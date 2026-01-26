
# Plano: Correções de Download e Botão "Baixar Todos"

## Diagnóstico

### 1. Erro no Download Individual (TXT)
- **Causa:** A API retorna erro 404 com `error_code: "FILE_NOT_FOUND"`
- **Problema no código:** O tratamento de erro busca `errorData.detail`, mas a API retorna `errorData.error_message`
- **Solução:** Ajustar para ler o campo correto da resposta de erro

### 2. PIS e COFINS Zerados
- **Causa:** A API retorna dados reais:
  - `pis_devido: "0"` (string zero)
  - `cofins_devido: null` (campo nulo)
- **Análise:** Este é o comportamento correto para empresas de transporte no regime não-cumulativo que possuem mais créditos que débitos
- **Nota:** Existe crédito de PIS (R$ 3.535,62), mas zero de débito - não é um bug do frontend

### 3. Implementar Botão "Baixar Todos"
- **Endpoint:** `GET /api/v1/query/download/efd/contribuicoes/{cnpj}?data_inicio=X&data_fim=Y`
- **Resposta:** ZIP com múltiplos arquivos TXT

---

## Alterações

### Arquivo: `src/pages/equipe/dev/ConsultaEFD.tsx`

#### 1. Corrigir tratamento de erro no download individual

```typescript
// Linha ~128-129 - Buscar error_message ao invés de detail
const errorData = await response.json().catch(() => ({}));
throw new Error(errorData.error_message || errorData.detail || 'Erro ao baixar arquivo');
```

#### 2. Adicionar estado e handler para download em lote

```typescript
// Novo estado
const [downloadingAll, setDownloadingAll] = useState(false);

// Novo handler
const handleDownloadAll = async () => {
  if (!cnpjContribuinte) return;
  
  setDownloadingAll(true);
  
  try {
    // Montar URL com query params opcionais
    const url = new URL(getApiUrl(`/api/v1/query/download/efd/contribuicoes/${cnpjContribuinte}`));
    if (dataInicio) url.searchParams.set('data_inicio', dataInicio);
    if (dataFim) url.searchParams.set('data_fim', dataFim);
    
    const response = await fetchWithAuth(url.toString());
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error_message || 'Erro ao baixar arquivos');
    }
    
    // Verificar tipo de resposta (ZIP ou TXT único)
    const contentType = response.headers.get('Content-Type');
    const isZip = contentType?.includes('application/zip');
    
    // Obter nome do arquivo
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = isZip ? `EFD_${cnpjContribuinte}.zip` : `EFD_${cnpjContribuinte}.txt`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match?.[1]) filename = match[1].replace(/['"]/g, '');
    }
    
    // Verificar headers de contagem (para ZIPs)
    const filesFound = response.headers.get('X-Files-Found');
    const filesMissing = response.headers.get('X-Files-Missing');
    
    // Download
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
    // Mensagem de sucesso
    let description = `Arquivo ${filename} baixado com sucesso.`;
    if (filesFound) {
      description = `${filesFound} arquivo(s) baixado(s)${filesMissing ? `, ${filesMissing} não encontrado(s)` : ''}.`;
    }
    
    toast({ title: 'Download concluído', description });
  } catch (error) {
    console.error('Erro ao baixar todos:', error);
    toast({
      title: 'Erro no download',
      description: error instanceof Error ? error.message : 'Não foi possível baixar os arquivos.',
      variant: 'destructive',
    });
  } finally {
    setDownloadingAll(false);
  }
};
```

#### 3. Adicionar botão "Baixar Todos" no header da tabela

No header da tabela (oposto ao campo CNPJ), adicionar:

```tsx
{/* Header com CNPJ e Botão Baixar Todos */}
{overview?.cnpj && (
  <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
    {/* Lado Esquerdo - CNPJ */}
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
        <Building2 className="h-5 w-5 text-primary" />
        CNPJ: <span className="text-slate-900 dark:text-white">{formatCNPJ(overview.cnpj)}</span>
      </div>
      <Button 
        variant="ghost" 
        size="icon"
        className="h-8 w-8"
        onClick={() => refetchOverview()}
        disabled={loadingOverview}
      >
        {loadingOverview ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
      </Button>
    </div>
    
    {/* Lado Direito - Baixar Todos */}
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline"
            size="sm"
            onClick={handleDownloadAll}
            disabled={downloadingAll || !overview?.arquivos?.length}
            className="text-slate-600 hover:text-primary"
          >
            {downloadingAll ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Baixar Todos
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Download de todos os arquivos TXT (ZIP)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
)}
```

#### 4. Importar ícone `DownloadCloud` (opcional)

Pode usar `DownloadCloud` para o botão "Baixar Todos" para diferenciar do download individual.

---

## Resumo de Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/equipe/dev/ConsultaEFD.tsx` | Corrigir tratamento de erro + Adicionar botão "Baixar Todos" |

### Pontos Importantes

1. **Download Individual:** Usa `GET /arquivo/{id_arquivo}` - já implementado
2. **Download em Lote:** Usa `GET /{cnpj}?data_inicio=X&data_fim=Y` - a ser implementado
3. **Erro 404:** É um problema de dados no backend (arquivo não encontrado no storage) - o frontend mostrará a mensagem correta após a correção
4. **PIS/COFINS Zerados:** São dados reais da API - empresas de transporte tipicamente têm mais créditos que débitos
