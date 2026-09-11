// O modal de FINALIZAR a solicitação: confirma o fim e escolhe quem é avisado.
//
// POR QUE VIROU MODAL, tendo sido um `AlertDialog` de confirmação até 11/09/2026.
// O aviso 3 (`documento_aprovado`, "recebemos e conferimos") saía AUTOMÁTICO no
// encerramento, para todo representante alcançável nos dois canais, sem ninguém
// decidir. Os outros dois avisos ao cliente já tinham passado a ter escolha, e
// este ficou como a única porta por onde uma mensagem saía sozinha — medido em
// produção no teste de 11/09: o `solicitacao_enviada` gravou 2 linhas (um
// destinatário escolhido), e o `documento_aprovado` do mesmo fluxo gravou 4.
//
// AVISAR É OPCIONAL AQUI, E SÓ AQUI. A decisão virou duas vezes no mesmo dia
// (11/09/2026) e o que a fechou foi um fato do fluxo real: o checklist é
// encerrado sem o cliente ter mandado tudo com frequência, e o analista também
// encerra sem marcar "não se aplica" em cada pendência que sobrou. Nesses casos
// "recebemos e conferimos" não é o que aconteceu, e obrigar a mensagem obrigaria
// a mentir. Enviar e cobrar continuam exigindo destinatário — lá o aviso É o ato;
// aqui o ato é fechar o pedido, e a mensagem é consequência opcional dele.
//
// Quando a caixa está marcada vale o mesmo mínimo dos outros dois modais: um par
// destinatário-canal, verificado por `temParaEnviar`.
//
// NÃO AVISAR NÃO DEIXA NADA SOLTO, e isso foi conferido em 11/09: a cobrança por
// prazo (`solicitacao_vencida`) é bloqueada por `encerrada_em` na própria borda,
// não pelo envio do aviso. Além disso o job `cobrar-solicitacoes-vencidas-diario`
// está inativo em produção e a view que ele lê não existe.
//
// O bloco de escolha só aparece se a solicitação chegou ao cliente: encerrar
// aceita sair de `rascunho`, e rascunho nunca foi enviado. Ali não é escolha, é
// não existir a quem avisar. A guarda vive em três lugares (aqui, no `enviadaEm`
// do `encerrarSolicitacao`, e na borda), cada uma cobrindo um caminho diferente.
import { useEffect, useState } from 'react';
import { Loader2, Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { cn } from '@/lib/utils';
import {
  motivoDeBloqueio, temParaEnviar, useEscolhaDeEnvio,
} from '@/hooks/useEscolhaDeEnvio';
import { rotuloDosCanais } from '@/lib/historicoNotificacoes';
import type { EscolhaDoEnvio } from '@/hooks/useDomainSolicitacao';
import { BlocoDeCanais, ComTooltip, Rotulo } from '../checklists/avisoKit';
import { ListaDeDestinatarios } from '../checklists/AvisoDestinatarios';
import { caixaDeEscolhaCls } from '../checklists/checklistKit';

export interface ModalFinalizarSolicitacaoProps {
  aberto: boolean;
  onFechar: () => void;
  clienteId: string;
  /** Documentos ainda ativos, que o texto da confirmação precisa nomear. */
  itensAtivos: number;
  /** A solicitação chegou ao cliente (`enviada_em` gravado). */
  jaEnviada: boolean;
  encerrando: boolean;
  /**
   * `null` = nenhuma mensagem sai. Acontece em dois casos: rascunho, que nunca
   * chegou ao cliente, e o analista tendo desmarcado "avisar o cliente".
   */
  onConfirmar: (escolha: EscolhaDoEnvio | null) => void;
}

export function ModalFinalizarSolicitacao({
  aberto, onFechar, clienteId, itensAtivos, jaEnviada, encerrando, onConfirmar,
}: ModalFinalizarSolicitacaoProps) {
  const escolha = useEscolhaDeEnvio({ clienteId, aberto: aberto && jaEnviada });
  const { destinatarios, carregando, canaisEfetivos } = escolha;

  const [notificar, setNotificar] = useState(true);

  // Volta marcado a cada abertura: avisar é o caminho esperado, e herdar a
  // escolha da vez anterior faria o próximo encerramento sair calado sem
  // ninguém ter decidido isso.
  useEffect(() => { if (aberto) setNotificar(true); }, [aberto]);

  const vaiNotificar = jaEnviada && notificar;

  // O par destinatário-canal só é exigido quando a mensagem vai sair.
  const podeFinalizar = !encerrando && (!vaiNotificar || temParaEnviar(escolha));

  const motivoDoBloqueio = encerrando || !vaiNotificar
    ? undefined
    : motivoDeBloqueio(escolha, 'para avisar o cliente');

  return (
    <Dialog open={aberto} onOpenChange={(v) => !encerrando && !v && onFechar()}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-lg font-extrabold tracking-tight text-osg-700">
            Finalizar esta solicitação?
          </DialogTitle>
          <DialogDescription>
            {jaEnviada
              ? 'Confira o que muda para o cliente e quem será avisado.'
              : 'Confira o que muda para o cliente antes de confirmar.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          {/* O texto da confirmação anterior, palavra por palavra: ele já dizia o
              que precisa ser dito, e mudá-lo de passagem seria reescrever sem
              motivo o que a coordenação leu e aprovou. */}
          <p className="rounded-xl border border-osg-200/70 bg-osg-50/60 px-3 py-2.5 text-sm leading-relaxed text-osg-700">
            A finalização é <strong className="font-semibold">definitiva, não há como reabrir</strong>.
            A lista fica só para consulta, e a tela do cliente passa a modo leitura: os
            arquivos continuam visíveis, mas ele não envia mais nenhum documento.
            {itensAtivos > 0 && ` São ${itensAtivos} documento(s) ainda ativos.`}
          </p>

          {jaEnviada ? (
            <>
              <label className={cn(
                caixaDeEscolhaCls({ bloqueado: encerrando, marcado: notificar }),
                'flex items-start gap-3',
              )}>
                <Checkbox
                  checked={notificar}
                  onCheckedChange={(v) => setNotificar(v === true)}
                  disabled={encerrando}
                  className="mt-0.5"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-osg-700">
                    Avisar o cliente de que a documentação foi conferida
                  </span>
                  {/* A frase muda com a caixa porque as duas consequências são
                      diferentes, e a de desmarcar é a que precisa ficar explícita:
                      encerrar continua acontecendo, o que não acontece é a
                      mensagem. */}
                  <span className="block text-xs text-osg-500">
                    {notificar
                      ? 'A mensagem sai para os destinatários e canais marcados abaixo.'
                      : 'A solicitação é finalizada do mesmo jeito, sem nenhuma mensagem ao cliente.'}
                  </span>
                </span>
              </label>

              {notificar && (
              <>
              <section>
                <Rotulo>
                  {destinatarios.length > 1 ? 'Destinatários' : 'Destinatário'}
                </Rotulo>
                <ListaDeDestinatarios
                  destinatarios={destinatarios}
                  carregando={carregando}
                  selecionados={new Set(escolha.selecionados)}
                  onAlternar={escolha.alternarDestinatario}
                  /* Aviso de uma vez só: não há disparo anterior que trave alguém. */
                  jaHoje={null}
                  proximoEm=""
                  enviando={encerrando}
                />
              </section>

              <section>
                <Rotulo>Canais de envio</Rotulo>
                <BlocoDeCanais escolha={escolha} enviando={encerrando} />
              </section>
              </>
              )}
            </>
          ) : (
            /* Não é aviso de erro: é o caminho normal de quem monta uma lista e
               desiste dela. Dizer por que nada sai evita o consultor procurar a
               mensagem que não foi enviada. */
            <p className="text-sm leading-relaxed text-osg-500">
              Esta solicitação nunca foi enviada ao cliente, então não há ninguém a
              avisar na finalização.
            </p>
          )}
        </div>

        <DialogFooter className="border-t border-osg-100 bg-background px-6 py-4">
          <Button variant="ghost" onClick={onFechar} disabled={encerrando}>
            Cancelar
          </Button>
          {/* Invólucro porque `disabled:pointer-events-none` engole o tooltip —
              mesmo trecho dos outros dois modais. */}
          <ComTooltip texto={motivoDoBloqueio}>
            <span
              className={cn('inline-flex', !podeFinalizar && 'cursor-not-allowed')}
              tabIndex={podeFinalizar ? undefined : 0}
            >
              <Button
                onClick={() => onConfirmar(vaiNotificar
                  ? {
                    canais: canaisEfetivos,
                    destinatarios: escolha.escolhidos.map((d) => d.user_id),
                  }
                  : null)}
                disabled={!podeFinalizar}
              >
                {encerrando
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Finalizando...</>
                  : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      {vaiNotificar && canaisEfetivos.length > 0
                        ? `Finalizar e avisar por ${rotuloDosCanais(canaisEfetivos)}`
                        : 'Finalizar solicitação'}
                    </>
                  )}
              </Button>
            </span>
          </ComTooltip>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ModalFinalizarSolicitacao;
