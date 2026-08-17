import type { Database } from '@/integrations/supabase/types';

/**
 * O histórico de avisos de uma solicitação, do jeito que o analista precisa ver.
 *
 * O QUE ELE MOSTRA, E O QUE NÃO MOSTRA. Só aviso que **chegou ao cliente**:
 * `enviado`, `entregue` e `lido`. Tentativa que falhou e destinatário sem canal
 * ficam de fora, e é decisão de produto (17/08/2026): o consultor não é quem
 * resolve falha de envio — o Digital é alertado pelo Agente Debug V2 e age. Pôr
 * `falhou` na tela do consultor seria estressá-lo com um problema que não é dele e
 * que ele não tem como consertar.
 *
 * Isso também resolve a questão da data. `confirmar_envio` só carimba data quando
 * o status avança: `enviado_em`, `entregue_em`, `lido_em`. Em `falhou` e `ignorado`
 * ele grava status e erro, e **nenhuma data** — porque não houve nada para datar.
 * Como o painel mostra apenas os três primeiros, toda linha exibida tem data.
 *
 * UMA LINHA POR CLIQUE, NÃO POR DESTINATÁRIO. Um clique gera N linhas em
 * `notificacao_envio` (uma por destinatário por canal). Mostrar as N cruas faria
 * "17/08" aparecer seis vezes. O agrupamento junta por (aviso, dia) e resume os
 * canais.
 */

type LinhaEnvio = Database['public']['Tables']['notificacao_envio']['Row'];
type Canal = Database['public']['Enums']['notificacao_canal'];

/** As linhas que o painel usa. Nem toda coluna da tabela interessa. */
export type EnvioParaHistorico = Pick<
  LinhaEnvio,
  'tipo' | 'canal' | 'status' | 'enviado_em' | 'entregue_em' | 'lido_em'
>;

/** Um clique do analista, ou um disparo automático, como o painel exibe. */
export interface DisparoHistorico {
  /** `${tipo}|${dia}`, estável para servir de key de render. */
  chave: string;
  tipo: string;
  /** Quando saiu. É a data mais antiga do grupo — o instante do disparo. */
  quando: string;
  /** Dia local, `AAAA-MM-DD`, o mesmo recorte que a borda usa na chave. */
  dia: string;
  /** Ordenados: e-mail antes de WhatsApp, sem repetição. */
  canais: Canal[];
  /**
   * O instante do primeiro envio de CADA canal.
   *
   * Existe porque o bloqueio é por canal: o analista pode mandar e-mail às 9h,
   * perceber que esqueceu o WhatsApp, e mandar o WhatsApp às 15h. Os dois são o
   * mesmo aviso do mesmo dia — uma linha só no painel —, mas a tela precisa dizer
   * "e-mail já enviado às 09:15" na caixa do e-mail, e nada na do WhatsApp.
   */
  porCanal: Partial<Record<Canal, string>>;
  /** Quantas linhas o disparo produziu — destinatários vezes canais. */
  linhas: number;
}

/**
 * O fuso da casa, e ele não é detalhe.
 *
 * A borda monta a chave de idempotência com o dia em `America/Cuiaba` (o número é
 * +55 65, Mato Grosso, UTC−4). Se o painel calculasse "hoje" em UTC, os dois
 * discordariam entre 20h e 00h locais: a tela liberaria o botão e o banco recusaria.
 * Fixar o fuso aqui é o que mantém tela e banco falando do mesmo dia.
 */
export const FUSO_DA_CASA = 'America/Cuiaba';

/** `AAAA-MM-DD` no fuso da casa. `en-CA` porque devolve exatamente esse formato. */
export function diaLocal(quando: Date | string): string {
  const d = typeof quando === 'string' ? new Date(quando) : quando;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-CA', { timeZone: FUSO_DA_CASA });
}

/**
 * Os três status que significam "o cliente recebeu".
 *
 * `entregue` e `lido` são avanços de `enviado`, não substitutos — a linha guarda os
 * três carimbos. Então basta o `enviado_em` para datar o disparo, e os outros dois
 * só enriquecem o que se sabe depois.
 */
const CHEGOU_AO_CLIENTE = new Set(['enviado', 'entregue', 'lido']);

export function chegouAoCliente(linha: EnvioParaHistorico): boolean {
  return CHEGOU_AO_CLIENTE.has(linha.status);
}

/**
 * A data do disparo de uma linha.
 *
 * `enviado_em` é a referência: é o instante em que a mensagem saiu. Os outros dois
 * existem como reserva para o caso de uma linha ter avançado sem o primeiro carimbo
 * — não deveria acontecer, e se acontecer é melhor mostrar a data que houver do que
 * esconder o disparo do painel.
 */
function dataDoDisparo(linha: EnvioParaHistorico): string | null {
  return linha.enviado_em ?? linha.entregue_em ?? linha.lido_em ?? null;
}

const ORDEM_CANAL: Canal[] = ['email', 'whatsapp', 'sino'];

/**
 * Agrupa as linhas em disparos, do mais recente para o mais antigo.
 *
 * Descarta o que não chegou ao cliente e o que não tem data — os dois são o mesmo
 * conjunto na prática, e a segunda checagem existe para o painel nunca renderizar
 * uma linha sem quando.
 */
export function montarHistorico(
  linhas: readonly EnvioParaHistorico[],
): DisparoHistorico[] {
  const grupos = new Map<string, DisparoHistorico>();

  for (const linha of linhas) {
    if (!chegouAoCliente(linha)) continue;
    const quando = dataDoDisparo(linha);
    if (!quando) continue;

    const dia = diaLocal(quando);
    const chave = `${linha.tipo}|${dia}`;
    const grupo = grupos.get(chave);

    if (!grupo) {
      grupos.set(chave, {
        chave, dia, tipo: linha.tipo, quando,
        canais: [linha.canal], porCanal: { [linha.canal]: quando }, linhas: 1,
      });
      continue;
    }

    grupo.linhas += 1;
    const anterior = grupo.porCanal[linha.canal];
    if (!anterior || quando < anterior) grupo.porCanal[linha.canal] = quando;
    // O instante do disparo é o do PRIMEIRO envio do grupo: os outros saíram em
    // sequência, milissegundos depois, e mostrar o último daria a impressão de
    // que o analista clicou mais tarde do que clicou.
    if (quando < grupo.quando) grupo.quando = quando;
    if (!grupo.canais.includes(linha.canal)) grupo.canais.push(linha.canal);
  }

  for (const grupo of grupos.values()) {
    grupo.canais.sort((a, b) => ORDEM_CANAL.indexOf(a) - ORDEM_CANAL.indexOf(b));
  }

  return [...grupos.values()].sort((a, b) => b.quando.localeCompare(a.quando));
}

/** O disparo de hoje deste aviso, se houve. Serve ao painel e ao aviso na tela. */
export function disparoDeHoje(
  historico: readonly DisparoHistorico[],
  tipo: string,
  agora: Date | string = new Date(),
): DisparoHistorico | null {
  const hoje = diaLocal(agora);
  return historico.find((d) => d.tipo === tipo && d.dia === hoje) ?? null;
}

/**
 * Quais canais já saíram hoje, e quando.
 *
 * O BLOQUEIO É POR CANAL, decidido em 17/08/2026. A tela travava o aviso inteiro, e
 * estava errado: se o analista manda e-mail e só depois percebe que esqueceu o
 * WhatsApp, ele tem de conseguir mandar o WhatsApp em seguida — é mais provável que
 * o caso que eu estava protegendo, que era dois analistas avisando o mesmo cliente.
 *
 * A borda já funciona assim sem mudança: a chave de idempotência inclui o canal,
 * então a segunda chamada reserva o WhatsApp normalmente e recusa apenas o e-mail.
 * O que estava fora de lugar era só a regra da tela.
 */
export function canaisEnviadosHoje(
  historico: readonly DisparoHistorico[],
  tipo: string,
  agora: Date | string = new Date(),
): Partial<Record<Canal, string>> {
  return disparoDeHoje(historico, tipo, agora)?.porCanal ?? {};
}

/** Rótulo do aviso para o painel. Os nomes de enum não servem para leitura. */
export const AVISO_LABEL: Record<string, string> = {
  solicitacao_enviada: 'Solicitação enviada',
  cobranca_pendencia: 'Status da documentação',
  documento_aprovado: 'Documentação conferida',
  // Ficam porque podem existir linhas antigas com esses tipos, e o painel não pode
  // mostrar o valor cru do enum se topar com uma.
  documento_recusado: 'Documentos a reenviar',
  documento_recebido: 'Documento recebido',
};

export function rotuloDoAviso(tipo: string): string {
  return AVISO_LABEL[tipo] ?? tipo;
}

const CANAL_LABEL: Record<string, string> = {
  email: 'e-mail',
  whatsapp: 'WhatsApp',
  sino: 'sino',
};

/** "e-mail e WhatsApp", "e-mail". Vírgula com `e` antes do último, como nos textos. */
export function rotuloDosCanais(canais: readonly Canal[]): string {
  const nomes = canais.map((c) => CANAL_LABEL[c] ?? c);
  if (nomes.length === 0) return '';
  if (nomes.length === 1) return nomes[0];
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
}

/** `AAAA-MM-DD` → `17/08/2026`. O dia já vem no fuso da casa de `diaLocal`. */
export function formatarDia(dia: string): string {
  const [ano, mes, d] = dia.split('-');
  if (!ano || !mes || !d) return '';
  return `${d}/${mes}/${ano}`;
}

/**
 * O dia seguinte, para dizer ao analista a partir de quando ele pode avisar.
 *
 * Soma em cima do MEIO-DIA UTC do dia recebido, não da meia-noite: em UTC−4, a
 * meia-noite de `AAAA-MM-DD` é 20h do dia anterior, e a soma escorregaria um dia.
 * Do meio-dia, nenhum fuso habitado chega perto da virada.
 */
export function diaSeguinte(dia: string): string {
  const d = new Date(`${dia}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** `17/08/2026 às 14:32`, no fuso da casa. */
export function formatarQuando(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const data = d.toLocaleDateString('pt-BR', { timeZone: FUSO_DA_CASA });
  const hora = d.toLocaleTimeString('pt-BR', {
    timeZone: FUSO_DA_CASA, hour: '2-digit', minute: '2-digit',
  });
  return `${data} às ${hora}`;
}
