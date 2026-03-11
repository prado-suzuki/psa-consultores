

## Plano: Persistência local com salvamento único no final

### Contexto

Atualmente, o `executeSave` persiste cliente, contribuintes, participantes e OS diretamente no banco em sequência. Se qualquer passo falha, os anteriores já foram commitados, causando registros órfãos e duplicatas.

### Mudança principal

Todo o fluxo de "Adicionar" dentro do modal (contribuinte, participante, OS) permanece **apenas em estado local** (arrays `entities`, `participants`, `contracts` — que já existem). A persistência no banco só acontece quando o usuário clica no botão final "Salvar Cliente".

### O que muda

**1. Rollback automático em caso de erro (criação)**

No `executeSave`, quando `!isEditing` e ocorrer erro após inserir o cliente:
- Deletar o `clienteId` recém-criado (CASCADE remove filhos)
- Isso previne registros órfãos

**2. Validação prévia antes de qualquer INSERT**

Antes de iniciar o `executeSave`:
- Validar que todas as OS possuem `distribuicao_receita` com `id_centro_custo` não-vazio (UUID válido)
- Validar que a soma dos percentuais de cada OS é 100%
- Se inválido, mostrar toast e abortar sem tocar no banco

**3. Cache local via `useDraftPersistence` (já existe)**

O hook `useDraftPersistence` já salva rascunho em `sessionStorage` com debounce de 500ms. O que será ajustado:
- Incluir `entities`, `participants`, `contracts` e `inscricoesMap` no objeto persistido pelo draft
- Atualmente o draft provavelmente só persiste `clientData` — expandir para todo o estado do modal
- Isso garante que o usuário não perde progresso ao trocar de aba ou fechar acidentalmente, sem salvar campo a campo no banco

**4. Verificação de duplicidade por nome**

Antes do insert, consultar `clienteTable` por `nome = clientData.nome.trim()` e `excluido = false`. Se existir, exibir confirmação antes de prosseguir.

### Arquivo alterado

`src/components/equipe/dev/NewClientModal.tsx`

### O que NÃO muda

- O fluxo de edição (`isEditing`) continua com upsert/update seletivo
- Os arrays locais `entities`, `participants`, `contracts` já funcionam como cache — o botão "Adicionar à lista" já só adiciona ao array local
- A estrutura de tabs e navegação do modal permanece igual

