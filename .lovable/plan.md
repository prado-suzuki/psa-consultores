

## Visualizacao completa e edicao inline de itens (Contribuintes, Participantes, OS)

### Problema atual
Os cards de contribuintes, participantes e OS mostram apenas um resumo (nome + CPF/CNPJ). O usuario nao consegue ver todos os campos nem editar um item individual sem ativar o botao "Editar" global.

### Solucao proposta

Substituir os cards resumidos por cards **expansiveis**. Ao clicar em um card, ele expande e mostra todos os campos do item em modo leitura. Cada card expandido tera um botao "Editar" proprio que habilita edicao apenas daquele item, independente do modo global do modal.

### Comportamento detalhado

#### Cards de Contribuintes
- **Fechado:** Mostra razao social + CPF/CNPJ (como hoje)
- **Aberto (clique):** Expande e mostra TODOS os campos em layout de grade (tipo pessoa, CPF/CNPJ, razao social, nome fantasia, inscricao estadual, CNAE, simples nacional, CEP, logradouro, numero, complemento, bairro, municipio, UF) -- todos em modo leitura (texto, nao inputs)
- **Botao "Editar" no card:** Transforma os textos em inputs editaveis. Mostra botoes "Salvar" e "Cancelar" dentro do card
- **Botao "Remover":** Visivel apenas quando o card esta expandido (nao precisa do modo global)

#### Cards de Participantes
- **Fechado:** Nome + cargo
- **Aberto:** Nome, cargo, email, telefone, observacoes
- **Mesma logica de edicao inline**

#### Cards de OS
- **Fechado:** OS numero + nome projeto + valor (como hoje)
- **Aberto:** Todos os campos (OS, data emissao, gestor, nome projeto, descricao, datas inicio/fim, valores)
- **Mesma logica de edicao inline**

### Implementacao tecnica

**Arquivo unico:** `src/components/equipe/dev/NewClientModal.tsx`

#### 1. Novos estados
```ts
const [expandedEntityId, setExpandedEntityId] = useState<number | null>(null);
const [editingEntityId, setEditingEntityId] = useState<number | null>(null);
const [editingEntityData, setEditingEntityData] = useState<Partial<DraftEntity> | null>(null);

// Mesma logica para participants e contracts
const [expandedParticipantId, setExpandedParticipantId] = useState<number | null>(null);
const [editingParticipantId, setEditingParticipantId] = useState<number | null>(null);
const [editingParticipantData, setEditingParticipantData] = useState<Partial<DraftParticipant> | null>(null);

const [expandedContractId, setExpandedContractId] = useState<number | null>(null);
const [editingContractId, setEditingContractId] = useState<number | null>(null);
const [editingContractData, setEditingContractData] = useState<Partial<DraftContract> | null>(null);
```

#### 2. Logica dos cards

**Clique no card:** Toggle expand/collapse via `expandedEntityId`

**Botao "Editar" dentro do card expandido:**
- Seta `editingEntityId = item._id`
- Copia dados do item para `editingEntityData`
- Campos se tornam inputs editaveis

**Botao "Salvar" (dentro do card):**
- Atualiza o item no array `entities` com os dados de `editingEntityData`
- Limpa `editingEntityId` e `editingEntityData`

**Botao "Cancelar":**
- Descarta alteracoes, limpa `editingEntityId`

**Botao "Remover":**
- Visivel no card expandido, remove do array

#### 3. Layout do card expandido (leitura)

Exibir campos como pares label/valor em grid, sem inputs:
```text
+------------------------------------------+
| AGRO AMAZONIA PRODUTOS AGRO...  [Editar] |
| 13.563.680/0001-01              [Remover]|
|------------------------------------------|
| Tipo: PJ          CNAE: 0111-3/01       |
| IE: Isento         Simples: Nao          |
| CEP: 78000-000                           |
| Logradouro: Av. Brasil, 1500            |
| Bairro: Centro   Municipio: Cuiaba      |
| UF: MT                                   |
+------------------------------------------+
```

#### 4. Layout do card expandido (edicao)

Mesmos campos, mas como inputs editaveis (reutilizando o mesmo layout de grid do formulario "Novo Contribuinte"):
```text
+------------------------------------------+
| [Tipo: PJ v]  [CPF/CNPJ: ________]      |
| [Razao Social: ________]                |
| ...                                       |
|              [Cancelar] [Salvar]          |
+------------------------------------------+
```

#### 5. Formulario "Adicionar novo" 

O formulario de adicionar novo item continua existindo, mas:
- Em modo `readOnly` global: fica oculto (como hoje)
- Em modo edicao global: visivel (como hoje)
- A edicao inline de itens individuais funciona **independente** do modo global

#### 6. Resumo de mudancas

- Cards clicaveis com cursor pointer e animacao de expansao
- Cada tipo de item (contribuinte, participante, OS) tem seus proprios estados de expansao/edicao
- Edicao inline nao depende do botao "Editar" global do header
- O botao "Editar" global continua controlando: campos do cliente (aba 1) e visibilidade dos formularios "Adicionar novo"
- Nenhuma alteracao de banco de dados necessaria

