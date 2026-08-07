/**
 * Codigo HTTP em linguagem de negocio. Sem isso "422" nao diz nada para quem
 * nao e da area — e o grafico de status vira um eixo de numeros soltos.
 */
const STATUS_HTTP: Record<number, string> = {
  200: 'OK — a chamada funcionou e devolveu dados.',
  201: 'Criado — a chamada gravou um registro novo.',
  202: 'Aceito — a chamada entrou na fila e será processada depois.',
  204: 'OK sem conteúdo — funcionou, mas não havia nada para devolver.',
  206: 'Conteúdo parcial — devolveu só um pedaço do arquivo (download em partes).',
  304: 'Não modificado — o navegador reusou o que já tinha em cache.',
  400: 'Requisição inválida — o pedido chegou malformado.',
  401: 'Não autenticado — faltou token ou ele expirou.',
  403: 'Sem permissão — autenticado, mas sem acesso a esse recurso.',
  404: 'Não encontrado — a rota ou o registro não existe.',
  405: 'Método não permitido — usou GET onde só aceita POST, por exemplo.',
  409: 'Conflito — o registro já existe ou mudou desde a leitura.',
  422: 'Dados não processáveis — o formato está certo, mas o conteúdo não passou na validação (campo faltando, CNPJ inválido, período fora da faixa).',
  429: 'Excesso de chamadas — bateu no limite de requisições por minuto.',
  500: 'Erro interno — a API quebrou. Falha nossa.',
  502: 'Gateway inválido — o serviço intermediário não conseguiu resposta.',
  503: 'Serviço indisponível — a API está fora do ar ou sobrecarregada.',
  504: 'Tempo esgotado — o servidor demorou demais e a chamada foi cortada.',
};

export function explicarStatus(codigo: number): string {
  const conhecido = STATUS_HTTP[codigo];
  if (conhecido) return `${codigo} · ${conhecido}`;
  if (codigo >= 500) return `${codigo} · Falha do servidor.`;
  if (codigo >= 400) return `${codigo} · Erro do chamador.`;
  if (codigo >= 300) return `${codigo} · Redirecionamento.`;
  return `${codigo} · Sucesso.`;
}

/**
 * Tooltip de CADA coluna de tabela. Em tabela nao ha espaco para um icone de
 * informacao ao lado de um rotulo de 4 letras, entao o gatilho e o proprio
 * texto do cabecalho (sublinhado pontilhado). Toda coluna tem verbete: a que
 * parece obvia para quem construiu costuma ser a que trava quem le.
 */
export const TOOLTIP_COLUNA = {
  consultas: 'Requisições em que a pessoa consultou dados na tela, sem gerar arquivo.',
  downloads: 'Requisições que terminaram em arquivo na máquina da pessoa — download de original ou exportação para Excel.',
  endpoint: 'Rota da API com os identificadores trocados por marcadores, para agrupar chamadas do mesmo recurso.',
  ferramentaDoEndpoint: 'Ferramenta do portal à qual essa rota pertence.',
  chamadas: 'Total de requisições à rota no período.',
  erros5xx: 'Respostas 500–599: o servidor falhou. É a contagem que indica serviço quebrado.',
  taxa5xx: 'Falhas de servidor divididas pelo total de chamadas da rota.',
  erros4xx: 'Respostas 400–499: erro de quem chamou — rota inexistente, dado inválido, sem permissão.',
  p95: 'Percentil 95 da latência: 95% das chamadas terminaram abaixo deste tempo.',
  p50: 'Mediana da latência: metade das chamadas terminou abaixo deste tempo.',

  pessoa: 'Nome da pessoa que originou as ações. Contas de automação ficam fora desta lista.',
  requisicoes: 'Requisições que a pessoa fez às ferramentas no período.',
  errosPessoa: 'Requisições da pessoa que voltaram com erro.',
  taxaErroPessoa: 'Erros divididos pelas requisições da pessoa. Revela quem erra muito com pouco volume.',
  latenciaMedia: 'Tempo médio de resposta das requisições dessa pessoa.',
  diasAtivos: 'Em quantos dias distintos a pessoa usou alguma ferramenta. Separa rotina de uso pontual.',
  ferramentasDistintas: 'Quantas ferramentas diferentes a pessoa acionou, de um catálogo de 14.',
  acoes: 'Soma do que a pessoa fez: uso das ferramentas mais envio de documentos.',

  pastaCliente: 'Pasta do cliente no Drive de onde os arquivos foram lidos. É a pasta, não a empresa.',
  ingeridos:
    'Arquivos que entraram na base. Conta ARQUIVO, não requisição: um XML de NF-e é 1, um SPED com milhares de registros também é 1. Verificado na origem — cada linha equivale a uma chave/uuid distinto.',
  rejeitados: 'Documentos que não chegaram à base. Verificado: nenhum entrou depois.',
  duplicatas: 'Recusados porque o documento já estava na base. Retrabalho, não perda.',
  naoClassificado: 'Falhas que não são duplicidade, namespace inválido nem contribuinte inválido.',
  ultimaFalha: 'Data da falha mais recente registrada para essa pessoa.',
  documentos:
    'Arquivos que a pessoa subiu e que foram processados. Unidade diferente das colunas de consulta e download, que contam requisições.',
} as const;

/** Textos metodologicos compartilhados pelas visoes tecnica e gerencial. */
export const TOOLTIP_TECNICO = {
  requisicoesPorUsuario:
    'Total de requisições dividido pelo número de pessoas ativas no período. Mede intensidade de uso, não adoção.',
  documentosNaBase:
    'Documentos que pessoas da equipe subiram e que estão gravados na base. Envios da automação são contados à parte.',
  naoEntraram:
    'Tentativas em que o documento NÃO chegou à base — namespace XML inválido, contribuinte inválido ou causa não classificada. Verificado: nenhum desses arquivos apareceu na base depois, então é perda, não fila.',
  reenvios:
    'Tentativas recusadas porque o documento JÁ estava na base. Nada se perdeu; é retrabalho de subir o mesmo arquivo de novo.',
  evolucaoIngestao:
    'Entraram é documento novo gravado. Não entraram é perda. Reenvio é o mesmo documento subido outra vez — fica separado para não inflar a leitura de falha.',
  clientes:
    'Pastas de cliente que receberam envio da equipe no período. Envios da automação não entram — apenas o que pessoas subiram.',
  statusResposta:
    'Código HTTP devolvido pela API. 2xx é sucesso, 4xx é erro de quem chamou (rota errada, dado inválido, sem permissão) e 5xx é falha do servidor. Passe o mouse em cada barra para ver o significado do código.',
  diasComUso:
    'Em quantos dias distintos do período essa pessoa fez ao menos uma chamada. Serve para separar quem usa a ferramenta na rotina de quem fez tudo num dia só.',
  ferramentasDistintas:
    'Quantas ferramentas diferentes a pessoa acionou no período — de um catálogo de 14. Amplitude de uso, não volume.',
  volumeRelativo:
    'Barra proporcional ao maior valor da coluna Chamadas. É leitura visual do ranking, não uma métrica separada.',
  endpointColuna:
    'Rota da API com os identificadores substituídos por marcadores, para que chamadas do mesmo recurso sejam agrupadas.',
  erros5xx:
    'Respostas 500-599: falha do servidor. E o numero que indica servico quebrado.',
  erros4xx:
    'Respostas 400-499: erro do chamador (rota inexistente, payload invalido, sem permissao). Nem sempre e defeito da API.',
  chamadas:
    'Total de requisições observadas no período, incluindo contas de automação. Não exclui chamadas sem cliente identificado.',
  taxaErro:
    'Respostas HTTP com status 400 ou superior divididas pelo total de chamadas. A referência operacional provisória é até 2%.',
  p50: 'Mediana da latência: metade das chamadas terminou abaixo deste tempo.',
  p95: 'Percentil 95 da latência: 95% das chamadas terminou abaixo deste tempo.',
  latencias: 'p50 mostra a experiência típica; p95 evidencia a cauda das chamadas mais lentas.',
  erroLatencia:
    'A taxa de erro usa o eixo esquerdo. p50 e p95 usam o eixo direito e mostram a experiência típica e a cauda lenta.',
  usuariosHumanos:
    'Pessoas distintas com ao menos uma chamada no período. Contas marcadas como automação ficam fora desta contagem.',
  ferramentas:
    'Ferramentas distintas identificadas nas rotas da API. O volume considera todo o tráfego, inclusive chamadas sem contribuinte resolvido.',
  falhasIngestao:
    'Tentativas de ingestão que terminaram com erro. Um mesmo arquivo pode aparecer mais de uma vez quando houve reenvio.',
  causasFalha:
    'Classificação calculada a partir da mensagem real da falha, separando duplicidade, namespace e contribuinte inválido.',
  naoClassificado:
    'Falhas que não são duplicidade, namespace inválido nem contribuinte inválido. É o bucket mais próximo de erro ainda investigável.',
  pasta:
    'Diretório do Drive extraído do caminho completo; o nome do arquivo não é contado como pasta.',
} as const;

export const TOOLTIP_GERENCIAL = {
  pessoasPorFerramenta:
    'Quantas pessoas distintas usaram cada ferramenta ao menos uma vez no período. É contagem de pessoas, não participação no volume de ações.',
  usuariosAtivos:
    'Pessoas distintas que usaram ao menos uma ferramenta no último mês fechado. Mede uso observado, não o total de pessoas elegíveis.',
  usuariosNovos:
    'Pessoas cujo primeiro uso na série histórica ocorreu no mês. O primeiro mês disponível é apenas baseline.',
  retencao:
    'Percentual das pessoas ativas no mês anterior que voltaram a usar alguma ferramenta no mês atual.',
  engajamento:
    'Ações registradas nas ferramentas durante o mês, divididas pelas pessoas ativas. Automação não entra no cálculo.',
  ferramentasAtivas:
    'Ferramentas com ao menos uma chamada humana no mês, comparadas ao catálogo observado no período.',
  evolucao:
    'Compara adoção, pessoas ativas e retenção somente entre meses completos. O mês corrente fica de fora.',
  coberturaFerramenta:
    'Parcela das pessoas ativas no período que usou cada ferramenta ao menos uma vez. Não é participação no volume de chamadas.',
  atividadeEquipe:
    'Pessoas com atividade observada no período. A lista combina uso das ferramentas e envio de documentos e não inclui quem não gerou nenhum evento.',
  documentos:
    'Documentos processados com sucesso no mesmo mês fechado usado pelos demais indicadores.',
  evolucaoDocumentos:
    'As barras mostram documentos processados; a linha mostra quantas pessoas da equipe fizeram envios em cada mês.',
} as const;
