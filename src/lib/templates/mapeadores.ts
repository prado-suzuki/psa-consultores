import { cardinalExtenso, formatarArea, formatarInteiro, formatarPercentual, formatarValor, letraAlinea, romano, valorExtenso, type UnidadeArea } from './extenso';
import { capitalDeQuotas, quotasDeValor, quotasDoSocio, VALOR_NOMINAL_QUOTA } from './capital';
import { comarcaComplementar, CARTORIO_SEM_NOME, nomeDoCartorio } from './cartorio';
import { marcarSintetizados } from './sintetizado';
import { ufPorExtenso } from './concordancia';
import { comOrigem } from './origem';
import { camposDaEntidade, derivarCampos, numeroProsa } from './vocabulario';
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

/**
 * Tira o ponto final (e o espaço em branco à direita) de um texto longo de
 * cadastro. A pontuação da frase é do MODELO, não do dado: assim o mesmo valor
 * serve tanto no fim do período quanto emendado no meio dele. Só o ponto final
 * sai — reticências e abreviações internas ("n.º") não são tocadas.
 */
function semPontoFinal(texto: string | null): string | null {
  if (!texto) return texto;
  const podado = texto.replace(/\s*\.\s*$/, '');
  return podado === '' ? texto : podado;
}

/** Prefixa "bairro" salvo quando o valor já é zona/distrito ("zona rural" fica como está). */
function bairroProsa(bairro: string | null): string {
  if (!bairro) return '';
  return /^(zona|distrito|bairro)\b/i.test(bairro.trim()) ? bairro : `bairro ${bairro}`;
}

/**
 * Partes que a prosa de endereço consome. Pessoa e sociedade têm todas na própria
 * linha (PessoaRow); o imóvel monta as suas do bem (logradouro…CEP) com o
 * município e a UF da matrícula, que são a fonte única deles.
 */
interface PartesEndereco {
  endereco_logradouro: string | null;
  endereco_numero: string | null;
  endereco_complemento: string | null;
  endereco_bairro: string | null;
  endereco_municipio: string | null;
  endereco_uf: string | null;
  endereco_cep: string | null;
}

/**
 * Endereço no formato de prosa dos contratos: "Rua X, nº 119, bairro Centro,
 * no município de Cuiabá, Estado de Mato Grosso, CEP: 78000-000".
 */
function enderecoProsa(row: PartesEndereco): string {
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

/**
 * Publica como '' todo campo OPCIONAL do catálogo da entidade que o cadastro não
 * trouxe. Campo ausente não é o mesmo que campo vazio para o render: o
 * placeholder ausente derruba a prévia inteira, e a SEÇÃO ausente também
 * ({{#imovel.ccir}} numa matrícula sem CCIR vira "Seção não resolvida", e não um
 * trecho pulado). Como o bloco não tem como saber o que o cadastro tem, quem
 * garante a presença é o mapeador — é o que permite ao autor escrever guarda de
 * trecho ({{#imovel.livro}}…) sem risco. Vale para a profissão que espólio e PJ
 * não têm, para o complemento de endereço que casa não tem, e para livro, folha,
 * comarca, CCIR, UF do cartório e inscrição municipal.
 *
 * Campo marcado como OBRIGATÓRIO fica de fora: ele continua ausente quando o
 * cadastro não o tem, e o placeholder falha cedo em vez de deixar o documento
 * sair mudo no dado que o identifica.
 */
function publicarOpcionais(tipo: TipoEntidade, campos: Campos): Campos {
  for (const campo of camposDaEntidade(tipo)) {
    if (!campo.obrigatorio) campos[campo.id] = campos[campo.id] ?? '';
  }
  return campos;
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
  set('profissao', row.profissao);
  set('rg', row.documento_identidade_numero);
  set('orgaoExpedidor', [row.documento_identidade_orgao, row.documento_identidade_uf].filter(Boolean).join('/'));
  set('genero', row.genero);

  set('endereco', enderecoProsa(row));

  // A origem sobrevive aos spreads a jusante (derivarCampos, mapearSocio,
  // edição manual na Gerar) — é o que liga o valor na prévia ao cadastro.
  return comOrigem(derivarCampos('pessoa', publicarOpcionais('pessoa', out)), { tipo: 'pessoa', id: row.id });
}

/** Capital social e total de quotas da sociedade — calculados, não digitados. */
export interface CapitalSociedade {
  capitalValor: number | null;
  totalQuotas: number | null;
  /**
   * Valor nominal da quota (R$) usado na conta — parâmetro, não constante
   * implícita. `calcularCapitalSociedade` sempre o devolve; é opcional na
   * ENTRADA de `mapearSociedade` porque quem só repassa capital e quotas (a tela
   * Gerar desestrutura os dois) cai no valor nominal da casa, o mesmo da conta.
   */
  quotaValorNominal?: number;
}

/**
 * Calcula capital social e total de quotas conforme o tipo da empresa, SEMPRE
 * coerentes entre si: o capital do contrato é o valor das quotas emitidas
 * (totalQuotas × VALOR_NOMINAL_QUOTA), nunca o somatório cru dos valores
 * contábeis. Era daí que vinha a cláusula quinta afirmando capital de
 * R$ 558.413,55 dividido em 558.414 quotas de R$ 1,00.
 *
 * - PR (Proprietária): as quotas nascem do valor contábil das matrículas
 *   APROVADAS para integralização — quantas quotas aquele valor compra;
 * - Demais (CN/Controladora…): as quotas são as do quadro societário (é o que
 *   está registrado na Junta). Sócio lançado só com valor, sem quotas digitadas,
 *   tem as quotas dele convertidas do valor (ver quotasDoSocio), inclusive no
 *   quadro MISTO: senão ele contribuiria zero para o total enquanto a linha dele
 *   imprime o valor, e a tabela deixaria de fechar com a cláusula.
 *
 * Sem dados, devolve null — os placeholders resolvem em branco e os condicionais
 * {{#sociedade.capitalValor}} pulam o trecho.
 */
export function calcularCapitalSociedade(
  empresa: Pick<PessoaRow, 'tipo_empresa'> | undefined,
  socios: SocioParaMapear[],
  integralizacoes: MatriculaParaMapear[],
): CapitalSociedade {
  const semCapital: CapitalSociedade = {
    capitalValor: null,
    totalQuotas: null,
    quotaValorNominal: VALOR_NOMINAL_QUOTA,
  };
  const deQuotas = (quotas: number): CapitalSociedade => ({
    capitalValor: capitalDeQuotas(quotas),
    totalQuotas: quotas,
    quotaValorNominal: VALOR_NOMINAL_QUOTA,
  });

  if (empresa?.tipo_empresa === 'PR') {
    // MESMA base de calcularParticipacoesPR: a matrícula que fica fora de um
    // lado tem de ficar fora do outro, senão Σ quotas dos sócios ≠ totalQuotas.
    const valores = integralizacoes
      .map(valorParaCapital)
      .filter((v): v is number => v != null);
    if (valores.length === 0) return semCapital;
    return deQuotas(quotasDeValor(valores.reduce((s, v) => s + v, 0)));
  }

  const quotas = socios
    .map((s) => quotasDoSocio(s.quotas, s.vlr_total))
    .filter((q): q is number => q != null);
  if (quotas.length === 0) return semCapital;
  return deQuotas(quotas.reduce((s, q) => s + q, 0));
}

/**
 * O valor contábil que uma matrícula leva ao capital, ou `null` quando ela fica
 * de fora. Sem valor não há o que somar; sem titular não há a quem atribuir as
 * quotas, e o rateio (calcularParticipacoesPR) a pula — as duas contas precisam
 * pular a MESMA matrícula, senão a identidade "Σ quotas dos sócios ===
 * totalQuotas" quebra sem ninguém perceber.
 */
function valorParaCapital(m: MatriculaParaMapear): number | null {
  const vlr = m.vlr_contabil ?? m.bem?.vlr_contabil ?? null;
  if (vlr == null || m.titulares.length === 0) return null;
  return vlr;
}

/**
 * Mapeia a pessoa PJ que é OBJETO do documento (a "Sociedade") para os campos do
 * vocabulário `sociedade`: razão social, CNPJ, NIRE/Junta, objeto e a sede tanto em
 * prosa (`sede`) quanto em partes atômicas. Diferente de `mapearPessoa` (sócios), que
 * monta a QUALIFICAÇÃO da pessoa no preâmbulo; aqui os campos entram avulsos nas
 * cláusulas ("a Sociedade tem sede…", "tem por objeto…"). O capital (calculado por
 * calcularCapitalSociedade) entra como segundo argumento; os extensos derivam.
 */
export function mapearSociedade(row: PessoaRow, capital?: CapitalSociedade): Campos {
  const { out, set } = coletor();
  set('razaoSocial', row.denominacao);
  set('cnpj', row.cpf_cnpj);
  set('nire', row.nire);
  set('juntaUf', row.junta_comercial_uf);
  set('dataConstituicao', formatarDataBR(row.data_constituicao));
  set('objeto', row.objeto_social);
  set('sede', enderecoProsa(row));
  set('sedeEndereco', [row.endereco_logradouro, numeroProsa(row.endereco_numero)].filter(Boolean).join(', '));
  set('sedeBairro', row.endereco_bairro);
  set('sedeMunicipio', row.endereco_municipio);
  set('sedeUf', row.endereco_uf);
  set('sedeCep', row.endereco_cep);
  if (capital?.capitalValor != null) set('capitalValor', formatarValor(capital.capitalValor));
  if (capital?.totalQuotas != null) set('totalQuotas', formatarInteiro(capital.totalQuotas));
  // O valor nominal da quota é PARÂMETRO da sociedade, não dado do cadastro:
  // sai sempre, mesmo sem capital calculado, para o bloco imprimir
  // "R$ {{ sociedade.quotaValorNominal }} ({{ sociedade.quotaValorNominalExtenso }})"
  // em vez de trazer "R$ 1,00 (um real)" escrito à mão.
  set('quotaValorNominal', formatarValor(capital?.quotaValorNominal ?? VALOR_NOMINAL_QUOTA));
  // Campo do catálogo ausente vira '' (cadastro incompleto) para o condicional
  // {{#sociedade.objeto}}…{{/sociedade.objeto}} pular o trecho em vez de a prévia
  // travar — a sociedade é preenchida da empresa, sem formulário que complete a mão.
  const campos = derivarCampos('sociedade', out);
  for (const c of camposDaEntidade('sociedade')) campos[c.id] = campos[c.id] ?? '';
  // O valor nominal (e o extenso dele) é invenção do motor, não notícia do
  // cadastro: preenche a frase, mas não pode segurar no documento a cláusula de
  // capital de uma sociedade que ainda não tem capital nenhum (emenda 9.1).
  marcarSintetizados(campos, ['quotaValorNominal', 'quotaValorNominalExtenso']);
  return comOrigem(campos, { tipo: 'sociedade', id: row.id });
}

export function mapearBem(row: BemRow): Campos {
  const { out, set } = coletor();
  set('denominacao', row.denominacao);
  set('referencia', row.referencia_dp);
  set('tipo', row.tipo_bem ? (TIPO_BEM_LABEL[row.tipo_bem] ?? row.tipo_bem) : '');
  if (row.vlr_contabil != null) set('valor', formatarValor(row.vlr_contabil));
  set('ccir', row.ccir_codigo);
  set('inscricaoMunicipal', row.inscricao_municipal);
  return comOrigem(derivarCampos('bem', out), { tipo: 'bem', id: row.id });
}

// Linha de matrícula enriquecida com bem + cartório + titulares (achatados sob o
// binding do imóvel), no formato que `useRegistrosPorTipo` monta a partir do JOIN.
export interface MatriculaParaMapear {
  /** Id da matrícula no cadastro — habilita a proveniência (valor clicável na prévia). Opcional: dados legados sem id seguem válidos. */
  id?: string | null;
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
  /** 'IR' (rural) / 'IB' (urbano) — classifica o imóvel p/ as condicionais rural/urbano. */
  tipo_bem?: string | null;
  /** Forma de exploração/posse (EXPLORACAO no MatriculaDadosTab) — dirige a condicional `posse`. */
  tipo_exploracao_posse?: string | null;
  bem: {
    denominacao: string | null;
    vlr_contabil: number | null;
    ccir_codigo: string | null;
    /** Fallback da classificação: `bem.tipo_bem` é NOT NULL, o da matrícula é nullable. */
    tipo_bem?: string | null;
    // Endereço, área construída e cadastro municipal do imóvel URBANO (colunas de
    // `bem`, ver 20260806120500). Opcionais: nenhum bem rural as preenche, e o
    // JOIN legado (sem elas) segue válido.
    endereco_logradouro?: string | null;
    endereco_numero?: string | null;
    endereco_complemento?: string | null;
    endereco_bairro?: string | null;
    endereco_cep?: string | null;
    area_construida_m2?: number | null;
    inscricao_municipal?: string | null;
  } | null;
  cartorio: { nome_completo: string | null; comarca: string | null; uf: string | null } | null;
  titulares: Array<TitularParaMapear>;
  /**
   * Ids das linhas de `titularidade` desta matrícula — metadado p/ as
   * notificações da tela Gerar (mudança de fração/titular é logada com o
   * entity_id da titularidade, não da matrícula). NÃO vira placeholder.
   */
  titularidadeIds?: string[];
}

// Titular de uma matrícula. `integralizador`/`fracao` vêm da titularidade e só
// importam para a forma fracionada (composse/condomínio); `pessoaId` permite
// deduplicar as duas linhas (posse de fato + de direito) de uma mesma pessoa.
// `tipoPessoa`/`cpfCnpj` enriquecem a visão derivada do Quadro Societário (PR).
// Todos opcionais: titulares legados (`{ denominacao }`) seguem válidos.
export interface TitularParaMapear {
  denominacao: string | null;
  pessoaId?: string | null;
  integralizador?: boolean;
  fracao?: number | null;
  tipoPessoa?: string | null;
  cpfCnpj?: string | null;
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

  // Classificação do imóvel: o mapeador publica o dado bruto e as condicionais
  // rural/urbano/posse derivam dele no vocabulário. `matricula.tipo_bem` é
  // nullable (há matrícula legada com ele nulo de propósito) e `bem.tipo_bem` é
  // NOT NULL: o fallback é o mesmo de useOsgChecklist.ts e MatriculaDadosTab.tsx.
  const tipoBem = m.tipo_bem ?? m.bem?.tipo_bem ?? null;
  set('tipoBem', tipoBem);
  set('tipoExploracaoPosse', m.tipo_exploracao_posse);

  // Área: o imóvel RURAL sai em hectare e o URBANO em m², convertendo dos dois
  // lados quando o cadastro está na outra unidade. O cadastro não restringe a
  // unidade por tipo de bem, então "apartamento de 0,0360 ha" existe: fidelidade à
  // unidade cadastrada geraria "três ares e sessenta centiares" num contrato
  // urbano, e o ramo rural já não é fiel (converte m² do georref para hectare).
  // 'ha_m2' não é caso próprio: ele já guarda hectare, com as 4 decimais valendo
  // exatamente os m² (ver areaUtils.ts), e a decomposição are/centiare casa com
  // isso. A unidade sai como campo base (`areaUnidade`) porque é dela, não do
  // sufixo do texto, que o extenso derivado tira a unidade.
  if (m.area_documento != null) {
    const emM2 = m.area_unidade === 'm2';
    const unidade: UnidadeArea = tipoBem === 'IB' ? 'm2' : 'ha';
    const valorNaUnidade = unidade === 'm2'
      ? (emM2 ? m.area_documento : m.area_documento * 10000)
      : (emM2 ? m.area_documento / 10000 : m.area_documento);
    set('area', formatarArea(valorNaUnidade, unidade));
    set('areaUnidade', unidade);
  }
  // Área construída é sempre m² (coluna area_construida_m2) e herda as quatro
  // casas da área total: é desejável não inventar uma precisão menor para outro
  // dado documental da mesma unidade. Zero ou negativo é cadastro inválido, não
  // construção: fica ausente, porque formatarArea aplica Math.abs e "-10"
  // viraria "10,0000 m²" ligando temAreaConstruida.
  if (m.bem?.area_construida_m2 != null && m.bem.area_construida_m2 > 0) {
    set('areaConstruida', formatarArea(m.bem.area_construida_m2, 'm2'));
  }

  // Endereço do imóvel (identificação do urbano): partes atômicas do bem, mais a
  // prosa. O rural não tem nenhuma delas (a localização dele é município/UF mais
  // a denominação), e é por isso que todas resolvem '' quando faltam.
  set('enderecoLogradouro', m.bem?.endereco_logradouro);
  // `enderecoNumeroProsa` não entra aqui: é derivado de `enderecoNumero` (ver
  // vocabulario.ts), e derivarCampos o calcula no fim desta função.
  set('enderecoNumero', m.bem?.endereco_numero);
  set('enderecoComplemento', m.bem?.endereco_complemento);
  set('enderecoBairro', m.bem?.endereco_bairro);
  set('enderecoCep', m.bem?.endereco_cep);
  if (m.bem?.endereco_logradouro) {
    set('endereco', enderecoProsa({
      endereco_logradouro: m.bem.endereco_logradouro,
      endereco_numero: m.bem.endereco_numero ?? null,
      endereco_complemento: m.bem.endereco_complemento ?? null,
      endereco_bairro: m.bem.endereco_bairro ?? null,
      endereco_municipio: m.municipio_imovel,
      endereco_uf: m.uf_imovel,
      endereco_cep: m.bem.endereco_cep ?? null,
    }));
  }

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
  // Cartório: o que identifica a serventia é o NOME CADASTRADO ("2º Ofício de
  // Registro de Imóveis de Sinop"), não um rótulo institucional montado com a
  // comarca. Nome vazio (cadastro incompleto) cai no rótulo genérico aqui, num
  // lugar só, para o bloco não precisar de guarda — e a comarca entra como
  // COMPLEMENTO, só quando ainda não estiver dita no nome.
  out.cartorio = nomeDoCartorio(m.cartorio?.nome_completo);
  // `cartorio` nunca vazio não pode responder se existe vínculo: o fallback
  // genérico faria uma guarda sempre passar. Este sinal permanece correto até
  // para cartório cadastrado sem nome e sem comarca.
  out.temCartorio = m.cartorio ? 'sim' : '';
  set('comarca', (m.cartorio?.comarca ?? '').trim());
  out.cartorioComarca = comarcaComplementar(out.cartorio, m.cartorio?.comarca);
  set('ufCartorio', ufPorExtenso(m.cartorio?.uf));
  set('ccir', m.bem?.ccir_codigo);
  set('inscricaoMunicipal', m.bem?.inscricao_municipal);
  // Confrontações SEM o ponto final: quem pontua é o modelo, que escreve
  // "…confrontações: {{ imovel.confrontacoes }}." e emenda o período seguinte
  // ("… A área remanescente…"). O texto do cartório vem com ponto no cadastro
  // (todas as matrículas da casa terminam em "."), e sem esta poda o contrato
  // sai com "na extensão de 30,00 metros..". Vale igual para o fallback da
  // descrição PSA, que é do mesmo naipe.
  set('confrontacoes', semPontoFinal(m.confrontacoes_texto ?? m.descricao_psa_completa));

  // Campo opcional que o cadastro não tem publica '' (ver publicarOpcionais):
  // livro e folha são nulos em matrícula antiga, comarca e UF do cartório somem
  // junto com o cartório, CCIR não existe em imóvel urbano, inscrição municipal
  // não existe em rural. Ausente derruba a prévia inteira; vazio é o que as
  // guardas dos blocos esperam.
  const campos = derivarCampos('matricula', publicarOpcionais('matricula', out));
  // Georref (caminho de volta) é OPCIONAL e vem de fonte assíncrona (BigQuery):
  // default '' para o documento não travar quando a matrícula não tem georref ou
  // o dado ainda não chegou. O efeito da tela Gerar sobrescreve quando carrega
  // (ver useGeorefByMatricula / mapearGeorefCabecalho).
  for (const id of GEOREF_CAMPOS_MATRICULA) campos[id] = campos[id] ?? '';
  // O rótulo genérico não é notícia do cadastro: preenche a frase, mas não pode
  // segurar no documento um bloco que só tem ele de "dado" (emenda 9.1).
  if (campos.cartorio === CARTORIO_SEM_NOME) marcarSintetizados(campos, ['cartorio']);
  return m.id ? comOrigem(campos, { tipo: 'matricula', id: m.id }) : campos;
}

/** Campos georef* do binding de matrícula (preenchidos do georref; '' quando ausente). */
export const GEOREF_CAMPOS_MATRICULA = [
  'georefArea',
  'georefPerimetro',
  'georefSistema',
  'georefCertificacao',
  'georefDataCertificacao',
] as const;

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
 * do item, onde as seções {{#sePF}}/{{#sePJ}} as resolvem. Valores-array são
 * listas ANINHADAS ({{#imoveis}} dentro de {{#integralizacoes}}).
 */
export interface ItemLista {
  /**
   * string: o carimbo {{ ref }} da composição (numeração da instância do
   * repetidor); ItemLista: referência cruzada a outro item ({{ refItem.ref }}).
   */
  [chave: string]: Campos | boolean | ItemLista[] | ItemLista | string;
}

/** Linha do quadro societário com a pessoa do sócio juntada (e o representante, se sócia PJ). */
export interface SocioParaMapear {
  pessoa: PessoaRow;
  quotas: number | null;
  vlr_total: number | null;
  /** Nome(s) do(s) administrador(es) da sócia PJ ("neste ato representada por…"). */
  representante: string | null;
  /**
   * Id da linha de `quadro_societario` — metadado p/ as notificações da tela
   * Gerar (mudança de quotas/valor é logada com este entity_id). Ausente nos
   * sócios derivados da empresa PR (vêm das integralizações, não do quadro).
   * NÃO vira placeholder.
   */
  quadroSocietarioId?: string | null;
}

export function mapearSocio(s: SocioParaMapear): ItemLista {
  const campos = mapearPessoa(s.pessoa);
  // A linha do sócio é escrita a partir das QUOTAS dele, digitadas ou
  // convertidas do valor lançado (quadro misto — ver quotasDoSocio): é o que faz
  // a soma da tabela fechar com a cláusula de capital, em vez de a linha
  // imprimir um valor cru que ninguém contou no total.
  const quotas = quotasDoSocio(s.quotas, s.vlr_total);
  if (quotas != null) {
    campos.quotas = formatarInteiro(quotas);
    // Feminino: o extenso conta QUOTAS ("quinhentas quotas"), como no registro.
    campos.quotasExtenso = cardinalExtenso(quotas, true);
    // O valor integralizado SEGUE as quotas: é aqui que a diferença de centavos
    // entre o valor contábil e a quota indivisível tem destino declarado.
    const valorDasQuotas = capitalDeQuotas(quotas);
    campos.vlrTotal = formatarValor(valorDasQuotas);
    campos.vlrTotalExtenso = valorExtenso(valorDasQuotas);
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
 *
 * `idsAdministradores` (de `administracao`) marca quem, no quadro, também
 * administra: a linha de assinatura do fecho escreve "Sócia administradora" em vez
 * de só "Sócia". Vem por argumento porque é outra fonte, e o padrão do quadro é
 * não consultar nada por conta própria.
 */
export function mapearQuadroSocietario(
  socios: SocioParaMapear[],
  idsAdministradores: ReadonlySet<string> = new Set(),
): QuadroSocietarioMapeado {
  // As MESMAS quotas que a linha do sócio imprime (digitadas ou convertidas do
  // valor lançado), para o total, o percentual e a cláusula de capital saírem da
  // mesma conta — inclusive no quadro misto.
  const quotasPorSocio = socios.map((s) => quotasDoSocio(s.quotas, s.vlr_total));
  const totalQuotas = quotasPorSocio.reduce((s, q) => s + (q ?? 0), 0);

  const itens = socios.map((s, i) => {
    const item = mapearSocio(s);
    const quotas = quotasPorSocio[i];
    if (quotas != null && totalQuotas > 0) {
      (item.socio as Campos).percentual = formatarPercentual((quotas / totalQuotas) * 100);
    }
    // Enumeração do caput de capital ("sendo: i) … e ii) …"), como já existe na
    // integralização: a cláusula de capital em moeda corrente lista os sócios do
    // QUADRO, não das integralizações, e precisa do mesmo romano minúsculo.
    (item.socio as Campos).ordem = String(i + 1);
    (item.socio as Campos).ordemRomana = romano(i + 1).toLowerCase();
    // Duas condicionais, gravadas juntas: o engine não tem "else", então cada ramo
    // da linha de assinatura tem a sua (mesmo padrão de inteiro/fracionado).
    const administra = !!s.pessoa.id && idsAdministradores.has(s.pessoa.id);
    (item.socio as Campos).administrador = administra ? 'sim' : '';
    (item.socio as Campos).naoAdministrador = administra ? '' : 'sim';
    return item;
  });

  const total: Campos = {};
  if (totalQuotas > 0) {
    total.quotas = formatarInteiro(totalQuotas);
    // A linha TOTAL fecha com a cláusula de capital, não com a soma dos valores
    // digitados: capital = Σ quotas × valor nominal (ver capital.ts).
    total.vlrTotal = formatarValor(capitalDeQuotas(totalQuotas));
    total.percentual = formatarPercentual(100);
  }
  return { itens, total };
}

// --- Integralização de imóveis (seção {{#integralizacoes}}) -------------------

/** Matrícula de bem aprovado para integralização (o id cruza as referências entre sócios). */
export interface MatriculaIntegralizacao extends MatriculaParaMapear {
  id: string;
}

/** Participação derivada de uma pessoa no quadro da empresa PR (visão calculada). */
export interface ParticipacaoPR {
  /** null para titular legado sem pessoa vinculada (agregado pela denominação). */
  pessoaId: string | null;
  denominacao: string;
  tipoPessoa: string | null;
  cpfCnpj: string | null;
  /**
   * R$ — o valor das QUOTAS do titular (quotas × valor nominal), já ajustado.
   * O rateio bruto das matrículas (Σ frações × valores) tem centavos que a quota
   * indivisível não representa; o ajuste mora aqui, não no capital (ver capital.ts).
   */
  valor: number;
  /** Inteiro — Σ quotas === totalQuotas de calcularCapitalSociedade. */
  quotas: number;
  /** quotas ÷ total de quotas × 100. */
  percentual: number;
}

/**
 * Quadro societário DERIVADO da empresa PR: rateia o valor contábil de cada
 * matrícula aprovada para integralização pela fração de titularidade (em
 * centavos, espelhando mapearIntegralizacoes — quando as frações fecham 100%,
 * o último titular absorve o resíduo de arredondamento), agrega por pessoa e
 * converte em quotas ao valor nominal da casa. Titulares sem fração dividem o que
 * sobra (titular único sem fração leva 100%). Matrícula sem valor contábil
 * fica fora do cálculo. Ordena por valor decrescente; o último absorve a
 * diferença de quotas para fechar com calcularCapitalSociedade.
 */
export function calcularParticipacoesPR(matriculas: MatriculaIntegralizacao[]): ParticipacaoPR[] {
  interface Acumulado {
    pessoaId: string | null; denominacao: string;
    tipoPessoa: string | null; cpfCnpj: string | null;
    cent: number;
  }
  const porChave = new Map<string, Acumulado>();

  for (const m of matriculas) {
    // MESMA base de calcularCapitalSociedade: sem valor ou sem titular, a
    // matrícula fica fora dos DOIS lados da identidade Σ quotas === totalQuotas.
    const vlr = valorParaCapital(m);
    if (vlr == null) continue;
    const titulares = dedupTitulares(m.titulares);

    const totalCent = Math.round(vlr * 100);
    const comFracao = titulares.filter((t) => t.fracao != null);
    const semFracao = titulares.filter((t) => t.fracao == null);
    // Matrícula "fechada": todos com fração e Σ frações ≈ 100 — o último titular
    // absorve o resíduo de arredondamento (padrão dos contratos registrados).
    const fechada =
      semFracao.length === 0 &&
      Math.abs(comFracao.reduce((s, t) => s + t.fracao!, 0) - 100) < 0.001;

    const centDe = new Map<TitularParaMapear, number>();
    let alocado = 0;
    comFracao.forEach((t, i) => {
      const cent = fechada && i === comFracao.length - 1
        ? totalCent - alocado
        : Math.round((totalCent * t.fracao!) / 100);
      alocado += cent;
      centDe.set(t, cent);
    });
    // Sem fração: dividem igualmente o restante (último absorve o resíduo).
    const restante = totalCent - alocado;
    let alocadoSem = 0;
    semFracao.forEach((t, i) => {
      const cent = i === semFracao.length - 1
        ? restante - alocadoSem
        : Math.round(restante / semFracao.length);
      alocadoSem += cent;
      centDe.set(t, cent);
    });

    for (const t of titulares) {
      const chave = t.pessoaId ?? `nome:${t.denominacao ?? ''}`;
      const atual = porChave.get(chave);
      if (atual) {
        atual.cent += centDe.get(t) ?? 0;
      } else {
        porChave.set(chave, {
          pessoaId: t.pessoaId ?? null,
          denominacao: t.denominacao ?? '—',
          tipoPessoa: t.tipoPessoa ?? null,
          cpfCnpj: t.cpfCnpj ?? null,
          cent: centDe.get(t) ?? 0,
        });
      }
    }
  }

  const capitalCent = [...porChave.values()].reduce((s, a) => s + a.cent, 0);
  if (capitalCent === 0) return [];

  const participacoes = [...porChave.values()]
    .sort((a, z) => z.cent - a.cent)
    .map((a) => ({
      pessoaId: a.pessoaId,
      denominacao: a.denominacao,
      tipoPessoa: a.tipoPessoa,
      cpfCnpj: a.cpfCnpj,
      valor: 0, // preenchido abaixo: o valor segue as quotas
      quotas: quotasDeValor(a.cent / 100),
      percentual: 0,
    }));

  // O último absorve a diferença para Σ quotas fechar com o totalQuotas de
  // calcularCapitalSociedade (que converte o capital inteiro de uma vez, e não
  // titular a titular). Só então valor e percentual de cada um são derivados
  // DAS QUOTAS — é o que faz a linha da tabela nunca contradizer a cláusula.
  const totalQuotas = quotasDeValor(capitalCent / 100);
  const somaQuotas = participacoes.reduce((s, p) => s + p.quotas, 0);
  participacoes[participacoes.length - 1].quotas += totalQuotas - somaQuotas;
  for (const p of participacoes) {
    p.valor = capitalDeQuotas(p.quotas);
    p.percentual = totalQuotas > 0 ? (p.quotas / totalQuotas) * 100 : 0;
  }

  return participacoes;
}

/**
 * Itens da seção {{#integralizacoes}} (e do bloco parágrafo REPETIDOR sobre
 * ela): um item por sócio que integraliza (na ordem do quadro societário), cada
 * um com suas alíneas {{#imoveis}} — uma por matrícula em que o sócio é
 * titular. A primeira ocorrência de cada matrícula no documento sai COMPLETA
 * (descrição por extenso, com a fração do sócio à frente e os demais titulares
 * como área remanescente); as seguintes saem como REFERÊNCIA à descrição
 * original, no padrão da casa: "descrito na alínea 'a' do parágrafo segundo".
 *
 * O NÚMERO do parágrafo não nasce aqui: o mapeador só registra a IDENTIDADE da
 * primeira descrição (`refItem` aponta ao item do sócio que a fez); quem numera
 * é a composição, carimbando {{ ref }} em cada item conforme a posição real da
 * instância no documento (ver index.ts) — o texto usa {{ refItem.ref }}.
 *
 * Valor da alínea = fração × valor da matrícula. Quando as frações fecham 100%
 * entre os sócios, o último absorve a diferença de centavos do arredondamento
 * (ex.: R$ 138.027,21 → 69.013,61 + 69.013,60, como nos contratos registrados).
 */
export function mapearIntegralizacoes(
  socios: SocioParaMapear[],
  matriculas: MatriculaIntegralizacao[],
): ItemLista[] {
  const sociosIds = new Set(socios.map((s) => s.pessoa.id));

  // Pré-passada por matrícula: quantos sócios-titulares faltam processar e se a
  // divisão "fecha" (todos os titulares são sócios, com fração somando 100%).
  const pendentes = new Map<string, number>();
  const fechadas = new Set<string>();
  for (const m of matriculas) {
    const tits = dedupTitulares(m.titulares);
    const deSocios = tits.filter((t) => t.pessoaId && sociosIds.has(t.pessoaId));
    pendentes.set(m.id, deSocios.length);
    const vlr = m.vlr_contabil ?? m.bem?.vlr_contabil ?? null;
    if (
      vlr != null &&
      deSocios.length === tits.length &&
      tits.every((t) => t.fracao != null) &&
      Math.abs(tits.reduce((s, t) => s + t.fracao!, 0) - 100) < 0.001
    ) {
      fechadas.add(m.id);
    }
  }

  // Onde cada matrícula foi descrita pela primeira vez + centavos já alocados.
  const descritas = new Map<string, { alinea: string; socio: string; indice: number }>();
  const alocado = new Map<string, number>();
  const itens: ItemLista[] = [];
  // Referências cruzadas a resolver no fim: o item original só existe completo
  // depois que o sócio que descreve é empurrado em `itens`.
  const referenciasPendentes: Array<{ alvo: ItemLista; indice: number }> = [];

  for (const s of socios) {
    const doSocio = matriculas.filter((m) =>
      dedupTitulares(m.titulares).some((t) => t.pessoaId === s.pessoa.id),
    );
    if (doSocio.length === 0) continue;

    const ordem = itens.length + 1;
    const imoveis: ItemLista[] = doSocio.map((m, j) => {
      // O sócio do parágrafo lidera a descrição desta alínea — o flag do banco
      // não importa aqui (cada sócio é o "integralizador" das próprias alíneas).
      const tits = dedupTitulares(m.titulares).map((t) => ({
        ...t,
        integralizador: t.pessoaId === s.pessoa.id,
      }));
      const titular = tits.find((t) => t.integralizador)!;
      const campos = mapearMatricula({ ...m, titulares: tits });

      // Valor da fração (em centavos, para o fechamento exato do último sócio).
      const vlr = m.vlr_contabil ?? m.bem?.vlr_contabil ?? null;
      const pend = pendentes.get(m.id)!;
      if (vlr != null && titular.fracao != null) {
        const totalCent = Math.round(vlr * 100);
        const jaAlocado = alocado.get(m.id) ?? 0;
        const cent =
          fechadas.has(m.id) && pend === 1
            ? totalCent - jaAlocado
            : Math.round((totalCent * titular.fracao) / 100);
        alocado.set(m.id, jaAlocado + cent);
        campos.valor = formatarValor(cent / 100);
      }
      pendentes.set(m.id, pend - 1);

      const alinea = letraAlinea(j + 1);
      campos.alinea = alinea;
      const original = descritas.get(m.id);
      if (original) {
        campos.refAlinea = original.alinea;
        campos.refSocio = original.socio;
      } else {
        descritas.set(m.id, { alinea, socio: s.pessoa.denominacao, indice: ordem - 1 });
      }

      // Dentro de lista não há formulário para completar campo faltante na mão
      // (diferente do binding unitário): campo do catálogo ausente vira '' para
      // o condicional {{#imovel.livro}}…{{/imovel.livro}} pular o trecho em vez
      // de derrubar a prévia inteira.
      const imovel = derivarCampos('matricula', campos);
      for (const c of camposDaEntidade('matricula')) imovel[c.id] = imovel[c.id] ?? '';

      const item: ItemLista = {
        imovel,
        completa: !original,
        referencia: !!original,
      };
      if (original) referenciasPendentes.push({ alvo: item, indice: original.indice });
      return item;
    });

    const base = mapearSocio(s);
    const socioCampos: Campos = {
      ...(base.socio as Campos),
      ordem: String(ordem),
      // Enumeração do caput de capital ("sendo: i) … ii) …"), no padrão da casa.
      ordemRomana: romano(ordem).toLowerCase(),
    };
    // Extras da relação ausentes (sócio sem quotas/valor) também viram ''.
    for (const id of ['quotas', 'quotasExtenso', 'vlrTotal', 'vlrTotalExtenso']) {
      socioCampos[id] = socioCampos[id] ?? '';
    }
    itens.push({ socio: socioCampos, sePF: base.sePF, sePJ: base.sePJ, imoveis });
  }

  // Liga cada referência ao ITEM da primeira descrição: {{ refItem.ref }} lê o
  // carimbo de numeração que a composição grava nesse item (mesma identidade da
  // instância expandida do parágrafo).
  for (const p of referenciasPendentes) p.alvo.refItem = itens[p.indice];

  return itens;
}

/**
 * Restaura as referências cruzadas de `integralizacoes` que a serialização do
 * snapshot (jsonb de documento_gerado) desfaz. {{ refItem.ref }} depende de
 * IDENTIDADE de objeto: o item de uma 2ª ocorrência aponta para o ITEM DE TOPO
 * que descreveu a matrícula primeiro, e é nesse item de topo que a composição
 * carimba {{ ref }} (ver index.ts/repetidor.ts). Ao passar por JSON.stringify,
 * `refItem` vira uma CÓPIA solta do alvo — perde a identidade e nunca recebe o
 * carimbo, derrubando o render ("Placeholder não resolvido: {{refItem.ref}}").
 *
 * Aqui religamos cada `refItem` ao objeto REAL do array, casando pela `ordem` do
 * sócio (única por item de topo, gravada em mapearIntegralizacoes e preservada na
 * cópia). É idempotente no caminho vivo (identidade intacta → reaponta ao mesmo
 * objeto) e conserta snapshots já gravados sem precisar revalidar. Toda tela que
 * renderiza de um snapshot deve passar `itensPorLista` por aqui antes de montar
 * o contexto.
 */
export function reidratarItensPorLista(
  itensPorLista: Record<string, ItemLista[]>,
): Record<string, ItemLista[]> {
  const integralizacoes = itensPorLista.integralizacoes;
  if (!Array.isArray(integralizacoes)) return itensPorLista;

  const porOrdem = new Map<string, ItemLista>();
  for (const item of integralizacoes) {
    const ordem = (item.socio as Campos | undefined)?.ordem;
    if (typeof ordem === 'string') porOrdem.set(ordem, item);
  }

  // Religa o refItem do item e desce nas listas aninhadas ({{#imoveis}}), onde
  // mora a referência cruzada real.
  const religar = (item: ItemLista) => {
    const alvo = item.refItem as ItemLista | undefined;
    const ordem = (alvo?.socio as Campos | undefined)?.ordem;
    const real = typeof ordem === 'string' ? porOrdem.get(ordem) : undefined;
    if (real) item.refItem = real;
    for (const valor of Object.values(item)) {
      if (Array.isArray(valor)) for (const filho of valor) religar(filho);
    }
  };
  for (const item of integralizacoes) religar(item);
  return itensPorLista;
}

/** Linha de administração com a pessoa do administrador juntada. */
export interface AdministradorParaMapear {
  pessoa: PessoaRow;
  cargo: string | null;
  /**
   * Id da linha de `administracao` — metadado p/ as notificações da tela Gerar
   * (mudança de cargo é logada com este entity_id). NÃO vira placeholder.
   */
  administracaoId?: string | null;
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
    case 'sociedade':
      return mapearSociedade(row as PessoaRow);
    case 'bem':
      return mapearBem(row as BemRow);
    case 'matricula':
      return mapearMatricula(row as MatriculaParaMapear);
    case 'cartorio':
      return mapearCartorio(row as CartorioRow);
    case 'vertice':
      // Vértice é sempre item de lista ({{#vertices}}), nunca binding unitário —
      // não tem registro/seletor próprio. Ver mapearVertice.
      return {};
  }
}

// --- Georreferenciamento (memorial SIGEF, do BigQuery via backend) -------------

/** Uma linha de `psa_osg.georef_detalhe`, como o endpoint a devolve (valores fiéis). */
export interface GeorefVerticeRow {
  sequencia: number;
  cod_vertice: string;
  longitude_dcm: string | null;
  latitude_dcm: string | null;
  altitude_m: string | null;
  cod_vante: string | null;
  azimute_dcm: string | null;
  dist_vante_m: string | null;
  confrontacoes: string | null;
}

/** Cabeçalho de `psa_osg.georef_cabecalho`, como o endpoint o devolve. */
export interface GeorefCabecalhoRow {
  id_georef: string;
  nr_matricula: string;
  sistema_referencia: string | null;
  area_ha: string | null;
  perimetro_m: string | null;
  certificacao_sigef: string | null;
  data_certificacao: string | null;
  data_geracao: string | null;
}

/** "214.4921" → "214,4921"; "7781.67" → "7.781,67". Não-numérico volta como veio. */
function numeroBRDeTexto(bruto: string | null): string {
  if (!bruto) return '';
  const n = Number(bruto);
  return Number.isFinite(n) ? n.toLocaleString('pt-BR', { maximumFractionDigits: 4 }) : bruto;
}

/** Um vértice → item da seção {{#vertices}} ({ vertice: { codVertice, longitude, … } }). */
export function mapearVertice(v: GeorefVerticeRow): ItemLista {
  const { out, set } = coletor();
  // Coordenadas/azimute/altitude/distância ficam FIÉIS ao PDF (GMS, vírgula decimal).
  set('codVertice', v.cod_vertice);
  set('longitude', v.longitude_dcm);
  set('latitude', v.latitude_dcm);
  set('altitude', v.altitude_m);
  set('codVante', v.cod_vante);
  set('azimute', v.azimute_dcm);
  set('distancia', v.dist_vante_m);
  set('confrontacoes', v.confrontacoes);
  // Campo do catálogo ausente vira '' (como nos itens das outras listas), para o
  // condicional/célula não derrubar a prévia.
  const vertice = derivarCampos('vertice', out);
  for (const c of camposDaEntidade('vertice')) vertice[c.id] = vertice[c.id] ?? '';
  return { vertice };
}

/**
 * Cabeçalho do georref → campos georef* do binding de MATRÍCULA (mesclados em
 * selecao[imovel]): {{ imovel.georefArea }}, {{ imovel.georefSistema }}, etc.
 * Área e perímetro saem em número pt-BR; data de certificação em DD/MM/AAAA.
 */
export function mapearGeorefCabecalho(cab: GeorefCabecalhoRow | null | undefined): Campos {
  if (!cab) return {};
  const { out, set } = coletor();
  set('georefArea', numeroBRDeTexto(cab.area_ha));
  set('georefPerimetro', numeroBRDeTexto(cab.perimetro_m));
  set('georefSistema', cab.sistema_referencia);
  set('georefCertificacao', cab.certificacao_sigef);
  set('georefDataCertificacao', formatarDataBR(cab.data_certificacao));
  return out;
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
