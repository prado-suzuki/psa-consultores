// Caminho → rótulo legível, pro hover do preview (`TextoComProveniencia.tsx`) mostrar de
// qual campo do cadastro veio cada trecho do texto gerado. É o inverso de
// `contratoRuralCampoOrigem.ts` (que vai de campo → trecho do modelo, pro tooltip da
// tela); aqui vai de caminho → rótulo, pro hover DENTRO do documento renderizado.
//
// Por que não `classificarCaminho` (o vocabulário real do motor, `src/lib/templates/
// campos.ts`): ele só resolve papéis cadastrados em `PAPEIS` (`binding.ts`) —
// outorgante/imovel entre eles, mas não explorador/compossuidor/testemunha/admin/
// origem.outorgante, que são específicos dos dois contratos rurais. Estender o
// vocabulário real seria editar arquivo da OSG Work, fora do escopo deste mockup — este
// arquivo é o equivalente próprio, no mesmo espírito.
//
// Só cobre CAMINHOS DE VALOR (os que de fato aparecem em `Pedaco.caminho` — ver
// `render.ts`: só `{{ x }}` carrega caminho; `{{#secao}}` não marca o conteúdo com o
// caminho da própria seção). Flags puramente condicionais (permitePenhor,
// vigenciaProrrogavel, regraMaioria...) nunca aparecem como texto próprio, então não
// precisam de rótulo aqui.

/** Prefixo do papel (1º segmento de um caminho `papel.campo`). */
const PREFIXOS: Record<string, string> = {
  outorgante: 'Outorgante',
  explorador: 'Explorador',
  compossuidor: 'Compossuidor',
  testemunha: 'Testemunha',
  admin: 'Administrador nomeado',
  imovel: 'Imóvel',
  origem: 'Origem',
};

/** Nome do campo (2º segmento em `papel.campo`, ou 3º em `origem.outorgante.campo`) — compartilhado entre papéis. */
const LEAVES: Record<string, string> = {
  // PJ (mapearSociedade / qualificacaoPJ)
  razaoSocial: 'Razão social',
  cnpj: 'CNPJ',
  nire: 'NIRE',
  juntaUf: 'UF da Junta Comercial',
  capitalValor: 'Capital social',
  sede: 'Sede (endereço)',
  administradores: 'Administradores',
  // PF (mapearPessoa / qualificacaoPF) — inclui as palavras de concordância derivadas,
  // que apontam pro mesmo dado substantivo (nascido→data de nascimento, por exemplo).
  nome: 'Nome',
  brasileiro: 'Nacionalidade',
  naturalidadeMunicipio: 'Município de nascimento',
  naturalidadeUf: 'UF de nascimento',
  nascido: 'Data de nascimento',
  dataNascimento: 'Data de nascimento',
  filiacaoPai: 'Nome do pai',
  filiacaoMae: 'Nome da mãe',
  profissao: 'Profissão',
  casado: 'Estado civil',
  regimeBens: 'Regime de bens',
  portador: 'RG',
  rg: 'RG',
  orgaoExpedidor: 'Órgão expedidor do RG',
  inscrito: 'CPF',
  cpf: 'CPF',
  cpfCnpj: 'CPF/CNPJ',
  residente: 'Endereço',
  endereco: 'Endereço',
  // Imóvel
  ref: 'Item/alínea',
  areaExplorada: 'Área explorada',
  areaTotal: 'Área total (matrícula)',
  nomeImovel: 'Nome/denominação',
  matricula: 'Nº da matrícula',
  municipio: 'Município',
  uf: 'UF',
  proprietario: 'Proprietário',
  // Compossuidor
  fracao: 'Fração',
  // Origem (grupo do Considerando V)
  letra: 'Letra/alínea do grupo',
  itens: 'Imóveis agrupados',
  tipoInstrumentoOrigem: 'Tipo da origem',
  dataAssinatura: 'Data',
};

/** Campos de nível superior (sem papel) — direto do cadastro, não de uma pessoa/imóvel/origem. */
const ESPECIAIS: Record<string, string> = {
  naturezaExploracao: 'Natureza da exploração (Agropecuária/Agrícola)',
  naturezaExploracaoPlural: 'Natureza da exploração (plural)',
  dataEncerramento: 'Data de encerramento',
  culturas: 'Culturas/atividades permitidas',
  percentualOutorgante: 'Percentual do outorgante',
  percentualExplorador: 'Percentual do explorador',
  foroComarca: 'Foro — comarca',
  foroUf: 'Foro — UF',
  numeroVias: 'Número de vias',
  dataAssinatura: 'Data da assinatura',
  proprietarioComum: 'Proprietário (todos os imóveis)',
  cartorioComarcaComum: 'Cartório — comarca',
  cartorioUfComum: 'Cartório — UF',
  imoveisAlineasRange: 'Intervalo de alíneas (calculado)',
  nomeComposse: 'Nome da composse',
  liquidacaoNumeroParcelas: 'Número de parcelas da liquidação',
  prazoIndivisao: 'Prazo de indivisão',
  indivisaoAvisoPrazo: 'Aviso prévio para não renovar',
};

/** "outorgante.razaoSocial" → "Outorgante — Razão social". Sem entrada conhecida, devolve o caminho cru — nunca quebra o hover por falta de rótulo. */
export function rotuloDoCaminho(caminho: string): string {
  const partes = caminho.split('.');
  if (partes.length === 1) return ESPECIAIS[caminho] ?? caminho;
  if (partes.length === 3 && partes[0] === 'origem' && partes[1] === 'outorgante') {
    return `Outorgante da origem — ${LEAVES[partes[2]] ?? partes[2]}`;
  }
  const [papel, campo] = partes;
  return `${PREFIXOS[papel] ?? papel} — ${LEAVES[campo] ?? campo}`;
}
