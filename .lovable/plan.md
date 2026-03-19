

## Plano: 4a Sub-aba "Produto × Serviço" no CadastroCategorias

### Contexto
A tabela `produto_servico` já existe e está tipada em `types.ts` (colunas: `id`, `produto_segmento_id`, `servico_prestado_id`). Não há interface de gerenciamento no frontend.

### Conformidade AI_CONTEXT.md
- Zero chamadas Supabase em componentes — tudo via hooks
- Exclusão via `AlertDialog` — nunca `confirm()`
- Audit log obrigatório dentro dos hooks (não no componente)
- Componente em arquivo separado, PascalCase
- Tabela `produto_servico` está tipada — sem necessidade de `as any`

---

### Arquivos e alterações

| Arquivo | Tipo | Alteração |
|---|---|---|
| `src/hooks/useCategorias.ts` | Editar | 3 novos hooks + interface |
| `src/components/equipe/ProdutoServicoTab.tsx` | **Criar** | Componente da sub-aba |
| `src/components/equipe/CadastroCategorias.tsx` | Editar | Importar + adicionar 4a tab |

---

### 1. Hooks (`useCategorias.ts`)

**Interface local:**
```ts
interface ProdutoServico {
  id: string;
  produto_segmento_id: string;
  servico_prestado_id: string;
  produto_segmento: { codigo: string; nome: string } | null;
  servicos_prestados: { nome: string } | null;
}
```

**`useProdutoServicoList()`** — `useQuery` com select `id, produto_segmento_id, servico_prestado_id, produto_segmento(codigo, nome), servicos_prestados(nome)`, queryKey `['produto_servico']`

**`useProdutoServicoSave()`** — insert de `{ produto_segmento_id, servico_prestado_id }` + `logAction` com `entity_type: 'produto_servico'`, `action: 'created'`. Invalida queryKey. Trata erro `23505` (duplicata).

**`useProdutoServicoDelete()`** — delete por id + `logAction` com `action: 'deleted'`. Invalida queryKey.

### 2. Componente (`ProdutoServicoTab.tsx`)

- Tabela: Produto (codigo) | Serviço (nome) | Ações (botão excluir)
- Botão "Adicionar" abre `Dialog` com dois `Select` populados por `useProdutoSegmentoList` e `useServicosPrestadosList`
- Exclusão via `AlertDialog` (shadcn-ui)
- Loading spinner padrão (mesmo pattern das outras tabs)
- Filtra apenas produtos ativos nos dropdowns

### 3. `CadastroCategorias.tsx`

- Importar `ProdutoServicoTab` de `@/components/equipe/ProdutoServicoTab`
- Adicionar 4o `TabsTrigger` value `"produto_servico_vinculo"` com label "Produto × Serviço"
- Adicionar `TabsContent` correspondente com `<ProdutoServicoTab />`

