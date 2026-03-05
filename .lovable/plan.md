

# Diagnóstico: Dados desaparecendo ao salvar e reabrir cliente

## Causa raiz

O problema ocorre porque o ambiente de desenvolvimento (preview) usa tabelas diferentes (`cliente_dev`, `contribuinte_dev`, `participante_dev`, `contrato_dev`) que possuem **menos colunas** que as tabelas de produção. O código do `handleSave` condiciona a inclusão de vários campos com `isProductionEnvironment`:

### Aba "Dados do Cliente"
Os seguintes campos **não são salvos** em dev (linhas 1144-1152):
- `empresa_faturamento` (checkboxes de Empresa/Faturamento)
- `tipo_produto_segmento`
- `tipo_produto_segmento_custom`
- `regiao`

### Aba "Contribuintes"
Os seguintes campos **não são salvos** em dev (linhas 1201-1215):
- `telefone`, `nome_fantasia`, `situacao_inscricao_estadual`
- `cep`, `logradouro`, `numero`, `complemento`, `bairro`, `municipio`, `uf`
- `contribuinte_faturamento`

### Aba "Participantes"
Os seguintes campos **não são salvos** em dev (linhas 1228-1232):
- `tipo_participante`
- `observacoes`
- `acesso_chamados`

### Aba "OS" (Ordens de Serviço)
Em dev, o fallback para `contrato_dev` só salva 4 campos (linhas 1256-1261):
- `numero_contrato`, `data_inicio`, `data_fim`, `valor_fixo`

Ficam de fora: `data_emissao`, `valor_reembolso_km`, `valor_reembolso_refeicao`, `situacao_projeto`, `observacoes_projeto`, `servicos_contratados`, `centros_custo`.

## Solução proposta

Adicionar as colunas faltantes nas tabelas de desenvolvimento (`cliente_dev`, `contribuinte_dev`, `participante_dev`, `contrato_dev`) via migration, e remover as condicionais `isProductionEnvironment` do payload de save e load, para que todos os campos sejam persistidos em ambos os ambientes.

### 1. Migration: adicionar colunas faltantes nas tabelas dev

- `cliente_dev`: adicionar `empresa_faturamento` (jsonb), `tipo_produto_segmento` (text), `tipo_produto_segmento_custom` (text), `regiao` (text)
- `contribuinte_dev`: adicionar `telefone`, `nome_fantasia`, `situacao_inscricao_estadual`, `cep`, `logradouro`, `numero`, `complemento`, `bairro`, `municipio`, `uf` (todos text), `contribuinte_faturamento` (boolean default false)
- `participante_dev`: adicionar `tipo_participante` (text), `observacoes` (text), `acesso_chamados` (boolean default false)
- `contrato_dev`: adicionar `data_emissao` (text), `valor_reembolso_km` (numeric default 0), `valor_reembolso_refeicao` (numeric default 0), `situacao_projeto` (text), `observacoes_projeto` (text), `servicos_contratados` (jsonb default '[]'), `centros_custo` (jsonb default '[]')

### 2. Atualizar `NewClientModal.tsx`

- **handleSave**: remover os blocos condicionais `isProductionEnvironment` dos payloads de cliente, contribuinte, participante e OS, para que todos os campos sejam sempre enviados
- Ajustar o mapeamento de campos do OS no ambiente dev para usar os mesmos nomes de campo que produção (ou manter o mapeamento dual mas incluindo todos os campos)
- **loadData**: garantir que os campos extras sejam lidos corretamente no ambiente dev

### 3. Sem alteração em produção

Nenhuma tabela de produção será modificada. As mudanças afetam apenas as tabelas `_dev` e a lógica condicional no frontend.

