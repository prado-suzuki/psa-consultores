

## Redesign UX do NewClientModal - Layout vertical, limpeza visual e ajuste Inscrição Estadual

### 1. Inscrição Estadual: Sim / Isento (obrigatório)

Substituir o Checkbox "Possui Insc. Estadual?" por um **Select obrigatório** com duas opções:
- **Sim** - exibe o campo de input para digitar o número
- **Isento** - oculta o campo de input e limpa o valor

O campo `possui_inscricao_estadual: boolean` será substituído por `situacao_inscricao_estadual: string` (valores: `'sim'` | `'isento'` | `''`). A validação em `addEntity` exigirá que este campo esteja preenchido, e quando `'sim'`, o número da inscrição será obrigatório.

### 2. Remover cores divergentes dos botões "Adicionar à Lista"

Atualmente cada aba tem um botão com cor própria:
- Contribuintes: `bg-purple-600` (linha 785)
- Participantes: `bg-amber-500` (linha 848)
- OS: `bg-emerald-600` (linha 954)

Todos serão padronizados para o estilo padrão do sistema (sem classe de cor explícita, usando o `variant="default"` que já usa teal/primary).

### 3. Remover ícones de "+" dos títulos e botões

- Remover `<Plus size={16} />` dos títulos "Novo Contribuinte" (linha 703), "Novo Participante" (linha 819), "Nova OS" (linha 888)
- Remover `<Plus size={16} />` dos botões "Adicionar à Lista" (linhas 786, 849, 955)
- Manter o ícone `<Plus>` ou `<Pencil>` apenas no header principal do modal (linha 497)

### 4. Layout vertical em todas as abas

Mudar a orientação dos formulários de grid horizontal (`grid-cols-12`) para **layout vertical empilhado**. Cada campo ocupará a largura total (`col-span-12`) ou será agrupado em pares quando fizer sentido semântico (ex: Município + UF, Data Início + Data Fim).

**Aba Cliente:**
- Nome do Cliente: largura total
- Categoria + Status: lado a lado (6+6)
- Área do negócio: largura total
- Telefone: largura total
- Município + UF: lado a lado (9+3)
- Tipo Relacionamento: largura total
- Tipo de produto/segmento: largura total
- Equipe responsável: largura total
- Região: largura total

**Aba Contribuintes:**
- Tipo + CPF/CNPJ: lado a lado (3+9)
- Razão Social: largura total
- Situação Insc. Estadual + Nº Inscrição: lado a lado (6+6)
- CNAE + Setor + Simples Nacional (PJ): lado a lado (4+4+4)
- Logradouro: largura total
- Bairro + Município + UF: lado a lado (4+5+3)

**Aba Participantes:**
- Nome + Cargo: lado a lado (6+6)
- Email + Telefone: lado a lado (6+6)
- Observações: largura total

**Aba OS:**
- Ordem de Serviço + Data de Emissão: lado a lado (6+6)
- Gestor Responsável: largura total
- Nome do Projeto: largura total
- Descrição do Projeto: largura total
- Data Início + Data Fim: lado a lado (6+6)
- Valor do Projeto: largura total
- Reembolso km + Reembolso refeição: lado a lado (6+6)

### 5. Cards de itens já adicionados

Manter os cards existentes (contribuintes, participantes, OS) mas remover as cores específicas (purple-50, amber-50, emerald-50) e padronizar com `bg-muted/30 border` neutro.

### Resumo técnico de alterações

| Local | O que muda |
|---|---|
| Interface `DraftEntity` | `possui_inscricao_estadual: boolean` vira `situacao_inscricao_estadual: string` |
| Estado `draftEntity` | Default `situacao_inscricao_estadual: ''` |
| `addEntity` | Validação: `situacao_inscricao_estadual` obrigatório; se `'sim'`, `inscricao_estadual` obrigatório |
| `loadData` | Mapear: se tinha `inscricao_estadual` preenchido, `situacao_inscricao_estadual: 'sim'`, senão `'isento'` |
| Formulário Contribuintes | Select "Situação Insc. Estadual" com Sim/Isento; Input condicional |
| Todos os formulários | Grid classes mudam de `md:col-span-N` para layout mais vertical |
| Botões "Adicionar" | Remover cores custom, usar variant default |
| Títulos de seção | Remover ícone `<Plus>` |
| Cards de itens | Cores neutras em vez de purple/amber/emerald |

### O que NÃO muda

- Nenhuma alteração no banco de dados
- Lógica de save, validações existentes, queries de líderes
- Footer com navegação entre abas
- Header do modal

