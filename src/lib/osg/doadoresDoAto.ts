// Quem são os DOADORES do ato — que não é a mesma pergunta que "quem é sócio".
//
//   QUEM É SÓCIO  → o quadro societário. É quem consta no contrato social.
//   QUEM DOA      → a forma do ato, e o regime de bens do titular.
//
// UMA GIA POR DOADOR, com todos os beneficiários dentro dela. É por isso que o
// número de guias é o número de doadores, e não o de pares: o Manual da GIA ITCD-e
// Doação/Outros (SEFAZ/MT, 2025) mostra a aba Beneficiários, onde cada um recebe o
// seu "Percentual Transmitido".
//
// SÃO DUAS FORMAS, e as duas existem nos atos reais da carteira:
//
//   CASAL EM CONJUNTO — o instrumento qualifica os dois como DOADORES e trata o
//   patrimônio como INDIVISO: "os DOADORES são proprietários de 4.448.500 quotas".
//   Uma GIA, e a legítima sobre o bloco inteiro. Foi assim no Agro Aliança
//   (jun/2026): DARE 337978, R$ 223.585,87, e a legítima de 1.112.125 que só sai
//   com teto(4.448.500 ÷ 2 ÷ 2) — o bloco consolidado.
//
//   CADA UM POR SI — instrumentos e guias separados, cada cônjuge doando o que está
//   registrado no nome dele. Foi assim num caso de dez/2025: quatro instrumentos,
//   quatro GIAs, quatro DARs, R$ 485.193,66. As bases dos dois saíram DESIGUAIS
//   (3.149.047,50 e 1.621.850,50 por donatária), o que a forma conjunta não produz.
//
// A DIFERENÇA É DE FAIXA DE ALÍQUOTA, não de centavo: no Agro Aliança, R$ 223.585,87
// em conjunto contra R$ 171.031,44 separado. Por isso a forma é DECLARADA, e não
// adivinhada — o cadastro sabe o regime de bens, mas não sabe como o instrumento foi
// lavrado. Quem sabe é quem o lavra.
//
// O manual, págs. 9 e 16, manda "cada um dos doadores preencher uma GIA-ITCD-e
// referente à sua respectiva parte, conforme previsto pelo regime matrimonial" — o
// que aponta para a forma separada. A prática dos instrumentos foi a conjunta. A
// divergência fica visível na tela em vez de ser resolvida por padrão escondido.

/** Como o ato trata o titular e o cônjuge dele. */
export type FormaDoDoador =
  /** Um doador só: solteiro, viúvo, divorciado, ou separação total de bens. */
  | { tipo: 'individual' }
  /**
   * Casal doando em conjunto, patrimônio indiviso. UMA GIA, assinada pelos dois, e
   * a legítima sobre o bloco inteiro. O cônjuge é doador mesmo com zero quota no
   * quadro: em comunhão, metade do que se doa é dele.
   */
  | { tipo: 'casal-conjunto'; conjugeId: string; conjugeNome: string }
  /**
   * Casal com guias separadas. Cada cônjuge doa o que está registrado no nome dele,
   * então esta forma só muda algo quando os DOIS têm quotas no quadro — e aí cada um
   * já entra como o seu próprio titular.
   */
  | { tipo: 'casal-separado'; conjugeId: string; conjugeNome: string }
  /** Estado inicial quando o cadastro não responde. Não apura — pergunta. */
  | { tipo: 'nao-informado' };

/** Um titular do quadro transmitindo quotas neste ato. */
export interface BlocoDoado {
  titularId: string;
  titularNome: string;
  quotasDoadas: bigint;
  forma: FormaDoDoador;
}

export interface DoadorFiscal {
  /**
   * Id do doador. Na forma conjunta é COMPOSTO (`titular+conjuge`), porque o doador
   * da guia é o casal, não uma das duas pessoas.
   */
  doadorId: string;
  nome: string;
  /** Total que transmite — é a base da GIA dele. */
  quotasDoadas: bigint;
  /** As pessoas físicas que assinam como doadoras. Uma, ou duas no casal conjunto. */
  pessoaIds: string[];
  ehCasalConjunto: boolean;
}

/** Id do casal como doador único. Ordenado, para não depender de quem veio primeiro. */
export function idDoCasal(a: string, b: string): string {
  return [a, b].sort().join('+');
}

/**
 * Os doadores fiscais do ato — UM POR GIA A EMITIR.
 *
 * Uma pessoa que apareça em mais de um bloco sai numa linha só, com a soma: ela
 * emite uma guia, não duas.
 */
export function derivarDoadoresFiscais(blocos: BlocoDoado[]): DoadorFiscal[] {
  const porId = new Map<string, DoadorFiscal>();

  const acumular = (d: DoadorFiscal) => {
    const atual = porId.get(d.doadorId);
    if (!atual) {
      porId.set(d.doadorId, { ...d, pessoaIds: [...d.pessoaIds] });
      return;
    }
    atual.quotasDoadas += d.quotasDoadas;
    for (const id of d.pessoaIds) {
      if (!atual.pessoaIds.includes(id)) atual.pessoaIds.push(id);
    }
  };

  for (const bloco of blocos) {
    if (bloco.quotasDoadas < 0n) {
      throw new Error(`Quotas doadas negativas por ${bloco.titularNome}.`);
    }
    const { forma } = bloco;

    if (forma.tipo === 'nao-informado') {
      throw new Error(
        `Forma da doação não informada para ${bloco.titularNome}. Sem ela não se sabe `
        + 'se o ato sai em uma GIA ou em uma por cônjuge, e isso muda a faixa da '
        + 'alíquota.',
      );
    }
    if (forma.tipo !== 'individual' && forma.conjugeId === bloco.titularId) {
      throw new Error(`${bloco.titularNome} está declarado como cônjuge de si mesmo.`);
    }

    if (forma.tipo === 'casal-conjunto') {
      acumular({
        doadorId: idDoCasal(bloco.titularId, forma.conjugeId),
        nome: `${bloco.titularNome} e ${forma.conjugeNome}`,
        quotasDoadas: bloco.quotasDoadas,
        pessoaIds: [bloco.titularId, forma.conjugeId],
        ehCasalConjunto: true,
      });
      continue;
    }

    // Individual e casal separado dão o mesmo doador fiscal: o titular, com as
    // quotas dele. A diferença entre as duas está só no instrumento — o cônjuge que
    // não tem quota no quadro não tem o que doar por si.
    acumular({
      doadorId: bloco.titularId,
      nome: bloco.titularNome,
      quotasDoadas: bloco.quotasDoadas,
      pessoaIds: [bloco.titularId],
      ehCasalConjunto: false,
    });
  }

  // Doador sem quota não emite guia.
  return [...porId.values()].filter((d) => d.quotasDoadas > 0n);
}

// ─── Proposta a partir do cadastro ──────────────────────────────────────────

export interface PessoaParaForma {
  id: string;
  denominacao: string;
  estado_civil: string | null;
  regime_bens: string | null;
  conjuge_id: string | null;
}

/**
 * O que o cadastro resolve e o que ele tem de perguntar.
 *
 * `escolha` é o caso do casal em comunhão: o cadastro dá o regime e o cônjuge, mas
 * NÃO diz como o instrumento foi lavrado. A forma vem preenchida com a conjunta —
 * que é o que os instrumentos desta carteira fazem — e fica trocável, com a
 * consequência à vista. Não é pendência: é escolha com padrão declarado.
 */
export type PropostaDeForma =
  | { estado: 'resolvida'; forma: FormaDoDoador }
  | { estado: 'escolha'; forma: FormaDoDoador; conjugeId: string; conjugeNome: string }
  | { estado: 'pede-conjuge'; motivo: string }
  | { estado: 'pede-regime'; motivo: string };

/** Sem acento e em minúsculas, para o casamento de rótulo não depender de grafia. */
const chave = (texto: string): string => texto
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const SEM_CONJUGE = ['solteiro', 'viuvo', 'divorciado'];

export function formaDoCadastro(
  titular: PessoaParaForma,
  nomePorId: Map<string, string>,
): PropostaDeForma {
  const civil = titular.estado_civil ? chave(titular.estado_civil) : '';
  const regime = titular.regime_bens ? chave(titular.regime_bens) : '';

  if (SEM_CONJUGE.some((s) => civil.startsWith(s))) {
    return { estado: 'resolvida', forma: { tipo: 'individual' } };
  }

  const conjugeId = titular.conjuge_id;
  const conjugeNome = conjugeId ? nomePorId.get(conjugeId) ?? null : null;

  // Separação total afasta a comunhão: o cônjuge não tem parte no que se doa.
  if (regime.includes('separacao')) {
    return { estado: 'resolvida', forma: { tipo: 'individual' } };
  }

  if (regime.includes('universal') || regime.includes('parcial')) {
    if (!conjugeId || !conjugeNome) {
      return {
        estado: 'pede-conjuge',
        motivo: `${titular.denominacao} está em ${titular.regime_bens}, então metade do `
          + 'que doa é do cônjuge — mas o cônjuge não está vinculado no cadastro.',
      };
    }
    // COMUNHÃO UNIVERSAL → uma GIA para o casal. PARCIAL → uma para cada.
    //
    // É a regra do manual (págs. 9 e 16: "cada um dos doadores deve preencher uma
    // GIA-ITCD-e referente à sua respectiva parte, conforme previsto pelo regime
    // matrimonial de comunhão parcial de bens"), confirmada pela sênior da OSG.
    //
    // FICA REGISTRADO que o instrumento do Agro Alíança contradiz isso: é comunhão
    // parcial e saiu em UMA DARE (337978, R$ 223.585,87), com os dois qualificados
    // como DOADORES sobre patrimônio indiviso. Por isso a forma segue TROCÁVEL na
    // tela — o padrão é a regra, e o caso concreto pode ser outro.
    const tipo = regime.includes('universal') ? 'casal-conjunto' : 'casal-separado';
    return {
      estado: 'escolha',
      forma: { tipo, conjugeId, conjugeNome },
      conjugeId,
      conjugeNome,
    };
  }

  return {
    estado: 'pede-regime',
    motivo: `${titular.denominacao} não tem regime de bens utilizável no cadastro`
      + (titular.regime_bens ? ` (consta "${titular.regime_bens}")` : '')
      + '. Sem ele não se sabe se o cônjuge doa parte das quotas.',
  };
}
