

## Plano: Modal Centralizado com Modos Leitura/Edição

### Arquivo: `src/components/equipe/dev/pis-cofins/RegraFormSheet.tsx` → Renomear para `RegraDetailModal.tsx`

Substituir o `Sheet` lateral por um `Dialog` centralizado com dois modos internos.

**Novo prop**: `mode: 'view' | 'edit' | 'create'` controlado externamente, com callback `onModeChange`.

**Modo Leitura (view)** — aberto por padrão ao clicar na linha ou no ícone de olho:
- Campos exibidos como texto estático (labels + valores em `<span>`) sem inputs
- Layout em grid 2 colunas para dados principais (NCM, CST PIS, CST COFINS, Crédito)
- Campos longos (Descrição, Base Legal, Observações) em largura total
- Botão "Editar" no footer que chama `onModeChange('edit')`
- Botão "Fechar" outline

**Modo Edição (edit/create)** — ativado pelo botão "Editar" interno ou pelo "Nova Regra":
- Formulário atual com inputs, validação Zod, submit
- Botão "Cancelar" volta para modo leitura (se editando) ou fecha (se criando)

**DialogContent**: `max-w-2xl` centralizado, `max-h-[85vh] overflow-y-auto`

### Arquivo: `src/pages/equipe/dev/MapaNCMPisCofins.tsx`

**Estado**: Substituir `sheetOpen` + `editingRegra` por:
- `selectedRegra: RegraNCMRow | null` — regra selecionada para visualizar
- `modalMode: 'view' | 'edit' | 'create' | null` — controla abertura e modo

**Linha clicável**: Adicionar `onClick` no `TableRow` que seta `selectedRegra` e `modalMode = 'view'`. Usar `cursor-pointer`.

**Ícone**: Trocar `Pencil` → `Eye` (lucide `Eye`) no botão de ações. O `onClick` do botão abre em modo `view`.

**Botão excluir**: Já existe `AlertDialog` de confirmação — confirmado, nenhuma alteração necessária.

**Botão "Nova Regra"**: Seta `selectedRegra = null` e `modalMode = 'create'`.

**Propagação de clique**: No botão de ações (Eye e Trash), usar `e.stopPropagation()` para não disparar o onClick da linha.

### Resumo de impacto

| Arquivo | Alteração |
|---|---|
| `src/components/equipe/dev/pis-cofins/RegraFormSheet.tsx` | Reescrever: Sheet → Dialog, adicionar modo leitura, renomear internamente |
| `src/pages/equipe/dev/MapaNCMPisCofins.tsx` | Novo estado de modo, linha clicável, ícone Eye, stopPropagation nos botões |

