import type { DefinicaoClasse, DefinicaoClassificador } from './tipos.ts';

export function definirClassificador<const Classes extends Record<string, DefinicaoClasse>>(
  definicao: DefinicaoClassificador<Classes>,
): DefinicaoClassificador<Classes> {
  if (!/^[a-z][a-z0-9-]*$/.test(definicao.nome)) {
    throw new Error('Classificador inválido: nome.');
  }
  if (!Number.isInteger(definicao.versao) || definicao.versao < 1) {
    throw new Error('Classificador inválido: versão.');
  }
  if (!definicao.modelo.trim() || !definicao.instrucoes.trim()) {
    throw new Error('Classificador inválido: modelo ou instruções.');
  }

  const classes = Object.entries(definicao.classes);
  if (classes.length < 2 || classes.some(([nome, classe]) => !nome || !classe.descricao.trim())) {
    throw new Error('Classificador inválido: classes.');
  }
  if (!Object.prototype.hasOwnProperty.call(definicao.classes, definicao.classeSegura)) {
    throw new Error('Classificador inválido: classe segura.');
  }
  if (
    definicao.exemplos?.some(
      (exemplo) => !Object.prototype.hasOwnProperty.call(definicao.classes, exemplo.classe),
    )
  ) {
    throw new Error('Classificador inválido: exemplo com classe desconhecida.');
  }

  return definicao;
}
