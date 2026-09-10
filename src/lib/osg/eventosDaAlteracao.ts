import { digitosDe, type BaselineDaPeca } from '@/lib/osg/baselineDaPeca';
import { quadroEm, type MovimentoDoLedger } from '@/lib/osg/projecaoQuadro';

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
   * CPF/CNPJ do cadastro, apenas para conciliar snapshots legados sem pessoa.id.
   */
  cpfCnpjPorPessoaId?: Readonly<Record<string, string>>;
  /**
   * Ids das pessoas que administram a sociedade. Serve a UMA pergunta que o
   * cadastro não responde: a alteração pode mudar a NATUREZA da administração
   * sem que nenhuma linha de `administracao` mude — é o que acontece quando os
   * sócios-administradores cedem a totalidade das quotas e seguem administrando,
   * agora de fora do quadro.
   */
  administradorPessoaIds?: readonly string[];
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
    administradorPessoaIds = [],
  } = args;
  const daEmpresa = args.movimentos.filter((m) => m.empresaPessoaId === empresaPessoaId);
  const pendentes = daEmpresa.filter((m) => !m.documentoGeradoId);

  const eventos: EventoDerivado[] = [];

  // 1. Endereço da sede: NÃO sai daqui. A janela de audit_logs só diz que
  //    alguém editou `endereco_*` depois do registro, e editar A para B e voltar
  //    a A continuava acendendo o evento. Quem responde é a comparação do
  //    snapshot registrado com o cadastro de hoje, campo a campo
  //    (`analisarAlteracao`, em alteracaoPorEventos.ts), que traz antes/depois e
  //    sabe dizer quando a base não basta. `pjPessoaId` segue no contrato porque
  //    o hook o envia; aqui ele não decide mais nada.
  void pjPessoaId;

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

  // 4. Cessão onerosa de quotas.
  const cessoes = pendentes.filter((m) => m.tipo === 'cessao');
  if (cessoes.length > 0) {
    const quotas = cessoes.reduce((s, m) => s + m.quotas, 0);
    eventos.push({
      flagNome: 'evento_cessao_quotas',
      evidencia: `${cessoes.length} cessão(ões) somando ${inteiro(quotas)} quotas`,
      movimentoIds: cessoes.map((m) => m.id),
    });
  }

  // 5. Doação de quotas. É evento próprio porque o título gratuito pode carregar
  //    origem patrimonial, reserva de usufruto e gravames que a cessão não publica.
  const doacoes = pendentes.filter((m) => m.tipo === 'doacao');
  if (doacoes.length > 0) {
    const quotas = doacoes.reduce((s, m) => s + m.quotas, 0);
    const titulo = doacoes.length === 1 ? 'doação' : 'doações';
    eventos.push({
      flagNome: 'evento_doacao_quotas',
      evidencia: `${doacoes.length} ${titulo} somando ${inteiro(quotas)} quotas`,
      movimentoIds: doacoes.map((m) => m.id),
    });
  }

  // 6. Entrada e saída de sócio: quem nasce no quadro e quem vai a zero. Sai da
  //    comparação entre o quadro que a peça anterior publicou e a projeção de
  //    hoje, e não de um tipo de movimento: retirada é efeito de uma cessão,
  //    ingresso pode vir tanto de cessão quanto de aporte.
  //
  //    Id é identidade; CPF corrigido não é entrada/saída. No legado, só se
  //    concilia o quadro anterior com os formalizados se houver correspondência
  //    completa e unívoca. O diff então usa os IDs do livro, nunca nomes ou uma
  //    diferença de CPF. Sem conciliação, o consultor precisa resolver o legado.
  const quadroVivo = quadroEm(daEmpresa, empresaPessoaId);
  const depois = new Set(quadroVivo.map((l) => l.pessoaId));
  let antes = baseline?.pessoaIdsDosSocios ? new Set(baseline.pessoaIdsDosSocios) : null;
  if (!antes && baseline?.cpfCnpjDosSocios && pendentes.length > 0) {
    const formalizados = quadroEm(daEmpresa.filter((m) => m.documentoGeradoId), empresaPessoaId);
    const documentosAntes = formalizados.map((l) => digitosDe(cpfCnpjPorPessoaId[l.pessoaId]));
    const documentosDepois = quadroVivo.map((l) => digitosDe(cpfCnpjPorPessoaId[l.pessoaId]));
    const publicados = new Set(baseline.cpfCnpjDosSocios);
    const conciliado = documentosAntes.length === publicados.size
      && new Set(documentosAntes).size === documentosAntes.length
      && documentosAntes.every((cpf) => !!cpf && publicados.has(cpf))
      && documentosDepois.every(Boolean)
      && new Set(documentosDepois).size === documentosDepois.length;
    if (conciliado) antes = new Set(formalizados.map((l) => l.pessoaId));
  }
  const entraram = antes ? [...depois].filter((id) => !antes.has(id)) : [];
  const sairam = antes ? [...antes].filter((id) => !depois.has(id)) : [];
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

  // 7. Administração: de fora do livro, por DUAS razões independentes.
  //
  //    (a) o cadastro de `administracao` mudou; e
  //    (b) a retirada acima deixou quem administra FORA do quadro societário.
  //
  //    A (b) existe porque a natureza da administração muda sem que nenhuma linha
  //    de cadastro mude: na 2ª alteração da MMS Agro os dois fundadores cedem tudo
  //    à holding e continuam administrando, e o instrumento tem de dizer que a
  //    sociedade passa a ser administrada por administradores NÃO SÓCIOS. Sem esta
  //    perna o evento não acendia, as cláusulas de administração e de
  //    desimpedimento ficavam fora da peça, e o consolidado saía afirmando
  //    "administrada isoladamente por X e Y" logo abaixo de uma cláusula de
  //    capital que dá 100% das quotas a outra pessoa.
  const daAdministracao = mudancas.filter((m) => m.entityType === 'administracao');
  // A condição é "houve retirada", e ela é lida do ATO e não do baseline: cedente
  // de cessão pendente que não sobrou no quadro projetado. É o mesmo critério que
  // o render usa para montar {{#retirantes}} (`retirantesDaCessao`), e alinhá-los
  // é o que impede a flag de discordar do texto — além de funcionar na PRIMEIRA
  // alteração da sociedade, onde baseline não existe e `sairam` sai vazio.
  const noQuadroFinal = new Set(quadroEm(daEmpresa, empresaPessoaId).map((l) => l.pessoaId));
  const houveRetirada = pendentes.some(
    (m) => (m.tipo === 'cessao' || m.tipo === 'doacao')
      && !!m.origemPessoaId
      && !noQuadroFinal.has(m.origemPessoaId),
  );
  const naoSocios = houveRetirada
    ? administradoresNaoSocios(daEmpresa, empresaPessoaId, administradorPessoaIds)
    : [];
  if (daAdministracao.length > 0 || naoSocios.length > 0) {
    const porCadastro = daAdministracao.length > 0
      ? `${daAdministracao.length} mudança(s) na administração desde o documento registrado`
      : '';
    const porRetirada = naoSocios.length > 0
      ? `${naoSocios.length} administrador(es) passa(m) a administrar sem estar no quadro societário`
      : '';
    eventos.push({
      flagNome: 'evento_mudanca_administracao',
      evidencia: [porCadastro, porRetirada].filter(Boolean).join('; '),
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
