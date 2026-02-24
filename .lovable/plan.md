

# Renomear "Líder" para "Líder Responsável" no Controle de Acessos

## Objetivo

Padronizar o nome da role "Líder" para "Líder Responsável" em toda a tela de Controle de Acessos (`/equipe/acessos`), mantendo consistência com o campo "Líder Responsável" usado nos formulários de projetos em `/equipe/tax/projetos/cadastro`.

## Alteracoes

Arquivo: `src/pages/equipe/EquipeControleAcessos.tsx`

1. **Formulario de criacao de usuario** (linha 1072) -- alterar label de `'Líder'` para `'Líder Responsável'`
2. **Formulario de edicao de usuario** (linha 1540) -- mesma alteracao
3. **Badge na lista de usuarios** (linha 1204) -- atualmente exibe o valor bruto da role (`lider`). Adicionar mapeamento para exibir `Líder Responsável` em vez do texto cru.

### Detalhes tecnicos

- Nas duas listas de roles (create e edit), trocar `label: 'Líder'` por `label: 'Líder Responsável'`
- Na renderizacao do badge (linha ~1204), substituir `{role}` por um mapeamento:
  - `admin` -> `Admin`
  - `team_member` -> `Equipe`
  - `lider` -> `Líder Responsável`
  - `client` -> `Cliente`

Nenhuma alteracao de banco de dados e necessaria -- o valor armazenado continua sendo `lider`.
