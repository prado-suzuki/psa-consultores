

## Plan: Scroll buttons com click em vez de hover

### Problema

O Radix `SelectScrollUpButton` e `SelectScrollDownButton` disparam scroll contínuo ao hover — comportamento nativo do Radix que não pode ser alterado via props. Os botões estão definidos (linhas 33-59) mas não são usados dentro do `SelectContent` (linha 76-86).

### Solução

Substituir os Radix scroll buttons por botões customizados que fazem `scrollBy()` no Viewport apenas ao clicar. O Radix não suporta mudar o trigger de hover para click, então usaremos elementos HTML puros.

### Alterações em `src/components/ui/select.tsx`

**1. Criar `SelectContent` com botões customizados (linhas 61-88):**

- Adicionar `useRef` para capturar o `Viewport` DOM node
- Renderizar dois `<button>` customizados (▲ acima e ▼ abaixo do Viewport) que chamam `viewportRef.current.scrollBy({ top: ∓200, behavior: 'smooth' })` no `onClick`
- Mostrar/esconder cada botão conforme `scrollTop` e `scrollHeight` (via `onScroll` listener no viewport)
- Manter `overflow-y-auto` no Viewport para scroll nativo por roda/trackpad

**2. Remover os componentes Radix `SelectScrollUpButton` e `SelectScrollDownButton`** — já não são usados em nenhum lugar do projeto (confirmado: não aparecem no `SelectContent` nem em imports externos).

**3. Estrutura resultante do `SelectContent`:**

```text
<SelectPrimitive.Portal>
  <SelectPrimitive.Content>
    <button ▲ onClick={scrollUp} />   ← visível só quando há scroll acima
    <SelectPrimitive.Viewport ref={viewportRef} onScroll={updateVisibility}>
      {children}
    </SelectPrimitive.Viewport>
    <button ▼ onClick={scrollDown} />  ← visível só quando há scroll abaixo
  </SelectPrimitive.Content>
</SelectPrimitive.Portal>
```

**4. Estilo dos botões:** mesmo visual atual (centered chevron, `py-1`, border sutil), com `cursor-pointer` e hover highlight.

### Resumo

| O quê | Detalhe |
|---|---|
| Arquivo | `src/components/ui/select.tsx` |
| Lógica | Botões customizados com `scrollBy()` no click, visibilidade dinâmica via scroll position |
| Removido | Radix `SelectScrollUpButton`/`SelectScrollDownButton` (não usados) |
| Mantido | Scroll nativo (roda/trackpad) via `overflow-y-auto` no Viewport |

**1 arquivo, ~30 linhas alteradas.**

