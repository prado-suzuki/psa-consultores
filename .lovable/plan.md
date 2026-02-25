

## Refatoracao da aba "OS - Ordem de Servico"

Substituir todo o conteudo atual da aba "contratos" (linhas 774-940) por um formulario novo alinhado ao JSON fornecido. A estrutura de contratos/servicos existente sera removida.

### Arquivo: `src/components/equipe/dev/NewClientModal.tsx`

### 1. Atualizar interface `DraftContract` (linhas 55-64)

Substituir a interface atual por:

```text
interface DraftContract {
  _id: number;
  ordem_servico: string;        // texto livre
  data_emissao: string;         // date input
  nome_projeto: string;         // texto livre
  descricao_projeto: string;    // textarea
  data_inicio_projeto: string;  // date input
  data_fim_projeto: string;     // date input
  valor_projeto: number;        // numero decimal
  valor_reembolso_km: number;   // numero decimal
  valor_reembolso_refeicao: number; // numero decimal
  gestor_responsavel: string;   // texto livre
}
```

### 2. Remover interface `DraftService` e logica associada (linhas 48-53)

A interface `DraftService` e toda a logica de `draftServices`, `addEmptyService`, `removeServiceFromDraft`, `updateServiceField`, `activeServiceIndex`, `existingServices`, `catalogClients` serao removidas ou deixarao de ser usadas nesta aba.

### 3. Atualizar estado inicial de `draftContract`

Substituir os valores iniciais para refletir a nova interface:

```text
{
  tipo_contrato: '',  // removido
  numero_contrato: '', // removido
  ...novos campos com valores vazios/zero
}
```

### 4. Atualizar `resetAndClose` e `loadData`

Limpar/carregar os novos campos da OS.

### 5. Substituir conteudo da TabsContent "contratos" (linhas 774-940)

Novo layout do formulario em grid de 12 colunas:

- **Linha 1**: Ordem de Servico (4col) | Data Emissao (4col) | Gestor Responsavel (4col)
- **Linha 2**: Nome do Projeto (6col) | Valor do Projeto R$ (3col) | (espaco)
- **Linha 3**: Descricao do Projeto (12col, textarea)
- **Linha 4**: Data Inicio (3col) | Data Fim (3col) | Reembolso por km R$ (3col) | Reembolso refeicao R$ (3col)
- **Botao**: "Adicionar OS a Lista"

Os cards de OS ja adicionadas exibirao: numero da OS, nome do projeto, gestor, valor e datas.

### 6. Atualizar `addContract`

Validar que `ordem_servico` e `nome_projeto` sao obrigatorios antes de adicionar.

### 7. Payload de save (`clientPayload`)

Adaptar o mapeamento de `contracts` para enviar os novos campos ao inves dos antigos. Se as colunas ainda nao existirem no banco, os campos novos ficam apenas no estado local (como feito com equipe_responsavel/regiao).

### O que NAO muda

- Nenhuma migration de banco de dados
- Demais abas (Dados do Cliente, Contribuintes, Participantes) permanecem iguais
- Navegacao entre abas permanece igual

