import type { SimulacaoSalva } from '@/hooks/useSimulacoesItcmd';

/**
 * Uma simulação gravada, para os testes da lista e da tela aberta lerem o MESMO
 * retrato. Os números são do Agro Aliança: capital de 9.557.944 quotas, UPF de
 * fev/2026.
 */
export const simulacaoSalva = (
  campos: Partial<SimulacaoSalva> = {},
): SimulacaoSalva => ({
  id: 'S1',
  versao: 1,
  nome: null,
  status: 'gerada',
  competencia: '2026-02',
  upf: '255.20',
  totalDeQuotas: '9557944',
  criadaEm: '2026-02-10T12:00:00Z',
  observacao: null,
  origemSimulacaoId: null,
  acervoPorCenario: { contabil: '9557944.00', itr: '5000000.00', mercado: '12000000.00' },
  impostoPorCenario: { contabil: '186864.00', itr: '90000.00', mercado: '250000.00' },
  // O total do ato: a doação mais a guia de instituição de usufruto.
  totalPorCenario: { contabil: '195000.00', itr: '93000.00', mercado: '258000.00' },
  comReserva: true,
  pctBaseReserva: '100.00',
  pctBaseInstituicao: '70.00',
  usufruto: [
    {
      pessoaId: 'p1', nome: 'Avelino', papel: 'usufrui',
      quotas: '1152528', quotasPlena: '1152528',
      quotasNuaReserva: '0', quotasNuaInstituicao: '0', quotasUsufruto: '3295972',
    },
    {
      pessoaId: 'p2', nome: 'Cristina', papel: 'concede',
      quotas: '4778972', quotasPlena: '1270000',
      quotasNuaReserva: '3295972', quotasNuaInstituicao: '213000',
      quotasUsufruto: '0',
    },
  ],
  concessoes: [
    {
      deId: 'p2', deNome: 'Cristina', paraId: 'p1', paraNome: 'Avelino',
      origem: 'reserva', quotas: '3295972',
      basePorCenario: { contabil: null, itr: null, mercado: null },
      impostoPorCenario: { contabil: null, itr: null, mercado: null },
    },
    {
      deId: 'p2', deNome: 'Cristina', paraId: 'p1', paraNome: 'Avelino',
      origem: 'instituicao', quotas: '213000',
      basePorCenario: { contabil: '149100.00', itr: '76000.00', mercado: '186000.00' },
      impostoPorCenario: { contabil: '8136.00', itr: '3000.00', mercado: '8000.00' },
    },
  ],
  doadores: [{
    pessoaId: 'p1',
    nome: 'Avelino',
    quotas: '4448500',
    quotasTransmitidas: '3295972',
    quotasFinal: '1152528',
    emissaoConjunta: true,
    conjugeNome: 'Iracema',
    // O Avelino aportou: é o cenário que dispensa a reserva de usufruto.
    vlrAporteMoeda: '3000000.00',
    quotasDoAporte: '3000000',
  }],
  donatarios: [
    {
      pessoaId: 'p2',
      nome: 'Cristina',
      quotasAtuais: '1483000',
      quotasLegitima: '1112125',
      quotasDisponivel: '2183847',
      quotasFinal: '4778972',
      vlrAporteMoeda: '0.00',
      quotasDoAporte: '0',
      percentual: '50.0000',
    },
  ],
  // O RESULTADO, por guia. Um doador só: a guia dele para cada donatária.
  gias: [
    {
      doadorId: 'p1', doadorNome: 'Avelino', donatarioId: 'p2', donatarioNome: 'Cristina',
      quotasRecebidas: '3295972', pctDaGia: '100.0000', doacaoAnterior: null,
      basePorCenario: { contabil: '3295972.00', itr: '1700000.00', mercado: '4100000.00' },
      impostoPorCenario: { contabil: '93432.00', itr: '45000.00', mercado: '125000.00' },
    },
  ],
  ...campos,
});
