import { useEffect, useMemo, useRef, useState } from 'react';

import {
  alcanceDosCanais, contatoNoCanal, podeReceberAgora,
  useDestinatariosCliente, type DestinatarioAviso,
} from '@/hooks/useDestinatariosCliente';
import type { CanalAviso, DisparoHistorico } from '@/lib/historicoNotificacoes';

/**
 * "Para quem e por onde", que hoje são TRÊS modais e eram três cópias.
 *
 * Os avisos ao cliente passaram a ter modal na frente um de cada vez — a cobrança
 * do checklist (10/09), o primeiro envio da solicitação (10/09) e a finalização
 * (11/09) — e cada um nasceu com a mesma sequência de estado copiada: semear a
 * seleção, contar alcance por canal, derrubar canal que não alcança ninguém,
 * alternar marca. São umas setenta linhas que não podem divergir entre as telas,
 * porque divergir aqui significa a tela prometer um envio que a borda não faz.
 *
 * O que NÃO mora aqui é o texto nem o enquadramento: cada modal diz uma coisa
 * diferente antes da escolha, e é por isso que continuam sendo três componentes.
 */

const CANAIS: CanalAviso[] = ['email', 'whatsapp'];

export interface EntradaEscolhaDeEnvio {
  clienteId: string;
  /** A consulta só roda com o modal aberto, e a semeadura se refaz a cada abertura. */
  aberto: boolean;
  /**
   * O disparo de hoje deste aviso, quando ele é repetível.
   *
   * Nulo nos avisos que acontecem uma vez só (primeiro envio, finalização): sem
   * disparo anterior não há quem esteja travado pela janela diária.
   */
  jaHoje?: DisparoHistorico | null;
}

export interface EscolhaDeEnvio {
  destinatarios: DestinatarioAviso[];
  carregando: boolean;
  canais: CanalAviso[];
  selecionados: string[];
  /** Os destinatários marcados, já resolvidos. */
  escolhidos: DestinatarioAviso[];
  /** Quantos dos MARCADOS cada canal alcança. */
  alcance: Record<CanalAviso, number>;
  /** Canais marcados que de fato alcançam alguém — é o que vai para a borda. */
  canaisEfetivos: CanalAviso[];
  alternarCanal: (canal: CanalAviso) => void;
  alternarDestinatario: (userId: string) => void;
}

export function useEscolhaDeEnvio(
  { clienteId, aberto, jaHoje = null }: EntradaEscolhaDeEnvio,
): EscolhaDeEnvio {
  const { data: destinatarios = [], isLoading: carregando } = useDestinatariosCliente(
    aberto ? clienteId : null,
  );

  const [canais, setCanais] = useState<CanalAviso[]>(['email', 'whatsapp']);
  const [selecionados, setSelecionados] = useState<string[]>([]);

  /**
   * Nasce com todo mundo que ainda pode receber, e é semeado UMA VEZ por abertura.
   *
   * O padrão é marcar todos porque esquecer alguém é o cliente não avisado, e o
   * erro por omissão tem de ser mandar mais e não menos. A trava de uma vez existe
   * porque `useQuery` refaz a consulta ao voltar o foco da janela — sem ela, quem
   * desmarcasse um sócio e trocasse de aba veria a marca voltar sozinha.
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

  const alcance = useMemo(() => ({
    email: escolhidos.filter((d) => contatoNoCanal(d, 'email')).length,
    whatsapp: escolhidos.filter((d) => contatoNoCanal(d, 'whatsapp')).length,
  }), [escolhidos]);

  const canaisEfetivos = useMemo(
    () => CANAIS.filter((c) => canais.includes(c) && alcance[c] > 0),
    [canais, alcance],
  );

  /**
   * Canal que NENHUM representante do cliente alcança sai desmarcado.
   *
   * Contra a lista INTEIRA e não contra a selecionada: é propriedade do cadastro
   * ("este cliente não tem telefone de ninguém"), não da escolha do momento.
   */
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

  return {
    destinatarios, carregando, canais, selecionados, escolhidos,
    alcance, canaisEfetivos, alternarCanal, alternarDestinatario,
  };
}

/**
 * O par destinatário-canal mínimo: alguém marcado E um canal que o alcance.
 *
 * É a condição que a borda também impõe, por outro caminho — ela recusa lista
 * vazia e ignora canal sem destino —, e tê-la na tela evita o clique que volta
 * como erro.
 */
export function temParaEnviar(escolha: EscolhaDeEnvio): boolean {
  return escolha.escolhidos.length > 0 && escolha.canaisEfetivos.length > 0;
}

/**
 * Por que o botão está apagado, em uma frase — e as MESMAS frases nos três modais.
 *
 * Sobre números e não sobre o objeto do estado, para o modal de cobrança poder
 * usá-las sem adotar o hook: ele tem a janela diária ("já recebeu hoje") no meio
 * da própria conta e continua com estado próprio. Antes cada modal escrevia a sua
 * versão — "para enviar a solicitação", "para enviar a notificação" — e o caso do
 * cliente sem representante só existia em dois dos três.
 *
 * ORDENADO do que o usuário resolve agora para o que ele não resolve aqui: quem
 * só precisava marcar uma caixa não pode ler primeiro "este cliente não tem
 * representante". `acao` fecha a frase ("para enviar a solicitação", "para
 * finalizar") porque o resto é igual nos três.
 */
export function motivoDaEscolha(
  contagem: {
    destinatarios: number; escolhidos: number; canais: number; canaisEfetivos: number;
  },
  acao: string,
): string | undefined {
  if (contagem.destinatarios === 0) {
    return 'Este cliente não tem representante com acesso ao portal. '
      + 'Cadastre um antes de continuar.';
  }
  if (contagem.escolhidos === 0) return `Marque pelo menos um destinatário ${acao}.`;
  if (contagem.canais === 0) return `Escolha pelo menos um canal ${acao}.`;
  if (contagem.canaisEfetivos === 0) {
    return 'Os canais marcados não alcançam nenhum dos destinatários escolhidos.';
  }
  return undefined;
}

/** A mesma conta, para quem já tem o estado montado pelo hook. */
export function motivoDeBloqueio(
  escolha: EscolhaDeEnvio, acao: string,
): string | undefined {
  return motivoDaEscolha({
    destinatarios: escolha.destinatarios.length,
    escolhidos: escolha.escolhidos.length,
    canais: escolha.canais.length,
    canaisEfetivos: escolha.canaisEfetivos.length,
  }, acao);
}
