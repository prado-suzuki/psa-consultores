

# Refatoracao do NewClientModal -- Novas Regras de Negocio e UX

## Visao Geral
Refatorar o componente `NewClientModal.tsx` em 4 frentes: Aba Cliente, Aba Contribuintes, Aba Participantes e Fluxo de UX com prevencao de perda de dados.

---

## 1. Aba "Dados do Cliente/Grupo" -- Campo empresa_faturamento

**Alteracoes:**
- No `clientData` state (linha 194): substituir `equipe_responsavel` por `empresa_faturamento` (string, default vazio).
- No `resetAndClose` (linha 667): atualizar o reset para usar `empresa_faturamento` em vez de `equipe_responsavel`.
- No `handleSave` validacao (linha 559): trocar `equipe_responsavel` por `empresa_faturamento` com mensagem "Empresa / Faturamento e obrigatoria".
- No JSX (linhas 848-870): substituir label "Equipe responsavel" por "Empresa / Faturamento *" e trocar os SelectItems para as 8 opcoes:
  - PRADO ADVOGADOS, PRADO CONSULTORES, PRADO SUZUKI, PROFITTO, PROTENUN, PSA ADM JUDICIAL, PSA AUDITORES, PSA NORTE
- No `loadData` (linha 262): mapear `empresa_faturamento` em vez de `equipe_responsavel`.

---

## 2. Aba "Contribuintes"

### 2a. Label Razao Social
- Nas linhas 1097 e 969 (draft e inline edit): trocar label de "Razao Social *" para "Razao Social / Nome Completo *".
- Na view expandida (linha 934): trocar label "Razao Social" para "Razao Social / Nome Completo".

### 2b. Nome Fantasia bloqueado para PF
- Draft (linha 1102): adicionar `disabled={draftEntity.tipo_pessoa === 'PF'}`.
- Inline edit (linha 974): adicionar `disabled={ed.tipo_pessoa === 'PF'}`.

### 2c. Inscricao Estadual -- opcao "Nao" + bloqueio para PF
- Draft (linhas 1108-1115): adicionar `<SelectItem value="nao">Nao</SelectItem>` e adicionar `disabled={draftEntity.tipo_pessoa === 'PF'}` no Select.
- Inline edit (linhas 978-981): mesmo tratamento.
- Ao selecionar "nao", limpar o campo inscricao_estadual (mesma logica do "isento").

### 2d. CEP obrigatorio
- Label do CEP (linha 1148): adicionar asterisco "CEP *".
- Validacao `addEntity` (antes da linha 392): adicionar `if (!draftEntity.cep?.trim()) { toast.error('CEP e obrigatorio'); return; }`.
- Validacao `saveEditEntity`: adicionar mesma verificacao no inline edit.
- Label do CEP no inline edit (linha 1007): adicionar asterisco.

### 2e. Botao "Copiar endereco do primeiro contribuinte"
- No bloco "Novo Contribuinte" (apos o titulo na linha 1068, antes dos campos de endereco), adicionar um botao `variant="ghost"` visivel apenas quando `entities.length > 0`.
- Ao clicar: verificar se `entities[0].cep` existe. Se nao, toast de aviso. Se sim, copiar cep, logradouro, numero, complemento, bairro, municipio, uf para `draftEntity`.

---

## 3. Aba "Participantes"

### 3a. Interface DraftParticipant
- Adicionar `tipo_participante: string` e `acesso_chamados: boolean` a interface `DraftParticipant` (linha 81).
- Atualizar o `draftParticipant` state inicial (linha 221) com `tipo_participante: ''` e `acesso_chamados: false`.

### 3b. Campo "Tipo de Participante *"
- No JSX do draft (antes do campo Cargo, linha 1320): adicionar Select com opcoes: Socio/Proprietario, Contador, Advogado, Procurador, Representante Legal, Diretor/Gestor, Consultor Externo, Outros.
- Validacao `addParticipant` (linha 416): adicionar verificacao de tipo_participante obrigatorio.
- Cargo passa a ser opcional (remover asterisco da label e remover validacao de cargo obrigatorio na linha 418).

### 3c. Email obrigatorio
- Label (linha 1325): adicionar asterisco "Email *".
- Validacao `addParticipant` (linhas 420-423): tornar email obrigatorio (verificar preenchimento antes de validar formato).

### 3d. Switch "Acesso a Chamados"
- No JSX do draft (abaixo do campo Telefone): adicionar Switch com label "Acesso a Chamados", default false.
- No inline edit: adicionar os mesmos campos (tipo_participante, acesso_chamados).
- Na view expandida: exibir tipo_participante e acesso_chamados.

---

## 4. Fluxo de UX -- Prevencao de Perda de Dados

### 4a. onInteractOutside
- No `DialogContent` (linha 684): adicionar `onInteractOutside={(e) => e.preventDefault()}`.

### 4b. Estado hasUnsavedChanges
- Criar um estado `hasUnsavedChanges` derivado da comparacao entre os dados atuais e os dados iniciais (snapshot ao abrir o modal).
- Armazenar um snapshot dos dados iniciais (`initialSnapshot`) via useRef ao carregar o modal.
- Comparar `clientData`, `entities`, `participants`, `contracts` com o snapshot para determinar se houve alteracao.

### 4c. AlertDialog de confirmacao ao fechar
- Criar estado `showExitConfirm` (boolean).
- Interceptar: botao X (linha 719), botao Cancelar (linha 1589), e `onOpenChange` do Dialog (linha 683).
- Se `hasUnsavedChanges === true`, mostrar AlertDialog com mensagem "Voce tem dados nao salvos. Deseja sair sem salvar?" com botoes "Sair" e "Continuar Editando".
- "Sair" chama `resetAndClose()`. "Continuar Editando" fecha apenas o alerta.

---

## Resumo de alteracoes

| Area | O que muda |
|------|-----------|
| Interface `DraftParticipant` | Adiciona `tipo_participante` e `acesso_chamados` |
| State `clientData` | `equipe_responsavel` vira `empresa_faturamento` |
| State `draftParticipant` | Adiciona campos novos |
| Validacoes | CEP obrigatorio, email obrigatorio, tipo_participante obrigatorio, empresa_faturamento obrigatoria |
| JSX Aba Cliente | Novo Select com 8 empresas |
| JSX Aba Contribuintes | Labels atualizadas, campos disabled para PF, opcao "Nao" na IE, botao copiar endereco |
| JSX Aba Participantes | Select tipo_participante, Switch acesso_chamados, email obrigatorio |
| Dialog wrapper | onInteractOutside, AlertDialog de confirmacao |

Arquivo unico alterado: `src/components/equipe/dev/NewClientModal.tsx`

