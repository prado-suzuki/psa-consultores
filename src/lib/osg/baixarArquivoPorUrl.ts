/**
 * Baixa um arquivo por URL assinada, sem abrir aba.
 *
 * `window.open` era barrado pelo navegador na primeira vez: a pessoa clicava,
 * nada acontecia, e só depois via o aviso de popup. Buscar os bytes e clicar num
 * link local não dispara bloqueio nenhum.
 *
 * Vive em `lib` porque passou a ter DOIS chamadores: o painel dos Papéis de
 * Trabalho, no Digital Dev, e a Biblioteca de Slides, que agora inclui o deck
 * tributário no mesmo botão de gerar. Enquanto era um só, morava lá dentro.
 */
export async function baixarArquivoPorUrl(url: string, nome: string): Promise<void> {
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error('O link do arquivo expirou. Tente de novo.');

  const objeto = URL.createObjectURL(await resposta.blob());
  const a = document.createElement('a');
  a.href = objeto;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objeto);
}
