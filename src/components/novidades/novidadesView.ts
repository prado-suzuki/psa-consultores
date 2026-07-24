import type { Novidade, NovidadeCategoria } from '@/hooks/useDomainNovidades';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Item de exibição das novidades (derivado da linha `Novidade` do domínio).
export interface NovItem {
  categoria: NovidadeCategoria;
  titulo: string;
  descricao: string;
  itens: string[];
  conteudoCompleto: string | null;
  dataISO: string;
  dataLabel: string;
}

// Rótulos das categorias (usados nos filtros). As telas não exibem tag de tipo.
export const CATEGORIA_META: Record<NovidadeCategoria, { label: string }> = {
  empresa: { label: 'Empresa' },
  tributario: { label: 'Sistema Tributário' },
  servicos: { label: 'Serviços' },
  cases: { label: 'Cases de Sucesso' },
};

// Normaliza as linhas de `usePublicNovidades` para o item de exibição.
// Sem fallback: se não houver novidades, retorna vazio (as telas mostram aviso).
export function toNovItems(data: Novidade[] | undefined | null): NovItem[] {
  if (!data) return [];
  return data.map((r) => ({
    categoria: r.categoria,
    titulo: r.titulo,
    descricao: r.descricao,
    itens: r.itens || [],
    conteudoCompleto: r.conteudo_completo ?? null,
    dataISO: r.data_publicacao,
    dataLabel: format(new Date(r.data_publicacao), "d 'de' MMMM, yyyy", { locale: ptBR }),
  }));
}
