

## Plano: Corrigir Bugs de Validação no Cadastro de Contribuintes

### 2.1 — IE: UF condicional (ContribuintesTab.tsx)

**Linha 98-99:** A validação `if (!ie.uf)` itera sobre todas as `draftInscricoes` sem checar `ie.situacao`. Corrigir para:

```tsx
for (const ie of draftInscricoes) {
  if (ie.situacao === "sim" && !ie.uf) { toast.error("Selecione a UF para todas as inscrições estaduais"); return; }
  if (ie.situacao === "sim" && !ie.numero_ie?.trim()) { toast.error(`Informe o número da IE para o estado ${ie.uf}`); return; }
}
```

Adicionalmente, verificar se ao trocar `situacao_inscricao_estadual` para "nao"/"isento" o array `draftInscricoes` já é limpo (a lógica existente na linha ~466 já faz isso — confirmarei a exatidão).

### 2.2 — Paridade de validação no saveEditEntity (ContribuintesTab.tsx)

**Linhas 61-70:** Atualmente só valida CEP. Replicar todas as validações do `addEntity()`:

- CPF/CNPJ presente e com 11 ou 14 dígitos
- Razão Social / Nome Completo não vazio
- CEP, Logradouro, Bairro, Município, UF obrigatórios
- Se PJ: CNAE e Simples Nacional obrigatórios

### 2.3 — Remover "Indústria" hardcoded (constants.ts + ContribuintesTab.tsx)

| Arquivo | Linha | Alteração |
|---------|-------|-----------|
| `constants.ts` | 173 | `setor: "Indústria"` → `setor: ""` |
| `ContribuintesTab.tsx` | 115 | `setor: "Indústria"` → `setor: ""` (reset após adicionar) |

### Arquivos modificados

| Arquivo | Alterações |
|---------|-----------|
| `ContribuintesTab.tsx` | Validação IE condicional (L98-99), paridade saveEditEntity (L61-70), reset setor vazio (L115) |
| `constants.ts` | Default setor vazio (L173) |

