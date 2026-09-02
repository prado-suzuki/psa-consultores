import { describe, expect, it } from 'vitest';
import {
  candidatosADonatario,
  candidatosADoador,
  type PessoaParaParticipantes,
  type VinculoDeParentesco,
} from '@/lib/osg/participantesItcmd';

const pessoa = (
  id: string,
  extra: Partial<PessoaParaParticipantes> = {},
): PessoaParaParticipantes => ({
  id,
  denominacao: id,
  tipo_pessoa: 'PF',
  is_fundador: false,
  filiacao_pai_pessoa_id: null,
  filiacao_mae_pessoa_id: null,
  ...extra,
});

describe('participantes propostos pelo cadastro', () => {
  it('o filho é o pessoa_id do vínculo, não o parente_pessoa_id', () => {
    // Direção conferida ao vivo no sandbox: em `tipo='Filho(a)'` o `pessoa_id` é
    // quem nasceu em 1990 e o `parente_pessoa_id` é o fundador de 1954, e
    // `pessoa.filiacao_pai_pessoa_id` do primeiro aponta para o segundo. Ou
    // seja: "pessoa_id É Filho(a) DE parente_pessoa_id". Inverter isto propõe o
    // doador como donatário e o resultado inteiro fica trocado.
    const pessoas = [pessoa('fundador', { is_fundador: true }), pessoa('filha')];
    const vinculos: VinculoDeParentesco[] = [
      { pessoa_id: 'filha', parente_pessoa_id: 'fundador', tipo: 'Filho(a)' },
    ];
    expect(candidatosADonatario(['fundador'], pessoas, vinculos).map((c) => c.pessoaId))
      .toEqual(['filha']);
    // O vínculo do fundador não o propõe como donatário de si mesmo.
    expect(candidatosADonatario(['filha'], pessoas, vinculos)).toEqual([]);
    // E tipo diferente de Filho(a) não entra: neto e genro não são herdeiros
    // necessários por este caminho.
    expect(candidatosADonatario(['fundador'], pessoas, [
      { pessoa_id: 'filha', parente_pessoa_id: 'fundador', tipo: 'Neto(a)' },
    ])).toEqual([]);
  });

  it('os dois caminhos de filiação se somam e cada candidato declara de onde veio', () => {
    // O cadastro tem dois caminhos para a mesma informação e nenhum é canônico
    // ainda (CADASTRO-para-calculadora.md §3.2). Ler só um esconderia filhos.
    const pessoas = [
      pessoa('pai', { is_fundador: true }),
      pessoa('mae', { is_fundador: true }),
      pessoa('so_parentesco'),
      pessoa('so_filiacao', { filiacao_pai_pessoa_id: 'pai' }),
      pessoa('ambos', { filiacao_mae_pessoa_id: 'mae' }),
      pessoa('estranho', { filiacao_pai_pessoa_id: 'outro' }),
    ];
    const vinculos: VinculoDeParentesco[] = [
      { pessoa_id: 'so_parentesco', parente_pessoa_id: 'pai', tipo: 'Filho(a)' },
      { pessoa_id: 'ambos', parente_pessoa_id: 'mae', tipo: 'Filho(a)' },
    ];
    // Ordem estável e declarada: primeiro os que o `parentesco` propõe (é o
    // caminho que modela tipo e natureza), depois os que só a filiação trouxe.
    const candidatos = candidatosADonatario(['pai', 'mae'], pessoas, vinculos);
    expect(candidatos).toEqual([
      { pessoaId: 'so_parentesco', origem: 'parentesco' },
      { pessoaId: 'ambos', origem: 'ambos' },
      { pessoaId: 'so_filiacao', origem: 'filiacao' },
    ]);
  });

  it('doador proposto é o sócio pessoa física, com is_fundador pré-marcado', () => {
    // O motor não decide quem doa: propõe e o analista confirma (SPEC §4).
    const pessoas = [
      pessoa('fundador', { is_fundador: true }),
      pessoa('socio_pf'),
      pessoa('holding', { tipo_pessoa: 'PJ' }),
    ];
    const socios = [
      { socio_pessoa_id: 'fundador', quotas: 6_086_672 },
      { socio_pessoa_id: 'socio_pf', quotas: 10 },
      { socio_pessoa_id: 'holding', quotas: 5 },
      { socio_pessoa_id: 'fora-do-cadastro', quotas: 1 },
    ];
    expect(candidatosADoador(socios, pessoas)).toEqual([
      { pessoaId: 'fundador', denominacao: 'fundador', quotas: 6_086_672n, propostoPorFundador: true },
      { pessoaId: 'socio_pf', denominacao: 'socio_pf', quotas: 10n, propostoPorFundador: false },
    ]);
  });
});
