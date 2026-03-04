

# Adicionar popups de confirmação para ações

## Alterações

**Arquivo:** `src/pages/equipe/dev/ControleBalancetes.tsx`

1. Importar `AlertDialog` e seus sub-componentes
2. Adicionar estados para controlar qual popup está aberto (`confirmDownload`, `confirmExport` com o id do balancete)
3. **Download**: ao clicar no ícone de download, abrir AlertDialog perguntando "Deseja baixar o arquivo original deste balancete?" com botões Cancelar/Baixar. Ao confirmar, chama `handleBlobDownload(..., 'download', 'download')`
4. **Exportar Excel**: ao clicar no ícone de exportação, abrir AlertDialog "Deseja exportar os movimentos deste balancete em Excel?" com Cancelar/Exportar
5. **Buscar**: ao clicar em Buscar sem contribuinte selecionado, já exibe toast de erro (manter). Não precisa de confirmação adicional para busca simples

**Arquivo:** `src/components/equipe/dev/balancete/UploadBalanceteModal.tsx`

6. Adicionar AlertDialog de confirmação antes do envio: ao clicar "Enviar", abrir popup "Confirmar envio do balancete?" com resumo (contribuinte, período, arquivo) e botões Cancelar/Confirmar. Ao confirmar, executa `handleSubmit`

Nenhuma mudança de lógica ou migrações SQL.

