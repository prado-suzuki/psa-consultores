

## Plano: SOP Antes/Depois + Correção de Sobrescrita

### Problemas identificados

1. **Sobrescrita destrutiva**: O `handleSave` inicializa `sop_link`, `sop_document_path` e `formatted_content` como `null` e só preenche o campo da aba ativa. Salvar um link apaga documento e texto, e vice-versa.
2. **Falta de comparação**: Não existe conceito de "como era" vs "como ficou" no processo.

### Solução

Reestruturar o SOP em duas seções — **"Como era"** (antes) e **"Como ficou"** (depois) — e permitir que link, documento e texto coexistam dentro de cada seção.

### 1. Migração de banco (`processes`)

Adicionar 3 colunas para o SOP "antes":

```sql
ALTER TABLE processes ADD COLUMN sop_before_link text;
ALTER TABLE processes ADD COLUMN sop_before_document_path text;
ALTER TABLE processes ADD COLUMN sop_before_content text;
```

Os campos existentes (`sop_link`, `sop_document_path`, `formatted_content`) passam a representar o estado "Como ficou".

### 2. `SOPConfigModal.tsx` — Reestrutura completa

- **Layout**: Substituir as Tabs (Link/Documento/Texto) por duas seções verticais: **"Como era"** e **"Como ficou"**, cada uma com 3 campos opcionais (link, upload de documento, texto markdown) visíveis simultaneamente (sem tabs).
- **Estado**: Adicionar states para `beforeLink`, `beforeFile`, `beforeContent` além dos existentes.
- **Lógica de save**: Construir o objeto de update preservando todos os campos. Cada campo é salvo independentemente — se o usuário preencheu link E texto em "Como ficou", ambos são persistidos.
- **Props**: Receber novas props `currentBeforeLink`, `currentBeforeDocumentPath`, `currentBeforeContent`.

### 3. `SOPViewerModal.tsx` — Exibição antes/depois

- **Layout**: Duas seções lado a lado (ou empilhadas em mobile): "Como era" à esquerda, "Como ficou" à direita.
- Cada seção exibe todos os tipos de conteúdo que foram preenchidos (link + documento + texto podem aparecer juntos).
- Se uma seção não tiver nada, mostrar mensagem "Nenhuma documentação registrada".
- **Props**: Receber novas props `beforeLink`, `beforeDocumentPath`, `beforeContent`.

### 4. `EquipeProcessos.tsx` — Wiring

- Atualizar a interface `Process` com os 3 novos campos.
- Passar os novos campos para `SOPConfigModal` e `SOPViewerModal`.

### Arquivos alterados

| Arquivo | Alteração |
|---|---|
| Migração SQL | 3 novas colunas `sop_before_*` em `processes` |
| `SOPConfigModal.tsx` | Duas seções (antes/depois), campos independentes, save não-destrutivo |
| `SOPViewerModal.tsx` | Visualização antes/depois lado a lado |
| `EquipeProcessos.tsx` | Novos campos na interface e props |

