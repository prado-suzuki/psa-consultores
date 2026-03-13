

# Plano: Ajustar obrigatoriedade e marcação visual de campos em Participantes

## Problema
1. "Cargo/função" está validado como obrigatório, mas deveria ser opcional
2. Campos com `*` manual (texto literal) não usam `<RequiredMark />`, ficando sem destaque vermelho — inconsistência visual

## Mudanças

### 1. NewClientModal.tsx — Remover validação de `tipo_participante`
**Linhas 484-486**: Remover o bloco:
```typescript
if (!draftParticipant.tipo_participante) {
  toast.error("Tipo de Participante é obrigatório");
  return;
}
```

### 2. ParticipantesTab.tsx — Corrigir marcação visual dos campos
Há dois locais onde "Cargo/função" e "Email" usam `*` como texto literal em vez de `<RequiredMark />`:

| Local | Linha(s) | Campo | De | Para |
|-------|----------|-------|----|------|
| Edição inline | ~193 | Cargo/função | `Cargo/função *` | `Cargo/função` (remover `*`, não é mais obrigatório) |
| Edição inline | ~218 | Email | `Email *` | `Email <RequiredMark />` |
| Novo participante | ~350 | Cargo/função | `Cargo/função *` | `Cargo/função` (remover `*`) |
| Novo participante | ~377 | Email | `Email *` | `Email <RequiredMark />` |

Campos obrigatórios finais: **Nome** e **Email** (ambos com `<RequiredMark />`).

