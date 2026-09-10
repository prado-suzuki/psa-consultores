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
//   mostra   o que vai na mensagem, para quem, os canais, e QUANDO o cliente foi
//            avisado antes
//   não      falha, tentativa, erro, status técnico
//
// A ausência é decisão de produto, não esquecimento. Falha de envio é problema do
// Digital, que é alertado pelo Agente Debug V2 — o consultor não tem como consertar
// e não deve ser estressado com isso. O painel conta o que o cliente recebeu.
//
// ESCOLHER DESTINATÁRIO (10/09/2026): a lista de representantes virou marcável, no
// mesmo desenho dos canais. O que muda aqui é que TODA conta de canal passou a ser
// sobre os SELECIONADOS — quantos alcança, quantos já receberam hoje, se sobra
// alguém. Contar sobre o cliente inteiro faria a tela liberar um canal que não
// alcança ninguém deste envio.
//
// Vive em arquivo próprio pelas mesmas duas razões do BotaoComprovante: o teto de
// 600 linhas do AGENTS.md (o ChecklistPendentes já passava dele) e poder ser testado
// sem montar a tela inteira do checklist. As peças de desenho saíram para
// `avisoKit.tsx` quando a escolha de destinatário empurrou este arquivo contra o
// mesmo teto.
import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Mail, MessageCircle, Send } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { invocarBorda } from '@/lib/bordaSupabase';
import { useAvisoProjetosDaOS } from '@/hooks/useAvisoProjetosDaOS';
import {
  alcanceDosCanais, contatoNoCanal, podeReceberAgora, useDestinatariosCliente,
} from '@/hooks/useDestinatariosCliente';
import { useHistoricoNotificacoes } from '@/hooks/useHistoricoNotificacoes';
import {
  descreverEnvio, montarSituacaoDocumentos, temAlgoParaAvisar,
  type RespostaNotificar,
} from '@/lib/avisoSituacaoDocumentos';
import type { LinhaChecklist } from '@/lib/checklistDerivado';
import {
  diaSeguinte, disparoDeHoje, envioDeHojePara, formatarDia, nomePorContato,
  rotuloDosCanais, type CanalAviso,
} from '@/lib/historicoNotificacoes';
import { ComTooltip, LinhaCanal, Numero, Rotulo } from './avisoKit';
import { ListaDeDestinatarios, PainelDeHistorico } from './AvisoDestinatarios';

/**
 * O aviso 2 grava com o valor de enum `cobranca_pendencia`, e não com o nome da API.
 *
 * Acrescentar valor a `notificacao_tipo` seria migração, e ela não entregaria nada
 * além do nome. Quem traduz é o mapa `TIPO_NO_BANCO` na borda; aqui o painel precisa
 * do valor do BANCO, porque é ele que está gravado nas linhas.
 */
const TIPO_NO_BANCO = 'cobranca_pendencia';

const CANAIS: CanalAviso[] = ['email', 'whatsapp'];

export type { CanalAviso };

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
  return `Enviar por ${rotuloDosCanais(canais)}`;
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

  const jaHoje = useMemo(() => disparoDeHoje(historico, TIPO_NO_BANCO), [historico]);
  // Contato → nome, para o histórico anotar quem era. Sai do cadastro de AGORA e
  // por isso acompanha o contato gravado, nunca o substitui — ver `AvisoDestinatarios`.
  const nomes = useMemo(() => nomePorContato(destinatarios), [destinatarios]);

  const [canais, setCanais] = useState<CanalAviso[]>(['email', 'whatsapp']);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const avisoNosProjetos = useAvisoProjetosDaOS();

  const carregando = carregandoDest || carregandoHist;

  /**
   * A seleção nasce com TODO MUNDO que ainda pode receber, e é semeada uma vez
   * por abertura.
   *
   * O padrão ser "todos" repete a decisão do canal: esquecer alguém é o cliente
   * não avisado, e o erro por omissão tem de ser mandar mais e não menos. Quem
   * já recebeu hoje fica de fora porque a borda recusaria a linha dele.
   *
   * A trava de uma vez por abertura existe porque `useQuery` refaz a consulta ao
   * voltar o foco da janela: sem ela, o analista que desmarcasse um sócio e
   * trocasse de aba veria a marca voltar sozinha.
   */
  const semeado = useRef(false);
  useEffect(() => {
    if (!aberto) { semeado.current = false; return; }
    if (semeado.current || carregando) return;
    semeado.current = true;
    setSelecionados(
      destinatarios.filter((d) => podeReceberAgora(d, jaHoje)).map((d) => d.user_id),
    );
  }, [aberto, carregando, destinatarios, jaHoje]);

  const escolhidos = useMemo(
    () => destinatarios.filter((d) => selecionados.includes(d.user_id)),
    [destinatarios, selecionados],
  );

  /**
   * Por canal: quantos dos escolhidos ele alcança, e quantos já receberam hoje.
   *
   * A divisão entre os dois é o que permite a frase certa na caixa. "0
   * destinatários" cabe em duas situações opostas — ninguém tem telefone, ou
   * todos já receberam — e o analista age diferente em cada uma.
   */
  const contagem = useMemo(() => {
    const conta = (canal: CanalAviso) => {
      let aReceber = 0;
      let jaReceberam = 0;
      for (const d of escolhidos) {
        const contato = contatoNoCanal(d, canal);
        if (!contato) continue;
        if (envioDeHojePara(jaHoje, canal, contato)) jaReceberam += 1;
        else aReceber += 1;
      }
      return { aReceber, jaReceberam };
    };
    return { email: conta('email'), whatsapp: conta('whatsapp') };
  }, [escolhidos, jaHoje]);

  /**
   * Os canais que este envio vai realmente percorrer.
   *
   * Marcado não basta: o canal precisa alcançar alguém dos escolhidos que ainda
   * não recebeu. É esta lista que vai no corpo da chamada, para a borda não
   * abrir um canal que a tela já sabe que não tem destino.
   */
  const canaisEfetivos = useMemo(
    () => CANAIS.filter((c) => canais.includes(c) && contagem[c].aReceber > 0),
    [canais, contagem],
  );

  /**
   * Canal que NENHUM representante do cliente alcança sai desmarcado sozinho.
   *
   * A conta aqui é sobre o cliente inteiro, e não sobre os escolhidos, de
   * propósito: é propriedade estável do cadastro. Desmarcar em função da escolha
   * faria a caixa piscar a cada clique na lista de destinatários, e o analista
   * teria de remarcar o canal depois de trocar de sócio.
   */
  const alcanceTotal = useMemo(() => alcanceDosCanais(destinatarios), [destinatarios]);
  useEffect(() => {
    if (carregandoDest) return;
    setCanais((atual) => atual.filter((c) => alcanceTotal[c] > 0));
  }, [carregandoDest, alcanceTotal]);

  const alternarCanal = (canal: CanalAviso) => setCanais((atual) => (
    atual.includes(canal) ? atual.filter((c) => c !== canal) : [...atual, canal]
  ));

  const alternarDestinatario = (userId: string) => setSelecionados((atual) => (
    atual.includes(userId) ? atual.filter((id) => id !== userId) : [...atual, userId]
  ));

  const podeEnviar = temAlgoParaAvisar(dados) && escolhidos.length > 0
    && canaisEfetivos.length > 0 && !enviando;

  /**
   * As datas saem do DIA DO DISPARO, não de `new Date()`.
   *
   * `jaHoje.dia` é o dia local que a própria linha do banco carrega, o mesmo recorte
   * que a chave de idempotência usou para recusar o segundo envio. Recalcular por
   * fora abriria a chance de a tela dizer uma data e o banco ter travado outra.
   */
  const dataDoAviso = jaHoje ? formatarDia(jaHoje.dia) : '';
  const proximoEm = jaHoje ? formatarDia(diaSeguinte(jaHoje.dia)) : '';

  // As duas faixas do topo falam do CLIENTE, não da escolha: são estados em que
  // não há envio possível hoje faça o analista o que fizer, e por isso não podem
  // aparecer e sumir conforme ele marca e desmarca gente.
  const semNinguem = destinatarios.length > 0
    && destinatarios.every((d) => !d.email && !d.telefone);
  const todosJaReceberam = destinatarios.length > 0
    && destinatarios.every((d) => !podeReceberAgora(d, jaHoje));

  /**
   * Por que o botão está apagado, em uma frase — e `undefined` quando ele funciona.
   *
   * A ordem importa: vai do que o analista consegue resolver na hora (marcar
   * alguém, marcar um canal) para o que ele não resolve (o dia já fechou). Dizer
   * "já enviado hoje" para quem simplesmente desmarcou todo mundo mandaria ele
   * esperar até amanhã sem motivo.
   */
  const motivoDoBloqueio = enviando ? undefined
    : !temAlgoParaAvisar(dados)
      ? 'Não há documento pendente nem devolução para informar ao cliente.'
      : escolhidos.length === 0
        ? 'Marque pelo menos um destinatário para enviar a notificação.'
        : canais.length === 0
          ? 'Escolha pelo menos um canal para enviar a notificação.'
          : canaisEfetivos.length === 0 && jaHoje
            ? `Os destinatários marcados já receberam esta notificação hoje, `
              + `${dataDoAviso}. Uma nova poderá ser enviada a partir de ${proximoEm}.`
            : canaisEfetivos.length === 0
              ? 'Os canais marcados não alcançam nenhum dos destinatários escolhidos.'
              : undefined;

  const enviar = async () => {
    setEnviando(true);
    try {
      // `invocarBorda` e não `functions.invoke`: renova a sessão antes e repete uma
      // vez no 401. Ver o cabeçalho de `bordaSupabase.ts` — em 09/09/2026 a borda
      // recusou um aviso com "Invalid token" enquanto o UPDATE da mesma sessão passava.
      const { data, error } = await invocarBorda('notificar', {
        event_type: 'situacao_documentos',
        solicitacao_id: solicitacaoId,
        situacao: dados,
        canais: canaisEfetivos,
        // Só os que ainda podem receber. A borda recusaria os outros pela chave de
        // idempotência, mas mandar quem a tela já sabe estar travado poluiria o log
        // com dedup que não é dedup — é escolha nossa mal filtrada.
        destinatarios: escolhidos
          .filter((d) => podeReceberAgora(d, jaHoje))
          .map((d) => d.user_id),
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
      toast.error('Não foi possível enviar a notificação: ' + (erro as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={(v) => !enviando && !v && onFechar()}>
      <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          {/* NÃO é "Enviar solicitação de documentos" (sugestão da Patrícia,
              10/09/2026), e a distinção é o ponto: a solicitação já foi enviada
              na tela de Solicitação de documentos, e existe um botão "Enviar
              solicitação" de verdade lá. O mesmo verbo nas duas telas faria o
              analista achar que está reenviando o pedido inteiro.

              O nome é "notificação" porque é o termo que o resto do fluxo usa —
              o painel ao lado ("Notificações enviadas"), o botão de envio e a
              faixa de "o cliente não recebeu a notificação". */}
          <DialogTitle className="text-lg font-extrabold tracking-tight text-osg-700">
            Enviar notificação de documentos pendentes
          </DialogTitle>
          <DialogDescription>
            Confira os documentos, o destinatário e os canais de envio antes de confirmar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-[1fr_260px]">
          {/* ── ESQUERDA · o que vai ser enviado ── */}
          <div className="space-y-5 px-6 py-5">
            {/* Verde, não âmbar. Âmbar é a cor de problema, e não há problema
                nenhum aqui: o aviso saiu, o cliente foi informado, o trabalho está
                feito. Pintar de amarelo um resultado bem-sucedido faz o analista
                procurar o que deu errado. */}
            {/* O texto NOMEIA a coisa e DATA os dois lados. "Já avisado hoje. O
                próximo pode ser enviado amanhã" era curto ao ponto de soar seco, e
                nem dizia notificação: "avisado" pode ser conversa, ligação, qualquer
                coisa. E "amanhã" obriga o analista a fazer a conta de que dia é
                amanhã para saber quando volta a poder. */}
            {todosJaReceberam && jaHoje && (
              <p className="flex items-start gap-2 rounded-xl border border-osg-moss/30 bg-osg-moss/[0.07] px-3 py-2.5 text-sm leading-relaxed text-osg-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-osg-moss" />
                <span>
                  <strong className="font-semibold">
                    Todos os destinatários já receberam esta notificação hoje,{' '}
                    {dataDoAviso}.
                  </strong>{' '}
                  Uma nova notificação poderá ser enviada a partir de amanhã,{' '}
                  {proximoEm}.
                </span>
              </p>
            )}

            {semNinguem && (
              <p className="rounded-lg border border-osg-200 bg-osg-50 px-3 py-2 text-sm text-osg-700">
                <strong className="font-semibold">Nenhum canal disponível.</strong> Nenhum
                representante com acesso ao portal tem e-mail ou telefone cadastrado.
              </p>
            )}

            <section>
              <Rotulo>Documentos da solicitação</Rotulo>

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
                {/* "a reenviar" não dizia reenviar o quê. Estes são os arquivos
                    que o cliente mandou e o analista RECUSOU — o rótulo agora
                    nomeia o ato que os produziu, o mesmo verbo do botão Recusar
                    no checklist. Quem reenvia é o cliente, e isso o corpo da
                    mensagem explica. */}
                <Numero
                  valor={dados.recusados.length}
                  rotulo={dados.recusados.length === 1
                    ? 'documento recusado' : 'documentos recusados'}
                  tom="reenviar"
                />
              </div>

              {/* "recebidos" e não "conferidos": a conta soma toda linha que tem
                  arquivo, inclusive a que ainda espera veredito do analista.
                  Dizer "conferidos" afirmaria uma revisão que pode não ter havido. */}
              <p className="mt-3 text-xs leading-relaxed text-osg-500">
                {dados.recebidos} de {dados.base} documentos já foram recebidos. Os{' '}
                {dados.pendentes.length} documentos pendentes
                {dados.recusados.length > 0
                  && ` e os ${dados.recusados.length} recusados, com o motivo de cada devolução,`}
                {' '}serão incluídos na mensagem enviada ao cliente.
              </p>
            </section>

            {/* PARA QUEM antes de POR ONDE: o analista decide o canal olhando
                quem tem e-mail e quem tem telefone, e a ordem inversa o fazia
                marcar a caixa para só depois descobrir que ninguém era alcançável
                por ali. Pedido da Luana (OSG, 09/09/2026). */}
            <section>
              <Rotulo>
                {destinatarios.length > 1 ? 'Destinatários' : 'Destinatário'}
              </Rotulo>
              <ListaDeDestinatarios
                destinatarios={destinatarios}
                carregando={carregando}
                selecionados={new Set(selecionados)}
                onAlternar={alternarDestinatario}
                jaHoje={jaHoje}
                proximoEm={proximoEm}
                enviando={enviando}
              />
            </section>

            <section>
              <Rotulo>Canais de envio</Rotulo>
              <div className="mt-3 space-y-2">
                <LinhaCanal
                  canal="email"
                  rotulo="E-mail"
                  nomeNoTexto="e-mail"
                  contato="e-mail"
                  Icone={Mail}
                  marcado={canais.includes('email')}
                  onAlternar={() => alternarCanal('email')}
                  carregando={carregando}
                  semSelecao={escolhidos.length === 0}
                  aReceber={contagem.email.aReceber}
                  jaReceberam={contagem.email.jaReceberam}
                  enviadoEm={jaHoje?.porCanal.email}
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
                  onAlternar={() => alternarCanal('whatsapp')}
                  carregando={carregando}
                  semSelecao={escolhidos.length === 0}
                  aReceber={contagem.whatsapp.aReceber}
                  jaReceberam={contagem.whatsapp.jaReceberam}
                  enviadoEm={jaHoje?.porCanal.whatsapp}
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

            <PainelDeHistorico
              historico={historico}
              jaHoje={jaHoje}
              nomes={nomes}
              carregando={carregandoHist}
              erro={Boolean(erroHist)}
            />
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
                  : <><Send className="mr-2 h-4 w-4" />{rotuloDoBotao(canaisEfetivos)}</>}
              </Button>
            </span>
          </ComTooltip>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
