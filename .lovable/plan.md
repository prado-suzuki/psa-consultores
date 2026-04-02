

## Plan: Fase 2 — Correções de Regras de Negócio e Listagem PERDCOMP

### Análise e Correções

---

### 1. Filtro Situação — opção "Todas"

**Status**: O filtro de situação já é um multi-select com checkboxes (linha 806-839 de `ControlePerdcomp.tsx`). Quando nenhum checkbox está marcado, o texto exibido já é "Todas" (linha 796-797) e a lógica de filtro já retorna todos os registros (`situacaoFilter.length === 0` pula o filtro, linha 270). Há também um botão "Limpar seleção" quando há filtros ativos (linha 823-835).

**Conclusão**: Este item **já está implementado corretamente**. O comportamento "Todas" é o estado padrão (nenhuma seleção). Nenhuma alteração necessária.

---

### 2. Erro de duplicidade ao criar PER (PerFormModal.tsx)

**Diagnóstico**: A mutation de criação (linha 270-278) faz um `SELECT` para verificar se já existe um PER com o mesmo `nr_per`. Se existe, lança erro. Isso é correto para PERs originais, mas uma retificadora tem **obrigatoriamente** um número de processo diferente do PER original (cada PER tem seu próprio número de documento). O campo `nr_proc_ret` aponta para o PER que está sendo retificado.

**Conclusão**: A lógica está **correta**. Uma retificadora nunca deveria ter o mesmo `nr_per` do PER original — são documentos distintos. O erro só ocorre se o usuário tentar cadastrar o **mesmo número** duas vezes, o que é uma duplicata real. Nenhuma alteração necessária na validação. O fluxo de retificação já funciona: novo número em `nr_per`, número antigo em `nr_proc_ret`.

---

### 3. Cabeçalho "Ações" na coluna de botões

**Arquivo**: `src/pages/equipe/dev/ControlePerdcomp.tsx`

**Diagnóstico**: A última `<TableHead>` (linha 577) está vazia: `<TableHead className="w-[80px]"></TableHead>`.

**Correção**: Adicionar o texto "Ações" nessa célula.

```tsx
<TableHead className="w-[80px]">Ações</TableHead>
```

---

### 4. Bloqueio de DCOMP após ressarcimento (PerDetailModal.tsx)

**Diagnóstico**: Linhas 613-631 — quando `perPago` é `true` (há ressarcimento registrado), a UI exibe **apenas** a badge "Ressarcido", escondendo completamente os botões "Novo DCOMP" e "Novo Ressarcimento". Isso impede lançar DCOMPs mesmo quando `saldoRestante > 0`.

**Correção**: Alterar a renderização condicional para:
- Sempre exibir a badge "Ressarcido" quando `perPago` é true
- Sempre exibir o botão "Novo DCOMP" quando `saldoRestante > 0`, independentemente do status de ressarcimento
- Esconder apenas o botão "Novo Ressarcimento" quando já existe ressarcimento

```tsx
<div className="flex items-center gap-2">
  {perPago && (
    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-sm px-3 py-1">
      <CheckCircle2 className="h-4 w-4 mr-1" />
      Ressarcido
    </Badge>
  )}
  {!perPago && (
    <Button onClick={() => setRessarcimentoOpen(true)} size="sm" variant="outline">
      <DollarSign className="h-4 w-4 mr-2" />
      Novo Ressarcimento
    </Button>
  )}
  {saldoRestante > 0 && (
    <Button onClick={handleNewDcomp} size="sm">
      <Plus className="h-4 w-4 mr-2" />
      Novo DCOMP
    </Button>
  )}
</div>
```

---

### Resumo

| # | Item | Ação |
|---|------|------|
| 1 | Filtro "Todas" | Já implementado — sem alteração |
| 2 | Erro duplicidade PER | Lógica correta — sem alteração |
| 3 | Cabeçalho "Ações" | `ControlePerdcomp.tsx` linha 577 — adicionar texto |
| 4 | Bloqueio DCOMP por ressarcimento | `PerDetailModal.tsx` linhas 613-631 — refatorar condicional |

**2 arquivos modificados, 2 alterações cirúrgicas.**

