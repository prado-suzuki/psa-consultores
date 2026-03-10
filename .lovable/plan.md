

## Plano: Persistir cliente/contribuinte do último upload

Após um upload bem-sucedido, salvar `clienteId` e `contribuinteId` em `localStorage`. Ao abrir o modal, inicializar os estados com esses valores salvos.

### Alterações em `src/components/equipe/dev/balancete/UploadBalanceteModal.tsx`

1. **Constante de chave localStorage:**
   ```ts
   const STORAGE_KEY = 'last-balancete-upload';
   ```

2. **Inicialização dos estados** — substituir `useState('')` por função que lê do localStorage:
   ```ts
   const stored = localStorage.getItem(STORAGE_KEY);
   const lastUpload = stored ? JSON.parse(stored) : null;
   const [clienteId, setClienteId] = useState(lastUpload?.clienteId || '');
   const [contribuinteId, setContribuinteId] = useState(lastUpload?.contribuinteId || '');
   ```

3. **Salvar após upload bem-sucedido** — dentro do `handleSubmit`, logo após o toast de sucesso, gravar:
   ```ts
   localStorage.setItem(STORAGE_KEY, JSON.stringify({ clienteId, contribuinteId }));
   ```

4. **resetForm** — NÃO limpar clienteId/contribuinteId no reset (para que ao reabrir o modal, os valores persistam). Limpar apenas `periodo`, `file`, `detalhamento`, `dragging`, `showConfirm`.

Nenhuma outra alteração necessária — o `useEffect` de `contribuinteId` já dispara a busca de config de detalhamento automaticamente, e a query de contribuintes já é filtrada pelo `clienteId`.

