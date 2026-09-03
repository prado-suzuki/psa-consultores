// Modal que avisa o cliente sobre a situação dos documentos (aviso 2).
//
// DECISÃO DE 17/08/2026: dos três avisos ao cliente, este é o ÚNICO manual. O 1
// (solicitação enviada) e o 3 (documentação conferida) saem automáticos, nas
// transições. Este sai no clique do analista, porque é o clique que fecha o lote de
// conferência — ele abre o checklist, confere, vincula e recusa na mesma sessão, e
// nenhum evento do banco marca esse fim.
//
// O QUE A TELA MOSTRA, E O QUE ELA NÃO MOSTRA:
//
//   mostra   o que vai na mensagem, os canais, e QUANDO o cliente foi avisado antes
//   não      falha, tentativa, erro, status técnico
//
// A ausência é decisão de produto, não esquecimento. Falha de envio é problema do
// Digital, que é alertado pelo Agente Debug V2 — o consultor não tem como consertar
// e não deve ser estressado com isso. O painel conta o que o cliente recebeu.
//
// Vive em arquivo próprio pelas mesmas duas razões do BotaoComprovante: o teto de
// 600 linhas do AGENTS.md (o ChecklistPendentes já passava dele) e poder ser testado
// sem montar a tela inteira do checklist.
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Mail, MessageCircle, Send } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAvisoProjetosDaOS } from '@/hooks/useAvisoProjetosDaOS';
import { alcanceDosCanais, useDestinatariosCliente } from '@/hooks/useDestinatariosCliente';
import { useHistoricoNotificacoes } from '@/hooks/useHistoricoNotificacoes';
import {
  descreverEnvio, montarSituacaoDocumentos, temAlgoParaAvisar,
  type RespostaNotificar,
} from '@/lib/avisoSituacaoDocumentos';
import type { LinhaChecklist } from '@/lib/checklistDerivado';
import {
  canaisEnviadosHoje, diaSeguinte, disparoDeHoje, formatarDia, formatarQuando,
  rotuloDoAviso, rotuloDosCanais,
} from '@/lib/historicoNotificacoes';

/**
 * O aviso 2 grava com o valor de enum `cobranca_pendencia`, e não com o nome da API.
 *
 * Acrescentar valor a `notificacao_tipo` seria migração, e ela não entregaria nada
 * além do nome. Quem traduz é o mapa `TIPO_NO_BANCO` na borda; aqui o painel precisa
 * do valor do BANCO, porque é ele que está gravado nas linhas.
 */
const TIPO_NO_BANCO = 'cobranca_pendencia';

import type { Database } from '@/integrations/supabase/types';

type Canal = Database['public']['Enums']['notificacao_canal'];

export type CanalAviso = 'email' | 'whatsapp';

/** Rótulo de seção, no mesmo tratamento dos da tela do checklist. */
function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-osg-500">
      {children}
    </span>
  );
}

/**
 * Um número grande com rótulo, no molde do `Metric` do cabeçalho da tela.
 *
 * Os dois números são a informação central do modal — é o que vai ser cobrado do
 * cliente. Antes eram duas frases soltas no meio de outras, e o analista tinha de
 * LER para saber o que ia sair. Zero fica esmaecido em vez de escondido: "0 a
 * reenviar" é informação, e omitir a caixa faria o layout dançar entre clientes.
 *
 * A COR SAIU DO DOURADO. Eu tinha pintado o fundo de `osg-highlighter/15`, e
 * ficava um amarelo lavado que não conversava com nada em volta — o dourado da
 * casa é MARCA-TEXTO (`TextoFormatado.tsx`), não fundo de cartão. O tratamento
 * certo é o do `Metric` do cabeçalho: tijolo bege `bg-osg-50`, número em
 * `osg-700`, rótulo minúsculo em caixa alta. O único desvio é o número de
 * recusados, porque ali a cor carrega significado — documento devolvido —, e por
 * isso ele veste o papel `ajuste`, o mesmo que o `recusado` de
 * `estadoDocumentoColors`. Era `osg-red`, a âncora da área, que não pinta papel
 * de status.
 */
function Numero({ valor, rotulo, tom }: {
  valor: number;
  rotulo: string;
  tom: 'pendente' | 'reenviar';
}) {
  const vazio = valor === 0;
  return (
    <div className="rounded-xl bg-osg-50 px-4 py-3">
      <div className={cn(
        'text-3xl font-extrabold leading-none tabular-nums',
        vazio ? 'text-osg-300' : tom === 'pendente' ? 'text-osg-700' : 'text-status-ajuste',
      )}>
        {valor}
      </div>
      <div className={cn(
        'mt-1.5 text-[10px] font-bold uppercase leading-tight tracking-wide',
        vazio ? 'text-osg-300' : 'text-osg-500',
      )}>
        {rotulo}
      </div>
    </div>
  );
}

/**
 * Envolve num tooltip só quando existe motivo para explicar.
 *
 * Sem motivo, devolve o filho intocado: tooltip que repete o que já está escrito na
 * tela é ruído, e todo elemento envolvido ganha um `TooltipTrigger` que interfere
 * em foco e teclado sem entregar nada.
 */
function ComTooltip({ texto, children }: {
  texto?: string;
  children: React.ReactNode;
}) {
  if (!texto) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs leading-relaxed">
        {texto}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * O rótulo do botão diz o CANAL, não uma contagem nem um status.
 *
 * Era "Enviar aviso (194)", e 194 é o número de documentos — que não é o que o
 * botão faz e não ajuda a decidir. Dizer "Enviar por e-mail e WhatsApp" fecha a
 * pergunta que o analista tem no dedo antes de clicar.
 *
 * E ele NÃO vira aviso de estado. Eu tinha feito o rótulo trocar para "Já enviado
 * hoje" quando o dia estava fechado, e estava errado por duas razões: nome de botão
 * é o nome da ação, e um nome que muda faz o analista procurar um botão que não
 * existe mais. Quem comunica o bloqueio é o botão APAGADO, o cursor de proibido e o
 * tooltip — três sinais no lugar certo, sem renomear a ação.
 */
function rotuloDoBotao(canais: readonly CanalAviso[]): string {
  if (canais.length === 0) return 'Enviar notificação';
  return `Enviar por ${rotuloDosCanais(canais as Canal[])}`;
}

/** O horário de `17/08/2026 às 09:15`. O painel ao lado já diz o dia. */
function soAHora(iso: string): string {
  return formatarQuando(iso).split(' às ')[1] ?? '';
}

/**
 * Uma caixa de canal, desenhada como ESCOLHA e não como status.
 *
 * O desenho anterior era uma linha de texto com um marcador verde ao lado, e lia
 * como indicador de estado — o analista não percebia que dava para desmarcar.
 * Agora é um cartão com borda, que muda de cor quando selecionado.
 *
 * QUEM JÁ SAIU NÃO MOSTRA CHECKBOX, mostra um ✓ — e em cinza, não em verde. Um
 * checkbox desabilitado convida ao clique justamente onde não há nada para clicar; um
 * ✓ verde resolvia isso mas criava outro problema, porque verde é a cor do canal
 * SELECIONADO e a linha morta acabava com a cara da linha ativa.
 *
 * O motivo de estar desabilitada aparece em três lugares, cada um para um jeito de
 * olhar: a nota embaixo do nome para quem lê, o cursor de proibido para quem passa o
 * mouse, e o tooltip para quem quer a frase inteira com data. "WhatsApp desabilitado"
 * sozinho faria o analista achar que é defeito da tela.
 */
function LinhaCanal({
  rotulo, nomeNoTexto, contato, Icone, marcado, onAlternar, carregando, alcance,
  enviadoEm, proximoEm, enviando,
}: {
  canal: CanalAviso;
  /** O nome do canal como título: "E-mail", "WhatsApp". */
  rotulo: string;
  /** O nome dentro de uma frase: "por e-mail", "por WhatsApp". */
  nomeNoTexto: string;
  /** O que falta no cadastro quando não há alcance: "e-mail", "telefone". */
  contato: string;
  Icone: typeof Mail;
  marcado: boolean;
  onAlternar: () => void;
  carregando: boolean;
  alcance: number;
  enviadoEm?: string;
  /** `18/08/2026` — a partir de quando libera. */
  proximoEm: string;
  enviando: boolean;
}) {
  const jaSaiu = Boolean(enviadoEm);
  const semDestinatario = alcance === 0;
  const bloqueado = carregando || jaSaiu || semDestinatario || enviando;

  const nota = carregando ? 'carregando...'
    : semDestinatario ? `ninguém com ${contato} cadastrado`
      : jaSaiu ? `notificação enviada hoje às ${soAHora(enviadoEm as string)}`
        : `${alcance} ${alcance === 1 ? 'destinatário' : 'destinatários'}`;

  // O tooltip só existe onde a tela não cabe a frase inteira: o motivo do bloqueio.
  // Onde o canal está livre, a nota já diz tudo, e um tooltip repetiria.
  const motivo = jaSaiu
    ? `A notificação por ${nomeNoTexto} já foi enviada hoje às `
      + `${soAHora(enviadoEm as string)}. Uma nova poderá ser enviada a partir de `
      + `${proximoEm}.`
    : semDestinatario
      ? `Nenhum representante com acesso ao portal tem ${contato} cadastrado. `
        + 'Complete o cadastro do cliente para liberar este canal.'
      : undefined;

  return (
    <ComTooltip texto={motivo}>
      <label className={cn(
        'flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors',
        // `not-allowed` é o cursor que o navegador desenha como proibido. Sem ele o
        // ponteiro continua de mão aberta sobre uma caixa que não responde, e o
        // analista clica duas, três vezes achando que a tela travou.
        bloqueado ? 'cursor-not-allowed' : 'cursor-pointer',
        // APAGADO, não verde. Eu tinha pintado a linha já enviada de verde-musgo, e
        // verde aqui é a cor do canal SELECIONADO — a linha morta ficava com a
        // aparência da linha ativa e convidava ao clique. Canal indisponível tem de
        // parecer desligado.
        bloqueado ? 'border-osg-100 bg-osg-50/50'
          : marcado ? 'border-osg-moss/50 bg-osg-moss/10'
            : 'border-osg-200 bg-background hover:bg-osg-50/60',
      )}>
        {jaSaiu
          ? <CheckCircle2 className="h-[18px] w-[18px] shrink-0 text-osg-300" />
          : (
            <Checkbox
              checked={marcado}
              onCheckedChange={onAlternar}
              disabled={bloqueado}
              className="h-[18px] w-[18px]"
            />
          )}
        <Icone className={cn('h-4 w-4 shrink-0',
          bloqueado ? 'text-osg-300' : marcado ? 'text-osg-moss' : 'text-osg-500')} />
        <span className="min-w-0">
          <span className={cn('block text-sm font-semibold',
            bloqueado ? 'text-osg-300' : 'text-osg-700')}>
            {rotulo}
          </span>
          <span className={cn('block text-xs',
            bloqueado ? 'text-osg-300' : 'text-osg-500')}>
            {nota}
          </span>
        </span>
      </label>
    </ComTooltip>
  );
}

export interface ModalAvisarClienteProps {
  aberto: boolean;
  onFechar: () => void;
  clienteId: string;
  linhas: readonly LinhaChecklist[];
  solicitacaoId: string;
}

export function ModalAvisarCliente({
  aberto, onFechar, clienteId, linhas, solicitacaoId,
}: ModalAvisarClienteProps) {
  const dados = useMemo(() => montarSituacaoDocumentos(linhas), [linhas]);

  const { data: destinatarios = [], isLoading: carregandoDest } = useDestinatariosCliente(
    aberto ? clienteId : null,
  );
  const {
    data: historico = [], isLoading: carregandoHist, isError: erroHist,
  } = useHistoricoNotificacoes(aberto ? solicitacaoId : null);

  const alcance = useMemo(() => alcanceDosCanais(destinatarios), [destinatarios]);
  const jaHoje = useMemo(() => disparoDeHoje(historico, TIPO_NO_BANCO), [historico]);

  /**
   * O que já saiu HOJE, por canal — e o bloqueio é por canal, não pelo aviso.
   *
   * Se o analista manda e-mail e só depois percebe que esqueceu o WhatsApp, ele tem
   * de conseguir mandar o WhatsApp em seguida. A borda já permite: a chave de
   * idempotência inclui o canal, então a segunda chamada reserva o WhatsApp e recusa
   * só o e-mail.
   */
  const enviadosHoje = useMemo(
    () => canaisEnviadosHoje(historico, TIPO_NO_BANCO), [historico],
  );

  const indisponivel = (canal: CanalAviso) => (
    alcance[canal] === 0 || Boolean(enviadosHoje[canal])
  );

  const [canais, setCanais] = useState<CanalAviso[]>(['email', 'whatsapp']);
  const [enviando, setEnviando] = useState(false);
  const avisoNosProjetos = useAvisoProjetosDaOS();

  // Desmarca sozinho o que não pode ir: canal sem destinatário alcançável e canal
  // que já saiu hoje. Fica no efeito e não no estado inicial porque as duas
  // consultas chegam depois da abertura do modal.
  useEffect(() => {
    if (carregandoDest || carregandoHist) return;
    setCanais((atual) => atual.filter((c) => !indisponivel(c)));
    // `indisponivel` deriva de alcance e enviadosHoje; depender dos dois é o que
    // evita reexecutar em toda renderização.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregandoDest, carregandoHist, alcance.email, alcance.whatsapp,
      enviadosHoje.email, enviadosHoje.whatsapp]);

  const alternar = (canal: CanalAviso) => setCanais((atual) => (
    atual.includes(canal) ? atual.filter((c) => c !== canal) : [...atual, canal]
  ));

  const nenhumCanalDisponivel = indisponivel('email') && indisponivel('whatsapp');
  const podeEnviar = temAlgoParaAvisar(dados) && canais.length > 0 && !enviando;

  /**
   * As datas saem do DIA DO DISPARO, não de `new Date()`.
   *
   * `jaHoje.dia` é o dia local que a própria linha do banco carrega, o mesmo recorte
   * que a chave de idempotência usou para recusar o segundo envio. Recalcular por
   * fora abriria a chance de a tela dizer uma data e o banco ter travado outra.
   */
  const dataDoAviso = jaHoje ? formatarDia(jaHoje.dia) : '';
  const proximoEm = jaHoje ? formatarDia(diaSeguinte(jaHoje.dia)) : '';

  /**
   * Por que o botão está apagado, em uma frase — e `undefined` quando ele funciona.
   *
   * A ordem importa: o dia fechado é o motivo mais provável e o mais específico, e
   * tem de ganhar dos genéricos. "Escolha um canal" em cima de "já enviado hoje"
   * mandaria o analista escolher um canal que não existe.
   */
  const motivoDoBloqueio = enviando ? undefined
    : nenhumCanalDisponivel && jaHoje
      ? `A notificação já foi enviada hoje, ${dataDoAviso}, por `
        + `${rotuloDosCanais(jaHoje.canais)}. Uma nova poderá ser enviada a partir de `
        + `${proximoEm}.`
      : nenhumCanalDisponivel
        ? 'Nenhum representante com acesso ao portal tem e-mail ou telefone '
          + 'cadastrado. Complete o cadastro do cliente para liberar o envio.'
        : !temAlgoParaAvisar(dados)
          ? 'Não há documento pendente nem devolução para informar ao cliente.'
          : canais.length === 0
            ? 'Escolha pelo menos um canal para enviar a notificação.'
            : undefined;

  const enviar = async () => {
    setEnviando(true);
    try {
      const { data, error } = await supabase.functions.invoke('notificar', {
        body: {
          event_type: 'situacao_documentos',
          solicitacao_id: solicitacaoId,
          situacao: dados,
          canais,
        },
      });
      // `invoke` só rejeita em falha de transporte; recusa da função vem em `data`.
      if (error) throw error;

      const { texto, ok } = descreverEnvio((data ?? {}) as RespostaNotificar);
      if (ok) toast.success(texto);
      else toast.warning(texto, { duration: 8000 });

      /**
       * Aviso 2, lado interno (GES-03). Um evento na thread de todos os projetos da
       * OS e um sino por participante distinto.
       *
       * O detalhe sai da MESMA conta que o analista está olhando (`dados`, derivado
       * por `checklistDerivado.ts`), a mesma que foi para o cliente. Recalcular no
       * banco abriria a porta para a thread divergir da tela.
       *
       * Sem `await`: o aviso ao cliente já saiu, e falha no registro interno não
       * pode virar erro de uma operação que deu certo.
       */
      avisoNosProjetos.mutate({
        solicitacaoId,
        evento: 'situacao_documentos',
        detalhe: `${dados.pendentes.length} documentos pendentes, `
          + `${dados.recusados.length} para reenvio, de ${dados.base} itens no checklist.`,
      });

      onFechar();
    } catch (erro) {
      toast.error('Não foi possível avisar o cliente: ' + (erro as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={(v) => !enviando && !v && onFechar()}>
      <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-lg font-extrabold tracking-tight text-osg-700">
            Avisar o cliente sobre a documentação
          </DialogTitle>
          <DialogDescription>
            Confira o que vai ser enviado e por onde, antes de confirmar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-[1fr_260px]">
          {/* ── ESQUERDA · o que vai ser enviado ── */}
          <div className="space-y-5 px-6 py-5">
            {/* A faixa só aparece quando NÃO SOBROU canal. Enquanto houver um
                disponível, o aviso de "já saiu hoje" vive na caixa do canal em
                questão — travar tudo por causa de um canal era o erro anterior. */}
            {/* Verde, não âmbar. Âmbar é a cor de problema, e não há problema
                nenhum aqui: o aviso saiu, o cliente foi informado, o trabalho está
                feito. Pintar de amarelo um resultado bem-sucedido faz o analista
                procurar o que deu errado. */}
            {/* O texto NOMEIA a coisa e DATA os dois lados. "Já avisado hoje. O
                próximo pode ser enviado amanhã" era curto ao ponto de soar seco, e
                nem dizia notificação: "avisado" pode ser conversa, ligação, qualquer
                coisa. E "amanhã" obriga o analista a fazer a conta de que dia é
                amanhã para saber quando volta a poder. */}
            {nenhumCanalDisponivel && jaHoje && (
              <p className="flex items-start gap-2 rounded-xl border border-osg-moss/30 bg-osg-moss/[0.07] px-3 py-2.5 text-sm leading-relaxed text-osg-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-osg-moss" />
                <span>
                  <strong className="font-semibold">
                    A notificação já foi enviada hoje, {dataDoAviso}, por{' '}
                    {rotuloDosCanais(jaHoje.canais)}.
                  </strong>{' '}
                  Uma nova notificação poderá ser enviada a partir de amanhã,{' '}
                  {proximoEm}.
                </span>
              </p>
            )}

            {nenhumCanalDisponivel && !jaHoje && (
              <p className="rounded-lg border border-osg-200 bg-osg-50 px-3 py-2 text-sm text-osg-700">
                <strong className="font-semibold">Nenhum canal disponível.</strong> Nenhum
                representante com acesso ao portal tem e-mail ou telefone cadastrado.
              </p>
            )}

            <section>
              <Rotulo>O que o cliente vai ver</Rotulo>

              {/* Os dois números são a informação central do modal, e antes eram
                  duas frases soltas. Aqui viram cartão, no mesmo padrão do
                  `Metric` do cabeçalho da tela — número grande, rótulo pequeno em
                  caixa alta. É o que faz o analista ver o que vai sair sem ler. */}
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Numero
                  valor={dados.pendentes.length}
                  rotulo={dados.pendentes.length === 1 ? 'documento pendente' : 'documentos pendentes'}
                  tom="pendente"
                />
                {/* "com o motivo" saiu do rótulo e desceu para a nota: em caixa
                    alta a vírgula ficava travada, e o rótulo do tijolo tem de ser
                    lido de relance, não interpretado. */}
                <Numero
                  valor={dados.recusados.length}
                  rotulo="a reenviar"
                  tom="reenviar"
                />
              </div>

              <p className="mt-3 text-xs leading-relaxed text-osg-500">
                {dados.recebidos} de {dados.base} documentos já conferidos. A relação
                completa vai no corpo da mensagem
                {dados.recusados.length > 0 && ', com o motivo de cada devolução'}.
              </p>
            </section>

            <section>
              <Rotulo>Por onde enviar</Rotulo>
              <div className="mt-3 space-y-2">
                <LinhaCanal
                  canal="email"
                  rotulo="E-mail"
                  nomeNoTexto="e-mail"
                  contato="e-mail"
                  Icone={Mail}
                  marcado={canais.includes('email')}
                  onAlternar={() => alternar('email')}
                  carregando={carregandoDest || carregandoHist}
                  alcance={alcance.email}
                  enviadoEm={enviadosHoje.email}
                  proximoEm={proximoEm}
                  enviando={enviando}
                />
                <LinhaCanal
                  canal="whatsapp"
                  rotulo="WhatsApp"
                  nomeNoTexto="WhatsApp"
                  contato="telefone"
                  Icone={MessageCircle}
                  marcado={canais.includes('whatsapp')}
                  onAlternar={() => alternar('whatsapp')}
                  carregando={carregandoDest || carregandoHist}
                  alcance={alcance.whatsapp}
                  enviadoEm={enviadosHoje.whatsapp}
                  proximoEm={proximoEm}
                  enviando={enviando}
                />
              </div>
            </section>
          </div>

          {/* ── DIREITA · histórico ──
              O bege da casa a 40%, e não cheio. `bg-osg-50` puro (32 28% 92%) é
              quente e, num slab desta altura, pesa mais que qualquer coisa na
              coluna da esquerda — o painel roubava a atenção do que o analista veio
              decidir. Diluído, ele ainda separa "o que já foi feito" de "o que vou
              fazer", mas fica atrás na ordem de leitura, que é o lugar dele. Os
              cartões brancos por cima recuperam o contraste que a diluição tirou. */}
          <aside className="border-t border-osg-100 bg-osg-50/40 px-5 py-5 md:border-l md:border-t-0">
            <Rotulo>Notificações enviadas</Rotulo>

            {carregandoHist && <p className="mt-3 text-sm text-osg-500">Carregando...</p>}

            {/* Painel que não carregou e painel vazio são coisas diferentes, e o
                analista precisa saber qual é: sem isso, uma falha de leitura
                pareceria "nunca avisamos" e ele mandaria um aviso repetido. */}
            {erroHist && (
              <p className="mt-3 text-sm text-destructive">
                Não foi possível carregar o histórico. Recarregue antes de enviar.
              </p>
            )}

            {!carregandoHist && !erroHist && historico.length === 0 && (
              <p className="mt-3 text-sm text-osg-500">Nenhuma notificação enviada ainda.</p>
            )}

            <ul className="mt-3 space-y-3">
              {historico.map((d) => (
                <li
                  key={d.chave}
                  className={cn(
                    'rounded-lg border bg-background px-3 py-2',
                    d === jaHoje ? 'border-osg-moss/30' : 'border-osg-100',
                  )}
                >
                  <p className="flex items-center gap-1.5 text-[13px] font-semibold text-osg-700">
                    {formatarQuando(d.quando)}
                    {d === jaHoje && <CheckCircle2 className="h-3.5 w-3.5 text-osg-moss" />}
                  </p>
                  <p className="mt-0.5 text-xs text-osg-500">{rotuloDoAviso(d.tipo)}</p>
                  <p className="text-xs text-osg-500">{rotuloDosCanais(d.canais)}</p>
                </li>
              ))}
            </ul>
          </aside>
        </div>

        <DialogFooter className="border-t border-osg-100 bg-background px-6 py-4">
          <Button variant="ghost" onClick={onFechar} disabled={enviando}>
            Cancelar
          </Button>
          {/* O BOTÃO DESABILITADO PRECISA DE INVÓLUCRO.
              `buttonVariants` traz `disabled:pointer-events-none`, e sem ponteiro o
              navegador não troca o cursor nem dispara `mouseenter` — o tooltip
              simplesmente não abriria e o cursor de proibido não apareceria. O `span`
              recebe os dois eventos no lugar dele. `tabIndex` mantém o motivo
              alcançável por teclado, que o `title` nativo nunca deu. */}
          <ComTooltip texto={motivoDoBloqueio}>
            <span
              className={cn('inline-flex', !podeEnviar && 'cursor-not-allowed')}
              tabIndex={podeEnviar ? undefined : 0}
            >
              <Button onClick={enviar} disabled={!podeEnviar}>
                {enviando
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</>
                  : <><Send className="mr-2 h-4 w-4" />{rotuloDoBotao(canais)}</>}
              </Button>
            </span>
          </ComTooltip>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
