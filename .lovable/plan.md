
## Diagnóstico

Há **dois procedimentos travados em `status_geracao = 'processando'` desde 27/03/2026** (mais de 2 meses), ambos PDFs sem `erro_mensagem`. Ou seja, a edge function `processar-procedimento` caiu/falhou silenciosamente naquele dia e nunca atualizou o registro para `erro`.

A partir daí, três fatores combinados produzem o loop visual que você está vendo:

1. **Polling permanente em `ProcedimentosDev.tsx` (linha ~46)**
   ```tsx
   const { data: procedimentos = [], isLoading } = useProcedimentosList(
     filters,
     // Enable polling if any card is processing
     true,   // ← sempre true
   );
   ```
   O comentário promete condicionar ao processamento, mas o valor é fixo `true`. O `useProcedimentosList` então roda `refetchInterval: 3000` indefinidamente, refazendo a query a cada 3s mesmo quando nada muda.

2. **`ProcedimentoCard` mostra spinner "Analisando documento..." enquanto `status_geracao === 'processando'`** (linhas 68–81). Como o registro nunca sai desse estado, o card fica eternamente em loop visual.

3. **Não existe UI de recuperação para `processando`** — só `erro` oferece "Tentar novamente"/"Excluir". Para registros zumbi (processando há horas/dias), o usuário não consegue desbloquear sem ir ao banco.

Resultado: cada vez que a página é aberta, refetch a cada 3s + 2 cards permanentemente em spinner = sensação de "loop".

## Plano de correção

### 1. Tornar o polling condicional (corrige o loop de refetch)

Em `src/hooks/useProcedimentos.ts`, mudar `useProcedimentosList` para decidir o `refetchInterval` com base nos dados retornados, em vez de receber um booleano fixo:

```ts
return useQuery({
  queryKey: ['procedimentos', filters],
  queryFn: async () => { /* ... */ },
  refetchInterval: (query) => {
    const data = query.state.data as Procedimento[] | undefined;
    const hasProcessing = data?.some(p => p.status_geracao === 'processando');
    return hasProcessing ? 3000 : false;
  },
});
```

Em `ProcedimentosDev.tsx`, remover o segundo argumento `true` da chamada. Sem itens em processamento, a query para de refazer.

### 2. Detectar e exibir registros "travados" (stuck)

No `ProcedimentoCard.tsx`, na branch `status_geracao === 'processando'`, considerar travado se `now - created_at > 10 minutos`. Quando travado, em vez do spinner:

- Mostrar ícone de alerta + texto "Processamento travado (iniciado há X)";
- Mostrar botões **Tentar novamente** (chama `onRetry`, que já existe) e, para `isLeaderOrAdmin`, **Excluir** (chama `onDelete`).

Isso permite ao usuário desbloquear os 2 registros existentes sem intervenção no banco e cobre futuras falhas da edge function. O polling do item 1 também ignora esses cards (eles continuam tecnicamente em `processando`, então o polling segue ativo apenas se houver `processando` recente — opcionalmente, podemos refinar o predicado para `hasProcessing && < 10min` para parar o polling também).

### 3. Auto-marcar como erro no servidor (defesa em profundidade)

A `processar-procedimento` deve, no início do `try`, registrar `started_at` (ou simplesmente confiar em `created_at`) e, em qualquer caminho de falha não capturado, gravar `status_geracao = 'erro'` com `erro_mensagem`. Como medida adicional, criar um pequeno cron / `setInterval` no Edge Runtime não é viável — em vez disso, adicionar uma **migration** que cria uma função SQL `mark_stuck_procedimentos()` chamada sob demanda pelo frontend (ou via trigger no `SELECT` da página). Mais simples e suficiente:

- No `useProcedimentosList`, antes do `select`, chamar um RPC `mark_stuck_procedimentos(interval := '15 minutes')` que faz:
  ```sql
  UPDATE procedimentos
  SET status_geracao = 'erro',
      erro_mensagem = COALESCE(erro_mensagem, 'Processamento expirado (timeout)')
  WHERE status_geracao = 'processando'
    AND created_at < now() - interval '15 minutes';
  ```
  Com `SECURITY DEFINER` e grant para `authenticated`.

Isso garante que qualquer registro órfão (incluindo os 2 atuais) migre automaticamente para `erro` na próxima abertura da página, exibindo o card de erro padrão com retry/excluir.

### 4. (Opcional) limpar os 2 registros zumbi agora

Após aplicar a função do item 3, abrir a página já resolve. Se preferir limpar antes via migration manual:
```sql
UPDATE procedimentos
SET status_geracao = 'erro',
    erro_mensagem = 'Processamento interrompido (limpeza manual)'
WHERE status_geracao = 'processando'
  AND created_at < now() - interval '1 day';
```

## Arquivos afetados

- `src/hooks/useProcedimentos.ts` — `refetchInterval` dinâmico + chamada do RPC no `queryFn`.
- `src/pages/equipe/dev/ProcedimentosDev.tsx` — remover `true` fixo.
- `src/components/equipe/dev/procedimentos/ProcedimentoCard.tsx` — estado "travado" com retry/excluir.
- `supabase/migrations/<timestamp>_mark_stuck_procedimentos.sql` — função `mark_stuck_procedimentos` + GRANT EXECUTE para `authenticated` + UPDATE de limpeza dos registros atuais.

## Resultado esperado

- Sem nenhum item em processamento real, a página deixa de refazer a query a cada 3s.
- Os 2 registros de 27/03 viram cards de erro com botão "Excluir"/"Tentar novamente" assim que a página carregar.
- Qualquer falha futura da edge function expira automaticamente em 15 min em vez de virar zumbi.
