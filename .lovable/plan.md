

## Reorganizar: cards de urgencia ao lado do badge "Ativa" e manter somente filtros na barra

### O que sera feito
1. Mover os botoes "Hoje (X)", "Amanha (X)" e "Atrasados (X)" para a linha do header, ao lado do badge "Ativa"
2. Na barra de filtros, manter somente os Selects (Responsavel, Status, Ano, Mes, Pessoa) e o botao Limpar

### Alteracoes

**Arquivo:** `src/pages/equipe/EquipeSprintDetalhes.tsx`

#### 1. Header (linhas 1094-1110)
Adicionar os 3 botoes de urgencia (Hoje, Amanha, Atrasados) na mesma linha do botao "Voltar" e do badge "Ativa", entre eles:

```
[← Voltar]    [Hoje (35)] [Amanhã (0)] [Atrasados (16)]    [Ativa]
```

#### 2. Barra de filtros (linhas 1113-1211)
Remover o bloco dos 3 botoes de urgencia (linhas 1139-1168) e o separador (linha 1171). A barra ficara apenas com:

```
[Responsável ▾] [Status ▾] [Ano ▾] [Mês ▾] [Pessoa ▾] [Limpar]  X de Y entregáveis
```

### Detalhes Tecnicos

| Item | Detalhe |
|---|---|
| Arquivo | `src/pages/equipe/EquipeSprintDetalhes.tsx` |
| Linhas do header | ~1094-1110 - adicionar botoes de urgencia |
| Linhas da barra | ~1139-1171 - remover botoes de urgencia e separador |
| Funcionalidade | Sem mudanca - os botoes continuam alternando `filterDate` |

