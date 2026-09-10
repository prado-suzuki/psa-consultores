import { useState, type ReactNode } from 'react';
import { Ban, Check, FileText, Hourglass, Loader2, ShieldAlert, TriangleAlert, Undo2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useSincronizarSolicitacaoNaoAplicavel } from '@/hooks/useDomainSolicitacaoNaoAplicavel';
import type { ArquivoDaLinha, GrupoChecklist, LinhaChecklist } from '@/lib/checklistDerivado';
import type { EstadoDocumento } from '@/lib/estadoDocumento';
import {
  CLUSTER_LABEL, ESTADO_CHIP, ESTADO_LABEL, estadoDaLinha, PESO_STATUS, STATUS_LINHA,
} from './checklistKit';

/**
 * A ficha de uma entidade: os documentos pedidos a ela, o veredito sobre o que
 * chegou, e a marca de "não se aplica".
 *
 * Saiu de `ChecklistPendentes` pelo teto de 600 linhas do AGENTS.md, e por poder
 * ser testada sem montar a página inteira.
 *
 * AS DUAS ESCRITAS QUE EXISTEM AQUI, e a diferença entre elas:
 *
 *   revisão      → veredito sobre o ARQUIVO (aprovar, recusar com motivo, desfazer)
 *   não se aplica → veredito sobre a PENDÊNCIA (este documento não existe para
 *                   esta entidade)
 *
 * A segunda não é "remover o documento". Remover mora na Solicitação Inicial,
 * marca `solicitacao_item.status = 'dispensado'` e tira o documento de TODAS as
 * entidades; a marca daqui grava um par (item, entidade) em
 * `solicitacao_item_nao_aplicavel` e some só a linha desta. É a diferença entre
 * "a PSA não pede isso neste projeto" e "esta pessoa não tem esse documento".
 */

export interface AcoesRevisao {
  /** id do arquivo cuja revisão está em voo, para travar só a linha dele. */
  emRevisao: string | null;
  onAprovar: (arquivo: ArquivoDaLinha) => void;
  onRecusar: (arquivo: ArquivoDaLinha) => void;
  onDesfazer: (arquivo: ArquivoDaLinha) => void;
}

export function DocumentosDialog({ clienteId, grupo, filtro, onLimparFiltro, onOpenChange, ...acoes }: AcoesRevisao & {
  clienteId: string;
  grupo: GrupoChecklist | null;
  /** O estado escolhido no chip do card; nulo mostra a ficha inteira. */
  filtro: EstadoDocumento | null;
  onLimparFiltro: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const sincronizar = useSincronizarSolicitacaoNaoAplicavel(clienteId);
  /** O item cuja marca está em voo. Trava só a linha dele, como na revisão. */
  const [marcando, setMarcando] = useState<string | null>(null);

  const todas = grupo?.linhas ?? [];
  const linhas = todas
    .filter((linha) => !filtro || estadoDaLinha(linha) === filtro)
    .slice()
    .sort((a, b) => PESO_STATUS[a.status] - PESO_STATUS[b.status] || a.ordem - b.ordem);

  /**
   * O hook grava por SINCRONIZAÇÃO: recebe o conjunto desejado para a entidade e
   * resolve o que inserir e o que apagar. O alternar de uma linha, então, é o
   * conjunto atual mais ou menos ela — e é por isso que a lista sai de `todas`, e
   * não de `linhas`: com o chip de estado ligado, o filtro esconde as marcadas, e
   * mandar só as visíveis desmarcaria todo o resto sem ninguém pedir.
   */
  const alternarNaoAplicavel = (linha: LinhaChecklist) => {
    const alvo = grupo?.instancia.alvo;
    if (!alvo) return;

    const marcadas = todas.filter((l) => l.status === 'nao_aplicavel').map((l) => l.itemId);
    const itemIds = linha.status === 'nao_aplicavel'
      ? marcadas.filter((id) => id !== linha.itemId)
      : [...marcadas, linha.itemId];

    setMarcando(linha.itemId);
    sincronizar.mutate(
      { alvo, itemIds, nomes: Object.fromEntries(todas.map((l) => [l.itemId, l.documento])) },
      { onSettled: () => setMarcando(null) },
    );
  };

  /**
   * O grão `cliente` não tem entidade dona: o documento é do cliente inteiro, e
   * "não se aplica a ele" é o mesmo que não pedir — que é o Remover da Solicitação
   * Inicial. Oferecer os dois caminhos para o mesmo efeito só confunde.
   */
  const podeMarcar = !!grupo && grupo.instancia.alvo.kind !== 'cliente';

  return (
    <Dialog open={!!grupo} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden p-0">
        <DialogHeader className="border-b border-osg-100 bg-osg-50/50 px-6 py-5 text-left">
          <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-osg-500">{grupo ? CLUSTER_LABEL[grupo.instancia.cluster] : ''}</span>
          <DialogTitle className="text-xl text-osg-700">{grupo?.instancia.label}</DialogTitle>
          <DialogDescription>
            {grupo?.instancia.detalhe
              ? `${grupo.instancia.detalhe}. O que falta é o que foi solicitado menos o que já chegou.`
              : 'O que falta é o que foi solicitado menos o que já chegou.'}
          </DialogDescription>
          {filtro && (
            <div className="flex items-center gap-2 pt-1">
              <span className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                ESTADO_CHIP[filtro],
              )}>
                {ESTADO_LABEL[filtro]}
                <span className="tabular-nums opacity-70">{linhas.length}</span>
              </span>
              <button
                type="button"
                onClick={onLimparFiltro}
                className="rounded-md text-[11px] font-semibold text-osg-500 underline-offset-2 hover:text-osg-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-osg-moss/40"
              >
                ver todos os {grupo?.linhas.length} documentos
              </button>
            </div>
          )}
        </DialogHeader>
        <div className="max-h-[calc(90vh-130px)] divide-y divide-osg-100 overflow-y-auto px-2 pb-2 sm:px-4">
          {linhas.map((linha) => (
            <DocumentRow
              key={linha.chave}
              linha={linha}
              podeMarcar={podeMarcar}
              marcando={marcando === linha.itemId}
              onAlternarNaoAplicavel={alternarNaoAplicavel}
              {...acoes}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DocumentRow({ linha, podeMarcar, marcando, onAlternarNaoAplicavel, ...acoes }: AcoesRevisao & {
  linha: LinhaChecklist;
  podeMarcar: boolean;
  marcando: boolean;
  onAlternarNaoAplicavel: (linha: LinhaChecklist) => void;
}) {
  const status = STATUS_LINHA[linha.status];
  const naoAplicavel = linha.status === 'nao_aplicavel';

  /**
   * Só pendente e já marcado ganham o botão. Em `recebido` a marca contradiz um
   * arquivo que está ali na tela, e `dispensado` é decisão de outro nível — o
   * documento saiu da solicitação inteira, e desmarcar aqui não o traria de volta.
   */
  const mostraBotao = podeMarcar && (linha.status === 'pendente' || naoAplicavel);

  return (
    <div className="px-2 py-4 sm:px-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', linha.status === 'recebido' ? 'bg-osg-moss/10 text-osg-moss' : 'bg-osg-highlighter/20 text-osg-700')}>
          {linha.status === 'recebido' ? <Check className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className={cn('text-sm font-semibold text-osg-700', naoAplicavel && 'text-osg-500 line-through')}>{linha.documento}</h4>
            {/* "Pedido à mão" trazia de volta o "pedido" que a solicitação
                aposentou, e a outra tela já chama isto de "adicionados
                manualmente" (ProdutoRail). Um nome só para a mesma coisa. */}
            {!linha.doCatalogo && <Badge>Adicionado manualmente</Badge>}
            {linha.confidencial && <Badge tone="danger"><ShieldAlert className="h-3 w-3" />Confidencial</Badge>}
            {/* Item manual sem tipo avulso nunca casa com arquivo: a pendência é
                estrutural, e dizer isso é melhor que deixá-la inexplicada. */}
            {!linha.documentoTipoId && <Badge tone="danger">Sem tipo no catálogo</Badge>}
          </div>
          {linha.nota && <p className="mt-1 text-xs leading-relaxed text-osg-500">{linha.nota}</p>}
          {linha.arquivos.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {linha.arquivos.map((arquivo) => (
                <ArquivoRevisavel key={arquivo.id} arquivo={arquivo} {...acoes} />
              ))}
            </ul>
          )}
          {mostraBotao && (
            <div className="mt-2">
              <BotaoNaoAplica
                marcado={naoAplicavel}
                ocupado={marcando}
                documento={linha.documento}
                onClick={() => onAlternarNaoAplicavel(linha)}
              />
            </div>
          )}
        </div>
        <span className={cn('shrink-0 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em]', status.classe)}>
          {status.label}
        </span>
      </div>
    </div>
  );
}

/**
 * A marca de "não se aplica", com o desfazer no mesmo botão.
 *
 * Os dois sentidos no mesmo lugar porque marcar errado sem saída seria beco: a
 * linha marcada some da conta do cliente e das duas listas da cobrança, e voltar
 * atrás pelo banco não é caminho de tela.
 */
function BotaoNaoAplica({ marcado, ocupado, documento, onClick }: {
  marcado: boolean;
  ocupado: boolean;
  documento: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={ocupado}
      /* O nome vem daqui, e não de um `sr-only` ao lado do rótulo: a ficha repete
         o mesmo par de botões em toda linha, e sem o documento no nome não há
         como distinguir um do outro nem em leitor de tela nem em teste. */
      aria-label={`${marcado ? 'Voltar a solicitar' : 'Não se aplica'} — ${documento}`}
      /* Terceira pessoa e o efeito inteiro: o que sai da conta, de onde sai, e o
         que NÃO muda. "As outras continuam devendo" era coloquial e ainda
         deixava dúvida sobre o que continuava valendo. */
      title={marcado
        ? 'Volta a solicitar este documento desta entidade e o traz de volta para a conta.'
        : 'Tira este documento da conta desta entidade e da notificação ao cliente. '
          + 'As outras entidades continuam com ele.'}
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-osg-moss/40',
        marcado
          ? 'border-osg-200 text-osg-500 hover:bg-osg-100/70 hover:text-osg-700'
          : 'border-osg-200 text-osg-500 hover:border-osg-300 hover:bg-osg-100/70 hover:text-osg-700',
      )}
    >
      {ocupado
        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
        : marcado ? <Undo2 className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
      {marcado ? 'Voltar a solicitar' : 'Não se aplica'}
    </button>
  );
}

/**
 * O arquivo recebido, com o veredito ao lado.
 *
 * Só o que veio do cliente ganha botão: arquivo de `fonte = 'psa'` é produção
 * interna, e a casa não aprova o que a casa fez (a RPC recusaria também). Aprovado
 * e recusado mantêm uma saída — "Recusar" e "Aprovar" continuam à vista — porque
 * veredito errado tem de ter conserto sem passar pelo banco.
 */
function ArquivoRevisavel({ arquivo, emRevisao, onAprovar, onRecusar, onDesfazer }: AcoesRevisao & {
  arquivo: ArquivoDaLinha;
}) {
  const ocupado = emRevisao === arquivo.id;
  const doCliente = arquivo.fonte === 'cliente';
  const recusado = arquivo.revisao === 'recusado';
  const aprovado = arquivo.revisao === 'aprovado';

  return (
    <li className={cn(
      'rounded-lg border px-3 py-2',
      recusado ? 'border-osg-red/30 bg-osg-red/5' : 'border-osg-100 bg-osg-50/50',
    )}>
      <div className="flex flex-wrap items-center gap-2">
        <FileText className={cn('h-3.5 w-3.5 shrink-0', recusado ? 'text-osg-red' : 'text-osg-moss')} />
        <span className={cn(
          'min-w-0 flex-1 truncate text-xs font-medium',
          recusado ? 'text-osg-red line-through' : 'text-osg-600',
        )}>
          {arquivo.nome}
        </span>

        {!doCliente ? (
          <Badge>Enviado pela PSA</Badge>
        ) : ocupado ? (
          <Loader2 className="h-4 w-4 animate-spin text-osg-500" />
        ) : (
          <div className="flex shrink-0 items-center gap-1">
            {aprovado && (
              <span className="inline-flex items-center gap-1 rounded-full bg-osg-moss/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-osg-moss">
                <Check className="h-3 w-3" />Aprovado
              </span>
            )}
            {recusado && (
              <span className="inline-flex items-center gap-1 rounded-full bg-osg-red/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-osg-red">
                <TriangleAlert className="h-3 w-3" />Recusado
              </span>
            )}
            {!aprovado && !recusado && (
              <span className="inline-flex items-center gap-1 rounded-full bg-osg-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-osg-500">
                <Hourglass className="h-3 w-3" />A revisar
              </span>
            )}

            {!aprovado && (
              <BotaoVeredito tom="aprovar" onClick={() => onAprovar(arquivo)}>
                <Check className="h-3.5 w-3.5" />Aprovar
              </BotaoVeredito>
            )}
            {!recusado && (
              <BotaoVeredito tom="recusar" onClick={() => onRecusar(arquivo)}>
                <X className="h-3.5 w-3.5" />Recusar
              </BotaoVeredito>
            )}
            {(aprovado || recusado) && (
              <BotaoVeredito tom="desfazer" onClick={() => onDesfazer(arquivo)}>
                <Undo2 className="h-3.5 w-3.5" />
                <span className="sr-only">Desfazer revisão de {arquivo.nome}</span>
              </BotaoVeredito>
            )}
          </div>
        )}
      </div>
      {recusado && arquivo.motivo && (
        <p className="mt-1 pl-5 text-xs leading-relaxed text-osg-red">{arquivo.motivo}</p>
      )}
    </li>
  );
}

function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'danger' }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
      tone === 'danger' ? 'bg-osg-red/10 text-osg-red' : 'bg-osg-100/70 text-osg-600',
    )}>
      {children}
    </span>
  );
}

/**
 * O rótulo diz a ação; o tooltip diz a CONSEQUÊNCIA, que é o que não cabe nele.
 *
 * "Aprovar" não deixa claro que o veredito fecha a pendência, e "Recusar" não
 * diz que o arquivo volta para o cliente com o motivo. São as duas perguntas que
 * o analista tem no dedo antes de clicar.
 */
const DICA_VEREDITO: Record<'aprovar' | 'recusar' | 'desfazer', string> = {
  aprovar: 'Aceita este arquivo e fecha a pendência do documento.',
  recusar: 'Devolve este arquivo ao cliente com um motivo e reabre a pendência.',
  desfazer: 'Desfaz o veredito e devolve o arquivo para "A revisar".',
};

function BotaoVeredito({ tom, onClick, children }: {
  tom: 'aprovar' | 'recusar' | 'desfazer';
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={DICA_VEREDITO[tom]}
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-osg-moss/40',
        tom === 'aprovar' && 'border-osg-moss/30 text-osg-moss hover:bg-osg-moss/10',
        tom === 'recusar' && 'border-osg-red/30 text-osg-red hover:bg-osg-red/10',
        tom === 'desfazer' && 'border-osg-200 text-osg-500 hover:bg-osg-100/70 hover:text-osg-700',
      )}
    >
      {children}
    </button>
  );
}

/**
 * A recusa, com o motivo que o cliente vai ler.
 *
 * O motivo é opcional no banco, mas a tela insiste: recusa sem explicação devolve
 * o problema para o cliente sem dizer o que corrigir, e ele reenvia o mesmo
 * arquivo. Por isso o texto é o corpo do modal, e não um campo escondido.
 */
export function RecusaDialog({ arquivo, motivo, onMotivo, onOpenChange, onConfirmar }: {
  arquivo: ArquivoDaLinha | null;
  motivo: string;
  onMotivo: (valor: string) => void;
  onOpenChange: (aberto: boolean) => void;
  onConfirmar: () => void;
}) {
  return (
    <Dialog open={!!arquivo} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-osg-700">Recusar este documento?</DialogTitle>
          <DialogDescription>
            "{arquivo?.nome}" volta a contar como pendente para o cliente, que passa a ver o
            documento marcado como recusado, o motivo abaixo e o botão para enviar outro arquivo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label htmlFor="motivo-recusa" className="text-xs font-semibold text-osg-600">
            O que o cliente precisa corrigir
          </label>
          <Textarea
            id="motivo-recusa"
            value={motivo}
            onChange={(evento) => onMotivo(evento.target.value)}
            rows={3}
            placeholder="Ex.: a última página saiu cortada; reenvie a matrícula inteira."
            className="border-osg-200/80 bg-osg-50/50"
          />
          <p className="text-xs text-osg-500">
            Sem texto, o cliente vê só "Recusado" e fica sem saber o que refazer.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirmar}>Recusar documento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
