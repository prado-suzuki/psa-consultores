

## Mover botão "Editar" do header para o footer — `NewClientModal.tsx`

### 1. Header (linhas 238-245) — remover botão Editar

Substituir o bloco `<div className="flex items-center gap-2">` inteiro por apenas o botão X:

```tsx
// ANTES (linhas 238-245)
<div className="flex items-center gap-2">
  {isReadOnly && (
    <Button onClick={() => setIsReadOnly(false)} className="gap-2 bg-teal-600 hover:bg-teal-700 text-white" size="sm">
      <Pencil size={14} /> Editar
    </Button>
  )}
  <button onClick={handleAttemptClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
</div>

// DEPOIS
<button onClick={handleAttemptClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
```

### 2. Footer readOnly (linhas 307-310) — adicionar botão Editar

Trocar o `<div />` + Fechar por Fechar à esquerda + Editar à direita:

```tsx
// ANTES (linhas 307-310)
{isReadOnly ? (
  <>
    <div />
    <Button variant="outline" onClick={handleAttemptClose} className="border-gray-300 text-gray-600">Fechar</Button>

// DEPOIS
{isReadOnly ? (
  <>
    <Button variant="outline" onClick={handleAttemptClose} className="border-gray-300 text-gray-600">Fechar</Button>
    <Button onClick={() => setIsReadOnly(false)} className="bg-teal-600 hover:bg-teal-700 text-white gap-2 shadow-lg shadow-teal-600/20">
      <Pencil size={16} /> Editar
    </Button>
```

### Resultado

- Header sempre limpo: `[ícone + título]` ... `[X]`
- Footer readOnly: `[Fechar]` ... `[✏ Editar]` (mesmo padrão do footer de edição)
- Footer edição: sem mudança
- Zero alteração funcional

