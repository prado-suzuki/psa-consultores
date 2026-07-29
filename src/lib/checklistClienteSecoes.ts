// Agrupamento do checklist do cliente em seções por tipo de entidade e, dentro
// delas, um card por instância (pessoa/imóvel/bem). Extraído da tela para poder
// ser testado sem React — a ordenação aqui é o que define a leitura do cliente:
// primeiro o que falta enviar.
import type { ChecklistSolicitadoItem } from '@/hooks/useDocumentoArquivo';

// Ordem fixa das seções: Pessoa Física antes de Jurídica, depois imóveis e bens.
export const ENTIDADE_ORDEM = [
  'Pessoa Física', 'Pessoa Jurídica', 'Pessoa Jurídica (Cooperativa)',
  'Matrícula (Imóvel Rural)', 'Matrícula (Imóvel Urbano)', 'Bem',
];

export const ordemEntidade = (entidade: string) => {
  const i = ENTIDADE_ORDEM.indexOf(entidade);
  return i < 0 ? 99 : i;
};

export interface CardEntidade {
  chave: string;
  nome: string;
  entidade: string;
  itens: ChecklistSolicitadoItem[];
  recebidos: number;
  total: number;
}

export interface SecaoEntidade {
  entidade: string;
  cards: CardEntidade[];
}

/**
 * Monta as seções (por tipo de entidade, em ordem fixa) e, dentro, um card por
 * instância (pessoa/imóvel). Cards ordenados pelos menos preenchidos primeiro;
 * dentro do card, documentos pendentes antes dos recebidos. Itens sem instância
 * (nível cliente) formam um card "geral" da entidade.
 */
export function montarSecoes(itens: ChecklistSolicitadoItem[]): SecaoEntidade[] {
  const porEntidade = new Map<string, Map<string, ChecklistSolicitadoItem[]>>();
  for (const it of itens) {
    const ent = it.entidade || 'Outros';
    const chaveCard = it.rotulo_instancia || `${ent}::geral`;
    let cards = porEntidade.get(ent);
    if (!cards) {
      cards = new Map();
      porEntidade.set(ent, cards);
    }
    const lista = cards.get(chaveCard);
    if (lista) lista.push(it);
    else cards.set(chaveCard, [it]);
  }
  return Array.from(porEntidade.entries())
    .map(([entidade, mCards]) => ({
      entidade,
      cards: Array.from(mCards.entries())
        .map(([chave, its]) => ({
          chave,
          nome: its[0]?.rotulo_instancia || entidade,
          entidade,
          recebidos: its.filter((i) => i.recebido).length,
          total: its.length,
          itens: [...its].sort((a, b) => {
            if (a.recebido !== b.recebido) return a.recebido ? 1 : -1;
            return a.documento.localeCompare(b.documento, 'pt-BR');
          }),
        }))
        .sort((a, b) => {
          const ra = a.total ? a.recebidos / a.total : 0;
          const rb = b.total ? b.recebidos / b.total : 0;
          if (ra !== rb) return ra - rb; // menos preenchidos primeiro
          return a.nome.localeCompare(b.nome, 'pt-BR');
        }),
    }))
    .sort((a, b) => ordemEntidade(a.entidade) - ordemEntidade(b.entidade) || a.entidade.localeCompare(b.entidade, 'pt-BR'));
}

/** Filtra seções e cards pelo termo de busca (nome da instância, entidade ou documento). */
export function filtrarSecoes(secoes: SecaoEntidade[], termo: string): SecaoEntidade[] {
  const t = termo.trim().toLocaleLowerCase('pt-BR');
  if (!t) return secoes;
  return secoes
    .map((sec) => ({
      ...sec,
      cards: sec.cards.filter((card) =>
        card.nome.toLocaleLowerCase('pt-BR').includes(t) ||
        card.entidade.toLocaleLowerCase('pt-BR').includes(t) ||
        card.itens.some((it) => it.documento.toLocaleLowerCase('pt-BR').includes(t)),
      ),
    }))
    .filter((sec) => sec.cards.length > 0);
}
