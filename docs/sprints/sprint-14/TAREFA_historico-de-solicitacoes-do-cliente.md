# TAREFA 2 — O histórico de solicitações de um cliente

> **Achado de 21/09/2026, ao procurar a lista geral.** Não é falta de contexto na tela: é
> que as solicitações anteriores de um cliente **estão no banco e a interface não alcança
> nenhuma delas**.
>
> **Banco: não.** Nenhuma migração, nenhuma RPC, nenhuma policy. As linhas existem e a
> leitura já é autorizada pela mesma policy da [tarefa 1](TAREFA_lista-geral-de-solicitacoes.md).
>
> **Tem uma decisão de produto antes do código** (D1), e ela muda o tamanho da tarefa.
>
> **Referência visual:** https://claude.ai/artifact/J3Mh8NDjEPMGZMwinKcEbB (privado, precisa
> ser compartilhado). O canvas **não desenha o histórico**, mas os artboards "Proposta ·
> finalizada" e "Proposta · cancelada" mostram exatamente a superfície de consulta que a
> opção (b) da D1 reaproveita — é o que dá para olhar antes de decidir.

## O defeito, com a evidência

`buscarSolicitacaoDoCliente`, em `useDomainSolicitacao.ts`:

```
.eq('cliente_id', clienteId)
.order('encerrada_em', { ascending: false, nullsFirst: true })
.limit(1)
```

Traz **uma**: a ativa, se houver, senão a última encerrada. O comentário do arquivo explica
por que o `limit(1)` nasceu, e o motivo é bom — *"filtrar `encerrada` aqui fazia a tela
zerar no instante do encerramento, como se o pedido tivesse sumido"*. O efeito colateral é
que **nunca foi escrito um caminho para as outras**.

E elas existem: `abrirNovaSolicitacao` cria quantas forem necessárias ao longo do tempo, e
o índice único parcial (`uq_solicitacao_ativa_por_cliente`) só impede **duas não
encerradas ao mesmo tempo**. Encerrada acumula.

**Em números de tela:** um cliente com três solicitações ao longo de 2026 mostra a
terceira. As duas primeiras — com o que foi pedido, quando, por quem e o que o cliente
entregou — não têm nenhuma porta na ferramenta.

## A decisão que vem antes (D1)

**Só informar, ou navegar?**

Uma faixa dizendo *"este cliente teve 3 solicitações anteriores; a última foi finalizada em
31/08"* é útil e barata. Mas ela abre imediatamente a pergunta **"posso ver essas
solicitações?"** — e se a resposta for não, a informação troca uma frustração por outra,
pior, porque agora a pessoa sabe que existe algo que não pode abrir.

As duas saídas:

- **(a) Só informar.** Faixa com a contagem e a data da última. Barato, e honesto **só se
  vier junto com a frase que diz que o histórico não é acessível** — o que é estranho de
  escrever, e provavelmente é o sinal de que a opção não presta.
- **(b) Navegar.** A faixa vira porta: abre as anteriores em modo consulta, reusando o
  `SolicitacaoEncerrada.tsx` do plano de UX, que já sabe renderizar finalizada e cancelada
  em modo leitura. Custa mais, mas o componente já vai existir.

**Recomendação:** (b), e não por ambição — é que (a) sem (b) cria uma pergunta sem
resposta, e o componente que (b) precisa já está no plano, entregue pela fatia 7.

**Quem decide é a Patrícia.** Nada abaixo da D1 vale antes dela.

## Subtarefas

### T0 — Medir, para saber se o problema é real hoje

SELECT pelo MCP do Lovable (**só SELECT**): quantos clientes têm mais de uma solicitação, e
quantas linhas no total estão invisíveis pela tela de hoje.

**Isto pode encerrar a tarefa.** Se forem dois clientes com duas cada, é registro e não
frente. Se forem trinta, é frente. Medir antes de desenhar.

### T1 — D1 com a Patrícia

Com o número da T0 na mão. Não antes.

### T2 — A consulta

Tirar o `limit(1)` do caminho de histórico **sem tocar no caminho de hoje**: a tela de
trabalho continua abrindo a solicitação corrente, e o histórico é consulta própria, com
chave de cache própria. Refatoração preserva comportamento — a regra do `AGENTS.md` vale
aqui inteira: mesma query key para o que já existe, mesmos filtros, mesmas invalidações.

### T3 — A apresentação, conforme a D1

Se (b): a faixa lista as anteriores com estado derivado
(`estadoDaSolicitacao()`, do plano de UX §1.7) e data, e cada uma abre no
`SolicitacaoEncerrada.tsx` em modo consulta. Nenhum controle de edição em nenhuma delas —
uma solicitação anterior é histórico por definição.

### T4 — O texto

Segue `docs/geral/texto-explicativo-na-tela.md`. Atenção ao vocabulário do ciclo
(`avisos-cliente.md`): uma anterior **cancelada** nunca teve documentos "solicitados", pelo
mesmo motivo registrado na §1.5 do plano de UX.

## Aceite

- Num cliente com mais de uma solicitação, é possível saber que as anteriores existem
  **sem consultar o banco**.
- Se a D1 for (b): é possível abrir qualquer uma delas e ver o que foi pedido, em modo
  consulta, sem nenhum controle de edição.
- A tela de trabalho continua abrindo a solicitação corrente exatamente como hoje —
  nenhuma regressão no `limit(1)` que o comentário de `useDomainSolicitacao.ts` protege.
- Uma anterior cancelada aparece como **Cancelada**, e o texto dela não afirma nada sobre o
  cliente ter visto ou enviado.

## Relação com as outras frentes

- **Substitui** o item que ficou parado na §4 do plano de UX ("histórico de solicitações
  anteriores"), que estava subdimensionado como contexto. O plano deve passar a apontar
  para esta tarefa.
- **Depende** da fatia 7 do plano de UX se a D1 for (b) — é de lá que vem o
  `SolicitacaoEncerrada.tsx`.
- **É independente** da [tarefa 1](TAREFA_lista-geral-de-solicitacoes.md): uma responde
  "onde está cada solicitação", a outra "o que já foi pedido a este cliente antes". Podem
  sair em qualquer ordem.
