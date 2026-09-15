// O que o Controle de Projetos da OSG mostra, e por que cada recorte é esse.
//
// Substitui a planilha `Relação de Projetos - OSG.xlsx`. A análise que sustenta
// o desenho está em `docs/osg/relacao-de-projetos-planilha-x-ferramenta.md`;
// aqui fica só a regra, pura, porque "quais OS aparecem" é decisão que precisa
// de teste e não de leitura de hook com I/O.
//
// O GRÃO É A ORDEM DE SERVIÇO, e essa é a decisão que manda em todo o resto. A
// planilha tem uma linha por engajamento do cliente; `org_projects` tem uma
// linha por produto contratado (Di Domenico tem quatro, todas na mesma OS
// 111/2026, com as mesmas datas e o mesmo status). Medido em produção em
// 15/09/2026: pela OS a tela alcança 84 clientes, por `org_projects` alcançaria
// 23, e a planilha acompanha 62.

import { SITUACAO_PROJETO_OPTIONS } from '@/components/equipe/client-form/constants';
import { REGIAO_OPTIONS } from '@/lib/regioes';

/** OS crua, como as colunas de `ordem_servico` a devolvem. */
export interface OrdemCrua {
  id: string;
  numero_os: string | null;
  id_cliente: string;
  situacao: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  observacoes: string | null;
  regiao: string | null;
}

/** Produto contratado por uma OS, já resolvido no cluster que o executa. */
export interface ProdutoContratado {
  ordem_servico_id: string;
  produto_segmento_id: string;
}

export interface ProdutoSegmento {
  id: string;
  nome: string | null;
  cluster_id: string | null;
}

/** Projeto pendurado numa OS — é de onde saem os responsáveis da linha. */
export interface ProjetoDaOrdem {
  id: string;
  name: string;
  status: string | null;
  ordem_servico_id: string | null;
  responsible_id: string | null;
  leader_id: string | null;
}

export interface ClienteCru {
  id: string;
  nome: string;
  ativo: boolean | null;
}

export interface PessoaCrua {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

/** Uma linha da tela: o que a planilha chamava de "um projeto". */
export interface LinhaDoControle {
  osId: string;
  numeroOs: string;
  clienteId: string;
  clienteNome: string;
  /** Cliente inativo continua na lista: sumir com trabalho parado é o oposto do que a tela faz. */
  clienteAtivo: boolean;
  regiao: string | null;
  situacao: string | null;
  dataInicio: string | null;
  dataFim: string | null;
  observacoes: string | null;
  /** Nomes dos produtos DESTA área, ordenados. */
  produtos: string[];
  /** Líder e executor dos projetos da OS, sem repetir, ordenados. */
  responsaveis: string[];
  /** Quantos projetos a OS gerou. Zero significa OS sem projeto criado. */
  projetos: number;
  /** `data_fim` no passado e a OS ainda não concluída nem cancelada. */
  prazoVencido: boolean;
}

/** Situações que contam como trabalho em aberto, para efeito de prazo vencido. */
export const SITUACOES_EM_ABERTO = ['em_andamento', 'suspenso'];

/**
 * O rótulo de uma `ordem_servico.situacao`, na palavra do CADASTRO.
 *
 * A fonte é `SITUACAO_PROJETO_OPTIONS`, a mesma lista que o cadastro de OS usa
 * no seletor. A planilha chama de "Hibernando" o que o sistema grava como
 * `suspenso`, e a tela segue o sistema: rótulo que só esta página usa faria duas
 * telas darem nomes diferentes ao mesmo valor do banco.
 */
export function situacaoLabel(situacao: string | null | undefined): string {
  if (!situacao) return 'Sem situação';
  return SITUACAO_PROJETO_OPTIONS.find((opcao) => opcao.value === situacao)?.label ?? situacao;
}

function nomeDaPessoa(pessoa: PessoaCrua | undefined): string | null {
  if (!pessoa) return null;
  const nome = `${pessoa.first_name ?? ''} ${pessoa.last_name ?? ''}`.trim();
  return nome || null;
}

/**
 * OS vencida: prazo no passado e trabalho ainda aberto.
 *
 * `hoje` entra por parâmetro para o teste não depender do relógio. A comparação
 * é entre strings ISO de propósito, porque `data_fim` é `date` e virar `Date`
 * aqui traria fuso para uma conta que não tem hora.
 */
export function prazoVencido(
  dataFim: string | null,
  situacao: string | null,
  hoje: string,
): boolean {
  if (!dataFim) return false;
  if (!situacao || !SITUACOES_EM_ABERTO.includes(situacao)) return false;
  return dataFim < hoje;
}

/**
 * Monta as linhas da tela.
 *
 * QUAIS OS APARECEM: as que contratam ao menos um produto do cluster desta
 * página, lido em `produto_segmento.cluster_id`. Não é
 * `ordem_servico.cluster_id`, que é o campo Empresa / Faturamento e responde
 * "quem emitiu a nota", não "de quem é o trabalho". A mesma troca já foi feita
 * em `ordensDaArea.ts` em 03/09/2026, e lá ela revelou 17 OS invisíveis. Medido
 * de novo aqui em 15/09/2026, conferindo 14 OS de clientes que a planilha e o
 * sistema têm em comum: `ordem_servico.cluster_id` é sempre OSG ou TAX, nunca
 * Familly Business ou PSA Norte, que é o que a planilha registra como Área
 * Líder.
 *
 * QUAIS PRODUTOS APARECEM: só os desta área, pelo mesmo motivo de `ordensDaArea`
 * — nome de produto de outra área na linha mandaria o analista procurar aqui
 * trabalho que não é dele.
 *
 * RESPONSÁVEIS vêm dos projetos da OS, e não da OS: `ordem_servico` não tem
 * responsável. Uma OS com quatro projetos costuma ter o mesmo par de pessoas nos
 * quatro, então a lista sai sem repetição. OS sem projeto fica com a coluna
 * vazia, o que é informação e não falha: em produção, 61 dos 84 clientes da OSG
 * que têm OS não têm nenhum projeto criado.
 */
export function montarControleDeProjetos(
  ordens: OrdemCrua[],
  produtosContratados: ProdutoContratado[],
  produtoPorId: Map<string, ProdutoSegmento>,
  projetos: ProjetoDaOrdem[],
  clientePorId: Map<string, ClienteCru>,
  pessoaPorId: Map<string, PessoaCrua>,
  clusterDaArea: string,
  hoje: string,
): LinhaDoControle[] {
  const produtosDaOs = new Map<string, string[]>();
  for (const contratado of produtosContratados) {
    const produto = produtoPorId.get(contratado.produto_segmento_id);
    if (!produto || produto.cluster_id !== clusterDaArea) continue;
    const atuais = produtosDaOs.get(contratado.ordem_servico_id) ?? [];
    if (produto.nome) atuais.push(produto.nome);
    produtosDaOs.set(contratado.ordem_servico_id, atuais);
  }

  const projetosDaOs = new Map<string, ProjetoDaOrdem[]>();
  for (const projeto of projetos) {
    if (!projeto.ordem_servico_id) continue;
    const atuais = projetosDaOs.get(projeto.ordem_servico_id) ?? [];
    atuais.push(projeto);
    projetosDaOs.set(projeto.ordem_servico_id, atuais);
  }

  const linhas: LinhaDoControle[] = [];
  for (const ordem of ordens) {
    // A OS entra pela CHAVE do mapa, e não pelo tamanho da lista: produto desta
    // área com `nome` nulo deixaria a lista vazia e sumiria com a OS.
    if (!produtosDaOs.has(ordem.id)) continue;

    const cliente = clientePorId.get(ordem.id_cliente);
    const daOrdem = projetosDaOs.get(ordem.id) ?? [];

    const nomes = new Set<string>();
    for (const projeto of daOrdem) {
      const lider = nomeDaPessoa(pessoaPorId.get(projeto.leader_id ?? ''));
      const executor = nomeDaPessoa(pessoaPorId.get(projeto.responsible_id ?? ''));
      if (lider) nomes.add(lider);
      if (executor) nomes.add(executor);
    }

    linhas.push({
      osId: ordem.id,
      numeroOs: ordem.numero_os ?? '',
      clienteId: ordem.id_cliente,
      // Cliente fora do alcance da RLS não some da lista: ver `isDoAmbiente`,
      // que segue a mesma regra. Some o nome, não a linha.
      clienteNome: cliente?.nome ?? 'Cliente não identificado',
      clienteAtivo: cliente?.ativo !== false,
      regiao: ordem.regiao ?? null,
      situacao: ordem.situacao ?? null,
      dataInicio: ordem.data_inicio ?? null,
      dataFim: ordem.data_fim ?? null,
      observacoes: ordem.observacoes?.trim() || null,
      produtos: [...(produtosDaOs.get(ordem.id) ?? [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      responsaveis: [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      projetos: daOrdem.length,
      prazoVencido: prazoVencido(ordem.data_fim ?? null, ordem.situacao ?? null, hoje),
    });
  }

  return linhas.sort((a, b) => a.clienteNome.localeCompare(b.clienteNome, 'pt-BR'));
}

export interface FiltrosDoControle {
  busca: string;
  situacao: string;
  regiao: string;
}

export const FILTROS_VAZIOS: FiltrosDoControle = { busca: '', situacao: '', regiao: '' };

/**
 * Aplica os filtros da barra. A busca cobre cliente, número da OS e observação:
 * é o campo em que a equipe achava o cliente na planilha com Ctrl+F, e a
 * observação é onde mora o motivo de o trabalho estar parado.
 */
export function filtrarControle(
  linhas: LinhaDoControle[],
  filtros: FiltrosDoControle,
): LinhaDoControle[] {
  const busca = filtros.busca.trim().toLowerCase();
  return linhas.filter((linha) => {
    if (filtros.situacao && linha.situacao !== filtros.situacao) return false;
    if (filtros.regiao && linha.regiao !== filtros.regiao) return false;
    if (!busca) return true;
    const alvo = [linha.clienteNome, linha.numeroOs, linha.observacoes ?? '']
      .join(' ')
      .toLowerCase();
    return alvo.includes(busca);
  });
}

/**
 * As opções dos dois seletores, tiradas do que a lista TEM e não do domínio
 * inteiro: filtro que oferece praça sem nenhuma OS é filtro que só produz tela
 * vazia. A região sai na ordem de `REGIAO_OPTIONS`, que é a ordem que o cadastro
 * de OS já usa.
 */
export function opcoesDoControle(linhas: LinhaDoControle[]) {
  const situacoes = [...new Set(linhas.map((linha) => linha.situacao).filter(Boolean))] as string[];
  const regioesPresentes = new Set(linhas.map((linha) => linha.regiao).filter(Boolean));
  const regioes = REGIAO_OPTIONS.map((opcao) => opcao.value).filter((valor) =>
    regioesPresentes.has(valor),
  );
  // Praça fora da lista de sete (o cadastro deixa texto livre) entra no fim,
  // senão ela some do filtro e as OS dela viram inalcançáveis.
  for (const regiao of regioesPresentes) {
    if (regiao && !regioes.includes(regiao)) regioes.push(regiao);
  }
  return {
    situacoes: situacoes.sort((a, b) => situacaoLabel(a).localeCompare(situacaoLabel(b), 'pt-BR')),
    regioes,
  };
}
