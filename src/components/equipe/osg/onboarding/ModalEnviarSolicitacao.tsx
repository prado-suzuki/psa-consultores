// O modal do PRIMEIRO envio: libera a lista no portal e notifica quem o
// analista marcar.
//
// POR QUE NÃO É O MESMO MODAL DA COBRANÇA, ainda que a metade de baixo seja
// igual. Os dois escolhem destinatário e canal, e para isso reusam as MESMAS
// peças (`ListaDeDestinatarios`, `LinhaCanal`) — duplicar o desenho faria as
// duas telas divergirem no primeiro ajuste. O que muda é tudo em volta:
//
//   cobrança (checklist)        este (solicitação)
//   ------------------------    ---------------------------------------------
//   repetível, 1× por dia       ACONTECE UMA VEZ, e só a partir do rascunho
//   mostra pendentes/recusados  mostra o que vai ser pedido, que é tudo
//   tem painel de histórico     não tem: antes do envio não existe histórico
//   cobra o que falta           abre o acesso do cliente à lista
//
// O "uma vez" não é regra escrita aqui: o botão que abre este modal só existe
// em `rascunho`, e o envio muda o status para `enviada`. A tela diz isso em
// palavras porque a consequência não é óbvia — depois deste envio, cobrar passa
// a ser no checklist, e o analista precisa saber disso ANTES de clicar.
import { Loader2, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
// Ver a nota em `ModalAvisarCliente.tsx`: modal da OSG usa `OsgDialog`, nunca o
// `@/components/ui/dialog` cru.
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { cn } from '@/lib/utils';
import {
  motivoDeBloqueio, temParaEnviar, useEscolhaDeEnvio,
} from '@/hooks/useEscolhaDeEnvio';
import { rotuloDosCanais } from '@/lib/historicoNotificacoes';
import type { EscolhaDoEnvio } from '@/hooks/useDomainSolicitacao';
// Do modal de cobrança, de propósito: é a mesma escolha, com o mesmo desenho.
import { BlocoDeCanais, ComTooltip, Rotulo } from '../checklists/avisoKit';
import { ListaDeDestinatarios } from '../checklists/AvisoDestinatarios';

export interface ModalEnviarSolicitacaoProps {
  aberto: boolean;
  onFechar: () => void;
  clienteId: string;
  /** Quantos documentos ativos a lista tem — é o que o cliente vai ver. */
  itensAtivos: number;
  enviando: boolean;
  onConfirmar: (escolha: EscolhaDoEnvio) => void;
}

export function ModalEnviarSolicitacao({
  aberto, onFechar, clienteId, itensAtivos, enviando, onConfirmar,
}: ModalEnviarSolicitacaoProps) {
  /** `jaHoje` nulo: a solicitação ainda não foi enviada, ninguém está travado. */
  const escolha = useEscolhaDeEnvio({ clienteId, aberto });
  const { destinatarios, carregando, escolhidos, canaisEfetivos } = escolha;

  const podeEnviar = itensAtivos > 0 && temParaEnviar(escolha) && !enviando;

  /**
   * A lista vazia vem ANTES do motivo compartilhado: é a única condição deste
   * modal que não é sobre destinatário, e sem ela a tela mandaria marcar gente
   * para enviar um pedido sem nenhum documento.
   */
  const motivoDoBloqueio = enviando ? undefined
    : itensAtivos === 0
      ? 'A lista está vazia. Gere os documentos a partir da OS antes de enviar.'
      : motivoDeBloqueio(escolha, 'para enviar a solicitação');

  return (
    <Dialog open={aberto} onOpenChange={(v) => !enviando && !v && onFechar()}>
      {/* `overflow-hidden` descarta a rolagem que a primitiva dá, então o corpo
          precisa rolar por conta: o teto de 90vh vem de lá, e sem isto o
          conteúdo mais comprido ficaria cortado sem barra. */}
      <DialogContent className="flex max-w-lg flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-lg font-extrabold tracking-tight text-osg-700">
            Enviar a solicitação ao cliente
          </DialogTitle>
          <DialogDescription>
            Confira os destinatários e os canais de envio antes de confirmar.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* O QUE ACONTECE AO CLICAR, antes de qualquer escolha. É a diferença
              entre este envio e a cobrança: aqui o acesso do cliente ABRE, e o
              caminho para cobrar depois passa a ser outro. Dizer isso agora
              evita o analista procurar um segundo "Enviar" que não existe. */}
          <p className="rounded-xl border border-osg-200/70 bg-osg-50/60 px-3 py-2.5 text-sm leading-relaxed text-osg-700">
            <strong className="font-semibold">
              {itensAtivos} {itensAtivos === 1 ? 'documento será solicitado' : 'documentos serão solicitados'}
            </strong>{' '}
            ao cliente. A lista fica disponível no portal e a notificação sai pelos canais
            marcados abaixo.{' '}
            <strong className="font-semibold">A solicitação é enviada uma única vez.</strong>{' '}
            Para cobrar o que faltar depois, passe para o checklist e use Enviar notificação.
          </p>

          <section>
            <Rotulo>
              {destinatarios.length > 1 ? 'Destinatários' : 'Destinatário'}
            </Rotulo>
            <ListaDeDestinatarios
              destinatarios={destinatarios}
              carregando={carregando}
              selecionados={new Set(escolha.selecionados)}
              onAlternar={escolha.alternarDestinatario}
              /* Sem disparo anterior: nada a travar, nada a datar. */
              jaHoje={null}
              proximoEm=""
              enviando={enviando}
            />
          </section>

          <section>
            <Rotulo>Canais de envio</Rotulo>
            <BlocoDeCanais escolha={escolha} enviando={enviando} />
          </section>
        </div>

        <DialogFooter className="border-t border-osg-100 bg-background px-6 py-4">
          <Button variant="ghost" onClick={onFechar} disabled={enviando}>
            Cancelar
          </Button>
          {/* Invólucro porque `disabled:pointer-events-none` engole o tooltip —
              ver o mesmo trecho em `ModalAvisarCliente`. */}
          <ComTooltip texto={motivoDoBloqueio}>
            <span
              className={cn('inline-flex', !podeEnviar && 'cursor-not-allowed')}
              tabIndex={podeEnviar ? undefined : 0}
            >
              <Button
                onClick={() => onConfirmar({
                  canais: canaisEfetivos,
                  destinatarios: escolhidos.map((d) => d.user_id),
                })}
                disabled={!podeEnviar}
              >
                {enviando
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</>
                  : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      {canaisEfetivos.length === 0
                        ? 'Enviar solicitação'
                        : `Enviar por ${rotuloDosCanais(canaisEfetivos)}`}
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
