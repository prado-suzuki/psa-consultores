

## Diagnóstico: Demora no número da OS

### Causa

Ao clicar "Adicionar OS à Lista", a função `addContract` faz uma query assíncrona (`generateNextOsNumber`) ao banco antes de adicionar a OS à lista. Durante esse tempo (~200-500ms), **não há nenhum feedback visual** — o botão não muda de estado, não há spinner. Isso faz parecer que está travado.

### Solução

1. Adicionar um estado `isAddingContract` (boolean) ao componente
2. No `addContract`, setar `true` antes da query e `false` depois
3. No botão "Adicionar OS à Lista" (~linha 4072), usar `disabled={isAddingContract}` e exibir um spinner/texto "Adicionando..." enquanto `isAddingContract === true`

### Arquivo alterado
- `src/components/equipe/dev/NewClientModal.tsx`

