import type { Binding } from '@/lib/templates/binding';
import { campoDaEntidade, camposDaEntidade, type CampoEntidade } from '@/lib/templates/vocabulario';

/**
 * Os campos EDITÁVEIS de cada binding, conforme o que o modelo referencia — o
 * formulário do "Ajustar dados manualmente" na tela Gerar.
 *
 * Regras, todas do vocabulário e nenhuma de lista fixa:
 * - campo DERIVADO (qualificação, endereço em prosa…) não é editável; entram no
 *   lugar dele os campos-base de que ele deriva, porque é neles que a correção
 *   tem efeito;
 * - campo referenciado pelo modelo mas fora do catálogo da entidade vira input
 *   de texto livre sob o binding, para o consultor não ficar sem saída;
 * - a ordem é a do catálogo da entidade (os de fora dele vão ao fim), e não a
 *   ordem em que o texto do bloco os cita.
 */
export function camposEditaveisPorBinding(
  placeholders: string[],
  bindings: Binding[],
): Record<string, CampoEntidade[]> {
  const refs = new Map<string, Set<string>>();
  for (const ph of placeholders) {
    const ponto = ph.indexOf('.');
    if (ponto < 0) continue;
    const nome = ph.slice(0, ponto);
    const campoId = ph.slice(ponto + 1);
    if (!bindings.some((b) => b.nome === nome)) continue;
    if (!refs.has(nome)) refs.set(nome, new Set());
    refs.get(nome)!.add(campoId);
  }

  const out: Record<string, CampoEntidade[]> = {};
  for (const b of bindings) {
    const referenciados = refs.get(b.nome) ?? new Set<string>();
    const vistos = new Set<string>();
    const lista: CampoEntidade[] = [];
    const adicionar = (c: CampoEntidade) => {
      if (!vistos.has(c.id)) {
        vistos.add(c.id);
        lista.push(c);
      }
    };
    for (const campoId of referenciados) {
      const campo = campoDaEntidade(b.tipo, campoId);
      if (campo?.derivadoDe) {
        // Derivados compostos (ex.: qualificação) listam vários campos-base.
        const bases = Array.isArray(campo.derivadoDe) ? campo.derivadoDe : [campo.derivadoDe];
        for (const baseId of bases) {
          const base = campoDaEntidade(b.tipo, baseId);
          if (base) adicionar(base);
        }
      } else if (campo) {
        adicionar(campo);
      } else {
        adicionar({ id: campoId, label: campoId, tipo: 'texto' });
      }
    }
    const ordem = camposDaEntidade(b.tipo).map((c) => c.id);
    lista.sort((a, z) => {
      const ia = ordem.indexOf(a.id);
      const iz = ordem.indexOf(z.id);
      return (ia < 0 ? Infinity : ia) - (iz < 0 ? Infinity : iz);
    });
    out[b.nome] = lista;
  }
  return out;
}
