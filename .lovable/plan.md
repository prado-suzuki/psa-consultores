

# Atualizar nomenclatura e layout das abas Cliente e Participantes

## Objetivo

Aplicar o layout grid 2 colunas (igual ao da aba OS) nas abas Cliente e Participantes, incluindo mudancas de nomenclatura identificadas nas imagens de referencia.

## Arquivo alterado

- `src/components/equipe/dev/NewClientModal.tsx`

## Mudancas de nomenclatura

### Aba Cliente

| Label atual | Novo label |
|---|---|
| Empresa / Faturamento * | CENTRO DE CUSTO / FATURAMENTO * |

Isso afeta:
- Label no formulario (linha ~1222)
- Mensagem de validacao (linha ~898): "Empresa / Faturamento e obrigatoria" → "Centro de Custo / Faturamento e obrigatorio"
- Nome da constante `EMPRESA_FATURAMENTO_OPTIONS` e funcao `toggleEmpresaFaturamento` permanecem inalterados (sao internos)

### Aba Participantes

| Label atual | Novo label |
|---|---|
| Nome * | NOME COMPLETO * |
| Cargo/funcao * | TIPO DE PARTICIPANTE * |
| Acesso Chamados | ACESSO A CHAMADOS |

Isso afeta:
- Labels no formulario "Novo Participante" (linhas ~1854, ~1861, ~1890)
- Labels no inline edit de participante
- Labels no card read-only expandido (FieldPair na linha ~1753-1754)

## Mudancas de layout

### Aba Cliente (linhas 1095-1270)

Converter de `flex-col md:flex-row md:items-center` para layout vertical com labels acima dos campos:

```text
NOME DO CLIENTE / GRUPO *
[input full width]

CATEGORIA                STATUS
[select]                 [switch] Ativo

TIPO DE RELACIONAMENTO
[Fixo | Pontual toggle full width]

AREA DO NEGOCIO *
[select full width]

REGIAO *
[select full width]

CPF/CNPJ PRINCIPAL *
[input full width]

CEP *
[input full width]

ENDERECO *
[input full width]

TIPO DE PRODUTO/SEGMENTO *
[select full width]

CENTRO DE CUSTO / FATURAMENTO *
[multi-select badges full width]
```

- Maioria dos campos ocupa largura total (single column)
- Apenas Categoria + Status ficam lado a lado em `grid grid-cols-2`
- Labels: `uppercase text-xs font-semibold text-muted-foreground mb-1.5 block`

### Aba Participantes - Formulario "Novo Participante" (linhas 1851-1914)

Converter para grid 2 colunas:

```text
NOME COMPLETO *              TIPO DE PARTICIPANTE *
[input]                      [select]

EMAIL *                      TELEFONE
[input]                      [input]

ACESSO A CHAMADOS (col-span-2)
[switch]

OBSERVACOES (col-span-2)
[textarea]

[========= Adicionar a Lista =========]
```

### Aba Participantes - Inline Edit (linhas ~1763-1837)

Aplicar o mesmo grid 2 colunas e mesma nomenclatura.

### Aba Participantes - Card Read-only (linhas ~1752-1772)

Atualizar os labels dos FieldPair:
- "Nome" → "Nome Completo"
- "Cargo/funcao" → "Tipo de Participante"

## Resumo de impacto

Somente mudancas visuais (CSS/labels). Nenhuma alteracao de logica, estado ou banco de dados. Os nomes internos de variaveis (`empresa_faturamento`, `tipo_participante`, `cargo`) permanecem inalterados.

