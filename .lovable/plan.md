

## Plan: Corrigir formatação do PER no header do modal e saldo vermelho em R$ 0,00

### Problema 1: Numeração no formato antigo no header do modal

O header do modal (linha 393) exibe `per.nr_per` diretamente do banco. PERs cadastrados antes da correção de formatação ainda estão armazenados no formato antigo (ex: `41501.74638.081025.1.1.19.95-56`). O modal não aplica nenhuma normalização.

**Correção em `PerDetailModal.tsx`**: Criar uma função `normalizeProcessNumber` que recebe qualquer string de número de processo, extrai apenas os dígitos, e reformata no padrão correto `XXXXX.XXXXX.XXXXXX.X.X.XX-XXXX` (24 dígitos). Aplicar essa função nos 2 locais que exibem números de processo:
- Linha 393: `per.nr_per` no título
- Linha 408: `per.nr_proc_ret` na indicação de retificação

A mesma normalização deve ser aplicada na tabela principal em `ControlePerdcomp.tsx` onde `item.nr_per` é exibido (coluna do número do PER).

### Problema 2: Saldo R$ 0,00 exibido em vermelho (-R$ 0,00)

**Causa**: Na tabela principal (`ControlePerdcomp.tsx`, linha 592), o cálculo `item.vlr_credito - totalCompensado - valorRessarcido` sofre imprecisão de ponto flutuante, resultando em algo como `-0.000000001`. A condição `saldo < 0` é verdadeira, exibindo em vermelho.

O `PerDetailModal.tsx` (linha 235) já foi corrigido com `Math.round(... * 100) / 100`, mas o `ControlePerdcomp.tsx` não.

**Correção em `ControlePerdcomp.tsx`** (linha 592): Aplicar o mesmo arredondamento:
```typescript
const saldo = Math.round((item.vlr_credito - totalCompensado - valorRessarcido) * 100) / 100;
```

### Resumo

| Arquivo | Alteração |
|---|---|
| `PerDetailModal.tsx` | Normalizar `nr_per` e `nr_proc_ret` no header com função de reformatação |
| `ControlePerdcomp.tsx` | Arredondar saldo para 2 casas decimais + normalizar `nr_per` na tabela |

**3 alterações cirúrgicas em 2 arquivos.**

