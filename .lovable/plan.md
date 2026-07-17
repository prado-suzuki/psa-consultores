## Objetivo

Substituir os `<Textarea>` de texto livre da plataforma de chamados por um editor rico baseado em **TipTap**, oferecendo negrito, itálico, sublinhado, listas e separação por parágrafos. Manter compatibilidade total com os chamados/mensagens antigos (texto plano) sem migração de dados.

## Escopo (5 pontos de entrada)

1. `src/pages/cliente/NovoChamado.tsx` — campo **Descrição**
2. `src/components/gestao/CreateTicketDialog.tsx` — campo **Descrição**
3. `src/pages/cliente/DetalhesChamado.tsx` — campo **Nova mensagem** + render das mensagens
4. `src/pages/equipe/EquipeDetalhesChamado.tsx` — idem
5. `src/pages/gestao/GestaoDetalhesChamado.tsx` — idem

## Arquitetura

Reaproveita o padrão já usado na revisão de tarefas (`src/components/equipe/fiscal/tasks/ReviewRichText.tsx` + `reviewRichTextFormat.ts`), que é seguro por design:

- Conteúdo é **JSON do TipTap serializado como string**, prefixado por um marcador `[[ticket-rich-text:v1]]`.
- Renderização percorre a árvore JSON e emite elementos React (`<strong>`, `<em>`, `<u>`, `<p>`, `<ul>`, `<ol>`, `<li>`) — **nunca `dangerouslySetInnerHTML`**, imune a XSS.
- Mensagens/descrições antigas (sem marcador) caem no fallback existente: são exibidas como texto plano com `white-space: pre-wrap` (parágrafos por quebra de linha).

Nenhuma migration é necessária: as colunas `tickets.description` e `ticket_messages.message` continuam sendo `text`, apenas passam a armazenar um payload marcado quando o conteúdo vem do editor.

## Entregáveis

### 1. Componentes compartilhados novos
- `src/components/chamados/TicketRichTextEditor.tsx` — editor TipTap com toolbar (Negrito, Itálico, Sublinhado, Lista, Lista numerada). Baseado no `ReviewRichTextEditor`, adaptado para receber `placeholder`, `minHeight` e `disabled`.
- `src/components/chamados/TicketRichTextView.tsx` — renderer read-only. Detecta o marcador; se ausente, renderiza texto plano preservando quebras de linha (`whitespace-pre-wrap`) para não regredir chamados antigos.
- `src/components/chamados/ticketRichTextFormat.ts` — helpers `parseTicketRichText`, `serializeTicketRichText`, `isTicketRichTextEmpty`, constante `TICKET_RICH_TEXT_MARKER`.

### 2. Integrações
- **NovoChamado** e **CreateTicketDialog**: trocar o `<Textarea>` da descrição por `<TicketRichTextEditor>`. A validação "descrição obrigatória" passa a usar `isTicketRichTextEmpty`.
- **3× DetalhesChamado (cliente / equipe / gestao)**:
  - Campo de nova mensagem: `<TicketRichTextEditor>` no lugar do `<Textarea>`. Botão "Enviar" desabilitado quando `isTicketRichTextEmpty`.
  - Lista de mensagens: substituir `<p className="text-sm">{message.message}</p>` por `<TicketRichTextView value={message.message} />`.
  - Descrição do chamado (quando exibida no topo): idem, via `TicketRichTextView`.

### 3. Efeitos colaterais checados
- **Webhooks de notificação** (`supabase/functions/notify-ticket`, e-mails): se o payload de mensagem for enviado bruto, o marcador+JSON apareceriam na notificação. Auditar as edge functions e, se necessário, aplicar `stripTicketRichText(value)` (novo helper server-side simples: se começa com o marcador, extrai só o texto do JSON; senão, retorna como está). Fica como sub-tarefa do passo 2.
- **Busca/filtros por texto de chamado**: hoje é `ilike` sobre `description`/`message`. Como o marcador é constante e o restante é JSON, buscas por palavra continuam funcionando (o texto está lá dentro). Aceitável nesta fase; se virar problema, adiciona-se coluna `search_text` derivada.
- **Auditoria (`useAuditLog`)**: continua gravando o campo como string — sem mudança.
- **Sem alteração de schema, RLS, policies ou hooks de dados.**

## Passos de execução

1. Criar os 3 arquivos compartilhados em `src/components/chamados/`.
2. Trocar os inputs de descrição em `NovoChamado.tsx` e `CreateTicketDialog.tsx`.
3. Trocar os inputs e a renderização de mensagens nos 3 `DetalhesChamado`.
4. Auditar `notify-ticket` (e demais funções que empacotam `message.message` em e-mail/webhook) e aplicar `stripTicketRichText` se preciso.
5. Verificação manual: criar chamado com formatação → visualizar como cliente, equipe e gestão → responder mensagem formatada → conferir chamado antigo (texto plano) sem regressão.

## Detalhes técnicos

- Toolbar mínima (mesma do editor de revisão): **B**, **I**, **U**, • lista, 1. lista. Enter cria parágrafo novo (comportamento default do TipTap com `Document`+`Paragraph`).
- `min-h-24 max-h-64` no editor de mensagem; `min-h-40` na descrição de novo chamado.
- Atalhos padrão do TipTap (Ctrl/Cmd+B, I, U) já vêm ativos.
- Render em modo leitura reaproveita a estratégia de `ReviewRichTextContent` (percorre `JSONContent` e emite React).
- **Não** adiciona `dompurify` — o pipeline nunca gera HTML string.

## Fora de escopo

- Suporte a links, imagens, menções ou anexos inline.
- Migração de mensagens antigas para o novo formato.
- Editor rico em outras telas (tarefas, projetos, novidades) — cada uma já tem o próprio.
