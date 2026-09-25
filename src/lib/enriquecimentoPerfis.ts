/**
 * Regras puras dos perfis de enriquecimento (`enriquecimento_perfil`) — a
 * configuração que a edge function `enriquecer-texto` consome a cada chamada.
 *
 * Aqui mora o que não toca Supabase nem React: os tipos do `contrato_saida`, a
 * conversão linha ↔ formulário e a validação antes de salvar. O banco REPETE
 * estas regras em `enriquecimento_perfil_*_check` e em
 * `enriquecimento_contrato_saida_valido()` (migration
 * `20260925133205_perfis_de_enriquecimento.sql`): validar aqui é conveniência de
 * formulário, não segurança — se as duas versões divergirem, a do banco vence e
 * o insert falha na cara do usuário.
 *
 * O QUE NÃO ESTÁ AQUI DE PROPÓSITO: o destino `simples`/`rico` da chamada. Ele
 * não existe na tabela — é escolhido por quem chama a edge function (ver
 * `enriquecimento-perfis-edge-function` nas memórias do projeto) e por isso não
 * pode aparecer no formulário como se fosse propriedade do perfil.
 */

export type TipoDeSaida = 'texto' | 'estruturada';

/** Tipo do valor de um campo estruturado — o mesmo vocabulário do contrato da Edge Function. */
export type TipoDeCampoSaida = 'texto' | 'numero';

export interface CampoDeSaida {
  /** Nome técnico do campo: a chave com que o consumidor lê a resposta. */
  nome: string;
  /** Instrução enviada ao modelo sobre o que colocar no campo. */
  descricao: string;
  /** 'texto' (padrão) ou 'numero' — vira o type do schema enviado ao modelo. */
  tipo: TipoDeCampoSaida;
  /** Campo anulável aceita null na resposta quando a informação não existir na fala. */
  nullable: boolean;
}

export type ContratoSaidaTexto = { tipo: 'texto' };
export type ContratoSaidaEstruturada = {
  tipo: 'estruturada';
  campos: Record<
    string,
    { descricao: string; tipo?: TipoDeCampoSaida; nullable?: boolean }
  >;
};
export type ContratoSaida = ContratoSaidaTexto | ContratoSaidaEstruturada;

/**
 * A linha como a tela a vê. `contrato_saida` fica `unknown` de propósito: é um
 * jsonb cuja forma só se sabe depois de `lerContratoSaida`.
 */
export interface PerfilEnriquecimento {
  id: string;
  nome: string;
  rotulo: string;
  instrucoes: string;
  modelo: string;
  temperatura: number;
  contrato_saida: unknown;
  ativo: boolean;
  updated_at: string;
}

/** O default da coluna no banco; usado só para abrir o formulário em branco. */
export const MODELO_PADRAO = 'google/gemini-3-flash-preview';

/** Igual ao CHECK `enriquecimento_perfil_nome_check` do banco. */
export const NOME_DE_PERFIL = /^[a-z][a-z0-9-]*$/;
/** Igual à validação de chave dentro de `enriquecimento_contrato_saida_valido`. */
export const NOME_DE_CAMPO = /^[a-z][a-z0-9_]*$/;

/**
 * O formulário trabalha sobre o rascunho, não sobre a linha: temperatura vem de
 * `<Input type="number">` como texto (e o usuário pode digitar vírgula), e os
 * campos da saída estruturada são LISTA, não objeto — objeto não tem ordem
 * estável e a pessoa edita campo a campo.
 */
export interface RascunhoDePerfil {
  nome: string;
  rotulo: string;
  instrucoes: string;
  modelo: string;
  temperatura: string;
  tipoDeSaida: TipoDeSaida;
  campos: CampoDeSaida[];
  ativo: boolean;
}

export function rascunhoVazio(): RascunhoDePerfil {
  return {
    nome: '',
    rotulo: '',
    instrucoes: '',
    modelo: MODELO_PADRAO,
    temperatura: '0.2',
    tipoDeSaida: 'texto',
    campos: [],
    ativo: true,
  };
}

/**
 * Monta o jsonb que vai para a coluna `contrato_saida`. A lista de campos vira
 * objeto — é a forma que a edge function lê — e a ordem do array é preservada
 * como ordem de inserção do objeto.
 *
 * `tipo` e `nullable` só entram no jsonb quando fogem do default ('texto' /
 * false): um perfil antigo, editado sem tocar nesses metadados, continua
 * byte a byte igual — e o diff de auditoria não registra mudança fantasma.
 */
export function contratoSaidaDe(
  rascunho: Pick<RascunhoDePerfil, 'tipoDeSaida' | 'campos'>,
): ContratoSaida {
  if (rascunho.tipoDeSaida === 'texto') return { tipo: 'texto' };
  return {
    tipo: 'estruturada',
    campos: Object.fromEntries(
      rascunho.campos.map((campo) => {
        const definicao: ContratoSaidaEstruturada['campos'][string] = {
          descricao: campo.descricao,
        };
        if (campo.tipo !== 'texto') definicao.tipo = campo.tipo;
        if (campo.nullable) definicao.nullable = true;
        return [campo.nome, definicao];
      }),
    ),
  };
}

/**
 * Lê o jsonb do banco sem confiar na forma dele. Qualquer desvio (objeto
 * estruturado sem campos, tipo desconhecido, não-objeto) cai em "texto" com
 * lista vazia — o formulário continua editável em vez de estourar numa tela que
 * o admin não consegue consertar. Campos no formato antigo (sem tipo/nullable)
 * são interpretados como texto obrigatório, os defaults do contrato.
 */
export function lerContratoSaida(valor: unknown): {
  tipoDeSaida: TipoDeSaida;
  campos: CampoDeSaida[];
} {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    return { tipoDeSaida: 'texto', campos: [] };
  }
  const registro = valor as Record<string, unknown>;
  if (registro.tipo !== 'estruturada') return { tipoDeSaida: 'texto', campos: [] };

  const brutos = registro.campos;
  const campos: CampoDeSaida[] =
    brutos && typeof brutos === 'object' && !Array.isArray(brutos)
      ? Object.entries(brutos as Record<string, unknown>).map(([nome, definicao]) => {
          const configuracao =
            definicao && typeof definicao === 'object' && !Array.isArray(definicao)
              ? (definicao as Record<string, unknown>)
              : {};
          return {
            nome,
            descricao: String(configuracao.descricao ?? ''),
            tipo: configuracao.tipo === 'numero' ? 'numero' : 'texto',
            nullable: configuracao.nullable === true,
          };
        })
      : [];
  return { tipoDeSaida: 'estruturada', campos };
}

export function rascunhoDe(perfil: PerfilEnriquecimento): RascunhoDePerfil {
  const { tipoDeSaida, campos } = lerContratoSaida(perfil.contrato_saida);
  return {
    nome: perfil.nome,
    rotulo: perfil.rotulo,
    instrucoes: perfil.instrucoes,
    modelo: perfil.modelo,
    temperatura: String(perfil.temperatura),
    tipoDeSaida,
    campos,
    ativo: perfil.ativo,
  };
}

/** Aceita vírgula decimal (teclado pt-BR) e recusa o que sair de [0, 1]. */
export function lerTemperatura(valor: string): number | null {
  const numero = Number(valor.trim().replace(',', '.'));
  if (!Number.isFinite(numero) || numero < 0 || numero > 1) return null;
  return numero;
}

export interface ErrosDoRascunho {
  nome?: string;
  rotulo?: string;
  instrucoes?: string;
  modelo?: string;
  temperatura?: string;
  /** Da saída estruturada como um todo (ex.: nenhum campo). */
  campos?: string;
  /** Erros por índice do array `campos` do rascunho. */
  errosDeCampo: Record<number, { nome?: string; descricao?: string }>;
}

export function validarRascunho(rascunho: RascunhoDePerfil): ErrosDoRascunho {
  const erros: ErrosDoRascunho = { errosDeCampo: {} };

  const nome = rascunho.nome.trim();
  if (!nome) erros.nome = 'Informe o nome do perfil.';
  else if (!NOME_DE_PERFIL.test(nome))
    erros.nome = 'Use apenas letras minúsculas, números e hífens, começando por letra.';

  if (!rascunho.rotulo.trim()) erros.rotulo = 'Informe o rótulo.';
  if (!rascunho.instrucoes.trim()) erros.instrucoes = 'Informe as instruções.';
  if (!rascunho.modelo.trim()) erros.modelo = 'Informe o modelo.';
  if (lerTemperatura(rascunho.temperatura) === null)
    erros.temperatura = 'Informe um número entre 0 e 1.';

  if (rascunho.tipoDeSaida === 'estruturada') {
    if (rascunho.campos.length === 0)
      erros.campos = 'A saída estruturada precisa de pelo menos um campo.';

    const vistos = new Set<string>();
    rascunho.campos.forEach((campo, indice) => {
      const doCampo = erros.errosDeCampo[indice] ?? {};

      const nomeDoCampo = campo.nome.trim();
      if (!nomeDoCampo) doCampo.nome = 'Informe o nome do campo.';
      else if (!NOME_DE_CAMPO.test(nomeDoCampo))
        doCampo.nome = 'Use apenas letras minúsculas, números e _, começando por letra.';
      else if (vistos.has(nomeDoCampo)) doCampo.nome = 'Já existe um campo com este nome.';
      else vistos.add(nomeDoCampo);

      if (!campo.descricao.trim()) doCampo.descricao = 'Informe a descrição enviada ao modelo.';

      if (doCampo.nome || doCampo.descricao) erros.errosDeCampo[indice] = doCampo;
    });
  }

  return erros;
}

export function temErros(erros: ErrosDoRascunho): boolean {
  return (
    Boolean(
      erros.nome || erros.rotulo || erros.instrucoes || erros.modelo || erros.temperatura || erros.campos,
    ) || Object.keys(erros.errosDeCampo).length > 0
  );
}

/** Os valores já limpos, na forma que vai para o banco. */
export interface ValoresDoPerfil {
  nome: string;
  rotulo: string;
  instrucoes: string;
  modelo: string;
  temperatura: number;
  contrato_saida: ContratoSaida;
  ativo: boolean;
}

export function valoresDoRascunho(rascunho: RascunhoDePerfil): ValoresDoPerfil {
  return {
    nome: rascunho.nome.trim(),
    rotulo: rascunho.rotulo.trim(),
    instrucoes: rascunho.instrucoes.trim(),
    modelo: rascunho.modelo.trim(),
    temperatura: lerTemperatura(rascunho.temperatura) ?? 0,
    contrato_saida: contratoSaidaDe(rascunho),
    ativo: rascunho.ativo,
  };
}

/** Campos cuja mudança entra no diff de auditoria, na ordem em que são lidos. */
export const CAMPOS_AUDITADOS = [
  'nome',
  'rotulo',
  'instrucoes',
  'modelo',
  'temperatura',
  'contrato_saida',
  'ativo',
];

/** O log de auditoria mostra o rótulo; o nome técnico fica no diff. */
export function nomeDeExibicao(perfil: Pick<PerfilEnriquecimento, 'rotulo' | 'nome'>): string {
  return perfil.rotulo.trim() || perfil.nome;
}

/** Descrição curta do tipo de saída, para a listagem. */
export function descricaoDoTipoDeSaida(contratoSaida: unknown): string {
  const { tipoDeSaida, campos } = lerContratoSaida(contratoSaida);
  return tipoDeSaida === 'texto' ? 'Texto' : `Estruturada · ${campos.length} ${campos.length === 1 ? 'campo' : 'campos'}`;
}
