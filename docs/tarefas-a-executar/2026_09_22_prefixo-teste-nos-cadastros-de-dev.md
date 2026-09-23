# TAREFA 7 — O prefixo `[TESTE]` nos cadastros de dev

> **Origem: ele, em 22/09/2026, mostrando o redesign do feed:** *"eu acho que eu vou tirar
> isso aqui, beleza? Vou tirar esses prefixos de teste aqui, porque como o banco tá
> completamente separado, né, tipo assim, e os nomes dos clientes já tão diferentes, eu
> acho que não precisa desse teste aqui."* A resposta dela na hora foi *"só dar uma olhada
> e apaga os clientes que têm nome igual aí, não sei se tiver"* — ou seja, **não houve
> decisão**, houve um aceite condicional a uma conferência que ninguém fez.
>
> **Banco: não.** Nenhuma migração, nenhuma RPC, nenhuma policy.
>
> **Esta tarefa quase não é código.** A medição desmontou o risco que parecia existir, e o
> que sobra é uma decisão dela mais uma correção no `AGENTS.md`. Foi medida antes de ser
> escrita justamente para não virar tarefa grande por suposição.

## O que foi medido, e como

Varredura em 22/09/2026 na `develop`. O medo inicial era que o prefixo fosse **regra de
negócio** e que removê-lo quebrasse filtro de ambiente. **Não é, e não quebra.**

| onde procurei | o que achei |
|---|---|
| quem filtra pelo texto `[TESTE]` no `src/` | **ninguém**. Nenhum `startsWith`, nenhum `like`, nenhum `ilike` |
| usos de `[TESTE]` no `src/` | **cinco, e os cinco são comentário** — nenhum é código executável |
| migration que **escreve** o prefixo | **nenhuma**. Quatro migrations o **citam**, todas em dado de dev já aplicado |
| a migration que o `AGENTS.md` cita | `20260814190000_dev_clientes_prefixo_teste.sql` — **não existe no repositório** |

**O recorte de ambiente é feito por `cliente.ambiente`, não pelo nome.** Os dois lugares
que de fato separam a carteira real da de teste dizem isso por escrito:

- `useDashboardClientesOs.ts:138-141` — sem o filtro, o dashboard somava *"as 8 OS e os 7
  projetos dos clientes `[TESTE]`"* aos números reais (medido em produção em 16/09/2026).
  O filtro é por `ambiente`; o `[TESTE]` aparece só para o leitor humano saber de quem se
  fala.
- `useDomainPreenchimentoSistema.ts:66-69 e 84-85` — mesma decisão, mesmo mecanismo.

Ou seja: **o prefixo não sustenta nenhuma consulta.** Ele é convenção de nome.

## O que realmente se perde ao remover

Duas coisas, e nenhuma é quebra:

**1. A rede de segurança que o `AGENTS.md` descreve.** A regra está escrita assim:

> Todo cadastro de dev carrega o prefixo `[TESTE] ` no nome, para que um vazamento se
> identifique sozinho em produção

O argumento dele — *"o banco tá completamente separado"* — responde ao vazamento **entre
bancos**, e o `AGENTS.md` fala do vazamento **dentro** de um banco, que é o assunto da
coluna `ambiente` e não o dos dois bancos. São riscos diferentes e a conversa de 22/09
tratou como se fossem o mesmo. Esse é o ponto que a D1 precisa decidir de olhos abertos.

**2. Três decisões de layout ficam superdimensionadas.** Nenhuma quebra; todas passam a
reservar espaço para um texto que não existiria mais:

- `ListaDeOsFaturamento.tsx:203-208` — a lista foi de 240 → 300 → **360px**, em duas
  medidas pedidas por ela olhando a tela em 15/09/2026, porque *"o nome do cliente ainda
  vem com o prefixo `[TESTE] ` no sandbox"*.
- `ControleDeProjetosTabela.tsx:114-117` — a coluna Cliente usa três linhas porque
  *"`[TESTE] Dinossauro Aposentado Previdência e Fósseis Ltda` quebra em três"*.
- `TaskTable.tsx:290-295` — a largura mínima foi calibrada contra o mesmo tipo de nome.

## O achado que não é da tarefa e precisa de dono

**O `AGENTS.md` cita um arquivo que não está no repositório.** A migration
`20260814190000_dev_clientes_prefixo_teste.sql` é apresentada lá como *"a fonte do conjunto
padrão"* do ambiente de dev, e ela não existe. Só há quatro migrations que **mencionam**
nomes já prefixados, e uma delas — `20260826145205_dev_pantanal_identificacao_societaria.sql:18`
— **casa pelo nome exato** (`c.nome = '[TESTE] Banana Quântica Engenharia de Sonhos Ltda'`),
o que significa que o prefixo hoje é aplicado à mão, não por regra.

Isso vale independentemente da D1: ou o `AGENTS.md` está desatualizado, ou uma migration se
perdeu. Enquanto ficar como está, a regra tem enforcement de mentira.

## Subtarefas

### T0 — A conferência que ela pediu e ninguém fez

*"Só dar uma olhada e apaga os clientes que têm nome igual aí, não sei se tiver."*

SELECT no sandbox: existe cliente de `ambiente = 'dev'` cujo nome, **sem** o prefixo,
colide com o nome de um cliente real? Se houver colisão, remover o prefixo cria dois
cadastros indistinguíveis na tela — e a resposta muda a D1.

### T1 — D1: manter ou remover ⚠️ **decisão dela, e não é de UI**

- **Manter** — o custo é estético e está concentrado no feed, onde o incômodo apareceu.
  Uma alternativa barata é esconder o prefixo **na renderização do feed**, sem tocar no
  dado: resolve o que o incomodou sem perder o canário nas outras 90+ telas.
- **Remover** — resolve o feed e as três larguras, e abre mão da identificação visual que o
  `AGENTS.md` pede. Exige atualizar o `AGENTS.md` no mesmo commit, porque senão a regra
  escrita passa a contradizer o banco.

**Recomendação: esconder na renderização do feed.** Ela responde ao incômodo real
(*"no ambiente de teste, ele fica meio feio"*) sem mexer em dado nem em regra, e é
reversível numa linha. Mas a escolha é dela.

### T2 — Corrigir o `AGENTS.md`, decida-se o que se decidir

Se a D1 for **manter**: apontar para onde a regra realmente vive, já que a migration citada
não existe.
Se a D1 for **remover**: tirar a regra e dizer que o recorte é por `ambiente`, citando os
dois hooks que o fazem.

Em nenhum dos dois casos o arquivo pode continuar citando uma migration inexistente.

### T3 — Só se a D1 for remover

Rever as três larguras (`ListaDeOsFaturamento`, `ControleDeProjetosTabela`, `TaskTable`)
contra o nome real mais longo. **Não é urgente e não quebra nada** — é folga que deixa de
fazer sentido.

## Aceite

- [ ] A T0 respondeu se há colisão de nome, com o SELECT no corpo desta tarefa.
- [ ] A D1 está decidida por ela, por escrito.
- [ ] O `AGENTS.md` não cita mais um arquivo inexistente.
- [ ] Se o prefixo saiu do dado, saiu também da regra escrita, **no mesmo commit**.
- [ ] Nenhuma consulta mudou de resultado — porque nenhuma dependia do prefixo.

## Referências

| arquivo | o que é |
|---|---|
| `AGENTS.md`, §"Separação de Ambientes" | a regra do prefixo, e a migration que ela cita e não existe |
| `src/hooks/useDashboardClientesOs.ts:138-141` | o recorte real, por `ambiente`, com o número medido em produção |
| `src/hooks/useDomainPreenchimentoSistema.ts:66-69` | o mesmo recorte no cálculo de lacuna |
| `src/components/equipe/adm-fin/ListaDeOsFaturamento.tsx:203-208` | a largura de 360px, dimensionada por causa do prefixo |
| `supabase/migrations/20260826145205_dev_pantanal_identificacao_societaria.sql:18` | casa pelo nome exato com prefixo — a prova de que é convenção à mão |
