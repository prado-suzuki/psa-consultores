

## Plano: Reposicionar botões e adicionar animações

### 1. Mover botões para baixo (alinhados ao "Habilitar modo edição")
Em `src/pages/equipe/dev/CorrecoesSped.tsx` (linhas 383–418), **remover** os 3 botões (`Enviar Correções`, `Exportar correções`, `Limpar efd_correcoes`) da linha do `TabsList` — deixando só as abas no topo, mais limpas.

Os botões serão **renderizados dentro de cada Tab**, anexados ao toolbar interno do Card que já contém o botão `Habilitar modo edição` (linha 551 do `TabC170.tsx` e equivalentes em `TabA170/D100/F100/F120/F130`).

**Como evitar duplicar 3 botões em 6 arquivos:** criar um pequeno componente compartilhado `CorrecoesActionButtons.tsx` em `src/components/equipe/dev/correcoes-sped/` que recebe via props: `registroTipo`, `contribuinteId`, `onEnviar`, `onExportar`, `isSending`, `isExporting`, `canExport`, `pendingCount`. Cada Tab renderiza esse componente dentro do `<div className="flex items-center gap-2">` (linha 557 do TabC170) **antes** dos botões de Cancelar/Habilitar edição.

`CorrecoesSped.tsx` passa as props para cada Tab (handlers `enviarCorrecoes`, `handleExportar`, flags `isSending`, `isExporting`, e `idArquivos`).

### 2. Animações de cor (hover/active)
Estilo solicitado: fundo branco + fonte preta no estado idle; verde (ou vermelho para "Limpar") + fonte branca no hover/active.

Aplicar via `className` Tailwind diretamente nos 3 botões (sem criar variant nova no `button.tsx` para manter escopo cirúrgico):

- **Enviar / Exportar (verde):**
  ```
  bg-white text-black border border-input
  hover:bg-emerald-600 hover:text-white hover:border-emerald-600
  active:bg-emerald-700 active:text-white
  transition-colors duration-200
  ```
- **Limpar efd_correcoes (vermelho):**
  ```
  bg-white text-black border border-input
  hover:bg-red-600 hover:text-white hover:border-red-600
  active:bg-red-700 active:text-white
  transition-colors duration-200
  ```

Usar `variant="outline"` como base (mantém estrutura/sizing) e sobrescrever com as classes acima.

### 3. Desabilitar "Enviar Correções" quando não há pendências
**Viável** — a tabela `efd_correcoes` tem `sync_status` (`'P'` = pendente) e `ativo`. Adicionar novo hook no `useCorrecoesSped.ts`:

```ts
export function usePendingCorrecoesCount(contribuinteId: string, registroTipo: string)
```
Retorna `useQuery` com `supabase.from('efd_correcoes').select('id', { count: 'exact', head: true }).eq('contribuinte_id', contribuinteId).eq('registro_tipo', registroTipo).eq('ativo', true).eq('sync_status', 'P')`. `enabled: !!contribuinteId && !!registroTipo`. `refetchOnWindowFocus: true` + `staleTime: 10_000`.

No `CorrecoesSped.tsx`, chamar o hook com `contribuinteId` + `activeTab.toUpperCase()`. Passar `pendingCount` ao `CorrecoesActionButtons`. O botão `Enviar Correções` ganha `disabled={isSending || pendingCount === 0}` e `title="Nenhuma correção pendente"` quando contagem zero.

Após `enviarCorrecoes` concluir com sucesso, invalidar essa query (`queryClient.invalidateQueries({ queryKey: ['pending-correcoes', contribuinteId, registroTipo] })`) para o botão re-desabilitar imediatamente. Como o hook atual `useEnviarCorrecoes` não tem acesso ao `queryClient`, adicionar `useQueryClient()` lá dentro e invalidar pela `queryKey`.

### Arquivos alterados
- `src/pages/equipe/dev/CorrecoesSped.tsx` — remove os 3 botões da linha das tabs; passa props novas para cada `<Tab*>`.
- `src/hooks/useCorrecoesSped.ts` — adiciona `usePendingCorrecoesCount`; invalida a query no fim de `useEnviarCorrecoes`.
- `src/components/equipe/dev/correcoes-sped/CorrecoesActionButtons.tsx` — **novo** componente compartilhado.
- `src/components/equipe/dev/correcoes-sped/TabC170.tsx`, `TabA170.tsx`, `TabD100.tsx`, `TabF100.tsx`, `TabF120.tsx`, `TabF130.tsx` — aceitam props `enviarCorrecoes`, `exportarCorrecoes`, `isSending`, `isExporting`, `pendingCount`, `idArquivos`; renderizam `<CorrecoesActionButtons />` antes do bloco de Cancelar/Habilitar edição.

### Fora do escopo
- Não toco no botão `Limpar` do filtro superior (linha 344) nem no `Consultar` (linha 347) — comportamento e estilo preservados.
- Não mexo na lógica interna de edição/salvamento das tabs.

