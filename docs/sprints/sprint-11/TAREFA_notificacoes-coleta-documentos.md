# TAREFA — Notificações da coleta de documentos (OSG · P1)

> **Origem:** mapeamento com a Patrícia em 2026-08-03.
> **Fluxos e o que existe hoje:** [`docs/planos/notificacoes-osg-coleta-documentos.md`](../../planos/notificacoes-osg-coleta-documentos.md) · [versão visual](https://claude.ai/code/artifact/44452f60-024f-4762-9838-ad1eaabfa292)
> Isto é o **o que**. O como (arquitetura, decomposição, migrações) é do tech lead.

## O que deve passar a acontecer

| # | Aviso | Quem recebe | Dispara quando |
|---|---|---|---|
| 1 | Sua lista de documentos está pronta | Cliente · e-mail | a PSA clica em "Solicitar ao cliente" |
| 2 | Solicitação enviada em dd/mm | Time · sino | idem (mesmo clique) |
| 3 | Novos anexos de \<cliente\> | Time · sino | o cliente envia arquivo |
| 4 | Documento aprovado | Cliente · e-mail | a PSA aprova na conferência |
| 5 | Documento recusado + o que corrigir | Cliente · e-mail | a PSA recusa na conferência |
| 6 | Checklist completo — etapa seguinte liberada | Time · sino | último item aprovado |
| 7 | Sua lista está completa | Cliente · e-mail | idem |
| 8 | Cobrança do que falta | Cliente · e-mail | X dias sem resposta desde a solicitação |
| 9 | Tarefa com prazo estourado | Time · sino | o prazo passa |
| 10 | Certidão vencendo | Time · sino | 30 e 15 dias antes de vencer |
| 11 | Divergência de quotas | Time · sino | a soma não fecha com o capital social |
| 12 | Documento no cartório sem retorno | Time · sino | X dias após a saída |
| 13 | Cadastro solto (matrícula órfã, documento sem vínculo) | Time · sino | varredura |
| 14 | Cadastro de pessoa incompleto | Time · sino | varredura |
| 15 | Resumo de pendências | Gestor · e-mail | segunda de manhã |

## Regras que valem para todos

- **Uma mensagem por lote, nunca uma por documento** — um checklist tem 63 itens.
- **Não repetir**: o mesmo aviso não sai duas vezes para a mesma pendência.
- **Cliente por e-mail** (WhatsApp fica para depois), **time no sino**, **gestor por e-mail**.

## Ordem de entrega

1. **O sino** — hoje só existe para chamados. Sem ele, nada do bloco do time aparece.
2. **Botão "Solicitar ao cliente"** — entrega os avisos 1 e 2, cria a data que a cobrança
   precisa e conserta a lista aparecendo sozinha na tela do cliente (**B1**).
3. **Aprovar e recusar na conferência** — entrega 4, 5, 6 e 7. Hoje não existe o ato:
   um arquivo ilegível conta como recebido.
4. **A varredura** — entrega 8 e 9, e depois 10 a 15 conforme os campos existirem.

Se não couber tudo, cortar de baixo para cima: 1, 2 e 3 já resolvem o que o cliente mais
sente e o que o time mais reclama.

## Depende de campo que não existe hoje (⚠️ MIGRAÇÃO)

| Aviso | Falta |
|---|---|
| 5 | status "recusado" + motivo da recusa |
| 4 | o ato de aprovar (hoje o arquivo já entra valendo) |
| 10 | data de validade do documento |
| 11 | capital social da empresa |
| 12 | saída e retorno do cartório |
| 13 e 14 | a regra: o que conta como "solto" e como "incompleto" — **defino antes** |

Os avisos 1, 2, 3, 6, 7, 8, 9 e 15 saem com o que já existe no sistema.

## Bug para corrigir junto

- **B1** — o cliente vê itens que ninguém pediu, inclusive os marcados "não solicitado".
  A lista dele deve mostrar só o que foi solicitado.

## Decisões minhas, pendentes

- **Régua da cobrança:** proponho D+3, D+7 e D+14, parando quando o item chega ou é dispensado.
- **Quem recebe o aviso de anexo:** o responsável do cliente, e o time quando não houver.
- **Arquivo do cliente entra como "a conferir"** em vez de valer na hora — é o que dá
  sentido a aprovar/recusar.

## Fora de escopo

WhatsApp (canal ainda não existe), preferências de notificação por usuário.
