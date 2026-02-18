
# Corrigir terminologia "Itens" para "Produtos" e capitalização de botoes/labels

## Contexto

Em portugues, botoes e labels de interface seguem a regra de capitalizar apenas a primeira palavra (e nomes proprios), nao todas as palavras. Alem disso, o termo "Itens" deve ser substituido por "Produtos" nos contextos de classificacao fiscal.

## Escopo

As alteracoes abrangem **apenas** os arquivos dentro de `src/pages/equipe/dev/`, `src/components/equipe/dev/DevLayout.tsx`, e `src/config/protectedPages.ts`. Nao altera paginas fora do modulo dev para evitar efeitos colaterais.

---

## Alteracoes por arquivo

### 1. `src/pages/equipe/dev/AuditoriaFiscal.tsx`

**Itens -> Produtos:**
- Linha 692: subtitle `"Auditoria e classificação fiscal de itens"` -> `"Auditoria e classificação fiscal de produtos"`
- Linha 847: `"Buscar Itens"` -> `"Buscar produtos"`
- Linha 906: `"Total de Itens"` -> `"Total de produtos"`
- Linha 959: `"Itens para Classificação"` -> `"Produtos para classificação"`
- Linha 972: `"Erro ao carregar itens"` -> `"Erro ao carregar produtos"`
- Linha 977: `"Nenhum item encontrado..."` -> `"Nenhum produto encontrado..."`
- Linha 985: TableHead `"Item"` -> `"Produto"`
- Linha 1061: `"({totalItems} itens)"` -> `"({totalItems} produtos)"`
- Linha 1091: `"os itens de notas fiscais"` -> `"os produtos de notas fiscais"`

**Capitalizacao:**
- Linha 839: `"Limpar Filtros"` -> `"Limpar filtros"`
- Linha 913/924/933: `"Salvar Alterações"` -> `"Salvar alterações"` (comentario e botao)
- Linha 936/948: `"Exportar Excel"` -> `"Exportar Excel"` (Excel e nome proprio, mantido)
- Linha 699: `"Filtros de Busca"` (dentro de span uppercase, ja e renderizado em caixa alta pelo CSS -- manter como esta)

### 2. `src/pages/equipe/dev/CalculadoraIbsCbs.tsx`

**Itens -> Produtos:**
- Linha 807: `"Limpar Filtros"` -> `"Limpar filtros"`
- Linha 815: `"Buscar Itens"` -> `"Buscar produtos"`
- Linha 871: `"Total de Itens"` -> `"Total de produtos"`
- Linha 896: `"Salvar Alterações"` -> `"Salvar alterações"`
- Linha 921: `"Itens para Classificação"` -> `"Produtos para classificação"`
- Linha 934: `"Erro ao carregar itens"` -> `"Erro ao carregar produtos"`
- Linha 939: `"Nenhum item encontrado..."` -> `"Nenhum produto encontrado..."`
- Linha 947: TableHead `"Item"` -> `"Produto"`
- Linha 1023: `"({totalItems} itens)"` -> `"({totalItems} produtos)"`
- Linha 1053: `"os itens de notas fiscais"` -> `"os produtos de notas fiscais"`

### 3. `src/pages/equipe/dev/ConsultaXMLs.tsx`

**Capitalizacao:**
- Linha 881: `"Limpar Filtros"` -> `"Limpar filtros"`
- Linha 616: `"Exportar Excel"` no texto descritivo -- manter (nome proprio)

### 4. `src/pages/equipe/dev/ConsultaEFD.tsx`

**Capitalizacao:**
- `"Buscar Arquivos"` -> `"Buscar arquivos"`
- `"Limpar Filtros"` -> `"Limpar filtros"` (se existir)

### 5. `src/pages/equipe/dev/ConsultaEFDICMS.tsx`

**Capitalizacao:**
- `"Buscar Arquivos"` -> `"Buscar arquivos"`
- `"Limpar Filtros"` -> `"Limpar filtros"` (se existir)

### 6. `src/pages/equipe/dev/NovaFerramenta.tsx`

**Capitalizacao:**
- Linha 106: title `"Nova Ferramenta"` -> `"Nova ferramenta"` (DevLayout title)
- Linha 118: `"Informações da Ferramenta"` -> `"Informações da ferramenta"`
- Linha 126: `"Nome da Ferramenta"` -> `"Nome da ferramenta"`
- Linha 182: `"Criar Ferramenta"` -> `"Criar ferramenta"`

### 7. `src/pages/equipe/dev/DetalheFerramenta.tsx`

**Capitalizacao:**
- Linha 237: `"Editar Ferramenta"` -> `"Editar ferramenta"`
- Linha 317: `"Salvar Alterações"` -> `"Salvar alterações"`
- Linha 196: `"Voltar ao Dashboard"` -> `"Voltar ao dashboard"` (dashboard nao e nome proprio)

### 8. `src/pages/equipe/dev/DevDashboard.tsx`

**Capitalizacao:**
- Linha 119: `"Nova Ferramenta"` -> `"Nova ferramenta"`
- Linha 126: `"Total de Ferramentas"` -> `"Total de ferramentas"`
- Linha 132: `"Ferramentas Ativas"` -> `"Ferramentas ativas"`
- Linha 138: `"Em Desenvolvimento"` -> `"Em desenvolvimento"`
- Linha 173: `"Gerenciar Dados"` -> `"Gerenciar dados"`
- Linha 233: `"Nova Ferramenta"` (texto inline) -> `"Nova ferramenta"`

### 9. `src/pages/equipe/dev/GestaoClientes.tsx`

**Capitalizacao:**
- Linha 430: title `"Gestão de Clientes"` -> `"Gestão de clientes"`
- Linha 530: `"Limpar Filtros"` -> `"Limpar filtros"`
- Linha 442: `"Novo Cliente"` -> `"Novo cliente"`

### 10. `src/pages/equipe/dev/GerenciarDados.tsx`

**Capitalizacao:**
- Title no DevLayout: `"Gerenciar Dados"` -> `"Gerenciar dados"`
- `"Selecionar Tabela"` -> `"Selecionar tabela"`
- `"Importar CSV"` -> `"Importar CSV"` (CSV e sigla, manter)
- `"Limpar Tabela"` -> `"Limpar tabela"`
- `"Template CSV"` -> `"Template CSV"` (manter, CSV e sigla)
- `"Formato CSV"` -> `"Formato CSV"` (manter)

### 11. `src/components/equipe/dev/DevLayout.tsx` (sidebar)

**Capitalizacao dos labels de navegacao:**
- Linha 41: `'Nova Ferramenta'` -> `'Nova ferramenta'`
- Linha 42: `'Consulta de XMLs'` -> `'Consulta de XMLs'` (manter, XMLs e sigla)
- Linha 43: `'EFD Contribuições'` -> manter (nome proprio do SPED)
- Linha 45: `'DIFAL Inteligente'` -> manter (nome da ferramenta)
- Linha 46: `'Calculadora IBS/CBS'` -> manter (siglas)
- Linha 47: `'Controle PERDCOMP'` -> manter (sigla)
- Linha 48: `'Gestão de Clientes'` -> `'Gestão de clientes'`
- Linha 49: `'Gerenciar Dados'` -> `'Gerenciar dados'`
- Linha 88: `'Ambiente de Desenvolvimento'` -> `'Ambiente de desenvolvimento'`

### 12. `src/config/protectedPages.ts`

**Capitalizacao dos page_name:**
- Linha 67: `'Gerenciar Dados'` -> `'Gerenciar dados'`
- Linha 91: `'Gestão de Clientes'` -> `'Gestão de clientes'`

---

## Regra aplicada

- **Primeira palavra**: maiuscula
- **Demais palavras**: minuscula, exceto nomes proprios (Excel, DIFAL, PERDCOMP, IBS, CBS, ICMS, XMLs, CSV, EFD, SPED)
- **"Itens"** substituido por **"produtos"** no contexto de classificacao fiscal (AuditoriaFiscal e CalculadoraIbsCbs)

## Arquivos nao alterados

Paginas fora do modulo dev (EquipeProcessos, EquipeDaily, EquipeControleAcessos, admin, etc.) nao serao alteradas neste escopo para manter o foco e evitar regressoes.
