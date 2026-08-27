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
// PEDRA CONHECIDA: o snapshot não congela o `pessoa.id` — `mapearPessoa` emite
// nome, CPF/CNPJ, quotas e o resto, nunca o id. Daí o casamento por CPF/CNPJ, que
// serve dentro de um mesmo quadro (ninguém é sócio duas vezes da mesma empresa) e
// não serve para linha de titular sem pessoa cadastrada, onde o CPF vem vazio.
// Nesse caso o baseline se declara INUTILIZÁVEL (null) em vez de casar errado:
// silêncio é recuperável pela mão do consultor, evento inventado não é.

/** O recorte do `snapshot_dados` que o baseline sabe ler. */
export interface SnapshotDaPeca {
  selecao?: Record<string, Record<string, string>> | null;
  itensPorLista?: Record<string, unknown> | null;
}

export interface BaselineDaPeca {
  /** Capital que valeu no documento substituído, em número. */
  capitalAnterior: number | null;
  /** CPF/CNPJ (só dígitos) dos sócios daquele quadro; null = não dá para casar. */
  cpfCnpjDosSocios: string[] | null;
}

/** Só os dígitos: blinda o casamento contra formatação divergente entre peças. */
export function digitosDe(valor: unknown): string {
  return typeof valor === 'string' ? valor.replace(/\D/g, '') : '';
}

/**
 * O baseline de estado desta peça. Sem snapshot (documento antigo, ou peça que
 * não substitui ninguém) os dois campos vêm nulos, e quem deriva decide o que
 * fazer com a ausência.
 */
export function baselineDoSnapshot(snapshot: SnapshotDaPeca | null | undefined): BaselineDaPeca {
  return {
    capitalAnterior: capitalDoSnapshot(snapshot),
    cpfCnpjDosSocios: sociosDoSnapshot(snapshot),
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
 * Os sócios do quadro que a peça publicou, por CPF/CNPJ. Devolve null quando a
 * lista não existe (snapshot de modelo sem sócios, ou anterior a `itensPorLista`)
 * ou quando QUALQUER linha vem sem documento — um quadro que não se casa por
 * inteiro não é baseline, é meia informação.
 */
function sociosDoSnapshot(snapshot: SnapshotDaPeca | null | undefined): string[] | null {
  const lista = snapshot?.itensPorLista?.socios;
  if (!Array.isArray(lista) || lista.length === 0) return null;

  const documentos: string[] = [];
  for (const item of lista) {
    const socio = (item as { socio?: Record<string, unknown> } | null)?.socio;
    const cpfCnpj = digitosDe(socio?.cpfCnpj);
    if (!cpfCnpj) return null;
    documentos.push(cpfCnpj);
  }
  return [...new Set(documentos)];
}
