

## Tooltips informativos na ferramenta Correções SPED

Adicionar tooltips com ícone `Info` (i) seguindo o padrão já usado na Apuração PIS/COFINS: `<Tooltip><TooltipTrigger asChild><Info className="h-3.5 w-3.5 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">...</TooltipContent></Tooltip>`.

---

### Arquivos alterados

#### 1. `src/pages/equipe/dev/CorrecoesSped.tsx`

**Imports:** Adicionar `Info` ao import de lucide e `Tooltip, TooltipTrigger, TooltipContent` de `@/components/ui/tooltip`.

**Filtro NCM (linha 152):** Ao lado do `<Label>NCM</Label>`, adicionar tooltip: *"Filtra os itens da tabela cruzando a informação com o NCM vinculado ao produto no Registro 0200 do SPED."*

**Modal "Itens XML" (linha 319-321):** Ao lado do título `<h4>Itens XML (NFe)...</h4>`, adicionar tooltip: *"Relação original de todos os itens da nota no XML. Útil para revisar registros do SPED que agruparam vários produtos em uma só linha."*

#### 2. `src/components/equipe/dev/correcoes-sped/TabC170.tsx`

**Imports:** Adicionar `Info` ao import de lucide e `Tooltip, TooltipTrigger, TooltipContent`.

**Super-cabeçalho "XML" (linha 387):** Tooltip inline: *"Dados lidos diretamente do arquivo XML original para confronto com a escrituração (SPED)."*

**Coluna "NCM (0200)" (linha 392):** Tooltip: *"NCM declarado na EFD. Como o Registro C170 não possui campo de NCM, este dado é trazido do Registro 0200 correspondente ao item."*

**Coluna "Descricao" XML (linha 395):** Tooltip: *"Descrição do produto no XML (tag \<xProd\>). Exibe 'Consolidado' quando o sistema identifica que vários itens do XML foram agrupados em uma única linha no SPED."*

**Coluna "NCM" XML (linha 396):** Tooltip: *"NCM do produto no XML (tag \<NCM\>). Fica em vermelho quando não bate com o NCM declarado no Registro 0200 do SPED."*

**Coluna "Valor" XML (linha 397):** Tooltip: *"Valor do produto no XML (tag \<vProd\>). Fica em laranja quando há diferença em relação ao valor bruto (VL_ITEM) declarado no SPED."*

**Coluna "Conta" (linha 404):** Tooltip: *"Código da conta analítica contábil (Registro 0500) representativa da operação."*

#### 3. `src/components/equipe/dev/correcoes-sped/TabA170.tsx`

**Imports:** Adicionar `Info` e tooltip components.

**Barra de resumo (linha 409):** Ao lado do texto "Clique no lápis...", adicionar tooltip: *"As correções feitas aqui são salvas no banco de dados. O registro original é preservado intacto."*

**Coluna "NCM" (linha 423):** Tooltip: *"NCM trazido do Registro 0200 correspondente a este item."*

**Coluna "Conta" (linha 424):** Tooltip: *"Código da conta analítica contábil (Registro 0500) representativa da operação."*

**Coluna "Ações" (linha 425):** Tooltip: *"Permite corrigir os valores da linha. Se você desfazer as edições e salvar com os valores originais, a correção será inativada."*

**Badge "Corrigido" (linha 506):** Envolver com tooltip: *"Indica que esta linha foi alterada e possui valores diferentes do arquivo SPED originalmente importado."*

#### 4. `src/components/equipe/dev/correcoes-sped/TabD100.tsx`

**Imports:** Adicionar `Info` e tooltip components.

**Coluna "Simples" (linha 98):** Tooltip: *"Indica se o participante da operação é optante pelo Simples Nacional."*

**Coluna "Valor Doc" (linha 99):** Tooltip: *"Valor total do documento fiscal de transporte."*

#### 5. `src/components/equipe/dev/correcoes-sped/TabF100.tsx`

**Imports:** Adicionar `Info` e tooltip components.

**Super-cabeçalho "EFD" (linha 91):** Tooltip: *"O Bloco F consolida receitas financeiras, aluguéis e demais operações não escrituradas nos Blocos A, C e D."*

**Coluna "Tipo" (linha 98):** Tooltip: *"Classificação do participante da operação (Física ou Jurídica)."*

**Coluna "Simples" (linha 99):** Tooltip: *"Indica se o participante da operação é optante pelo Simples Nacional."*

---

### Padrão visual

Cada tooltip segue o formato:
```tsx
<TableHead className="...">
  <span className="flex items-center gap-1">
    Nome da Coluna
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="h-3 w-3 cursor-help text-muted-foreground/70" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        Texto do tooltip aqui.
      </TooltipContent>
    </Tooltip>
  </span>
</TableHead>
```

Para super-cabeçalhos (colSpan), o `Info` fica inline ao lado do texto existente.

**Total: 5 arquivos alterados, ~19 tooltips adicionados.**

