
## Posicionamento do campo Contribuinte no formulario de novo projeto

### Ajuste de layout

O campo Contribuinte sera adicionado logo abaixo do campo Cliente, ambos ocupando largura completa (`col-span-2`), dentro do grid existente na secao "Cliente e Equipe".

### Arquivo: `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`

**Posicao no layout (apos linha 755):**

```text
<div className="col-span-2">        <!-- Cliente (ja existe) -->
  ...
</div>
<div className="col-span-2">        <!-- Contribuinte (novo) -->
  <Label>Contribuinte</Label>
  <Select ...>
    ...
  </Select>
</div>
<div>                                <!-- Responsavel Interno (ja existe) -->
  ...
</div>
```

A ordem final dentro do grid `grid-cols-2` ficara:
1. Cliente - `col-span-2` (largura completa)
2. Contribuinte - `col-span-2` (largura completa, abaixo do cliente)
3. Responsavel Interno e Lider - lado a lado (cada um ocupando 1 coluna)

Este ajuste sera aplicado junto com a implementacao completa do campo Contribuinte (migration, queries, mutations, etc.) conforme o plano aprovado anteriormente.
