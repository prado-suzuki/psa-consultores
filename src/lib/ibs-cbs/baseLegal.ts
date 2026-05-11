export interface BaseLegalEntry {
  artigo: string;
  texto: string;
}

export const BASE_LEGAL: Record<string, BaseLegalEntry> = {
  "Anexo I": {
    artigo: "Art. 125",
    texto:
      "Alíquotas do IBS e da CBS reduzidas a zero sobre vendas de produtos destinados à alimentação humana listados no Anexo I (Cesta Básica Nacional de Alimentos), conforme EC 132/2023.",
  },
  "Anexo VII": {
    artigo: "Art. 135",
    texto:
      "Alíquotas do IBS e da CBS reduzidas em 60% sobre o fornecimento de alimentos destinados ao consumo humano listados no Anexo VII, com classificações NCM/SH.",
  },
  "Anexo IX": {
    artigo: "Art. 138",
    texto:
      "Alíquotas do IBS e da CBS reduzidas em 60% sobre o fornecimento de insumos agropecuários e aquícolas listados no Anexo IX, com classificações NCM/SH e NBS.",
  },
  "Anexo XV": {
    artigo: "Art. 148",
    texto:
      "Alíquotas do IBS e da CBS reduzidas a zero sobre o fornecimento de produtos hortícolas, frutas e ovos listados no Anexo XV, com classificações NCM/SH.",
  },
  "Seção VI": {
    artigo: "Art. 180 (Monofásico)",
    texto:
      "Vedada a apropriação de créditos sobre aquisições de combustíveis sujeitos à incidência única do IBS e da CBS quando destinadas à distribuição, comercialização ou revenda.",
  },
  "Art. 28": {
    artigo: "Energia elétrica",
    texto:
      "Nas operações com energia elétrica ou com direitos a ela relacionados, o recolhimento do IBS e da CBS relativo à geração, comercialização, distribuição e transmissão será realizado exclusivamente:\n\n§ 1º O recolhimento do IBS e da CBS incidentes nas operações com energia elétrica, ou com direitos a ela relacionados, relativas à geração, comercialização, distribuição e transmissão ocorrerá somente no fornecimento:\n  I — para consumo; ou\n  II — para contribuinte não sujeito ao regime regular do IBS e da CBS.",
  },
};
