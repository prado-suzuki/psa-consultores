

# Simplificação da Consulta de XMLs

## Resumo
Remover seleção múltipla/checkbox e botão global "Baixar XMLs". Adicionar coluna "Ações" com download individual por linha. Ajustar paginação e adicionar aviso no modal de exportação.

## Alterações em `src/pages/equipe/dev/ConsultaXMLs.tsx`

### 1. Remover imports e estados de seleção
- Remover import de `JSZip` (linha 41) e `Checkbox` (linha 17)
- Remover estados: `selectedKeys`, `shouldAutoSelect`, `isDownloadingXml` (linhas 211-213)
- Remover funções: `getAllCurrentKeys`, `allSelected`, `handleToggleItem`, `handleToggleAll` (linhas 444-483)
- Remover `handleDownloadXml` inteira (linhas 529-605)
- Remover `setShouldAutoSelect(true)` do `handleSearch` (linha 522)
- Remover `useEffect` de auto-seleção (linhas 430-441)
- Remover `setSelectedKeys(new Set())` do `handleClearFilters` (linha 242)

### 2. Remover botão global "Baixar XMLs" da barra de ações
- Remover o bloco do botão "Baixar XMLs" (linhas 884-895)

### 3. Remover coluna Checkbox das tabelas NFe e CTe
- **NFe header**: remover `<TableHead>` com Checkbox (linhas 980-986)
- **NFe body**: remover `<TableCell>` com Checkbox em cada row (linhas 1047-1052) e nos skeletons (linhas 1001-1003)
- **CTe header**: remover `<TableHead>` com Checkbox (linhas 1093-1098)
- **CTe body**: remover `<TableCell>` com Checkbox em cada row (linhas 1164-1168) e nos skeletons (linhas 1115-1117)

### 4. Adicionar coluna "Ações" com download individual
- Adicionar nova função `handleDownloadSingleXml(chave, docType)` que faz GET para `/api/v1/query/download/{docType}/xml/{chave}`, recebe o XML e dispara download do arquivo `.xml`
- Adicionar estado `downloadingKey` para mostrar spinner no botão sendo baixado
- **NFe**: adicionar `<TableHead className="text-right">Ações</TableHead>` no final do header, e `<TableCell>` com botão ghost+ícone Download com tooltip "Baixar XML original" no final de cada row
- **CTe**: idem

### 5. Ajustar indicador de paginação
- Linha 1206: mudar texto de `Página {currentPage} de {totalPages}` para incluir contagem real:
  `Exibindo {tipoDocumento === 'nfe' ? nfeRecords.length : cteRecords.length} de {totalRecords} arquivos • Página {currentPage} de {totalPages}`

## Alterações em `src/components/equipe/dev/ExportDialog.tsx`

### 6. Aviso no modal de exportação
- Na `DialogDescription` (linha 591), adicionar abaixo do texto existente um aviso com ícone Info:
  `"A exportação em Excel engloba todos os arquivos carregados no filtro atual, e não apenas os visíveis nesta página."`
- Importar `Info` de `lucide-react` (já importado no ConsultaXMLs, adicionar no ExportDialog)

