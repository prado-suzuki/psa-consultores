import type { PecaRegistrada, RegistroContratual } from '@/hooks/useDocumentoGerado';

/**
 * As peças registradas de uma sociedade, na ordem da sucessão, e o que falta no
 * marco de cada uma.
 *
 * Existe porque o marco do registro deixou de ser obrigatório no gesto de
 * registrar: a junta devolve protocolo, número de arquivamento e PDF chancelado
 * em dias diferentes, e a peça vai registrada antes disso. Alguém precisa dizer,
 * depois, qual ato ainda está sem qual dado, e essa conta é pura.
 */

/**
 * Um campo do marco da junta, na ordem em que o diálogo os pede. Protocolo e
 * data do registro são o mínimo que o banco cobra; os quatro seguintes chegam
 * quando a junta devolver.
 */
export const CAMPOS_DO_MARCO = [
  { chave: 'protocolo', label: 'Protocolo na junta' },
  { chave: 'dataRegistro', label: 'Data do registro' },
  { chave: 'numeroArquivamento', label: 'Número do arquivamento' },
  { chave: 'juntaUf', label: 'UF' },
  { chave: 'junta', label: 'Junta comercial' },
  { chave: 'arquivoId', label: 'PDF registrado' },
] as const satisfies ReadonlyArray<{ chave: keyof RegistroContratual; label: string }>;

export interface LinhaRegistrada {
  documentoId: string;
  /** "Constituição", "1ª alteração", "2ª alteração", … */
  titulo: string;
  /** Quantas alterações vieram antes na cadeia (0 = constituição). */
  elos: number;
  registro: RegistroContratual | null;
  /** Rótulos dos campos do marco ainda em branco, na ordem do formulário. */
  faltando: string[];
}

/** Campos do marco em branco nesta peça (chave ausente ou só espaço). */
export function faltandoNoMarco(registro: RegistroContratual | null): string[] {
  return CAMPOS_DO_MARCO
    .filter(({ chave }) => !(registro?.[chave] ?? '').toString().trim())
    .map(({ label }) => label);
}

/**
 * Posição de cada peça na cadeia de substituição, contada como
 * `useOrdemNaSucessao` conta: 0 quando a peça não substitui ninguém (a
 * constituição), 1 quando substitui a constituição, e assim adiante.
 *
 * A cadeia é percorrida só dentro do conjunto recebido. Uma peça cujo
 * antecessor não está aqui (registro antigo, outra empresa) conta os elos que
 * dá para contar, em vez de sumir da lista: o consultor precisa alcançá-la
 * justamente para completar o dado que falta nela.
 */
function elosPorId(pecas: PecaRegistrada[]): Map<string, number> {
  const antecessor = new Map(pecas.map((p) => [p.id, p.substituiDocumentoId]));
  const elos = new Map<string, number>();
  for (const peca of pecas) {
    // Ciclo é impossível pelo fluxo (o sucessor nasce depois), mas dado torto
    // não pode travar a tela.
    const vistos = new Set<string>();
    let atual: string | null | undefined = peca.id;
    let n = 0;
    while (atual && !vistos.has(atual)) {
      vistos.add(atual);
      atual = antecessor.get(atual) ?? null;
      if (atual) n += 1;
    }
    elos.set(peca.id, n);
  }
  return elos;
}

export function linhasRegistradas(pecas: PecaRegistrada[]): LinhaRegistrada[] {
  const elos = elosPorId(pecas);
  return pecas
    .map((peca) => {
      const n = elos.get(peca.id) ?? 0;
      return {
        documentoId: peca.id,
        // O papel manda quando existe: peça sem papel carimbado (registro
        // antigo) cai na conta dos elos, que dá o mesmo resultado no caso normal.
        titulo: peca.papel === 'constitutivo' || n === 0 ? 'Constituição' : `${n}ª alteração`,
        elos: n,
        registro: peca.registro,
        faltando: faltandoNoMarco(peca.registro),
      };
    })
    .sort((a, b) => a.elos - b.elos);
}

/**
 * O marco a gravar a partir de um formulário: só os campos com conteúdo, já
 * aparados, e a UF em maiúsculas.
 *
 * A chave AUSENTE é o "a junta ainda não devolveu"; string vazia seria "não
 * tem", e o banco recusa (a trigger levanta "Campo do registro em branco").
 * Manter essa diferença aqui é o que deixa a peça registrada dizer com precisão
 * o que ainda falta nela.
 */
export function marcoPreenchido(
  campos: Partial<Record<(typeof CAMPOS_DO_MARCO)[number]['chave'], string | null | undefined>>,
): Omit<RegistroContratual, 'versao' | 'confirmacaoId'> {
  const marco: Record<string, string> = {};
  for (const { chave } of CAMPOS_DO_MARCO) {
    const valor = (campos[chave] ?? '').trim();
    if (!valor) continue;
    marco[chave] = chave === 'juntaUf' ? valor.toUpperCase() : valor;
  }
  return marco;
}
