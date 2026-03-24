

## Plano: Modal de Regras NCM na Correções SPED

Ao clicar na célula NCM de uma linha da tabela, abre um modal que busca todas as regras cadastradas na `pis_cofins_regra` para aquele NCM. O modal reutiliza o `RegraFormSheet` existente para edição/criação, e apresenta as regras em cards colapsáveis.

---

### Arquitetura

```text
src/
├── components/equipe/dev/pis-cofins/
│   ├── RegraFormSheet.tsx          ← Existente (reutilizado para editar/criar)
│   └── NcmRegrasModal.tsx          ← NOVO — modal de consulta/listagem
├── hooks/useRegrasNCM.ts           ← Existente (já tem query + CRUD)
└── pages/equipe/dev/CorrecoesSped.tsx  ← Alterado (adiciona click handler na coluna NCM)
```

---

### 1. Novo componente: `NcmRegrasModal.tsx`

**Props**: `open`, `onOpenChange`, `ncm: string | null`

**Comportamento**:
- Consome `useRegrasNCM()` (já carrega todas as regras) e filtra client-side por `cod_ncm === ncm`
- Título dinâmico: "Regras NCM {ncm}" (consulta) / "Editar Regra" / "Nova Regra para NCM {ncm}"
- Corpo: lista de `Collapsible` cards (um por regra encontrada)
  - Cada card colapsado mostra: Setor, CST, Crédito (badge), Base Legal (truncado)
  - Expandido: todos os campos (vigência, observações, auditoria updated_at/by)
  - Botão "Editar" no card → abre `RegraFormSheet` em modo `edit` com a regra selecionada
- Se 0 regras: empty state com botão "Adicionar Regra"
- Footer: botão "Adicionar Regra" (abre `RegraFormSheet` em modo `create` com `cod_ncm` pré-preenchido)
- Usa `useSetoresCliente` para resolver nomes de setor (já usado no Mapa NCM)

**Reutilização do `RegraFormSheet`**:
- Renderizado dentro do `NcmRegrasModal` como segundo `Dialog`
- Quando abre para criar, pré-preenche `cod_ncm` com o NCM do contexto
- `onSubmit` chama `createRegra.mutate` ou `updateRegra.mutate` do `useRegrasNCM`
- Ao fechar o form, volta à listagem

---

### 2. Alteração: `CorrecoesSped.tsx`

- Novo state: `selectedNcm: string | null`
- Na célula NCM da tabela (linha ~254-259), tornar clicável (cursor-pointer, hover underline)
- Clicar define `selectedNcm` e abre o `NcmRegrasModal`
- Importar e renderizar `<NcmRegrasModal>` no final do JSX

---

### 3. Ficheiros alterados/criados

| Arquivo | Ação |
|---|---|
| `src/components/equipe/dev/pis-cofins/NcmRegrasModal.tsx` | Criar |
| `src/pages/equipe/dev/CorrecoesSped.tsx` | Alterar (click handler NCM + render modal) |

Zero alteração no hook `useRegrasNCM` ou no `RegraFormSheet` (reutilizados tal como estão).

