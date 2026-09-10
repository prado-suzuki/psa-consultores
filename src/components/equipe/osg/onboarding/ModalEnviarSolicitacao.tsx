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
import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Mail, MessageCircle, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  alcanceDosCanais, contatoNoCanal, podeReceberAgora, useDestinatariosCliente,
} from '@/hooks/useDestinatariosCliente';
import { rotuloDosCanais, type CanalAviso } from '@/lib/historicoNotificacoes';
import type { EscolhaDoEnvio } from '@/hooks/useDomainSolicitacao';
// Do modal de cobrança, de propósito: é a mesma escolha, com o mesmo desenho.
import { ComTooltip, LinhaCanal, Rotulo } from '../checklists/avisoKit';
import { ListaDeDestinatarios } from '../checklists/AvisoDestinatarios';

const CANAIS: CanalAviso[] = ['email', 'whatsapp'];

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
  const { data: destinatarios = [], isLoading: carregando } = useDestinatariosCliente(
    aberto ? clienteId : null,
  );

  const [canais, setCanais] = useState<CanalAviso[]>(['email', 'whatsapp']);
  const [selecionados, setSelecionados] = useState<string[]>([]);

  /**
   * Nasce com todo mundo que tem contato, e é semeado uma vez por abertura.
   *
   * Mesma decisão do modal de cobrança: esquecer alguém é o cliente não avisado,
   * e o erro por omissão tem de ser mandar mais e não menos. A trava de uma vez
   * existe porque `useQuery` refaz a consulta ao voltar o foco da janela — sem
   * ela, quem desmarcasse um sócio e trocasse de aba veria a marca voltar.
   *
   * Aqui `jaHoje` é sempre `null`: a solicitação ainda não foi enviada, então
   * não há disparo anterior que possa travar ninguém.
   */
  const semeado = useRef(false);
  useEffect(() => {
    if (!aberto) { semeado.current = false; return; }
    if (semeado.current || carregando) return;
    semeado.current = true;
    setSelecionados(
      destinatarios.filter((d) => podeReceberAgora(d, null)).map((d) => d.user_id),
    );
  }, [aberto, carregando, destinatarios]);

  const escolhidos = useMemo(
    () => destinatarios.filter((d) => selecionados.includes(d.user_id)),
    [destinatarios, selecionados],
  );

  /** Quantos dos marcados cada canal alcança. Sem histórico, ninguém "já recebeu". */
  const alcance = useMemo(() => ({
    email: escolhidos.filter((d) => contatoNoCanal(d, 'email')).length,
    whatsapp: escolhidos.filter((d) => contatoNoCanal(d, 'whatsapp')).length,
  }), [escolhidos]);

  const canaisEfetivos = useMemo(
    () => CANAIS.filter((c) => canais.includes(c) && alcance[c] > 0),
    [canais, alcance],
  );

  /** Canal que NENHUM representante alcança sai desmarcado — propriedade do cadastro. */
  const alcanceTotal = useMemo(() => alcanceDosCanais(destinatarios), [destinatarios]);
  useEffect(() => {
    if (carregando) return;
    setCanais((atual) => atual.filter((c) => alcanceTotal[c] > 0));
  }, [carregando, alcanceTotal]);

  const alternarCanal = (canal: CanalAviso) => setCanais((atual) => (
    atual.includes(canal) ? atual.filter((c) => c !== canal) : [...atual, canal]
  ));
  const alternarDestinatario = (userId: string) => setSelecionados((atual) => (
    atual.includes(userId) ? atual.filter((id) => id !== userId) : [...atual, userId]
  ));

  const podeEnviar = itensAtivos > 0 && escolhidos.length > 0
    && canaisEfetivos.length > 0 && !enviando;

  /**
   * Por que o botão está apagado, em uma frase — do que se resolve agora para o
   * que não se resolve aqui.
   */
  const motivoDoBloqueio = enviando ? undefined
    : itensAtivos === 0
      ? 'A lista está vazia. Gere os documentos a partir da OS antes de enviar.'
      : destinatarios.length === 0
        ? 'Este cliente não tem representante com acesso ao portal. Cadastre um antes de enviar.'
        : escolhidos.length === 0
          ? 'Marque pelo menos um destinatário para enviar a solicitação.'
          : canais.length === 0
            ? 'Escolha pelo menos um canal para enviar a solicitação.'
            : canaisEfetivos.length === 0
              ? 'Os canais marcados não alcançam nenhum dos destinatários escolhidos.'
              : undefined;

  return (
    <Dialog open={aberto} onOpenChange={(v) => !enviando && !v && onFechar()}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-lg font-extrabold tracking-tight text-osg-700">
            Enviar a solicitação ao cliente
          </DialogTitle>
          <DialogDescription>
            Confira os destinatários e os canais de envio antes de confirmar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
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
              selecionados={new Set(selecionados)}
              onAlternar={alternarDestinatario}
              /* Sem disparo anterior: nada a travar, nada a datar. */
              jaHoje={null}
              proximoEm=""
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
                aReceber={alcance.email}
                jaReceberam={0}
                proximoEm=""
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
                aReceber={alcance.whatsapp}
                jaReceberam={0}
                proximoEm=""
                enviando={enviando}
              />
            </div>
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
