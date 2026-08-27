// Onde estão as pendências de preenchimento, para a tela poder apontar.
//
// A validação que barra o salvamento já existe em `clientFormValidation` e é a
// fonte da verdade sobre o que é obrigatório. O que faltava era a outra metade:
// dizer ONDE está a falta, para a aba, a linha da lista, a seção e o campo
// poderem se marcar. Sem isso o consultor lê "Contribuinte Fulano: CEP é
// obrigatório" e tem de caçar o Fulano.
//
// Estas funções só LOCALIZAM. Elas não decidem se salva: quem decide continua
// sendo a validação, e duplicar a regra aqui seria criar duas verdades.
import type { DraftEntity, InscricaoIE, DraftRepresentante, DraftOrdemServico } from '@/types/clientForm';

/** Aba do modal onde a pendência mora. */
export type AbaCadastro = 'cliente' | 'contribuintes' | 'representantes' | 'contratos';

/**
 * Pedido de "abra este item", disparado pelo aviso do rodapé.
 *
 * É um objeto, e não um número, de propósito: a aba reage à identidade dele, e
 * assim clicar no aviso duas vezes seguidas volta para o mesmo item mesmo que o
 * consultor tenha navegado para outro no meio do caminho.
 */
export interface FocoPendencia {
  /**
   * Item da lista a abrir. Ausente quando a falta é da aba Cliente, que não tem
   * lista — e era esse caso que ficava sem pedido de foco nenhum.
   */
  itemId?: number;
}

export interface Pendencia {
  aba: AbaCadastro;
  /** `_id` do item da lista, quando a pendência é de um item. */
  itemId?: number;
  /** Número da seção do formulário, quando a aba tem seções numeradas. */
  secao?: number;
  /** Campo do rascunho, para a moldura vermelha. */
  campo: string;
  /** Frase curta exibida abaixo do campo. */
  mensagem: string;
}

/** Mesmo formato que a validacao do save exige do centro de custo. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const vazio = (v: unknown) => !String(v ?? '').trim();

// ─── Cliente ──────────────────────────────────────────────────────────────

export function pendenciasCliente(clientData: {
  nome?: string;
  ativo?: boolean;
  observacoes?: string;
  cluster_ids?: readonly string[];
}): Pendencia[] {
  const faltas: Pendencia[] = [];
  const add = (secao: number, campo: string, mensagem: string) =>
    faltas.push({ aba: 'cliente', secao, campo, mensagem });

  if (vazio(clientData.nome)) add(1, 'nome', 'Informe o nome do cliente');

  // Espelho de `validateClustersCliente`. A regra é do banco (a RPC de criação e
  // os dois gatilhos de cliente_clusters), e antes só aparecia como `400` depois
  // de enviar o cadastro inteiro.
  if (!clientData.cluster_ids?.length) add(2, 'cluster_ids', 'Selecione ao menos 1 cluster');

  // Observação curta demais barra o salvamento em dois casos: sempre que está
  // preenchida, e obrigatoriamente quando o cliente está sendo inativado.
  const obs = (clientData.observacoes || '').trim();
  if (clientData.ativo === false && obs.length < 20) {
    add(3, 'observacoes', 'Para inativar o cliente, escreva ao menos 20 caracteres');
  } else if (obs && obs.length < 20) {
    add(3, 'observacoes', 'A observação precisa de ao menos 20 caracteres');
  }
  return faltas;
}

// ─── Contribuintes ────────────────────────────────────────────────────────

/**
 * Espelha `validateContribuinteDocumento` e `validateContribuinteDados`, na
 * mesma ordem em que elas barram, para a marca não apontar um campo enquanto o
 * aviso do rodapé fala de outro.
 */
export function pendenciasContribuinte(e: DraftEntity, inscricoes: InscricaoIE[] = []): Pendencia[] {
  const faltas: Pendencia[] = [];
  const add = (secao: number, campo: string, mensagem: string) =>
    faltas.push({ aba: 'contribuintes', itemId: e._id, secao, campo, mensagem });

  if (vazio(e.nome_razao_social)) add(1, 'nome_razao_social', 'Informe a razão social ou o nome completo');

  const digitos = (e.cpf_cnpj || '').replace(/\D/g, '');
  if (!digitos) add(1, 'cpf_cnpj', 'CPF ou CNPJ é obrigatório');
  else if (digitos.length !== 11 && digitos.length !== 14) {
    add(1, 'cpf_cnpj', 'CPF tem 11 dígitos e CNPJ tem 14');
  }

  if (vazio(e.cep)) add(2, 'cep', 'CEP é obrigatório');
  if (vazio(e.logradouro)) add(2, 'logradouro', 'Logradouro é obrigatório');
  if (vazio(e.bairro)) add(2, 'bairro', 'Bairro é obrigatório');
  if (vazio(e.municipio)) add(2, 'municipio', 'Município é obrigatório');
  // Vazio e mal preenchido são faltas diferentes e merecem frases diferentes.
  // Juntos numa condição só, quem deixava a UF em branco lia "UF tem 2 letras",
  // que fala de formato, enquanto os cinco campos vizinhos dizem "é obrigatório".
  if (vazio(e.uf)) add(2, 'uf', 'UF é obrigatória');
  else if ((e.uf || '').trim().length !== 2) add(2, 'uf', 'UF tem 2 letras');

  if (e.tipo_pessoa === 'PJ') {
    if (vazio(e.cod_cnae)) add(3, 'cod_cnae', 'CNAE é obrigatório para pessoa jurídica');
    if (vazio(e.simples_nacional)) add(3, 'simples_nacional', 'Informe a situação do Simples Nacional');
  }

  // A IE mora numa lista à parte, mas barra o mesmo salvamento: sem marca aqui,
  // o consultor lê "informe o número da IE" e não tem onde procurar.
  for (const ie of inscricoes) {
    if (ie.situacao !== 'sim') continue;
    if (vazio(ie.uf)) add(3, 'inscricoes', 'Selecione a UF de todas as inscrições estaduais');
    else if (vazio(ie.numero_ie)) add(3, 'inscricoes', `Informe o número da IE de ${ie.uf}`);
  }
  return faltas;
}

/**
 * Documento repetido entre dois contribuintes do mesmo cliente.
 *
 * Fica fora de `pendenciasContribuinte` porque só existe olhando a lista
 * inteira. Marca da segunda ocorrência em diante, como a validação do save.
 */
export function pendenciasDocumentosRepetidos(entities: readonly DraftEntity[]): Pendencia[] {
  const vistos = new Map<string, DraftEntity>();
  const faltas: Pendencia[] = [];
  for (const e of entities) {
    const digitos = (e.cpf_cnpj || '').replace(/\D/g, '');
    if (!digitos) continue;
    const primeiro = vistos.get(digitos);
    if (primeiro) {
      faltas.push({
        aba: 'contribuintes',
        itemId: e._id,
        secao: 1,
        campo: 'cpf_cnpj',
        mensagem: `Documento repetido em "${primeiro.nome_razao_social?.trim() || 'outro contribuinte'}"`,
      });
    } else {
      vistos.set(digitos, e);
    }
  }
  return faltas;
}

// ─── Representantes ───────────────────────────────────────────────────────

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function pendenciasRepresentante(p: DraftRepresentante): Pendencia[] {
  const faltas: Pendencia[] = [];
  const add = (secao: number, campo: string, mensagem: string) =>
    faltas.push({ aba: 'representantes', itemId: p._id, secao, campo, mensagem });

  if (vazio(p.nome)) add(1, 'nome', 'Informe o nome');
  if (vazio(p.tipo_representante)) add(1, 'tipo_representante', 'Informe o cargo ou função');
  if (vazio(p.email)) add(2, 'email', 'E-mail é obrigatório');
  else if (!EMAIL.test((p.email || '').trim())) add(2, 'email', 'Formato de e-mail inválido');

  // Telefone e observação são opcionais, mas mal preenchidos barram o save.
  const telefone = (p.telefone || '').replace(/\D/g, '');
  if ((p.telefone || '').trim() && telefone.length < 10) {
    add(2, 'telefone', 'O telefone precisa de ao menos 10 dígitos');
  }
  const obs = (p.observacoes || '').trim();
  if (obs && obs.length < 20) add(3, 'observacoes', 'A observação precisa de ao menos 20 caracteres');
  return faltas;
}

// ─── Ordem de serviço ─────────────────────────────────────────────────────

/**
 * O número da seção acompanha o formulário da OS, para o `05` ficar vermelho
 * quando o rateio não fecha. Mudou a ordem das seções lá, muda aqui.
 *
 * @param contribuintes os contribuintes do cliente, para saber se há em quem
 *        faturar. Sem a lista a função não tem como decidir, então o padrão é
 *        vazio e o campo simplesmente não é exigido — o mesmo arranjo de
 *        `pendenciasContribuinte(e, inscricoes)`.
 */
export function pendenciasOrdemServico(
  c: DraftOrdemServico,
  contribuintes: DraftEntity[] = [],
): Pendencia[] {
  const faltas: Pendencia[] = [];
  const add = (secao: number, campo: string, mensagem: string) =>
    faltas.push({ aba: 'contratos', itemId: c._id, secao, campo, mensagem });

  // Seção 1 (Período): o projeto herda início e fim daqui e não tem campo de
  // data própria, então OS sem período trava a criação do projeto lá na frente.
  if (vazio(c.data_inicio_projeto)) add(1, 'data_inicio_projeto', 'Informe a data de início');
  if (vazio(c.data_fim_projeto)) add(1, 'data_fim_projeto', 'Informe a data de fim');
  if (!vazio(c.data_inicio_projeto) && !vazio(c.data_fim_projeto)
    && c.data_inicio_projeto > c.data_fim_projeto) {
    add(1, 'data_fim_projeto', 'A data de fim deve ser posterior à de início');
  }

  if (vazio(c.setor_cliente_id)) add(2, 'setor_cliente_id', 'Selecione a área do negócio');
  if (vazio(c.regiao)) add(2, 'regiao', 'Selecione a região');
  if (!c.produtos_contratados?.length) add(3, 'produtos_contratados', 'Adicione ao menos um produto');
  if (vazio(c.cluster_id)) add(5, 'cluster_id', 'Selecione a empresa que fatura');

  // Quem recebe a nota desta OS. Só é exigido quando existe contribuinte JÁ
  // SALVO para escolher: a coluna é chave estrangeira, então contribuinte criado
  // na mesma sessão ainda não serve, e exigir aí travaria o cadastro de cliente
  // novo num campo que a tela não tem como preencher. Consequência aceita: a OS
  // criada junto com o cliente nasce sem contribuinte e passa a acusar pendência
  // quando o cadastro for reaberto.
  if (contribuintes.some((e) => e._dbId) && vazio(c.contribuinte_id)) {
    add(5, 'contribuinte_id', 'Selecione o contribuinte de faturamento');
  }

  const rateio = c.distribuicao_receita || [];
  if (rateio.length === 0) {
    add(5, 'distribuicao_receita', 'Adicione ao menos um centro de custo');
  } else if (rateio.some((d) => !UUID.test(d.id_centro_custo || ''))) {
    // Linha aberta e ainda sem centro escolhido. A validação do save recusa pelo
    // mesmo motivo, então a marca precisa aparecer junto.
    add(5, 'distribuicao_receita', 'Selecione o centro de custo de cada linha');
  } else {
    const vistos = new Set<string>();
    const repetido = rateio.some((d) => {
      if (!d.id_centro_custo) return false;
      if (vistos.has(d.id_centro_custo)) return true;
      vistos.add(d.id_centro_custo);
      return false;
    });
    if (repetido) add(5, 'distribuicao_receita', 'Centro de custo repetido');
    const total = rateio.reduce((s, d) => s + (d.percentual_rateio || 0), 0);
    if (Math.abs(total - 100) > 0.01) {
      add(5, 'distribuicao_receita', `A soma precisa fechar 100% (está em ${total.toFixed(2).replace(/\.?0+$/, '')}%)`);
    }
  }
  return faltas;
}

/**
 * A frase do aviso do rodapé.
 *
 * Antes era só a contagem, "1 campo obrigatório pendente", e quem lia tinha de
 * caçar o campo. Qual é o campo esta função já sabia: a `mensagem` da pendência
 * existe desde sempre, mas parava na moldura vermelha, que não aparece quando o
 * item está aberto em leitura — foi assim que a tela ficou dizendo que falta
 * algo sem dizer o quê.
 *
 * @param onde rótulo pronto do item ("na OS 102/2026"). Nulo na aba Cliente,
 *             que não tem lista, e quando o item sumiu do rascunho.
 */
export function frasePendencia(
  primeira: Pendencia,
  total: number,
  onde: string | null,
): string {
  const contagem =
    total === 1 ? '1 campo obrigatório pendente' : `${total} campos obrigatórios pendentes`;
  const local = onde ? `, ${onde}` : '';
  const resto = total > 1 ? `, e mais ${total - 1}` : '';
  return `${contagem}: ${primeira.mensagem}${local}${resto}`;
}

// ─── Agregações para a tela ───────────────────────────────────────────────

export interface MapaPendencias {
  todas: Pendencia[];
  /** Abas com pendência, para o ponto vermelho ao lado do nome. */
  abas: Set<AbaCadastro>;
  /** Itens com pendência, para o ponto vermelho na linha da lista. */
  itens: Set<number>;
  /** Seções com pendência, por item, para o número da seção ficar vermelho. */
  secoesPorItem: Map<number, Set<number>>;
  /** Campos com pendência, por item, para a moldura e a frase. */
  camposPorItem: Map<number, Map<string, string>>;
}

export function mapearPendencias(pendencias: Pendencia[]): MapaPendencias {
  const abas = new Set<AbaCadastro>();
  const itens = new Set<number>();
  const secoesPorItem = new Map<number, Set<number>>();
  const camposPorItem = new Map<number, Map<string, string>>();

  for (const p of pendencias) {
    abas.add(p.aba);
    // Item sem id é a aba do cliente, que não tem lista: a chave 0 guarda os
    // campos dela sem precisar de um mapa separado.
    const chave = p.itemId ?? 0;
    if (p.itemId != null) itens.add(p.itemId);

    if (p.secao != null) {
      const secoes = secoesPorItem.get(chave) ?? new Set<number>();
      secoes.add(p.secao);
      secoesPorItem.set(chave, secoes);
    }

    const campos = camposPorItem.get(chave) ?? new Map<string, string>();
    // A primeira mensagem vence: é a que o rodapé também mostraria.
    if (!campos.has(p.campo)) campos.set(p.campo, p.mensagem);
    camposPorItem.set(chave, campos);
  }

  return { todas: pendencias, abas, itens, secoesPorItem, camposPorItem };
}
