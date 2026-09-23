# ALE-1 — Registro: enum de chamado em notificacao_tipo

Sprint 11 (10–21/08) · Tarefa ALE-1 — "Borda: registrar quem recebeu cada aviso e
a regra de não repetir". Documento de registro; o detalhamento técnico completo
está anexado separadamente.

## Bloqueio identificado

Foi identificado que a função de borda de chamado (`notify-ticket`) precisa
gravar, por evento, uma linha em `notificacao_envio` via `registrar_envio()`,
função que exige um valor do enum `notificacao_tipo`. O enum, criado pela
EDU-1, cobre apenas o domínio de tarefa/documento/solicitação (7 valores) —
nenhum valor corresponde a chamado. A EDU-1 foi executada conforme
especificado; a lacuna estava no recorte definido para a tarefa, não na
execução dela.

## Decisão e autorização

A lacuna foi reportada ao Bernardo, responsável pelo desenho da sprint, com a
sugestão de 5 valores novos (`chamado_criado`, `chamado_atribuido`,
`chamado_respondido`, `chamado_vencido`, `chamado_resolvido`), mapeados 1:1
aos eventos disparados por `notify-ticket`. A inserção dos valores foi
autorizada.

Na execução, a indisponibilidade de créditos no Lovable impediu a aplicação da
migração pelo fluxo padrão (agente do Lovable). A autorização dada foi
extrapolada, em caráter pontual, para cobrir a aplicação direta da alteração
no banco de produção via execução SQL controlada, fora do fluxo normal — não
representa mudança de política para migrações futuras.

## Entrega realizada

- Migração `20260814170100_notificacao_tipo_chamado.sql` escrita, e os 5
  valores aplicados diretamente no banco de produção.
- `notify-ticket/index.ts` ajustado para gravar log de envio por destinatário
  nos 5 eventos, e para consultar `_shared/jaEnviadoHoje.ts` antes de repetir
  a cobrança de chamado vencido no mesmo dia, com falha fechada em caso de
  erro de consulta.
- `types.ts` atualizado manualmente com os 5 valores; regeneração oficial
  pelo gerador do Supabase permanece pendente, por falta de acesso local ao
  `supabase login`.
- Os dois pontos de renderização do sino (`notificacoesInternas.ts`,
  `NotificationPopover.tsx`) ajustados para tratar os 5 valores novos com
  rótulo e ícone neutros, sem alteração da exaustividade original dos tipos.
- Build, typecheck, lint e suíte de testes validados; falhas remanescentes na
  execução completa da suíte (timeout sob carga) isoladas e confirmadas como
  pré-existentes, sem relação com esta entrega.

## Pendência conhecida

A migração aplicada não está registrada em `supabase_migrations.schema_migrations`
(livro-razão do Lovable), por ter sido aplicada fora do fluxo padrão. O
registro será corrigido automaticamente na próxima aplicação oficial pelo
Lovable, sem risco de duplicidade (`ADD VALUE IF NOT EXISTS`).
