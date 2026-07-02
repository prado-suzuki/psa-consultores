## Diagnóstico — Contribuintes some ao salvar

**Fatos:**
- 3 UPDATEs de `cliente` registrados hoje, todos com `changed_fields = NULL`. `updated_at` de Família Lunardi bumpado (17:42:50).
- **Nenhum** audit de `entity_type='contribuinte'` no dia — o diff calculado (`computeEntityListDiff`) veio vazio, ou seja, no instante do save o array `entities` já era idêntico ao `originalSnapshot`.
- Papel `lider` passa em todas as policies (`sublider+` em contribuinte).

**Causa raiz (identificada por leitura):**

Em `src/components/equipe/client-form/ContribuintesTab.tsx`, o painel de "Editar" de um contribuinte existente commita a edição na linha 152:

```
setEntities(entities.map((e) => (e._id === editingEntityId ? ({...e, ...editingEntityData}) : e)));
```

O casamento é por `_id`, um número gerado em `useClientEditData.ts` com `Date.now() + Math.random()` (linha 81). Esse `_id` é **regerado toda vez que `useClientEditData` executa** — e o `useEffect` desse hook depende de `[open, editingClienteId]`, mas também é vulnerável a qualquer re-run causado por `open` transitando (React 18 StrictMode, focus/visibility, revalidations).

Fluxo que reproduz o bug:
1. Maritsa abre o modal do cliente Família Lunardi → load popula `entities` com `_id=X`.
2. Ela clica em "Editar" num contribuinte → `editingEntityId = X`.
3. Ela digita alterações.
4. O load re-dispara por qualquer motivo → `setEntities` recria a lista com `_id=Y` (novos números).
5. Ela clica "Salvar" na linha → `entities.map(e => e._id === X ? ...)` → **nenhum match**, no-op silencioso.
6. Ela clica "Salvar" no modal → `entities` idêntico ao snapshot → `UPDATE` roda com payload igual, `changed_fields=null`, toast diz "sucesso".

Contribui também: a `useEffect` do load não é idempotente — não há guard `loadedForId` — e o save principal em `useSaveClientTransaction.ts:230` faz `.update(...)` **sem `.select()`**, então uma eventual falha silenciosa de RLS não seria detectada (não é o caso aqui, mas fica como fragilidade).

## Plano de correção (frontend, sem migrations)

### Fix 1 — Identidade estável do contribuinte (raiz do bug)
`src/hooks/useClientEditData.ts`:
- Trocar `_id: Date.now() + Math.random()` por `_id: <hash estável do _dbId>` (ex.: `parseInt(String(c.id).replace(/-/g,'').slice(0,12),16)`) OU passar a usar `_dbId` como chave onde hoje se usa `_id`.

`src/components/equipe/client-form/ContribuintesTab.tsx`:
- Onde o código compara `e._id === editingEntityId`, priorizar `_dbId` quando existir: `(e._dbId && e._dbId === editingEntityDbId) || e._id === editingEntityId`.
- Aplicar o mesmo raciocínio ao `expandedEntityId`, ao remove (linha 271) e ao commit inline de IE.
- Repetir o padrão em `RepresentantesTab.tsx` e `ContratosTab.tsx` se usarem o mesmo casamento por `_id`.

### Fix 2 — Load idempotente
`src/hooks/useClientEditData.ts`:
- Adicionar `loadedForIdRef = useRef<string | null>(null)` e sair cedo se `loadedForIdRef.current === editingClienteId`.
- Zerar o ref quando `open` vira `false` ou `editingClienteId` muda.
- Se `initialSnapshotRef.current` já existir e o snapshot atual estiver "sujo" (usuário digitou), **não** chamar os setters no fim do load (log via `console.warn`).

### Fix 3 — Bloquear Save enquanto carrega
`src/components/equipe/NewClientModal.tsx`:
- Adicionar `|| loadingEdit` no `disabled` do botão Salvar.
- `toast.warning("Carregando dados, aguarde…")` no caminho `executeSave` se `loadingEdit === true`.

### Fix 4 — "Nada a salvar" explícito + endurecimento
`src/hooks/useSaveClientTransaction.ts`:
- Ao final, se `isEditing` e todos os diffs (client + contribs + parts + os) estão vazios, exibir `toast.info("Nenhuma alteração detectada")` no lugar de `toast.success("Cliente atualizado…")` e **não** emitir o `logAction` de cliente com `changed_fields` vazio (elimina os "fantasmas" que vimos em audit).
- Trocar `supabase.from(contribuinteTable).update(payload).eq("id", e._dbId)` por `.update(payload).eq("id", e._dbId).select("id")` — se `data.length === 0`, `throw new Error('UPDATE de contribuinte não atingiu nenhuma linha')`. Blindagem contra futuras regressões silenciosas de RLS.

### Fix 5 — Validação
- Como líder, abrir Família Lunardi, editar um contribuinte (ex.: telefone), salvar.
- Conferir na barra de sucesso, reabrir o modal e ver que o valor persistiu.
- Em `audit_logs`, verificar que o novo registro traz `entity_type='contribuinte'` e `changed_fields={telefone:{...}}`.
- Regressão rápida: aba Contratos e Representantes editando inline.

## Escopo e não-escopo
- **Frontend + hook data-loader apenas.** Nada de migração, RLS, policy ou trigger.
- Não altera regras de negócio nem o payload persistido; muda somente identidade em memória, idempotência de load e feedback de UX.
- Arquivos tocados: `useClientEditData.ts`, `ContribuintesTab.tsx`, `RepresentantesTab.tsx` e `ContratosTab.tsx` (se aplicável), `NewClientModal.tsx`, `useSaveClientTransaction.ts`.

## Rollback
Reverter os 4-5 arquivos citados — mudança 100% frontend, sem estado persistido novo.
