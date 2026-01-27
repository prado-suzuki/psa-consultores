
# Correção: Polling de Exportação EFD

## Problema Identificado

O código de polling (linha 318) verifica `status.download_url`, mas a API retorna a URL no campo `url`:

**Resposta da API (completed):**
```json
{
  "job_id": "8957d529-91cd-4870-80be-dcd074c5fef5",
  "status": "completed",
  "url": "https://storage.googleapis.com/...",  // ← Campo correto
  "url_expires_at": "2026-01-27T15:51:50.641214+00:00",
  ...
}
```

**Código atual (linha 318):**
```typescript
if (status.status === 'completed' && status.download_url) {  // ← Campo errado!
```

---

## Alterações Necessárias

### Arquivo: `src/components/equipe/dev/EFDExportDialog.tsx`

#### 1. Atualizar Interface JobStatus (linha 37-42)

Adicionar o campo `url` que a API realmente retorna:

```typescript
interface JobStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  download_url?: string;
  url?: string;          // ← Campo da API real
  error?: string;
  progress?: number;
}
```

#### 2. Corrigir Verificação no Polling (linha 318)

Usar o campo correto (`url`) com fallback para `download_url`:

```typescript
// Antes
if (status.status === 'completed' && status.download_url) {

// Depois
const downloadUrl = status.download_url || status.url;
if (status.status === 'completed' && downloadUrl) {
```

#### 3. Atualizar Uso da URL no Download (linha 330)

```typescript
// Antes
a.href = status.download_url;

// Depois
a.href = downloadUrl;
```

---

## Resumo das Mudanças

| Local | Antes | Depois |
|-------|-------|--------|
| Interface `JobStatus` | Apenas `download_url` | Adiciona `url` |
| Verificação (linha 318) | `status.download_url` | `downloadUrl` (com fallback) |
| Download (linha 330) | `status.download_url` | `downloadUrl` |

---

## Seção Técnica

### Código Corrigido (linhas 37-42)

```typescript
interface JobStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  download_url?: string;
  url?: string;
  error?: string;
  progress?: number;
}
```

### Código Corrigido (linhas 316-336)

```typescript
if (!status || signal.aborted) return;

// Aceitar tanto 'url' quanto 'download_url' da API
const downloadUrl = status.download_url || status.url;

if (status.status === 'completed' && downloadUrl) {
  // Job concluído - fazer download
  if (pollingIntervalRef.current) {
    clearInterval(pollingIntervalRef.current);
    pollingIntervalRef.current = null;
  }

  setExportStatus('completed');
  setStatusMessage('Download pronto!');

  // Fazer download via link direto (evita CORS do GCS)
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `EFD_${arquivo.NOME}_${new Date().toISOString().split('T')[0]}.xlsx`;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // ...resto igual
}
```

Esta correção alinha o código com a resposta real da API, resolvendo o problema de polling infinito em exports novos (cache miss).
