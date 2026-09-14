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

A linha passa a mostrar **uma das duas**. Nenhuma lista-de-cartões paralela foi
criada — duas árvores para a mesma linha é o que diverge depois.

### Onde as duas viram foi decidido MEDINDO, e o olho tinha errado

A primeira escolha (`lg` para a matriz, `xl` para o email) foi feita pela conta
acima. O navegador dirigido mostrou que a tabela ainda rolava em **390, 768,
1024 e 1280** — excesso de 168, 62, 227 e 126px. Duas causas, e a primeira não
era o número de colunas:

- **O e-mail não quebra.** `hercio.junior@psaconsultores.com.br` não oferece
  ponto de quebra ao CSS (nem `.` nem `@` contam), então aquela string sozinha
  cravava uma coluna "Usuário" de **289px** — numa tela de 390. `break-all`
  derruba para 112px. Uma classe explicava metade do estouro.
- **As sete colunas estreavam cedo.** Elas precisam de ~537px só para os
  rótulos, mais caixa (40) e lápis (40): **~800px de coluna**, que com a barra
  de 256px pede 1056px de viewport. `lg` é 1024 — trinta pixels curto.

Final: matriz em `xl`, e-mail em `2xl`, e-mail com `break-all`. Remedido nas
mesmas sete larguras: **excesso 0 em todas**.

> Vale como método: "cabe?" não se responde somando as colunas que você escreveu.
> Uma string sem ponto de quebra é uma coluna com largura mínima que nenhuma
> classe declara.

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

### Três dimensões, uma de cada vez

São 7 papéis, 5 áreas e 11 equipes. Juntas seriam 23 colunas de ícone mais nome,
e-mail e seleção — e a versão que "cabia" só cabia rolando para o lado. Um
interruptor troca o eixo mantendo as mesmas linhas, o mesmo filtro e a mesma
seleção.

**A de equipe eu tinha descartado**, argumentando que a estrutura é uma árvore de
três degraus e não uma matriz. Ela pediu, eu medi, e **são 11 equipes** (8
ativas). Cabem. O argumento da árvore valia para o SELETOR — que precisa deixar
escolher entre todas, agrupadas — e não para a coluna.

O que a equipe exige e as outras duas não é o **caminho**: "Fiscal" e "Fixos" só
significam algo sob "TAX › Tax", e existem duas áreas chamadas OSG em clusters
diferentes. Por isso o cabeçalho dela tem duas linhas — a área em miúdo, o nome
embaixo — e as colunas vêm na ordem do caminho, para as irmãs ficarem vizinhas.

### Ordenação por clique

**Crescente → decrescente → padrão.** O terceiro clique existe porque tabela sem
como desfazer a ordenação obriga a recarregar a página para recuperar a leitura
original.

O que ela tem além de conveniência: clicar numa **coluna da matriz** junta quem
tem aquilo no topo — "quem são os 5 admins destes 68" deixa de precisar do
filtro. Por isso, numa coluna de ✓, o primeiro clique é *quem tem primeiro* e
não A→Z: ele responde a pergunta que levou a pessoa a clicar ali.

Três regras que não são estilo:

- **Todo critério desempata por nome.** Sem isso, ordenar por coluna booleana
  deixaria a ordem dentro de cada bloco à mercê do que o banco devolveu, e as
  mesmas 68 linhas apareceriam diferentes a cada carga.
- **Trocar de eixo devolve a ordem ao padrão quando ela era por coluna.**
  Ordenar por "Admin" e passar para Equipes deixaria a ordenação apontando para
  uma coluna que não existe naquele eixo: empate geral, e nenhum cabeçalho
  explicando. Ordem por nome ou e-mail atravessa a troca — essas colunas existem
  nos três eixos.
- **A seta aparece sempre, não só no hover.** Cabeçalho que só a revela sob o
  ponteiro não avisa que a tabela é ordenável, e não diz nada a quem usa teclado
  ou toque. `aria-sort` no `<th>`, conferido no DOM nos três estados.

### A largura em produção, e o que ficou de fora

O sandbox tem 8 equipes; **produção tem 11**. Montei uma tabela real de 11
colunas dentro da página para medir, e duas coisas tiveram de mudar:

- **O e-mail sai na dimensão de equipe.** As 11 colunas pedem 1278px só para
  elas; a coluna de e-mail (220px) levava o total a 1758px — mais que os 1566px
  de uma tela de 1920.
- **O caminho da área trunca a 7,5rem; o nome não.** "TAX › Trabalhos
  compartilhados OSG" mede 187px e se repete em duas colunas irmãs, enquanto
  "Fiscal" mede 52. O caminho é *contexto* (repete entre irmãs), o nome é
  *identidade*. O caminho inteiro fica no `title` e no rótulo de cada célula.

**1574px → 1313px.** A 1920 cabe com 253px de folga.

> **Não resolvido:** abaixo de ~1650px a matriz de Equipes rola na horizontal, e
> a coluna do nome sai da tela — que é o defeito que esta mesma frente corrigiu
> na dimensão de papéis. A saída seria fixar a coluna do nome (`sticky`), e ela
> esbarra no contrato de cor: célula fixa precisa de fundo **opaco**, e o cartão
> desta tela é translúcido (`--muted` a 35%). É decisão de projeto, não detalhe.

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

## O segundo defeito, e ele estava na captura de tela dela

O chip do diálogo de edição do Hercio mostrava
`32bc9000-f524-43f0-9aa9-44d2381c17d7`. Aquilo é a equipe **"Área para Estudos e
Pesquisas"**: desativada, e com **9 membros**.

Desativar uma equipe **não desliga ninguém dela**. Em produção são **15 vínculos
em três equipes desativadas**. Para essas, `caminhoDaEquipe` devolvia `null`, o
`?? equipeId` assumia, e o UUID ia para a tela.

A causa é uma confusão entre **oferecer** e **mostrar**, e agora são duas listas:

| Função | Pergunta | Inclui desativada? |
|---|---|---|
| `montarGruposDeEquipe` | em que equipe a pessoa pode ENTRAR? | não — caminho fechado |
| `colunasDeEquipeDaMatriz` | em que equipe a pessoa ESTÁ? | sim, se tiver gente dentro |

Sem essa separação a aba nova seria mentirosa: diria que 15 pessoas não estão em
equipe nenhuma, e não haveria por onde desvinculá-las. É o mesmo raciocínio que
o `EditUserDialog` já aplicava ao manter o campo de equipe visível para quem
perdeu o papel interno — esconder o campo prenderia o vínculo.

A coluna desativada aparece marcada **"(desativada)"**, em palavra e não em cor:
a coluna já é miúda, e a informação precisa sobreviver a quem não distingue tons.

**Um teste meu falhou com razão.** Eu havia escrito que cluster inativo derrubava
a coluna mesmo com gente dentro; o código discordou. A regra não pergunta em que
degrau a estrutura fechou — o vínculo existe igual, e sem coluna não há por onde
tirá-lo.

## O primeiro defeito achado no caminho

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

## O que foi provado na tela, e contra o banco

Sandbox (`vgzomuwnsdgrxbkyoavq`), 14/09/2026, lendo o efeito no banco e não na
tela — usuários semeados (`@exemplo.dev`), nunca gente de verdade:

| O quê | Resultado |
|---|---|
| Clique numa célula de papel | `["admin"]` → `["admin","marketing"]` |
| Desfazer | voltou a `["admin"]` |
| Lote em 3 pessoas | as 3 ganharam o papel; o Desfazer devolveu as 3 |
| Clique numa célula de **área** | **+37 páginas** (29 → 66) num gesto |
| Desfazer da área | voltou a 29 |
| Trava do próprio `admin` | recusou: "Você não pode remover o seu próprio papel de Administrador." |
| Auditoria | os dois sentidos, com `changed_fields` campo-a-campo |
| Filtro por nome | 68 linhas → 5 |
| Clique numa célula de **equipe** | 0 → 1 equipe, aviso "Tânia Pires entrou em Equipe Digital" |
| Desfazer da equipe | voltou a 0 |

A busca é por **nome** e não por e-mail — meu próprio teste tropeçou nisso
procurando `user0`. O e-mail nesta casa deriva do nome (`nome.sobrenome@`), e
incluí-lo faria "lima" trazer o e-mail de outra pessoa.

## A rota `/administracao/acessos` não existe — e isso corrige o que eu disse

Eu havia anotado que mexer nos breakpoints da `UsersRolesView` alcançava também
`/administracao/acessos`, a versão só-leitura. Fui validar e **as três rotas
`/administracao/*` dão 404**.

| rota | estado |
|---|---|
| `/administracao` | 404 |
| `/administracao/acessos` | 404 |
| `/administracao/usuarios` | 404 |
| `/gestao/acessos` | `<Navigate>` para `/equipe/acessos` |

A rota saiu do `App.tsx` em **13/01/2026**, no commit que criou o `/gestao`
(`68356afc`). As páginas ficaram no repositório sem ninguém montar — e o
`AdminLayout` ainda tem um menu apontando para elas.

Consequência para este componente: a `UsersRolesView` tem **um consumidor só**
(a seção Papéis de `/equipe/acessos`), e o docstring dela afirmava dois. Foi
corrigido. `variant="compact"`, `roleColumns` e `teamMemberColumnLabel` seguem
sem chamador vivo.

> **Um docstring que lista consumidores envelhece sem avisar.** Esse sobreviveu
> oito meses a duas rotas mortas, e só caiu porque alguém tentou abrir uma.

### Apagado em 14/09/2026 — ela confirmou que as telas não voltam

> *"tudo q eu preciso já está em `/equipe/acessos`"*

Saíram **1226 linhas**: as três páginas, o `AdminLayout` e os dois hooks que só
elas consumiam. A `UsersRolesView` perdeu quatro props de uma vez (`variant`,
`roleColumns`, `teamMemberColumnLabel`, `editavel`) e, com elas, a tabela
só-leitura que a `editavel={false}` desenhava — mantê-la seria dead code "por
garantia", que o AGENTS.md proíbe por nome. Está em `b0ba2d12^`.

**Ajustar as cinco catracas expôs o que elas já sabiam.** A `filaDoBlue` tinha um
grupo chamado `semRotaQueOsMonte`, escrito em 11/09 com a anotação *"CÓDIGO QUE
NINGUÉM CONSEGUE ABRIR"*. Ela mediu certo e parou na medição.

> **O registro sobreviveu três dias; o código, oito meses.** Medir código morto
> não o remove, e um inventário sem dono vira documentação de um defeito em vez
> de conserto.

Nas três catracas de cor a saída **não é conversão** — é o arquivo que deixou de
existir, e os comentários dizem isso para ninguém ler como progresso de cor.

De passagem caíram as contagens em prosa que a remoção deixou erradas ("as oito
barras", "as outras oito", "as nove entradas" → "todas"). Número escrito em
comentário envelhece sozinho, e estes acabaram de provar.

### O custo que a decisão pesou

| arquivo | linhas |
|---|---|
| `pages/administracao/AdminUsuarios.tsx` | 347 |
| `components/administracao/AdminLayout.tsx` | 181 |
| `pages/administracao/AdminPerformance.tsx` | 142 |
| `pages/administracao/AdminAcessos.tsx` | 15 |
| **total** | **685** |

Não é só apagar: **cinco catracas citam esses arquivos** e teriam de ser
reajustadas no mesmo commit — `filaDoAlerta`, `filaDoBlue`, `filaDoRedEmerald`
(inventariam ocorrências de cor em `AdminUsuarios`/`AdminPerformance`),
`sidebarMedidas` (conta o `AdminLayout` como uma das barras) e `fundoDePagina`
(cita-o num comentário). Há ainda `useDomainAdminUsuarios` e
`useDomainAdminPerformance`, com teste próprio, que ficariam órfãos.

A pergunta que decide: **essas telas vão voltar?** Se sim, o que falta é a rota;
se não, é remoção com as catracas ajustadas junto.

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

- **As três equipes desativadas continuam desativadas, com gente dentro.** A tela
  agora mostra e deixa remover, mas a pergunta de estrutura — essas 15 pessoas
  deviam estar em outra equipe? a equipe devia voltar a ser ativa? — é dela.
- **Nada disso está em produção.** É código de front, sem migration — sobe pelo
  caminho normal da `develop` → `main`.
