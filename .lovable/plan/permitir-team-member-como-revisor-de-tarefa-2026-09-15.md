# Permitir team_member como revisor de tarefa

## Resultado
Membros da equipe vinculados ao cluster da tarefa poderão ser escolhidos e confirmados como revisores, desde que sejam diferentes do responsável.

## Implementação
1. Criar uma migration idempotente atualizando `public.is_valid_org_task_reviewer` para aceitar `team_member` ou papel superior.
2. Atualizar a mensagem da validação para refletir a nova regra, sem mudar as demais restrições de cluster e responsável.
3. Aplicar a migration apenas no sandbox compartilhado com `bun run db:sync --apply`.
4. Validar o envio para revisão e conferir typecheck/build do preview.

## Limites
- Não alterar a visibilidade geral de tarefas.
- Não publicar nem aplicar DDL em produção; a migration ficará pronta para o fluxo humano de produção.
