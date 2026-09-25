import { normalizarTexto } from '@/lib/produtoServicoVinculo';

/**
 * O código do serviço — e o remendo que ele é.
 *
 * `servicos_prestados` tem TRÊS colunas: `id`, `nome`, `cluster_id`. Não existe
 * coluna de código. O "1.01" que a operação usa para se referir a um serviço
 * está DENTRO da string do nome ("1.1.Apoio na implantação de práticas
 * contábeis"), e é dele que sai o chip de código e a ORDEM da lista.
 *
 * Até 27/08/2026 esse mesmo recorte também gerava "seções" recolhíveis na tela.
 * Saíram: o primeiro número não tem nome em lugar nenhum do banco, então o
 * cabeçalho dizia "Seção 1" e não orientava ninguém. Ordenar pelo código entrega
 * o mesmo agrupamento visual — os "1.x" ficam juntos — sem sanfona para abrir.
 *
 * Ou seja: aqui se fatia texto, e fatiar texto quebra quando o dado não colabora.
 * Nome sem prefixo NUNCA some da lista: ele vai para o fim, em ordem alfabética.
 * Serviço que o usuário não enxerga é serviço que ele cadastra de novo.
 *
 * Se um dia `servicos_prestados` ganhar coluna de código, este arquivo encolhe
 * para nada: `dividirNomeServico` passa a ler a coluna e o resto continua igual.
 */

export interface NomeDeServico {
  /** Prefixo numérico completo ("1.1", "3"), ou `null` quando não há. */
  codigo: string | null;
  /** O nome sem o prefixo. Nunca vazio: sem prefixo, é o nome inteiro. */
  nome: string;
  /** Primeiro nível do prefixo ("1"), ou `null`. É a chave da seção. */
  secao: string | null;
}

/**
 * Separa o prefixo numérico do nome do serviço.
 *
 * Aceita as formas que existem no banco — "1.1.Nome", "3.Nome", "1.1 Nome" — e
 * devolve o nome intacto quando não encontra prefixo. Não "conserta" o dado:
 * nome sem prefixo continua sendo o nome inteiro, com código `null`.
 */
export function dividirNomeServico(nomeCompleto: string | null | undefined): NomeDeServico {
  const bruto = (nomeCompleto ?? '').trim();
  const casado = bruto.match(/^(\d+(?:\.\d+)*)\.?\s*(.*)$/);
  if (!casado) return { codigo: null, nome: bruto, secao: null };

  const [, codigo, resto] = casado;
  // Prefixo sem nada depois ("1.") não é código: é o nome inteiro. Sem isto um
  // serviço chamado só "2024" viraria um grupo com rótulo vazio.
  if (!resto.trim()) return { codigo: null, nome: bruto, secao: null };

  return { codigo, nome: resto.trim(), secao: codigo.split('.')[0] };
}

/**
 * Ordena pelo código do nome: "1.1" antes de "1.2", "2.1" depois de "1.10".
 *
 * Compara SEGMENTO A SEGMENTO como número, e não a string inteira: por texto
 * "1.10" vem antes de "1.2", e a lista da tela é lida como a planilha da
 * operação, onde não vem. Serviço sem código vai para o fim, em ordem
 * alfabética — é o caso de "Outros" e dos oito nomes soltos do catálogo Tax.
 */
export function ordenarPorCodigoDeServico<T>(
  servicos: readonly T[],
  nomeDe: (servico: T) => string | null | undefined,
): T[] {
  const chave = (servico: T) => {
    const { codigo, nome } = dividirNomeServico(nomeDe(servico));
    return {
      partes: codigo ? codigo.split('.').map(Number) : null,
      nome,
    };
  };
  return [...servicos].sort((a, b) => {
    const ca = chave(a);
    const cb = chave(b);
    if (!ca.partes || !cb.partes) {
      // Um dos dois não tem código: quem tem vem primeiro; sem código, alfabético.
      if (ca.partes) return -1;
      if (cb.partes) return 1;
      return ca.nome.localeCompare(cb.nome, 'pt-BR');
    }
    const ate = Math.max(ca.partes.length, cb.partes.length);
    for (let i = 0; i < ate; i += 1) {
      // Prefixo mais curto primeiro: "3" antes de "3.1".
      const diferenca = (ca.partes[i] ?? -1) - (cb.partes[i] ?? -1);
      if (diferenca !== 0) return diferenca;
    }
    return ca.nome.localeCompare(cb.nome, 'pt-BR');
  });
}

/**
 * Quantos produtos cada serviço atende — o "usado em N produtos" da linha.
 *
 * Sai dos vínculos que a tela já carregou; não custa consulta nova.
 */
export function contarVinculosPorServico(
  vinculos: readonly { servico_prestado_id: string }[],
): Record<string, number> {
  const contagem: Record<string, number> = {};
  for (const vinculo of vinculos) {
    contagem[vinculo.servico_prestado_id] = (contagem[vinculo.servico_prestado_id] || 0) + 1;
  }
  return contagem;
}

/**
 * Os ids entre a âncora e o alvo, inclusive — a faixa do shift+clique.
 *
 * Recebe os ids na ORDEM EM QUE A TELA OS MOSTRA (já agrupados e filtrados), e
 * não a ordem do banco: shift+clique seleciona o que está visivelmente entre os
 * dois, que é o que a pessoa vê. Âncora ou alvo fora da lista devolve só o
 * alvo, para o clique nunca virar nada.
 */
export function faixaDeSelecao(
  idsVisiveis: readonly string[],
  ancora: string | null,
  alvo: string,
): string[] {
  if (!ancora || ancora === alvo) return [alvo];
  const inicio = idsVisiveis.indexOf(ancora);
  const fim = idsVisiveis.indexOf(alvo);
  if (inicio === -1 || fim === -1) return [alvo];
  const [de, ate] = inicio <= fim ? [inicio, fim] : [fim, inicio];
  return idsVisiveis.slice(de, ate + 1);
}

/* ───────────────────────────────────────────────────────────────────────
 * O CÓDIGO DO SERVIÇO, DO LADO DE QUEM CADASTRA
 *
 * O bloco acima LÊ o código de dentro do nome. O daqui para baixo ESCREVE:
 * é o que permite o formulário propor o próximo número em vez de pedir que
 * alguém o digite de cabeça.
 *
 * Ele não conserta o catálogo nem inventa convenção. Observa a que já existe
 * em cada cluster — inclusive o zero à esquerda, que a OSG usa e a Tax não —
 * e devolve o próximo número que ninguém ocupou. Código repetido continua
 * podendo ser gravado: quem cadastra decide, a tela só avisa.
 * ─────────────────────────────────────────────────────────────────────── */

/** O mínimo que estas funções precisam de um serviço do catálogo. */
export interface ServicoDoCatalogo {
  id: string;
  nome: string;
  cluster_id: string | null;
}

export interface GrupoDeCodigo {
  /** Primeiro nível do código: o "1" de "1.1". */
  raiz: string;
  /** Códigos completos já ocupados no grupo. */
  usados: Set<string>;
  /**
   * Dígitos do segundo nível. A OSG escreve "2.01" e a Tax "1.1" — propor
   * "2.17" numa e "1.10" na outra é o que mantém cada catálogo coerente
   * consigo mesmo.
   */
  largura: number;
  /** Um nome do grupo. O seletor precisa dele: número sozinho não orienta. */
  exemplo: string;
  /** Quantos serviços caem neste grupo. */
  quantos: number;
}

const doCluster = (servicos: readonly ServicoDoCatalogo[], clusterId: string | null) =>
  servicos.filter((s) => (s.cluster_id ?? null) === (clusterId ?? null));

/**
 * Os grupos que existem num cluster, na ordem numérica.
 *
 * Sai do que está gravado, não de uma tabela de grupos — ela não existe. Nome
 * sem código não entra em grupo nenhum e por isso não aparece aqui.
 */
export function gruposDeCodigo(
  servicos: readonly ServicoDoCatalogo[],
  clusterId: string | null,
): GrupoDeCodigo[] {
  const porRaiz = new Map<string, GrupoDeCodigo>();

  for (const servico of doCluster(servicos, clusterId)) {
    const { codigo, nome, secao } = dividirNomeServico(servico.nome);
    if (!codigo || !secao) continue;

    if (!porRaiz.has(secao)) {
      porRaiz.set(secao, {
        raiz: secao, usados: new Set(), largura: 1, exemplo: nome, quantos: 0,
      });
    }
    const grupo = porRaiz.get(secao)!;
    grupo.usados.add(codigo);
    grupo.quantos += 1;

    const segundo = codigo.split('.')[1];
    if (segundo) grupo.largura = Math.max(grupo.largura, segundo.length);
  }

  return [...porRaiz.values()].sort((a, b) => Number(a.raiz) - Number(b.raiz));
}

/**
 * O próximo número livre de um grupo — o valor que o formulário já chega
 * mostrando.
 *
 * Procura o primeiro vago a partir de 1, e não o "último mais um": o catálogo
 * tem buracos, e reaproveitá-los é o que impede a numeração de crescer para
 * sempre enquanto sobra espaço no meio.
 *
 * Grupo que ainda não existe herda a largura do cluster, para o primeiro
 * serviço dele já nascer no formato dos vizinhos.
 */
export function proximoCodigoLivre(
  servicos: readonly ServicoDoCatalogo[],
  clusterId: string | null,
  raiz: string,
): string {
  const grupos = gruposDeCodigo(servicos, clusterId);
  const grupo = grupos.find((g) => g.raiz === raiz);
  const largura = grupo?.largura ?? Math.max(1, ...grupos.map((g) => g.largura), 1);
  const usados = grupo?.usados ?? new Set<string>();

  let n = 1;
  while (usados.has(`${raiz}.${String(n).padStart(largura, '0')}`)) n += 1;
  return `${raiz}.${String(n).padStart(largura, '0')}`;
}

/** Novo serviço avulso: usa o próximo número principal do cluster, sem pedir grupo. */
export function proximoNumeroServico(
  servicos: readonly ServicoDoCatalogo[],
  clusterId: string | null,
): string {
  const raizes = doCluster(servicos, clusterId)
    .map((s) => dividirNomeServico(s.nome).codigo?.split('.')[0])
    .filter((raiz): raiz is string => !!raiz)
    .map(Number);
  return String(Math.max(0, ...raizes) + 1);
}

/**
 * Quem já usa este código no cluster.
 *
 * Devolve lista, e não booleano, porque a tela mostra os nomes: "1.1 já é
 * usado por 8 serviços" sem dizer quais manda procurar na mão.
 */
export function servicosComCodigo<T extends ServicoDoCatalogo>(
  servicos: readonly T[],
  clusterId: string | null,
  codigo: string,
): T[] {
  const alvo = codigo.trim();
  if (!alvo) return [];
  return doCluster(servicos, clusterId).filter(
    (s) => dividirNomeServico(s.nome).codigo === alvo,
  ) as T[];
}

/**
 * Serviços do cluster cujo nome, ignorando código, acento e caixa, é o mesmo.
 *
 * É a trava contra o duplicado: sem código para procurar, quem não acha um
 * serviço cadastra outro igual, e os vínculos se partem entre as duas linhas.
 */
export function servicosComMesmoNome<T extends ServicoDoCatalogo>(
  servicos: readonly T[],
  clusterId: string | null,
  titulo: string,
  ignorarId?: string | null,
): T[] {
  const alvo = normalizarTexto(titulo).replace(/\s+/g, ' ');
  if (!alvo) return [];
  return doCluster(servicos, clusterId).filter((s) => {
    if (ignorarId && s.id === ignorarId) return false;
    return normalizarTexto(dividirNomeServico(s.nome).nome).replace(/\s+/g, ' ') === alvo;
  }) as T[];
}

/**
 * Remonta o que vai para a coluna `nome`.
 *
 * O formato é o dominante no catálogo — "1.1.Nome", sem espaço depois do
 * ponto —, e `dividirNomeServico` o desfaz de volta. Sem código, grava só o
 * nome: serviço sem número continua sendo estado válido.
 */
export function montarNomeServico(codigo: string, titulo: string): string {
  const cod = codigo.trim().replace(/\.+$/, '');
  const nome = titulo.trim();
  if (!cod) return nome;
  return nome ? `${cod}.${nome}` : cod;
}
