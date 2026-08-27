import { digitosDe, type BaselineDaPeca } from './baselineDaPeca';
import { quadroEm, type MovimentoDoLedger } from './projecaoQuadro';

// Os eventos da alteração contratual, DERIVADOS em vez de perguntados.
//
// O assistente nasceu perguntando "houve aumento de capital?", porque o caminho
// B não guardava a história da sociedade. O ledger guarda: `movimentacao_quotas`
// é um livro de movimentos, e `documento_gerado_id` está documentado no banco
// como "o ato que formalizou o movimento, quando existe". Movimento sem
// documento é evento PENDENTE, e a alteração contratual é a peça que formaliza
// os pendentes. O que não sai do livro (endereço da sede, administração) sai da
// mesma janela de `audit_logs` que a notificação de variável já usa.
//
// O que muda para o consultor: a lista chega montada, cada item com a evidência
// que o sustenta, e ele CONFERE em vez de responder. A gravação continua em
// `projeto_flag_valor` escopo documento, e passa a registrar a confirmação do
// que foi derivado, o que mantém o snapshot auditável e o motor intacto.
//
// DUAS FONTES, e não uma (decisões D2 e D3):
//
//   ESTADO   — "de quanto para quanto", "quem entrou e quem saiu": do SNAPSHOT da
//              peça registrada que esta substitui (ver baselineDaPeca.ts). É o que
//              a peça publicou na junta.
//   MOVIMENTO — "quais lançamentos são novos": do LIVRO, por ausência de
//              `documento_gerado_id`. Não se responde por estado, porque dois
//              aportes de 500 e um de 1.000 produzem o mesmo quadro e a cláusula
//              enumera lançamentos.
//
// Perguntar o estado ao livro era o defeito 3: o contrato social não carimbava
// nada, então o "antes" de toda primeira alteração era o conjunto vazio.

/** Uma linha de `audit_logs` recortada para a derivação. */
export interface MudancaDeCadastro {
  entityType: string;
  entityId: string;
  action: string;
  /** Nomes das colunas que mudaram (chaves de `changed_fields`). */
  campos: string[];
}

/** Um evento derivado, com a prova que o sustenta. */
export interface EventoDerivado {
  /** `tmpl_flag.nome` da flag de evento correspondente. */
  flagNome: string;
  /** A frase que o consultor lê como prova ("de R$ 872.674,00 para R$ …"). */
  evidencia: string;
  /**
   * Movimentos do livro que sustentam o evento. É o que recebe o carimbo de
   * `documento_gerado_id` quando a peça é REGISTRADA na junta (não ao validar:
   * ver a D4), e é o que dá idempotência: evento com documento não reaparece na
   * alteração seguinte.
   */
  movimentoIds: string[];
}

export interface ArgsDaDerivacao {
  /** Todos os movimentos da empresa, formalizados ou não. */
  movimentos: readonly MovimentoDoLedger[];
  empresaPessoaId: string;
  /** `audit_logs` na janela do documento registrado que a peça sucede. */
  mudancas?: readonly MudancaDeCadastro[];
  /** Id da PJ em `pessoa`: é nela que a mudança de endereço da SEDE é logada. */
  pjPessoaId?: string | null;
  /**
   * O ESTADO de antes, lido do snapshot da peça que esta substitui (D2). É o que
   * responde "de quanto para quanto" e "quem entrou e quem saiu" — perguntas que
   * o ledger não sabe responder, porque nele "formalizado" é só um proxy de "já
   * foi contado" (ver baselineDaPeca.ts).
   */
  baseline?: BaselineDaPeca | null;
  /**
   * CPF/CNPJ de cada pessoa do quadro vivo. O snapshot não congela o `pessoa.id`,
   * então o diff de quadro casa por documento, e é aqui que o lado vivo ganha a
   * mesma chave.
   */
  cpfCnpjPorPessoaId?: Readonly<Record<string, string>>;
}

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inteiro = (v: number) => v.toLocaleString('pt-BR');

/** O capital acumulado por um conjunto de movimentos: entradas menos saídas. */
function capitalDe(movs: readonly MovimentoDoLedger[]): number {
  return movs.reduce((soma, m) => {
    const entra = m.destinoPessoaId ? m.valor : 0;
    const sai = m.origemPessoaId ? m.valor : 0;
    return soma + entra - sai;
  }, 0);
}

/**
 * Os eventos que esta alteração contratual tem de contar, na ordem em que as
 * resoluções aparecem no instrumento.
 *
 * Devolve só os eventos com evidência: o que o cadastro não sustenta não entra
 * na lista, e o consultor não precisa desmarcar o que nunca aconteceu. Ele
 * continua podendo desmarcar o que aconteceu mas não quer nesta peça.
 */
export function derivarEventosDaAlteracao(args: ArgsDaDerivacao): EventoDerivado[] {
  const {
    empresaPessoaId,
    mudancas = [],
    pjPessoaId = null,
    baseline = null,
    cpfCnpjPorPessoaId = {},
  } = args;
  const daEmpresa = args.movimentos.filter((m) => m.empresaPessoaId === empresaPessoaId);
  const pendentes = daEmpresa.filter((m) => !m.documentoGeradoId);

  const eventos: EventoDerivado[] = [];

  // 1. Endereço da sede: não sai do livro, sai do cadastro da PJ.
  const doEndereco = mudancas.filter(
    (m) =>
      m.entityType === 'pessoa' &&
      (!pjPessoaId || m.entityId === pjPessoaId) &&
      m.campos.some((c) => c.startsWith('endereco_')),
  );
  if (doEndereco.length > 0) {
    eventos.push({
      flagNome: 'evento_alteracao_endereco',
      evidencia: 'o endereço da sede mudou no cadastro depois do documento registrado',
      movimentoIds: [],
    });
  }

  // 2. Aumento de capital: do capital que a peça anterior PUBLICOU para o de
  //    hoje. Sem baseline (peça que não substitui ninguém, ou snapshot antigo sem
  //    o campo) cai para a projeção dos formalizados, que é o comportamento
  //    antigo — errado na primeira alteração, e o único disponível ali.
  const capitalAntes = baseline?.capitalAnterior
    ?? capitalDe(daEmpresa.filter((m) => m.documentoGeradoId));
  const capitalDepois = capitalDe(daEmpresa);
  if (capitalDepois > capitalAntes) {
    eventos.push({
      flagNome: 'evento_aumento_capital',
      evidencia: `aumento de capital de R$ ${fmt(capitalAntes)} para R$ ${fmt(capitalDepois)}`,
      // O aumento é o efeito dos APORTES pendentes: são eles que a peça
      // formaliza, e a redução (se houver) não é aumento.
      movimentoIds: pendentes.filter((m) => m.tipo === 'aporte').map((m) => m.id),
    });
  }

  // 3. Integralização: os mesmos aportes, olhando COM O QUE foram pagos.
  const aportes = pendentes.filter((m) => m.tipo === 'aporte');
  if (aportes.length > 0) {
    const formas = new Set(aportes.map((m) => m.pagamento.tipo));
    const nomeDaForma: Record<string, string> = {
      bem: 'bens',
      moeda: 'moeda corrente',
      quotas: 'quotas de outra sociedade',
    };
    const comOQue = [...formas].map((f) => nomeDaForma[f] ?? f).join(', ');
    eventos.push({
      flagNome: 'evento_integralizacao',
      evidencia: `${aportes.length} aporte(s) integralizado(s) com ${comOQue}`,
      movimentoIds: aportes.map((m) => m.id),
    });
  }

  // 4. Cessão (ou doação) de quotas.
  const cessoes = pendentes.filter((m) => m.tipo === 'cessao' || m.tipo === 'doacao');
  if (cessoes.length > 0) {
    const quotas = cessoes.reduce((s, m) => s + m.quotas, 0);
    eventos.push({
      flagNome: 'evento_cessao_quotas',
      evidencia: `${cessoes.length} cessão(ões) somando ${inteiro(quotas)} quotas`,
      movimentoIds: cessoes.map((m) => m.id),
    });
  }

  // 5. Entrada e saída de sócio: quem nasce no quadro e quem vai a zero. Sai da
  //    comparação entre o quadro que a peça anterior publicou e a projeção de
  //    hoje, e não de um tipo de movimento: retirada é efeito de uma cessão,
  //    ingresso pode vir tanto de cessão quanto de aporte.
  //
  //    O casamento é por CPF/CNPJ, porque o snapshot não congela o `pessoa.id`.
  //    Baseline inutilizável, ou pessoa do quadro vivo sem documento, NÃO deriva
  //    o evento: o consultor liga na mão. Inventar ingresso é pior que calar.
  const antes = baseline?.cpfCnpjDosSocios ? new Set(baseline.cpfCnpjDosSocios) : null;
  const doQuadroVivo = quadroEm(daEmpresa, empresaPessoaId)
    .map((l) => digitosDe(cpfCnpjPorPessoaId[l.pessoaId]));
  const depois = new Set(doQuadroVivo);
  const comparavel = antes != null && doQuadroVivo.every((cpfCnpj) => !!cpfCnpj) ? antes : null;
  const entraram = comparavel ? [...depois].filter((d) => !comparavel.has(d)) : [];
  const sairam = comparavel ? [...comparavel].filter((d) => !depois.has(d)) : [];
  if (entraram.length > 0 || sairam.length > 0) {
    const partes = [
      entraram.length > 0 ? `${entraram.length} ingresso(s)` : '',
      sairam.length > 0 ? `${sairam.length} retirada(s)` : '',
    ].filter(Boolean);
    eventos.push({
      flagNome: 'evento_mudanca_socios',
      evidencia: `${partes.join(' e ')} no quadro societário`,
      // Os mesmos movimentos que produziram o efeito: carimbá-los duas vezes é
      // inofensivo (o carimbo é idempotente) e evita que a retirada fique sem
      // documento quando a cessão que a causou não entrar na peça.
      movimentoIds: pendentes.map((m) => m.id),
    });
  }

  // 6. Administração: também de fora do livro.
  const daAdministracao = mudancas.filter((m) => m.entityType === 'administracao');
  if (daAdministracao.length > 0) {
    eventos.push({
      flagNome: 'evento_mudanca_administracao',
      evidencia: `${daAdministracao.length} mudança(s) na administração desde o documento registrado`,
      movimentoIds: [],
    });
  }

  return eventos;
}

/**
 * A sociedade fica com UM sócio só depois desta alteração.
 *
 * Consequência que sai de graça da projeção, sem marcação manual: é o caso do
 * consolidado no singular ("Única sócia"), que o vocabulário já sabe escrever.
 */
export function ficaUnipessoal(
  movimentos: readonly MovimentoDoLedger[],
  empresaPessoaId: string,
): boolean {
  return quadroEm(movimentos, empresaPessoaId).length === 1;
}

/**
 * Administradores que NÃO estão no quadro societário depois desta alteração.
 *
 * É o "administrador não sócio" que a 2ª alteração da MMS Agro publica: os dois
 * fundadores cederam tudo à holding e seguiram administrando. Também sai de
 * graça, comparando a administração com a projeção final.
 */
export function administradoresNaoSocios(
  movimentos: readonly MovimentoDoLedger[],
  empresaPessoaId: string,
  administradorPessoaIds: readonly string[],
): string[] {
  const noQuadro = new Set(quadroEm(movimentos, empresaPessoaId).map((l) => l.pessoaId));
  return administradorPessoaIds.filter((id) => !noQuadro.has(id));
}
