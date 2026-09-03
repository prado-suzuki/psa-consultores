import type { RegistroFamilias } from './familia';
import { expandirInclusoes, extrairEstrutura } from './render';
import { campoDaEntidade, ENTIDADES, type TipoCampo, type TipoEntidade } from './vocabulario';

// Modelo de binding: cada placeholder é `<binding>.<campo>`. O binding é um papel
// (proprietario, imovel, socio2…) que resolve para um TIPO de entidade. Na geração,
// o consultor liga cada binding a um registro real do cliente.
//
// Cardinalidade 'lista': papéis PLURAIS ({{#socios}}…{{/socios}}) iteram sobre uma
// FONTE relacional (quadro societário/administracao) da empresa escolhida: o
// consultor liga a empresa, não cada pessoa. Dentro da seção, os campos do item
// usam a chave singular ({{ socio.nome }}) mais os extras da relação
// ({{ socio.quotas }}) e as condicionais {{#sePF}}/{{#sePJ}}.

export type Cardinalidade = 'um' | 'lista';

export interface Binding {
  /** Nome do papel usado no template (ex.: "proprietario", "imovel", "socio2"). */
  nome: string;
  tipo: TipoEntidade;
  cardinalidade: Cardinalidade;
}

export interface Papel {
  tipo: TipoEntidade;
  label: string;
}

// Papéis conhecidos → tipo de entidade. Só um mapa; trivial de estender.
export const PAPEIS: Record<string, Papel> = {
  proprietario: { tipo: 'pessoa', label: 'Proprietário' },
  socio: { tipo: 'pessoa', label: 'Sócio' },
  conjuge: { tipo: 'pessoa', label: 'Cônjuge' },
  outorgante: { tipo: 'pessoa', label: 'Outorgante' },
  outorgado: { tipo: 'pessoa', label: 'Outorgado' },
  doador: { tipo: 'pessoa', label: 'Doador' },
  donatario: { tipo: 'pessoa', label: 'Donatário' },
  administrador: { tipo: 'pessoa', label: 'Administrador' },
  pessoa: { tipo: 'pessoa', label: 'Pessoa' },
  sociedade: { tipo: 'sociedade', label: 'Sociedade' },
  imovel: { tipo: 'matricula', label: 'Imóvel' },
  matricula: { tipo: 'matricula', label: 'Matrícula' },
  bem: { tipo: 'bem', label: 'Bem' },
  cartorio: { tipo: 'cartorio', label: 'Cartório' },
  // Cabeçalho do instrumento agrário (cadastro de exploração rural). Papel
  // unitário como `sociedade`: vale para o contrato inteiro, não para uma parte.
  instrumento: { tipo: 'instrumento', label: 'Instrumento (exploração rural)' },
};

// Contratos societários anteriores ao binding namespaced usam campos planos ou
// chamam a sociedade pelo papel concreto (controlada/controladora). O cadastro,
// porém, expõe a PJ objeto do documento sob o binding único `sociedade`.
const REFERENCIAS_LEGADAS: Record<string, string> = {
  razaoSocial: 'sociedade.razaoSocial',
  sedeEndereco: 'sociedade.sedeEndereco',
  sedeMunicipio: 'sociedade.sedeMunicipio',
  sedeUf: 'sociedade.sedeUfExtenso',
  sedeCep: 'sociedade.sedeCep',
  objetoSocial: 'sociedade.objeto',
  capitalValor: 'sociedade.capitalValor',
  capitalExtenso: 'sociedade.capitalExtenso',
  totalQuotas: 'sociedade.totalQuotas',
  totalQuotasExtenso: 'sociedade.totalQuotasExtenso',
  regimeCasamento: 'conjuge.regimeBens',
  foroComarca: 'sociedade.sedeMunicipio',
  foroUf: 'sociedade.sedeUfExtenso',
  'sociedade.nome': 'sociedade.razaoSocial',
  'sociedade.denominacao': 'sociedade.razaoSocial',
  'sociedade.cpfCnpj': 'sociedade.cnpj',
  'sociedade.objetoSocial': 'sociedade.objeto',
  'sociedade.juntaComercialUf': 'sociedade.juntaUf',
  'sociedade.capitalSocial': 'sociedade.capitalValor',
  'sociedade.capitalSocialExtenso': 'sociedade.capitalExtenso',
  'sociedade.foroComarca': 'sociedade.sedeMunicipio',
  'sociedade.foroUf': 'sociedade.sedeUfExtenso',
};

const FORO_FECHO = /\{\{\s*(?:(?:controlada|controladora|sociedade)\.)?foroComarca\s*\}\}(\s*\/\s*)\{\{\s*(?:(?:controlada|controladora|sociedade)\.)?foroUf\s*\}\}/g;

function normalizarCaminhoLegado(caminho: string): string {
  const [raiz, ...resto] = caminho.split('.');
  const raizCanonica = raiz === 'controlada' || raiz === 'controladora' ? 'sociedade' : raiz;
  const comRaizCanonica = [raizCanonica, ...resto].join('.');
  return REFERENCIAS_LEGADAS[comRaizCanonica] ?? REFERENCIAS_LEGADAS[caminho] ?? comRaizCanonica;
}

/**
 * Converte referências persistidas pelos dois contratos societários para o
 * vocabulário atual. Preserva espaços, atributos de seção e fechamentos; só o
 * caminho dentro de cada token é alterado.
 */
export function normalizarReferenciasLegadas(conteudo: string): string {
  // No corpo, foroUf é o Estado por extenso; no fecho Cidade/UF, é a sigla.
  const comForoDoFecho = conteudo.replace(
    FORO_FECHO,
    '{{ sociedade.sedeMunicipio }}$1{{ sociedade.sedeUf }}',
  );
  return comForoDoFecho.replace(
    /(\{\{\s*[#/]?\s*)([\w.]+)/g,
    (_token, prefixo: string, caminho: string) => {
      const secaoRaizSociedade =
        /[#/]\s*$/.test(prefixo) && (caminho === 'controlada' || caminho === 'controladora');
      return `${prefixo}${secaoRaizSociedade ? 'sociedade.razaoSocial' : normalizarCaminhoLegado(caminho)}`;
    },
  );
}

/**
 * Rascunhos anteriores guardavam os aliases como `valoresLivres`. Copia esses
 * valores para os bindings canônicos sem sobrescrever dados já normalizados.
 */
export function normalizarSelecaoLegada(
  selecao: Record<string, Record<string, string>>,
  valoresLivres: Record<string, string>,
): Record<string, Record<string, string>> {
  const normalizada = Object.fromEntries(
    Object.entries(selecao).map(([binding, campos]) => [binding, { ...campos }]),
  );
  const atribuir = (caminho: string, valor: string) => {
    const [binding, campo, ...resto] = caminho.split('.');
    if (!campo || resto.length > 0 || (binding !== 'sociedade' && binding !== 'conjuge')) return;
    normalizada[binding] = normalizada[binding] ?? {};
    if (!normalizada[binding][campo]) normalizada[binding][campo] = valor;
  };

  for (const [binding, campos] of Object.entries(selecao)) {
    for (const [campo, valor] of Object.entries(campos)) {
      const caminho = `${binding}.${campo}`;
      const canonico = normalizarCaminhoLegado(caminho);
      if (canonico === caminho) continue;
      atribuir(canonico, valor);
      delete normalizada[binding]?.[campo];
      if (Object.keys(normalizada[binding] ?? {}).length === 0) delete normalizada[binding];
    }
  }

  for (const [caminho, valor] of Object.entries(valoresLivres)) {
    const canonico = normalizarCaminhoLegado(caminho);
    if (canonico !== caminho) atribuir(canonico, valor);
    // O alias antigo servia tanto ao Estado por extenso quanto ao fecho Cidade/UF.
    if (caminho === 'foroUf' || /^(controlada|controladora|sociedade)\.foroUf$/.test(caminho)) {
      atribuir('sociedade.sedeUf', valor);
    }
  }
  return normalizada;
}

// --- Papéis de lista (seções de repetição) -----------------------------------

/**
 * Fonte de uma lista:
 * - `quadro`, `administracao`, `integralizacao`: relações da empresa (PJ)
 *   escolhida, e o consultor liga a empresa, não cada item. `quadro` é o quadro
 *   societário, lido da view v_quadro_societario (o acumulado dos movimentos de
 *   quota), não de uma tabela homônima;
 * - `signatarios`: derivada dessas relações (quem assina o documento);
 * - `georef`: BigQuery, pela matrícula selecionada (não depende da empresa);
 * - `selecao`: registros que o consultor escolhe a dedo na tela Gerar (também
 *   não depende da empresa — ver `usaListas` em useGerarDocumentoController);
 * - `exploracao_rural`: as partes, os imóveis e as origens da posse de UMA linha
 *   de `exploracao_rural`. Diferente das demais, a lista inteira sai de um só
 *   cadastro — não há o que o consultor amarrar registro a registro, e é por
 *   isso que ela é fonte própria em vez de `selecao`.
 */
export type FonteLista =
  | 'quadro' | 'administracao' | 'integralizacao' | 'georef' | 'signatarios' | 'selecao'
  | 'exploracao_rural';

export interface CampoExtra {
  id: string;
  label: string;
}

export interface PapelLista {
  label: string;
  /** Tipo de entidade de cada item (campos do vocabulário). */
  tipo: TipoEntidade;
  /** Chave singular do item dentro da seção ({{ socio.nome }} em {{#socios}}). */
  itemKey: string;
  /** Chaves adicionais de escopo do item (listas aninhadas: {{ imovel.* }} em {{#imoveis}}). */
  itemKeysExtras?: string[];
  /** Seções conhecidas dentro do item (listas aninhadas e condicionais próprias). */
  secoesItem?: string[];
  fonte: FonteLista;
  /** Campos da RELAÇÃO (não da pessoa), mesclados ao item pelo mapeador. */
  camposExtras: CampoExtra[];
}

export const PAPEIS_LISTA: Record<string, PapelLista> = {
  socios: {
    label: 'Sócios (Quadro Societário)',
    tipo: 'pessoa',
    itemKey: 'socio',
    fonte: 'quadro',
    camposExtras: [
      { id: 'quotas', label: 'Quotas' },
      { id: 'quotasExtenso', label: 'Quotas (por extenso)' },
      { id: 'vlrTotal', label: 'Valor total das quotas (R$)' },
      { id: 'vlrTotalExtenso', label: 'Valor total (por extenso)' },
      { id: 'percentual', label: 'Participação societária (%)' },
      { id: 'representante', label: 'Representante (sócia PJ)' },
      { id: 'ordem', label: 'Ordem do sócio no quadro (1, 2…)' },
      { id: 'ordemRomana', label: 'Ordem em romano minúsculo (i, ii…)' },
      { id: 'administrador', label: 'É administrador? (condicional)' },
      { id: 'naoAdministrador', label: 'NÃO é administrador? (condicional, o engine não tem else)' },
    ],
  },
  administradores: {
    label: 'Administradores (Administração)',
    tipo: 'pessoa',
    itemKey: 'administrador',
    fonte: 'administracao',
    camposExtras: [{ id: 'cargo', label: 'Cargo' }],
  },
  signatarios: {
    label: 'Signatários',
    tipo: 'pessoa',
    itemKey: 'signatario',
    fonte: 'signatarios',
    camposExtras: [
      { id: 'nome', label: 'Nome' },
      { id: 'nomeMaiusculo', label: 'Nome em caixa alta' },
      { id: 'papel', label: 'Papel na assinatura' },
      { id: 'cpfCnpj', label: 'CPF/CNPJ' },
      { id: 'qualificacao', label: 'Qualificação complementar' },
      { id: 'eSocio', label: 'É sócio? (condicional)' },
      { id: 'eRetirante', label: 'É sócio retirante? (condicional)' },
      { id: 'eAdministrador', label: 'É administrador? (condicional)' },
      { id: 'eConjuge', label: 'É cônjuge outorgante? (condicional)' },
      { id: 'eTestemunha', label: 'É testemunha? (condicional)' },
      { id: 'eAdvogado', label: 'É advogado? (condicional)' },
      { id: 'eOutorgante', label: 'É parceiro outorgante? (condicional)' },
      { id: 'eOutorgado', label: 'É parceiro outorgado? (condicional)' },
      { id: 'eCompossuidor', label: 'É compossuidor rural? (condicional)' },
    ],
  },
  imoveis: {
    label: 'Imóveis selecionados',
    tipo: 'matricula',
    itemKey: 'imovel',
    fonte: 'selecao',
    camposExtras: [],
  },
  // Pessoas escolhidas a dedo pelo consultor, sem passar por nenhuma relação da
  // empresa: é o contrato rural que qualifica a PJ outorgante e várias pessoas
  // físicas que não são sócias nem administradoras dela (outorgado, compossuidor,
  // donatário, testemunha nominada). Um bloco só, uma seção de repetição — e a
  // ORDEM dos itens é do resolvedor (quotas ↓, depois alfabética; ver
  // mapearPartesSelecionadas), não da sequência em que o consultor clicou.
  partes: {
    label: 'Partes (seleção manual)',
    tipo: 'pessoa',
    itemKey: 'parte',
    fonte: 'selecao',
    camposExtras: [
      { id: 'ordem', label: 'Ordem da parte na lista (1, 2…)' },
      { id: 'ordemRomana', label: 'Ordem em romano minúsculo (i, ii…)' },
    ],
  },
  integralizacoes: {
    label: 'Integralizações (aportes por sócio)',
    tipo: 'pessoa',
    // refItem: o item da 1ª descrição do imóvel (referência cruzada) — o campo
    // {{ refItem.ref }} recebe o carimbo de numeração da composição.
    // aporte/origem: a alínea MISTA ({{#aportes}}), que aceita as três formas de
    // integralizar — imóvel, moeda corrente e quotas de outra sociedade (esta
    // última qualificada por inteiro em {{ origem.* }}).
    itemKey: 'socio',
    itemKeysExtras: ['imovel', 'refItem', 'aporte', 'origem'],
    secoesItem: [
      'imoveis', 'completa', 'referencia',
      'aportes', 'seImovel', 'seMoeda', 'seQuotas',
    ],
    fonte: 'integralizacao',
    camposExtras: [
      { id: 'ordem', label: 'Ordem do sócio na integralização (1, 2…)' },
      { id: 'ordemRomana', label: 'Ordem em romano minúsculo (i, ii…)' },
    ],
  },
  // Cessões de quotas do livro de movimentos: uma por item, com as DUAS pontas
  // qualificadas. A resolução de cessão publicava só o quadro resultante, o que
  // dizia o efeito sem dizer o ato; aqui ela nomeia cedente, cessionário e
  // quantidade, como no instrumento registrado.
  cessoes: {
    label: 'Cessões de quotas',
    tipo: 'pessoa',
    itemKey: 'cedente',
    itemKeysExtras: ['cessionario', 'cessao'],
    secoesItem: [
      'seCessao', 'seDoacao',
      'cedentePF', 'cedentePJ', 'cessionarioPF', 'cessionarioPJ',
    ],
    fonte: 'quadro',
    camposExtras: [],
  },
  // Os sócios que SAEM nesta alteração. Deriva do mesmo par que as cessões (o
  // livro + o quadro resultante), então a fonte é 'quadro': quem cedeu a
  // totalidade das quotas não sobra em {{#socios}}, e sem uma lista própria a
  // cláusula de retirada não teria como nomeá-los.
  retirantes: {
    label: 'Sócios retirantes (cederam a totalidade)',
    tipo: 'pessoa',
    itemKey: 'retirante',
    fonte: 'quadro',
    camposExtras: [
      { id: 'ordem', label: 'Ordem do retirante (1, 2…)' },
      { id: 'ordemRomana', label: 'Ordem em romano minúsculo (i, ii…)' },
    ],
  },
  // Os imóveis DO DOCUMENTO que têm georreferenciamento, um item por matrícula
  // certificada — a coleção do bloco repetidor do memorial SIGEF. Quem entra não
  // é um imóvel escolhido à parte: são as matrículas que o documento já descreve
  // (alíneas de {{#integralizacoes}}, {{#imoveis}} e bindings unitários), e só as
  // que o SIGEF tem. Nenhuma certificada ⇒ coleção vazia ⇒ o bloco sai da
  // composição, que é o "o memorial só aparece se alguma matrícula tiver georref".
  // Cada item é { imovel: {...campos + georef*}, vertices: [...] }.
  memoriais: {
    label: 'Memoriais de georreferenciamento (imóveis do documento)',
    tipo: 'matricula',
    itemKey: 'imovel',
    secoesItem: ['vertices'],
    fonte: 'georef',
    camposExtras: [],
  },
  // Vértices do memorial descritivo (georreferenciamento). Diferente das demais
  // listas, a fonte é o BigQuery pela matrícula selecionada (fonte 'georef'), não
  // a empresa. Cada item é { vertice: {...campos} }; o cabeçalho (área/perímetro/
  // sistema/certificação) entra nos campos georef* do binding de matrícula.
  vertices: {
    label: 'Vértices (Georreferenciamento)',
    tipo: 'vertice',
    itemKey: 'vertice',
    fonte: 'georef',
    camposExtras: [],
  },
  // --- Instrumentos agrários --------------------------------------------------
  //
  // Todas saem da MESMA linha de `exploracao_rural`, e por isso compartilham a
  // fonte. Pessoa e matrícula continuam sendo pessoa e matrícula: o que muda de
  // uma lista para a outra é o PAPEL e os campos da RELAÇÃO (a fração do
  // compossuidor, a área cedida do imóvel), que é exatamente o que `camposExtras`
  // existe para dizer.
  exploradores: {
    label: 'Parceiros outorgados (exploração rural)',
    tipo: 'pessoa',
    itemKey: 'explorador',
    fonte: 'exploracao_rural',
    camposExtras: [
      { id: 'ordem', label: 'Ordem do outorgado (1, 2…)' },
      { id: 'ordemRomana', label: 'Ordem em romano minúsculo (i, ii…)' },
    ],
  },
  compossuidores: {
    label: 'Compossuidores rurais',
    tipo: 'pessoa',
    itemKey: 'compossuidor',
    fonte: 'exploracao_rural',
    camposExtras: [
      // A fração é campo da RELAÇÃO, não da pessoa: a mesma pessoa tem frações
      // diferentes em composses diferentes.
      { id: 'fracao', label: 'Fração na composse (%)' },
      { id: 'fracaoExtenso', label: 'Fração na composse (por extenso)' },
      { id: 'ordem', label: 'Ordem do compossuidor (1, 2…)' },
      { id: 'ordemRomana', label: 'Ordem em romano minúsculo (i, ii…)' },
    ],
  },
  administradoresNomeados: {
    label: 'Administradores nomeados da composse',
    tipo: 'pessoa',
    itemKey: 'adminNomeado',
    fonte: 'exploracao_rural',
    camposExtras: [],
  },
  // Os imóveis do ANEXO ÚNICO, na ordem em que o contrato os alinea. A alínea e a
  // área cedida são da relação: a área da matrícula é uma, a cedida NESTE
  // instrumento é outra, e confundi-las cede terra que o contrato não cede.
  //
  // `secoesItem: ['vertices']` porque a alínea do Anexo da parceria termina nos
  // *Elementos do Perímetro* — o mesmo de-para/azimute/distância/confrontação do
  // memorial SIGEF, aqui embutido na descrição de cada imóvel em vez de numa
  // tabela apartada. É a mesma coleção com outra apresentação: declarar uma
  // segunda faria os dois documentos divergirem sobre o mesmo dado.
  imoveisDoAnexo: {
    label: 'Imóveis do Anexo Único (exploração rural)',
    tipo: 'matricula',
    itemKey: 'imovel',
    secoesItem: ['vertices'],
    fonte: 'exploracao_rural',
    camposExtras: [
      { id: 'alinea', label: 'Alínea do imóvel no Anexo (a, b, c…)' },
      { id: 'areaCedida', label: 'Área cedida neste instrumento' },
      { id: 'areaCedidaExtenso', label: 'Área cedida (por extenso)' },
    ],
  },
  // O Considerando V: de onde vem a posse de cada grupo de imóveis. O outorgante
  // da origem entra como `pessoa` no escopo do item ({{ outorgante.qualificacao }}
  // dentro do laço), pelo mesmo mapeador que qualifica qualquer outra — e não por
  // um segundo escritor de qualificação, que é como o mesmo CNPJ passaria a ter
  // duas redações no mesmo contrato.
  origensDaPosse: {
    label: 'Origens da posse (Considerando V)',
    tipo: 'origemPosse',
    itemKey: 'origemPosse',
    itemKeysExtras: ['outorgante'],
    fonte: 'exploracao_rural',
    camposExtras: [],
  },
};

/** Condicionais de item conhecidas dentro de seções de lista. */
export const CONDICIONAIS_ITEM = ['sePF', 'sePJ'] as const;

/**
 * Placeholders de REFERÊNCIA de numeração, resolvidos pela própria composição
 * (carimbo {{ ref }} nos itens de repetidor; {{ refs.<ancora> }} global) — nunca
 * viram binding nem campo de texto livre na tela Gerar.
 */
function ehReferenciaDeNumeracao(ph: string): boolean {
  return ph === 'ref' || ph === 'refs' || ph.startsWith('refs.') || ph === 'refItem.ref';
}

/**
 * Conteúdo de um bloco como a detecção deve enxergá-lo: bloco repetidor é
 * tratado como se o conteúdo estivesse dentro da própria seção
 * ({{#colecao}}…{{/colecao}}) — os campos do item ({{ socio.nome }}…) ficam no
 * escopo da lista em vez de virarem bindings unitários, e a coleção entra como
 * lista a carregar.
 */
export function conteudoParaDeteccao(
  bloco: { conteudo: string; repeteColecao?: string },
  familias: RegistroFamilias = {},
): string {
  // Inclusão de família entra como a UNIÃO das variantes, no lugar do token: o
  // render escolhe uma, mas a tela Gerar precisa pedir os campos de todas (senão
  // o endereço urbano nunca é solicitado quando o modelo só cita a família).
  // Família ausente do registro não é tratada aqui: o token fica como está e o
  // render é quem acusa, com a mensagem que nomeia as disponíveis.
  const conteudo = expandirInclusoes(bloco.conteudo, (nome) => {
    const variantes = familias[nome];
    return variantes?.length ? variantes.map((v) => v.conteudo).join(' ') : null;
  });
  return bloco.repeteColecao
    ? `{{#${bloco.repeteColecao}}}${conteudo}{{/${bloco.repeteColecao}}}`
    : conteudo;
}

export interface BindingLista {
  /** Nome plural da seção ({{#socios}}). */
  nome: string;
  papel: PapelLista;
}

/** Remove o sufixo numérico de um nome de binding ("socio2" → "socio"). */
function radicalDoBinding(nome: string): string {
  return nome.replace(/\d+$/, '');
}

/**
 * Resolve o tipo de entidade de um binding: papel exato → radical sem dígitos
 * (socio2→socio) → null (papel desconhecido, sem ambiguidade silenciosa).
 */
export function resolverTipoDoBinding(nome: string): TipoEntidade | null {
  const exato = PAPEIS[nome];
  if (exato) return exato.tipo;
  const radical = radicalDoBinding(nome);
  if (radical !== nome && PAPEIS[radical]) return PAPEIS[radical].tipo;
  return null;
}

/**
 * Seção condicional sobre um campo de binding ({{#imovel.fracionado}}…): o nome
 * é `papel.campo` com papel conhecido e campo existente na entidade. O valor vem
 * do registro mapeado — diferente das seções desconhecidas, que a tela Gerar
 * resolve como '' (o que sobrescreveria o campo derivado dentro do binding).
 */
export function condicionalDeBinding(nome: string): boolean {
  const ponto = nome.indexOf('.');
  if (ponto <= 0) return false;
  const tipo = resolverTipoDoBinding(nome.slice(0, ponto));
  return tipo != null && campoDaEntidade(tipo, nome.slice(ponto + 1)) != null;
}

/** Rótulo legível de um binding ("socio2" → "Sócio 2"; desconhecido → o próprio nome). */
export function labelDoBinding(nome: string): string {
  const papel = PAPEIS[nome] ?? PAPEIS[radicalDoBinding(nome)];
  if (!papel) return nome;
  const sufixo = nome.slice(radicalDoBinding(nome).length);
  return sufixo ? `${papel.label} ${sufixo}` : papel.label;
}

/**
 * A partir dos placeholders de um modelo, detecta os bindings (papel + tipo) e os
 * placeholders desconhecidos: sem ponto (modelos legados) ou com papel não mapeado.
 */
export function detectarBindings(placeholders: string[]): {
  bindings: Binding[];
  desconhecidos: string[];
} {
  const bindings = new Map<string, Binding>();
  const desconhecidos: string[] = [];
  const marcarDesconhecido = (ph: string) => {
    if (!desconhecidos.includes(ph)) desconhecidos.push(ph);
  };

  for (const ph of placeholders) {
    const ponto = ph.indexOf('.');
    if (ponto < 0) {
      marcarDesconhecido(ph);
      continue;
    }
    const nome = ph.slice(0, ponto);
    const tipo = resolverTipoDoBinding(nome);
    if (!tipo) {
      marcarDesconhecido(ph);
      continue;
    }
    if (!bindings.has(nome)) bindings.set(nome, { nome, tipo, cardinalidade: 'um' });
  }

  return { bindings: [...bindings.values()], desconhecidos };
}

export interface DeteccaoConteudo {
  /** Bindings unitários (cardinalidade 'um'), como na detecção legada. */
  bindings: Binding[];
  /** Seções de lista reconhecidas ({{#socios}}, {{#administradores}}). */
  listas: BindingLista[];
  /** Placeholders sem papel mapeado (viram texto livre na tela Gerar). */
  desconhecidos: string[];
  /** Seções cujo nome não é papel de lista nem condicional conhecida. */
  secoesDesconhecidas: string[];
  /** Placeholders que participam dos bindings unitários (form dinâmico da tela Gerar). */
  campos: string[];
}

/**
 * Detecção estrutural: além dos bindings unitários do topo, reconhece as seções
 * de lista. Dentro de uma seção, campos da chave singular do item (socio.nome) e
 * extras da relação pertencem ao ESCOPO do item — não viram binding próprio;
 * campos de outros papéis "vazam" para a detecção de topo (referência ao escopo
 * externo, ex.: {{ razaoSocial }} dentro do loop).
 */
export function detectarBindingsDeConteudo(conteudo: string): DeteccaoConteudo {
  const { camposTopo, secoes } = extrairEstrutura(conteudo);
  const listas: BindingLista[] = [];
  const secoesDesconhecidas: string[] = [];
  const campos = [...camposTopo];

  for (const secao of secoes) {
    const papel = PAPEIS_LISTA[secao.nome];
    if (!papel) {
      if (condicionalDeBinding(secao.nome)) {
        // Papel de lista DENTRO de uma condicional: o bloco que só escreve o
        // memorial quando a matrícula tem georref envolve {{#vertices}} num
        // {{#imovel.georefArea}}. A condicional não é papel, mas a lista aninhada
        // precisa entrar como lista a carregar, senão o contexto não a tem e o
        // render acusa "Seção não resolvida" no que era só um trecho opcional.
        const aninhadas = secao.secoesInternas
          .map((nome) => ({ nome, papel: PAPEIS_LISTA[nome] }))
          .filter((l): l is BindingLista => !!l.papel);
        for (const l of aninhadas) {
          if (!listas.some((x) => x.nome === l.nome)) listas.push(l);
        }
        // Campos do item da lista aninhada ficam no ESCOPO DO ITEM, como ficariam
        // se a lista estivesse no topo: não viram binding nem texto livre.
        const chavesDeItem = aninhadas.flatMap((l) => [l.papel.itemKey, ...(l.papel.itemKeysExtras ?? [])]);
        // O nome da seção entra como campo para registrar o binding mesmo
        // quando o campo só aparece na condicional.
        campos.push(
          secao.nome,
          ...secao.campos.filter((c) => !chavesDeItem.some((k) => c.startsWith(`${k}.`))),
        );
        continue;
      }
      secoesDesconhecidas.push(secao.nome);
      campos.push(...secao.campos);
      continue;
    }
    listas.push({ nome: secao.nome, papel });
    // Campos de listas aninhadas também vivem no item, não no topo. Ex.: cada
    // item de {{#imoveis}} pode carregar seus próprios {{#vertices}}; tratar
    // `vertice.codVertice` como texto livre criaria um formulário fantasma.
    const chavesListasInternas = secao.secoesInternas.flatMap((nome) => {
      const interna = PAPEIS_LISTA[nome];
      return interna ? [interna.itemKey, ...(interna.itemKeysExtras ?? [])] : [];
    });
    const chavesItem = [papel.itemKey, ...(papel.itemKeysExtras ?? []), ...chavesListasInternas];
    // Condicionais internas conhecidas: sePF/sePJ, seções do próprio item
    // (listas aninhadas), condicionais de binding e condicionais sobre campos
    // do escopo do item ({{#socio.vlrTotal}} — inclui extras da relação).
    for (const interna of secao.secoesInternas) {
      if (
        !(CONDICIONAIS_ITEM as readonly string[]).includes(interna) &&
        !PAPEIS_LISTA[interna] &&
        !(papel.secoesItem ?? []).includes(interna) &&
        !chavesItem.some((k) => interna.startsWith(`${k}.`)) &&
        !condicionalDeBinding(interna)
      ) {
        secoesDesconhecidas.push(interna);
      }
    }
    // Campos que não são do item (nem das chaves extras das listas aninhadas)
    // vazam para a detecção de topo.
    for (const campo of secao.campos) {
      if (!chavesItem.some((k) => campo.startsWith(`${k}.`))) campos.push(campo);
    }
  }

  // Referências de numeração ({{ ref }}, {{ refs.* }}) resolvem na composição —
  // não pedem registro nem texto livre, então saem antes da detecção.
  const camposSemRefs = campos.filter((ph) => !ehReferenciaDeNumeracao(ph));
  const { bindings, desconhecidos } = detectarBindings(camposSemRefs);
  return {
    bindings,
    listas,
    desconhecidos,
    secoesDesconhecidas: [...new Set(secoesDesconhecidas)],
    campos: camposSemRefs,
  };
}

export interface PlaceholderSugerido {
  /** Caminho completo que vai dentro de {{ }} (ex.: "proprietario.nome"). */
  placeholder: string;
  /** Rótulo legível ("Proprietário — Nome"). */
  label: string;
  /** Grupo (papel) para agrupar o dropdown. */
  grupo: string;
  tipo: TipoCampo;
  /** Texto completo a inserir quando difere de `{{ placeholder }}` (seções). */
  insercao?: string;
}

/**
 * Catálogo de placeholders namespaced para o autocomplete do editor: o produto
 * cartesiano dos papéis conhecidos pelos campos do tipo de entidade de cada papel,
 * agrupado por papel — mais as seções de lista (esqueleto do loop, campos do item,
 * extras da relação e condicionais PF/PJ).
 */
export function listarPlaceholders(): PlaceholderSugerido[] {
  const out: PlaceholderSugerido[] = [];
  for (const [nome, papel] of Object.entries(PAPEIS)) {
    for (const campo of ENTIDADES[papel.tipo].campos) {
      out.push({
        placeholder: `${nome}.${campo.id}`,
        label: `${papel.label} — ${campo.label}`,
        grupo: papel.label,
        tipo: campo.tipo,
      });
    }
  }
  for (const [nome, papel] of Object.entries(PAPEIS_LISTA)) {
    out.push({
      placeholder: nome,
      label: `${papel.label} — repetição em prosa ("A; B; e C")`,
      grupo: papel.label,
      tipo: 'texto',
      insercao: `{{#${nome} sep="; " fim="; e "}}{{ ${papel.itemKey}.nome }}{{/${nome}}}`,
    });
    out.push({
      placeholder: `${nome}.linhas`,
      label: `${papel.label} — repetição em linhas (um por linha)`,
      grupo: papel.label,
      tipo: 'texto',
      insercao: `{{#${nome}}}{{ ${papel.itemKey}.nome }}{{/${nome}}}`,
    });
    // Campos do item ({{ socio.nome }}…) já são sugeridos pelo papel singular
    // correspondente; aqui entram só os EXTRAS da relação e as condicionais.
    for (const extra of papel.camposExtras) {
      out.push({
        placeholder: `${papel.itemKey}.${extra.id}`,
        label: `${papel.label} — ${extra.label}`,
        grupo: papel.label,
        tipo: 'texto',
      });
    }
  }
  // Específicos da lista de integralizações: alíneas aninhadas, campos de
  // referência cruzada e as condicionais completa/referência. O esqueleto é o
  // CORPO de um bloco parágrafo repetidor (repete por integralizações) — o
  // rótulo "Parágrafo Segundo:" vem da numeração automática, não do texto.
  const grupoInteg = PAPEIS_LISTA.integralizacoes.label;
  out.push({
    placeholder: 'integralizacoes.alineas',
    label: 'Integralizações — corpo do parágrafo repetidor (sócio + alíneas)',
    grupo: grupoInteg,
    tipo: 'texto',
    insercao:
      'O sócio {{ socio.nome }} subscreve e integraliza neste ato:\n' +
      '{{#imoveis sep="\\n"}}{{ imovel.alinea }}) {{#completa}}…descrição completa…{{/completa}}' +
      '{{#referencia}}…referência à alínea "{{ imovel.refAlinea }}" do {{ refItem.ref }}…{{/referencia}}{{/imoveis}}',
  });
  out.push({
    placeholder: 'integralizacoes.aportes',
    label: 'Integralizações — alíneas MISTAS (imóvel, moeda corrente, quotas de outra sociedade)',
    grupo: grupoInteg,
    tipo: 'texto',
    insercao:
      '{{#aportes sep="\n"}}{{ aporte.alinea }}) ' +
      '{{#seImovel}}…descrição do imóvel…{{/seImovel}}' +
      '{{#seMoeda}}em moeda corrente nacional{{/seMoeda}}' +
      '{{#seQuotas}}{{ aporte.quotas }} ({{ aporte.quotasExtenso }}) quotas da sociedade ' +
      '{{ origem.razaoSocial }}{{/seQuotas}}, pelo valor de R$ {{ aporte.valor }} ' +
      '({{ aporte.valorExtenso }}).{{/aportes}}',
  });
  for (const [id, label] of [
    ['imovel.alinea', 'Letra da alínea (a, b…)'],
    ['imovel.refAlinea', 'Alínea da descrição original (referência)'],
    ['refItem.ref', 'Parágrafo da descrição original (referência automática)'],
    ['imovel.refSocio', 'Sócio da descrição original (referência)'],
    ['aporte.alinea', 'Alínea mista — letra (a, b…)'],
    ['aporte.quotas', 'Alínea mista — quotas subscritas por este aporte'],
    ['aporte.quotasExtenso', 'Alínea mista — quotas por extenso'],
    ['aporte.valor', 'Alínea mista — valor do aporte'],
    ['aporte.valorExtenso', 'Alínea mista — valor por extenso'],
    ['origem.razaoSocial', 'Sociedade de origem das quotas — razão social'],
    ['origem.cnpj', 'Sociedade de origem das quotas — CNPJ'],
    ['origem.nire', 'Sociedade de origem das quotas — NIRE'],
    ['origem.sede', 'Sociedade de origem das quotas — sede'],
    ['origem.quotas', 'Quotas entregues da sociedade de origem'],
    ['origem.valor', 'Valor das quotas entregues da sociedade de origem'],
  ] as const) {
    out.push({
      placeholder: id,
      label: `Integralizações — ${label}`,
      grupo: grupoInteg,
      tipo: 'texto',
    });
  }
  // Específicos da lista de cessões: os campos do MOVIMENTO (quantidade e valor)
  // e o esqueleto da cláusula que nomeia as duas pontas.
  const grupoCessoes = PAPEIS_LISTA.cessoes.label;
  out.push({
    placeholder: 'cessoes.clausula',
    label: 'Cessões — corpo da cláusula (cedente, cessionário e quantidade)',
    grupo: grupoCessoes,
    tipo: 'texto',
    insercao:
      '{{#cessoes sep="; " fim="; e "}}{{ cessao.ordemRomana }}) *{{ cedente.nomeMaiusculo }}* ' +
      'cede e transfere {{ cessao.quotas }} ({{ cessao.quotasExtenso }}) quotas, ' +
      'no valor total de R$ {{ cessao.valor }} ({{ cessao.valorExtenso }}), ' +
      'a *{{ cessionario.nomeMaiusculo }}*{{/cessoes}}',
  });
  for (const [id, label] of [
    ['cessao.quotas', 'Quotas cedidas'],
    ['cessao.quotasExtenso', 'Quotas cedidas (por extenso)'],
    ['cessao.valor', 'Valor de capital das quotas cedidas (R$)'],
    ['cessao.valorExtenso', 'Valor por extenso'],
    ['cessao.ordem', 'Ordem da cessão na lista (1, 2…)'],
    ['cessao.ordemRomana', 'Ordem em romano minúsculo (i, ii…)'],
  ] as const) {
    out.push({ placeholder: id, label: `Cessões — ${label}`, grupo: grupoCessoes, tipo: 'texto' });
  }
  // Referências de numeração resolvidas pela composição (ver index.ts).
  out.push({
    placeholder: 'ref',
    label: 'Número deste parágrafo (em bloco repetidor / dentro da lista repetida)',
    grupo: 'Referências',
    tipo: 'texto',
  });
  for (const [cond, label] of [
    ['completa', 'Trecho da 1ª descrição do imóvel (por extenso)'],
    ['referencia', 'Trecho de referência a imóvel já descrito'],
  ] as const) {
    out.push({
      placeholder: cond,
      label: `Integralizações — ${label}`,
      grupo: grupoInteg,
      tipo: 'texto',
      insercao: `{{#${cond}}}{{/${cond}}}`,
    });
  }
  for (const cond of CONDICIONAIS_ITEM) {
    out.push({
      placeholder: cond,
      label: `Trecho só para ${cond === 'sePF' ? 'pessoa física' : 'pessoa jurídica'} (dentro de uma lista)`,
      grupo: 'Condicionais',
      tipo: 'texto',
      insercao: `{{#${cond}}}{{/${cond}}}`,
    });
  }
  return out;
}
