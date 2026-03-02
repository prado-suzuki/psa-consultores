

# Alinhamento DB-Frontend: Gestão de Clientes (CONCLUÍDO)

## Fase 1: Migrações SQL (tabelas de produção) ✅

Colunas adicionadas em `cliente`, `contribuinte`, `participante` e `contrato`.
Tabelas `_dev` **não foram alteradas**.

### cliente
- `empresa_faturamento text[] DEFAULT '{}'`
- `tipo_produto_segmento text`
- `tipo_produto_segmento_custom text`
- `regiao text`

### contribuinte
- `telefone`, `nome_fantasia`, `situacao_inscricao_estadual`, `cep`, `logradouro`, `numero`, `complemento`, `bairro`, `municipio`, `uf` (todos text)
- `contribuinte_faturamento boolean DEFAULT false`

### participante
- `tipo_participante text`, `observacoes text`
- `acesso_chamados boolean DEFAULT false`

### contrato
- `data_emissao date`
- `valor_reembolso_km numeric DEFAULT 0`, `valor_reembolso_refeicao numeric DEFAULT 0`
- `situacao_projeto text DEFAULT 'em_andamento'`, `observacoes_projeto text`
- `servicos_contratados jsonb DEFAULT '[]'`, `centros_custo jsonb DEFAULT '[]'`

## Fase 2: Refatoração do NewClientModal.tsx ✅

### handleSave
- Payloads de `cliente`, `contribuinte` e `participante` usam spread condicional `...(isProductionEnvironment && { ... })` para incluir campos novos apenas em produção.
- **Contratos/OS agora são persistidos** no banco via `insert` na tabela `contrato`/`contrato_dev`, substituindo o antigo `console.log`.
- `empresa_faturamento` é passado como array nativo `text[]` (sem `.join()`).

### loadData
- Carrega campos novos do cliente (`tipo_produto_segmento`, `empresa_faturamento` como array, `regiao`).
- Carrega campos novos dos contribuintes (endereço, `nome_fantasia`, etc.).
- Carrega campos novos dos participantes (`tipo_participante`, `observacoes`, `acesso_chamados`).
- **Contratos são carregados do banco** em vez de `setContracts([])`.

### syncCadastrosToDW
- Payload enriquecido com `empresa_faturamento`, `tipo_produto_segmento`, `regiao` (condicional prod).
