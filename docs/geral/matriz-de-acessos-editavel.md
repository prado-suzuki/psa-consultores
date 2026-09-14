# A matriz de acessos passa a editar

**14/09/2026.** Decisões dela, tomadas antes de escrever código, e o que foi
medido para chegar nelas.

## O que abriu a frente

Duas queixas na mesma mensagem, sobre a seção **Papéis** de `/equipe/acessos`:

1. a área não é responsiva;
2. para ajustar papel de meia dúzia de pessoas era preciso entrar em usuário
   por usuário, abrindo o diálogo de edição a cada um.

## Parte 1 — a responsividade, e por que o `md` era o pior ponto possível

O que dita a largura aqui **não é a viewport, é a coluna de conteúdo**. Abaixo
de `md` (768px) a barra lateral vira gaveta e o conteúdo pega a tela inteira;
a partir de 768px ela volta ao fluxo e leva 256px. Em 768px cravados a coluna
tem `768 − 256 − 48 (padding) = 464px` — e era exatamente ali que os três grids
disparavam para o máximo de colunas.

| Bloco | Classe | Em 768px | Depois |
|---|---|---|---|
| 4 cartões (`UsersRolesView`) | `md:grid-cols-4` | 116px/cartão, 68px úteis | `sm:grid-cols-2 xl:grid-cols-4` |
| 3 cartões (`AccessStatsCards`) | `md:grid-cols-3` | 155px/cartão, 107px úteis | `sm:grid-cols-2 xl:grid-cols-3` |
| Legenda (7 caixas) | `lg:grid-cols-6` (1024px) | 120px/caixa para ~100 caracteres | `sm:2 lg:3 2xl:6` |

A tabela tinha **dez colunas**, e a causa não era o número de papéis: a coluna
"Permissões" (pílulas) e as sete colunas de ✓/✗ **são a mesma informação escrita
duas vezes**. Ela rolava na horizontal — e a coluna "Usuário" rolava junto, o
que faz chegar na coluna "Marketing" sem saber de quem é a linha.

A linha passa a mostrar **uma das duas**: pílulas abaixo de `lg`, matriz de `lg`
para cima. Email vira coluna só a partir de `xl`; antes disso fica embaixo do
nome, no mesmo empilhamento que a lista da aba ao lado já usa. Nenhuma
lista-de-cartões paralela foi criada — duas árvores para a mesma linha é o que
diverge depois.

## Parte 2 — a célula grava

### O eixo entre as duas telas mudou de nome, não sumiu

`secoesDeAcessos.ts` registrava, escrito, que a divisão era **leitura x
escrita**: "a de cima EDITA usuário e papel, esta MOSTRA quem tem o quê". Isso
caiu. O eixo agora é **recorte**:

- **Usuários Estrutura** — *uma pessoa, tudo dela*: nome, e-mail, papéis, áreas,
  equipes e a árvore de páginas item a item.
- **Papéis** — *todo mundo, uma dimensão só*, e edita essa dimensão no clique.

Recusar a escrita na tela que já mostrava todos lado a lado era mandar a pessoa
de volta ao diálogo que a incomodava.

### As decisões dela

| Pergunta | Escolha | Alternativa recusada |
|---|---|---|
| Escopo | Papéis + Áreas + Equipe em lote | só Papéis |
| Gesto | grava no clique, com Desfazer | acumular pendências até um "Salvar" |

O "Salvar" foi recusado porque devolveria metade do custo que abriu a frente: um
botão de confirmar por rodada. A rede de segurança passou a ser o **Desfazer**,
de 10 segundos.

### O recorte de `alterados`, que é o que faz o Desfazer não ser destrutivo

Toda mutação **lê o estado antes** e calcula quem de fato muda. Marcar `admin`
em 12 pessoas das quais 9 já eram admin escreve 3 linhas, audita 3 e devolve 3
ids; o Desfazer aplica o inverso **só nesses**. Sem esse recorte, desfazer
tiraria o papel das 9 que já o tinham antes do clique.

É também por isso que o clique numa célula e a ação em lote são **a mesma
mutação** (`userIds: string[]`, `length === 1` no clique): duas versões da mesma
escrita divergiriam em auditoria, invalidação e regra de permissão, e a que
diverge é sempre a menos usada.

### Duas colunas, nunca as doze juntas

São 7 papéis e 5 áreas. Juntas seriam 12 colunas de ícone mais nome, e-mail e
seleção — e a versão que "cabia" só cabia rolando para o lado. Um interruptor
troca o eixo mantendo as mesmas linhas, o mesmo filtro e a mesma seleção.

**Equipe não virou coluna**: é uma árvore cluster › área › equipe com dezenas de
opções, não uma matriz. Entra só pela barra de lote.

### Duas travas

- **Ninguém remove o próprio `admin`.** Vive na mutação, não no botão: quem se
  tranca para fora perde a própria tela de acessos e não tem caminho de volta
  pelo produto.
- **A seleção só alcança quem está visível.** Marcar 20, filtrar por Tax e
  clicar em Remover não pode atingir quem saiu da tela — é o tipo de surpresa
  que nenhum Desfazer cobre bem.

### O que NÃO acontece

Tirar `team_member` de alguém **não** revoga as páginas dele. É o comportamento
que o diálogo já tinha (sem papel interno, o `syncAreaAccess` nem roda) e é
deliberado: papel e acesso a página são dois eixos, e é por não se implicarem
que a matriz os mostra em colunas separadas.

## O defeito achado no caminho

O card **"Permissões Customizadas"** mostrava **1000**. Produção tem **1494**
linhas em `user_page_access`.

Não era arredondamento: o PostgREST corta a resposta em 1000 linhas e **não
avisa** — vem um array de 1000, sem erro e sem flag. O docstring de
`useUserPageAccess` já registrava o corte como "atenção", o que deixou a
promessa da assinatura ("traz tudo") valendo no papel e falsa na tela. **Um
terço dos vínculos era invisível** para qualquer leitura global.

Agora ele pagina de mil em mil, com `order('id')` para o recorte ser estável
entre as viagens — sem ordem explícita o Postgres não promete a mesma sequência,
e uma linha poderia vir duas vezes ou nenhuma.

> **A lição que não vale só para esta tabela:** um teto de paginação não se
> parece com um erro, se parece com um número redondo. Todo `select` sem
> `.range()` numa tabela que cresce é um desses esperando a linha 1001.

## Duas extrações, e por que elas precisavam sair

Saíram sem mudar comportamento, com teste de caracterização:

- **`src/lib/filtroDeUsuarios.ts`** — filtro por nome/papel/área e ordenação por
  hierarquia, que estavam dentro do `useMemo` da aba Usuários.
- **`src/lib/areasDeAcessoDoUsuario.ts`** — a inferência "área é ter acesso a ao
  menos UMA página de alguma categoria dela", que estava dentro do `useEffect`
  do `EditUserDialog`. É `some` e **não** `every`: categoria sem página
  cadastrada existe, e com `every` ela zeraria a área para todo mundo.

A segunda é a que tinha de sair de qualquer jeito. Duas cópias da inferência —
uma no diálogo, outra na matriz — diriam coisas diferentes sobre **a mesma
pessoa na mesma tela**.

## Cuidado ao mexer: "área" é duas coisas nesta tela

- `areasPorUsuario` (`useDomainAreasPorUsuario`) = área da **estrutura**: em que
  equipe/área organizacional a pessoa está. Alimenta o filtro.
- `areasDeAcesso` (`areasDeAcessoPorUsuario`) = área de **acesso**: a quais
  categorias de página a pessoa alcança. É o que as colunas desenham.

Alguém pode estar na área Tax da estrutura e **não** ter acesso à área Tax do
sistema — e é esse descompasso que a tela existe para consertar.

## Onde está

| Arquivo | Papel |
|---|---|
| `components/acessos/PainelDaMatrizDeAcessos.tsx` | orquestra filtro, eixo, seleção e diálogo |
| `components/acessos/MatrizDeAcessos.tsx` | a tabela e a célula que grava |
| `components/acessos/BarraDeLoteDeAcessos.tsx` | as três dimensões em lote |
| `components/acessos/FiltroDeUsuariosBar.tsx` | busca, papel e área |
| `hooks/useAcessosEmLote.ts` | as três mutações + o aviso com Desfazer |

`/administracao/acessos` **não mudou**: `editavel` é opt-in e o default é falso.
Lá a mesma `UsersRolesView` segue só-leitura, para quem não administra acesso.

## Em aberto

- **A equipe não tem coluna.** Se um dia a estrutura couber numa matriz (poucas
  equipes por área), a coluna é possível; hoje não cabe.
- **Nada disso está em produção.** É código de front, sem migration — sobe pelo
  caminho normal da `develop` → `main`.
