

## Correção: Omitir `id_participante` do objeto de inserção

O banco já tem `DEFAULT gen_random_uuid()` em ambas as tabelas. Não é necessária nenhuma migração.

O problema está no código frontend: ao incluir `id_participante: undefined` no objeto, o cliente Supabase envia `null`, que viola o `NOT NULL`. A solução é simplesmente **não incluir** o campo `id_participante` no objeto quando ele não vem do CSV.

### Mudança em `src/pages/equipe/dev/GerenciarDados.tsx`

Na construção do objeto `ParsedParticipante` (dentro do mapping do CSV), usar spread condicional:

```typescript
// De:
id_participante: row.id_participante || undefined,

// Para:
...(row.id_participante ? { id_participante: row.id_participante } : {}),
```

Isso garante que quando o CSV não traz `id_participante`, o campo é omitido do objeto e o banco usa o `gen_random_uuid()` default. Quando o CSV traz, o valor é preservado.

Uma única linha de alteração resolve o erro.

