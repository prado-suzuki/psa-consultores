

## Plan: Corrigir saldo zerado exibido como negativo (vermelho)

### Causa raiz

Precisão de ponto flutuante: `vlr_credito - totalCompensado - vlrRessarcido` resulta em algo como `-0.0000000001` ao invés de `0`. A comparação `saldoRestante < 0` retorna `true`, exibindo `-R$ 0,00` em vermelho.

### Correção: `src/components/equipe/dev/perdcomp/PerDetailModal.tsx`

**Linha 234** — arredondar o resultado para 2 casas decimais:

```typescript
return Math.round(((perAtual as any).vlr_credito - totalCompensado - vlrRessarcido) * 100) / 100;
```

Isso elimina ruído de ponto flutuante. Saldos efetivamente zerados serão exatamente `0`, exibidos na cor padrão (slate). Nenhuma alteração visual nas condicionais de cor necessária — a lógica `> 0` / `< 0` / `=== 0` já está correta.

### Nenhum outro arquivo afetado

