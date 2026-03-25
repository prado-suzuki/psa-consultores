

## Três melhorias nos Procedimentos

### 1. Excluir procedimento

**Hook** (`useProcedimentos.ts`): Adicionar `useDeleteProcedimento()` que faz `supabase.from('procedimentos').delete().eq('id', id)` + deleta o arquivo do storage se `arquivo_path` existir + `logAction` com action `'deleted'`.

**Card** (`ProcedimentoCard.tsx`): Adicionar botão de lixeira (ícone `Trash2`) no footer do card, visível apenas para `isLeaderOrAdmin`. Ao clicar, abre `AlertDialog` de confirmação antes de executar a exclusão.

**Página** (`ProcedimentosDev.tsx`): Passar callback `onDelete` para o card e conectar à mutation.

### 2. Arquivo anexado disponível para abrir/baixar

Atualmente, o botão "Abrir documento" só aparece quando `source_url` existe. Para arquivos (PDF/DOCX) uploaded via storage, o botão não aparece.

**Card** (`ProcedimentoCard.tsx`): Quando `arquivo_path` existe e `source_url` é null, gerar URL assinada via `supabase.storage.from('sop-documents').createSignedUrl(arquivo_path, 3600)` e exibir botão "Baixar documento" (ícone `Download`). O botão ficará no mesmo local do "Abrir documento", cobrindo ambos os cenários.

**ReviewModal** (`ReviewProcedimentoModal.tsx`): Adicionar link para abrir/baixar o documento fonte na seção de preview.

### 3. Gerar imagem de capa com IA

**Migration SQL**: Adicionar coluna `ai_cover_url text` na tabela `procedimentos`.

**Edge Function** (`processar-procedimento/index.ts`): Após a análise de texto bem-sucedida (Step 2), adicionar Step 3 que gera uma imagem de capa usando o modelo `google/gemini-3.1-flash-image-preview`:
- Prompt baseado no título e processos retornados pela IA (ex: "Create a professional cover illustration for a tax procedure about: {titulo}. Style: clean, modern, flat illustration with blue/teal tones.")
- Upload da imagem gerada para o bucket `sop-documents` no path `procedimentos/covers/{id}.png`
- Salvar o `arquivo_path` da capa no campo `ai_cover_url`

**Hook** (`useProcedimentos.ts`): Adicionar `ai_cover_url` na interface `Procedimento`.

**Card** (`ProcedimentoCard.tsx`): Renderizar a imagem de capa no topo do card (antes dos chips de processo), com aspect-ratio fixo e `object-cover`. Se não existir, manter o layout atual sem imagem.

### Arquivos afetados

| Ação | Arquivo |
|------|---------|
| Migration | Nova migration (ADD COLUMN `ai_cover_url`) |
| Editar | `supabase/functions/processar-procedimento/index.ts` |
| Editar | `src/hooks/useProcedimentos.ts` |
| Editar | `src/components/equipe/dev/procedimentos/ProcedimentoCard.tsx` |
| Editar | `src/components/equipe/dev/procedimentos/ReviewProcedimentoModal.tsx` |
| Editar | `src/pages/equipe/dev/ProcedimentosDev.tsx` |

