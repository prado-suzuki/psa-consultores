

# Plano Corrigido: Ajustes no Modal de Cadastro de Clientes

## 1. "Confirmar Dados" só aparece após ao menos 1 OS no formulário

**Arquivo**: `NewClientModal.tsx` (linhas 1031-1042)

Envolver o botão com `contracts.length > 0` — sem exceção para modo edição. Se não houver nenhuma OS adicionada no draft local, o botão fica oculto independentemente do contexto.

```text
{contracts.length > 0 && (
  <Button onClick={handleSave} ...>
    {isEditing ? "Salvar Alterações" : "Confirmar Dados"}
  </Button>
)}
```

## 2. Substituir todos os `*` literais por `<RequiredMark />`

**ClienteTab.tsx**: `Área do negócio *` e `Região *` → usar `<RequiredMark />`

**ContribuintesTab.tsx**: Todos os campos com `*` literal (Nome/Razão Social, Município, Bairro, Logradouro, etc.) → usar `<RequiredMark />`

**ContratosTab.tsx**: `Serviço Contratado *` (edição e draft) → usar `<RequiredMark />`

Adicionar `import { RequiredMark } from "@/components/ui/required-mark"` nos 3 arquivos.

## 3. Remover botões "Voltar" e "Cancelar" do footer

**Arquivo**: `NewClientModal.tsx`
- Remover botão "Voltar" (linhas 1008-1012)
- Remover botão "Cancelar" (linhas 1023-1025)

Footer ficará apenas com "Avançar" e "Confirmar Dados" (quando `contracts.length > 0`).

