

# Refatoracao da Aba "Dados do Cliente/Grupo" para High-Density UI

## Objetivo
Eliminar scroll vertical convertendo o layout de grid 12-colunas para uma Property List de alta densidade, onde cada campo ocupa uma unica linha horizontal com label fixa + controle flexivel.

## Estrutura de uma linha-padrao

Cada campo seguira este padrao de classes Tailwind:

```text
<div className="flex flex-row items-center gap-3">
  <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Label</Label>
  <div className="flex-1">
    <Input className="h-8" />   (ou Select, Switch, ToggleGroup)
  </div>
</div>
```

- Label: `w-48 shrink-0 text-xs font-semibold` -- largura fixa, nao quebra linha
- Controle: `flex-1` com altura `h-8`
- Linha: `flex items-center gap-3`

## Alteracoes detalhadas

### Container principal (linha 863)
- **De:** `<div className="p-4 grid grid-cols-12 gap-4">`
- **Para:** `<div className="px-4 py-3 flex flex-col gap-2">`

### Header do card (linha 860)
- Reduzir padding: `px-4 py-2` (era `py-2.5`)

### TabsContent (linha 858)
- Reduzir padding: `p-3 md:p-4` (era `p-4 md:p-6`)

### Campo 1 -- Nome do Cliente/Grupo (linha 864-874)
- Remover `col-span-12`, converter para linha flex
- Input: adicionar `h-8`, remover `text-base font-bold`
- Label inline (nao mais block)

### Campo 2 -- Categoria (linhas 875-886)
- Remover wrapper `col-span-12 md:col-span-6`, converter para linha flex
- SelectTrigger: adicionar `h-8`

### Campo 3 -- Status (linhas 887-893)
- Converter para linha flex: Label w-48 + Switch inline
- Remover div intermediario `h-10`

### Campo 4 -- Tipo de Relacionamento (linhas 894-910)
- Remover wrapper `col-span-12 md:col-span-6`
- Converter o seletor Fixo/Pontual de botoes com `bg-muted p-1 rounded-lg` para um `ToggleGroup` do Radix (ja disponivel no projeto) com variante `outline`, tamanho `sm`
- Fica na mesma linha que a label

### Campo 5 -- Area do Negocio (linhas 911-926)
- Linha flex com SelectTrigger `h-8`

### Campo 6 -- Tipo de Produto/Segmento (linhas 927-947)
- Linha flex com SelectTrigger `h-8`
- Campo condicional "Outro": renderizado como sub-linha com `ml-48 pl-3` para manter recuo da label, Input `h-8`

### Campo 7 -- Regiao (linhas 948-963)
- Linha flex com SelectTrigger `h-8`

### Campo 8 -- Empresa/Faturamento (linhas 964-980)
- Linha flex com SelectTrigger `h-8`

## Viabilidade

Sao 8 campos (9 com o condicional "Outro"). Com linhas de ~36px (h-8 + gap-2), o total vertical e aproximadamente 8 x 36 = 288px, mais header (~40px) e paddings (~24px) = **~352px**. O modal tem altura util de ~500-550px, entao todos os campos cabem confortavelmente sem scroll.

## Responsividade mobile

No mobile, as linhas flex mudam para empilhamento vertical:
- Cada linha recebe `flex-col md:flex-row`
- Labels perdem `w-48` no mobile: `w-full md:w-48`

## Arquivo alterado

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/equipe/dev/NewClientModal.tsx` | Linhas 858-982: refatoracao completa da aba Cliente para layout Property List |

