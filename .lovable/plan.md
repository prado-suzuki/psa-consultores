

## Ajuste: Visao mais visual das atividades no calendario

### Problema
Atualmente, cada dia do calendario mostra apenas pequenos pontos (bullets) coloridos para representar as tarefas. Isso nao transmite informacao util -- o usuario nao consegue saber o que sao as atividades sem clicar.

### Solucao
Substituir os bullets por mini-cards dentro de cada celula do calendario, mostrando o titulo truncado da tarefa com uma barra lateral colorida indicando o status. Para dias com muitas tarefas, mostrar as 2 primeiras e um indicador "+N mais".

### Alteracoes no arquivo `src/components/sprint/SprintCalendar.tsx`

#### 1. Remover `aspect-square` das celulas
Trocar `aspect-square` por `min-h-[80px] sm:min-h-[100px]` para permitir que o conteudo textual caiba dentro da celula.

#### 2. Substituir os bullets por mini-cards
Em vez de:
```
<div className="w-2 h-2 rounded-full bg-green-500" />
```

Renderizar:
```
<div className="flex items-center gap-1 w-full">
  <div className="w-1 h-4 rounded-full flex-shrink-0 bg-green-500" />
  <span className="text-[10px] leading-tight truncate">Nome da tarefa</span>
</div>
```

#### 3. Limitar a 2 itens visiveis por dia
Mostrar no maximo 2 mini-cards por celula. Se houver mais, exibir `+N mais` como texto clicavel abaixo.

#### 4. Ajustar layout interno da celula
- Conteudo alinhado ao topo com `items-start`
- Gap entre os mini-cards de `gap-0.5`
- Overflow hidden para manter tudo contido

### Resultado Visual Esperado

```text
+------------------+
| 13               |
| | Deploy API     |
| | Review PR      |
| +2 mais          |
+------------------+
```

Cada mini-card tem uma barra lateral fina colorida (verde/amarelo/cinza) indicando o status, seguida do titulo truncado da tarefa em fonte pequena. Muito mais informativo que pontos coloridos.

### Detalhes Tecnicos

| Item | Detalhe |
|---|---|
| Arquivo editado | `src/components/sprint/SprintCalendar.tsx` |
| Linhas afetadas | ~98-135 (renderizacao dos dias) |
| Mudanca principal | Bullets substituidos por mini-cards com barra de status + titulo truncado |
| Limite por celula | 2 itens visiveis + contador "+N mais" |
| Altura celula | `min-h-[80px] sm:min-h-[100px]` em vez de `aspect-square` |

