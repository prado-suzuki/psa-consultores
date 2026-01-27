

# Plano: Corrigir Download do Excel no EFD Contribuições

## Diagnóstico do Problema

O download não está funcionando porque:

1. **Perda do "user gesture"**: O `a.click()` acontece dentro de um callback assíncrono do polling, fora da cadeia de eventos do clique original do usuário. Isso faz o navegador bloquear como popup.

2. **Atributo `download` ignorado**: Para URLs cross-origin (Google Cloud Storage), o navegador ignora o atributo `download` e apenas navega para a URL.

3. **`target="_blank"` problemático**: Combinado com os pontos acima, pode abrir uma aba que fecha rapidamente sem baixar o arquivo.

---

## Solução Proposta

Modificar a abordagem de download para usar `window.location.href` para forçar o download, ou usar uma abordagem de "botão de download" após a conclusão.

### Opção A: Download Direto via location.href (Recomendada)

Quando o job completa, definir `window.location.href` diretamente para a URL assinada. O GCS vai retornar o arquivo com headers de download.

```typescript
// Substituir o bloco de download atual por:
window.location.href = downloadUrl;
```

### Opção B: Abrir em Nova Aba (Alternativa)

Usar `window.open()` que é mais confiável para abrir URLs externas:

```typescript
window.open(downloadUrl, '_blank');
```

---

## Alterações no Código

**Arquivo:** `src/components/equipe/dev/EFDExportDialog.tsx`

### 1. Cache Hit (linhas 276-284)

**Antes:**
```typescript
const a = document.createElement('a');
a.href = startData.url;
a.download = `EFD_${arquivo.NOME}_${new Date().toISOString().split('T')[0]}.xlsx`;
a.target = '_blank';
a.rel = 'noopener noreferrer';
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
```

**Depois:**
```typescript
// Download direto via location.href - funciona com URLs assinadas do GCS
window.location.href = startData.url;
```

### 2. Polling Completion (linhas 332-340)

**Antes:**
```typescript
const a = document.createElement('a');
a.href = downloadUrl;
a.download = `EFD_${arquivo.NOME}_${new Date().toISOString().split('T')[0]}.xlsx`;
a.target = '_blank';
a.rel = 'noopener noreferrer';
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
```

**Depois:**
```typescript
// Download direto via location.href - funciona com URLs assinadas do GCS
window.location.href = downloadUrl;
```

---

## Por Que Isso Funciona

1. **`window.location.href`** não é bloqueado como popup pois não abre nova aba
2. A URL assinada do GCS já contém os headers necessários para download (`Content-Disposition: attachment`)
3. A navegação para uma URL de arquivo binário (xlsx) automaticamente inicia o download sem sair da página atual

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/equipe/dev/EFDExportDialog.tsx` | Substituir criação de tag `<a>` por `window.location.href` em dois locais |

---

## Comportamento Esperado Após a Correção

1. Usuário seleciona registros e clica em "Exportar"
2. Sistema mostra "Gerando arquivo..."
3. Quando o job completa, o arquivo começa a baixar automaticamente
4. Modal fecha após 1 segundo
5. Toast de sucesso é exibido

