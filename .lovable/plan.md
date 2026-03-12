

## Plano: Corrigir RLS da tabela `participante`

Executar a migração SQL fornecida para substituir as políticas RLS restritivas por políticas que permitam toda a equipe (admin, lider, sublider, team_member) operar na tabela `participante`.

### Migração SQL

Exatamente o SQL fornecido:
1. Drop das 2 policies antigas (`Admins can manage participante`, `Team members can view participante`)
2. Criação de 4 novas policies: SELECT, INSERT, UPDATE (todos os roles da equipe) e DELETE (apenas admin e lider)

### Escopo
- **Apenas** migração SQL — zero alterações de código frontend
- **Não** toca em `participante_dev`
- **Não** cria colunas ou tabelas

