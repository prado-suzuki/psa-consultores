

## Problema

Os projetos em `/equipe/tax/projetos/cadastro` mostram "Desconhecido" para Cliente e Contribuinte porque:

- Os `external_client_id` e `contribuinte_id` salvos nos `tax_projects` apontam para IDs da tabela **`cliente`** (produção)
- No ambiente de preview, o código consulta **`cliente_dev`** e **`contribuinte_dev`** para resolver nomes
- Esses IDs não existem nas tabelas `_dev`, então o fallback `'Desconhecido'` é usado

Todos os 10 clientes foram encontrados em `cliente` e 0 em `cliente_dev`.

## Solução

Alterar a resolução de nomes na query de listagem (linhas 336-350) para consultar **ambas** as tabelas quando no ambiente de desenvolvimento. Se o ID não for encontrado na tabela `_dev`, tentar na tabela de produção como fallback.

### Alteração

**Arquivo:** `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx` (linhas 336-350)

Lógica atual:
```ts
const { data: clients } = await supabase.from(clienteTable).select(...).in('id', clientIds);
```

Nova lógica:
```ts
// Buscar na tabela do ambiente atual
const { data: clients } = await supabase.from(clienteTable).select(...).in('id', clientIds);
(clients || []).forEach(c => { clientMap[c.id] = c.nome; });

// Fallback: IDs não encontrados → buscar na tabela de produção (se ambiente dev)
if (!isProductionEnvironment) {
  const missingIds = clientIds.filter(id => !clientMap[id]);
  if (missingIds.length > 0) {
    const { data: fallback } = await supabase.from('cliente').select('id, nome').in('id', missingIds);
    (fallback || []).forEach(c => { clientMap[c.id] = c.nome; });
  }
}
```

Aplicar a mesma lógica para `contribuinte` / `contribuinte_dev`.

Isso garante que projetos criados com IDs de produção sejam resolvidos corretamente no ambiente de preview, sem afetar o ambiente de produção.

