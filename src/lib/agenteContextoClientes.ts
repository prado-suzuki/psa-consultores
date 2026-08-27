/**
 * Snapshot do Board · Clientes (mapa e carteira) para o Agente PSA.
 *
 * A tela desenha um mapa de calor por UF e a lista da carteira. O agente
 * recebe a MESMA agregação que pinta o mapa (`agregarClientesPorRegiao`) —
 * nunca uma contagem própria, senão o mapa mostraria um número e o agente
 * outro.
 *
 * Duas honestidades que esta tela exige:
 *
 * 1. **`semUf` fica FORA de `porUf`** na agregação, porque não é pintável no
 *    mapa. Some do mapa e do agente seria pior: vira cliente invisível. Aqui
 *    ele tem campo próprio, dito com todas as letras.
 * 2. **O escopo depende do papel.** Quem não é admin lê só os clientes do seu
 *    acesso (RLS), e o número continua correto para quem olha — mentira seria
 *    chamá-lo de "a carteira da empresa" sem dizer nada.
 */
import type { BlocoContexto, ContextoTela } from '@/hooks/useAgenteContexto';
import type { AgregacaoRegiao } from '@/lib/clientesPorRegiao';

const pct = (parte: number, total: number) =>
  total > 0 ? `${((parte / total) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : null;

export interface EntradaContextoClientes {
  agregacao: AgregacaoRegiao;
  /** `true` quando o usuário enxerga a carteira inteira (admin). */
  escopoTotal: boolean;
  /** Rótulos das consultas que falharam. */
  falhas: string[];
}

const SUGESTOES = [
  'Em quais estados a carteira está concentrada?',
  'Quantos clientes estão sem estado cadastrado?',
  'Qual a proporção de clientes ativos na carteira?',
];

function blocoCarteira(e: EntradaContextoClientes): BlocoContexto {
  const a = e.agregacao;
  const inativos = a.totalClientes - a.totalAtivos;
  return {
    id: 'carteira',
    titulo: 'Carteira de clientes',
    nota: e.escopoTotal
      ? undefined
      : 'Carteira limitada aos clientes do seu acesso — não é o total da empresa.',
    campos: [
      { rotulo: 'Clientes na carteira', valor: String(a.totalClientes) },
      {
        rotulo: 'Clientes ativos',
        valor: String(a.totalAtivos),
        nota: pct(a.totalAtivos, a.totalClientes) ?? undefined,
      },
      { rotulo: 'Clientes inativos', valor: String(inativos) },
      { rotulo: 'Estados com pelo menos um cliente', valor: String(a.ufsComDado.length) },
      {
        rotulo: 'Clientes sem estado cadastrado',
        valor: String(a.semUf.clientes),
        nota: a.semUf.clientes > 0
          ? 'não aparecem no mapa — o mapa só pinta UF reconhecida'
          : undefined,
      },
    ],
  };
}

function blocoEstados(e: EntradaContextoClientes): BlocoContexto | null {
  const a = e.agregacao;
  if (a.ufsComDado.length === 0) return null;

  const top = a.ufsComDado.slice(0, 10).map((uf) => a.porUf[uf]);
  const maior = top[0];

  return {
    id: 'estados',
    titulo: 'Distribuição por estado',
    nota: 'A mesma agregação que pinta o mapa de calor.',
    campos: [
      {
        rotulo: 'Estado com mais clientes',
        valor: maior ? `${maior.nome} (${maior.uf}) · ${maior.clientes}` : null,
        nota: maior ? pct(maior.clientes, a.totalClientes) ?? undefined : undefined,
      },
    ],
    itens: top.map((u) => ({
      estado: `${u.nome} (${u.uf})`,
      clientes: u.clientes,
      ativos: u.ativos,
      fatia: pct(u.clientes, a.totalClientes),
      // Só o maior município: a lista inteira encheria o prompt sem mudar
      // nenhuma resposta que a tela consiga sustentar.
      // `rotulo`, nao `municipio`: o primeiro sempre vem preenchido (usa
      // "sem municipio" quando o cadastro nao informou), o segundo e nullable.
      maior_municipio: u.municipios[0]?.rotulo ?? null,
    })),
  };
}

export function contextoBoardClientes(e: EntradaContextoClientes): ContextoTela {
  const blocos = [blocoCarteira(e), blocoEstados(e)]
    .filter((b): b is BlocoContexto => b !== null);

  return {
    rotulo: 'Board · Clientes (carteira e distribuição geográfica)',
    filtros: {
      escopo: e.escopoTotal ? 'empresa inteira' : 'somente os clientes do seu acesso',
    },
    blocos,
    avisos: e.falhas.length > 0 ? [`falha ao carregar: ${e.falhas.join(', ')}`] : undefined,
    sugestoes: SUGESTOES,
  };
}
