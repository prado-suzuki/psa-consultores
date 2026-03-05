

# Aviso de dados não adicionados à lista

## Problema
O usuário pode preencher campos em Contribuintes, Participantes ou OS, mas esquecer de clicar "Adicionar à Lista". Os dados do formulário draft são perdidos silenciosamente ao salvar ou navegar entre abas.

## Solução

**Arquivo:** `src/components/equipe/dev/NewClientModal.tsx`

### 1. Criar funções de detecção de draft preenchido

Três funções helper que verificam se o draft de cada aba tem dados significativos preenchidos:

- `hasDraftEntityData()` — verifica se `draftEntity` tem `nome_razao_social` ou `cpf_cnpj` preenchido
- `hasDraftParticipantData()` — verifica se `draftParticipant` tem `nome` preenchido
- `hasDraftContractData()` — verifica se `draftContract` tem `ordem_servico` ou `valor_projeto > 0` preenchido

### 2. Adicionar estado para o modal de aviso

- `showDraftWarning` (boolean) — controla a visibilidade do AlertDialog de aviso
- `draftWarningContext` — armazena qual ação disparou o aviso (`"save"` ou `"navigate"`) e a aba destino, para continuar a ação após confirmação

### 3. Interceptar `handleSave`

Antes de executar o save, verificar as três funções. Se alguma retornar `true`, exibir um AlertDialog listando quais abas têm dados não adicionados (ex: "Contribuintes, OS"), com opções:
- **"Voltar e adicionar"** — fecha o alerta e navega para a aba correspondente
- **"Salvar mesmo assim"** — descarta os drafts e prossegue com o save normal

### 4. Interceptar navegação entre abas (handleNext, handleBack, clique direto na tab)

Ao sair de uma aba que tem draft preenchido, exibir o mesmo aviso com opções:
- **"Voltar e adicionar"** — cancela a navegação
- **"Continuar sem adicionar"** — limpa o draft e navega

### 5. AlertDialog de aviso

Reutilizar o componente `AlertDialog` já importado. Mensagem dinâmica indicando quais abas têm dados pendentes.

### Abrangência

Como o `NewClientModal` é compartilhado entre Tax (`FiscalCadastrosClientes` → `GestaoClientesContent`) e a ferramenta de Gestão de Clientes (`GestaoClientes`), a alteração em um único arquivo (`NewClientModal.tsx`) cobre ambas as áreas automaticamente.

