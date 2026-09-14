# Produtos & Serviços — o cadastro, e o número que era digitado de cabeça

**Frente de 14/09/2026, na `develop`. Entregue em quatro commits**, cada um validado
visualmente pela Patrícia antes do seguinte.

O gatilho foi dela, sobre `/equipe/acessos › Produtos & Serviços`: *"pouco responsiva e
deveras complexa sem necessidade, além disso a numeração eu preciso escrever na mão"*, e
depois *"essa página está zero intuitiva"*.

## O diagnóstico, medido em produção

Leitura por MCP do Lovable (`SELECT`), 14/09/2026.

`servicos_prestados` tem **três colunas**: `id`, `nome`, `cluster_id`. Não existe coluna de
código. O número que a operação usa para se referir a um serviço vive **dentro da string do
nome**, e `src/lib/produtoServicoNomes.ts` o recorta de volta a cada render.

O que isso já tinha custado:

| | |
|---|---|
| 123 serviços | 30 sem número nenhum |
| TAX | 82 serviços, 68 numerados, **25 códigos distintos** — "1.1" em 8 serviços, "5.2" em 6, "4" em 6 |
| OSG | 40 serviços, 40 códigos, todos únicos, com zero à esquerda (`2.01`…`2.16`) |

Duas convenções incompatíveis na mesma coluna de texto livre, e uma terceira dentro do TAX:
cinco nomes com o número colado sem ponto (`1Constituição / Alteração contratual`).

**O dano real não é estético.** Sem código não há busca por código; sem busca, quem não
acha um serviço cadastra outro. Existem **5 pares de serviço idêntico**, e os vínculos
caíram em cópias diferentes:

```
"1.1.Apoio no fechamento contábil"  → 0 produtos, 2 projetos
"Apoio no fechamento contábil"      → 1 produto,  1 tarefa
"Estudo para setor específico"      → existe como "3." e como "4.", os dois vinculados
"Elaboração de PER/DCOMP"           → existe como "6.2" e como "6.4"
```

E o número vaza: `gerar_tarefas_projeto` copia `sp.nome` cru para `org_tasks.title` —
**273 das 985 tarefas** em produção carregam o número no título.

Na tela: **um** breakpoint na feature inteira; 280px + 320px reservados antes de a lista
receber qualquer coisa; três gestos na mesma faixa; quatro caminhos para a mesma ação.

## A decisão que definiu a ordem

A proposta original começava por uma coluna `codigo` + migration. **A Patrícia recusou**:
*"não quero fazer migration nem criar coluna nova antes de arrumar o jeito que é feito o
cadastro hoje"*. É a ordem certa — enquanto o formulário deixa digitar o número, qualquer
coluna nova nasce com o mesmo problema dentro.

Validação visual antes de qualquer código, por exigência dela: protótipo com os dados reais,
alternando *hoje* ⇄ *proposta* e simulando a largura da janela.

## O que foi entregue

| commit | o quê |
|---|---|
| `5bfdd4d7` | **Número e Nome viram campos separados**, remontados na gravação (`montarNomeServico`) no formato de sempre. `proximoCodigoLivre` lê a convenção de cada cluster e propõe o primeiro vago. Avisos ao vivo de código já ocupado e de nome já existente |
| `aa43c345` | **A barra para de disputar espaço consigo mesma.** `AcoesEmMassaMenu` deletado; as duas ações viram uma caixa na cabeça da lista. Filtro vira seletor. Linha de instrução sai. A linha do serviço perde "vinculado" e "usado em N produtos" |
| `11c37fdb` | **O painel de 320px vira `Sheet`** sob demanda. Os cartões de Páginas/Usuários/Permissões saem desta aba |
| *(dentro de `e28fce6a`)* | **Abaixo de `lg` a coluna de produtos sai** e o produto vira seletor no cabeçalho |
| `956a4474` | **"Copiar de outro produto"** — só acrescenta, com dois números por candidato. `useVinculoProdutoServicoController` nasce porque a tela cruzou o teto de 600 linhas |

⚠️ O responsivo **não tem commit próprio**: uma sessão paralela commitou o working tree
inteiro e o levou junto em `e28fce6a`, que é sobre a matriz de acessos. O código está
íntegro; o que se perdeu foi o raio de revert.

**Decidido e fechado:** o shift+clique para selecionar faixa **fica**.

## O que esta frente NÃO fez

O formulário impede o passivo de crescer. Não o limpa. Continua em aberto, sem aprovação:

- a coluna `codigo` (parada por decisão dela — quando entrar, só três leituras trocam de
  fonte, e `produtoServicoNomes.ts` encolhe)
- curar os 5 pares duplicados, migrando vínculo e tarefa para a linha que fica
- numerar os 30 serviços sem número
- os 273 títulos de tarefa que carregam o número
- a trava `unique (cluster_id, codigo)`, que só é segura depois da curadoria
