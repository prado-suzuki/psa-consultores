# Checklist por subtração: decisões e estado (13/08/2026)

Fecha o item 3 de "o que falta" de `cadastro-vinculo-documentos.md` §12 ("o checklist como tela,
leitura pura da subtração") e reabre, de propósito, duas decisões de `fluxo-solicitacao-documentos.md`.

Duas frentes, nesta ordem:

1. **Consultor: checklist read-only** (fase 1, implementada em 13/08/2026). A casca visual da tela
   legada, alimentada pela subtração. Nenhuma escrita.
2. **Cliente: upload contra o documento faltante** (fase 2, implementada em 13/08/2026, menos a
   válvula do §3.4 e as notificações). O arquivo nasce classificado, e o consultor não classifica
   depois.

---

## 1. A decisão que organiza tudo

**O arquivo passa a nascer ligado ao que foi pedido.** O cliente sobe o arquivo na linha do documento
que falta, para a entidade a que ele pertence, e `documento_arquivo` já grava `documento_tipo_id` +
dono na origem. A classificação deixa de ser trabalho posterior do analista no caso normal.

Consequência direta: a visão do consultor não precisa de escrita. Ela lê a subtração.

### As três reversões, registradas para não serem desfeitas de boa-fé

| o que foi decidido antes | onde | o que vale a partir de 13/08/2026 |
|---|---|---|
| decisão 5: "o arquivo NÃO se liga ao item pedido; o cliente joga no balde da gaveta e o consultor classifica depois" | `fluxo-solicitacao-documentos.md` §2 | **revertida.** O upload do cliente é por documento pedido × entidade. O balde continua existindo para o que chega por fora (e-mail, WhatsApp, acervo antigo) |
| decisão 4: "não existe estado de concluído por gaveta nem por item; sem progresso, sem contador de pendência" | idem | **revertida na parte da conta.** Com o lado "chegou" gravado, a subtração é confiável e a tela mostra progresso. O que continua valendo: nada fecha sozinho, o encerramento da solicitação é manual (decisão 3) |
| EDU-27 removeu `useUploadDocumentoSolicitado` e a tela de upload por item | comentário em `src/hooks/useDocumentoArquivo.ts` | **volta**, sobre outra base: `solicitacao_item` + `documento_tipo`, não `checklist_cliente_item` |

### A decisão nova (13/08/2026)

**O cliente passa a ver as instâncias nomeadas do cadastro dele.** Sem isso o upload não pode nascer
classificado: a linha do checklist é documento × pessoa/imóvel, e "CPF" sem dizer de quem não fecha
nada. Isso expõe ao portal os nomes de pessoas (inclusive sócios e familiares) e a identificação dos
imóveis, que ele não via.

**Como foi feito, e por que assim:** a exposição mora DENTRO da RPC de leitura, que é `SECURITY
DEFINER` e devolve só `id` e `nome` da entidade. Nenhuma policy nova em `pessoa`, `bem` ou `matricula`
foi criada, e o portal continua sem poder ler essas tabelas. Multiplicar no front exigiria abrir as
três, o que entregaria muito mais do que o nome.

---

## 2. A conta da subtração

```
esperado  = solicitacao_item ativo × instâncias do cliente no grão do item
recebido  = documento_arquivo ativo com (documento_tipo_id, dono) = (tipo do item, instância)
não se aplica = linha em solicitacao_item_nao_aplicavel (item, instância)
falta     = o resto, derivado, nunca digitado
```

A chave do join é `solicitacao_item.item_padrao_id` → `documento_tipo.id` ←
`documento_arquivo.documento_tipo_id`. Item pedido à mão entra pelo tipo avulso
(`documento_tipo.solicitacao_item_id`, migration `20260807150000`).

Precedência de status na linha: `dispensado` > `nao_aplicavel` > `recebido` > `pendente`.

Grãos e instâncias:

| grão do item | instâncias |
|---|---|
| `pessoa_pf` / `pessoa_pj` | pessoas do cliente, por `tipo_pessoa` |
| `matricula_rural` / `matricula_urbana` | matrículas do cliente, rural = `tipo_bem = 'IR'` |
| `bem` | bens do cliente |
| `cliente` | uma instância só, o cliente (arquivo sem dono) |

Matrícula "do cliente" é `bem_cliente_id = cliente` **ou** `titular_cliente_ids` contém o cliente, que
é o mesmo critério de `ClassificarDocumentos` e `OrganizarDocumentos`.

---

## 3. Os buracos conhecidos, e o que cada um faz na tela

1. ~~**Acervo sem tipo.**~~ **Resolvido por decisão em 13/08/2026:** não existe acervo real. Tudo o
   que está em `documento_arquivo` é dado de teste e pode ser descartado, então não há dívida de
   classificação retroativa e a tela não nasce mentindo. O aviso de "arquivos sem tipo" **fica** na
   tela, mas deixa de ser estado de transição e passa a ser guarda de exceção: arquivo que entra por
   fora do fluxo (e-mail, WhatsApp, upload interno sem classificar) continua invisível para a
   subtração, e é isso que o aviso denuncia.
2. **Grão `bem` tem zero linhas no catálogo.** Os 13 documentos de bem do seed (`bem--*`) foram
   cadastrados como `cliente`. Efeito: o agrupamento "Bens e Direitos" nasce vazio e esses documentos
   aparecem sob "Documentos do cliente". Não é disfarçado com um mapa `bem → cliente`, pela mesma razão
   registrada em `src/lib/classificarTipo.ts`: o buraco é do catálogo e fica à vista.
3. **Grão `cliente` não aceita "não se aplica".** O CHECK de `solicitacao_item_nao_aplicavel` exige
   exatamente um alvo entre pessoa, bem e matrícula. Para item de grão `cliente` a única alavanca é
   dispensar o item inteiro, que é equivalente (a instância é única).
4. **Read-only absoluto não se sustenta sozinho.** Se o cliente subir o arquivo errado no tipo certo,
   a subtração dá "recebido" e o consultor não tem alavanca. A fase 2 tem de reservar uma válvula
   (rejeitar ou reclassificar o arquivo). Não é escopo da fase 1, mas é pré-requisito de confiar na
   tela quando o upload do cliente virar a via normal.

---

## 4. Fase 1: o que foi implementado (13/08/2026)

| arquivo | papel |
|---|---|
| `src/lib/checklistDerivado.ts` | a conta, pura e testada: instâncias, derivação das linhas, resumo |
| `src/lib/checklistDerivado.test.ts` | os casos que travam a semântica (precedência, dono, avulso, grão cliente) |
| `src/hooks/useChecklistDerivado.ts` | composição das leituras (solicitação, instâncias, arquivos, não aplicáveis, avulsos) |
| `src/hooks/useDomainSolicitacaoNaoAplicavel.ts` | ganhou a leitura do cliente inteiro (antes só por alvo) |
| `src/components/equipe/osg/checklists/ChecklistPendentes.tsx` | mesma casca visual, agora read-only sobre as linhas derivadas |

**O que saiu da tela**, porque perdeu base no modelo novo: o select de 6 status (`solicitado` e
`nao_solicitado` não existem: item ativo de solicitação enviada já é solicitado), o botão de vincular
arquivo (o vínculo é ato do Cadastro por Documento, ou da origem, na fase 2), "Adicionar ao checklist"
e "Gerar checklist do cliente" (o conjunto esperado é a solicitação, que nasce da OS e não se monta à
mão).

**Detritos removidos:** `checklist_cliente_item` deixou de ter leitor no front. Saíram
`useChecklistClienteItens`, `useGerarChecklistCliente`, `useAdicionarCondicional`,
`useDefinirStatusItem`, `useVincularDocumento`, `useRemoverChecklistItem`, `itemRecebido`,
`checklistClienteKey` e `ChecklistItemDialogs.tsx`. Ficaram, em `useOsgChecklist.ts`, só as duas
leituras do catálogo: `useChecklistPadrao` (usada por `ClassificarLevaDialog`) e
`useTiposAvulsosDoCliente` (usada pela própria derivação). Com a chave do checklist fora,
`useExcluirDocumento` passou a invalidar só o prefixo da lista de arquivos, que é o que o checklist
derivado lê. Derrubar a tabela `checklist_cliente_item` é limpeza separada.

---

## 5. Fase 2: o que falta, na ordem em que trava

> **Entregue em 13/08/2026 (banco):** as três migrations que sustentam os itens 1 e o estado novo.
> `20260814140000_solicitacao_status_em_checklist.sql` (valor novo no enum, sozinha porque o valor não
> pode ser usado na mesma transação em que nasce), `20260814150000_solicitacao_policies_em_checklist.sql`
> (as duas policies do cliente aceitando `enviada` e `em_checklist`) e
> `20260814160000_get_pendencias_documentos_cliente.sql` (a RPC nova).
>
> A RPC devolve `{ solicitacao, pendencias[] }`, uma pendência por item × instância, com
> `solicitacao_item_id`, `documento_tipo_id`, `grupo`, `documento`, `nota`, `granularidade`,
> `alvo {kind, id, nome, detalhe}`, `recebido`, `recebido_interno` e `arquivos[]`. Escolhe a
> solicitação em `em_checklist`, ou a última `encerrada` como retrato.
>
> **Decisão embutida, confirmar se discordar:** arquivo que a própria PSA subiu (`fonte <> 'cliente'`)
> **conta** como recebido, sinalizado em `recebido_interno`, e não entra na lista `arquivos` (o cliente
> não passa a ver arquivo interno). Sem isso ele veria pendência de documento que já está com a gente e
> reenviaria. Reverter é apagar um predicado.
>
> Validada fora do Supabase, num Postgres 17 descartável com esqueleto das tabelas: 11 pendências no
> cenário montado, arquivo excluído não conta, arquivo sem tipo não conta, item dispensado e instância
> "não se aplica" não viram linha, tipo avulso resolve o item pedido à mão, grão `cliente` casa com
> arquivo sem dono, matrícula órfã de bem entra pela titularidade, e nada de outro cliente aparece.
>
> **Também entregue em 13/08/2026:** a migration `20260814170000_anexar_documento_pendencia.sql` (o
> anexo validado, item 2), o botão da virada no front (item 3) e a tela de checklist do cliente
> (item 4). Restam o item 5 e a frente de notificações.
>
> A RPC de anexo deriva o tipo do item pedido e recusa dez situações (item de outro cliente,
> solicitação fora de `em_checklist`, item dispensado, grão incompatível com o alvo, alvo de outro
> cliente, par marcado como não aplicável, item sem tipo, `gcs_uri` fora da pasta do cliente,
> categoria `georreferenciamento`, alvo ausente ou sobrando). As dez foram exercitadas uma a uma no
> Postgres descartável, mais o caminho feliz nos grãos pessoa e cliente, e a pendência virando
> recebida na leitura seguinte.
>
> **Bug encontrado de graça:** a `anexar_documento_solicitado` (2026-07-23) trocava `mime` com
> `tamanho` no INSERT e estouraria em qualquer chamada. Nunca foi exercitada porque a tela que a
> chamava saiu na EDU-27. A substituta nasce com a ordem conferida e um comentário no lugar.

1. **Leitura do cliente por instância, em RPC NOVA.** `get_solicitacao_ativa_cliente` **fica como
   está** (decisão de 13/08/2026): ela serve a solicitação inicial, que é outro momento do processo, e
   mexer nela impactaria o fluxo em execução. A nova devolve uma linha por item × instância, com
   `documento_tipo_id`, o dono (`kind`, `id`, `nome`) e o já-recebido.

   **Por que são duas leituras e não uma evoluída:** na solicitação inicial o cadastro do cliente
   costuma estar vazio, e é da primeira leva de arquivos que a PSA monta pessoas e imóveis. Não há
   instância para multiplicar antes disso. A gaveta-balde é a ferramenta certa da primeira fase; o
   checklist por entidade é a da segunda.

   | momento | leitura | tela do cliente |
   |---|---|---|
   | solicitação inicial | `get_solicitacao_ativa_cliente`, intocada | 4 gavetas, balde, nome de documento sem repetir |
   | depois de finalizada | RPC nova | checklist: o que falta, de quem, com upload na própria linha |

   **A multiplicação mora na RPC**, não no front, e é isso que dispensa policy nova em `pessoa`, `bem`
   e `matricula`: sendo `SECURITY DEFINER`, ela escolhe o que sai (id e nome), e nada mais do cadastro
   vaza para o portal.

   **O gatilho, decidido em 13/08/2026:** um **estado novo** entre `enviada` e `encerrada` (nome de
   trabalho `em_checklist`), alcançado por um botão na tela de solicitação inicial que substitui o
   "Encerrar" por algo como **"Passar para o checklist"**. A virada é ato explícito do consultor, não
   efeito colateral do encerramento, e `encerrada` volta a significar "acabou de verdade", seguindo
   como ação final.

   Por que não reaproveitar `encerrada` (o que seria só trocar o rótulo do botão):

   | o que hoje depende de `encerrada` | o que quebraria |
   |---|---|
   | `uq_solicitacao_ativa_por_cliente` (única onde `status <> 'encerrada'`) | liberaria abrir uma segunda solicitação com o checklist vivo |
   | policies `cliente can view own solicitacao[_item] enviada` (filtram `status = 'enviada'`) | o cliente perderia a lista no instante da virada |
   | `solicitacaoAberta` em `useDomainSolicitacao` | recusaria incluir item novo, e pedir "faltou o X" é o normal desta fase |
   | `ColetaDocumentosCliente` tranca o envio em `encerrada` | trancaria justamente quando ele precisa voltar a enviar |

   Com o estado novo, nada do que a sprint em curso usa muda de sentido: `enviada` continua sendo o
   que é hoje. O trabalho é uma migration de valor no enum, as duas policies do cliente passando a
   aceitar os dois estados, e os quatro leitores de `'encerrada'` no front.

   **O que o cliente vê:** a tela dele troca de gavetas para checklist, e ponto. Avisar que a fase
   mudou é frente separada, de notificações, em tarefa própria.

   **Recomendação, não decisão:** o botão avisar antes de virar quando existirem arquivos sem
   classificar, senão o cliente cai num checklist quase todo pendente com documentos que já entregou.
2. ~~**Anexo validado.**~~ **Entregue** como `anexar_documento_pendencia` (o nome mudou: a antiga
   fica onde está, sem leitor). O diagnóstico que a motivou segue valendo, e é o motivo de o tipo ser
   derivado no banco em vez de recebido do cliente: a policy `cliente can insert own documento_arquivo` checa só
   `fonte = 'cliente'` e o `cliente_id`: nenhuma coluna de vínculo é validada. No minuto em que o
   front passar a mandar dono e tipo, o cliente poderá apontar para pessoa de outro cliente ou para
   tipo que ninguém pediu a ele. A saída é RPC `SECURITY DEFINER`, e
   `anexar_documento_solicitado` (ainda no banco) já faz as validações certas: cliente resolvido, item
   pertence a ele, item não dispensado, categoria `georreferenciamento` recusada e `gcs_uri` contendo
   `/<cliente_id>/`. Falta reapontá-la de `checklist_cliente_item` para `solicitacao_item` +
   `documento_tipo`.
3. ~~**Exposição do cadastro ao cliente.**~~ Absorvida pelo item 1: a RPC nova entrega id e nome, e
   nenhuma policy de leitura de `pessoa`, `bem` ou `matricula` precisa existir para o portal.
4. ~~**A tela do cliente.**~~ **Entregue** como tela PRÓPRIA
   (`src/components/cliente/ChecklistDocumentosCliente.tsx` + `src/lib/checklistCliente.ts`), e não
   como modo da gaveta: são leituras diferentes (RPC própria) e ações diferentes (anexo por item), e
   `ColetaDocumentosCliente` só roteia por status. A gaveta-balde fica intacta para a fase inicial.
   As 4 gavetas seguem como agrupador, agora com um bloco por entidade dentro de cada uma, e sem
   dedup de nome: as três linhas de "CPF" são o ponto.
5. **A válvula do consultor** (buraco 4 do §3).
6. ~~**O acervo sem tipo**~~: saiu da lista, ver o buraco 1 do §3. Sobra um item de limpeza, não de
   produto: descartar os arquivos de teste de `documento_arquivo` (e os binários no GCS) antes de o
   fluxo novo entrar em uso, para nenhum "recebido" de teste virar recebido de verdade.
