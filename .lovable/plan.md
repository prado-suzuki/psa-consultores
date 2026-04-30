# Migrar tickets `resolvido` → `fechado`

## O que será feito

Executar um único UPDATE no banco para normalizar os 276 chamados que ainda estão com status `resolvido`:

```sql
UPDATE public.tickets
SET status = 'fechado'
WHERE status = 'resolvido';
```

## Efeitos colaterais (validados)

- **`closed_at` preservado**: o trigger `trg_tickets_set_closed_at` só reseta `closed_at` quando o status sai do conjunto fechado. Como `resolvido` e `fechado` estão ambos nesse conjunto, o trigger não toca em `closed_at`.
- **`updated_at`**: será atualizado pelo trigger `update_tickets_updated_at` (esperado).
- **Estado final do banco**: apenas os status `fechado`, `aberto` e `em_andamento` permanecerão.

## Por que não foi aplicado ainda

Este turno está em modo plano (read-only) — a ferramenta de migração só fica disponível depois que você aprovar este plano. Aprovando, o UPDATE roda imediatamente.