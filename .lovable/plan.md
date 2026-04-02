

## Plan: Busca por Nº Processo sem exigir cliente/contribuinte

### Problema atual

O fluxo exige: selecionar cliente → contribuinte → clicar Buscar. O filtro de Nº Processo só funciona como filtro local sobre dados já carregados. Se o usuário digita um número sem ter selecionado cliente/contribuinte, recebe "Selecione o cliente e contribuinte".

### Solução

Modificar `handleSearch` para detectar quando há `processoFilter` preenchido mas nenhum cliente/contribuinte. Nesse caso, buscar diretamente na tabela `per` pelo `nr_per` (usando digits-only), e ao encontrar, resolver o `id_contribuinte` → buscar o `cliente_id` do contribuinte → preencher automaticamente `clienteId` e `contribuinteId`, e então disparar a busca normal.

### Alterações em `src/pages/equipe/dev/ControlePerdcomp.tsx`

**1. `handleSearch` (linha 223-229):**

Antes:
```typescript
const handleSearch = () => {
  if (!clienteId || !contribuinteId) {
    toast.error("Selecione o cliente e contribuinte");
    return;
  }
  setSearched(true);
};
```

Depois:
```typescript
const handleSearch = async () => {
  // Se tem filtro de processo mas sem cliente/contribuinte → busca direta
  if (processoFilter && (!clienteId || !contribuinteId)) {
    const filterDigits = processoFilter.replace(/\D/g, '');
    if (!filterDigits) {
      toast.error("Selecione o cliente e contribuinte");
      return;
    }

    // Buscar PER pelo número (parcial ou completo)
    const { data: matchedPers } = await supabase
      .from("per")
      .select("id_contribuinte, nr_per")
      .like("nr_per", `%${filterDigits}%`)
      .or('excluido.is.null,excluido.eq.')
      .limit(1);

    if (!matchedPers || matchedPers.length === 0) {
      toast.error("Nenhum PER encontrado com esse número");
      return;
    }

    const contribId = matchedPers[0].id_contribuinte;

    // Buscar cliente_id do contribuinte
    const { data: contrib } = await supabase
      .from("contribuinte")
      .select("cliente_id")
      .eq("id", contribId)
      .maybeSingle();

    if (!contrib?.cliente_id) {
      toast.error("Contribuinte sem cliente vinculado");
      return;
    }

    // Preencher os campos automaticamente
    setClienteId(contrib.cliente_id);
    setContribuinteId(contribId);
    setSearched(true);
    return;
  }

  if (!clienteId || !contribuinteId) {
    toast.error("Selecione o cliente e contribuinte");
    return;
  }
  setSearched(true);
};
```

**2. Remover `disabled` do contribuinte quando há processo digitado** — não necessário pois o preenchimento é automático.

**3. Validação do botão Buscar (linha 885):**

Atualizar a condição `disabled` do botão para permitir busca quando há `processoFilter`:
```typescript
disabled={isLoading || (isSearchingByProcess)}
```
Onde `isSearchingByProcess` é um novo state para loading durante a busca direta.

**4. Estado de loading para busca por processo:**

Adicionar `const [isSearchingByProcess, setIsSearchingByProcess] = useState(false);` e envolver a busca direta com esse estado para feedback visual.

### Resumo

| O quê | Detalhe |
|---|---|
| Arquivo | `ControlePerdcomp.tsx` |
| Lógica | Se `processoFilter` preenchido sem cliente/contribuinte → busca direta no banco por `nr_per`, resolve contribuinte → cliente, preenche ambos e dispara busca |
| UX | Campos cliente e contribuinte são preenchidos automaticamente, resultado aparece normalmente |

**1 arquivo, ~30 linhas adicionadas.**

