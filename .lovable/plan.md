

## Plano: Remover ícone da coluna Projeto e otimizar larguras para tela 14"

Uma tela de 14" tem ~1366px de largura. Com sidebar (~220px), sobram ~1146px para a tabela. As datas em `dd/MM/yyyy` precisam de ~85px mínimo. Atualmente Status/Início/Término estão com 5% (~57px), insuficiente.

### Arquivo: `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`

**1. Remover ícone `FolderKanban` da célula Projeto** (linha 592) — exibir apenas o nome em `font-medium`, sem o `div flex items-center gap-2`.

**2. Redistribuir larguras para caber em ~1146px:**

| Coluna | Atual | Nova | Motivo |
|--------|-------|------|--------|
| Projeto | 21% | 18% | Sem ícone, ganha espaço |
| Produto | 17% | 14% | Texto quebra em linhas |
| Serviço | 14% | 12% | Texto quebra em linhas |
| Cliente | 13% | 11% | Truncate já aplicado |
| Área | 10% | 8% | Textos curtos |
| Equipe | 10% | 9% | Nomes abreviados |
| Status | 5% | 7% | Badge precisa de espaço |
| Início | 5% | 7% | `dd/MM/yyyy` precisa ~85px |
| Término | 5% | 7% | `dd/MM/yyyy` precisa ~85px |
| Ações | auto | 7% | 2 botões icon |

**3. Datas em formato compacto** — trocar `dd/MM/yyyy` por `dd/MM/yy` para economizar ~20px por coluna.

**4. Aplicar `min-w-[1000px]`** na tabela (atualmente `min-w-[900px]`) para garantir legibilidade mínima antes do scroll horizontal.

