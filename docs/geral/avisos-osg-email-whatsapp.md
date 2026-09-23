# Notificações entregues no projeto da OSG

Duas frentes: quatro avisos ao cliente, por e-mail e WhatsApp, e o canal do Docbox no
Google Chat.

## Ao cliente — e-mail e WhatsApp

| # | Notificação | Sai de | O que diz |
|---|---|---|---|
| 1 | Solicitação enviada | modal **Enviar solicitação** | a lista está no portal, com o total e o prazo |
| 2 | Status da documentação | modal **Avisar cliente**, no checklist | quantos faltam, quantos a reenviar e o prazo |
| 3 | Documentação conferida | modal **Finalizar solicitação** | está completa; a etapa seguinte é a execução |
| 4 | Solicitação em aberto | **automática** — cron diário | nada foi recebido e o prazo venceu |

As quatro saem pelos dois canais. ALE-1 a ALE-17 (Sprint 11) e GES-04 (Sprint 12).

Como o envio funciona:

- Nos três primeiros, o modal é a tela de envio: o analista **marca os destinatários e
  os canais** e só então confirma. O 4 sai sem ninguém na frente.
- O mesmo modal mostra o **histórico**: o que já saiu, por qual canal e quando.
- Uma mensagem **por representante com acesso ao portal, por canal** — quem não tem
  telefone recebe só por e-mail (11 de 40).
- O mesmo aviso **não repete no mesmo dia** para o mesmo destino pelo mesmo canal.
- **Sem OS** na solicitação, não sai por nenhum canal.
- O e-mail lista documento a documento; o WhatsApp é modelo fixo da Meta, sem lista, e
  remete ao portal.

## À equipe — Docbox no Google Chat

Canal do Docbox apontado para um espaço do Google Chat, ligado em **03/07/2026**
(Sprint 07): nova solicitação, mudança de status, vencimento e aprovação. Antes havia
só o Slack `osg-adm-notificaçãodocbox`.

Textos completos em `avisos-cliente.md` (e-mail) e `whatsapp-templates.md` (WhatsApp).
