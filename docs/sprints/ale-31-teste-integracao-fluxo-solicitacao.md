# ALE-31 · Teste de integração do fluxo de solicitação

Alexandre Silva, 05/08/2026 · dev · cliente `Qa-0729-1614 Grupo Horizonte Áureo` · OS
`TESTE-FLUXO/2026` (ES + PS) · solicitação `23faac3a`.



**8 passos: 7 OK, 1 falhou. 4 bordas: 3 OK, 1 falhou. 2 bugs.** O T8 e a B-d falham pela mesma
causa, o **B3a**.

## Passos

|        | Passo                         | Resultado                                                                                                 |
| ------ | ----------------------------- | --------------------------------------------------------------------------------------------------------- |
| **T1** | Cliente com OS e produto OSG  | OK — produto trocado de DSSG para ES+PS por SQL em dev                                                    |
| **T2** | Gerar da OS                   | OK — 60 itens, uma linha por documento, sem multiplicar por pessoa ou imóvel                              |
| **T3** | Editar e recarregar           | OK — dispensados e os 5 manuais sobreviveram ao F5                                                        |
| **T4** | Enviar                        | OK — `solicitacao.status='enviada'`, `solicitacao.enviada_em=04/08 18:12`                                 |
| **T5** | Cliente vê o que foi pedido   | OK — 4 gavetas com a contagem certa                                                                       |
| **T6** | Cliente envia arquivo         | OK — 144 linhas em `documento_arquivo`, 115 ativas                                                        |
| **T7** | Consultor vê no balde         | OK — 3 arquivos com `documento_arquivo.pessoa_id` preenchido e `documento_arquivo.checklist_item_id` nulo |
| **T8** | Encerrar e cliente em leitura | **FALHOU → B3a**                                                                                          |

## Bordas

|         | Borda                                               | Resultado                                                                                                                                          |
| ------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B-a** | OS sem produto OSG → estado vazio sem erro          | OK — `Tecnomyl` e `Paiol Comercial Agricola`. Estado vazio, sem erro, com a saída manual                                                           |
| **B-b** | Dispensado não chega ao cliente e a linha sobrevive | OK — linhas ficam com `solicitacao_item.status='dispensado'`; a RPC filtra `'ativo'`                                                               |
| **B-c** | Produto acrescentado depois do envio                | OK — +14 itens, sem rascunho novo e sem tocar `solicitacao.status` nem `solicitacao.enviada_em`                                                    |
| **B-d** | Encerrar sem nada enviado                           | **FALHOU** — encerrar sem enviar funciona; a gaveta do cliente não fica em leitura (**B3a**). "Mesmo sem nenhum arquivo" não foi testado: este cliente já tem arquivos, e o portal lista por `documento_arquivo.cliente_id` |

## B3 · Portal do cliente ignora o status da solicitação — funcional

A RPC `get_solicitacao_ativa_cliente` só devolve a solicitação quando `solicitacao.status='enviada'`.
A tela tranca comparando com `'encerrada'` — que nunca chega, porque a RPC já devolveu nulo. A
condição é código morto.

| `solicitacao.status` | RPC devolve      | Portal                      |           |
| -------------------- | ---------------- | --------------------------- | --------- |
| rascunho             | `null`           | aberto, cliente pode enviar | ❌ **B3b** |
| enviada              | objeto com itens | aberto, com a lista         | ✅         |
| encerrada            | `null`           | aberto, envia e exclui      | ❌ **B3a** |

**B3b é o pior:** o cliente sobe arquivo num pedido que nunca foi enviado.

**Correção:** a RPC devolve a solicitação em qualquer `solicitacao.status`, e a tela libera o envio
somente em `'enviada'`.

**Esperado:** sem solicitação, rascunho e encerrada trancam; enviada abre. Encerrada mantém os
arquivos à vista, sem envio nem exclusão.

## B1 · Lista vazia não convida a gerar da OS — lacuna de projeto

Com a lista em zero, o corpo da tela mostra só saídas manuais e a geração pela OS fica num botão do
cabeçalho. Em 04/08 uma solicitação de 2 documentos foi enviada a um cliente cujo produto pede 46.

**Correção:** estado vazio dirigido — lista em zero com OS da OSG mostra o convite a gerar, com a
contagem do que a OS traria; o manual fica a um clique.

**Esperado:** o caminho da OS passa a ser o de menor esforço, sem proibir o manual.

## Observações fora do roteiro

`documento_arquivo.solicitacao_id` está nula em 144 de 144. A coluna nunca é escrita nem lida: a RPC
não toca `documento_arquivo`, e a lista do cliente filtra por `documento_arquivo.cliente_id`. Sem ela
não se responde qual solicitação pediu cada arquivo, e solicitação nova não zera a lista do cliente.

`documento_arquivo.triado_em` e `documento_arquivo.triado_por` ficaram nulos nos 3 arquivos
vinculados.

## Pendências

- **B3** — a RPC passa a devolver a solicitação em qualquer `solicitacao.status`, e a tela libera o
  envio só em `'enviada'`. Fecha o T8 e a B-d de uma vez
- **B1** — estado vazio dirigido na tela de solicitação
