## Plano: Adicionar bloco XML na aba EFD ICMS

A API agora retorna um objeto `XML` em cada nota, com `CFOP` (array) e `VL_DOC` (number | null). Precisamos tipar e exibir esses dados na tabela.

### Alterações

**1. `src/types/efdcIcms.ts**`

- Adicionar interface `EfdcIcmsXmlSide` com `CFOP: number[]` e `VL_DOC: number | null`
- Adicionar campo opcional `XML?: EfdcIcmsXmlSide` em `EfdcIcmsNota`

**2. `src/components/equipe/dev/auditoria/EfdcIcmsTab.tsx**`

- Adicionar grupo de colunas "XML" no header (colSpan 2: CFOP + Valor Doc)
- Atualizar o header row 1: agora 3 grupos (EFD ICMS | EFD Contribuições | XML)
- Atualizar o header row 2: adicionar 2 colunas (CFOP, Valor Doc) para XML
- No body: renderizar `nota.XML?.CFOP.join(', ')` e `nota.XML?.VL_DOC` (com formatBRL ou "—" se null)
- Tratar ausencia do bloco XML com fallback gracioso
- Caso o campo de xml esteja vazio apresentar a mensagem "XML de nota não encontrado"

### Arquivos alterados


| Arquivo           | Alteração                                                        |
| ----------------- | ---------------------------------------------------------------- |
| `efdcIcms.ts`     | Nova interface `EfdcIcmsXmlSide` + campo `XML` em `EfdcIcmsNota` |
| `EfdcIcmsTab.tsx` | 2 colunas extras no header + renderização XML no body            |
