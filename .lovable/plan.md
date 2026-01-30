

# Plano: Implementar Download em Lote de TXT na Ferramenta EFD ICMS

## Problema Identificado

Na ferramenta **EFD ICMS** (`ConsultaEFDICMS.tsx`), o botão "Baixar txt" para múltiplos arquivos está mostrando uma mensagem de "Funcionalidade em desenvolvimento" ao invés de realizar o download em lote.

O código atual (linhas 279-287):
```typescript
// Múltiplos arquivos - mostrar toast informativo (funcionalidade em desenvolvimento)
if (selectedArquivos.size > 1) {
  toast({
    title: "Funcionalidade em desenvolvimento",
    description: `O download em lote de ${selectedArquivos.size} arquivos ainda está sendo implementado...`,
    duration: 5000,
  });
  return;
}
```

## Endpoint Confirmado

```
GET /api/v1/query/download/efd/{tipo}/{cnpj}
```

**Parâmetros:**
- Path: `tipo` (contribuicoes|icms), `cnpj` (apenas dígitos)
- Query: `data_inicio` (opcional), `data_fim` (opcional)

**Respostas:**
- `text/plain` + Content-Disposition (1 arquivo)
- `application/zip` + Content-Disposition, X-Files-Found, X-Files-Missing (múltiplos)

## Solução

Implementar a função `handleDownloadAll` na ferramenta EFD ICMS, seguindo o mesmo padrão já existente na ferramenta EFD Contribuições (`ConsultaEFD.tsx`).

## Mudanças Técnicas

### 1. Adicionar Estado para Download em Lote

```typescript
// Após linha 43
const [downloadingAll, setDownloadingAll] = useState(false);
```

### 2. Implementar Função de Download em Lote

Adicionar a função `handleDownloadAll` (baseada na ConsultaEFD.tsx):

```typescript
// Handler para baixar todos os arquivos (ZIP)
const handleDownloadAll = async () => {
  if (!cnpjContribuinte) return;
  
  setDownloadingAll(true);
  
  try {
    // Montar URL com query params opcionais
    const url = new URL(getApiUrl(`/api/v1/query/download/efd/icms/${cnpjContribuinte}`));
    if (dataInicio) url.searchParams.set('data_inicio', dataInicio);
    if (dataFim) url.searchParams.set('data_fim', dataFim);
    
    // Usar timeout maior para downloads grandes (60s)
    const response = await fetchWithAuth(url.toString(), {}, 60000);
    
    if (!response.ok) {
      const contentType = response.headers.get('Content-Type');
      if (contentType?.includes('application/json')) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error_message || `Erro ${response.status}`);
      }
      throw new Error(`Erro ${response.status} ao baixar arquivos`);
    }
    
    // Verificar headers informativos
    const filesFound = response.headers.get('X-Files-Found');
    const filesMissing = response.headers.get('X-Files-Missing');
    
    // Obter nome do arquivo
    const contentDisposition = response.headers.get('Content-Disposition');
    const contentType = response.headers.get('Content-Type');
    const isZip = contentType?.includes('application/zip');
    
    let filename = isZip ? `EFD_ICMS_${cnpjContribuinte}.zip` : `EFD_ICMS_${cnpjContribuinte}.txt`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match?.[1]) filename = match[1].replace(/['"]/g, '');
    }
    
    // Download do blob
    const blob = await response.blob();
    
    if (blob.size === 0) {
      throw new Error('Arquivo vazio recebido do servidor');
    }
    
    // Criar link e download
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
    // Mensagem de sucesso com detalhes
    let description = `Arquivo ${filename} (${(blob.size / 1024).toFixed(1)} KB) baixado.`;
    if (filesFound && filesMissing && parseInt(filesMissing) > 0) {
      description = `${filesFound} arquivo(s) baixado(s), ${filesMissing} não encontrado(s) no storage.`;
    } else if (filesFound) {
      description = `${filesFound} arquivo(s) baixado(s) com sucesso.`;
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

### 3. Atualizar `handleDownloadSelecionados`

Modificar a função para chamar o download em lote quando houver múltiplos arquivos:

```typescript
const handleDownloadSelecionados = async () => {
  if (selectedArquivos.size === 0) {
    toast({
      title: "Nenhum arquivo selecionado",
      description: "Selecione ao menos um arquivo para baixar.",
      variant: "destructive",
    });
    return;
  }
  
  // Múltiplos arquivos - usar download em lote
  if (selectedArquivos.size > 1) {
    await handleDownloadAll();
    return;
  }
  
  // Se apenas 1 arquivo selecionado, baixar individualmente
  const arquivoSelecionado = arquivosFiltrados.find(a => selectedArquivos.has(a.ID_ARQUIVO));
  if (arquivoSelecionado) {
    await handleDownloadTxt(arquivoSelecionado);
  }
};
```

### 4. Atualizar Estado do Botão "Baixar txt"

Modificar o botão para mostrar loading durante o download em lote:

```typescript
<Button
  variant="outline"
  size="sm"
  onClick={handleDownloadSelecionados}
  disabled={downloadingTxt !== null || downloadingAll || selectedArquivos.size === 0}
  className="gap-2"
>
  {(downloadingTxt !== null || downloadingAll) ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <Download className="h-4 w-4" />
  )}
  Baixar txt
</Button>
```

## Arquivo a Modificar

| Arquivo | Alterações |
|---------|------------|
| `src/pages/equipe/dev/ConsultaEFDICMS.tsx` | Adicionar estado `downloadingAll`, implementar `handleDownloadAll`, atualizar `handleDownloadSelecionados` e estado do botão |

## Fluxo de Funcionamento

```text
┌─────────────────────────────────────────────────────────────┐
│ Usuário seleciona arquivos na tabela (checkboxes)          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Clica no botão "Baixar txt"                                 │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
    ┌─────────────────┐             ┌─────────────────┐
    │ 1 arquivo       │             │ 2+ arquivos     │
    │ selecionado     │             │ selecionados    │
    └────────┬────────┘             └────────┬────────┘
             │                               │
             ▼                               ▼
    ┌─────────────────┐             ┌─────────────────┐
    │handleDownloadTxt│             │handleDownloadAll│
    │(individual .txt)│             │(ZIP via API)    │
    └─────────────────┘             └─────────────────┘
```

## Considerações

1. **Filtro por período**: O download em lote usa os filtros de data do formulário, não os arquivos selecionados individualmente
2. **Filtro por filial**: O endpoint atual não suporta filtro por filial; baixará todos os arquivos do CNPJ no período
3. **Feedback visual**: O botão mostrará spinner durante o download
4. **Tratamento de erros**: Mensagens claras para o usuário em caso de falha

