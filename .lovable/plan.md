

## Ajustes no NewClientModal - Validacoes, campos e lider dropdown

### Arquivo: `src/components/equipe/dev/NewClientModal.tsx`

### 1. Remover coloracao verde dos campos de valores (R$)

Nos campos "Valor do Projeto", "Reembolso por km" e "Reembolso refeicao" (linhas 751-782):
- Remover `text-emerald-600` das Labels
- Remover `border-emerald-200 text-emerald-800 font-bold` dos Inputs
- Usar estilo padrao como os demais campos

### 2. Campo "Inscricao Estadual" condicional

- Adicionar `possui_inscricao_estadual: boolean` no estado `draftEntity` (default `false`)
- Substituir o campo direto de Inscricao Estadual por uma pergunta com Checkbox: "Cliente possui inscricao estadual?"
- Somente ao marcar "Sim", o campo de input da inscricao aparece

### 3. Validacao de formato no CPF/CNPJ

O campo CPF/CNPJ ja aceita ambos. Adicionar mascara/validacao:
- CPF: 11 digitos
- CNPJ: 14 digitos
- Validar ao clicar "Adicionar a Lista"

### 4. Gestor Responsavel como dropdown de lideres

Buscar usuarios com role `lider` da tabela `user_roles` + `profiles` (mesmo padrao de `FiscalProjetosCadastro.tsx`):
- Query `user_roles` com role `lider`
- Query `profiles` para obter nomes
- Substituir Input por Select dropdown na aba OS

### 5. Novo campo "Tipo de produto/segmento" na aba Cliente

Adicionar antes de "Equipe responsavel" (linha 482):
- Select dropdown com as opcoes fornecidas (ASO, AFI, PFT, PTN, etc.)
- Adicionar campo `tipo_produto_segmento: string` no `clientData`
- Incluir opcao "Outro" que habilita um Input de texto livre para adicionar um novo produto

### 6. Validacoes completas ao adicionar itens

**Contribuinte (addEntity):**
- `nome_razao_social` obrigatorio (ja existe)
- `cpf_cnpj` obrigatorio e formato valido (11 ou 14 digitos)
- `cod_cnae` obrigatorio quando PJ (formato XXXX-X/XX)
- `municipio` obrigatorio
- `uf` obrigatorio (2 caracteres)
- `logradouro` obrigatorio
- `bairro` obrigatorio
- `setor` obrigatorio quando PJ

**Participante (addParticipant):**
- `nome` obrigatorio (ja existe)
- `email` formato valido (regex basico)
- `telefone` formato valido (minimo 10 digitos)
- `observacoes` minimo 20 caracteres quando preenchido
- `cargo` obrigatorio

**OS (addContract):**
- `ordem_servico` obrigatorio (ja existe)
- `nome_projeto` obrigatorio (ja existe)
- `descricao_projeto` minimo 20 caracteres quando preenchido
- `data_emissao` obrigatoria
- `data_inicio_projeto` obrigatoria
- `gestor_responsavel` obrigatorio
- `valor_projeto` maior que zero

**Cliente (handleSave):**
- `nome` obrigatorio (ja existe)
- `telefone` formato valido
- `municipio` obrigatorio
- `uf` obrigatorio
- `setor_cliente` obrigatorio
- `tipo_produto_segmento` obrigatorio
- `equipe_responsavel` obrigatorio
- `regiao` obrigatoria

### 7. Queries adicionais necessarias

Adicionar `useQuery` para buscar lideres (mesmo padrao de FiscalProjetosCadastro):

```text
const { data: userRoles = [] } = useQuery({
  queryKey: ['user-roles-lider'],
  queryFn: async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .eq('role', 'lider');
    return data || [];
  }
});

const { data: profiles = [] } = useQuery({
  queryKey: ['profiles-all'],
  queryFn: async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name');
    return data || [];
  }
});
```

Derivar lista de lideres filtrando profiles pelos user_ids com role lider.

### Resumo de alteracoes no estado

| Campo | Local | Tipo |
|---|---|---|
| `tipo_produto_segmento` | clientData | string |
| `tipo_produto_segmento_custom` | clientData | string (quando "Outro") |
| `possui_inscricao_estadual` | draftEntity | boolean |

### O que NAO muda

- Nenhuma migration de banco de dados
- Demais logicas de save permanecem iguais
- Campos novos de layout que nao existem no banco continuam apenas no estado local

