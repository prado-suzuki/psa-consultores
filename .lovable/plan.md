

# Correcao: Atualizacao dos botoes Ressarcimento/DCOMP em tempo real

## Problema

Ao registrar um ressarcimento ou adicionar DCOMPs dentro do modal do PER, os botoes "Novo Ressarcimento" e "Novo DCOMP" nao atualizam seu estado (desabilitar/esconder) ate que o usuario feche e reabra o modal. Alem disso, quando o saldo restante atinge zero ou fica negativo, o sistema ainda permite adicionar mais DCOMPs.

## Solucao

### 1. Desabilitar "Novo DCOMP" quando saldo esgotado

Adicionar condicao `saldoRestante <= 0` para desabilitar o botao "Novo DCOMP" (linha 618), mesmo quando `perPago` ainda nao e verdadeiro. Isso impede novas compensacoes quando o credito ja foi totalmente consumido.

```typescript
// Linha 618 - adicionar disabled quando saldo <= 0
<Button onClick={handleNewDcomp} size="sm" disabled={saldoRestante <= 0}>
```

### 2. Garantir refetch imediato apos mutations

O `perAtualizado` query (linha 155) depende de invalidacao para atualizar `perPago`. Atualmente a invalidacao ocorre corretamente, mas para garantir atualizacao sincrona:

- Na `ressarcimentoMutation.onSuccess` (linha 279): adicionar `await queryClient.refetchQueries` para o `per-detail` ao inves de apenas invalidar, garantindo que o estado `perPago` atualiza antes do re-render.
- Na callback `onOpenChange` do `DcompFormModal` (linha 734): tambem forcar refetch de `per-dcomps` para atualizar `saldoRestante` imediatamente.

### 3. Forcar refetch ao fechar DcompFormModal

Na callback do `DcompFormModal` (linha 734-738), alem de invalidar, chamar `refetchQueries` para garantir que os dados de DCOMPs e do PER sejam atualizados imediatamente:

```typescript
onOpenChange={(open) => {
  setDcompModalOpen(open);
  if (!open) {
    queryClient.refetchQueries({ queryKey: ['per-dcomps', per?.numero_processo_per] });
    queryClient.refetchQueries({ queryKey: ['per-detail', per?.numero_processo_per] });
  }
}}
```

## Arquivo afetado

`src/components/equipe/dev/perdcomp/PerDetailModal.tsx`

## Resumo das alteracoes

| Local | Alteracao |
|---|---|
| Linha 618 (botao Novo DCOMP) | Adicionar `disabled={saldoRestante <= 0}` |
| Linha 279-283 (ressarcimentoMutation.onSuccess) | Trocar `invalidateQueries` por `refetchQueries` para `per-detail` |
| Linhas 734-738 (DcompFormModal onOpenChange) | Usar `refetchQueries` para `per-dcomps` e `per-detail` |

