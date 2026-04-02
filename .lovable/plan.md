

## Plan: Corrigir formatação do número PER e DCOMP

### Problema

O `formatProcessNumber` em `PerFormModal.tsx` insere separadores errados nos últimos dígitos:

**Errado** (atual): posições 5,10,16,17,18 = dot, **20 = dot**, 22 = dash → `XXXXX.XXXXX.XXXXXX.X.X.XX.XX-XX`
**Certo**: posições 5,10,16,17,18 = dot, **20 = dash** → `XXXXX.XXXXX.XXXXXX.X.X.XX-XXXX`

Total de dígitos: **24** (não 26).

O `formatDcompNumber` em `DcompFormModal.tsx` já produz o formato correto, mas aceita 26 dígitos no slice — deve ser 24.

### Correções

#### 1. `src/components/equipe/dev/perdcomp/PerFormModal.tsx` (~linha 59-72)

Substituir `formatProcessNumber`:

```typescript
const formatProcessNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 24);
  let formatted = '';
  for (let i = 0; i < digits.length; i++) {
    if (i === 5 || i === 10 || i === 16 || i === 17 || i === 18) {
      formatted += '.';
    }
    if (i === 20) {
      formatted += '-';
    }
    formatted += digits[i];
  }
  return formatted;
};
```

Mudanças: remover dot em `i === 20`, mover dash de `i === 22` para `i === 20`, max dígitos `24`.

#### 2. `src/components/equipe/dev/perdcomp/DcompFormModal.tsx` (~linha 53-72)

Ajustar `slice(0, 26)` → `slice(0, 24)` para consistência. A lógica de partes já produz o formato correto.

#### 3. Placeholders

Atualizar os placeholders de ambos os inputs para `00000.00000.000000.0.0.00-0000` (já está correto — 24 dígitos formatados).

### Dados existentes

PERs já salvos com formato errado (ex: `32272.39472.260925.1.1.19.14-89`) continuarão exibidos assim na tabela pois o valor armazenado é o formatado. Para corrigir dados existentes, seria necessário um script de migração — isso pode ser feito como passo adicional se desejado.

