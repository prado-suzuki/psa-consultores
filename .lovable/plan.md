## Objetivo

Em `src/pages/equipe/dev/ControlePerdcomp.tsx`, permitir excluir o ressarcimento registrado em um PER diretamente pela tabela. A exclusão **não é soft delete**: apenas atualiza colunas da tabela `per`, limpando o valor ressarcido e preenchendo `atualizado_em` / `atualizado_por`.

## Comportamento

- Na coluna **Ressarcido** da tabela (linha ~791), quando `valorRessarcido > 0`, exibir um ícone de lixeira ao lado do valor.
- Ao clicar, abrir um `AlertDialog` de confirmação ("Excluir ressarcimento do PER X? Esta ação limpa o valor ressarcido registrado.").
- Ao confirmar, executar mutation que faz `UPDATE public.per SET vlr_ressarcido = NULL, vlr_ressarcido_original = NULL, atualizado_em = now(), atualizado_por = <auth.uid()> WHERE nr_per = ...`.
- Click no botão usa `e.stopPropagation()` para não abrir o `PerDetailModal`.
- Não toca em `per_situacao` (nem remove o registro "PER deferido" criado no momento do ressarcimento) — o usuário pediu apenas atualização de coluna.
- Não altera DCOMPs nem usa `excluido`.

## Detalhes técnicos

- Adicionar `useMutation` `deleteRessarcimentoMutation` no componente:
  - Pega `user.id` via `useAuth()` (já usado em hooks similares como `useAuditLog`).
  - Faz o `update` com cast `as any` (padrão já usado no arquivo para `per`).
  - On success: `toast.success`, `invalidateQueries` para `['perdcomp-per']`, `['per-detail']`, `['per-situacoes']`.
  - On error: `toast.error`.
- Registrar o evento via `useAuditLog`:
  ```ts
  logAction({
    area: 'dev',
    entity_type: 'project', // ou novo tipo se aplicável — manter 'project' por enquanto não cabe; usar entity_name = nr_per e details textual
    ...
  })
  ```
  → na verdade `useAuditLog` não tem tipo para PER. Vou usar `details` textual e `entity_id = nr_per` com `entity_type` mais próximo (`'project'`). **Decisão:** seguir convenção mínima — registrar em `audit_logs` via `useAuditLog` com `action: 'updated'`, `entity_name: 'PER ' + nr_per`, `changed_fields: { vlr_ressarcido: { old, new: null } }`. Se isso não couber no enum `entity_type`, omitir o log (o trigger de atualização da coluna `atualizado_em/por` já é a trilha mínima).
- Estado local: `const [ressarcimentoToDelete, setRessarcimentoToDelete] = useState<{ nr_per: string; valor: number } | null>(null)`.
- Importar `AlertDialog*` de `@/components/ui/alert-dialog`.

## Fora de escopo

- Não criar migration (colunas `atualizado_em`/`atualizado_por` em `per` já existem).
- Não mexer no `PerDetailModal` nem no fluxo de registrar ressarcimento.
- Não usar soft delete (`excluido`).
