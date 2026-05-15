/** Tooltips reutilizados pelos filtros principais e internos das abas. */
export const AUDITORIA_TOOLTIPS = {
  cliente: "Cliente cuja base fiscal será analisada. Obrigatório.",
  contribuinte:
    "CNPJ/contribuinte específico do cliente. Quando há apenas um, é selecionado automaticamente. Obrigatório.",
  dataInicio: "Data inicial do período a ser cruzado entre as fontes (Balancete, EFD, XML). Obrigatório.",
  dataFim: "Data final do período a ser cruzado entre as fontes (Balancete, EFD, XML). Obrigatório.",
  contaContabil: "Filtra a árvore de contas pelo código ou descrição.",
  periodoFechado: "Quando ativo, mostra apenas o saldo do último mês acumulado.",
  chaveNfe: "Filtra os documentos pela chave de acesso da NFe (44 dígitos).",
  cfopIntervalo: "Filtra os lotes pelo CFOP ou pelo intervalo de numeração informado.",
} as const;
