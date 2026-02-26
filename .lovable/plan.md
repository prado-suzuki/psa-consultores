

# Aplicar Layout High-Density (Property List) nas Abas Contribuintes, Participantes e OS

## Resumo
Replicar o padrao visual da aba "Dados do Cliente/Grupo" -- que usa `flex flex-col gap-2.5` com labels de largura fixa (`w-48`) e controles `h-8` -- nas outras 3 abas do modal. As alteracoes afetam os formularios de draft (novo item) e de inline edit (edicao de item existente).

---

## O que muda em cada aba

### Padrao de referencia (aba Cliente atual)
```text
TabsContent: p-3 md:p-4
Card header: px-4 py-2
Card body: px-4 py-3 flex flex-col gap-2.5
Cada campo: flex flex-col md:flex-row md:items-center gap-1 md:gap-3
Label: w-full md:w-48 shrink-0 text-xs font-semibold text-muted-foreground
Controles: flex-1 h-8
```

---

### Aba Contribuintes (linhas 1006-1337)

**1. TabsContent padding** (linha 1006)
- De: `p-4 md:p-6`
- Para: `p-3 md:p-4`

**2. Card header** (linha 1008)
- De: `px-4 py-2.5`, `text-base font-bold`
- Para: `px-4 py-2`, `text-sm font-bold`

**3. Card body** (linha 1011)
- De: `p-4`
- Para: `px-4 py-3`

**4. Formulario Draft "Novo Contribuinte" (linhas 1196-1332)**
- Substituir `grid grid-cols-12 gap-3` por `flex flex-col gap-2.5`
- Cada campo: converter de `col-span-X` para linha flex com label `w-48` e controle `flex-1 h-8`
- Campos que formam pares logicos (ex: Tipo + CPF/CNPJ, Razao Social + Nome Fantasia) ficam em sub-row: `flex flex-col md:flex-row gap-2.5`, cada um com `flex-1`
- Campos de endereco (CEP, Logradouro, Numero, Complemento, Bairro, Municipio, UF) agrupados em sub-rows similares
- SelectTrigger e Input: todos com `h-8`
- Checkbox "Simples Nacional": manter inline com `h-8` e `items-center`

**5. Formulario Inline Edit (linhas 1084-1186)**
- Mesma conversao: de `grid grid-cols-12` para `flex flex-col gap-2.5` com linhas flex
- Cada campo segue o mesmo padrao de label fixa + controle flexivel

**6. Area de visualizacao expandida (linhas 1062-1077)**
- Manter `grid grid-cols-2 md:grid-cols-3` pois e apenas leitura com FieldPair (ja compacto)

---

### Aba Participantes (linhas 1339-1533)

**1. TabsContent padding** (linha 1339)
- De: `p-4 md:p-6`
- Para: `p-3 md:p-4`

**2. Card header** (linha 1341)
- De: `px-4 py-2.5`, `text-base font-bold`
- Para: `px-4 py-2`, `text-sm font-bold`

**3. Card body** (linha 1344)
- De: `p-4`
- Para: `px-4 py-3`

**4. Formulario Draft "Novo Participante" (linhas 1478-1527)**
- Substituir `grid grid-cols-12 gap-3` por `flex flex-col gap-2.5`
- Campos em linhas flex:
  - Nome + Tipo Participante: sub-row flex
  - Cargo + Email: sub-row flex
  - Telefone + Acesso Chamados: sub-row flex
  - Observacoes: linha inteira (label + Textarea flex-1)
- Todos os controles com `h-8` (exceto Textarea que mantem `min-h-[60px]`)

**5. Formulario Inline Edit (linhas 1406-1463)**
- Mesma conversao de grid para flex-col com linhas flex

**6. Area de visualizacao expandida (linhas 1392-1400)**
- Manter grid de leitura com FieldPair (ja compacto)

---

### Aba OS - Ordem de Servico (linhas 1535-1752)

**1. TabsContent padding** (linha 1535)
- De: `p-4 md:p-6`
- Para: `p-3 md:p-4`

**2. Card header** (linha 1537)
- De: `px-4 py-2.5`, `text-base font-bold`
- Para: `px-4 py-2`, `text-sm font-bold`

**3. Card body** (linha 1540)
- De: `p-4`
- Para: `px-4 py-3`

**4. Formulario Draft "Nova OS" (linhas 1685-1741)**
- Substituir `grid grid-cols-12 gap-3` por `flex flex-col gap-2.5`
- Campos em linhas flex:
  - Numero OS + Data Emissao: sub-row flex
  - Gestor Responsavel + Nome Projeto: sub-row flex
  - Descricao: linha inteira (label + Textarea)
  - Data Inicio + Data Fim: sub-row flex
  - Valor + Reemb. km + Reemb. refeicao: sub-row flex com 3 itens

**5. Formulario Inline Edit (linhas 1605-1672)**
- Mesma conversao de grid para flex-col com sub-rows

**6. Area de visualizacao expandida (linhas 1588-1599)**
- Manter grid de leitura com FieldPair

---

## Estrutura de uma sub-row com 2 campos (padrao)

```text
<div className="flex flex-col md:flex-row md:items-start gap-2.5">
  <div className="flex-1 flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
    <Label className="w-full md:w-36 shrink-0 text-xs font-semibold text-muted-foreground">Label A</Label>
    <Input className="flex-1 h-8" />
  </div>
  <div className="flex-1 flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
    <Label className="w-full md:w-36 shrink-0 text-xs font-semibold text-muted-foreground">Label B</Label>
    <Input className="flex-1 h-8" />
  </div>
</div>
```

Nota: nas sub-abas usamos `w-36` (em vez de `w-48` da aba principal) pois os campos em pares precisam de mais espaco horizontal para os controles.

---

## Arquivo alterado

| Arquivo | Secoes impactadas |
|---------|-------------------|
| `NewClientModal.tsx` | TabsContent de contribuintes, participantes e contratos: padding, header, body, draft form e inline edit form |

