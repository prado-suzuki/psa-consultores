

## Diagnóstico

O código do `SelectTrigger` (linhas 26-28) **não foi alterado** — o `ChevronDown` ainda está lá. Porém, a troca de `overflow-hidden` para `overflow-auto` no `SelectPrimitive.Content` pode causar um bug visual no Radix onde o ícone do trigger some ou fica cortado em determinados navegadores/condições de renderização.

O Radix Select espera `overflow-hidden` no Content e delega o scroll ao `Viewport` internamente.

## Correção

**Arquivo: `src/components/ui/select.tsx`** — linha 69:

Reverter `overflow-auto` para `overflow-hidden` no `SelectPrimitive.Content`. Adicionar `overflow-y-auto` diretamente no `SelectPrimitive.Viewport` para garantir o scroll nativo sem os botões de hover.

```
Antes (Content):  "... overflow-auto rounded-md ..."
Depois (Content): "... overflow-hidden rounded-md ..."

Antes (Viewport): className="p-1"
Depois (Viewport): className="p-1 max-h-96 overflow-y-auto"
```

E remover `max-h-96` do Content (mover para Viewport).

**1 arquivo, 2 linhas alteradas.** Os scroll buttons continuam removidos. O chevron do trigger volta a funcionar normalmente.

