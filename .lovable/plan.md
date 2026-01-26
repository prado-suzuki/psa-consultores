

# Diagnóstico Completo: Erros na Consulta EFD Contribuições

## Análise das Evidências

### 1. DOWNLOAD ÚNICO (TXT) - Erro 404

**Evidência do Log de Rede:**
```
Request: GET /api/v1/query/download/efd/contribuicoes/arquivo/fe2e27f7c3f8bffb
Status: 404
Response: {"error_code":"FILE_NOT_FOUND","error_message":"File not found: raw/Rodonutri/Rodonutri/2025/efd_contribuicoes/20260126173922_fe2e27f7c3f8bffb.txt"}
```

**Diagnóstico:**
- O frontend está fazendo a chamada CORRETA ao endpoint `/arquivo/{id_arquivo}` (sem CNPJ, conforme a documentação)
- O backend responde 404 porque o arquivo TXT original não existe no storage (problema de dados/backend)
- O código frontend está tratando o erro corretamente (mostra a mensagem `error_message`)

**Conclusão:** Não há bug no frontend. O arquivo simplesmente não existe no storage do backend.

---

### 2. DOWNLOAD MÚLTIPLO (ZIP) - Arquivo Corrompido

**Evidência do Log de Rede:**
```
Request: GET /api/v1/query/download/efd/contribuicoes/52102040000148
Status: 200
Response Body: PK (...) [dados binários do ZIP]
```

**Diagnóstico:**
O problema é que quando fazemos `response.json()` em um erro ou `response.blob()` para download, o browser pode estar interpretando incorretamente a resposta binária. Analisando o código:

```typescript
// Linha 214-216
if (!response.ok) {
  const errorData = await response.json().catch(() => ({}));
  throw new Error(errorData.error_message || 'Erro ao baixar arquivos');
}
```

O problema pode estar em duas áreas:
1. **Tipo de conteúdo:** O frontend não está verificando se a resposta é realmente um ZIP válido antes de processar
2. **Timeout/Tamanho:** O `fetchWithAuth` tem timeout de 30s que pode interromper downloads grandes

Contudo, a evidência mostra status 200 e dados binários de ZIP (`PK...`), o que sugere que o download está funcionando. Se o arquivo está "quebrado", pode ser:
- O backend está enviando um ZIP parcialmente válido (com arquivos que não existem)
- A função `response.blob()` pode estar truncando o arquivo

**Solução a investigar:** Adicionar verificação do tamanho do arquivo e dos headers `X-Files-Found` e `X-Files-Missing`.

---

### 3. PIS e COFINS ZERADOS (ou vazios)

**Evidência do Log de Rede - Resposta da API:**
```json
{
  "arquivos": [
    {
      "pis_devido": "0",
      "cofins_devido": null,
      "credito_pis": "3535.62",
      "credito_cofins": null
    }
  ]
}
```

**Diagnóstico:**
- A API retorna `pis_devido: "0"` (string "0") e `cofins_devido: null` (nulo)
- O código atual chama `formatCurrency(arquivo.pis_devido)` e `formatCurrency(arquivo.cofins_devido)`
- A função `formatCurrency` converte para número e formata:

```typescript
const formatCurrency = (value: string | number) => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numValue || 0);
};
```

**O que acontece:**
- `parseFloat("0")` = 0 → exibe "R$ 0,00" ✓
- `parseFloat(null)` = NaN → `NaN || 0` = 0 → exibe "R$ 0,00" ✓

**Mas visualmente aparece vazio?** Não deveria! O código está correto.

**Investigação adicional:** O problema pode estar na renderização. Analisando:
```tsx
<td className="... text-right font-mono">
  {formatCurrency(arquivo.pis_devido)}
</td>
```

Se `cofins_devido` é `null`, a interface TypeScript espera `string`, mas a API retorna `null`. Isso não causa erro de runtime, mas pode causar comportamento inesperado.

**Bug identificado:** O tipo `EFDArquivo` define `cofins_devido: string`, mas a API retorna `null`:
```typescript
// efd.ts - Tipo atual
cofins_devido: string;  // ERRADO - API pode retornar null

// Deveria ser:
cofins_devido: string | null;
```

---

### 4. MODAL EXPORTAR EXCEL NÃO ABRE

**Análise do código:**
```tsx
// ConsultaEFD.tsx - linha 609-612
<EFDExportDialog
  arquivo={arquivo}
  blocosDisponiveis={blocosDisponiveis}
/>
```

```tsx
// EFDExportDialog.tsx - linha 251-267
<DialogTrigger asChild>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button 
        variant="outline" 
        size="icon"
        disabled={disabled || blocos.length === 0}
        // ...
      >
```

**O problema:** O componente usa `blocos.length === 0` para desabilitar. Analisando:
```typescript
const blocos = Object.keys(blocosDisponiveis);
```

**Mas** o `blocosDisponiveis` passado pelo `ConsultaEFD` vem de:
```typescript
const blocosDisponiveis = overview?.blocos_disponiveis || {};
```

E o `overview.blocos_disponiveis` existe e tem dados (confirmado nos logs de rede). Então o botão **não deveria estar desabilitado**.

**Possível causa:** O `DialogTrigger` está aninhado dentro de `Tooltip` e `TooltipTrigger`, e a prop `asChild` pode estar causando conflito quando ambos tentam renderizar o mesmo elemento filho.

**Bug identificado:** O aninhamento `DialogTrigger > Tooltip > TooltipTrigger > Button` pode estar quebrando o evento de clique porque `asChild` compõe os elementos de forma que pode conflitar.

---

## Plano de Correções

### Arquivo: `src/types/efd.ts`

**Correção 1:** Atualizar tipos para refletir campos nullable

```typescript
export interface EFDArquivo {
  // ... outros campos
  pis_devido: string | null;    // API pode retornar null
  cofins_devido: string | null; // API pode retornar null
  credito_pis: string | null;   // API pode retornar null
  credito_cofins: string | null; // API pode retornar null
}
```

---

### Arquivo: `src/pages/equipe/dev/ConsultaEFD.tsx`

**Correção 2:** Melhorar função formatCurrency para lidar com null

```typescript
const formatCurrency = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === '') {
    return '—'; // Retorna traço para valores nulos/vazios
  }
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) {
    return '—';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numValue);
};
```

**Correção 3:** Melhorar handleDownloadAll com logging e verificação

```typescript
const handleDownloadAll = async () => {
  if (!cnpjContribuinte) return;
  
  setDownloadingAll(true);
  
  try {
    const url = new URL(getApiUrl(`/api/v1/query/download/efd/contribuicoes/${cnpjContribuinte}`));
    if (dataInicio) url.searchParams.set('data_inicio', dataInicio);
    if (dataFim) url.searchParams.set('data_fim', dataFim);
    
    // Usar timeout maior para downloads grandes (60s)
    const response = await fetchWithAuth(url.toString(), {}, 60000);
    
    if (!response.ok) {
      const contentType = response.headers.get('Content-Type');
      // Se o erro for JSON, ler a mensagem
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
    
    let filename = isZip ? `EFD_${cnpjContribuinte}.zip` : `EFD_${cnpjContribuinte}.txt`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match?.[1]) filename = match[1].replace(/['"]/g, '');
    }
    
    // Download do blob
    const blob = await response.blob();
    
    // Verificar se o blob tem conteúdo
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

---

### Arquivo: `src/components/equipe/dev/EFDExportDialog.tsx`

**Correção 4:** Corrigir aninhamento do DialogTrigger com Tooltip

O problema está no aninhamento incorreto de `DialogTrigger > Tooltip > TooltipTrigger > Button`. A solução é usar `TooltipProvider` externamente e estruturar corretamente:

```tsx
// ANTES (problemático):
<DialogTrigger asChild>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button>...</Button>
    </TooltipTrigger>
    <TooltipContent>...</TooltipContent>
  </Tooltip>
</DialogTrigger>

// DEPOIS (correto):
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <DialogTrigger asChild>
        <Button>...</Button>
      </DialogTrigger>
    </TooltipTrigger>
    <TooltipContent>...</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

**Código corrigido:**
```tsx
import { TooltipProvider } from '@/components/ui/tooltip';

// ... dentro do return
<Dialog open={open} onOpenChange={setOpen}>
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="icon"
            disabled={disabled || blocos.length === 0}
            className="h-9 w-9 text-emerald-600 hover:text-emerald-800 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <FileDown className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      </TooltipTrigger>
      <TooltipContent>
        <p>Exportar Excel</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
  <DialogContent>...</DialogContent>
</Dialog>
```

---

## Resumo das Alterações

| Arquivo | Alteração | Problema Resolvido |
|---------|-----------|-------------------|
| `src/types/efd.ts` | Tipos nullable para campos de tributos | PIS/COFINS aparecerem vazios |
| `src/pages/equipe/dev/ConsultaEFD.tsx` | Função `formatCurrency` robusta | Valores null/undefined |
| `src/pages/equipe/dev/ConsultaEFD.tsx` | Melhorar `handleDownloadAll` | ZIP corrompido, melhor feedback |
| `src/components/equipe/dev/EFDExportDialog.tsx` | Corrigir aninhamento Tooltip/Dialog | Modal não abre |

---

## Notas Importantes

1. **Download Individual 404:** Este é um problema de backend - o arquivo TXT não existe no storage. O frontend já trata corretamente o erro.

2. **ZIP Corrompido:** Se após as correções o ZIP ainda estiver corrompido, o problema é do backend que está gerando o ZIP com arquivos faltantes. O header `X-Files-Missing` deve indicar isso.

3. **Valores Zero vs Null:** Para este cliente específico (empresa de transporte), `pis_devido: "0"` e `cofins_devido: null` são dados reais - empresas de transporte no regime não-cumulativo tipicamente têm mais créditos que débitos. O frontend deve exibir "R$ 0,00" para zero e "—" para null.

