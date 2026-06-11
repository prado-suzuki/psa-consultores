import { extrairEstrutura } from './render';
import { campoDaEntidade, ENTIDADES, type TipoCampo, type TipoEntidade } from './vocabulario';

// Modelo de binding: cada placeholder é `<binding>.<campo>`. O binding é um papel
// (proprietario, imovel, socio2…) que resolve para um TIPO de entidade. Na geração,
// o consultor liga cada binding a um registro real do cliente.
//
// Cardinalidade 'lista': papéis PLURAIS ({{#socios}}…{{/socios}}) iteram sobre uma
// FONTE relacional (quadro_societario/administracao) da empresa escolhida — o
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
};

// --- Papéis de lista (seções de repetição) -----------------------------------

/** Fonte relacional de uma lista: de onde os itens vêm, dada a empresa (PJ). */
export type FonteLista = 'quadro_societario' | 'administracao' | 'integralizacao';

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
    fonte: 'quadro_societario',
    camposExtras: [
      { id: 'quotas', label: 'Quotas' },
      { id: 'quotasExtenso', label: 'Quotas (por extenso)' },
      { id: 'vlrTotal', label: 'Valor total das quotas (R$)' },
      { id: 'vlrTotalExtenso', label: 'Valor total (por extenso)' },
      { id: 'representante', label: 'Representante (sócia PJ)' },
    ],
  },
  administradores: {
    label: 'Administradores (Administração)',
    tipo: 'pessoa',
    itemKey: 'administrador',
    fonte: 'administracao',
    camposExtras: [{ id: 'cargo', label: 'Cargo' }],
  },
  integralizacoes: {
    label: 'Integralizações (imóveis aprovados, por sócio)',
    tipo: 'pessoa',
    itemKey: 'socio',
    itemKeysExtras: ['imovel'],
    secoesItem: ['imoveis', 'completa', 'referencia'],
    fonte: 'integralizacao',
    camposExtras: [
      { id: 'paragrafo', label: 'Rótulo do parágrafo (Segundo, Terceiro…)' },
      { id: 'ordem', label: 'Ordem do sócio na integralização (1, 2…)' },
    ],
  },
};

/** Condicionais de item conhecidas dentro de seções de lista. */
export const CONDICIONAIS_ITEM = ['sePF', 'sePJ'] as const;

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
        // O nome da seção entra como campo para registrar o binding mesmo
        // quando o campo só aparece na condicional.
        campos.push(secao.nome, ...secao.campos);
        continue;
      }
      secoesDesconhecidas.push(secao.nome);
      campos.push(...secao.campos);
      continue;
    }
    listas.push({ nome: secao.nome, papel });
    const chavesItem = [papel.itemKey, ...(papel.itemKeysExtras ?? [])];
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

  const { bindings, desconhecidos } = detectarBindings(campos);
  return {
    bindings,
    listas,
    desconhecidos,
    secoesDesconhecidas: [...new Set(secoesDesconhecidas)],
    campos,
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
  // referência cruzada e as condicionais completa/referência.
  const grupoInteg = PAPEIS_LISTA.integralizacoes.label;
  out.push({
    placeholder: 'integralizacoes.alineas',
    label: 'Integralizações — esqueleto sócio + alíneas',
    grupo: grupoInteg,
    tipo: 'texto',
    insercao:
      '{{#integralizacoes sep="\\n"}}*Parágrafo {{ socio.paragrafo }}:* ' +
      'O sócio {{ socio.nome }} subscreve e integraliza neste ato:\n' +
      '{{#imoveis sep="\\n"}}{{ imovel.alinea }}) {{#completa}}…descrição completa…{{/completa}}' +
      '{{#referencia}}…referência à alínea "{{ imovel.refAlinea }}" do parágrafo {{ imovel.refParagrafo }}…{{/referencia}}{{/imoveis}}{{/integralizacoes}}',
  });
  for (const [id, label] of [
    ['alinea', 'Letra da alínea (a, b…)'],
    ['refAlinea', 'Alínea da descrição original (referência)'],
    ['refParagrafo', 'Parágrafo da descrição original (referência)'],
    ['refSocio', 'Sócio da descrição original (referência)'],
  ] as const) {
    out.push({
      placeholder: `imovel.${id}`,
      label: `Integralizações — ${label}`,
      grupo: grupoInteg,
      tipo: 'texto',
    });
  }
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
