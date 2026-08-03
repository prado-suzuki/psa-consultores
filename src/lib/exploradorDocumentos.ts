// Para qual pasta do Explorador de Arquivos vai um documento que ainda não tem
// vínculo com pessoa, bem ou matrícula.
//
// Por que existe: a árvore do Explorador é derivada de pessoa_id / matricula_id
// / bem_id. Quem não tem nenhum dos três cai em "Sem vínculo". Só que o cliente
// não consegue vincular nada: a policy de SELECT de `pessoa` exige admin ou
// cluster, e usuário cliente não tem cluster. Então tudo que ele manda pela
// Área do Cliente ia parar no mesmo balaio, mesmo tendo dito, pela gaveta que
// escolheu, a que tipo de entidade o documento pertence.
//
// A gaveta vira `categoria` no upload, e a categoria diz o grupo. Este módulo
// traduz grupo em pasta, e é por isso que o documento chega triado ao analista.
//
// O grupo NÃO é redefinido aqui: vem de agrupadorDocumentos, a fonte única.
import { grupoDaCategoria } from '@/lib/agrupadorDocumentos';
import type { DocCategoria } from '@/hooks/useDocumentoArquivo';

/** Pastas do Explorador que recebem documento sem vínculo. */
export type DestinoPasta = 'pessoas_pf' | 'pessoas_pj' | 'matriculas' | 'sem';

/** O mínimo que o roteamento precisa saber de um documento. */
export interface DocumentoRoteavel {
  pessoa_id?: string | null;
  matricula_id?: string | null;
  bem_id?: string | null;
  categoria: DocCategoria;
}

/**
 * Documento já vinculado a alguma entidade. Esse segue o caminho antigo: vai
 * para a pasta da pessoa, da matrícula ou do bem.
 */
export function temVinculo(doc: DocumentoRoteavel): boolean {
  return !!(doc.pessoa_id || doc.matricula_id || doc.bem_id);
}

/**
 * Pasta de destino de um documento SEM vínculo, pela categoria.
 *
 * O grupo "imoveis" vai para Matrículas, não para Bens: o que chega do cliente
 * é matrícula, escritura, contrato de exploração. Bem é o que a OSG cadastra
 * depois, lendo esses documentos.
 *
 * O grupo "outros" fica em "Sem vínculo" de propósito: não existe pasta natural
 * para ele, e "Sem vínculo" é justamente a caixa de triagem.
 */
export function destinoSemVinculo(categoria: DocCategoria): DestinoPasta {
  switch (grupoDaCategoria(categoria)) {
    case 'pf': return 'pessoas_pf';
    case 'pj': return 'pessoas_pj';
    case 'imoveis': return 'matriculas';
    default: return 'sem';
  }
}

/**
 * Destino de qualquer documento: `null` quando ele já tem vínculo e portanto
 * não pertence à raiz de pasta nenhuma.
 */
export function destinoDoDocumento(doc: DocumentoRoteavel): DestinoPasta | null {
  return temVinculo(doc) ? null : destinoSemVinculo(doc.categoria);
}

/** Documentos sem vínculo separados por pasta de destino, preservando a ordem. */
export function separarSemVinculo<T extends DocumentoRoteavel>(docs: T[]): Record<DestinoPasta, T[]> {
  const out: Record<DestinoPasta, T[]> = {
    pessoas_pf: [], pessoas_pj: [], matriculas: [], sem: [],
  };
  for (const d of docs) {
    if (temVinculo(d)) continue;
    out[destinoSemVinculo(d.categoria)].push(d);
  }
  return out;
}
