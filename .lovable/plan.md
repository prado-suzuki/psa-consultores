
# Plano: Conectar endpoints de listagem, download e export de balancetes

## Resumo

Conectar a pagina de Controle de Balancetes aos 3 endpoints da API:
1. **Listagem** - buscar balancetes por contribuinte (com filtro opcional de periodo)
2. **Download** - baixar arquivo original do balancete
3. **Export Excel** - exportar movimentos do balancete para Excel

## Alteracoes

### Arquivo: `src/pages/equipe/dev/ControleBalancetes.tsx`

**1. Busca de balancetes (endpoint de listagem)**

- Ao clicar "Buscar", chamar `GET /api/v1/contabil/balancetes?id_contribuinte={id}` via `fetchWithAuth`
- Se o usuario selecionou periodo, adicionar `dt_ini` e `dt_fim` como query params (usando `monthYearToDateString`)
- Contribuinte sera obrigatorio para buscar (o endpoint exige `id_contribuinte`)
- Armazenar resultado em state e exibir na tabela existente
- Mostrar loading durante a busca

**2. Tabela de resultados**

- Preencher a tabela com os dados retornados pela API (contribuinte, periodo inicio, periodo fim, adicionado por, data upload)
- Adicionar coluna "Acoes" com dois botoes por linha:
  - Botao de download (icone Download) - baixa o arquivo original
  - Botao de export Excel (icone FileDown) - exporta movimentos

**3. Download do arquivo original**

- `GET /api/v1/contabil/balancetes/{id_balancete}/download` via `fetchWithAuth`
- Receber como blob e disparar download no navegador com nome sugerido

**4. Export Excel dos movimentos**

- `GET /api/v1/contabil/balancetes/{id_balancete}/export-excel` via `fetchWithAuth`
- Mesmo mecanismo de download via blob

**5. Integracao com hooks existentes**

- Usar `useApiAuth` (ja usado no modal de upload) para autenticacao
- Usar `getApiUrl` para construir URLs
- Usar `monthYearToDateString` para formatar datas dos filtros
- Adicionar `toast` para feedback de erros

## Detalhes tecnicos

| Item | Detalhe |
|---|---|
| Arquivo modificado | `src/pages/equipe/dev/ControleBalancetes.tsx` |
| Novos imports | `useApiAuth`, `getApiUrl`, `monthYearToDateString`, `Download`, `FileDown`, `Loader2`, `toast` |
| State novo | `balancetes` (array), `loading` (boolean), `downloading` (Record de ids em progresso) |
| Validacao | Contribuinte obrigatorio para buscar; toast de erro se nao selecionado |
| Refresh apos upload | Ao fechar o modal de upload com sucesso, re-executar a busca se contribuinte estiver selecionado |
