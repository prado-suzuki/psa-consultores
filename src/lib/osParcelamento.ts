// Parcelamento da OS — o que a tela deriva do contrato, em funções puras.
//
// O contrato com o cliente é parcelado e o financeiro controla isso em planilha
// (`CONTAS A RECEBER - CONTRATOS A FATURAR`). Na OS, `valor_projeto` é sempre o
// TOTAL do contrato; entrada e nº de parcelas são digitados. O valor de cada
// parcela **não** é digitado nem gravado: é derivado aqui, ao lado dos outros
// três campos, para quem cadastra conferir na hora contra a planilha.
//
// Ver docs/sprints/sprint-11/TAREFA_os-parcelamento-valor-projeto.md.

/** 1 = pagamento único. Mesma faixa da validação da coluna no banco. */
export const PARCELAS_MIN = 1;
export const PARCELAS_MAX = 360;

/**
 * Texto digitado → nº de parcelas do rascunho.
 *
 * Campo vazio vira `null` — "não informado" é diferente de "1 parcela", e é o
 * que as OS antigas têm. `0` também cai em `null`: ele só aparece como resíduo
 * de apagar dígito a dígito, e zero parcela não existe.
 */
export function parseNumeroParcelas(texto: string): number | null {
  const digitos = texto.replace(/\D/g, "").replace(/^0+/, "");
  if (!digitos) return null;
  return Math.min(Number(digitos), PARCELAS_MAX);
}

export interface ParcelamentoOs {
  valorProjeto: number | null | undefined;
  valorEntrada: number | null | undefined;
  numeroParcelas: number | null | undefined;
}

/**
 * `(Valor do Projeto − Entrada) ÷ Nº de parcelas`, arredondado em 2 casas.
 *
 * `null` quando não há nº de parcelas — sem ele não há divisão a fazer, e é o
 * estado das OS cadastradas antes destes campos existirem. A dízima é
 * arredondada de propósito: a diferença de centavos da última parcela é tratada
 * no faturamento, não aqui.
 */
export function calcularValorParcela({
  valorProjeto,
  valorEntrada,
  numeroParcelas,
}: ParcelamentoOs): number | null {
  if (numeroParcelas == null || !Number.isFinite(numeroParcelas) || numeroParcelas < PARCELAS_MIN) {
    return null;
  }
  const aParcelar = (valorProjeto ?? 0) - (valorEntrada ?? 0);
  return Math.round((aParcelar / numeroParcelas) * 100) / 100;
}

/**
 * Entrada maior que o total do contrato. Não barra o salvamento — só acende o
 * aviso na tela, porque o parcelamento resultante fica negativo e isso é sempre
 * erro de digitação (trocar total por parcela é justamente a confusão que estes
 * campos existem para desfazer).
 */
export function entradaExcedeProjeto({ valorProjeto, valorEntrada }: Omit<ParcelamentoOs, "numeroParcelas">): boolean {
  return (valorEntrada ?? 0) > (valorProjeto ?? 0);
}
