import { concordar, PARES, type Genero } from './concordancia';
import { mapearPessoa, type AdministradorParaMapear, type ItemLista, type SocioParaMapear } from './mapeadores';
import { comOrigem } from './origem';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';

// Quem assina o instrumento, como LISTA com papel — não como sufixo do rótulo
// de outra pessoa.
//
// Antes disso o fecho iterava {{#socios}} e a outorga conjugal era um sufixo
// ("JOSE EDUARDO … Sócio administrador e Outorga Conjugal"): quem outorga é o
// CÔNJUGE, e o cônjuge não tinha onde assinar (B12); administrador não sócio
// era qualificado na cláusula de administração e não recebia linha nenhuma
// (B13). Uma lista só resolve os dois, e serve a qualquer instrumento futuro
// (doação com anuência, procuração) sem um segundo laço no bloco.

type Campos = Record<string, string>;

/** Signatário que não vem de cadastro (testemunha, advogado), digitado na tela Gerar. */
export interface SignatarioAvulso {
  nome: string;
  cpfCnpj?: string | null;
  /** Complemento curto sob o nome ("OAB/MT nº 1.234"). */
  qualificacao?: string | null;
  genero?: Genero;
}

export interface EntradaSignatarios {
  /** Quadro societário, na ordem em que ele aparece no documento. */
  socios: SocioParaMapear[];
  /** Administração da sociedade (sócios ou não). */
  administradores?: AdministradorParaMapear[];
  /**
   * Resolve uma pessoa pelo id, para achar o cônjuge de quem o regime de bens
   * obriga a outorgar (`pessoa.conjuge_id`). O vínculo é lido COMO ESTÁ: quando
   * gravado de um lado só, o cônjuge daquele lado entra na lista e o do outro
   * não — some quando a reciprocidade do cadastro chegar (B10).
   */
  pessoaPorId?: (id: string) => PessoaRow | null | undefined;
  advogado?: SignatarioAvulso | null;
  testemunhas?: SignatarioAvulso[];
}

/** Papéis de assinatura, já concordados em gênero — o bloco IMPRIME, não monta. */
const PAPEL = {
  socioAdministrador: (g: Genero) => PARES.socioAdministrador(g),
  socio: (g: Genero) => PARES.socioTitulo(g),
  administrador: (g: Genero) => concordar(g, 'Administrador', 'Administradora'),
  /** "Cônjuge" é o substantivo dos dois gêneros e "outorgante" é invariável. */
  conjuge: () => 'Cônjuge outorgante',
  advogado: (g: Genero) => concordar(g, 'Advogado', 'Advogada'),
  testemunha: () => 'Testemunha',
} as const;

interface DadosSignatario {
  nome: string;
  nomeMaiusculo: string;
  papel: string;
  cpfCnpj: string;
  qualificacao: string;
  eSocio?: boolean;
  eAdministrador?: boolean;
  eConjuge?: boolean;
  eTestemunha?: boolean;
  eAdvogado?: boolean;
}

/** Condicional de item: 'sim' / '' (o engine não tem "else"). */
const sim = (v: boolean | undefined): string => (v ? 'sim' : '');

function itemSignatario(dados: DadosSignatario): Campos {
  return {
    nome: dados.nome,
    nomeMaiusculo: dados.nomeMaiusculo,
    papel: dados.papel,
    cpfCnpj: dados.cpfCnpj,
    qualificacao: dados.qualificacao,
    eSocio: sim(dados.eSocio),
    eAdministrador: sim(dados.eAdministrador),
    eConjuge: sim(dados.eConjuge),
    eTestemunha: sim(dados.eTestemunha),
    eAdvogado: sim(dados.eAdvogado),
  };
}

/**
 * Uma entrada por LINHA DE ASSINATURA do documento, nesta ordem:
 * sócios na ordem do quadro, cada um imediatamente seguido do seu cônjuge
 * outorgante quando o regime de bens exigir; depois os administradores que não
 * são sócios; depois advogado e testemunhas.
 *
 * Ninguém aparece duas vezes: a pessoa que é sócia E administradora sai uma só,
 * com o papel combinado ("Sócio administrador"), e o cônjuge que já assina por
 * conta própria (sócio ou administrador) não ganha uma segunda linha — assinar
 * duas vezes não outorga mais do que assinar uma.
 *
 * Item sem nome não entra: uma régua de assinatura sem nome embaixo não é
 * signatário, é ruído no fecho.
 */
export function mapearSignatarios(entrada: EntradaSignatarios): ItemLista[] {
  const { socios, administradores = [], pessoaPorId, advogado, testemunhas = [] } = entrada;

  const idsAdministradores = new Set(administradores.map((a) => a.pessoa.id).filter(Boolean));
  // Quem já assina por direito próprio (sócio ou administrador) não vira linha
  // de cônjuge: assinar duas vezes não outorga mais do que assinar uma, e a
  // ordem de leitura do quadro não pode decidir qual dos dois papéis aparece.
  const idsProprios = new Set([...socios.map((s) => s.pessoa.id), ...idsAdministradores].filter(Boolean));
  const idsEmitidos = new Set<string>();
  const itens: ItemLista[] = [];

  const emitir = (campos: Campos, pessoa?: PessoaRow | null): boolean => {
    if (!campos.nome) return false;
    if (pessoa?.id) {
      if (idsEmitidos.has(pessoa.id)) return false;
      idsEmitidos.add(pessoa.id);
    }
    itens.push({ signatario: pessoa?.id ? comOrigem(campos, { tipo: 'pessoa', id: pessoa.id }) : campos });
    return true;
  };

  /** Campos comuns a quem vem do cadastro (o mapeador de pessoa é a fonte única). */
  const dePessoa = (pessoa: PessoaRow) => {
    const campos = mapearPessoa(pessoa);
    return {
      campos,
      genero: (campos.genero || null) as Genero,
      nome: campos.nome ?? '',
      nomeMaiusculo: campos.nomeMaiusculo ?? '',
      cpfCnpj: campos.cpfCnpj ?? '',
    };
  };

  for (const s of socios) {
    const p = dePessoa(s.pessoa);
    const administra = !!s.pessoa.id && idsAdministradores.has(s.pessoa.id);
    emitir(
      itemSignatario({
        nome: p.nome,
        nomeMaiusculo: p.nomeMaiusculo,
        papel: administra ? PAPEL.socioAdministrador(p.genero) : PAPEL.socio(p.genero),
        cpfCnpj: p.cpfCnpj,
        // Sócia PJ assina por quem a representa — o complemento vai sob o papel.
        qualificacao: s.representante ? `neste ato representada por ${s.representante}` : '',
        eSocio: true,
        eAdministrador: administra,
      }),
      s.pessoa,
    );

    // Outorga conjugal: a MESMA flag de sempre (derivada do regime de bens)
    // decide, o que muda é o efeito — em vez de virar sufixo do rótulo do
    // sócio, ela põe o cônjuge na lista, com nome e linha próprios.
    if (p.campos.exigeOutorgaConjugal !== 'sim') continue;
    const conjuge = s.pessoa.conjuge_id ? pessoaPorId?.(s.pessoa.conjuge_id) : null;
    if (!conjuge || (conjuge.id && idsProprios.has(conjuge.id))) continue;
    const c = dePessoa(conjuge);
    emitir(
      itemSignatario({
        nome: c.nome,
        nomeMaiusculo: c.nomeMaiusculo,
        papel: PAPEL.conjuge(),
        cpfCnpj: c.cpfCnpj,
        qualificacao: p.nome ? `cônjuge de ${p.nome}` : '',
        eConjuge: true,
      }),
      conjuge,
    );
  }

  for (const a of administradores) {
    const p = dePessoa(a.pessoa);
    emitir(
      itemSignatario({
        nome: p.nome,
        nomeMaiusculo: p.nomeMaiusculo,
        papel: PAPEL.administrador(p.genero),
        cpfCnpj: p.cpfCnpj,
        qualificacao: a.cargo ?? '',
        eAdministrador: true,
      }),
      a.pessoa,
    );
  }

  const avulso = (s: SignatarioAvulso, papel: string, marca: Partial<DadosSignatario>) =>
    emitir(
      itemSignatario({
        nome: s.nome,
        nomeMaiusculo: s.nome.toLocaleUpperCase('pt-BR'),
        papel,
        cpfCnpj: s.cpfCnpj ?? '',
        qualificacao: s.qualificacao ?? '',
        ...marca,
      }),
    );

  if (advogado) avulso(advogado, PAPEL.advogado(advogado.genero), { eAdvogado: true });
  for (const t of testemunhas) avulso(t, PAPEL.testemunha(), { eTestemunha: true });

  return itens;
}
