export type CertezaClassificacao = 'alta' | 'media' | 'baixa';

export interface DefinicaoClasse {
  descricao: string;
}

export interface ExemploClassificacao<Classe extends string> {
  entrada: Record<string, unknown>;
  classe: Classe;
}

export interface DefinicaoClassificador<Classes extends Record<string, DefinicaoClasse>> {
  nome: string;
  versao: number;
  modelo: string;
  instrucoes: string;
  classes: Classes;
  classeSegura: Extract<keyof Classes, string>;
  exemplos?: ReadonlyArray<ExemploClassificacao<Extract<keyof Classes, string>>>;
}

export type ClasseDoClassificador<
  Definicao extends DefinicaoClassificador<Record<string, DefinicaoClasse>>,
> = Extract<keyof Definicao['classes'], string>;

export interface ResultadoClassificacao<Classe extends string> {
  classe: Classe;
  certeza: CertezaClassificacao;
  classificador: string;
  versao: number;
  modelo: string;
  duracaoMs: number;
  fallback: boolean;
}
