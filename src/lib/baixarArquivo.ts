/**
 * Abre/baixa uma URL assinada do Storage.
 *
 * Dois detalhes que fazem o clique simplesmente NÃO FAZER NADA quando ignorados:
 *
 * 1. A âncora precisa estar no documento antes do `.click()`. Âncora solta na
 *    memória funciona no Chrome e é ignorada no Firefox.
 * 2. A URL assinada é de outra origem (o host do Supabase). Para origem
 *    diferente o navegador IGNORA o atributo `download` — quem manda baixar é o
 *    `Content-Disposition` que o Storage devolve, e ele só vem se a URL for
 *    criada com a opção `download`. Sem isso, o melhor caso é abrir o arquivo
 *    numa aba; o pior é não acontecer nada.
 *
 * Vivia dentro de `useDomainOrgComments` (anexos de comentário), que continua
 * reexportando daqui — a Biblioteca de Procedimentos precisava do mesmo
 * comportamento e estava com uma cópia própria, sem os dois detalhes acima.
 */
export function abrirAnexoEmNovaAba(url: string, fileName: string) {
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
