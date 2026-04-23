

## Plano: Tornar todos os campos obrigatórios no Novo Projeto

Em `/equipe/tax/projetos/cadastro` (arquivo `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`), padronizar **todos os campos** do modal "Novo Projeto" como obrigatórios — tanto visualmente (`*` no label) quanto na validação do `handleSubmit`.

### Campos hoje vs. depois

| Campo | Hoje | Depois |
|---|---|---|
| Cliente | label sem `*`, sem validação | `*` + validação |
| Produto Contratado (quando OS tem produtos) | label `*` mas sem validação | `*` + validação obrigatória quando visível |
| Nome do Projeto | OK | mantido |
| Área | label `*` mas sem validação | `*` + validação |
| Status | label sem `*`, sem validação | `*` + validação (default `active`, mas exigido não-vazio) |
| Data de Início | OK | mantido |
| Data de Término | OK | mantido |
| Líder Geral | OK | mantido |
| Responsável Executor | OK | mantido |
| Membros do Projeto | opcional | **obrigatório** (≥ 1 membro) — `*` + validação |
| Descrição do Projeto | opcional | **obrigatório** — `*` + validação |

> **Serviço** e **OS Vinculadas** continuam como derivados/opcionais — **OS Vinculadas** é informativo (auto-seleção), e **Serviço** depende de existir produto+serviço cadastrado, então não vira obrigatório (ficaria impossível de salvar quando o catálogo não tem mapeamento). Confirmo isso na entrega.

### Alterações no JSX (labels)

Adicionar `<span className="text-destructive">*</span>` (padrão já usado nas datas) ou simplesmente ` *` ao final dos labels:

- `Cliente` → `Cliente *`
- `Status` → `Status *`
- `Membros do Projeto` → `Membros do Projeto *`
- `Descrição do Projeto` → `Descrição do Projeto *`

(Os demais já têm `*`.)

### Alterações no `handleSubmit` (validações)

Adicionar, **antes** das validações já existentes:

```ts
if (!formData.external_client_id) {
  toast.error('Selecione o Cliente');
  return;
}
if (!formData.estrutura_area_id) {
  toast.error('Selecione a Área');
  return;
}
if (!formData.status) {
  toast.error('Selecione o Status');
  return;
}
// Quando há OS com produtos disponíveis, exigir produto
if (selectedOsId && selectedOsProdutos.length >= 1 && !selectedProdutoId) {
  toast.error('Selecione o Produto Contratado');
  return;
}
if (formData.member_ids.length === 0) {
  toast.error('Selecione ao menos um Membro do Projeto');
  return;
}
if (!formData.description.trim()) {
  toast.error('Descrição do Projeto é obrigatória');
  return;
}
```

### Cuidados

- **Edição preservada**: as validações se aplicam tanto a criação quanto a edição (mesmo `handleSubmit`). Projetos antigos sem descrição/membros só poderão ser salvos após preenchimento.
- **Membros — UX**: quando a Área ainda não foi selecionada, o seletor de membros está desabilitado. A validação só dispara no submit, então o fluxo natural continua funcionando (Cliente → Área → Membros).
- **Status**: já tem default `'active'`, então nunca deveria estar vazio, mas a validação garante consistência.
- **Produto Contratado**: validação condicional — só obriga quando o seletor está visível (há OS selecionada com produtos).

### Arquivo alterado

- `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx` — labels (linhas ~870, ~1040, ~1169, ~1269) + `handleSubmit` (linha 449).

Sem mudanças em hooks, banco, rotas ou outros componentes.

