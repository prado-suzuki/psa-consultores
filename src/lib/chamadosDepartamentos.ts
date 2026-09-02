/**
 * Os departamentos de chamado, em um lugar só.
 *
 * A lista vivia copiada em nove arquivos — o formulário de abertura, os filtros,
 * as três telas de detalhe, a listagem e os dois dashboards. Cada cópia era uma
 * chance de o rótulo divergir, e divergia: `MeusChamados` chamava
 * `produtor_rural` de "Produtor Rural" enquanto o resto dizia "Produtor Rural PF",
 * e o cliente via nomes diferentes para a mesma coisa dependendo da tela.
 *
 * A coluna `tickets.department` é `text` livre, sem CHECK no banco, então o que
 * define o conjunto válido é este arquivo — mais um motivo para ele ser um só.
 *
 * A ORDEM aqui é a ordem do seletor que o cliente vê ao abrir o chamado. Ela é
 * deliberada: os temas mais procurados primeiro, e "Outros" sempre por último,
 * para não virar o atalho de quem não quer procurar.
 */
export const DEPARTAMENTOS_CHAMADO = [
  { value: 'contabilidade', label: 'Contabilidade/Societário' },
  { value: 'icms_ipi', label: 'ICMS/IPI' },
  { value: 'irpj_csll', label: 'IRPJ/CSLL' },
  { value: 'pis_cofins', label: 'PIS/COFINS' },
  { value: 'comercio_exterior', label: 'Comércio Exterior' },
  { value: 'reforma_tributaria', label: 'Reforma Tributária (IBS/CBS)' },
  { value: 'produtor_rural', label: 'Produtor Rural PF' },
  { value: 'outros', label: 'Outros' },
] as const;

export type DepartamentoChamado = (typeof DEPARTAMENTOS_CHAMADO)[number]['value'];

/** Valores aceitos, para o schema do formulário de abertura. */
export const DEPARTAMENTO_VALUES = DEPARTAMENTOS_CHAMADO.map((d) => d.value) as [
  DepartamentoChamado,
  ...DepartamentoChamado[],
];

/**
 * Rótulo por valor. `Record<string, string>` de propósito: chamado antigo pode
 * carregar um departamento que saiu da lista, e quem consome resolve o que
 * fazer com o `undefined` — hoje todos caem no próprio valor bruto.
 */
export const departmentLabels: Record<string, string> = Object.fromEntries(
  DEPARTAMENTOS_CHAMADO.map(({ value, label }) => [value, label]),
);

/** Pares [valor, rótulo] para os filtros que montam opções de select. */
export const departamentoOptions = DEPARTAMENTOS_CHAMADO.map(
  ({ value, label }) => [value, label] as [string, string],
);
