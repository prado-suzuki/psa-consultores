

## Plano: Corrigir Máscara de DCOMP para formato completo

### Situação atual

| Componente | Campo | Formato atual | Correto? |
|---|---|---|---|
| `PerFormModal.tsx` | `numero_processo_per` (PER) | `XXXXX.XXXXX.XXXXXX.X.X.XX-XXXX` (26 dígitos) | Sim |
| `DcompFormModal.tsx` | `nr_documento` (DCOMP) | `XXXXX.XXXXX/XXXX-XX` (16 dígitos) | **Errado** |
| `CargaPerdcompCSV.tsx` | Exemplos CSV de DCOMP | `DC123456` (sem máscara) | Desatualizado |

O PER já usa o formato correto de 26 dígitos. O DCOMP usa um formato antigo de 16 dígitos com barra.

### Formato alvo (igual ao PER)

```
00452.02945.200226.1.3.18-4556
```
Padrão: `XXXXX.XXXXX.XXXXXX.X.X.XX-XXXX` — 26 dígitos nuéricos.

---

### Alterações

#### 1. `src/components/equipe/dev/perdcomp/DcompFormModal.tsx`
- **L47-55**: Substituir `formatDcompNumber` pela mesma lógica de `formatProcessNumber` do PerFormModal (26 dígitos, separadores por ponto e traço)
- **L293**: Atualizar placeholder de `XXXXX.XXXXX/XXXX-XX` para `00000.00000.000000.0.0.00-0000`

#### 2. `src/components/equipe/dev/perdcomp/CargaPerdcompCSV.tsx`
- **L405-407**: Atualizar exemplos CSV de DCOMP para usar o formato correto (`00452.02945.200226.1.3.18-4556` em vez de `DC123456`)

#### 3. `src/components/equipe/dev/perdcomp/PerDetailModal.tsx`
- Verificar se exibe `nr_documento` dos DCOMPs — se sim, sem alteração necessária pois exibe o valor salvo no banco

#### 4. `src/pages/equipe/dev/ControlePerdcomp.tsx`
- Sem alteração — exibe valores do banco diretamente

### Nota importante

Dados existentes no banco com formato antigo (`XXXXX.XXXXX/XXXX-XX`) continuarão sendo exibidos como estão. A máscara nova aplica-se apenas a novos registros e edições.

---

4 pontos de edição em 2 arquivos (`DcompFormModal.tsx` e `CargaPerdcompCSV.tsx`).

