import { PAPEIS_LISTA } from '@/lib/templates/binding';
import type { MovimentoDoLedger } from '@/lib/osg/projecaoQuadro';

// O texto que o consultor lê no assistente da AC. As `pendencias` técnicas de
// `analisarAlteracao` ficam intactas: a revisão da proposta gravada as compara.

export type AvisoDaAnalise =
  | { tipo: 'divergencia'; texto: string }
  /** Conciliação interna, sem nada para o consultor decidir. */
  | { tipo: 'ruido'; tecnico: string }
  /** Pessoa que só existe em um dos lados; é ruído se um movimento pendente a explica. */
  | { tipo: 'ausente'; pessoaId: string; nome: string; presenteEm: 'base' | 'atual'; tecnico: string };

export type Lado = 'Base' | 'Atual';

export const noLado = (lado: Lado) => (lado === 'Base' ? 'no instrumento registrado' : 'no cadastro atual');

const CAMPOS: Record<string, string> = {
  sede: 'endereço completo', sedeEndereco: 'logradouro e número', sedeLogradouro: 'logradouro',
  sedeNumero: 'número', sedeComplemento: 'complemento', sedeBairro: 'bairro',
  sedeMunicipio: 'município', sedeUf: 'UF', sedeCep: 'CEP',
  cpfCnpj: 'CPF/CNPJ', nome: 'nome', tipoPessoa: 'tipo de pessoa', nacionalidade: 'nacionalidade',
  estadoCivil: 'estado civil', regimeBens: 'regime de bens', dataNascimento: 'data de nascimento',
  nire: 'NIRE', juntaComercialUf: 'UF da junta comercial', profissao: 'profissão', rg: 'RG',
  orgaoExpedidor: 'órgão expedidor', genero: 'gênero', naturalidadeMunicipio: 'naturalidade (município)',
  naturalidadeUf: 'naturalidade (UF)', filiacaoPai: 'filiação (pai)', filiacaoMae: 'filiação (mãe)',
  endereco: 'endereço',
};

export const nomeDoCampo = (campo: string) => CAMPOS[campo] ?? campo;

export const nomeDaLista = (lista: string) => PAPEIS_LISTA[lista]?.label ?? lista;

/**
 * Item sem identidade numa lista que não é de pessoas (órgãos da Matriz, acordo)
 * e sem CPF/CNPJ nem tipo de pessoa: não é qualificação, só tem `nome`.
 */
export function ehItemForaDeQualificacao(lista: string | null, campos: Record<string, unknown>): boolean {
  if (!lista) return false;
  const tipo = PAPEIS_LISTA[lista]?.tipo;
  if (!tipo || tipo === 'pessoa') return false;
  return typeof campos.cpfCnpj !== 'string' && typeof campos.tipoPessoa !== 'string';
}

/** Quem cede, recebe, aporta ou doa num movimento da empresa ainda sem documento. */
export function pessoasDosMovimentosPendentes(
  movimentos: readonly MovimentoDoLedger[],
  empresaPessoaId: string | null,
): Set<string> {
  const ids = new Set<string>();
  for (const m of movimentos) {
    if (m.empresaPessoaId !== empresaPessoaId || m.documentoGeradoId) continue;
    if (m.origemPessoaId) ids.add(m.origemPessoaId);
    if (m.destinoPessoaId) ids.add(m.destinoPessoaId);
  }
  return ids;
}

/**
 * Os avisos que chegam ao consultor, sem repetição. Pessoa presente só de um lado
 * cujo ingresso ou saída vem de movimento pendente já é narrada pelo evento do
 * movimento, e sai da lista.
 */
export function avisosParaOConsultor(
  avisos: readonly AvisoDaAnalise[],
  pessoasMovimentadas: ReadonlySet<string> = new Set(),
): string[] {
  const textos: string[] = [];
  for (const aviso of avisos) {
    if (aviso.tipo === 'divergencia') {
      textos.push(aviso.texto);
    } else if (aviso.tipo === 'ausente' && !pessoasMovimentadas.has(aviso.pessoaId)) {
      const [onde, outro] = aviso.presenteEm === 'base'
        ? ['no instrumento registrado', 'no cadastro atual']
        : ['no cadastro atual', 'no instrumento registrado'];
      textos.push(
        `${aviso.nome} consta só ${onde}, não ${outro}, e nenhum movimento de quotas pendente explica isso: `
        + 'a qualificação não foi comparada e a peça não deduz entrada nem saída.',
      );
    } else {
      console.debug('[alteracao contratual] conciliacao sem aviso:', aviso.tecnico);
    }
  }
  return [...new Set(textos)];
}
