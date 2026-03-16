

# Plano: Migrar exportação DIFAL para polling com URL assinada

## Contexto

A exportação DIFAL atual (`handleExportExcel` em `AuditoriaFiscal.tsx`, linhas 483-556) faz download direto do blob na resposta do POST. O endpoint mudou para o padrão assíncrono com polling (igual ao EFD), onde:

1. POST inicia o job e retorna `job_id` (ou `status: completed` + `url` em cache hit)
2. GET no status endpoint faz polling até `completed` com `download_url`/`url`

## Endpoints

- **Iniciar:** `POST /api/v1/ncm/calculo-difal/exportar/{contribuinte_id}` com body `{ data_inicio, data_fim }`
- **Status:** `GET /api/v1/ncm/calculo-difal/exportar/status/{job_id}`

## Alterações em `src/pages/equipe/dev/AuditoriaFiscal.tsx`

### 1. Adicionar estados e refs para polling

```typescript
const [exportStatus, setExportStatus] = useState<'idle' | 'starting' | 'processing' | 'completed' | 'error'>('idle');
const [exportMessage, setExportMessage] = useState('');
const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
const abortRef = useRef<AbortController | null>(null);
```

Remover o antigo `isExporting` e derivá-lo: `const isExporting = exportStatus === 'starting' || exportStatus === 'processing';`

### 2. Adicionar `useRef` ao import (linha 1)

### 3. Reescrever `handleExportExcel` (linhas 503-555)

Seguir o mesmo padrão do `EFDExportDialog`:
- POST para iniciar → se `status === 'completed'` + `url`, download direto via `window.location.href`
- Senão, extrair `job_id`, iniciar polling a cada 2s no endpoint de status
- No polling: se `completed` + `download_url`/`url` → `window.location.href`; se `failed` → toast de erro
- Cleanup do interval e abort controller

### 4. Adicionar cleanup no `useEffect` de unmount

Limpar polling interval e abort controller ao desmontar o componente.

### 5. Atualizar UI do botão (linhas 940-951)

Ajustar label para refletir os estados (`Iniciando...`, `Processando...`, `Exportar Excel`).

| Ação | Arquivo |
|------|---------|
| Editar | `src/pages/equipe/dev/AuditoriaFiscal.tsx` |

