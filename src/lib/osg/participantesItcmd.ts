// Quem o cadastro PROPÕE como doador e como donatário.
//
// A lista de herdeiros necessários é lista, não contagem, e o motor **não**
// aplica o art. 1.829, I do Código Civil para decidir se o cônjuge concorre: o
// cadastro propõe candidatos e o analista confirma (SPEC §4). O regime de bens
// não resolve sozinho — em comunhão parcial depende de haver bens particulares,
// e o campo de separação total não distingue convencional de obrigatória.
//
// Direção do vínculo de parentesco, conferida ao vivo no sandbox: em
// `tipo = 'Filho(a)'` o `pessoa_id` é o FILHO e o `parente_pessoa_id` é o pai ou
// a mãe (`pessoa.filiacao_pai_pessoa_id` do primeiro aponta para o segundo).
// Inverter isso propõe o doador como donatário e troca o resultado inteiro — é
// por isso que existe teste só para a direção.
//
// Os dois caminhos de filiação (`parentesco` e `pessoa.filiacao_*_pessoa_id`)
// são lidos JUNTOS porque nenhum é canônico ainda
// (CADASTRO-para-calculadora.md §3.2); a origem de cada candidato vai declarada
// para o analista saber de onde a sugestão veio.

export interface PessoaParaParticipantes {
  id: string;
  denominacao: string;
  tipo_pessoa: string | null;
  is_fundador: boolean | null;
  filiacao_pai_pessoa_id: string | null;
  filiacao_mae_pessoa_id: string | null;
}

export interface VinculoDeParentesco {
  pessoa_id: string;
  parente_pessoa_id: string;
  tipo: string | null;
}

export interface SocioComQuotas {
  socio_pessoa_id: string;
  quotas: number | null;
}

export interface CandidatoADoador {
  pessoaId: string;
  denominacao: string;
  /** Quotas do sócio na empresa — patrimônio a doar, base da legítima. */
  quotas: bigint;
  /** `is_fundador` no cadastro: é o que a tela pré-marca. */
  propostoPorFundador: boolean;
}

export interface CandidatoADonatario {
  pessoaId: string;
  origem: 'parentesco' | 'filiacao' | 'ambos';
}

/** Tipo de vínculo que propõe herdeiro necessário. Neto e genro não entram. */
const TIPO_FILHO = 'Filho(a)';

/**
 * Sócios pessoa física da empresa, na ordem em que chegam (o hook já ordena por
 * quotas). Sócio PJ fica fora: quem tem legítima é pessoa natural. Sócio sem
 * pessoa no cadastro do cliente também fica fora — não há como qualificá-lo.
 */
export function candidatosADoador(
  socios: SocioComQuotas[],
  pessoas: PessoaParaParticipantes[],
): CandidatoADoador[] {
  const porId = new Map(pessoas.map((p) => [p.id, p]));
  return socios.flatMap((s) => {
    const p = porId.get(s.socio_pessoa_id);
    if (!p || p.tipo_pessoa !== 'PF') return [];
    return [{
      pessoaId: p.id,
      denominacao: p.denominacao,
      quotas: BigInt(s.quotas ?? 0),
      propostoPorFundador: p.is_fundador === true,
    }];
  });
}

/** Filhos dos doadores escolhidos, pelos dois caminhos do cadastro. */
export function candidatosADonatario(
  doadorIds: string[],
  pessoas: PessoaParaParticipantes[],
  vinculos: VinculoDeParentesco[],
): CandidatoADonatario[] {
  const doadores = new Set(doadorIds);

  const porParentesco = new Set(
    vinculos
      .filter((v) => v.tipo === TIPO_FILHO && doadores.has(v.parente_pessoa_id))
      .map((v) => v.pessoa_id),
  );

  const porFiliacao = new Set(
    pessoas
      .filter((p) => (
        (p.filiacao_pai_pessoa_id != null && doadores.has(p.filiacao_pai_pessoa_id))
        || (p.filiacao_mae_pessoa_id != null && doadores.has(p.filiacao_mae_pessoa_id))
      ))
      .map((p) => p.id),
  );

  // Um doador não é donatário de si mesmo, mesmo que o cadastro tenha um vínculo
  // circular (o sandbox tem um neto homônimo do avô).
  const candidatos: CandidatoADonatario[] = [];
  const vistos = new Set<string>();
  const registrar = (pessoaId: string) => {
    if (doadores.has(pessoaId) || vistos.has(pessoaId)) return;
    vistos.add(pessoaId);
    const noParentesco = porParentesco.has(pessoaId);
    const naFiliacao = porFiliacao.has(pessoaId);
    candidatos.push({
      pessoaId,
      origem: noParentesco && naFiliacao ? 'ambos' : noParentesco ? 'parentesco' : 'filiacao',
    });
  };

  // Ordem estável: primeiro o que o `parentesco` propõe (é o caminho que modela
  // tipo e natureza), depois o que só a filiação direta trouxe.
  for (const v of vinculos) {
    if (v.tipo === TIPO_FILHO && doadores.has(v.parente_pessoa_id)) registrar(v.pessoa_id);
  }
  for (const p of pessoas) {
    if (porFiliacao.has(p.id)) registrar(p.id);
  }

  return candidatos;
}
