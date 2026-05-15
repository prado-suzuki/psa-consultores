import type { NotaMetodologica } from "./NotasMetodologicas";

export const NOTA_TRIBUTO_ANTES: NotaMetodologica = {
  titulo: "Tributo antes",
  texto: (
    <>
      Soma de <code className="font-mono">vICMS + vICMS-ST + vIPI + vPIS + vCOFINS</code>{" "}
      extraídos do XML da NF-e. <strong>Não inclui ISS</strong> (serviços não estão no CSV).
      Valores zero em PIS/COFINS para alguns itens podem refletir regime de substituição
      tributária ou diferimento.
    </>
  ),
};

export const NOTA_TRIBUTO_DEPOIS: NotaMetodologica = {
  titulo: "Tributo depois",
  texto: (
    <>
      Coluna <code className="font-mono">valor_ibs_cbs</code> calculada pelo backend
      considerando anexo (LC 214/2025), redução de alíquota e regime monofásico. Quando
      monofásico, pode incluir ICMS provisório (transição) — ver aba Resumo.
    </>
  ),
};

export const NOTA_BASE_SAIDAS: NotaMetodologica = {
  titulo: "Base de cálculo",
  texto: (
    <>
      Análise baseada em <strong>saídas apenas</strong> (NF-e emitidas pelo contribuinte). Não
      considera créditos de entrada — que serão amplos no regime IBS/CBS e podem reduzir
      ainda mais a carga líquida. Os percentuais representam <strong>carga bruta sobre
      faturamento</strong>, não saldo a recolher.
    </>
  ),
};

export const NOTA_PERIODO_TRANSICAO: NotaMetodologica = {
  titulo: "Período de transição",
  texto: (
    <>
      A reforma é implementada gradualmente entre 2026 e 2033. As alíquotas e regras
      aplicadas aqui consideram o <strong>regime final</strong> (pós-2033), conforme
      classificação por NCM e CFOP definida na Lei Complementar 214/2025.
    </>
  ),
};

export const NOTA_SEM_ANEXO: NotaMetodologica = {
  titulo: '"Sem anexo"',
  texto: (
    <>
      Itens classificados como "Sem anexo" estão sob regra geral da reforma — alíquota
      cheia de <strong>27,5%</strong> sobre o faturamento (sem redução). Tipicamente são
      produtos industriais, peças e insumos sem benefício fiscal específico na LC 214/2025.
    </>
  ),
};
