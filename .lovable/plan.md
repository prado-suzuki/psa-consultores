

# Plano: Tornar campos obrigatórios consistentes e remover "Todos os clientes"

## Mudanças no arquivo único `src/pages/equipe/dev/ConsultaXMLs.tsx`

### 1. Estado inicial — remover pré-seleções dos obrigatórios

- Trocar `useState(DEFAULT_TIPO_DOCUMENTO)` por `useState<"nfe" | "cte" | "">("")` para Tipo Doc.
- Trocar `useState(DEFAULT_DATA_INICIO)` e `useState(DEFAULT_DATA_FIM)` por `useState("")` em ambos.
- `handleClearFilters` segue a mesma lógica: limpa Tipo Doc, Data Início e Data Fim para `""` (sem defaults).
- Ajustar tipo de `tipoDocumento` na assinatura do `Select.onValueChange` e nas props passadas para `<ExportDialog>` (cast/guard quando `""`).

### 2. Tooltips — marcar obrigatoriedade explícita

Atualizar constante `TOOLTIPS`:
- `cliente`: "Filtra os dados por grupo econômico. **Obrigatório.**"
- `contribuinte`: já diz obrigatório — manter.
- `tipoDoc`: "Define se a busca trará notas NFe ou CTe. **Obrigatório.**"
- `dataInicio` / `dataFim`: já dizem obrigatório — manter.

### 3. Asterisco visual (`<RequiredMark />`) em todos os obrigatórios

Adicionar `<RequiredMark />` ao lado das labels:
- **Tipo Doc.** (linha ~742)
- **Data Início** (linha ~802)
- **Data Fim** (linha ~835)

(Cliente e Contribuinte já têm.)

### 4. Placeholders de estado vazio

- **Cliente** (linha ~677): trocar `"Todos os clientes"` por `"Selecione um cliente"`.
- **Tipo Doc.** (linha ~754): adicionar `<SelectValue placeholder="Selecione o tipo do doc" />`.
- **Data Início / Data Fim**: já mostram "Selecione" quando vazio — OK.

### 5. Remover opção "Todos os clientes"

- Excluir o `<SelectItem value="all">Todos os clientes</SelectItem>` (linha 683).
- O Select de Cliente passa a carregar vazio mostrando o placeholder.

### 6. Validação no `handleSearch`

Bloquear busca e exibir `toast` com mensagem clara quando faltar qualquer obrigatório:
```
if (!selectedCliente || !selectedContribuinte || !tipoDocumento || !dataInicio || !dataFim) {
  toast({ title: "Campos obrigatórios", description: "Preencha Cliente, Contribuinte, Tipo Doc., Data Início e Data Fim.", variant: "destructive" });
  return;
}
```

### 7. Atualizar `isBuscarDisabled`, `isBaixarXmlsDisabled`, `isExportDisabled`

Incluir as novas condições obrigatórias:
```
const allRequiredFilled = selectedCliente && selectedContribuinte && tipoDocumento && dataInicio && dataFim;
const isBuscarDisabled = !allRequiredFilled || isLoading;
```
E aplicar `allRequiredFilled` também nos botões de download/exportar (mantendo o check de records).

### 8. `hasActiveFilters`

Já considera campos vazios como inativos, então o botão "Limpar filtros" só aparecerá após o usuário tocar em algo — comportamento correto.

## Escopo

- **1 arquivo**: `src/pages/equipe/dev/ConsultaXMLs.tsx`
- **Sem novos componentes**, sem mudança de schema, sem mudança em hooks.

