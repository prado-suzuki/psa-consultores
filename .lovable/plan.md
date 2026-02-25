

## Ajustes no NewClientModal - Contribuintes e Participantes

### Arquivo: `src/components/equipe/dev/NewClientModal.tsx`

### 1. Aba Participantes - Adicionar campo "Observacoes"

- Adicionar `observacoes: string` na interface `DraftParticipant` (linha 40-46)
- Adicionar `observacoes: ''` no estado inicial `draftParticipant` (linha 123-125)
- Adicionar campo Textarea "Observacoes" no formulario de novo participante (apos telefone, col-span-12)
- Exibir observacoes no card do participante ja adicionado (truncado)
- Atualizar `resetAndClose` e `addParticipant` para incluir o novo campo
- Importar `Textarea` de `@/components/ui/textarea`

### 2. Aba Contribuintes - Adicionar campos de endereco

- Adicionar `logradouro: string` e `bairro: string` na interface `DraftEntity` (linha 26-38)
- Adicionar os campos no estado inicial `draftEntity` (linha 115-119)
- Adicionar inputs no formulario: Logradouro (col-span-5), Bairro (col-span-3), Municipio (col-span-3 - ja existe), UF (col-span-1 - ja existe)
- Atualizar `addEntity` reset e `loadData` para incluir os novos campos

### 3. Aba Contribuintes - Filtro condicional PF/PJ

Quando o tipo de pessoa for **PF**, ocultar os seguintes campos:
- CNAE
- Setor
- Simples Nacional (Optante)

Esses campos so aparecerao quando `draftEntity.tipo_pessoa === 'PJ'`.

Implementacao: envolver os 3 campos (linhas 572-596) em um bloco condicional `{draftEntity.tipo_pessoa === 'PJ' && (...)}`.

Nos cards de contribuintes ja adicionados, ocultar o badge de setor e simples quando `tipo_pessoa === 'PF'`.

### 4. Aba Contribuintes - Remover campo Telefone

- Remover o campo "Telefone" do formulario de contribuinte (linhas 597-600)
- Remover `telefone` da interface `DraftEntity`, do estado inicial e do reset em `addEntity`
- Nao afeta o payload de save (telefone nao era enviado ao banco)

### Resumo das alteracoes

| Local | Alteracao |
|---|---|
| Interface `DraftParticipant` | + `observacoes: string` |
| Interface `DraftEntity` | + `logradouro: string`, `bairro: string`; - `telefone: string` |
| Formulario Participantes | + campo Textarea "Observacoes" |
| Formulario Contribuintes | + Logradouro, Bairro; - Telefone; campos CNAE/Setor/Simples ocultos quando PF |
| Cards de contribuintes | Ocultar badge setor/simples quando PF |
| `addEntity` / `addParticipant` / `resetAndClose` / `loadData` | Ajustar para novos campos |

### O que NAO muda

- Nenhuma alteracao no banco de dados
- Demais abas (Dados do Cliente, OS) permanecem iguais
- Payload de save permanece compativel (campos novos de endereco ficam apenas no estado local ate criacao das colunas)

