

## Ajuste de Layout: Botão "Novo cliente" e Espaçamento

### Mudanças

**GestaoClientes.tsx**:

1. **Mover o botão "Novo cliente" para dentro do header do card de filtros** — alinhado à direita na mesma linha do título "Filtros de Busca":

```text
ANTES:
<div className="flex justify-end"> ← bloco separado com botão
  <Button>Novo cliente</Button>
</div>
<div className="bg-white rounded-xl ..."> ← card de filtros
  <div className="px-6 py-5 ... flex items-center gap-3">
    <Filter />
    <h3>Filtros de Busca</h3>
  </div>

DEPOIS:
<div className="bg-white rounded-xl ..."> ← card de filtros
  <div className="px-6 py-5 ... flex items-center justify-between">
    <div className="flex items-center gap-3">
      <Filter />
      <h3>Filtros de Busca</h3>
    </div>
    <Button>Novo cliente</Button>  ← movido para cá
  </div>
```

2. **Reduzir espaçamento vertical** do container principal de `space-y-6` para `space-y-4`, alinhando com o padrão de altura das outras áreas da aplicação.

