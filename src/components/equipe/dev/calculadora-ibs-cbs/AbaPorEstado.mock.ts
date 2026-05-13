// Mock baseado em dados REAIS do CSV de saídas Barralcool 2025
// (1000 itens, faturamento R$ 53.611.064,29).
//
// Modelagem em FATOS BRUTOS por (UF, NCM, anexo) — todos os agregados
// (KPIs, sankey, tabelas) são calculados via useMemo a partir desses fatos,
// permitindo aplicar filtros de UF/Anexo localmente sem reprocessar nada.
//
// Quando o endpoint /api/v1/calculadora_ibs_cbs/por_uf for entregue,
// substituir esta fonte por hook real — a estrutura derivada não muda.

export type NaturezaDestino = "interno" | "interestadual" | "exportacao";

export interface FatoUfProduto {
  uf: string;
  ncm: string;
  xProd: string;
  anexo: string;
  natureza: NaturezaDestino;
  faturamento: number;
  tributoAntes: number;
  tributoDepois: number;
  qtdNFs: number;
  qtdItens: number;
}

export interface FatoCliente {
  nome: string;
  uf: string;
  natureza: NaturezaDestino;
  ncmPrincipal: string;
  produtoPrincipal: string;
  anexoPrincipal: string;
  faturamento: number;
  tributoAntes: number;
  tributoDepois: number;
  qtdNFs: number;
}

// ── FATOS BRUTOS POR UF × NCM ────────────────────────────────────────────────
// uf_emit sempre = MT → natureza interno se uf_dest=MT, senão interestadual.
// (CFOP iniciado em 7 inexistente neste CSV — sem exportação.)
export const FATOS_POR_UF_PRODUTO: FatoUfProduto[] = [
  { uf: "RO", ncm: "17011400", xProd: "Açúcar Cristal 10x2 20kg", anexo: "Anexo I", natureza: "interestadual", faturamento: 32523935.05, tributoAntes: 3902872.21, tributoDepois: 0, qtdNFs: 309, qtdItens: 309 },
  { uf: "MT", ncm: "17011400", xProd: "Açúcar Cristal 10x2 20kg", anexo: "Anexo I", natureza: "interno", faturamento: 18586653.99, tributoAntes: 2780271.76, tributoDepois: 0, qtdNFs: 625, qtdItens: 626 },
  { uf: "AP", ncm: "08119000", xProd: "Açaí em caroço", anexo: "Anexo XV", natureza: "interestadual", faturamento: 694400, tributoAntes: 0, tributoDepois: 0, qtdNFs: 4, qtdItens: 4 },
  { uf: "AC", ncm: "17011400", xProd: "Açúcar Cristal 10x2 20kg", anexo: "Anexo I", natureza: "interestadual", faturamento: 650774.67, tributoAntes: 78092.96, tributoDepois: 0, qtdNFs: 22, qtdItens: 22 },
  { uf: "PA", ncm: "17011400", xProd: "Açúcar Cristal 10x2 20kg", anexo: "Anexo I", natureza: "interestadual", faturamento: 582047.93, tributoAntes: 77252.82, tributoDepois: 0, qtdNFs: 10, qtdItens: 10 },
  { uf: "MT", ncm: "84272090", xProd: "Plataforma elevatória (locação)", anexo: "Sem anexo", natureza: "interno", faturamento: 410286.48, tributoAntes: 0, tributoDepois: 112828.79, qtdNFs: 3, qtdItens: 3 },
  { uf: "SP", ncm: "84836090", xProd: "Acoplamento Lamiflex Powerflex", anexo: "Sem anexo", natureza: "interestadual", faturamento: 66000, tributoAntes: 0, tributoDepois: 18150, qtdNFs: 3, qtdItens: 4 },
  { uf: "MT", ncm: "38089119", xProd: "Inseticida Polo 500 SC", anexo: "Anexo IX", natureza: "interno", faturamento: 30600, tributoAntes: 0, tributoDepois: 3366, qtdNFs: 3, qtdItens: 3 },
  { uf: "GO", ncm: "17011400", xProd: "Açúcar Cristal 10x2 20kg", anexo: "Anexo I", natureza: "interestadual", faturamento: 24580.8, tributoAntes: 2949.7, tributoDepois: 0, qtdNFs: 1, qtdItens: 1 },
  { uf: "MT", ncm: "38089199", xProd: "Acaricida Clorpirifos EC 20", anexo: "Anexo IX", natureza: "interno", faturamento: 19344, tributoAntes: 0, tributoDepois: 2127.84, qtdNFs: 1, qtdItens: 1 },
  { uf: "GO", ncm: "73079900", xProd: "Abraçadeira Assert", anexo: "Sem anexo", natureza: "interestadual", faturamento: 17414, tributoAntes: 0, tributoDepois: 4788.85, qtdNFs: 3, qtdItens: 5 },
  { uf: "SP", ncm: "84433240", xProd: "Multifuncional Lexmark CX725DH", anexo: "Sem anexo", natureza: "interestadual", faturamento: 1700, tributoAntes: 0, tributoDepois: 467.5, qtdNFs: 1, qtdItens: 1 },
  { uf: "SP", ncm: "82079000", xProd: "Acoplamento hidráulico turbo", anexo: "Sem anexo", natureza: "interestadual", faturamento: 1500, tributoAntes: 0, tributoDepois: 412.5, qtdNFs: 1, qtdItens: 1 },
  { uf: "SP", ncm: "87082999", xProd: "Peça automotiva", anexo: "Sem anexo", natureza: "interestadual", faturamento: 1200, tributoAntes: 228.6, tributoDepois: 330, qtdNFs: 1, qtdItens: 1 },
  { uf: "MT", ncm: "39269090", xProd: "Válvula Docol Salvágua", anexo: "Sem anexo", natureza: "interno", faturamento: 321.27, tributoAntes: 29.72, tributoDepois: 88.35, qtdNFs: 1, qtdItens: 1 },
  { uf: "GO", ncm: "90279099", xProd: "Tubulação Pharmed Thermo", anexo: "Sem anexo", natureza: "interestadual", faturamento: 159.42, tributoAntes: 11.57, tributoDepois: 43.84, qtdNFs: 1, qtdItens: 1 },
  { uf: "MT", ncm: "87089200", xProd: "Abraçadeira escape CAT 120H", anexo: "Sem anexo", natureza: "interno", faturamento: 62.32, tributoAntes: 10.59, tributoDepois: 17.14, qtdNFs: 1, qtdItens: 1 },
  { uf: "MT", ncm: "38231300", xProd: "Ácido graxo", anexo: "Sem anexo", natureza: "interno", faturamento: 30.57, tributoAntes: 0, tributoDepois: 8.41, qtdNFs: 1, qtdItens: 1 },
  { uf: "MT", ncm: "87089990", xProd: "Abraçadeira terminal direção", anexo: "Sem anexo", natureza: "interno", faturamento: 26.47, tributoAntes: 4.5, tributoDepois: 7.28, qtdNFs: 1, qtdItens: 1 },
  { uf: "AM", ncm: "17019900", xProd: "Açúcar cristal", anexo: "Anexo I", natureza: "interestadual", faturamento: 16.16, tributoAntes: 1.94, tributoDepois: 0, qtdNFs: 2, qtdItens: 2 },
  { uf: "MT", ncm: "73269090", xProd: "Abraçadeira 5P0597", anexo: "Sem anexo", natureza: "interno", faturamento: 8.41, tributoAntes: 1.43, tributoDepois: 2.31, qtdNFs: 1, qtdItens: 1 },
  { uf: "SP", ncm: "17019900", xProd: "Açúcar cristal", anexo: "Anexo I", natureza: "interestadual", faturamento: 2.75, tributoAntes: 0, tributoDepois: 0, qtdNFs: 1, qtdItens: 1 },
];

// ── FATOS BRUTOS POR CLIENTE ─────────────────────────────────────────────────
// Top clientes agregados por nome (consolida filiais).
// 187 clientes totais — apenas top 12 listados para o ranking.
export const FATOS_CLIENTES: FatoCliente[] = [
  { nome: "Irmãos Gonçalves Com. e Ind.", uf: "RO", natureza: "interestadual", ncmPrincipal: "17011400", produtoPrincipal: "Açúcar Cristal", anexoPrincipal: "Anexo I", faturamento: 10775049.7, tributoAntes: 1293005.96, tributoDepois: 0, qtdNFs: 84 },
  { nome: "Sendas Distribuidora S/A (Assaí)", uf: "RO", natureza: "interestadual", ncmPrincipal: "17011400", produtoPrincipal: "Açúcar Cristal", anexoPrincipal: "Anexo I", faturamento: 5572980.79, tributoAntes: 745929.54, tributoDepois: 0, qtdNFs: 72 },
  { nome: "Sudoeste Ind. Com. Alimentos", uf: "RO", natureza: "interestadual", ncmPrincipal: "17011400", produtoPrincipal: "Açúcar Cristal", anexoPrincipal: "Anexo I", faturamento: 5135105.2, tributoAntes: 616212.62, tributoDepois: 0, qtdNFs: 43 },
  { nome: "WMS Supermercados (Walmart)", uf: "MT", natureza: "interno", ncmPrincipal: "17011400", produtoPrincipal: "Açúcar Cristal", anexoPrincipal: "Anexo I", faturamento: 5096501.43, tributoAntes: 762693, tributoDepois: 0, qtdNFs: 54 },
  { nome: "Atacadão S.A", uf: "RO", natureza: "interestadual", ncmPrincipal: "17011400", produtoPrincipal: "Açúcar Cristal", anexoPrincipal: "Anexo I", faturamento: 2712094.56, tributoAntes: 325451.36, tributoDepois: 0, qtdNFs: 19 },
  { nome: "C.T. da Luz Distribuidora", uf: "RO", natureza: "interestadual", ncmPrincipal: "17011400", produtoPrincipal: "Açúcar Cristal", anexoPrincipal: "Anexo I", faturamento: 2672313, tributoAntes: 320677.56, tributoDepois: 0, qtdNFs: 23 },
  { nome: "A. Tomasi & Cia Ltda", uf: "RO", natureza: "interestadual", ncmPrincipal: "17011400", produtoPrincipal: "Açúcar Cristal", anexoPrincipal: "Anexo I", faturamento: 1989878.03, tributoAntes: 238785.37, tributoDepois: 0, qtdNFs: 17 },
  { nome: "Del Moro & Del Moro Ltda", uf: "MT", natureza: "interno", ncmPrincipal: "17011400", produtoPrincipal: "Açúcar Cristal", anexoPrincipal: "Anexo I", faturamento: 1967529.63, tributoAntes: 294441.43, tributoDepois: 0, qtdNFs: 24 },
  { nome: "Mercantil Nova Era Ltda", uf: "RO", natureza: "interestadual", ncmPrincipal: "17011400", produtoPrincipal: "Açúcar Cristal", anexoPrincipal: "Anexo I", faturamento: 1544903.11, tributoAntes: 185388.35, tributoDepois: 0, qtdNFs: 25 },
  { nome: "Brasil Distribuidora Aliment.", uf: "RO", natureza: "interestadual", ncmPrincipal: "17011400", produtoPrincipal: "Açúcar Cristal", anexoPrincipal: "Anexo I", faturamento: 812307.45, tributoAntes: 97476.9, tributoDepois: 0, qtdNFs: 8 },
  { nome: "Juba Supermercados Ltda", uf: "MT", natureza: "interno", ncmPrincipal: "17011400", produtoPrincipal: "Açúcar Cristal", anexoPrincipal: "Anexo I", faturamento: 812190.94, tributoAntes: 121544.62, tributoDepois: 0, qtdNFs: 9 },
  { nome: "Comercial Carapá Secos e Molhados", uf: "MT", natureza: "interno", ncmPrincipal: "17011400", produtoPrincipal: "Açúcar Cristal", anexoPrincipal: "Anexo I", faturamento: 804228.97, tributoAntes: 120353.12, tributoDepois: 0, qtdNFs: 11 },
];

export const TOTAL_CLIENTES_DISTINTOS = 187;
