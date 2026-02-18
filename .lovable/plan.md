
# Correcao: Permissoes de area nao sao aplicadas ao criar usuario

## Problema

Ao criar um usuario com areas de acesso selecionadas (ex: Digital, Tax), as permissoes individuais de pagina nao sao gravadas automaticamente. O usuario precisa configura-las manualmente depois.

## Causa raiz

A edge function `create-team-member` retorna o ID do usuario no campo `user_id`:

```json
{ "success": true, "user_id": "abc-123", "message": "..." }
```

Porem, o codigo em `EquipeControleAcessos.tsx` (linha 269) verifica `data?.user?.id`, que e `undefined`. Por isso, a condicao falha silenciosamente e as permissoes nunca sao inseridas.

## Correcao

### Arquivo: `src/pages/equipe/EquipeControleAcessos.tsx`

Linha 269 - Alterar a condicao e referencia do ID:

```
DE:  if (newUser.roles.includes('team_member') && newUser.areas.length > 0 && data?.user?.id) {
PARA: if (newUser.roles.includes('team_member') && newUser.areas.length > 0 && data?.user_id) {
```

Linha 279 - Alterar a referencia ao gravar os registros:

```
DE:  user_id: data.user.id,
PARA: user_id: data.user_id,
```

## Resumo

- 1 arquivo alterado (`EquipeControleAcessos.tsx`)
- 2 linhas corrigidas (269 e 279)
- Causa: nome do campo retornado pela edge function (`user_id`) diferente do esperado pelo frontend (`user.id`)
