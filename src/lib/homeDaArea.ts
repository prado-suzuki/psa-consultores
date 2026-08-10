// Para onde volta quem tomou "Acesso Negado".
//
// O `PageAccessGate` tinha um destino fixo: `/equipe/digital`. Quem batia numa
// negativa dentro da Tax era jogado para a Digital e, não tendo página nenhuma
// lá, caía num seletor vazio dizendo "Nenhuma área disponível". A pessoa perdia
// a área em que estava e ainda recebia uma segunda mensagem de erro.
//
// A área está no próprio endereço, então dá para deduzir e devolver a pessoa
// para a casa dela. Fica aqui, puro, porque a regra é de caminho e não de React.

/** Home de cada área, na ordem em que os prefixos são testados. */
const HOMES: ReadonlyArray<readonly [prefixo: string, home: string]> = [
  ['/equipe/tax', '/equipe/tax'],
  ['/equipe/osg', '/equipe/osg'],
  ['/equipe/board', '/equipe/board/dashboard'],
  ['/equipe/dev', '/equipe/digital'],
  ['/gestao', '/gestao'],
  ['/cliente', '/cliente'],
];

/** Destino quando o endereço não pertence a nenhuma área conhecida. */
export const HOME_PADRAO = '/equipe';

/**
 * A home da área a que o endereço pertence.
 *
 * O casamento é por prefixo de segmento: `/equipe/taxi` não deve ser tratado
 * como Tax só por começar com as mesmas letras.
 */
export function homeDaArea(pathname: string): string {
  for (const [prefixo, home] of HOMES) {
    if (pathname === prefixo || pathname.startsWith(`${prefixo}/`)) return home;
  }
  return HOME_PADRAO;
}
