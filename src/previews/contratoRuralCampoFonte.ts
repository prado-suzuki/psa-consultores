import type { CampoContrato } from './contratoRuralCampoOrigem';

// Segundo tooltip do selo "NOVO"/"POSSUI" (pedido do usuário em 20/08/2026): a tag por
// si só só diz se existe tela que cadastre o campo — não diz O QUE ele significa nem DE
// ONDE ele veio. Passar o mouse na própria tag mostra os dois: uma frase em português
// simples do que o campo significa, e a citação do contrato real, exemplo, decisão de
// reunião ou tela de cadastro que comprova o campo. Fonte primária deste conteúdo:
// `docs/osg/campos-exploracao-rural.md` (tabelas 1 e 2) e
// `docs/osg/levantamento-contratos-rurais.md` — nada aqui é inventado agora; é a mesma
// evidência já registrada nesses dois documentos, só reformatada pro tooltip.
//
// `tag` decide o RÓTULO da badge, não só o conteúdo do tooltip (ajuste de 20/08/2026,
// depois do usuário notar que "outorgante"/"exploradores"/"imóvel" apareciam como NOVO
// igual a "foro"/"testemunha" — dando a impressão de que pessoa/matrícula também
// precisavam de cadastro novo, quando na verdade SÓ SELECIONAM um registro que já tem
// tela própria):
// - 'possui': o campo SELECIONA um registro que já tem cadastro em outro módulo da OSG
//   Work (pessoa em Qualificação das Partes, matrícula em Diagnóstico Patrimonial,
//   arquivo em Documentos do Cliente) — o que falta tela é o VÍNCULO, não a entidade.
// - 'novo': não existe tela nem registro de cadastro pra isto em lugar nenhum hoje —
//   é texto/número/escolha que só existe porque este instrumento específico o define.

export interface FonteCampo {
  tag: 'novo' | 'possui';
  /** O que o campo significa, em português simples — sem jargão sem explicar. */
  explicacao: string;
  /** Contrato real, exemplo, decisão de reunião ou tela de cadastro que comprova o campo. */
  fonte: string;
}

const REGISTRO: Record<CampoContrato, FonteCampo> = {
  outorgante: {
    tag: 'possui',
    explicacao: 'Quem cede o uso da terra na Parceria — sempre uma pessoa já cadastrada, nunca digitada aqui.',
    fonte: 'A pessoa em si vem de Qualificação das Partes → Modal de Pessoa. O que esta tela acrescenta é só o PAPEL de outorgante neste instrumento — presente em todos os contratos de Parceria lidos; sempre único (reunião de validação, Luana/OSG, 19/08/2026).',
  },
  exploradores: {
    tag: 'possui',
    explicacao: 'Quem recebe a terra e explora a produção — cada um já é pessoa cadastrada; pode ser mais de uma no mesmo contrato, sem fração individual.',
    fonte: 'As pessoas vêm de Qualificação das Partes → Modal de Pessoa. `[BV-PAR]` tem 3 outorgados numa única parceria — confirmado em reunião de validação (19/08/2026) que vira lista.',
  },
  compossuidores: {
    tag: 'possui',
    explicacao: 'As pessoas que dividem a posse de um imóvel entre si — já cadastradas, cada uma com sua fração dos frutos/resultado da composse.',
    fonte: 'Pessoas vêm de Qualificação das Partes → Modal de Pessoa. `[BV-COM]` (3 compossuidores, 70/15/15%) e `[ROS-COM]` (4 compossuidores, 25% cada).',
  },
  nomeComposse: {
    tag: 'novo',
    explicacao: 'Nome pelo qual a composse é identificada no próprio contrato — sempre o 1º compossuidor listado seguido de "E OUTROS", nunca digitado.',
    fonte: 'Padrão observado nos títulos de `[BV-COM]` ("Sérgio Pitt e Outros") e `[ROS-COM]`. A fórmula em si não existe em nenhuma tela de cadastro, só usa nomes que já vêm de lá.',
  },
  percentualOutorgante: {
    tag: 'novo',
    explicacao: 'Fatia da produção/frutos que fica com quem cedeu a terra — só existe na Parceria; a Composse reparte pelas frações dos compossuidores, não por este campo.',
    fonte: '`[MMS-PAR]` reparte 30/70 entre outorgante e explorador.',
  },
  percentualExplorador: {
    tag: 'novo',
    explicacao: 'Fatia da produção/frutos que fica com quem explora a terra — complemento do percentual do outorgante.',
    fonte: '`[MMS-PAR]` reparte 30/70 entre outorgante e explorador.',
  },
  culturas: {
    tag: 'novo',
    explicacao: 'O que pode ser plantado ou criado na área da Parceria/Composse — lista específica de cada cliente, não um texto padrão da banca.',
    fonte: 'A lista fixa de 14 culturas do `.docx` oficial diverge da lista de 8 culturas do contrato assinado real — prova de que é campo por cliente (relatório `10-conferencia-contra-docx-oficial.md`).',
  },
  permitePenhor: {
    tag: 'novo',
    explicacao: 'Se a outorgante/os compossuidores autorizam os bens ou a produção a servirem de garantia (penhor) num financiamento.',
    fonte: 'Cláusulas 14ª a 17ª ("Da Anuência") do `[BV-PAR]`/`[BV-COM]`.',
  },
  naturezaExploracao: {
    tag: 'novo',
    explicacao: 'Se a exploração inclui criação de animais (não só cultivo) — troca "AGROPECUÁRIA" por "AGRÍCOLA" em 3 trechos do texto (título, vigência, capítulo de atividades).',
    fonte: 'Achado comparando com um mapeamento externo em 20/08/2026 — o motor já tinha os campos de contexto prontos, só faltava o campo na tela.',
  },
  prazoIndivisao: {
    tag: 'novo',
    explicacao: 'Por quanto tempo os compossuidores ficam proibidos de pedir a divisão do imóvel.',
    fonte: '`[BV-COM]`, Cláusula Quarta: 3 anos, contados da assinatura.',
  },
  indivisaoAvisoPrazo: {
    tag: 'novo',
    explicacao: 'Prazo de aviso prévio para avisar que não quer renovar a indivisão, antes do vencimento do prazo atual.',
    fonte: '`[BV-COM]`, Cláusula Quarta: renova por período igual ao prazo de indivisão, salvo aviso com esta antecedência.',
  },
  indivisaoProrrogavel: {
    tag: 'novo',
    explicacao: 'Se o prazo de indivisão renova automaticamente ao vencer, ou se termina sem renovação.',
    fonte: '`[BV-COM]`, Cláusula Quarta.',
  },
  regraAdministracao: {
    tag: 'novo',
    explicacao: 'Quem pode tomar decisões e agir em nome da composse no dia a dia (locar, arrendar etc.) — por maioria dos percentuais, ou por pessoas nomeadas fixas.',
    fonte: '`[BV-COM]` autoriza atos por maioria dos percentuais; `[ROS-COM]` nomeia 2 compossuidores fixos, independente do percentual de cada um — sem regra padrão única entre os dois exemplos reais lidos.',
  },
  administradoresNomeados: {
    tag: 'possui',
    explicacao: 'As pessoas nomeadas para administrar a composse, quando a regra escolhida é "administradores nomeados" — já cadastradas; não é o mesmo cadastro de administração de empresa (`administracao`), é outro conceito.',
    fonte: 'Pessoas vêm de Qualificação das Partes → Modal de Pessoa. `[ROS-COM]` nomeia 2 compossuidores específicos como administradores.',
  },
  liquidacaoPeriodicidade: {
    tag: 'novo',
    explicacao: 'Se o acerto de contas entre os compossuidores (liquidação de haveres) é feito mês a mês ou ano a ano.',
    fonte: '`[BV-COM]` usa parcelas mensais; `[ROS-COM]` usa parcelas anuais.',
  },
  liquidacaoNumeroParcelas: {
    tag: 'novo',
    explicacao: 'Em quantas parcelas a liquidação de haveres é paga.',
    fonte: '`[BV-COM]` usa 60 parcelas mensais; `[ROS-COM]` usa 10 parcelas anuais, ambos corrigidos pelo INPC.',
  },
  foroComarca: {
    tag: 'novo',
    explicacao: 'A comarca (cidade) escolhida pelas partes para resolver qualquer disputa judicial sobre o contrato.',
    fonte: 'Cláusula de foro dos dois modelos oficiais. Conferido em todo o schema (19/08/2026): não existe coluna nem cadastro pra isso em lugar nenhum.',
  },
  foroUf: {
    tag: 'novo',
    explicacao: 'O estado da comarca de foro escolhida pelas partes.',
    fonte: 'Mesma cláusula de foro dos dois modelos oficiais.',
  },
  testemunhaNome: {
    tag: 'novo',
    explicacao: 'Nome de quem assina como testemunha do contrato — não é parte do negócio, só confirma as assinaturas.',
    fonte: 'Bloco de assinatura dos dois modelos oficiais da banca pede 2 testemunhas, com nome, CPF e RG.',
  },
  testemunhaCpf: {
    tag: 'novo',
    explicacao: 'CPF da testemunha, exigido pelo modelo oficial junto do nome.',
    fonte: 'Mesmo bloco de assinatura dos dois modelos oficiais.',
  },
  testemunhaRg: {
    tag: 'novo',
    explicacao: 'RG da testemunha.',
    fonte: 'Mesmo bloco de assinatura — achado em 19/08/2026 de que faltava o RG na tela, só havia nome e CPF.',
  },
  numeroVias: {
    tag: 'novo',
    explicacao: 'Em quantas vias (cópias físicas assinadas) o contrato sai — a cláusula final cita esse número por extenso.',
    fonte: '`[BV-PAR]` usa 4 vias; `[BV-COM]` usa 3 vias — o número varia de contrato para contrato.',
  },
  dataAssinatura: {
    tag: 'novo',
    explicacao: 'Data em que o instrumento foi (ou será) assinado.',
    fonte: 'Data que abre o preâmbulo dos dois modelos oficiais. Coluna já existe em `exploracao_rural`, mas nenhuma tela grava nela hoje.',
  },
  dataEncerramento: {
    tag: 'novo',
    explicacao: 'Data em que a Parceria termina — só existe na Parceria; a Composse não expira, ela tem prazo de indivisão, que é outro campo.',
    fonte: 'Cláusula Segunda dos modelos de Parceria.',
  },
  vigenciaProrrogavel: {
    tag: 'novo',
    explicacao: 'Se a Parceria se renova automaticamente ao vencer, sem precisar assinar de novo.',
    fonte: 'Cláusula Segunda dos modelos de Parceria.',
  },
  imovelMatricula: {
    tag: 'possui',
    explicacao: 'Qual matrícula (imóvel) já cadastrada entra neste instrumento — um instrumento pode ter vários imóveis, cada um com sua própria linha aqui.',
    fonte: 'A matrícula vem de Diagnóstico Patrimonial → Modal de Matrícula. `[BV-COM]` tem 15 imóveis numa única composse, vindos de 6 instrumentos de origem diferentes.',
  },
  imovelAreaExplorada: {
    tag: 'novo',
    explicacao: 'Quanto da área daquela matrícula está sendo cedido/explorado NESTE instrumento — não é a área total do imóvel, que é um dado da matrícula em si.',
    fonte: 'Anexo Único de `[BV-COM]`: a "área cedida" de cada item é sempre menor que a "área total do imóvel" da mesma linha (ex.: 234 ha cedidos de um imóvel de 295,86 ha).',
  },
  origemTipo: {
    tag: 'novo',
    explicacao: 'De que tipo de contrato anterior aquele imóvel específico veio (Parceria, Arrendamento, Exploração própria, Herança, Outro) — só existe na Composse.',
    fonte: 'Considerando V do `[BV-COM]`, que cita o tipo de instrumento de origem por grupo de imóveis.',
  },
  origemInstrumento: {
    tag: 'novo',
    explicacao: 'Aponta para qual outro instrumento já cadastrado aqui deu origem à posse deste imóvel — só quando esse instrumento anterior existe no sistema.',
    fonte: 'Mesmo Considerando V do `[BV-COM]`. Aponta pra outra linha desta MESMA tela nova (outra exploração rural), não pra um cadastro de outro módulo — por isso fica como "novo", não "possui".',
  },
  origemDataAssinatura: {
    tag: 'novo',
    explicacao: 'Data em que o instrumento de origem (a Parceria ou contrato anterior daquele imóvel) foi assinado.',
    fonte: 'Considerando V do `[BV-COM]` cita a data de cada origem.',
  },
  origemOutorganteNome: {
    tag: 'novo',
    explicacao: 'Nome do outorgante do contrato ANTERIOR daquele imóvel, quando esse outorgante não é cliente da PSA e por isso não tem cadastro de pessoa aqui.',
    fonte: '`[BV-COM]`: 5 das 6 origens (Mata do Puba, Santa Cruz, José Alípio/Ariane, Conata, José Hildebrando/Maria Cristina) são de terceiros que não são clientes da PSA.',
  },
  origemOutorganteCnpj: {
    tag: 'novo',
    explicacao: 'CPF/CNPJ do outorgante da origem externa.',
    fonte: '`[BV-COM]`: mesmo achado do outorgante da origem — terceiro sem cadastro de pessoa.',
  },
  origemOutorganteSede: {
    tag: 'novo',
    explicacao: 'Município e UF da sede do outorgante da origem externa.',
    fonte: '`[BV-COM]`: mesmo achado do outorgante da origem.',
  },
  origemOutorganteNire: {
    tag: 'novo',
    explicacao: 'NIRE (registro na Junta Comercial) do outorgante da origem externa, quando ele é pessoa jurídica.',
    fonte: 'Exigência literal do template oficial: "qualificação completa da empresa, que deverá conter o NIRE e o capital social na data da assinatura, bem como dos administradores."',
  },
  origemOutorganteCapitalSocial: {
    tag: 'novo',
    explicacao: 'Capital social do outorgante da origem externa NA DATA DA ASSINATURA daquele contrato anterior — valor histórico, não o atual.',
    fonte: 'Mesma exigência literal do template oficial citada acima; o valor é histórico porque não sai de `v_quadro_societario` (que só tem o valor atual).',
  },
  origemOutorganteAdministradores: {
    tag: 'novo',
    explicacao: 'Administradores do outorgante da origem externa, na data daquele contrato anterior.',
    fonte: 'Mesma exigência literal do template oficial citada acima.',
  },
  estudoFiscal: {
    tag: 'possui',
    explicacao: 'Referência ao estudo fiscal já arquivado no cadastro do cliente que justificou os termos desta Parceria.',
    fonte: 'O arquivo vem de Documentos do Cliente — seleciona um arquivo já classificado, sem importação nova. Não é citado no texto do contrato.',
  },
  documentoComprobatorio: {
    tag: 'possui',
    explicacao: 'Referência ao contrato anterior já arquivado no cadastro do cliente que comprova a origem da posse.',
    fonte: 'O arquivo vem de Documentos do Cliente. Não é citado no texto do contrato.',
  },
  origemTituloInstrumento: {
    tag: 'novo',
    explicacao: 'O título literal do contrato anterior, digitado à mão (ex.: "Contrato de Parceria Agrícola e Outras Avenças").',
    fonte: 'Achado ao construir o mapa de campos (20/08/2026): capturado no cadastro, mas hoje o Considerando V só cita o TIPO da origem — o título digitado aqui ainda não é lido pelo motor.',
  },
};

/** Fonte + explicação do campo, para o tooltip da própria tag "NOVO"/"POSSUI" — ver `Selo` em `SeloCampo.tsx`. */
export function fonteDoCampo(campo: CampoContrato): FonteCampo {
  return REGISTRO[campo];
}
