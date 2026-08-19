// Bloco "Valores" da OS no modo de leitura.
//
// Antes a visualização mostrava só Valor do Projeto e os dois reembolsos, em
// pontos separados da grade. Com o parcelamento os seis valores passam a ficar
// juntos, na mesma ordem da seção 04 da edição — quem confere a OS contra a
// planilha do financeiro lê total, parcelas, entrada e parcela de uma vez.

import FieldPair from "./FieldPair";
import { formatCurrencyDisplay } from "./constants";
import { calcularValorParcela } from "@/lib/osParcelamento";
import type { DraftOrdemServico } from "@/types/clientForm";

export interface OsValoresLeituraProps {
  contrato: DraftOrdemServico;
  /**
   * Colunas da grade. Quatro na aba de OS, que ocupa a largura do modal; três na
   * aba de Faturamento, onde o bloco tem metade dela: com duas, os seis valores
   * ocupavam três linhas e obrigavam a rolar; com três cabem em duas linhas, e o
   * rótulo mais longo ("Reembolso Refeição") ainda cabe.
   */
  colunas?: 2 | 3 | 4;
}

export default function OsValoresLeitura({ contrato, colunas = 4 }: OsValoresLeituraProps) {
  const valorParcela = calcularValorParcela({
    valorProjeto: contrato.valor_projeto,
    valorEntrada: contrato.valor_entrada,
    numeroParcelas: contrato.numero_parcelas,
  });

  return (
    // Com quatro colunas o contrato ocupa a primeira linha inteira e os dois
    // reembolsos caem sozinhos na segunda, na mesma separação da edição.
    <div
      className={`grid grid-cols-2 gap-x-6 gap-y-3 [&>*]:min-w-0 ${
        colunas === 4 ? 'md:grid-cols-4' : colunas === 3 ? 'md:grid-cols-3' : ''
      }`}
    >
      <FieldPair label="Valor do Projeto" value={formatCurrencyDisplay(contrato.valor_projeto || 0)} />
      {/* OS anterior aos campos novos fica em "—": é dado que ninguém informou,
          e exibir "1" ali inventaria um pagamento único que não foi combinado. */}
      <FieldPair
        label="Nº de Parcelas"
        value={contrato.numero_parcelas != null ? String(contrato.numero_parcelas) : "—"}
      />
      <FieldPair label="Entrada" value={formatCurrencyDisplay(contrato.valor_entrada || 0)} />
      <FieldPair
        label="Valor da Parcela"
        value={valorParcela != null ? formatCurrencyDisplay(valorParcela) : "—"}
      />
      <FieldPair label="Reembolso por KM" value={formatCurrencyDisplay(contrato.valor_reembolso_km || 0)} />
      <FieldPair label="Reembolso Refeição" value={formatCurrencyDisplay(contrato.valor_reembolso_refeicao || 0)} />
    </div>
  );
}
