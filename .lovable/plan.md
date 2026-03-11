

## Plano: Mover número da OS para o título e reorganizar grid

### Alterações em `src/components/equipe/dev/NewClientModal.tsx`

**1. Modo Leitura (~3291-3292)**
- Remover `<FieldPair label="Ordem de Serviço" .../>` da grid
- O número já aparece no header do accordion (`OS {cont.ordem_servico}`) — sem alteração necessária lá

**2. Modo Edição (~3386-3401)**
- Alterar título de `"Dados da OS"` para `"Dados da OS — {ec.ordem_servico}"`
- Remover o bloco do campo OS (Label + Input disabled, linhas ~3392-3401)
- Primeira linha do grid fica: Data de Emissão | Data Início
- Segunda linha: Data Fim | Tipo de Produto/Segmento
- Terceira linha: Situação do Projeto | Valor do Projeto
- Quarta linha: Reembolso KM | Reembolso Refeição
- Remover o `<div />` vazio que existia após Valor do Projeto

**3. Modo Criação/Draft (~3764-3780)**
- Alterar título de `"Dados da OS"` para `"Dados da OS — {draftContract.ordem_servico || '(nova)'}"` — mas como o draft não terá número até o `addContract`, exibir apenas `"Nova OS"`
- Remover o bloco do campo OS (Label + Input disabled com "Gerando...", linhas ~3771-3780)
- Primeira linha do grid fica: Data de Emissão | Data Início
- Segunda linha: Data Fim | Tipo de Produto/Segmento
- Terceira linha: Situação do Projeto | Valor do Projeto
- Quarta linha: Reembolso KM | Reembolso Refeição

**4. Lógica `addContract()` (~1107-1115)**
- Já está correto: gera o número via `await generateNextOsNumber()` antes de adicionar. Sem alteração necessária.

**5. Remover estado "Gerando..."**
- Nenhum uso restante após remoção do campo — nada mais a limpar.

