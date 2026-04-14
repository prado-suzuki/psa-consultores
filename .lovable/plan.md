

# MeusChamados.tsx — Datas de criação e prazo no card

## Alterações

### Arquivo: `src/pages/cliente/MeusChamados.tsx`

**1. Interface Ticket (L20-33)** — adicionar `deadline`:
```ts
deadline?: string | null;
```

**2. Card — substituir a data existente (L369-371)** pelo layout em linha única:
```tsx
<div className="flex items-center gap-2 text-xs text-muted-foreground">
  <span>Criado em {format(new Date(ticket.created_at), "dd/MM/yyyy")}</span>
  {ticket.deadline && (
    <>
      <span>•</span>
      <span className={isPast(new Date(ticket.deadline + 'T23:59:59')) ? 'text-destructive font-medium' : ''}>
        Prazo: {format(new Date(ticket.deadline + 'T12:00:00'), "dd/MM/yyyy")}
      </span>
    </>
  )}
</div>
```

**3. Import** — adicionar `isPast` do date-fns (já importa `format`).

## Notas
- A query já usa `SELECT *`, então `deadline` já vem do banco — nenhuma alteração na query.
- Se `deadline` for null, o prazo simplesmente não aparece.
- Se `deadline` já passou, exibe em vermelho (`text-destructive`).
- 1 arquivo, ~10 linhas alteradas.

