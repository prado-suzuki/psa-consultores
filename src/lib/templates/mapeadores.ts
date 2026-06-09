import { cardinalExtenso, formatarArea, formatarInteiro, formatarPercentual, formatarValor, valorExtenso } from './extenso';
import { ufPorExtenso } from './concordancia';
import { derivarCampos } from './vocabulario';
import type { Binding, BindingLista } from './binding';
import type { Contexto } from './types';
import type { TipoEntidade } from './vocabulario';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import type { BemRow, CartorioRow } from '@/hooks/useDiagnosticoPatrimonial';

// Mapeadores puros (sem React): convertem uma linha do cadastro nos campos do
// vocabulário da entidade correspondente, já com os derivados (extensos via
// extenso.ts e concordância via concordancia.ts, ambos aplicados por derivarCampos).

type Campos = Record<string, string>;

/** Acumula só valores presentes — campo ausente deixa o placeholder "não resolvido" (falha cedo). */
function coletor() {
  const out: Campos = {};
  const set = (chave: string, valor: unknown) => {
    if (valor !== null && valor !== undefined && valor !== '') out[chave] = String(valor);
  };
  return { out, set };
}

const TIPO_BEM_LABEL: Record<string, string> = {
  IR: 'Imóvel Rural', IB: 'Imóvel Urbano', AP: 'Arrendamento e/ou Parceria',
  PS: 'Participação Societária', OU: 'Outros',
};

/** 'AAAA-MM-DD' (ISO do banco) → 'DD/MM/AAAA', sem passar por Date (evita fuso). */
function formatarDataBR(iso: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso ?? '');
}

/** "s/n", "s/nº", "S.N."… → forma canônica dos contratos; número normal ganha "nº". */
function numeroProsa(numero: string | null): string {
  if (!numero) return '';
  return /^s[/.]?\s*n[ºo°.]*$/i.test(numero.trim()) ? 's/nº' : `nº ${numero}`;
}

/** Prefixa "bairro" salvo quando o valor já é zona/distrito ("zona rural" fica como está). */
function bairroProsa(bairro: string | null): string {
  if (!bairro) return '';
  return /^(zona|distrito|bairro)\b/i.test(bairro.trim()) ? bairro : `bairro ${bairro}`;
}

/**
 * Endereço no formato de prosa dos contratos: "Rua X, nº 119, bairro Centro,
 * no município de Cuiabá, Estado de Mato Grosso, CEP: 78000-000".
 */
function enderecoProsa(row: PessoaRow): string {
  return [
    row.endereco_logradouro,
    numeroProsa(row.endereco_numero),
    row.endereco_complemento,
    bairroProsa(row.endereco_bairro),
    row.endereco_municipio ? `no município de ${row.endereco_municipio}` : '',
    row.endereco_uf ? `Estado de ${ufPorExtenso(row.endereco_uf)}` : '',
    row.endereco_cep ? `CEP: ${row.endereco_cep}` : '',
  ].filter(Boolean).join(', ');
}

export function mapearPessoa(row: PessoaRow): Campos {
  const { out, set } = coletor();
  set('nome', row.denominacao);
  set('tipoPessoa', row.tipo_pessoa);
  set('cpfCnpj', row.cpf_cnpj);
  set('nacionalidade', row.nacionalidade);
  set('estadoCivil', row.estado_civil);
  set('regimeBens', row.regime_bens);
  set('dataNascimento', formatarDataBR(row.data_nascimento));
  set('nire', row.nire);
  set('juntaComercialUf', row.junta_comercial_uf);
  // Profissão é opcional: espólios e PJs (sócias) não têm — resolve em branco
  // em vez de travar a geração; {{#profissao}}…{{/profissao}} segue condicional.
  out.profissao = row.profissao ?? '';
  set('rg', row.documento_identidade_numero);
  set('orgaoExpedidor', [row.documento_identidade_orgao, row.documento_identidade_uf].filter(Boolean).join('/'));
  set('genero', row.genero);

  set('endereco', enderecoProsa(row));

  return derivarCampos('pessoa', out);
}

export function mapearBem(row: BemRow): Campos {
  const { out, set } = coletor();
  set('denominacao', row.denominacao);
  set('referencia', row.referencia_dp);
  set('tipo', row.tipo_bem ? (TIPO_BEM_LABEL[row.tipo_bem] ?? row.tipo_bem) : '');
  if (row.vlr_contabil != null) set('valor', formatarValor(row.vlr_contabil));
  set('ccir', row.ccir_codigo);
  set('inscricaoMunicipal', row.inscricao_municipal);
  return derivarCampos('bem', out);
}

// Linha de matrícula enriquecida com bem + cartório + titulares (achatados sob o
// binding do imóvel), no formato que `useRegistrosPorTipo` monta a partir do JOIN.
export interface MatriculaParaMapear {
  numero: string | null;
  livro: string | null;
  folha: string | null;
  municipio_imovel: string | null;
  uf_imovel: string | null;
  area_documento: number | null;
  area_unidade: string | null;
  vlr_contabil: number | null;
  confrontacoes_texto: string | null;
  descricao_psa_completa: string | null;
  bem: { denominacao: string | null; vlr_contabil: number | null; ccir_codigo: string | null } | null;
  cartorio: { nome_completo: string | null; comarca: string | null; uf: string | null } | null;
  titulares: Array<TitularParaMapear>;
}

// Titular de uma matrícula. `integralizador`/`fracao` vêm da titularidade e só
// importam para a forma fracionada (composse/condomínio); `pessoaId` permite
// deduplicar as duas linhas (posse de fato + de direito) de uma mesma pessoa.
// Todos opcionais: titulares legados (`{ denominacao }`) seguem válidos.
export interface TitularParaMapear {
  denominacao: string | null;
  pessoaId?: string | null;
  integralizador?: boolean;
  fracao?: number | null;
}

/**
 * Deduplica titulares por pessoa — a mesma pessoa pode ter duas linhas de
 * titularidade (posse de fato + de direito) — combinando integralizador (OR) e a
 * primeira fração não nula, na ordem de aparição. Titulares sem pessoaId (dado
 * legado) não são agrupados.
 */
function dedupTitulares(titulares: TitularParaMapear[]): TitularParaMapear[] {
  const porPessoa = new Map<string, TitularParaMapear>();
  const out: TitularParaMapear[] = [];
  for (const t of titulares) {
    if (!t.pessoaId) {
      out.push({ ...t });
      continue;
    }
    const existente = porPessoa.get(t.pessoaId);
    if (existente) {
      existente.integralizador = existente.integralizador || t.integralizador;
      if (existente.fracao == null) existente.fracao = t.fracao;
    } else {
      const novo = { ...t };
      porPessoa.set(t.pessoaId, novo);
      out.push(novo);
    }
  }
  return out;
}

export function mapearMatricula(m: MatriculaParaMapear): Campos {
  const { out, set } = coletor();

  // Área: o gerador trabalha em hectares; converte se a matrícula estiver em m².
  let areaHa = m.area_documento ?? null;
  if (areaHa != null && m.area_unidade === 'm2') areaHa = areaHa / 10000;
  if (areaHa != null) set('area', formatarArea(areaHa));

  const valor = m.vlr_contabil ?? m.bem?.vlr_contabil ?? null;

  // Titularidade: deduplica por pessoa e decide entre forma inteira e fracionada.
  // Fracionada quando há um integralizador com fração definida E outros titulares
  // (o remanescente). Caso contrário, "de propriedade de A, B e C" (integralizador
  // primeiro, se houver).
  const titulares = dedupTitulares(m.titulares);
  const integralizador = titulares.find((t) => t.integralizador) ?? null;
  const outros = integralizador ? titulares.filter((t) => t !== integralizador) : [];
  const fracionado = !!integralizador && integralizador.fracao != null && outros.length > 0;

  set('numero', m.numero);
  set('livro', m.livro);
  set('folha', m.folha);
  set('municipio', m.municipio_imovel);
  set('uf', ufPorExtenso(m.uf_imovel));
  if (valor != null) set('valor', formatarValor(valor));
  set('denominacao', m.bem?.denominacao);
  if (fracionado) {
    set('proprietario', integralizador!.denominacao);
    set('percentual', formatarPercentual(integralizador!.fracao!));
    set('remanescente', outros.map((t) => t.denominacao).filter(Boolean).join(' e '));
  } else {
    const ordenados = integralizador
      ? [integralizador, ...titulares.filter((t) => t !== integralizador)]
      : titulares;
    set('proprietario', ordenados.map((t) => t.denominacao).filter(Boolean).join(' e '));
  }
  set('cartorio', m.cartorio?.nome_completo);
  set('comarca', m.cartorio?.comarca);
  set('ufCartorio', ufPorExtenso(m.cartorio?.uf));
  set('ccir', m.bem?.ccir_codigo);
  set('confrontacoes', m.confrontacoes_texto ?? m.descricao_psa_completa);

  return derivarCampos('matricula', out);
}

export function mapearCartorio(row: CartorioRow): Campos {
  const { out, set } = coletor();
  set('nome', row.nome_completo);
  set('comarca', row.comarca);
  set('uf', ufPorExtenso(row.uf));
  return derivarCampos('cartorio', out);
}

// --- Itens de lista (seções {{#socios}} / {{#administradores}}) ---------------

/**
 * Item de uma lista no contexto do render: a chave singular do papel carrega os
 * campos ({ socio: {...} }) e as condicionais sePF/sePJ ficam no topo do escopo
 * do item, onde as seções {{#sePF}}/{{#sePJ}} as resolvem.
 */
export interface ItemLista {
  [chave: string]: Campos | boolean;
}

/** Linha do quadro societário com a pessoa do sócio juntada (e o representante, se sócia PJ). */
export interface SocioParaMapear {
  pessoa: PessoaRow;
  quotas: number | null;
  vlr_total: number | null;
  /** Nome(s) do(s) administrador(es) da sócia PJ ("neste ato representada por…"). */
  representante: string | null;
}

export function mapearSocio(s: SocioParaMapear): ItemLista {
  const campos = mapearPessoa(s.pessoa);
  if (s.quotas != null) {
    campos.quotas = formatarInteiro(s.quotas);
    campos.quotasExtenso = cardinalExtenso(s.quotas);
  }
  if (s.vlr_total != null) {
    campos.vlrTotal = formatarValor(s.vlr_total);
    campos.vlrTotalExtenso = valorExtenso(s.vlr_total);
  }
  if (s.representante) campos.representante = s.representante;
  // Re-deriva após mesclar os extras da relação: a qualificação da sócia PJ
  // só enxerga o representante ("neste ato representada por…") nesta passada.
  return {
    socio: derivarCampos('pessoa', campos),
    sePF: s.pessoa.tipo_pessoa === 'PF',
    sePJ: s.pessoa.tipo_pessoa === 'PJ',
  };
}

/** Quadro societário mapeado: itens da seção {{#socios}} + a linha de total. */
export interface QuadroSocietarioMapeado {
  itens: ItemLista[];
  /** Agregados para a linha TOTAL ({{ total.quotas }} etc.). Vazio se não há quotas. */
  total: Campos;
}

/**
 * Mapeia o quadro societário inteiro: além dos campos por sócio, calcula o
 * `socio.percentual` (quotas ÷ total de quotas — não vem do banco) e os agregados
 * `total` (quotas, vlrTotal e 100,000%). O percentual precisa da soma, que só
 * existe no nível da lista — por isso não cabe em mapearSocio (um sócio por vez).
 */
export function mapearQuadroSocietario(socios: SocioParaMapear[]): QuadroSocietarioMapeado {
  const totalQuotas = socios.reduce((s, x) => s + (x.quotas ?? 0), 0);
  const totalVlr = socios.reduce((s, x) => s + (x.vlr_total ?? 0), 0);

  const itens = socios.map((s) => {
    const item = mapearSocio(s);
    if (s.quotas != null && totalQuotas > 0) {
      (item.socio as Campos).percentual = formatarPercentual((s.quotas / totalQuotas) * 100);
    }
    return item;
  });

  const total: Campos = {};
  if (totalQuotas > 0) {
    total.quotas = formatarInteiro(totalQuotas);
    total.vlrTotal = formatarValor(totalVlr);
    total.percentual = formatarPercentual(100);
  }
  return { itens, total };
}

/** Linha de administração com a pessoa do administrador juntada. */
export interface AdministradorParaMapear {
  pessoa: PessoaRow;
  cargo: string | null;
}

export function mapearAdministrador(a: AdministradorParaMapear): ItemLista {
  const campos = mapearPessoa(a.pessoa);
  if (a.cargo) campos.cargo = a.cargo;
  return {
    administrador: campos,
    sePF: a.pessoa.tipo_pessoa === 'PF',
    sePJ: a.pessoa.tipo_pessoa === 'PJ',
  };
}

/** Despacha para o mapeador do tipo de entidade do binding. */
export function mapearRegistro(tipo: TipoEntidade, row: unknown): Campos {
  switch (tipo) {
    case 'pessoa':
      return mapearPessoa(row as PessoaRow);
    case 'bem':
      return mapearBem(row as BemRow);
    case 'matricula':
      return mapearMatricula(row as MatriculaParaMapear);
    case 'cartorio':
      return mapearCartorio(row as CartorioRow);
  }
}

/**
 * Monta o contexto aninhado consumido pelo render pontilhado: um sub-objeto por
 * binding (`{ proprietario: {...}, imovel: {...} }`), um array de itens por lista
 * (`{ socios: [...] }`) mais os placeholders soltos (modelos legados) no topo.
 * Bindings sem seleção entram como `{}` e listas sem itens como `[]` para não
 * quebrar a prévia (o render só falha em placeholder usado e não resolvido).
 */
export function montarContexto(
  bindings: Binding[],
  selecao: Record<string, Campos>,
  desconhecidos: Record<string, string> = {},
  listas: Record<string, ItemLista[]> = {},
  bindingsLista: BindingLista[] = [],
): Contexto {
  const ctx: Contexto = {};
  for (const b of bindings) ctx[b.nome] = selecao[b.nome] ?? {};
  for (const bl of bindingsLista) ctx[bl.nome] = listas[bl.nome] ?? [];
  // Desconhecidos podem ter ponto (papel não mapeado): aninha o caminho para
  // casar com a resolução pontilhada do render (ctx.foo.bar), não a chave literal.
  for (const [ph, valor] of Object.entries(desconhecidos)) {
    const partes = ph.split('.');
    let cursor = ctx as Record<string, unknown>;
    for (let i = 0; i < partes.length - 1; i++) {
      const chave = partes[i];
      if (typeof cursor[chave] !== 'object' || cursor[chave] === null) cursor[chave] = {};
      cursor = cursor[chave] as Record<string, unknown>;
    }
    cursor[partes[partes.length - 1]] = valor;
  }
  return ctx;
}
