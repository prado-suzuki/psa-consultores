import { numeroDeValorBR } from '@/lib/templates/historicoCapital';

// O ESTADO da sociedade antes desta peça, lido do snapshot do documento que ela
// substitui.
//
// Por que não do ledger: a derivação de eventos usava a projeção dos movimentos
// FORMALIZADOS (os que já têm `documento_gerado_id`) como o "antes". Mas validar
// um contrato social não carimbava nada, então os movimentos de constituição
// nunca entravam nos formalizados e o "antes" de toda primeira alteração era o
// conjunto vazio: nascia "aumento de capital de R$ 0,00 para R$ 1.171.800,00" e
// "2 ingresso(s)" numa empresa onde ninguém ingressou.
//
// O snapshot é o que a peça PUBLICOU na junta; o `formalizado` do ledger é só um
// proxy de "já foi contado". Quando os dois divergem, quem produziu efeito foi a
// peça. (Decisão D2 de docs/planos/derivacao-de-eventos-e-carimbo.md.)
//
// Snapshots novos congelam pessoa.id. CPF/CNPJ fica apenas para conciliação dos
// legados com o livro: corrigir documento não troca a identidade de uma pessoa.

/** O recorte do `snapshot_dados` que o baseline sabe ler. */
export interface SnapshotDaPeca {
  selecao?: Record<string, Record<string, string>> | null;
  itensPorLista?: Record<string, unknown> | null;
}

export interface BaselineDaPeca {
  /** Capital que valeu no documento substituído, em número. */
  capitalAnterior: number | null;
  /** Ids estáveis; opcional para baselines legados já consumidos pelo app. */
  pessoaIdsDosSocios?: string[] | null;
  /** CPF/CNPJ (só dígitos) dos sócios daquele quadro; null = não dá para casar. */
  cpfCnpjDosSocios: string[] | null;
}

/** Só os dígitos: blinda o casamento contra formatação divergente entre peças. */
export function digitosDe(valor: unknown): string {
  return typeof valor === 'string' ? valor.replace(/\D/g, '') : '';
}

/**
 * O baseline de estado desta peça. Sem snapshot (documento antigo, ou peça que
 * não substitui ninguém) os campos vêm nulos, e quem deriva decide o que
 * fazer com a ausência.
 */
export function baselineDoSnapshot(snapshot: SnapshotDaPeca | null | undefined): BaselineDaPeca {
  return {
    capitalAnterior: capitalDoSnapshot(snapshot),
    pessoaIdsDosSocios: sociosDoSnapshot(snapshot, 'id'),
    cpfCnpjDosSocios: sociosDoSnapshot(snapshot, 'cpfCnpj'),
  };
}

/**
 * O capital congelado no snapshot. O binding costuma se chamar `sociedade`, mas a
 * busca pelo campo mantém a leitura viva caso o autor tenha dado outro nome ao
 * mesmo papel — a mesma tolerância de `calcularHistoricoCapital`.
 */
function capitalDoSnapshot(snapshot: SnapshotDaPeca | null | undefined): number | null {
  const selecao = snapshot?.selecao ?? {};
  const sociedade = selecao.sociedade
    ?? Object.values(selecao).find((campos) => typeof campos?.capitalValor === 'string');
  return numeroDeValorBR(sociedade?.capitalValor);
}

/**
 * Os sócios do quadro que a peça publicou, por id ou CPF/CNPJ. Devolve null quando a
 * lista não existe (snapshot de modelo sem sócios, ou anterior a `itensPorLista`)
 * ou quando QUALQUER linha vem sem a chave — um quadro que não se casa por
 * inteiro não é baseline, é meia informação.
 */
function sociosDoSnapshot(snapshot: SnapshotDaPeca | null | undefined, campo: 'id' | 'cpfCnpj'): string[] | null {
  const lista = snapshot?.itensPorLista?.socios;
  if (!Array.isArray(lista) || lista.length === 0) return null;

  const documentos: string[] = [];
  for (const item of lista) {
    const socio = (item as { socio?: Record<string, unknown> } | null)?.socio;
    const valor = socio?.[campo];
    const chave = campo === 'cpfCnpj' ? digitosDe(valor) : typeof valor === 'string' ? valor.trim() : '';
    if (!chave) return null;
    documentos.push(chave);
  }
  return [...new Set(documentos)];
}
