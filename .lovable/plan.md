

# Refatorar Layout para Estritamente Vertical (1 Campo = 1 Linha)

## Problema
Os formularios das abas Contribuintes, Participantes e OS agrupam 2-3 campos na mesma linha (ex: "Tipo + CPF/CNPJ", "Bairro + Municipio + UF"), causando layout apertado e ilegivel.

## Regra unica
Cada campo ocupa sua propria linha. Zero excecoes. Campos curtos (UF, Numero, CEP, CNAE, Nº OS) recebem `max-w` no container do input para nao esticar.

## Estrutura padrao de cada linha

```text
<div className="flex flex-row items-center gap-4">
  <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Nome</Label>
  <div className="flex-1">
    <Input className="h-8" />
  </div>
</div>
```

Para campos curtos (UF, Numero, CEP, CNAE, Nº OS):
```text
<div className="flex flex-row items-center gap-4">
  <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">UF</Label>
  <div className="flex-1">
    <Input className="h-8 max-w-[120px]" maxLength={2} />
  </div>
</div>
```

Para Checkbox/Switch:
```text
<div className="flex flex-row items-center gap-4">
  <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Simples Nacional</Label>
  <div className="flex-1">
    <div className="flex items-center gap-2 h-8">
      <Checkbox /> <span>Optante</span>
    </div>
  </div>
</div>
```

Para Textarea (items-start em vez de items-center):
```text
<div className="flex flex-row items-start gap-4">
  <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground pt-2">Descricao</Label>
  <div className="flex-1">
    <Textarea className="min-h-[60px]" />
  </div>
</div>
```

---

## Exemplo: Endereco na aba Contribuintes (draft)

Cada campo em sua propria linha, na ordem:

1. CEP (max-w-[160px], com loader)
2. Logradouro (full width)
3. Numero (max-w-[120px])
4. Complemento (full width)
5. Bairro (full width)
6. Municipio (full width)
7. UF (max-w-[120px])

---

## Secoes impactadas no arquivo

### Aba Cliente (linhas 858-1004) -- JA OK
A aba Cliente ja segue o padrao vertical. Nenhuma alteracao necessaria.

### Aba Contribuintes

**Inline Edit (linhas 1084-1186)** -- 6 blocos lado-a-lado para desmontar:
- Tipo + CPF/CNPJ → 2 linhas separadas (Tipo com max-w-[160px])
- Razao Social + Nome Fantasia → 2 linhas separadas
- IE + Nº IE → 2 linhas separadas (IE Select com max-w-xs)
- CNAE + Simples → 2 linhas separadas (CNAE com max-w-[200px])
- CEP + Logradouro → 2 linhas separadas
- Numero + Complemento → 2 linhas separadas
- Bairro + Municipio + UF → 3 linhas separadas

**Draft Form (linhas 1226-1357)** -- mesmos 6 blocos:
- Tipo + CPF/CNPJ → 2 linhas
- Razao Social + Nome Fantasia → 2 linhas
- IE + Nº IE → 2 linhas
- CNAE + Simples → 2 linhas
- CEP + Logradouro → 2 linhas
- Numero + Complemento → 2 linhas
- Bairro + Municipio + UF → 3 linhas

### Aba Participantes

**Inline Edit (linhas 1437-1486)** -- 3 blocos:
- Nome + Tipo → 2 linhas
- Cargo + Email → 2 linhas
- Telefone + Acesso Chamados → 2 linhas
- Observacoes → ja esta sozinho (manter)

**Draft Form (linhas 1519-1573)** -- mesmos 3 blocos:
- Nome + Tipo → 2 linhas
- Cargo + Email → 2 linhas
- Telefone + Acesso Chamados → 2 linhas
- Observacoes → manter

### Aba OS

**Inline Edit (linhas 1656-1720)** -- 4 blocos:
- OS + Data Emissao → 2 linhas (OS com max-w-[200px])
- Gestor + Projeto → 2 linhas
- Descricao → manter sozinho
- Data Inicio + Data Fim → 2 linhas (max-w-[200px] cada)
- Valor + Reemb. km + Reemb. refeicao → 3 linhas separadas (max-w-[200px])

**Draft Form (linhas 1751-1821)** -- mesmos 4 blocos:
- OS + Data Emissao → 2 linhas
- Gestor + Projeto → 2 linhas
- Descricao → manter
- Data Inicio + Data Fim → 2 linhas
- Valor + Reemb. km + Reemb. refeicao → 3 linhas

## Campos com max-w (curtos)

| Campo | max-w |
|-------|-------|
| Tipo (PJ/PF) | max-w-[160px] |
| UF | max-w-[120px] |
| Numero | max-w-[120px] |
| CEP | max-w-[160px] |
| CNAE | max-w-[200px] |
| Nº OS | max-w-[200px] |
| Data Emissao | max-w-[200px] |
| Data Inicio | max-w-[200px] |
| Data Fim | max-w-[200px] |
| Valor | max-w-[200px] |
| Reemb. km | max-w-[200px] |
| Reemb. refeicao | max-w-[200px] |

## Arquivo alterado

| Arquivo | Secoes |
|---------|--------|
| `NewClientModal.tsx` | Inline edit e draft form das 3 abas (Contribuintes, Participantes, OS) |

