

## Fix: Serviço e Produto resetados ao abrir Editar Projeto

### Causa raiz
O `useEffect` da linha 299 dispara ao mudar `selectedOsId` e **sempre** limpa `servico_id` e `selectedProdutoId` — inclusive quando o modal abre em modo edição via `handleOpenModal`. O mesmo ocorre com o `useEffect` da linha 260 que auto-seleciona produto quando a OS tem 1 produto, mas reseta para `null` caso contrário.

### Solução

**Arquivo único:** `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`

1. **Adicionar `useRef`** `isOpeningEditRef` (default `false`) junto aos estados existentes (~linha 91)

2. **`handleOpenModal` (~linha 388):** Setar `isOpeningEditRef.current = true` **antes** de `setSelectedOsId` e `setSelectedProdutoId` ao editar

3. **`useEffect` sync OS (linha 299):** Guard com `isOpeningEditRef.current`:
   - Se `true`: apenas sincronizar `ordem_servico_id` sem limpar `servico_id` nem `selectedProdutoId`, setar ref de volta para `false`
   - Se `false`: manter comportamento atual (limpar campos)

4. **`useEffect` auto-select produto (linha 260):** Guard com `isOpeningEditRef.current`:
   - Se `true`: não sobrescrever `selectedProdutoId` (retornar early)
   - Se `false`: manter comportamento atual

5. **Restaurar `selectedProdutoId` ao editar:** No `handleOpenModal`, após setar `formData` com o `servico_id` salvo, buscar nos `osProdutosByOs` qual produto contém esse serviço via `produto_servico` e pre-selecionar `selectedProdutoId`. Como os dados de `osProdutosByOs` podem não estar carregados ainda, adicionar um `useEffect` auxiliar que, quando `editingProject` existe e `osProdutosByOs` fica disponível, resolve o `selectedProdutoId` correto a partir do `servico_id` salvo no `formData`.

### Audit logging
Já implementado — `useOrgProjects.ts` linha 289 compara `servico_id` old vs new e registra no `changed_fields`. Nenhuma alteração necessária no audit.

### Resumo de alterações

| Linha aprox. | Mudança |
|---|---|
| ~91 | `const isOpeningEditRef = useRef(false)` |
| ~260 | Guard: skip auto-select produto se `isOpeningEditRef.current` |
| ~299 | Guard: skip limpar `servico_id`/`selectedProdutoId` se `isOpeningEditRef.current` |
| ~389 | Setar `isOpeningEditRef.current = true` antes de `setSelectedOsId` |
| Novo useEffect | Restaurar `selectedProdutoId` quando `editingProject` + `osProdutosByOs` + `servicosByProduto` disponíveis |

