import {
  Bell,
  BellRing,
  Clock,
  AlertTriangle,
  ArrowRight,
  AtSign,
  CalendarX,
  ClipboardCheck,
  FileCheck,
  FileText,
  FileX,
  Reply,
  Send,
  UserPlus,
  type LucideIcon,
  FileSpreadsheet,
} from 'lucide-react';
import type { TicketNotification } from '@/hooks/useTicketNotifications';
import type { ReviewTaskNotification } from '@/hooks/useReviewTaskNotifications';
import type { MencaoNotificacao } from '@/hooks/useNotificacoesMencao';
import type { NotificacaoInterna } from '@/hooks/useNotificacoesInternas';
import { origemDoComentario } from '@/lib/feedComentarios';
import {
  apresentacaoDoAviso,
  ondeDoAviso,
  textoDaRepeticao,
  type NotificacaoTipo,
} from '@/lib/notificacoesInternas';
import { cn } from '@/lib/utils';
import { dataHoraCurta } from '@/lib/dateUtils';

/**
 * Como cada fonte do sino se desenha numa linha do balão.
 *
 * Saiu de `NotificationPopover.tsx` em 14/09/2026, quando o balão ganhou
 * histórico e o arquivo passou do teto de 600 linhas. A divisão não é por
 * tamanho: de um lado o QUE se mostra e em que ordem (a fachada, que junta as
 * quatro caixas, conta o que é novo e decide o destino do clique); daqui para
 * baixo, como cada tipo de aviso vira uma linha — ícone, tom, o que se lê antes
 * de decidir abrir.
 */

const departmentLabels: Record<string, string> = {
  icms_ipi: 'ICMS/IPI',
  pis_cofins: 'PIS/COFINS',
  irpj_csll: 'IRPJ/CSLL',
  contabil: 'Contábil',
  geral: 'Geral',
};
/**
 * Ícone por tipo de aviso interno.
 *
 * `Record` exaustivo sobre o enum do banco: um oitavo tipo, depois de regenerar
 * `types.ts`, quebra a compilação aqui e no rótulo, em vez de aparecer sem ícone
 * na tela. `tarefa_em_revisao` reusa o `ClipboardCheck` do aviso derivado de
 * revisão, porque é o mesmo assunto visto do outro lado.
 *
 * Os 5 `chamado_*` (ALE-1) nunca deveriam renderizar aqui — ver o comentário
 * equivalente em `notificacoesInternas.ts` sobre `APRESENTACAO`. `Bell`
 * genérico só para satisfazer o `Record`, não é escolha de design.
 */
const ICONES_INTERNAS: Record<NotificacaoTipo, LucideIcon> = {
  tarefa_atribuida: UserPlus,
  tarefa_em_revisao: ClipboardCheck,
  documento_recebido: FileText,
  solicitacao_enviada: Send,
  documento_aprovado: FileCheck,
  documento_recusado: FileX,
  cobranca_pendencia: BellRing,
  // GES-04: aviso externo, nunca renderiza aqui — ver `APRESENTACAO`.
  solicitacao_vencida: Bell,
  chamado_criado: Bell,
  chamado_atribuido: Bell,
  chamado_respondido: Bell,
  chamado_vencido: Bell,
  chamado_resolvido: Bell,
  // GES-01A, e ao contrário dos de cima estes dois renderizam mesmo: relógio
  // para o prazo que se aproxima, calendário riscado para o que já passou.
  tarefa_prazo_proximo: Clock,
  tarefa_atrasada: CalendarX,
  // PT-04: papel de trabalho importado ou revisado, no projeto escolhido.
  papel_de_trabalho_importado: FileSpreadsheet,
};

export function TicketNotificationItem({
  notification,
  onClick,
}: {
  notification: TicketNotification;
  onClick: () => void;
}) {
  const statusColors = {
    atrasado: 'bg-destructive text-destructive-foreground',
    urgente: 'bg-warning text-warning-foreground',
    normal: 'bg-primary/10 text-primary',
  };

  const statusIcons = {
    atrasado: AlertTriangle,
    urgente: Clock,
    normal: Clock,
  };

  const StatusIcon = statusIcons[notification.prazoInfo.status];

  return (
    <button
      onClick={onClick}
      className="w-full p-3 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-b-0 group"
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
            statusColors[notification.prazoInfo.status],
          )}
        >
          <StatusIcon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
            {notification.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{notification.clientName}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-muted-foreground">Chamado</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              {departmentLabels[notification.department] || notification.department}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span
              className={cn(
                'text-xs font-medium',
                notification.prazoInfo.status === 'atrasado' && 'text-destructive',
                notification.prazoInfo.status === 'urgente' && 'text-warning',
                notification.prazoInfo.status === 'normal' && 'text-muted-foreground',
              )}
            >
              {notification.prazoInfo.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {dataHoraCurta(notification.updated_at)}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}

export function ReviewNotificationItem({
  notification,
  onClick,
}: {
  notification: ReviewTaskNotification;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full p-3 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-b-0 group"
    >
      <div className="flex items-start gap-3">
        {/* O papel `revisao` já tem par de token, e o `task-modal` o usa sobre
            ESTE mesmo dado (tarefa enviada para revisão). Aqui era roxo cru:
            não era conversão pendente, era o mapa que não foi reusado. */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-status-revisao-soft text-status-revisao">
          <ClipboardCheck className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
            {notification.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            Enviada por {notification.assignedToName}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs font-medium text-status-revisao">Revisão pendente</span>
            {notification.projectName && (
              <>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground truncate">
                  {notification.projectName}
                </span>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {dataHoraCurta(notification.updated_at)}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}

/**
 * Menção ou resposta num comentário de tarefa/projeto.
 *
 * O que a pessoa precisa para decidir se abre agora: quem a citou (ou respondeu),
 * onde, e o começo do que foi dito — o corpo entra como recorte em texto plano,
 * porque o comentário é documento rico e o balão do sino não renderiza thread.
 *
 * Um item só para os dois motivos porque a caixa é a mesma
 * (`org_comment_mentions`) e o destino do clique também: a thread de origem. O
 * `motivo` muda apenas como a linha se apresenta — ícone, chamada e etiqueta —,
 * para "respondeu você" não chegar disfarçado de menção.
 */
export function MencaoNotificationItem({
  notification,
  onClick,
}: {
  notification: MencaoNotificacao;
  onClick: () => void;
}) {
  const origem = origemDoComentario(notification);
  const ehResposta = notification.motivo === 'resposta';
  const MotivoIcon = ehResposta ? Reply : AtSign;

  return (
    <button
      onClick={onClick}
      className="w-full p-3 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-b-0 group"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 text-primary">
          <MotivoIcon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
            {notification.authorName} {ehResposta ? 'respondeu você' : 'mencionou você'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.trecho}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs font-medium text-primary">
              {ehResposta ? 'Resposta' : 'Menção'}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground truncate">
              {origem.rotulo} {origem.titulo}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {dataHoraCurta(notification.created_at)}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}

/**
 * Aviso interno, a primeira fonte do sino que não é derivada: a linha vem de
 * `public.notificacao`, gravada por trigger do banco.
 *
 * Um item só para os sete tipos, porque a linha já traz título e corpo prontos —
 * o `tipo` muda apenas ícone, etiqueta e tom. A contagem de repetições aparece
 * quando o mesmo evento se acumulou na mesma chave, e sem ela o agrupamento
 * ficaria invisível: 63 documentos do mesmo cliente no mesmo dia são UMA linha
 * com `quantidade = 63`.
 */
export function InternaNotificationItem({
  notification,
  onClick,
}: {
  notification: NotificacaoInterna;
  onClick: () => void;
}) {
  const { rotulo, tom } = apresentacaoDoAviso(notification.tipo);
  const Icone = ICONES_INTERNAS[notification.tipo] ?? Bell;
  const repeticao = textoDaRepeticao(notification.quantidade);
  const onde = ondeDoAviso(notification.metadata);

  return (
    <button
      onClick={onClick}
      className="w-full p-3 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-b-0 group"
    >
      <div className="flex items-start gap-3">
        <div
          className={cn('flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center', tom)}
        >
          <Icone className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
            {notification.titulo}
          </p>
          {/* De que projeto o aviso fala. O texto dele diz "este planejamento",
              que se entende na conversa do projeto e não aqui. */}
          {onde && <p className="text-xs text-muted-foreground mt-0.5 truncate">{onde}</p>}

          {/*
            **Sem corte, e respeitando a quebra de linha do texto.** Havia um
            `line-clamp-2` aqui, e ele cortava o aviso no meio de uma palavra
            ("Os slides j…"), engolindo a linha do Responsável. Os textos são
            aprovados pela Patricia, então quem cede é a tela, não a frase: o
            corpo mais comprido que existe hoje tem 118 caracteres e ocupa quatro
            linhas, o que não faz parede de texto nenhuma.
          */}
          {notification.corpo && (
            <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-line">
              {notification.corpo}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs font-medium text-primary">{rotulo}</span>
            {repeticao && (
              <>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">{repeticao}</span>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {dataHoraCurta(notification.created_at)}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}

/**
 * A moldura que diz "isto é novo", em volta da linha de qualquer uma das quatro
 * fontes.
 *
 * Por que aqui e não dentro dos quatro itens: a marca é a mesma nos quatro, e
 * repetir o ponto e o tom em cada um deles seria quatro lugares para
 * dessincronizar. A bolinha é `pointer-events-none` e fica sobre o respiro
 * esquerdo do botão, que ocupa a largura toda — o clique atravessa e abre a
 * notificação como em qualquer outro ponto da linha.
 */
export function LinhaDoSino({
  naoLida,
  children,
}: {
  naoLida: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('relative', naoLida && 'bg-primary/5')}>
      {naoLida && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary"
        />
      )}
      {children}
    </div>
  );
}
