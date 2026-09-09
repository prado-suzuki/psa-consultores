import type { SnapshotDados } from '@/hooks/useDocumentoGerado';
import { mapearRequalificados, type ItemLista } from '@/lib/templates/mapeadores';
import { camposDaEntidade } from '@/lib/templates/vocabulario';
import { aplicarEnderecosDeSocios, FLAG_QUALIFICACAO, FLAG_SEDE, SEDE, type CandidatoAC } from '@/lib/osg/alteracaoPorEventos';

// O ESTADO PROPOSTO da alteração contratual: `base registrada + eventos
// confirmados`. É a regra que separa o que o consultor aprovou do que o cadastro
// simplesmente tem hoje.
//
// O cadastro atual fornece candidatos; ele NÃO alimenta o consolidado
// irrestritamente. Se a sede e a profissão de um sócio mudaram e só a sede foi
// confirmada, a resolução e o consolidado adotam o endereço novo e mantêm a
// qualificação que o instrumento registrado publicou. A profissão fica pendente,
// visível no assistente, até alguém homologar esse evento.
//
// Cada matéria segue UMA regra, declarada aqui e testada:
//
//   sede da sociedade         → viva se `evento_alteracao_endereco` confirmado
//   endereço do sócio PF      → o APROVADO se `evento_alteracao_qualificacao`
//                               confirmado (candidato a candidato, nunca a
//                               qualificação inteira do cadastro)
//   quadro, capital, aportes,
//   cessões, retirantes       → vivos se algum evento de MOVIMENTO confirmado
//   administração             → viva se `evento_mudanca_administracao` confirmado
//   assinaturas               → vivas se movimento OU administração confirmados
//   identificação da PJ       → base; vazio na base é completado do cadastro
//   qualificação das pessoas  → a da base para quem já constava nela, com a
//                               exceção acima: o endereço aprovado prevalece
//   o resto do instrumento    → base (as matérias que a peça não altera)
//
// Nada aqui escreve redação: o resultado é um SnapshotDados, o mesmo contrato
// que o motor já lê, e as resoluções continuam saindo dos blocos da Biblioteca
// pelas flags. Este módulo só decide de onde vem cada valor.

type Campos = Record<string, string>;

/** Eventos cujo efeito está no LIVRO de movimentos (quadro, capital, aportes, cessões). */
export const EVENTOS_DE_MOVIMENTO = [
  'evento_aumento_capital',
  'evento_integralizacao',
  'evento_cessao_quotas',
  'evento_mudanca_socios',
] as const;
export const EVENTO_ADMINISTRACAO = 'evento_mudanca_administracao';
export const EVENTO_QUALIFICACAO = FLAG_QUALIFICACAO;

/** Listas que descrevem o livro de movimentos e o quadro que ele produz. */
const LISTAS_DE_MOVIMENTO = ['socios', 'integralizacoes', 'cessoes', 'retirantes'] as const;
const LISTAS_DE_ADMINISTRACAO = ['administradores'] as const;
/** Os sócios que a resolução de qualificação nomeia: só existem se o evento entrar. */
const LISTAS_DE_QUALIFICACAO = ['requalificados'] as const;
const LISTAS_DE_ASSINATURA = ['signatarios'] as const;
/** Georref não é dado congelável: vem do BigQuery a cada abertura (ver contextoDoDocumento). */
const LISTAS_VIVAS_SEMPRE = ['vertices', 'memoriais'] as const;

/** Campos da sociedade que o MOTOR sintetiza para esta peça, não o cadastro. */
const SINTETIZADOS_DA_PECA = ['numeroAlteracao', 'tituloInstrumento'] as const;
/** Campos de capital: seguem o quadro, logo seguem os eventos de movimento. */
const CAMPOS_DE_CAPITAL = [
  'capitalValor', 'capitalValorExtenso', 'totalQuotas', 'totalQuotasExtenso',
  'capitalAnterior', 'capitalAnteriorExtenso', 'capitalDelta', 'capitalDeltaExtenso',
  'tituloColetivoSocios', 'quotaValorNominal', 'quotaValorNominalExtenso',
] as const;
/**
 * Identificação registral da PJ: não é deliberação, é fato do registro. O
 * contrato de constituição vai à junta SEM CNPJ e NIRE, e a primeira alteração
 * precisa citá-los. Vazio na base é completado do cadastro; divergência entre
 * dois valores preenchidos fica na base e vira pendência.
 */
const IDENTIFICACAO_DA_PJ = ['cnpj', 'nire', 'juntaUf', 'juntaUfExtenso', 'dataConstituicao'] as const;

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export interface ArgsDoEstadoProposto {
  /** `snapshot_dados` do instrumento registrado que a peça substitui. */
  base: SnapshotDados;
  /** A composição viva de hoje, no mesmo contrato. */
  vivo: SnapshotDados;
  /** Nomes das flags de evento confirmadas no assistente. */
  eventosConfirmados: ReadonlySet<string>;
  /** Nomes dos bindings de tipo `sociedade` (a PJ objeto do contrato). */
  bindingsSociedade: readonly string[];
  /** O candidato de sede, quando a sede foi confirmada: os valores exatos conferidos. */
  sede?: CandidatoAC | null;
  /**
   * Os candidatos de endereço de sócio CONFIRMADOS. Um por pessoa: confirmar o
   * evento não adota o cadastro inteiro de ninguém, adota os endereços que o
   * consultor conferiu, um a um.
   */
  enderecosDeSocios?: readonly CandidatoAC[];
  /**
   * Campos que o consultor editou à mão na folha desta peça (`binding.campo`).
   * Edição na folha é ato deliberado sobre ESTA peça, não cadastro: prevalece.
   */
  camposEditados?: ReadonlySet<string>;
}

export interface EstadoProposto {
  estado: SnapshotDados;
  /** O que a composição teve de deixar como estava e o consultor precisa saber. */
  pendencias: string[];
}

function ehPessoa(obj: unknown): obj is Campos {
  return !!obj && typeof obj === 'object' && !Array.isArray(obj)
    && typeof (obj as Campos).id === 'string' && 'tipoPessoa' in (obj as Campos);
}

/** As pessoas que a base conhece, por id, com os campos publicados nela. */
function pessoasDaBase(base: SnapshotDados): Map<string, Campos> {
  const out = new Map<string, Campos>();
  const visitar = (valor: unknown) => {
    if (!valor || typeof valor !== 'object') return;
    if (Array.isArray(valor)) {
      valor.forEach(visitar);
      return;
    }
    if (ehPessoa(valor) && !SEDE.some((k) => k in valor) && !out.has(valor.id)) out.set(valor.id, valor);
    Object.values(valor as Record<string, unknown>).forEach(visitar);
  };
  visitar(base.itensPorLista);
  Object.entries(base.selecao).forEach(([binding, campos]) => {
    if (!base.registroPorBinding[binding] || campos.id === base.empresaId) return;
    if (ehPessoa(campos)) out.set(campos.id, campos);
  });
  return out;
}

const CAMPOS_PESSOA = camposDaEntidade('pessoa').map((c) => c.id);

/**
 * Reescreve, em cada pessoa de uma lista viva, a qualificação publicada na base
 * (campos do vocabulário `pessoa`, base e derivados). Quotas, percentual, ordem
 * e cargo são da lista, não da pessoa, e ficam vivos. Quem não constava na base
 * (ingressante) entra com a qualificação de hoje: não há antes a preservar.
 */
function comQualificacaoDaBase(itens: ItemLista[], pessoas: Map<string, Campos>): ItemLista[] {
  const visitar = (valor: unknown): unknown => {
    if (!valor || typeof valor !== 'object') return valor;
    if (Array.isArray(valor)) return valor.map(visitar);
    const obj = valor as Record<string, unknown>;
    if (ehPessoa(obj) && pessoas.has(obj.id)) {
      const anterior = pessoas.get(obj.id)!;
      const out: Record<string, unknown> = { ...obj };
      for (const campo of CAMPOS_PESSOA) {
        if (campo in anterior) out[campo] = anterior[campo];
      }
      return out;
    }
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, visitar(v)]));
  };
  return visitar(itens) as ItemLista[];
}

/**
 * As pessoas que a resolução de qualificação vai nomear, na ordem do QUADRO.
 *
 * Do estado JÁ COMPOSTO, e não do cadastro: o que a cláusula reproduz é a
 * qualificação aprovada (base + o endereço conferido), a mesma que o consolidado
 * imprime adiante. Buscá-la de novo no cadastro abriria a porta para a resolução
 * e a consolidação divergirem dentro da mesma peça.
 *
 * A ordem é a do quadro societário porque é a ordem em que o instrumento
 * qualifica as partes; quem não está no quadro do estado (o evento de movimento
 * não entrou, e a lista ficou a da base) entra depois, na ordem dos candidatos.
 */
function requalificados(estado: SnapshotDados, candidatos: readonly CandidatoAC[]): Campos[] {
  const alvos = candidatos
    .map((c) => (c.tipo === 'enderecoSocio' ? c.id.slice('enderecoSocio:'.length) : ''))
    .filter(Boolean);
  if (alvos.length === 0) return [];
  const porId = new Map<string, Campos>();
  const visitar = (valor: unknown) => {
    if (!valor || typeof valor !== 'object') return;
    if (Array.isArray(valor)) { valor.forEach(visitar); return; }
    if (ehPessoa(valor) && !SEDE.some((k) => k in valor) && !porId.has(valor.id)) {
      porId.set(valor.id, valor);
    }
    Object.values(valor as Record<string, unknown>).forEach(visitar);
  };
  visitar(estado.itensPorLista.socios);
  visitar(estado.itensPorLista);
  Object.values(estado.selecao).forEach(visitar);
  const restantes = new Set(alvos);
  const emOrdem: Campos[] = [];
  for (const [id, campos] of porId) {
    if (!restantes.delete(id)) continue;
    emOrdem.push(campos);
  }
  return emOrdem;
}

/**
 * Compõe o estado proposto. Pura e determinística: mesma base, mesmo cadastro
 * e mesma seleção produzem o mesmo estado, e a base nunca é modificada.
 */
export function comporEstadoProposto(args: ArgsDoEstadoProposto): EstadoProposto {
  const { base, vivo, eventosConfirmados, bindingsSociedade } = args;
  const editados = args.camposEditados ?? new Set<string>();
  const pendencias: string[] = [];
  const movimento = EVENTOS_DE_MOVIMENTO.some((e) => eventosConfirmados.has(e));
  const administracao = eventosConfirmados.has(EVENTO_ADMINISTRACAO);
  const sedeConfirmada = eventosConfirmados.has(FLAG_SEDE);
  const qualificacaoConfirmada = eventosConfirmados.has(EVENTO_QUALIFICACAO);
  const enderecos = qualificacaoConfirmada ? (args.enderecosDeSocios ?? []) : [];
  const estado = clone(base);
  const vivoCopia = clone(vivo);

  // --- Bindings unitários ---------------------------------------------------
  const sociedade = new Set(bindingsSociedade);
  for (const [binding, camposVivos] of Object.entries(vivoCopia.selecao)) {
    const daBase = estado.selecao[binding];
    if (!daBase) {
      // Binding que o modelo passou a citar depois do registro: não há base,
      // então entra o que há.
      estado.selecao[binding] = camposVivos;
      continue;
    }
    if (!sociedade.has(binding)) {
      // Pessoa/imóvel escolhidos a dedo: a base publicou; o que falta completa.
      for (const [k, v] of Object.entries(camposVivos)) {
        if (!(k in daBase)) daBase[k] = v;
      }
      continue;
    }
    for (const [k, v] of Object.entries(camposVivos)) {
      const editado = editados.has(`${binding}.${k}`);
      if (editado) { daBase[k] = v; continue; }
      if ((SINTETIZADOS_DA_PECA as readonly string[]).includes(k)) { daBase[k] = v; continue; }
      if ((CAMPOS_DE_CAPITAL as readonly string[]).includes(k)) {
        if (movimento) daBase[k] = v;
        continue;
      }
      if ((SEDE as readonly string[]).includes(k) || k === 'sedeUfExtenso') {
        if (sedeConfirmada) daBase[k] = args.sede ? (args.sede.depois[k] ?? v) : v;
        continue;
      }
      if ((IDENTIFICACAO_DA_PJ as readonly string[]).includes(k)) {
        if (!daBase[k]?.trim()) daBase[k] = v;
        else if (v.trim() && daBase[k].trim() !== v.trim()) {
          pendencias.push(`Identificação da sociedade divergente em ${k}: o instrumento registrado diz "${daBase[k]}" e o cadastro "${v}". A peça mantém o registrado.`);
        }
        continue;
      }
      // Modelo evoluiu e passou a citar um campo que a base não tem: completa.
      if (!(k in daBase)) daBase[k] = v;
    }
    if (sedeConfirmada && args.sede) {
      for (const [k, v] of Object.entries(args.sede.depois)) {
        if (v !== null && !editados.has(`${binding}.${k}`)) daBase[k] = v;
      }
    }
  }

  // --- Listas -----------------------------------------------------------------
  const pessoas = pessoasDaBase(base);
  const listasVivas = new Set<string>([...LISTAS_VIVAS_SEMPRE]);
  if (movimento) LISTAS_DE_MOVIMENTO.forEach((l) => listasVivas.add(l));
  if (administracao) LISTAS_DE_ADMINISTRACAO.forEach((l) => listasVivas.add(l));
  if (qualificacaoConfirmada) LISTAS_DE_QUALIFICACAO.forEach((l) => listasVivas.add(l));
  if (movimento || administracao) LISTAS_DE_ASSINATURA.forEach((l) => listasVivas.add(l));
  for (const [nome, itens] of Object.entries(vivoCopia.itensPorLista)) {
    if (listasVivas.has(nome)) {
      estado.itensPorLista[nome] = comQualificacaoDaBase(itens, pessoas);
      continue;
    }
    if (!(nome in estado.itensPorLista)) {
      // Lista que a base não conhecia (modelo evoluiu): entra como está. Listas
      // de movimento e de administração NÃO: sem evento confirmado, a peça não
      // narra nada delas, e vazio é a declaração certa.
      const governada = ([...LISTAS_DE_MOVIMENTO, ...LISTAS_DE_ADMINISTRACAO,
        ...LISTAS_DE_ASSINATURA, ...LISTAS_DE_QUALIFICACAO] as readonly string[]).includes(nome);
      estado.itensPorLista[nome] = governada ? [] : itens;
    }
  }
  // Sem evento de movimento, as cessões e retiradas pendentes ficam de fora
  // MESMO que a base tenha a chave (ela não tem: quem publica cessão é a peça
  // que a formaliza). Explicitar o vazio evita o laço órfão.
  if (!movimento) {
    for (const nome of ['cessoes', 'retirantes']) {
      if (!(nome in estado.itensPorLista)) estado.itensPorLista[nome] = [];
    }
  }
  // Idem para os requalificados: sem o evento, a resolução não nomeia ninguém, e
  // a lista vazia é o que faz o bloco sair da composição por 'lista-vazia'.
  if (!qualificacaoConfirmada && !('requalificados' in estado.itensPorLista)) {
    estado.itensPorLista.requalificados = [];
  }

  // --- Total, valores livres, seleções múltiplas ------------------------------
  estado.total = movimento ? vivoCopia.total : base.total;
  // Valores livres são texto que o consultor digita NESTA peça: o estado nasce
  // com os da base (a tela os semeia dele) e cada edição prevalece.
  estado.valoresLivres = { ...estado.valoresLivres, ...vivoCopia.valoresLivres };
  if (sedeConfirmada && args.sede) {
    for (const binding of sociedade) {
      for (const [k, v] of Object.entries(args.sede.depois)) {
        const caminho = `${binding}.${k}`;
        if (caminho in estado.valoresLivres && v !== null) estado.valoresLivres[caminho] = v;
      }
    }
  }
  for (const [k, v] of Object.entries(vivoCopia.registroPorBinding)) {
    if (!(k in estado.registroPorBinding)) estado.registroPorBinding[k] = v;
  }
  estado.registrosPorLista = { ...(vivoCopia.registrosPorLista ?? {}), ...(base.registrosPorLista ?? {}) };
  estado.empresaId = base.empresaId ?? vivoCopia.empresaId;

  // Por último, e sobre o estado JÁ COMPOSTO: o endereço aprovado tem de vencer
  // tanto a qualificação da base (`comQualificacaoDaBase`, que acabou de
  // reescrever as listas vivas) quanto a lista que ficou congelada na base
  // porque o evento dela não entrou nesta peça. Rodar antes seria escrever num
  // valor que as etapas seguintes sobrescreveriam.
  aplicarEnderecosDeSocios(estado, enderecos);
  if (qualificacaoConfirmada) {
    estado.itensPorLista.requalificados = mapearRequalificados(requalificados(estado, enderecos));
  }

  return { estado, pendencias };
}

/**
 * Dependências entre os eventos confirmados. Devolve as frases do que está
 * incoerente; vazio quando a seleção fecha. Não marca nada escondido: quem
 * resolve é o consultor, no assistente.
 *
 * A regra deste recorte é uma só: "mudança de sócios" é EFEITO de cessão ou
 * aporte, e não fato próprio. Marcar o efeito sem nenhuma causa que o sustente
 * produziria um consolidado com sócio novo e nenhuma resolução que o explique.
 */
export function validarSelecaoDeEventos(
  eventosConfirmados: ReadonlySet<string>,
  movimentosPorEvento: ReadonlyMap<string, readonly string[]>,
): string[] {
  const erros: string[] = [];
  if (eventosConfirmados.has('evento_mudanca_socios')) {
    const doEfeito = new Set(movimentosPorEvento.get('evento_mudanca_socios') ?? []);
    const sustentado = ['evento_cessao_quotas', 'evento_aumento_capital', 'evento_integralizacao']
      .some((causa) => eventosConfirmados.has(causa)
        && (movimentosPorEvento.get(causa) ?? []).some((id) => doEfeito.has(id)));
    if (!sustentado) {
      erros.push('A mudança de sócios é efeito de uma cessão ou de um aporte: marque também o evento que a produziu, ou desmarque a mudança de sócios.');
    }
  }
  return erros;
}
