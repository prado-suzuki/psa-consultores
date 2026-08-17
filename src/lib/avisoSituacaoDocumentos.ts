import { estadoDoDocumento } from '@/lib/estadoDocumento';
import type { LinhaChecklist } from '@/lib/checklistDerivado';

/**
 * O que vai no aviso de situação dos documentos, montado a partir do checklist
 * que o consultor está vendo.
 *
 * POR QUE ISTO É UM MÓDULO PURO, e não código dentro do botão: é a mesma razão
 * de `estadoDocumento.ts` existir fora das telas. A mensagem que o cliente
 * recebe tem de dizer exatamente o que o analista viu na tela quando clicou —
 * se a conta fosse refeita em outro lugar (no banco, na função de borda), as
 * duas poderiam divergir, e aí o cliente é cobrado por documento que a tela
 * dava como recebido.
 *
 * DECISÃO DE 17/08/2026 (Bernardo e coordenação). Os avisos 2 (cobrança de
 * pendente) e 4 (reenvio necessário) foram FUNDIDOS num só. O motivo é o fluxo
 * real de trabalho: o analista abre o checklist, confere o que chegou, vincula
 * as entidades e recusa o que está errado — tudo na mesma sessão. Dois avisos
 * separados sairiam do mesmo ato, um atrás do outro, e o texto do aviso 4 já
 * previa "um aviso por lote de conferência, não por documento" (10/08) sem
 * definir o que fecha um lote. O clique fecha o lote.
 *
 * Consequência: 3 avisos ao cliente, não 4.
 *   1. solicitação enviada  — automático, no envio
 *   2. situação dos documentos — MANUAL, este
 *   3. documentação conferida — automático, no encerramento
 */

/** Uma linha que o cliente precisa resolver. */
export interface ItemAviso {
  documento: string;
  /** A entidade dona: "João da Silva", "Matrícula 4.521". Vazio no grão cliente. */
  entidade: string;
  /** Só no recusado: o texto que o cliente lê para saber o que refazer. */
  motivo?: string;
}

export interface DadosSituacaoDocumentos {
  /** Nunca enviado, ou enviado e devolvido sem arquivo válido. */
  pendentes: ItemAviso[];
  /** Tem arquivo recusado e nenhum aprovado: o cliente precisa reenviar. */
  recusados: ItemAviso[];
  /** Total de linhas que contam (recebidas + pendentes), a base do "X de Y". */
  base: number;
  recebidos: number;
}

/**
 * A entidade como o cliente a reconhece.
 *
 * O grão `cliente` não tem dono nomeado — o documento é do cliente, e repetir o
 * nome dele em toda linha polui a lista. Devolve vazio, e quem renderiza omite.
 */
function nomeDaEntidade(linha: LinhaChecklist): string {
  if (linha.instancia.cluster === 'cliente') return '';
  const label = linha.instancia.label?.trim() ?? '';
  const detalhe = linha.instancia.detalhe?.trim() ?? '';
  if (label && detalhe && detalhe !== label) return `${label} (${detalhe})`;
  return label || detalhe;
}

/**
 * Separa o que pede ação do cliente, na mesma régua da tela.
 *
 * Usa `estadoDoDocumento`, e não uma classificação própria, de propósito: é a
 * função que a tela do consultor e o portal do cliente já compartilham. Os dois
 * estados que pedem ação são `pendente` (nada chegou) e `recusado` (chegou e
 * voltou). `em_analise` e `aprovado` ficam fora — não há o que o cliente faça.
 *
 * `nao_aplicavel` e `dispensado` também ficam fora: não são documento em falta,
 * são ausência de pedido.
 */
export function montarSituacaoDocumentos(
  linhas: readonly LinhaChecklist[],
): DadosSituacaoDocumentos {
  const pendentes: ItemAviso[] = [];
  const recusados: ItemAviso[] = [];
  let recebidos = 0;
  let base = 0;

  for (const linha of linhas) {
    if (linha.status === 'nao_aplicavel' || linha.status === 'dispensado') continue;

    base += 1;
    if (linha.status === 'recebido') recebidos += 1;

    const estado = estadoDoDocumento(linha.status === 'recebido', linha.arquivos);
    const entidade = nomeDaEntidade(linha);

    if (estado === 'recusado') {
      // O motivo é de UM arquivo, e pode haver vários recusados na mesma linha.
      // Junta os motivos distintos: o cliente precisa saber tudo o que houve, e
      // repetir o mesmo texto duas vezes só faz a mensagem parecer defeituosa.
      const motivos = [...new Set(
        linha.arquivos
          .filter((arquivo) => arquivo.revisao === 'recusado' && arquivo.motivo?.trim())
          .map((arquivo) => arquivo.motivo!.trim()),
      )];
      recusados.push({
        documento: linha.documento,
        entidade,
        // A RPC obriga motivo na recusa, então o vazio não deveria acontecer. O
        // texto de reserva existe porque parâmetro vazio impede o envio no
        // WhatsApp (131008/132000) — melhor uma frase genérica que nada sair.
        motivo: motivos.join(' · ') || 'Sem motivo registrado; veja no portal.',
      });
      continue;
    }

    if (estado === 'pendente') {
      pendentes.push({ documento: linha.documento, entidade });
    }
  }

  return { pendentes, recusados, base, recebidos };
}

/**
 * Há algo que o cliente possa resolver?
 *
 * O botão fica desabilitado quando não há: mandar "faltam 0 documentos" seria
 * pedir ação inexistente, e o aviso de conclusão (o 3) é quem cobre esse caso.
 */
export function temAlgoParaAvisar(dados: DadosSituacaoDocumentos): boolean {
  return dados.pendentes.length > 0 || dados.recusados.length > 0;
}

/** O que cada canal devolveu, no formato que a borda usa. */
export interface ResultadoCanal {
  success?: boolean;
  skipped?: boolean;
  reason?: string;
  recipients?: number;
  erro?: string;
}

export interface RespostaNotificar {
  success?: boolean;
  error?: string;
  skipped?: boolean;
  reason?: string;
  canais?: Record<string, ResultadoCanal>;
}

/**
 * Traduz a resposta por canal em uma frase que diz a verdade.
 *
 * Existe porque "enviado" sozinho engana em dois casos que são a regra, não a
 * exceção: telefone está preenchido em 8 de 38 destinatários, então o WhatsApp
 * não sai na maioria das vezes; e a janela de um aviso por dia bloqueia o segundo
 * clique em silêncio se ninguém disser.
 */
export function descreverEnvio(resposta: RespostaNotificar): { texto: string; ok: boolean } {
  if (resposta.error) return { texto: resposta.error, ok: false };

  // Recusa que vem antes de resolver canal (nunca enviada, sem OS, sem
  // destinatário) chega na raiz e não em `canais`.
  if (resposta.skipped && !resposta.canais) {
    const MOTIVO: Record<string, string> = {
      nunca_enviada: 'Esta solicitação nunca foi enviada ao cliente, então não há o que cobrar.',
      sem_os: 'A solicitação não tem produtos na OS, e sem isso o texto do aviso sai quebrado.',
      no_recipient: 'Este cliente não tem representante com acesso ao portal.',
    };
    return { texto: MOTIVO[resposta.reason ?? ''] ?? 'Aviso não enviado.', ok: false };
  }

  const canais = resposta.canais ?? {};
  const email = canais.email ?? {};
  const whatsapp = canais.whatsapp ?? {};

  // A janela é por dia e por canal, então os dois batem juntos. Se um bloqueou
  // por já ter saído hoje, a mensagem é a do Bernardo: tente amanhã.
  const jaHoje = [email, whatsapp].some((c) => c.reason === 'already_sent_today');
  const nadaSaiu = !email.success && !whatsapp.success;
  if (jaHoje && nadaSaiu) {
    return {
      texto: 'Este cliente já foi avisado hoje. Tente amanhã.',
      ok: false,
    };
  }

  const partes: string[] = [];
  if (email.success) partes.push(`e-mail para ${email.recipients} destinatário(s)`);
  if (whatsapp.success) partes.push(`WhatsApp para ${whatsapp.recipients}`);

  if (partes.length === 0) {
    const porque = email.erro ?? whatsapp.erro ?? 'nenhum canal aceitou o envio';
    return { texto: `Aviso não enviado: ${porque}.`, ok: false };
  }

  let texto = `Aviso enviado por ${partes.join(' e ')}.`;

  // O caso mais comum, e o que mais engana se ficar calado.
  if (!whatsapp.success && whatsapp.reason === 'no_recipient') {
    texto += ' O WhatsApp não saiu: nenhum representante tem telefone cadastrado.';
  } else if (!whatsapp.success && whatsapp.reason === 'webhook_nao_configurado') {
    texto += ' O WhatsApp não saiu: o canal não está configurado.';
  }
  return { texto, ok: true };
}
