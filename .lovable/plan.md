

## Plano: Corrigir Responsividade do ExportDialog

### Problema

O modal usa alturas fixas (`h-[350px]`, `h-[320px]`) nos `ScrollArea` que não se adaptam a viewports menores (laptops 768px–900px de altura). O conteúdo ou transborda ou desperdiça espaço.

### Arquivo: `src/components/equipe/dev/ExportDialog.tsx`

### Alterações

**1. DialogContent — layout flex responsivo (linha 615)**
```
// De:
"max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
// Para:
"max-w-4xl w-[95vw] max-h-[85vh] overflow-hidden flex flex-col"
```
Adiciona `w-[95vw]` para telas estreitas e reduz `max-h` para `85vh` para evitar que o modal encoste nas bordas.

**2. ScrollArea da aba Colunas (linha 714)**
```
// De:
<ScrollArea className="h-[350px] pr-4">
// Para:
<div className="flex-1 min-h-0 overflow-y-auto pr-4">
```
Substituir `ScrollArea` com altura fixa por `div` com `flex-1 min-h-0 overflow-y-auto` (padrão do projeto conforme memory pattern). Isso faz o conteúdo preencher o espaço disponível dinamicamente.

**3. TabsContent da aba Colunas (linha 634)**
```
// De:
className="flex-1 overflow-hidden mt-4"
// Para:
className="flex-1 overflow-hidden mt-4 flex flex-col"
```
Adicionar `flex flex-col` para que o `flex-1` do scroll interno funcione.

**4. ScrollArea da aba Preview (linha 785)**
```
// De:
<ScrollArea className="h-[320px] w-full">
// Para:
<div className="flex-1 min-h-0 overflow-auto w-full">
```
Mesma substituição — usar flex growth em vez de altura fixa.

**5. TabsContent da aba Preview (linha 767)**
```
// De:
className="flex-1 overflow-hidden mt-4"
// Para:
className="flex-1 overflow-hidden mt-4 flex flex-col"
```
E o `div` interno `space-y-4` também precisa de `flex flex-col flex-1 min-h-0`.

**6. Toolbar de perfis — responsividade (linhas 636-684)**
- Adicionar `min-w-0` no `SelectTrigger` para evitar que o select force largura em telas menores
- Os botões de ação já usam `flex-wrap`, manter

### Resultado esperado

O modal se adapta a qualquer viewport entre 600px e 1440px de largura, e 500px a 1080px de altura, sem conteúdo cortado ou espaço desperdiçado. O scroll interno cresce/encolhe conforme o espaço disponível.

