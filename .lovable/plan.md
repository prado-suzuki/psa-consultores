
# Ajustes na Tabela de Controle PERDCOMP

## Resumo
Reorganizar colunas da tabela, remover coluna desnecessária e adicionar novos filtros de pesquisa.

## Alterações

### 1. Reordenar Colunas da Tabela
A nova ordem será:
1. Nº Processo (primeira coluna, destaque)
2. Situação
3. Atualização
4. Exercício
5. Trimestre
6. Data Solicitada
7. Tipo Crédito
8. Valor Crédito
9. Ações

### 2. Remover Coluna "Contribuinte"
A coluna "Contribuinte" será removida da tabela, já que o contribuinte já está selecionado nos filtros superiores.

### 3. Adicionar Novos Filtros
- **Exercício**: Select com anos (2020-2026)
- **Nº do Processo**: Input de texto para digitar/buscar pelo número

### 4. Atualizar Lógica de Filtragem
Os novos filtros serão aplicados no frontend sobre os dados retornados, filtrando:
- Por ano de exercício selecionado
- Por número do processo (busca parcial)

## Detalhes Técnicos

### Estados a adicionar
```typescript
const [exercicioFilter, setExercicioFilter] = useState<string>('');
const [processoFilter, setProcessoFilter] = useState<string>('');
```

### Layout dos filtros (grid 6 colunas)
- Cliente: 1 coluna
- Contribuinte: 1 coluna  
- Exercício: 1 coluna
- Nº Processo: 1 coluna
- Botões: 2 colunas

### Filtragem dos dados
```typescript
const filteredPerData = perData.filter(item => {
  if (exercicioFilter && item.exercicio !== parseInt(exercicioFilter)) return false;
  if (processoFilter && !item.numero_processo_per.includes(processoFilter)) return false;
  return true;
});
```

### Nova estrutura da tabela
```text
| Nº Processo | Situação | Atualização | Exercício | Trimestre | Data Solicitada | Tipo Crédito | Valor Crédito | Ações |
```

**Arquivo a modificar:** `src/pages/equipe/dev/ControlePerdcomp.tsx`
