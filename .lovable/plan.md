

# Reestruturar modal de criação de Projeto Tax (Cadastro)

## Objetivo

Ao criar um novo projeto em TAX > Projetos > Cadastro, o fluxo deve ser:
1. Selecionar o cliente primeiro
2. Exibir as OS/contratos já cadastrados para esse cliente (vindos da tabela `ordem_servico`/`contrato_dev`)
3. Permitir preencher os campos pendentes do projeto com base nessas informações

## Alterações em `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`

### 1. Reordenar o modal de criação

Trocar a ordem das seções no modal:

```text
ANTES:                          DEPOIS:
─────                           ──────
1. Informações Básicas          1. Cliente (select + contribuinte)
2. Cliente e Equipe             2. OS vinculadas (read-only, listadas ao selecionar cliente)
3. Membros                      3. Informações Básicas (nome, status, área, datas)
4. Objetivo e Descrição         4. Equipe (responsável, líder, membros)
5. Categorias                   5. Objetivo, Descrição e Categorias
```

### 2. Fetch de OS ao selecionar cliente

Quando `external_client_id` for selecionado, fazer query na tabela `ordem_servico` (prod) ou `contrato_dev` (dev) filtrando por `id_cliente`. Exibir cards read-only com:
- Número da OS
- Serviços contratados
- Data início / fim
- Situação
- Valor do projeto

Isso permite ao usuário ver as OS já cadastradas e usar essas informações para preencher nome, categorias e datas do projeto.

### 3. Auto-preenchimento sugerido

Quando houver apenas 1 OS para o cliente selecionado, pré-preencher automaticamente:
- `start_date` com `data_inicio` da OS
- `end_date` com `data_fim` da OS
- Sugerir categorias com base em `servicos_contratados` (match por `categoria_id` na tabela `tax_categorias`)

Se houver múltiplas OS, o usuário seleciona qual deseja vincular e o preenchimento ocorre a partir dela.

### 4. Dados necessários

Nova query reativa (habilitada quando `formData.external_client_id` estiver preenchido):
```typescript
const { data: clienteOS } = useQuery({
  queryKey: ['cliente-os', formData.external_client_id],
  enabled: !!formData.external_client_id,
  queryFn: async () => {
    const { data } = await supabase
      .from(ordemServicoTable)
      .select('*')
      .eq('id_cliente', formData.external_client_id);
    return data || [];
  },
});
```

## Arquivo impactado

| Arquivo | Alteração |
|---|---|
| `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx` | Reordenar modal, adicionar fetch de OS, exibir cards de OS, auto-preenchimento |

