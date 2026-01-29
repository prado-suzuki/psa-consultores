

## Plano: Comportamento de Sessão Após Sincronização

### Comportamento Atual vs Desejado

| Aspecto | Comportamento Atual | Comportamento Desejado |
|---------|---------------------|------------------------|
| Sessão | Permanece ativa com status `SINCRONIZADO` | É finalizada/arquivada |
| Filtros | Permanecem preenchidos | **Mantidos** (cliente, contribuinte, período) |
| Dados da grid | Permanecem estáticos | **Recarregados** com classificações atualizadas |
| Decisões locais | Limpas | Limpas |
| Próxima alteração | Continua na mesma sessão | **Nova sessão** criada automaticamente |

---

### Lógica de Negócio

```text
┌─────────────────────────────────────────────────────────────────┐
│  Fluxo de Sincronização                                         │
├─────────────────────────────────────────────────────────────────┤
│  1. Usuário clica "Salvar Alterações"                           │
│     ↓                                                           │
│  2. Envia decisões para API /classificacoes/sync                │
│     ↓                                                           │
│  3. Atualiza sessão → status: 'FINALIZADO'                      │
│     ↓                                                           │
│  4. Limpa activeSessaoId e localDecisions                       │
│     ↓                                                           │
│  5. MANTÉM filtros (cliente, contribuinte, datas)               │
│     ↓                                                           │
│  6. Re-dispara busca → Recarrega dados com classificações       │
│     ↓                                                           │
│  7. Próxima classificação → Cria NOVA sessão automaticamente    │
└─────────────────────────────────────────────────────────────────┘
```

---

### Alterações Necessárias

#### Arquivo: `src/pages/equipe/dev/AuditoriaFiscal.tsx`

##### 1. Modificar `handleSaveChanges` (linhas 510-598)

Após sincronização bem-sucedida:

```tsx
// Comportamento atual (linhas 571-583)
await supabase
  .from('difal_sessao')
  .update({
    status: 'SINCRONIZADO',
    sincronizado_em: new Date().toISOString(),
  })
  .eq('id', activeSessaoId);

setPendingDecisionsCount(0);
setLocalDecisions(new Set());
queryClient.invalidateQueries({ queryKey: ['difal-classificacoes'] });

// Comportamento NOVO
await supabase
  .from('difal_sessao')
  .update({
    status: 'FINALIZADO',  // Marcar como finalizado
    sincronizado_em: new Date().toISOString(),
  })
  .eq('id', activeSessaoId);

// Deletar decisões locais da sessão finalizada
await supabase
  .from('difal_decisao')
  .delete()
  .eq('sessao_id', activeSessaoId);

// Limpar estado de sessão (mas MANTER filtros)
setActiveSessaoId(null);
setPendingDecisionsCount(0);
setLocalDecisions(new Set());

// Re-buscar dados com classificações atualizadas
queryClient.invalidateQueries({ queryKey: ['difal-classificacoes'] });
queryClient.invalidateQueries({ queryKey: ['difal-nfes'] });
```

##### 2. Modificar `handleSearch` (linhas 405-491)

Ajustar para não buscar sessões com status `FINALIZADO`:

```tsx
// Linha 421 - Adicionar filtro de status
const { data: existingSession } = await supabase
  .from('difal_sessao')
  .select('id')
  .eq('usuario_id', user?.id || 'unknown')
  .eq('status', 'EM_ANDAMENTO')  // Já está assim ✓
  .maybeSingle();
```

##### 3. Modificar `loadLastSession` (linhas 184-258)

Ignorar sessões finalizadas ao restaurar:

```tsx
// Linha 192-198 - Adicionar filtro para não restaurar sessões finalizadas
const { data: lastSession, error } = await supabase
  .from('difal_sessao')
  .select('*')
  .eq('usuario_id', user.id)
  .in('status', ['EM_ANDAMENTO', 'SINCRONIZADO'])  // Excluir FINALIZADO
  .order('criado_em', { ascending: false })
  .limit(1)
  .maybeSingle();
```

Ou alternativamente, apenas buscar sessões `EM_ANDAMENTO`:

```tsx
.eq('status', 'EM_ANDAMENTO')
```

---

### Fluxo Completo Após Implementação

1. **Usuário faz classificações** → Decisões salvas em `difal_decisao` com `sessao_id`
2. **Usuário clica "Salvar Alterações"**:
   - Decisões enviadas para API
   - Sessão marcada como `FINALIZADO`
   - Decisões locais deletadas do Supabase
   - `activeSessaoId` limpo
   - Filtros mantidos
   - Dados recarregados
3. **Grid atualizada** → Itens agora mostram status `validado` (vindos da API)
4. **Usuário faz nova classificação** → Nova sessão criada automaticamente pelo `handleSearch`

---

### Consideração: Restauração de Sessão

Com a mudança, quando o usuário entra na ferramenta:
- Se existir sessão `EM_ANDAMENTO` → Restaura e continua
- Se existir apenas sessões `FINALIZADO` → Não restaura (começa limpo)

Isso evita confusão onde o usuário voltava para uma sessão já sincronizada.

