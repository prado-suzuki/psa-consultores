

## Plano: Combobox filtrável para CST PIS/COFINS e Descrição CST

### Dados estáticos (constante no arquivo)

Array `CST_OPTIONS` com 30 entradas, cada uma com `code` (ex: `"01"`) e `description` (ex: `"Operação Tributável com Alíquota Básica"`), conforme a lista fornecida.

### Arquivo: `src/components/equipe/dev/pis-cofins/RegraFormSheet.tsx`

**1. Campo "CST PIS/COFINS" (unificado)**
- Substituir o `<Input>` do `cst_pis` por um Combobox usando `Popover` + `Command` (cmdk) já disponíveis no projeto
- O usuário digita e a lista filtra por código ou descrição
- Ao selecionar, seta `cst_pis` com o código (ex: `"01"`) e auto-preenche `desc_cst` com a descrição correspondente e `cst_cofins` com o mesmo código
- Renomear label para "CST PIS/COFINS"

**2. Campo "Descrição CST"**
- Substituir o `<Input>` por outro Combobox igual, filtrando pela descrição
- Ao selecionar, seta `desc_cst` com a descrição e auto-preenche `cst_pis` e `cst_cofins` com o código correspondente

**3. Remover campo separado "CST COFINS"**
- Remover o `FormField` de `cst_cofins` do formulário (já era previsto na unificação)
- Manter `cst_cofins` no schema Zod mas torná-lo opcional (será preenchido programaticamente)

**4. Modo leitura**
- Unificar exibição: mostrar "CST PIS/COFINS" com valor `regra.cst_pis` em vez de dois campos separados
- Remover linha "CST COFINS"

**5. Sincronização bidirecional**
- Selecionar CST pelo código → preenche descrição
- Selecionar CST pela descrição → preenche código
- O usuário ainda pode digitar valores livres (não restritos à lista)

### Componente Combobox
Usar `Popover` + `Command`/`CommandInput`/`CommandList`/`CommandItem`/`CommandEmpty` do projeto, padrão shadcn. Componente inline no arquivo, sem criar arquivo separado.

### Arquivos afetados

| Arquivo | Alteração |
|---|---|
| `RegraFormSheet.tsx` | Combobox nos dois campos, constante CST_OPTIONS, unificação visual, sync bidirecional |

