# Perguntas abertas

> **NOTA DE ARQUIVO:** esta é uma nota de trabalho anterior e contém respostas
> documentais que não valem como assinatura da consultora ou do Fiscal. A pauta
> canônica, com campos de nome e data, está em
> [`../levantamento-contratos-rurais.md`](../levantamento-contratos-rurais.md).

O card original (ALE-3) previa 4 perguntas fechadas para a consultora da área e 1
para o Fiscal. Depois de cruzar 4 clientes reais, os documentos internos e — agora —
o código do OSG Work inteiro, a maior parte já tem resposta com lastro. Mas a
auditoria de código abriu uma pergunta nova, mais importante que as 5 originais:
**onde os campos vão morar.** Ela vem primeiro.

## A pergunta que decide a Sprint 12 (`goal IS NULL`, 0 tarefas hoje — ver `[SPRINT11-GOAL]`)

**Os campos novos entram como extensão de `bem.tipo_bem = 'AP'`, ou como interface
nova para `exploracao_rural`?** Agora com recomendação, não mais 50/50: a OSG Work
gera contrato a partir de cadastro de **relação de negócio** (`quadro_societario`
para o societário; a exploração rural é a mesma categoria) — o contrato em si nunca
é uma entidade cadastrada, é o artefato derivado (`documento_gerado`). Sob essa
luz, `bem.tipo_bem='AP'` responde ao eixo errado (classifica um ativo do cliente,
não registra a relação outorgante↔outorgado com dois lados e vigência).
**Recomendação: `exploracao_rural`** — é o único que segue o desenho que o resto do
sistema já usa. Ver `01-campos.md`, seção D, para o argumento completo.

Ainda não é decisão fechada — quem bate o martelo é a Sprint 12 — mas deixou de ser
uma escolha sem critério.

## Já respondida com lastro (não precisa perguntar de novo)

- **"O percentual da parceria é resultado de qual entregável do estudo, e quando ele
  muda?"** — resolvida por duas fontes independentes agora: `[MAP]`/`[ROAD]`
  (mapeado, não validado) E o schema real de `planejamento_tributario`
  (`pct_parceria`, EDU-13, confirmado no banco) — entregável é o estudo do Fiscal,
  digitado por ele, um valor por `(cliente_id, tipo)`. Muda por revisão do estudo,
  não por Termo Aditivo do contrato — são coisas diferentes (ver pergunta nova
  abaixo).
- **"O contrato descreve a área total da matrícula ou a área cedida?"** — os dois,
  sempre, lado a lado. Confirmado em `[CHI-PAR]`, `[MMS-PAR]` e `[TV-ADT]`.
- **"A área explorada é do imóvel (por matrícula) ou do instrumento (por
  contrato)?"** — é lançada por imóvel dentro do Anexo de cada contrato, e a mesma
  matrícula pode aparecer em mais de um instrumento ao longo do tempo (cessões
  sucessivas observadas em `[NOD-DP]`, aditivos observados em `[TV-ADT]`).

## Nova, levantada pela auditoria de código

- **O contrato de parceria precisa de uma cópia do percentual no momento da
  assinatura, ou só lê o valor vigente de `planejamento_tributario.pct_parceria`?**
  Se o Fiscal revisar o estudo depois de o contrato já estar assinado, o contrato
  antigo não pode mudar sozinho — mas hoje não existe nenhum mecanismo de cópia/
  snapshot para esse dado especificamente (o snapshot que existe, em
  `documento_gerado`, é do documento gerado inteiro, não do dado de origem isolado).
  Decide se os campos novos precisam de coluna própria de percentual ou só de uma FK
  para o estudo.
- **Os campos novos entram no cadastro de Pessoa como um tipo "espólio", já que
  aparece em contrato real (Nodari) mas não existe na UI hoje (só PF/PJ)?** É achado
  colateral da auditoria — mesma família de problema (qualificação de partes), mas
  não é estritamente parceria/composse. Vale registrar mesmo que fique fora do
  escopo desta sprint.
- **O nome do papel do segundo lado da exploração é `explorador` (schema vivo) ou
  `outorgado` (catálogo do gerador, `binding.ts`)?** Achado ao reler a ALE-3 ao
  vivo (11/08/2026): a tabela `exploracao_rural` já chama a coluna real de
  `explorador_nome`; o catálogo de papéis do gerador, sem nenhum consumidor,
  chama o mesmo conceito de `outorgado`. É exatamente a "obrigação do dia 1" que
  o card pede — combinar com o Bernardo (BER-7) os nomes dos papéis novos antes
  de ele começar o motor — não é algo para decidir sozinho nesta tabela.

## Parcialmente respondida — o residual é mais estreito

- **"Na composse, as frações somam sempre 100% da matrícula?"** — não é essa a régua
  certa: somam 100% da **parcela que cabe aos parceiros-outorgados**, não da
  matrícula inteira. Confirmado em `[CHI-COM]` (50/50). **O que ainda vale
  confirmar:** existe caso em que a composse cobre só parte da posse dos outorgados?
- **"A partilha de frutos é um percentual único por contrato, ou varia por
  cultura/safra?"** — três padrões reais e diferentes já observados: percentual
  único (`[MMS-PAR]`, 30/70), percentual único mas com **contratos separados por
  etapa do ciclo** (`[SERIO]`, 10/90 cada, contraparte diferente), e **quantidade
  fixa por período** — não percentual (`[NOD-DP]`). Confirmado agora também que
  **nenhum dos três tem lar no schema do app** (nem em `exploracao_rural`, nem em
  `planejamento_tributario`, que só tem `pct_parceria` numeric — sem alternativa de
  quantidade fixa). **O que falta:** qual(is) o sistema precisa suportar de saída —
  decisão de produto, não fato a mapear.

## Genuinamente sem lastro — precisa de conversa humana

1. **Distrato de arrendamento antes da parceria é regra dura ou prática usual?**
   Só `[MAP]` — nenhum Distrato real foi aberto para confirmar, e o código não tem
   nenhuma trava que force isso.
2. **O enum `osg_tipo_exploracao` precisa incluir "cessão" como valor próprio, ou
   cessão é modelada como evento sobre uma linha existente?** A lacuna está
   confirmada em uso real (`[NOD-DP]`/`[NOD-WP]`); a forma de resolver é decisão.
3. **A relação Composse → Parceria de origem é sempre 1:1, ou pode uma composse
   remeter a mais de uma parceria?** Só vi o caso 1:1 (`[CHI-COM]`); nenhum contrato
   real mostrou variação até agora.
4. **A coluna "Constará na Composse Rural?" precisa existir?** Rechecada com rigor
   depois de o Alexandre apontar uma contradição no mockup (eu descrevia como
   "template real em uso" e ao mesmo tempo dizia que não era usado): a fonte é só
   a aba "EXPLORAÇÃO RURAL" do modelo **em branco** da MMS — nenhum contrato real
   (Chiapinotto, MMS, Terra Viva) tem esse campo, e o próprio exemplar preenchido do
   mesmo cliente (`[MMS-DP]`) não usa essa aba. É a evidência mais fraca deste
   levantamento. Removida do mockup por isso — fica só registrada aqui como ideia
   descartada por ora, não como campo candidato.

**Removida nesta revisão:** a pergunta antiga sobre alimentar o
`P2-SPEC-ESTRUTURA-RURAL` (S16) — esse marco não existe no sistema de tarefas vivo
(só no parecer `[PAR]`, não validado); a pergunta real, sobre pra onde este
levantamento vai, já está respondida acima (é a Sprint 12).
