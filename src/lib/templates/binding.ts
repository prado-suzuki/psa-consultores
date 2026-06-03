import { ENTIDADES, type TipoCampo, type TipoEntidade } from './vocabulario';

// Modelo de binding: cada placeholder é `<binding>.<campo>`. O binding é um papel
// (proprietario, imovel, socio2…) que resolve para um TIPO de entidade. Na geração,
// o consultor liga cada binding a um registro real do cliente. A cardinalidade fica
// reservada para a fase futura de iteração/coleções — hoje só `'um'`.

export type Cardinalidade = 'um' | 'lista';

export interface Binding {
  /** Nome do papel usado no template (ex.: "proprietario", "imovel", "socio2"). */
  nome: string;
  tipo: TipoEntidade;
  /** Reservado: hoje sempre 'um'. 'lista' (coleções) é gancho da fase futura. */
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
  imovel: { tipo: 'matricula', label: 'Imóvel' },
  matricula: { tipo: 'matricula', label: 'Matrícula' },
  bem: { tipo: 'bem', label: 'Bem' },
  cartorio: { tipo: 'cartorio', label: 'Cartório' },
};

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

export interface PlaceholderSugerido {
  /** Caminho completo que vai dentro de {{ }} (ex.: "proprietario.nome"). */
  placeholder: string;
  /** Rótulo legível ("Proprietário — Nome"). */
  label: string;
  /** Grupo (papel) para agrupar o dropdown. */
  grupo: string;
  tipo: TipoCampo;
}

/**
 * Catálogo de placeholders namespaced para o autocomplete do editor: o produto
 * cartesiano dos papéis conhecidos pelos campos do tipo de entidade de cada papel,
 * agrupado por papel.
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
  return out;
}
