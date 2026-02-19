

## Adicionar role "Lider" ao cadastro de usuarios

Adicionar a opcao "Lider" nos formularios de criacao e edicao de usuarios na pagina de Controle de Acessos (`/equipe/acessos`) e na pagina de Admin Usuarios.

---

### O que muda

**Arquivo: `src/pages/equipe/EquipeControleAcessos.tsx`**

1. **Formulario de criacao (linha ~914):** Adicionar item `lider` ao array de roles:
   - `{ value: 'lider', label: 'Lider', desc: 'Acesso a todos os projetos e tarefas de todas as areas' }`
   - Posicionar entre "Membro da Equipe" e "Cliente"

2. **Formulario de edicao (linha ~1212):** Mesmo ajuste — adicionar `lider` ao array de roles

3. **Badge na lista de usuarios (linha ~1034):** Adicionar condicao de cor para `lider`:
   - `border-amber-200 text-amber-600 bg-amber-50` (cor diferenciada para facil identificacao)

**Arquivo: `src/pages/administracao/AdminUsuarios.tsx`**

4. **Formulario de criacao (linha ~207):** Adicionar `lider` ao array de roles com icone e descricao

5. **Funcao `getRoleBadge` (linha ~148):** Adicionar case para `lider` com Badge amarelo/amber

6. **Botoes de acao na tabela (linha ~259):** Adicionar botoes "+ Lider" / "- Lider" para gerenciar a role diretamente

---

### O que NAO muda

- **Banco de dados:** A role `lider` ja existe no enum `app_role` — nenhuma migration necessaria
- **Edge function `create-team-member`:** Ja aceita qualquer role via array `roles` — nenhuma alteracao necessaria
- **Logica de permissoes:** A diferenciacao de acesso (lider ve tudo vs team_member ve so seus projetos) sera implementada em etapa futura nos componentes de listagem de projetos/tarefas

---

### Resumo de alteracoes

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/equipe/EquipeControleAcessos.tsx` | Adiciona "Lider" nos forms de criar/editar + badge na lista |
| `src/pages/administracao/AdminUsuarios.tsx` | Adiciona "Lider" no form de criar + badge + botoes de acao |

