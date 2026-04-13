

## Fix: servico_id resetado no segundo disparo do useEffect

### Causa raiz
O `isOpeningEditRef` protege apenas o primeiro disparo do useEffect de sync OS (linha 318). Quando `clienteOS` carrega assincronamente, o useEffect da linha 307 re-seta `selectedOsId` (mesmo valor), o que re-dispara o efeito da linha 318 com `isOpeningEditRef.current === false`, executando `servico_id: ''`.

### Solução

**Arquivo:** `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`

1. **useEffect de sync cliente→OS (linha 307):** Não re-setar `selectedOsId` se o valor já é o mesmo (evitar re-disparo):
   ```ts
   useEffect(() => {
     if (!formData.external_client_id) {
       setSelectedOsId(null);
       return;
     }
     if (clienteOS.length === 1) {
       const osId = getOsId(clienteOS[0]);
       setSelectedOsId(prev => prev === osId ? prev : osId);
     }
   }, [clienteOS, formData.external_client_id]);
   ```

2. **useEffect de sync OS (linha 318):** Reforçar o guard — se `editingProject` existe e o `selectedOsId` não mudou em relação ao `formData.ordem_servico_id`, não limpar `servico_id`:
   ```ts
   useEffect(() => {
     if (isOpeningEditRef.current) {
       setFormData(prev => ({ ...prev, ordem_servico_id: selectedOsId || '' }));
       isOpeningEditRef.current = false;
       return;
     }
     // Skip clearing if editing and OS hasn't actually changed
     if (editingProject && formData.ordem_servico_id === (selectedOsId || '')) {
       return;
     }
     setFormData(prev => ({ ...prev, ordem_servico_id: selectedOsId || '', servico_id: '' }));
     setSelectedProdutoId(null);
     ...
   }, [selectedOsId]);
   ```

### Alterações

| Linha aprox. | Mudança |
|---|---|
| ~312-314 | `setSelectedOsId` com callback funcional para evitar re-disparo com mesmo valor |
| ~318-324 | Guard adicional: se editando e OS não mudou, não limpar `servico_id` |

