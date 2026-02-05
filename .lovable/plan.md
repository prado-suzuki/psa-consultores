
# Plano: Correcao do SOP e Navegacao de Projetos em Digital Rotina

## Resumo

Este plano resolve dois problemas identificados na area Digital Rotina:
1. Corrigir o erro "Page Not Found" ao acessar Projetos
2. Adicionar suporte para associar SOP ao processo via link externo ou documento anexado

---

## Problema 1: Navegacao Projetos - Page Not Found

### Diagnostico

O menu lateral em `EquipeLayout.tsx` tem um item "Projetos" que redireciona para `/equipe/projetos`. Porem, essa rota nao esta registrada no `App.tsx`. A pagina `EquipeProjetos.tsx` existe, mas nunca foi adicionada as rotas.

### Solucao

Adicionar a rota `/equipe/projetos` no `App.tsx`:

```text
// Em App.tsx, adicionar:
<Route path="/equipe/projetos" element={<TeamRoute><EquipeProjetos /></TeamRoute>} />
```

### Arquivos a Modificar

1. `src/App.tsx` - Adicionar rota para EquipeProjetos

---

## Problema 2: SOP Mapeado via Link ou Documento

### Situacao Atual

- O campo `formatted_content` na tabela `processes` armazena o conteudo Markdown do SOP
- O botao "SOP Mapeado" abre um modal (`SOPViewerModal`) que renderiza este Markdown
- Nao ha opcao para vincular um link externo ou documento anexado

### Solucao Proposta

Adicionar dois novos campos na tabela `processes`:
- `sop_link` (text) - URL externa para o SOP (Google Docs, Notion, SharePoint, etc.)
- `sop_document_path` (text) - Caminho do arquivo no storage

### Alteracoes de Banco de Dados

```sql
-- Adicionar campos para SOP via link ou documento
ALTER TABLE public.processes
ADD COLUMN IF NOT EXISTS sop_link text,
ADD COLUMN IF NOT EXISTS sop_document_path text;
```

### Interface do Usuario

Modificar a aba "Etapas" em `EquipeProcessos.tsx` para:

1. **Adicionar botao "Configurar SOP"** que abre um modal para definir a fonte do SOP:
   - Opcao 1: Link externo (input de URL)
   - Opcao 2: Upload de documento (file input)
   - Opcao 3: Conteudo formatado (ja existente, via `formatted_content`)

2. **Modificar o modal SOPViewerModal** para exibir:
   - Se `sop_link` preenchido: Mostrar link clicavel e botao para abrir em nova aba
   - Se `sop_document_path` preenchido: Mostrar nome do arquivo e botao de download
   - Se `formatted_content` preenchido: Renderizar o Markdown (comportamento atual)
   - Se nenhum: Mostrar mensagem de "Nenhum SOP documentado"

### Layout do Modal "Configurar SOP"

```text
+--------------------------------------------------+
|  Configurar SOP                              [X] |
+--------------------------------------------------+
|                                                  |
|  Como deseja associar o SOP a este processo?     |
|                                                  |
|  [Link Externo]  [Documento]  [Conteudo Texto]   |
|                                                  |
|  ------------------------------------------------|
|                                                  |
|  (Se Link Externo selecionado:)                  |
|  URL do SOP: [_________________________]         |
|  Ex: https://docs.google.com/document/d/...      |
|                                                  |
|  (Se Documento selecionado:)                     |
|  [Selecionar Arquivo] documento-sop.pdf          |
|                                                  |
|  ------------------------------------------------|
|  [Cancelar]                        [Salvar]      |
+--------------------------------------------------+
```

### Layout do SOPViewerModal Atualizado

```text
+--------------------------------------------------+
|  SOP Mapeado                                 [X] |
|  Nome do Processo                                |
+--------------------------------------------------+
|                                                  |
|  (Se link externo:)                              |
|  +----------------------------------------------+|
|  | Link externo para documentacao               ||
|  | https://docs.google.com/document/d/...       ||
|  |                                              ||
|  | [Abrir em nova aba]                          ||
|  +----------------------------------------------+|
|                                                  |
|  (Se documento:)                                 |
|  +----------------------------------------------+|
|  | Documento anexado                            ||
|  | sop-processo-fiscal.pdf (2.4 MB)             ||
|  |                                              ||
|  | [Baixar documento]                           ||
|  +----------------------------------------------+|
|                                                  |
|  (Se conteudo texto:)                            |
|  +----------------------------------------------+|
|  | [Conteudo Markdown renderizado...]           ||
|  +----------------------------------------------+|
+--------------------------------------------------+
```

---

## Secao Tecnica

### Estrutura de Storage

Criar bucket para documentos SOP (se nao existir):

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('sop-documents', 'sop-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Politica de leitura para membros da equipe
CREATE POLICY "Team members can read SOP documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'sop-documents');

-- Politica de upload para membros da equipe
CREATE POLICY "Team members can upload SOP documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'sop-documents');
```

### Componentes a Criar/Modificar

1. **SOPConfigModal.tsx** (novo componente)
   - Tabs para alternar entre Link, Documento, Texto
   - Input para URL
   - File input para upload
   - Textarea para conteudo texto
   - Logica de upload para storage

2. **SOPViewerModal.tsx** (modificar)
   - Aceitar novos props: `sopLink`, `sopDocumentPath`, `sopDocumentName`
   - Renderizar conforme o tipo de fonte

3. **EquipeProcessos.tsx** (modificar)
   - Adicionar estado e modal para configuracao de SOP
   - Passar novos campos para SOPViewerModal

### Interface do Process Atualizada

```typescript
interface Process {
  // ... campos existentes
  formatted_content?: string | null;
  sop_link?: string | null;
  sop_document_path?: string | null;
}
```

### Fluxo de Upload de Documento

```text
1. Usuario clica em "Configurar SOP" > seleciona "Documento"
2. Seleciona arquivo local
3. Ao salvar:
   a. Upload do arquivo para storage bucket 'sop-documents'
   b. Caminho gerado: sop-documents/{process_id}/{filename}
   c. Atualiza campo sop_document_path no banco
4. Na visualizacao:
   a. Busca URL assinada do storage
   b. Exibe nome do arquivo e botao de download
```

---

## Arquivos a Modificar

1. `src/App.tsx`
   - Adicionar rota /equipe/projetos

2. `src/pages/equipe/EquipeProcessos.tsx`
   - Adicionar botao "Configurar SOP"
   - Integrar SOPConfigModal
   - Atualizar props do SOPViewerModal

3. `src/components/equipe/SOPViewerModal.tsx`
   - Adicionar suporte para link externo e documento
   - Exibir conforme o tipo de fonte

## Arquivos a Criar

1. `src/components/equipe/SOPConfigModal.tsx`
   - Modal para configurar fonte do SOP (link, documento ou texto)

## Migracao de Banco de Dados

```sql
-- Adicionar colunas para SOP
ALTER TABLE public.processes
ADD COLUMN IF NOT EXISTS sop_link text,
ADD COLUMN IF NOT EXISTS sop_document_path text;

-- Criar bucket para documentos
INSERT INTO storage.buckets (id, name, public)
VALUES ('sop-documents', 'sop-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Politicas de storage
CREATE POLICY "Team members can read SOP documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'sop-documents');

CREATE POLICY "Team members can upload SOP documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'sop-documents');

CREATE POLICY "Team members can delete SOP documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'sop-documents');
```

---

## Dependencias

Componentes e pacotes ja disponiveis:
- Dialog, Tabs, Input, Button (shadcn/ui)
- Supabase storage client
- Lucide icons (Link, FileUp, FileText, ExternalLink, Download)
