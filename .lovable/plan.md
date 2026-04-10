

## Adicionar "Comércio Atacadista" à tabela `setor_cliente`

Inserir um novo registro na tabela `setor_cliente` com:
- **sigla**: `ATA`
- **nome**: `Comércio Atacadista`
- **descricao**: `Atividades relacionadas ao comércio atacadista`

### Execução

Uma única migration SQL:

```sql
INSERT INTO public.setor_cliente (nome, sigla, descricao)
VALUES ('Comércio Atacadista', 'ATA', 'Atividades relacionadas ao comércio atacadista');
```

Nenhuma alteração de código é necessária — o dropdown no `ClienteTab.tsx` já carrega dinamicamente da tabela `setor_cliente` via `useSetoresCliente()`.

