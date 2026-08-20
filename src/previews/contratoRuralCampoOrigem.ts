import { rotulosNumeracao } from '@/lib/templates';
import type { Bloco } from '@/lib/templates/types';
import { BLOCOS_COMPOSSE, BLOCOS_PARCERIA } from './contratoRuralBlocos';
import type { TipoExploracao } from './contratosExploracaoModel';

// Mapa CAMPO → onde ele aparece no texto do modelo oficial (`contratoRuralBlocos.ts`),
// para o tooltip "onde esse campo entra no contrato" (pedido do usuário em 20/08/2026,
// substituindo o tooltip de justificativa — ver `docs/osg/contratos_exploracao/
// 07-tooltips-justificativa.md`, que preserva o texto anterior).
//
// Cada entrada registra só o(s) `caminho` do placeholder (ex.: 'permitePenhor',
// 'origem.outorgante.nire') — TODA ocorrência é achada varrendo os blocos reais de
// `contratoRuralBlocos.ts` (o mesmo texto que `gerarComposicao` usa pra gerar o
// contrato), não uma lista de blocos escolhida à mão: um campo que gate um capítulo
// inteiro (ex. `permitePenhor`) aparece em várias cláusulas, e a varredura acha todas
// sem precisar listar cada `blocoId`. O rótulo da cláusula/parágrafo/capítulo é
// CALCULADO por `rotulosNumeracao` — a mesma passada estrutural do motor —, nunca
// digitado à mão, pra nunca dessincronizar se um bloco for reordenado.

export type CampoContrato =
  | 'outorgante' | 'exploradores' | 'compossuidores' | 'nomeComposse'
  | 'percentualOutorgante' | 'percentualExplorador' | 'culturas' | 'permitePenhor'
  | 'naturezaExploracao'
  | 'prazoIndivisao' | 'indivisaoAvisoPrazo' | 'indivisaoProrrogavel'
  | 'regraAdministracao' | 'administradoresNomeados'
  | 'liquidacaoPeriodicidade' | 'liquidacaoNumeroParcelas'
  | 'foroComarca' | 'foroUf' | 'testemunhaNome' | 'testemunhaCpf' | 'testemunhaRg'
  | 'numeroVias' | 'dataAssinatura'
  | 'dataEncerramento' | 'vigenciaProrrogavel'
  | 'imovelMatricula' | 'imovelAreaExplorada'
  | 'origemTipo' | 'origemInstrumento' | 'origemDataAssinatura'
  | 'origemOutorganteNome' | 'origemOutorganteCnpj' | 'origemOutorganteSede' | 'origemOutorganteNire'
  | 'origemOutorganteCapitalSocial' | 'origemOutorganteAdministradores'
  | 'estudoFiscal' | 'documentoComprobatorio' | 'origemTituloInstrumento';

interface EntradaCampo {
  /** Caminho(s) do placeholder a procurar em TODOS os blocos — uma varredura, não uma lista de blocos escolhida à mão. */
  parceria?: string[];
  composse?: string[];
  /** Quando o campo não tem NENHUM placeholder no modelo hoje (referência de arquivo, ou cláusula de redação fixa). */
  semOcorrencia?: { motivo: string; blocoFixo?: { blocoId: string; tipo: TipoExploracao } };
}

const REGISTRO: Record<CampoContrato, EntradaCampo> = {
  outorgante: { parceria: ['outorgante.razaoSocial'] },
  exploradores: { parceria: ['explorador.nome'] },
  compossuidores: { composse: ['compossuidor.nome', 'compossuidor.fracao'] },
  nomeComposse: { composse: ['nomeComposse'] },
  percentualOutorgante: { parceria: ['percentualOutorgante'] },
  percentualExplorador: { parceria: ['percentualExplorador'] },
  culturas: { parceria: ['culturas'], composse: ['culturas'] },
  permitePenhor: { parceria: ['permitePenhor'], composse: ['permitePenhor'] },
  naturezaExploracao: { parceria: ['naturezaExploracao', 'naturezaExploracaoPlural'] },
  prazoIndivisao: { composse: ['prazoIndivisao'] },
  indivisaoAvisoPrazo: { composse: ['indivisaoAvisoPrazo'] },
  indivisaoProrrogavel: { composse: ['indivisaoProrrogavel'] },
  regraAdministracao: { composse: ['regraMaioria', 'regraNomeados'] },
  administradoresNomeados: { composse: ['admin.nome'] },
  liquidacaoPeriodicidade: { composse: ['liquidacaoMensal', 'liquidacaoAnual'] },
  liquidacaoNumeroParcelas: { composse: ['liquidacaoNumeroParcelas'] },
  foroComarca: { parceria: ['foroComarca'], composse: ['foroComarca'] },
  foroUf: { parceria: ['foroUf'], composse: ['foroUf'] },
  testemunhaNome: { parceria: ['testemunha.nome'], composse: ['testemunha.nome'] },
  testemunhaCpf: { parceria: ['testemunha.cpf'], composse: ['testemunha.cpf'] },
  testemunhaRg: { parceria: ['testemunha.rg'], composse: ['testemunha.rg'] },
  numeroVias: { parceria: ['numeroVias'], composse: ['numeroVias'] },
  dataAssinatura: { parceria: ['dataAssinatura'], composse: ['dataAssinatura'] },
  dataEncerramento: { parceria: ['dataEncerramento'] },
  vigenciaProrrogavel: { parceria: ['vigenciaProrrogavel'] },
  imovelMatricula: { parceria: ['imovel.matricula'], composse: ['imovel.matricula'] },
  imovelAreaExplorada: { parceria: ['imovel.areaExplorada'], composse: ['imovel.areaExplorada'] },
  origemTipo: { composse: ['origem.tipoInstrumentoOrigem'] },
  origemInstrumento: { composse: ['origem.vemDeOutroInstrumento'] },
  origemDataAssinatura: { composse: ['origem.dataAssinatura'] },
  origemOutorganteCnpj: { composse: ['origem.outorgante.cnpj'] },
  origemOutorganteSede: { composse: ['origem.outorgante.sede'] },
  origemOutorganteNome: { composse: ['origem.outorgante.razaoSocial'] },
  origemOutorganteNire: { composse: ['origem.outorgante.nire'] },
  origemOutorganteCapitalSocial: { composse: ['origem.outorgante.capitalValor'] },
  origemOutorganteAdministradores: { composse: ['origem.outorgante.administradores'] },
  // Campos sem placeholder no modelo hoje — a tela captura o dado, mas nenhum bloco o
  // cita. `blocoFixo` (quando existe) mostra a redação fixa que ocupa o lugar dele, pra
  // contexto de por que não há {{variável}}.
  estudoFiscal: {
    semOcorrencia: { motivo: 'Referência de arquivo (Documentos do Cliente) — não é citada no texto do contrato, só no cadastro.' },
  },
  documentoComprobatorio: {
    semOcorrencia: { motivo: 'Referência de arquivo (Documentos do Cliente) — não é citada no texto do contrato, só no cadastro.' },
  },
  // Achado ao construir este mapa (20/08/2026): o Considerando V cita só o TIPO da
  // origem ("advém de {{ origem.tipoInstrumentoOrigem }}") — o título literal digitado
  // aqui (ex.: "Contrato de Parceria Agrícola e Outras Avenças") não é lido por
  // `mapearOrigemExterna`/`agruparOrigensDistintas`. Campo capturado, mas hoje sem efeito
  // no texto gerado; achado a reportar, não corrigido aqui (mudaria a redação do
  // Considerando V, fora do escopo desta troca de tooltip).
  origemTituloInstrumento: {
    semOcorrencia: {
      motivo: 'Capturado no cadastro, mas hoje o Considerando V só cita o TIPO da origem selecionado ao lado — o título literal digitado aqui ainda não é lido pelo motor. Achado a reportar ao tech lead.',
    },
  },
};

export interface TrechoModelo {
  rotulo: string;
  antes: string;
  campo: string;
  depois: string;
}

export type ResultadoTrechos =
  | { ok: true; trechos: TrechoModelo[]; extras: number }
  | { ok: false; motivo: string; trechoFixo?: TrechoModelo };

/** Nome de exibição pros blocos `tipo: 'livre'` usados como âncora aqui — `rotulosNumeracao` não numera livre (não é cláusula/parágrafo/capítulo). */
const NOME_BLOCO_LIVRE: Record<string, string> = {
  'par-titulo': 'Título do instrumento',
  'par-preambulo': 'Preâmbulo — qualificação das partes',
  'par-titulo-atividades': 'Título — Das Atividades',
  'par-fecho': 'Fecho — assinaturas',
  'par-titulo-anuencia': 'Título — Da Anuência',
  'com-preambulo-partes': 'Preâmbulo — qualificação das partes',
  'com-preambulo-v': 'Preâmbulo, Considerando V',
  'com-fecho': 'Fecho — assinaturas',
  'com-anexo': 'Anexo Único',
};

function rotuloDoBloco(blocos: Bloco[], indice: number): string {
  const estrutural = rotulosNumeracao(blocos)[indice];
  if (estrutural) return estrutural;
  return NOME_BLOCO_LIVRE[blocos[indice].id] ?? 'trecho do modelo';
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Acha `{{ caminho }}`, `{{caminho}}`, `{{#caminho}}` ou `{{/caminho}}` — a primeira ocorrência no bloco. */
function localizarPlaceholder(conteudo: string, caminho: string): { inicio: number; fim: number } | null {
  const re = new RegExp(`\\{\\{\\s*[#/]?\\s*${escaparRegex(caminho)}\\s*\\}\\}`);
  const m = re.exec(conteudo);
  return m ? { inicio: m.index, fim: m.index + m[0].length } : null;
}

function limpar(texto: string): string {
  return texto.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
}

/** Tira o envoltório `{{#flag}}…{{/flag}}` de um bloco 100% condicional, pra exibir só a prosa quando o texto inteiro é "redação fixa" de exemplo. */
function semEnvolucroDeFlag(texto: string): string {
  return texto.replace(/^\{\{#[\w.]+\}\}/, '').replace(/\{\{\/[\w.]+\}\}\s*$/, '');
}

function montarTrecho(blocos: Bloco[], indice: number, caminho: string, janela = 90): TrechoModelo | null {
  const bloco = blocos[indice];
  const achado = localizarPlaceholder(bloco.conteudo, caminho);
  if (!achado) return null;
  const cortouAntes = achado.inicio - janela > 0;
  const cortouDepois = achado.fim + janela < bloco.conteudo.length;
  let antes = bloco.conteudo.slice(Math.max(0, achado.inicio - janela), achado.inicio);
  let depois = bloco.conteudo.slice(achado.fim, achado.fim + janela);
  if (cortouAntes) antes = antes.slice(antes.indexOf(' ') + 1);
  if (cortouDepois) depois = depois.slice(0, depois.lastIndexOf(' '));
  return {
    rotulo: rotuloDoBloco(blocos, indice),
    antes: (cortouAntes ? '(…) ' : '') + limpar(antes),
    campo: bloco.conteudo.slice(achado.inicio, achado.fim),
    depois: limpar(depois) + (cortouDepois ? ' (…)' : ''),
  };
}

const MAX_TRECHOS = 3;

/** Todas as ocorrências de `caminho` nos blocos, na ordem do documento — a varredura em si. */
function varrerBlocos(blocos: Bloco[], caminhos: string[]): TrechoModelo[] {
  const trechos: TrechoModelo[] = [];
  blocos.forEach((_, indice) => {
    for (const caminho of caminhos) {
      const trecho = montarTrecho(blocos, indice, caminho);
      if (trecho) trechos.push(trecho);
    }
  });
  return trechos;
}

/** Os trechos do modelo oficial (Parceria ou Composse) onde `campo` aparece — pro tooltip "onde isso entra no contrato". */
export function trechosDoCampo(tipo: TipoExploracao, campo: CampoContrato): ResultadoTrechos {
  const entrada = REGISTRO[campo];
  if (entrada.semOcorrencia) {
    const { motivo, blocoFixo } = entrada.semOcorrencia;
    if (!blocoFixo) return { ok: false, motivo };
    const blocos = blocoFixo.tipo === 'composse' ? BLOCOS_COMPOSSE : BLOCOS_PARCERIA;
    const indice = blocos.findIndex((b) => b.id === blocoFixo.blocoId);
    if (indice < 0) return { ok: false, motivo };
    return {
      ok: false,
      motivo,
      trechoFixo: { rotulo: rotuloDoBloco(blocos, indice), antes: '', campo: '', depois: limpar(semEnvolucroDeFlag(blocos[indice].conteudo)) },
    };
  }

  const caminhos = tipo === 'composse' ? entrada.composse : entrada.parceria;
  if (!caminhos || caminhos.length === 0) {
    return { ok: false, motivo: `Este campo não aparece no modelo de ${tipo === 'composse' ? 'Composse' : 'Parceria'}.` };
  }
  const blocos = tipo === 'composse' ? BLOCOS_COMPOSSE : BLOCOS_PARCERIA;
  const trechos = varrerBlocos(blocos, caminhos);
  return { ok: true, trechos: trechos.slice(0, MAX_TRECHOS), extras: Math.max(0, trechos.length - MAX_TRECHOS) };
}
