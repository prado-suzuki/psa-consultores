// Valor SINTETIZADO pelo motor: o que o mapeador escreveu de si mesmo (rótulo
// genérico de quem não tem nome, valor nominal da quota, qualquer default), em
// oposição ao que veio do cadastro.
//
// Existe por causa de uma armadilha do contrato (emenda 9.1): os campos que
// "nunca podem ser vazios" — imovel.cartorio e sociedade.quotaValorNominal —
// seguravam no documento exatamente o bloco que a regra de descarte deveria
// remover. Bastava a cláusula de capital citar o valor nominal para o contrato
// sem sócios voltar a sair com "O capital social será de R$ (), dividido em ()
// quotas". Um valor que o motor inventou não é notícia do cadastro, então não
// conta como dado (ver descarte.ts).
//
// A marca precisa sobreviver ao JSON do snapshot selado: sem isso, o documento
// vivo descartaria uma cláusula vazia, mas a mesma versão reaberta do snapshot a
// faria reaparecer. Ela viaja numa chave reservada de string, cujo valor também
// é string para continuar compatível com `Campos`. O prefixo interno evita
// colisão com campos declarados do vocabulário; o render só a enxerga se um
// bloco deliberadamente pedir essa chave.

const SINTETIZADOS = '__motorCamposSintetizados';

/**
 * Marca, no objeto de campos, quais chaves o motor sintetizou. Mutação
 * proposital (o objeto segue sendo o mesmo Campos) e acumulativa: chamar duas
 * vezes soma as chaves em vez de trocar o conjunto.
 */
export function marcarSintetizados<T extends object>(campos: T, ids: readonly string[]): T {
  const alvo = campos as Record<string, unknown>;
  const atuais = typeof alvo[SINTETIZADOS] === 'string'
    ? (alvo[SINTETIZADOS] as string).split(',').filter(Boolean)
    : [];
  alvo[SINTETIZADOS] = [...new Set([...atuais, ...ids])].join(',');
  return campos;
}

/** O valor de `objeto[campo]` foi sintetizado pelo motor? */
export function ehSintetizado(objeto: unknown, campo: string): boolean {
  if (objeto === null || typeof objeto !== 'object') return false;
  const marca = (objeto as Record<string, unknown>)[SINTETIZADOS];
  return typeof marca === 'string' && marca.split(',').includes(campo);
}
