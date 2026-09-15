/**
 * As praças de atendimento da PSA, como código e nome.
 *
 * Moradia única dos sete códigos. Morava dentro do `ContratosTab.tsx`, e saiu de
 * lá quando o Controle de Projetos da OSG passou a precisar do mesmo de-para:
 * uma segunda cópia da lista significaria praça nova aparecendo numa tela e não
 * na outra.
 *
 * `ordem_servico.regiao` guarda o CÓDIGO (153 das 155 OS em produção estão
 * preenchidas, em 15/09/2026). O nome só existe aqui.
 */
export interface Regiao {
  value: string;
  label: string;
}

export const REGIAO_OPTIONS: Regiao[] = [
  { value: 'BRA', label: 'BRA - Bahia, Goiás, Distrito Federal' },
  { value: '3NO', label: '3NO - BR-163 Norte' },
  { value: '3SU', label: '3SU - BR-163 Sul, Vale do Araguaia, Serra da Petrovina, Norte do MS' },
  { value: 'PAR', label: 'PAR - Chapadão do Parecis, região sucroalcooleira, Rondônia' },
  { value: 'CBA', label: 'CBA - Baixada Cuiabana' },
  { value: 'RAO', label: 'RAO - Sul do MS, Paraná, SC, Cerrado Mineiro, São Paulo' },
  { value: 'MPT', label: 'MPT - Mapito, BR-010, Pará' },
];

/**
 * O nome da praça, ou o próprio código quando ele não está na lista.
 *
 * Devolver o código cru em vez de vazio é deliberado: `regiao` é texto livre no
 * banco, e esconder um valor que existe faria a tela mentir sobre o cadastro.
 */
export function getRegiaoLabel(value: string | null | undefined): string {
  if (!value) return '—';
  return REGIAO_OPTIONS.find((opcao) => opcao.value === value)?.label || value;
}
