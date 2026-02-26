

# Correcoes de UX: Datas, Endereco e Agrupamento na Aba OS

## 1. Reordenacao dos campos de endereco (Aba Contribuintes)

Tanto no **Inline Edit** (linhas 1159-1210) quanto no **Draft Form** (linhas 1342-1399), a ordem atual dos campos de endereco sera reorganizada para:

1. **CEP** (max-w-[160px], com loader ViaCEP) -- mantem no topo
2. **UF** (max-w-[120px])
3. **Municipio** (full width)
4. **Bairro** (full width)
5. **Logradouro** (full width)
6. **Numero** (max-w-[120px])
7. **Complemento** (full width)

Isso significa apenas reordenar os blocos `<div>` existentes -- nenhuma alteracao de estrutura ou estilo, apenas mover as linhas de CEP, UF, Municipio, Bairro, Logradouro, Numero, Complemento para a nova sequencia.

---

## 2. Substituicao dos inputs de data por Popover + Calendar (Aba OS)

### Componentes reutilizados do projeto

- `Popover`, `PopoverTrigger`, `PopoverContent` de `@/components/ui/popover`
- `Calendar` de `@/components/ui/calendar` (ja configurado com `ptBR` e `pointer-events-auto`)
- `Button` de `@/components/ui/button`
- `format` e `parse` de `date-fns` com locale `ptBR`
- `CalendarIcon` de `lucide-react`
- Funcoes utilitarias de `@/lib/dateUtils` (`parseDate`)

### Campos afetados (4 campos x 2 formularios = 8 substituicoes)

| Campo | Inline Edit | Draft Form |
|-------|-------------|------------|
| Data Emissao | linha 1729-1734 | linha 1838-1843 |
| Data Inicio | linha 1765-1771 | linha 1881-1886 |
| Data Fim | linha 1772-1778 | linha 1888-1893 |

### Estrutura do novo campo de data

Cada `<Input type="date">` sera substituido por:

```text
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" className="h-8 max-w-[200px] justify-start text-left font-normal">
      <CalendarIcon className="mr-2 h-4 w-4" />
      {valor ? format(parseDate(valor), "dd/MM/yyyy") : "Selecione..."}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
    <Calendar
      mode="single"
      selected={valor ? parseDate(valor) : undefined}
      onSelect={(date) => {
        // Converte Date para string YYYY-MM-DD e atualiza o state
      }}
      disabled={(date) => date.getFullYear() < 2000 || date.getFullYear() > 2060}
      initialFocus
    />
  </PopoverContent>
</Popover>
```

### Travas de ano

- `disabled` no Calendar impede selecao de datas com ano < 2000 ou > 2060.
- O formato de exibicao sera `dd/MM/yyyy` (padrao brasileiro).
- O valor armazenado internamente continua como string `YYYY-MM-DD` (compativel com o banco).

### Imports a adicionar

- `CalendarIcon` de `lucide-react` (ja tem outros icones importados)
- `Calendar` de `@/components/ui/calendar`
- `Popover, PopoverTrigger, PopoverContent` de `@/components/ui/popover`
- `format` de `date-fns`
- `parseDate` de `@/lib/dateUtils`

---

## 3. Agrupamento lado a lado na Aba OS

### Par 1: Data Inicio + Data Fim

Agrupar em uma unica linha flex horizontal:

```text
<div className="flex flex-row items-center gap-6">
  <div className="flex flex-row items-center gap-4 flex-1">
    <Label className="w-48 shrink-0 ...">Data Inicio *</Label>
    <div className="flex-1">[Popover Calendar]</div>
  </div>
  <div className="flex flex-row items-center gap-4 flex-1">
    <Label className="w-32 shrink-0 ...">Data Fim</Label>
    <div className="flex-1">[Popover Calendar]</div>
  </div>
</div>
```

### Par 2: Reembolsos (km + refeicao)

Agrupar lado a lado com labels completas:

```text
<div className="flex flex-row items-center gap-6">
  <div className="flex flex-row items-center gap-4 flex-1">
    <Label className="w-48 shrink-0 ...">Reembolso por km (R$)</Label>
    <div className="flex-1">
      <Input type="number" className="h-8 max-w-[160px]" />
    </div>
  </div>
  <div className="flex flex-row items-center gap-4 flex-1">
    <Label className="w-48 shrink-0 ...">Reembolso refeicao (R$)</Label>
    <div className="flex-1">
      <Input type="number" className="h-8 max-w-[160px]" />
    </div>
  </div>
</div>
```

Nota: a label `w-48` nos pares usa um pouco menos de espaco que campos sozinhos porque `flex-1` distribui igualmente. A label do segundo campo no par de datas usa `w-32` pois "Data Fim" e mais curto.

### Aplicacao

Estes agrupamentos se aplicam tanto ao **Inline Edit** (linhas 1765-1798) quanto ao **Draft Form** (linhas 1881-1914).

---

## Resumo de alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `NewClientModal.tsx` | Reordenar campos de endereco (Contribuintes inline + draft) |
| `NewClientModal.tsx` | Substituir 8x `<Input type="date">` por Popover+Calendar (OS inline + draft) |
| `NewClientModal.tsx` | Agrupar Data Inicio/Fim e Reembolsos lado a lado (OS inline + draft) |
| `NewClientModal.tsx` | Renomear labels "Reemb. km" → "Reembolso por km (R$)" e "Reemb. refeicao" → "Reembolso refeicao (R$)" |
| `NewClientModal.tsx` | Adicionar imports: Calendar, Popover*, CalendarIcon, format, parseDate |

