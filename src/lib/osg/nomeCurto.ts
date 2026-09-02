// Nome de pessoa como se escreve num quadro: primeiro nome, em caixa de texto.
//
// O cadastro guarda "AVELINO NERI BOCOLLI" — caixa alta e nome inteiro, que é o que
// um instrumento exige. Numa tabela de oito colunas isso ocupa a linha toda e não se
// lê. Nos quadros o nome é "Avelino".
//
// O risco do primeiro nome é COLIDIR. Duas Marias na mesma tabela viram duas linhas
// indistinguíveis, e num quadro que decide imposto isso é pior que nome comprido —
// então a desambiguação é obrigatória, não enfeite: em caso de empate, o nome cresce
// pelo sobrenome seguinte até ficar único.
//
// A chave é o ID, e não o nome: duas pessoas DIFERENTES com o mesmo nome inteiro
// existem no cadastro, e keyar por nome as fundiria numa só.
//
// Partículas ("de", "da", "dos", "e") não contam como sobrenome: crescer de "Luis"
// para "Luis de" não distingue nada.

const PARTICULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'del', 'di', 'van', 'von']);

/** "AVELINO NERI BOCOLLI" → ["Avelino", "Neri", "Bocolli"], sem partículas. */
function partes(nome: string): string[] {
  return nome
    .trim()
    .split(/\s+/)
    .map((parte) => parte.toLocaleLowerCase('pt-BR'))
    .filter((parte) => parte !== '' && !PARTICULAS.has(parte))
    .map((parte) => parte.charAt(0).toLocaleUpperCase('pt-BR') + parte.slice(1));
}

/**
 * Nome curto de uma pessoa só, sem contexto: o primeiro nome. Use `nomesCurtos`
 * quando houver uma lista — é lá que a colisão aparece.
 */
export function primeiroNome(nome: string): string {
  return partes(nome)[0] ?? nome.trim();
}

/**
 * Nome curto de cada pessoa, resolvendo colisão dentro do CONJUNTO recebido.
 *
 * Cresce só quem precisa: com "Avelino Neri Bocolli" e "Avelino Costa" na mesma
 * tabela, os dois viram "Avelino Neri" e "Avelino Costa", e os demais continuam com
 * o primeiro nome. Homônimo verdadeiro — duas pessoas com o mesmo nome inteiro —
 * chega ao nome completo e para: inventar "Maria (2)" esconderia que o cadastro tem
 * duas, e quem resolve isso é o cadastro, não a exibição.
 */
export function nomesCurtos(
  pessoas: Array<{ id: string; nome: string }>,
): Map<string, string> {
  const porId = new Map(pessoas.map((p) => [p.id, partes(p.nome)]));

  const curto = new Map<string, string>();
  for (const [id, p] of porId) {
    curto.set(id, p[0] ?? '');
  }

  // Cresce enquanto houver empate e houver sobrenome para acrescentar. O limite de
  // voltas é o maior nome, então homônimo verdadeiro não gera laço infinito.
  const maxPartes = Math.max(1, ...[...porId.values()].map((p) => p.length));
  for (let usar = 2; usar <= maxPartes; usar += 1) {
    const contagem = new Map<string, number>();
    for (const valor of curto.values()) {
      contagem.set(valor, (contagem.get(valor) ?? 0) + 1);
    }
    const empatados = [...curto].filter(([, valor]) => (contagem.get(valor) ?? 0) > 1);
    if (empatados.length === 0) break;

    for (const [id] of empatados) {
      const p = porId.get(id)!;
      if (p.length >= usar) curto.set(id, p.slice(0, usar).join(' '));
    }
  }

  return curto;
}
