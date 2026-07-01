// Catálogo de TIPOS de documento da OSG (Fase 1 — só frontend, nada persistido).
//
// A tela grava apenas `categoria` (enum osg_doc_categoria). O "tipo" é uma camada
// de organização acima da categoria: ajuda o usuário a achar o que precisa numa
// lista completa e, ao ser escolhido, pré-seleciona a categoria correta. Assim a
// barra/telas continuam enxutas (poucas categorias) mas cobrem todos os documentos
// que a OSG manipula (ver Relatorio_Geral / mapeamento de processos).
//
// `origem` espelha o enum osg_doc_fonte ('cliente' = recebido; 'psa' = produzido).
// Muitos itens ainda caem em 'outros' — são os candidatos naturais a novas
// categorias (Contábil/Financeiro, Governança, Planejamento Tributário, Gestão do
// Projeto), que exigiriam uma migration aditiva e ficam fora da Fase 1.
import type { DocCategoria } from '@/hooks/useDocumentoArquivo';

export type DocOrigem = 'cliente' | 'psa';

export interface TipoDocumento {
  tipo: string;
  categoria: DocCategoria;
  origem: DocOrigem;
}

export const TIPOS_DOCUMENTO: TipoDocumento[] = [
  // ————————————————— Recebidos do cliente —————————————————
  // Pessoais (Qualificação das Partes)
  { tipo: 'CPF', categoria: 'pessoais', origem: 'cliente' },
  { tipo: 'RG / CNH', categoria: 'pessoais', origem: 'cliente' },
  { tipo: 'Certidão de nascimento', categoria: 'pessoais', origem: 'cliente' },
  { tipo: 'Certidão de casamento / União estável', categoria: 'pessoais', origem: 'cliente' },
  { tipo: 'Comprovante de endereço', categoria: 'pessoais', origem: 'cliente' },
  { tipo: 'Pacto antenupcial', categoria: 'pessoais', origem: 'cliente' },
  // Bens imóveis e direitos
  { tipo: 'Matrícula do imóvel', categoria: 'bens_direitos', origem: 'cliente' },
  { tipo: 'Matrícula atualizada (pós-integralização)', categoria: 'bens_direitos', origem: 'cliente' },
  { tipo: 'Escritura pública de compra e venda', categoria: 'bens_direitos', origem: 'cliente' },
  { tipo: 'Contrato particular de compra e venda (CCV)', categoria: 'bens_direitos', origem: 'cliente' },
  // Fiscais
  { tipo: 'IPTU / Inscrição Municipal', categoria: 'cadastros_fiscais', origem: 'cliente' },
  { tipo: 'ITR', categoria: 'cadastros_fiscais', origem: 'cliente' },
  { tipo: 'CCIR', categoria: 'cadastros_fiscais', origem: 'cliente' },
  // Georreferenciamento
  { tipo: 'Documento de georreferenciamento (SIGEF)', categoria: 'georreferenciamento', origem: 'cliente' },
  // Atividade rural / agrários
  { tipo: 'CAR (Cadastro Ambiental Rural)', categoria: 'agrarios', origem: 'cliente' },
  { tipo: 'Livro-caixa do Produtor Rural', categoria: 'agrarios', origem: 'cliente' },
  { tipo: 'Planilha de Exploração preenchida (cliente)', categoria: 'agrarios', origem: 'cliente' },
  { tipo: 'Contrato de arrendamento pré-existente', categoria: 'agrarios', origem: 'cliente' },
  // Declaração IR
  { tipo: 'DIRPF (Declaração de Imposto de Renda)', categoria: 'declaracao_ir', origem: 'cliente' },
  // Contábil / financeiro (sem categoria dedicada → 'outros' por ora)
  { tipo: 'Balanço / Balancete / DRE', categoria: 'outros', origem: 'cliente' },
  // Societários (contratos/atos registrados que voltam do cartório)
  { tipo: 'Contrato Social Agro registrado', categoria: 'societarios', origem: 'cliente' },
  { tipo: 'Contrato Social Participações registrado', categoria: 'societarios', origem: 'cliente' },
  { tipo: 'Contrato Social Holding Individual registrado', categoria: 'societarios', origem: 'cliente' },
  { tipo: 'Ata de Reunião de Sócios', categoria: 'societarios', origem: 'cliente' },
  { tipo: 'Distrato registrado em cartório', categoria: 'societarios', origem: 'cliente' },
  { tipo: 'Contrato de Composse registrado', categoria: 'societarios', origem: 'cliente' },
  { tipo: 'Contrato de Parceria registrado em cartório', categoria: 'societarios', origem: 'cliente' },
  { tipo: 'AC Agro - Imóvel Adicional registrada', categoria: 'societarios', origem: 'cliente' },
  { tipo: 'AC Agro - Integralização registrada', categoria: 'societarios', origem: 'cliente' },
  { tipo: 'AC por Exigência Cartorial registrada', categoria: 'societarios', origem: 'cliente' },
  { tipo: 'AC Reorganização registrada', categoria: 'societarios', origem: 'cliente' },
  { tipo: 'Planilha de Capital Social', categoria: 'societarios', origem: 'cliente' },
  // Governança (sem categoria dedicada → 'societarios' por ora)
  { tipo: 'Acordo de Quotistas assinado', categoria: 'societarios', origem: 'cliente' },
  { tipo: 'AC Participações - Governança registrada', categoria: 'societarios', origem: 'cliente' },
  // Sucessórios
  { tipo: 'Instrumento de Doação assinado', categoria: 'sucessorios', origem: 'cliente' },
  { tipo: 'AC Participações - Doação registrada', categoria: 'sucessorios', origem: 'cliente' },
  { tipo: 'Guia / Comprovante de recolhimento ITCMD', categoria: 'sucessorios', origem: 'cliente' },
  { tipo: 'Testamento lavrado em cartório de notas', categoria: 'sucessorios', origem: 'cliente' },

  // ————————————————— Produzidos pela PSA —————————————————
  // Gestão do projeto (sem categoria dedicada → 'outros' por ora)
  { tipo: 'Memorando de documentos preliminares', categoria: 'outros', origem: 'psa' },
  { tipo: 'Ata de Kickoff', categoria: 'outros', origem: 'psa' },
  { tipo: 'Apresentação do Projeto (PPT)', categoria: 'outros', origem: 'psa' },
  { tipo: 'Contrato PSA × Cliente (formalização)', categoria: 'outros', origem: 'psa' },
  { tipo: 'Nota devolutiva do cartório', categoria: 'outros', origem: 'psa' },
  { tipo: 'Diagnóstico Flash (encerramento)', categoria: 'outros', origem: 'psa' },
  { tipo: 'Relatório final do projeto', categoria: 'outros', origem: 'psa' },
  { tipo: 'Apresentação Final de Sucessão (3 cenários ITCMD)', categoria: 'outros', origem: 'psa' },
  { tipo: 'Diagnóstico Patrimonial (DP)', categoria: 'outros', origem: 'psa' },
  // Working papers / checklists
  { tipo: 'WP Qualificação dos Sócios', categoria: 'pessoais', origem: 'psa' },
  { tipo: 'WP Digitação de Matrícula', categoria: 'georreferenciamento', origem: 'psa' },
  { tipo: 'Checklist de impedimentos de matrícula', categoria: 'bens_direitos', origem: 'psa' },
  { tipo: 'Checklist de revisão de minuta', categoria: 'societarios', origem: 'psa' },
  // Minutas societárias
  { tipo: 'Minuta Contrato Social Agro', categoria: 'societarios', origem: 'psa' },
  { tipo: 'Minuta Contrato Social Participações', categoria: 'societarios', origem: 'psa' },
  { tipo: 'Minuta Contrato Social Holding Individual', categoria: 'societarios', origem: 'psa' },
  { tipo: 'Minuta de Distrato de Arrendamento', categoria: 'agrarios', origem: 'psa' },
  { tipo: 'Minuta Contrato de Composse + Anexo', categoria: 'societarios', origem: 'psa' },
  { tipo: 'Minuta Contrato de Parceria Rural + Anexo', categoria: 'agrarios', origem: 'psa' },
  { tipo: 'Minuta AC Agro - Imóvel Adicional (2º momento)', categoria: 'societarios', origem: 'psa' },
  { tipo: 'Minuta AC Agro - Integralização (cl. 5ª)', categoria: 'societarios', origem: 'psa' },
  { tipo: 'Minuta AC por Exigência Cartorial', categoria: 'societarios', origem: 'psa' },
  { tipo: 'Minuta AC Reorganização', categoria: 'societarios', origem: 'psa' },
  { tipo: 'Laudo de avaliação (Reorganização)', categoria: 'societarios', origem: 'psa' },
  { tipo: 'Protocolo e Justificação (Reorganização)', categoria: 'societarios', origem: 'psa' },
  // Sucessório (PSA)
  { tipo: 'Minuta de Testamento', categoria: 'sucessorios', origem: 'psa' },
  { tipo: 'Minuta Instrumento de Doação de Cotas', categoria: 'sucessorios', origem: 'psa' },
  { tipo: 'Minuta AC Participações - Reflexo da Doação', categoria: 'sucessorios', origem: 'psa' },
  { tipo: 'Planilha cálculo ITCMD (3 cenários)', categoria: 'sucessorios', origem: 'psa' },
  { tipo: 'Projeto de Sucessão Empresarial', categoria: 'sucessorios', origem: 'psa' },
  // Planejamento tributário (sem categoria dedicada → 'outros' por ora)
  { tipo: 'Planilha Planejamento Tributário Rural', categoria: 'outros', origem: 'psa' },
  // Governança (PSA) (sem categoria dedicada → 'societarios' por ora)
  { tipo: 'Questionário de Governança (PSA)', categoria: 'societarios', origem: 'psa' },
  { tipo: 'Respostas do questionário de governança', categoria: 'societarios', origem: 'psa' },
  { tipo: 'Minuta Acordo de Quotistas', categoria: 'societarios', origem: 'psa' },
  { tipo: 'Planilha Protocolo de Remuneração', categoria: 'societarios', origem: 'psa' },
  { tipo: 'Protocolo de Remuneração (final)', categoria: 'societarios', origem: 'psa' },
  { tipo: 'DAC - Descrição e Análise de Cargo dos Diretores', categoria: 'societarios', origem: 'psa' },
  { tipo: 'Matriz de Alçadas', categoria: 'societarios', origem: 'psa' },
  { tipo: 'Regimento Interno do Conselho', categoria: 'societarios', origem: 'psa' },
  { tipo: 'Minuta AC Participações - Reflexo Governança', categoria: 'societarios', origem: 'psa' },
];

/** Tipos de uma origem, agrupados por categoria (ordem de docMeta.CATEGORIAS). */
export function tiposPorCategoria(
  origem: DocOrigem,
  ordemCategorias: DocCategoria[],
): { categoria: DocCategoria; tipos: TipoDocumento[] }[] {
  const daOrigem = TIPOS_DOCUMENTO.filter((t) => t.origem === origem);
  return ordemCategorias
    .map((categoria) => ({
      categoria,
      tipos: daOrigem
        .filter((t) => t.categoria === categoria)
        .sort((a, b) => a.tipo.localeCompare(b.tipo, 'pt-BR')),
    }))
    .filter((g) => g.tipos.length > 0);
}

export const categoriaDoTipo = (tipo: string): DocCategoria | null =>
  TIPOS_DOCUMENTO.find((t) => t.tipo === tipo)?.categoria ?? null;
