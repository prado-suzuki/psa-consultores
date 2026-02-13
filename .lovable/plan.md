
## Plano: Sistema de Auditoria (Logs) para Tax e OSG

### Objetivo
Criar uma tabela centralizada de logs de auditoria que registre criacao, edicao e exclusao de projetos, tarefas e subtarefas nas areas Tax e OSG. Adicionar uma pagina "Auditoria" no menu lateral de cada area, com acesso controlado por permissao.

---

### 1. Nova tabela: `audit_logs`

Tabela centralizada para registrar todas as acoes:

```text
audit_logs
- id (uuid, PK)
- area (text) -- 'tax' ou 'osg'
- entity_type (text) -- 'project', 'task', 'subtask'
- entity_id (uuid)
- entity_name (text) -- nome/titulo do item para exibicao
- action (text) -- 'created', 'updated', 'deleted'
- changed_fields (jsonb, nullable) -- para updates: { campo: { old: X, new: Y } }
- performed_by (uuid, FK -> auth.users)
- performed_at (timestamptz, default now())
- details (text, nullable) -- informacao adicional livre
```

**RLS**: Admins veem tudo. Membros de projeto veem logs dos projetos dos quais participam (`tax_project_members`). Para OSG, membros da equipe com acesso a area veem logs de OSG.

---

### 2. Registrar logs automaticamente no frontend

Nas mutations de criacao, edicao e exclusao em `FiscalProjetosCadastro.tsx` e `FiscalDemandasTarefas.tsx`, inserir um registro na tabela `audit_logs` apos cada operacao bem-sucedida.

Exemplo para criacao de projeto:
```text
Apos insert de tax_project:
  -> insert audit_logs { area: 'tax', entity_type: 'project', action: 'created', entity_name: nome_do_projeto, performed_by: user.id }
```

Exemplo para edicao de tarefa:
```text
Apos update de fiscal_task:
  -> insert audit_logs { area: 'tax', entity_type: 'task', action: 'updated', entity_name: titulo, changed_fields: { status: { old: 'backlog', new: 'done' } }, performed_by: user.id }
```

Um hook utilitario `useAuditLog` sera criado para facilitar a insercao de logs em qualquer componente.

---

### 3. Pagina de Auditoria (Tax)

Nova pagina: `/equipe/tex/auditoria`

**Conteudo**:
- Tabela com filtros por tipo de entidade (projeto/tarefa/subtarefa), acao (criacao/edicao/exclusao), usuario e periodo
- Cada linha mostra: data/hora, usuario, acao, entidade, detalhes das alteracoes
- Para updates, botao de expandir para ver os campos alterados (valor anterior e novo)

**Menu lateral**: Adicionar item "Auditoria" com icone `Shield` no `FiscalSidebar.tsx`, abaixo dos itens existentes.

---

### 4. Pagina de Auditoria (OSG)

Nova pagina: `/equipe/osg/auditoria`

**Conteudo**: Mesma estrutura da pagina Tax, filtrada por `area = 'osg'`.

**Menu lateral**: Adicionar item "Auditoria" no `OsgLayout.tsx` na navegacao lateral.

---

### 5. Controle de acesso

- Registrar `/equipe/tex/auditoria` e `/equipe/osg/auditoria` no `protectedPages.ts`
- Envolver as rotas com `PageAccessGate` em `App.tsx`
- O administrador podera liberar acesso a pagina de Auditoria para lideres especificos no painel de Controle de Acessos

---

### Resumo das Alteracoes

| Componente | Alteracao |
|---|---|
| Migracao SQL | Criar tabela `audit_logs` com RLS |
| `src/hooks/useAuditLog.ts` | Hook utilitario para inserir logs |
| `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx` | Inserir logs em create/update/delete |
| `src/pages/equipe/fiscal/FiscalDemandasTarefas.tsx` | Inserir logs em create/update/delete de tarefas |
| `src/pages/equipe/fiscal/FiscalAuditoria.tsx` | Nova pagina de auditoria Tax |
| `src/pages/equipe/osg/OsgAuditoria.tsx` | Nova pagina de auditoria OSG |
| `src/components/equipe/fiscal/FiscalSidebar.tsx` | Adicionar item "Auditoria" no menu |
| `src/components/equipe/osg/OsgLayout.tsx` | Adicionar item "Auditoria" no menu |
| `src/config/protectedPages.ts` | Registrar as 2 paginas de auditoria |
| `src/App.tsx` | Adicionar rotas com PageAccessGate |

### Resultado Esperado
- Toda criacao, edicao e exclusao de projetos/tarefas sera registrada automaticamente
- Lideres com acesso liberado poderao consultar o historico completo de alteracoes
- Logs mostram quem fez, quando fez e o que mudou (com valores anteriores e novos)
