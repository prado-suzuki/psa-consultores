

## Biblioteca de Procedimentos — Módulo Dev

### Resumo
Adicionar aba "Procedimentos" no sidebar Dev com biblioteca de procedimentos técnicos gerados por IA a partir de links ou uploads de documentos. Inclui tabela no banco, Edge Function com Lovable AI, página de listagem com cards, modal de adição e modal de revisão/confirmação.

### 1. Migration SQL

Criar tabela `procedimentos` com os campos descritos (id, source_url, source_type, arquivo_path, processos_associados, ai_titulo, ai_resumo, ai_etapas, ai_complexidade, ai_tags, status_geracao, status_publicacao, erro_mensagem, confirmado_por, confirmado_em, created_by, updated_at, created_at).

RLS com 4 políticas usando `has_role`:
- **SELECT**: roles `team_member`, `admin`, `lider`, `sublider` (membros veem apenas `status_publicacao = 'ativo'` com `confirmado_por IS NOT NULL`, líderes/admins veem tudo)
- **INSERT**: `admin`, `lider`
- **UPDATE**: `admin`, `lider`
- **DELETE**: `admin`, `lider`

Trigger `update_updated_at_column` na tabela.

**Nota**: As políticas de CHECK propostas no pedido usam `auth.role() = 'authenticated'` que é muito permissivo. Vou usar `has_role()` seguindo o padrão do sistema para restringir corretamente por papel.

### 2. Edge Function — `processar-procedimento`

**Arquivo**: `supabase/functions/processar-procedimento/index.ts`

Fluxo:
1. Recebe `{ id }` no body
2. Busca o registro em `procedimentos` via service role client
3. Extrai conteúdo:
   - `link`: fetch da URL e extração de texto
   - `pdf`/`docx`: download do storage via `arquivo_path`
4. Chama Lovable AI Gateway (`google/gemini-3-flash-preview`) com o prompt de sistema descrito
5. Parseia o JSON retornado e atualiza o registro com `ai_titulo`, `ai_resumo`, `ai_etapas`, `ai_complexidade`, `ai_tags`, `processos_associados`, `status_geracao = 'gerado'`
6. Em caso de erro: `status_geracao = 'erro'` + `erro_mensagem`

**Config**: Adicionar bloco `[functions.processar-procedimento]` em `supabase/config.toml` com `verify_jwt = false`.

### 3. Hook — `useProcedimentos.ts`

**Arquivo**: `src/hooks/useProcedimentos.ts`

Encapsula todas as operações CRUD + invocação da Edge Function:
- `useProcedimentosList()` — query com filtros
- `useCreateProcedimento()` — mutation INSERT + invoca Edge Function + audit log
- `useUpdateProcedimento()` — mutation UPDATE + audit log
- `useRetryProcedimento(id)` — reinvoca a Edge Function
- `useConfirmProcedimento()` — atualiza `confirmado_por`, `confirmado_em`, `status_publicacao`
- Upload de arquivo para bucket `sop-documents` (reutiliza bucket existente)

### 4. Sidebar Dev — `DevLayout.tsx`

Adicionar item `{ icon: BookOpen, label: "Procedimentos", path: "/equipe/dev/procedimentos" }` no array `navItemsAfterSped`, antes de "Gerenciar dados". Usar ícone `ClipboardList` (para não conflitar com `BookOpen` já usado em Consulta SPED).

### 5. Rota — `App.tsx`

Adicionar rota:
```
/equipe/dev/procedimentos → TeamRoute > PageAccessGate > ProcedimentosDev
```

### 6. Registro em `protectedPages.ts`

Adicionar entrada para `/equipe/dev/procedimentos` com category `dev`.

### 7. Página Principal — `ProcedimentosDev.tsx`

**Arquivo**: `src/pages/equipe/dev/ProcedimentosDev.tsx`

- Usa `DevLayout` como wrapper
- Header: "Biblioteca de Procedimentos" + botão "Adicionar procedimento" (visível só para admin/lider)
- Filtros: busca textual, dropdown processo, toggle complexidade, filtro status publicação (admin/lider only)
- Grid responsivo de cards (3/2/1 colunas)
- Cards com 3 estados visuais: normal, processando (skeleton), erro (fundo vermelho)
- Cards não confirmados: borda tracejada âmbar + badge (visível admin/lider)
- Polling a cada 3s para cards em estado `processando`

### 8. Modal de Adição — `AddProcedimentoModal.tsx`

**Arquivo**: `src/components/equipe/dev/procedimentos/AddProcedimentoModal.tsx`

- Toggle link/upload
- Campo URL ou dropzone PDF/DOCX (10MB)
- Checkboxes opcionais dos 9 processos
- Ao submeter: cria registro → invoca Edge Function → fecha modal

### 9. Modal de Revisão — `ReviewProcedimentoModal.tsx`

**Arquivo**: `src/components/equipe/dev/procedimentos/ReviewProcedimentoModal.tsx`

- Duas colunas: preview (40%) + formulário editável (60%)
- Campos: título, resumo (300 chars), etapas (lista editável), processos (checkboxes), complexidade (radio), tags (chips)
- Ações: Confirmar e publicar, Solicitar regeneração, Preencher manualmente, Cancelar

### 10. Card Component — `ProcedimentoCard.tsx`

**Arquivo**: `src/components/equipe/dev/procedimentos/ProcedimentoCard.tsx`

- Chips de processo com cores fixas conforme spec
- Título (2 linhas max), resumo (3 linhas), etapas (3 visíveis + "N mais")
- Footer: complexidade colorida, tags, data relativa, botão "Abrir documento"
- Estados: processando (skeleton), erro (fundo vermelho + retry), aguardando confirmação (borda âmbar)

### Arquivos afetados (resumo)

| Ação | Arquivo |
|------|---------|
| Novo | `src/pages/equipe/dev/ProcedimentosDev.tsx` |
| Novo | `src/hooks/useProcedimentos.ts` |
| Novo | `src/components/equipe/dev/procedimentos/AddProcedimentoModal.tsx` |
| Novo | `src/components/equipe/dev/procedimentos/ReviewProcedimentoModal.tsx` |
| Novo | `src/components/equipe/dev/procedimentos/ProcedimentoCard.tsx` |
| Novo | `supabase/functions/processar-procedimento/index.ts` |
| Novo | Migration SQL |
| Editar | `src/components/equipe/dev/DevLayout.tsx` (1 item no sidebar) |
| Editar | `src/App.tsx` (1 rota) |
| Editar | `src/config/protectedPages.ts` (1 entrada) |
| Editar | `supabase/config.toml` (1 bloco) |

### O que NÃO muda
- Nenhuma aba, rota ou componente existente é alterado
- Nenhuma tabela existente é modificada
- Buckets de storage existentes reutilizados (`sop-documents`)

