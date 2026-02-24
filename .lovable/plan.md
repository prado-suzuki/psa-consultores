

# Exibir quantidade de tarefas associadas ao processo no card de detalhes

## O que sera feito
Ao abrir os detalhes de um processo (clicando em "Ver Detalhes"), o sistema buscara quantas tarefas (da tabela `sprint_deliverables`) estao vinculadas a esse processo e exibira essa informacao na aba "Informacoes".

## Mudancas

### Arquivo: `src/pages/equipe/EquipeProcessos.tsx`

1. **Novo estado**: Adicionar `const [taskCount, setTaskCount] = useState<number>(0);` para armazenar a contagem.

2. **Buscar contagem em `fetchProcessDetails`** (linha ~402): Adicionar uma terceira query em paralelo no `Promise.all`:
   ```typescript
   supabase
     .from('sprint_deliverables')
     .select('id', { count: 'exact', head: true })
     .eq('process_id', processId)
   ```
   E setar `setTaskCount(taskCountRes.count || 0)`.

3. **Exibir no card de detalhes** (aba "Informacoes", linha ~1018): Adicionar um novo campo no grid de informacoes, abaixo dos existentes:
   ```
   Tarefas Vinculadas: 12
   ```
   Com um Badge mostrando o numero, similar ao padrao ja usado nos outros campos.

4. **Resetar ao fechar**: Setar `setTaskCount(0)` quando o dialog fecha (no `onOpenChange`).

## Resultado esperado
- Ao abrir os detalhes de qualquer processo, aparecera "Tarefas Vinculadas" com a contagem exata de tarefas da sprint associadas a ele
- Isso permite avaliar rapidamente a relevancia e a carga de trabalho de cada processo
