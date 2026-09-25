/**
 * Quais simulações da Calculadora de ITCMD viram cenário do capítulo 04: cada cenário é uma cadeia, e só
 * a ponta aparece. As travas repetem as do servidor (`carregarSucessoria`) para a tela dizer o porquê.
 */
import type { SimulacaoSalva } from '@/hooks/useSimulacoesItcmd';
import { cadeiaDe, rotuloDaSimulacao } from '@/hooks/useSimulacoesItcmd';
import { MAXIMO_DE_CENARIOS } from '../../../supabase/functions/_shared/apresentacao-osg/paginacao.ts';

export interface OpcaoDeCenario {
  /** O último ato: é o id que vai para a geração. */
  simulacao: SimulacaoSalva;
  /** Ela e as anteriores, do ato mais antigo ao mais novo. */
  cadeia: SimulacaoSalva[];
  rotulo: string;
  /** Por que esta NUNCA pode ser escolhida (cadeia com ato não aprovado, sem nome). */
  motivoDeFora: string | null;
}

/** As pontas das cadeias aprovadas do cliente, na ordem das versões, cada uma com a sua cadeia. */
export function opcoesDeCenario(todas: readonly SimulacaoSalva[]): OpcaoDeCenario[] {
  const aprovadas = todas.filter((s) => s.status === 'aprovada');
  const anteriores = new Set(aprovadas.flatMap((s) => cadeiaDe(s, [...todas]).slice(0, -1).map((a) => a.id)));
  return aprovadas
    .filter((s) => !anteriores.has(s.id))
    .sort((a, b) => a.versao - b.versao)
    .map((s) => {
      const cadeia = cadeiaDe(s, [...todas]);
      const pendente = cadeia.find((a) => a.status !== 'aprovada');
      const motivoDeFora = !s.nome?.trim()
        ? 'Dê um nome a esta simulação na Calculadora de ITCMD: ele vira o nome do cenário na apresentação.'
        : pendente
          ? `A cadeia inclui "${rotuloDaSimulacao(pendente)}", que não está aprovada.`
          : null;
      return { simulacao: s, cadeia, rotulo: rotuloDaSimulacao(s), motivoDeFora };
    });
}

/**
 * Por que a opção não pode ser MARCADA agora, dadas as que já estão. `null` = pode (e a
 * já marcada sempre pode ser desmarcada).
 */
export function bloqueioDe(
  opcao: OpcaoDeCenario,
  escolhidas: readonly string[],
  opcoes: readonly OpcaoDeCenario[],
): string | null {
  if (escolhidas.includes(opcao.simulacao.id)) return null;
  if (opcao.motivoDeFora) return opcao.motivoDeFora;
  const marcadas = opcoes.filter((o) => escolhidas.includes(o.simulacao.id));
  if (marcadas.some((o) => o.simulacao.empresaPessoaId !== opcao.simulacao.empresaPessoaId)) {
    return 'É de outra sociedade: a Organização Sucessória é de uma sociedade só.';
  }
  if (marcadas.length >= MAXIMO_DE_CENARIOS) return `A Organização Sucessória compara até ${MAXIMO_DE_CENARIOS} cenários.`;
  return null;
}

/** O que já vem marcado: as opções que podem entrar, até três, da mesma sociedade da primeira. */
export function escolhaPadrao(opcoes: readonly OpcaoDeCenario[]): string[] {
  const validas = opcoes.filter((o) => !o.motivoDeFora);
  const empresa = validas[0]?.simulacao.empresaPessoaId;
  return validas
    .filter((o) => o.simulacao.empresaPessoaId === empresa)
    .slice(0, MAXIMO_DE_CENARIOS)
    .map((o) => o.simulacao.id);
}

/** As cadeias escolhidas, na ordem dos cenários (a das versões). */
export function cadeiasEscolhidas(
  escolhidas: readonly string[],
  opcoes: readonly OpcaoDeCenario[],
): OpcaoDeCenario[] {
  return opcoes.filter((o) => escolhidas.includes(o.simulacao.id));
}

const reais = (v: string) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

/**
 * Por que as cadeias marcadas não geram juntas: UPFs de valor diferente, que o gerador recusa porque a
 * Tributação atual tem uma tabela da lei só. `null` = pode gerar.
 */
export function conflitoDeUpf(cadeias: readonly OpcaoDeCenario[]): string | null {
  const atos = cadeias.flatMap((o) => o.cadeia);
  const valores = new Set(atos.map((s) => (Number(s.upf) || 0).toFixed(2)));
  if (valores.size <= 1) return null;
  const quais = atos.map((s) => `"${rotuloDaSimulacao(s)}" (${reais(s.upf)}, ${s.competencia})`);
  const listadas = quais.length > 1 ? `${quais.slice(0, -1).join(', ')} e ${quais[quais.length - 1]}` : quais[0];
  return `As simulações marcadas usam UPFs diferentes: ${listadas}. Gere uma nova simulação na `
    + 'Calculadora de ITCMD com a mesma UPF das outras e aprove-a.';
}
