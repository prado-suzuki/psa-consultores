

## Criar role "lider" e filtrar dropdowns no cadastro de projetos

### Objetivo
Adicionar o role `lider` ao sistema, atribuir a Washington, Felipe e Ricardo, e filtrar os campos de selecao no formulario de cadastro de projetos:
- **Lider Responsavel** (`leader_id`): exibir apenas usuarios com role `lider`
- **Responsavel Interno** (`responsible_id`): exibir apenas usuarios com role `team_member` que NAO tenham role `lider`

---

### Etapas

#### 1. Migration no banco de dados
Executar uma migration com dois comandos:

- `ALTER TYPE app_role ADD VALUE 'lider'` -- adiciona o valor ao enum
- `INSERT INTO user_roles` com os 3 user_ids fornecidos e role `lider`

#### 2. Atualizar o frontend (FiscalProjetosCadastro.tsx)

Atualmente o componente busca todos os `profiles` e usa a mesma lista para ambos os selects. A mudanca sera:

- **Nova query**: buscar `user_roles` para obter os roles de cada usuario
- **Listas filtradas com `useMemo`**:
  - `lideres`: usuarios que possuem role `lider` (cruzando profiles com user_roles)
  - `responsaveisInternos`: usuarios com role `team_member` que NAO possuem role `lider`
- **Atualizar os `<Select>`**:
  - Campo "Lider Responsavel" usa a lista `lideres`
  - Campo "Responsavel Interno" usa a lista `responsaveisInternos`
- A lista de "Membros do Projeto" continua usando todos os `teamMembers` (profiles)

#### 3. Atualizar AuthContext (opcional, se necessario)

O AuthContext atual rastreia `isAdmin` e `isTeamMember`. Nao e necessario adicionar `isLider` ao contexto global pois o filtro e feito apenas localmente no formulario de cadastro.

---

### Detalhes tecnicos

```text
Query nova (user_roles):
  SELECT user_id, role FROM user_roles
  WHERE role IN ('lider', 'team_member')

Logica de filtro:
  lideres = profiles onde user_id aparece com role='lider' em user_roles
  responsaveisInternos = profiles onde user_id aparece com role='team_member'
                         E NAO aparece com role='lider'
```

Arquivos modificados:
- `supabase/migrations/` -- nova migration (enum + inserts)
- `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx` -- nova query + filtros nos selects

