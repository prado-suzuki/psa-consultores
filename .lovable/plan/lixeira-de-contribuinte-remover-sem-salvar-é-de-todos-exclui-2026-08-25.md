# Lixeira de contribuinte: remover sem salvar é de todos, excluir salvo é sublíder+

## Objetivo

Na aba Contribuintes do modal de cliente, a lixeira hoje exige `admin` para qualquer
linha. Isso trava quem clicou em "Adicionar contribuinte" sem querer: a linha em
branco reprova a validação e aborta o save inteiro. A mudança alinha a tela ao que
o banco já permite.

## O que muda (só frontend)

Arquivo: `src/components/equipe/client-form/ContribuintesTab.tsx`

1. **Papéis do hook**: trocar `const { isAdmin } = useAuth()` por
   `const { isAdmin, isLider, isSublider } = useAuth()` e calcular
   `podeExcluirSalvo = isAdmin || isLider || isSublider` — checagem explícita
   porque no AuthContext os três são estritos (admin não engloba líder/sublíder).

2. **Decisão por linha**, no lugar do `isAdmin ?` único de hoje (linhas 365-412):
   - **Linha nunca salva** (`ent._dbId == null`): qualquer pessoa que esteja
     editando o formulário vê o botão ativo com o AlertDialog. Sem checagem de
     papel — remover uma linha local não toca o banco: o save monta
     `removedContribIds` a partir dos ids vindos do banco
     (`useSaveClientTransaction.ts:396-400`), então linha sem `_dbId` nunca
     vira operação de banco.
   - **Linha salva** (`ent._dbId` presente) e `podeExcluirSalvo`: botão ativo com
     AlertDialog, como hoje para admin. O banco autoriza via
     `rls_contribuinte_update` (`has_role_or_higher(..., 'sublider')` +
     `cliente_visivel_para`), confirmado no baseline.
   - **Linha salva sem papel suficiente**: botão bloqueado continua visível, mas
     com texto corrigido — "equipe Digital" não é papel do sistema. Novo texto:
     toast "Você precisa do papel Sublíder ou superior para excluir
     contribuintes já cadastrados." e tooltip na mesma linha.

3. **Texto de confirmação por caso**: o AlertDialog hoje diz que o contribuinte
   "só deixa de existir quando você salvar" — falso para linha nunca salva.
   - Linha não salva: "sai da lista agora. Nada será removido do banco, porque
     este contribuinte ainda não foi salvo."
   - Linha salva: mantém o texto atual (soft-delete acontece no Salvar;
     "Cancelar" desfaz).

## O que não muda

- `RepresentantesTab.tsx` — o `isAdmin` dele guarda acesso a chamados e o banco
  exige admin de verdade (trigger 42501). Fora do escopo.
- Nenhuma migration, policy ou RPC. O banco já autoriza o caso novo.
- Lógica de save (`useSaveClientTransaction.ts`) — o soft-delete verificado já
  existe e já usa o caminho de UPDATE coberto por `rls_contribuinte_update`.

## Testes (`ContribuintesTab.test.tsx`)

O arquivo já existe e hoje moca `useAuth` com `{ isAdmin: true }`. Reorganizar o
mock para `vi.mock` com variável mutável de papel e cobrir:

1. **Remover linha não salva sem ser admin** (team_member): linha criada por
   "Adicionar contribuinte" (sem `_dbId`) — lixeira abre o AlertDialog e a linha
   some da lista, sem toast de permissão.
2. **Bloqueio sem papel**: `team_member` com contribuinte com `_dbId` — clique na
   lixeira dispara o toast novo ("Sublíder ou superior") e a linha permanece.
3. **Sublíder exclui contribuinte do banco**: mock `{ isSublider: true }`, linha
   com `_dbId` — AlertDialog abre e a remoção funciona.

Os testes atuais (caixa digitada da razão social) continuam passando com o mock
padrão admin.

## Verificação

- `bunx vitest run` no arquivo de teste do componente.
- `bunx eslint` nos arquivos alterados.
- Typecheck final.
