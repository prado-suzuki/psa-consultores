import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useAuditLog } from '@/hooks/useAuditLog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import {
  ORGAOS_GOVERNANCA_PADRAO,
  erroDeOrgaoGovernanca,
  ehEstePadrao,
  padroesFaltando,
} from '@/lib/orgaosGovernancaPadrao';

/**
 * Camada de dados do cadastro de órgãos de governança (GOV-01).
 *
 * O órgão é a instância de decisão de um cliente. É ele que define as COLUNAS da
 * Matriz de Alçadas e quem recebe competência no contrato social.
 *
 * A lista NÃO é fixa: três são padrão da OSG e o cliente acrescenta os dele, com
 * nome próprio. Por isso `nome` é texto livre no banco, e a semente dos três vive
 * em `src/lib/orgaosGovernancaPadrao.ts`, fora daqui.
 *
 * SEM FILTRO DE `ambiente` NESTA QUERY, e é de propósito. `orgao_governanca` não
 * tem a coluna: o ambiente dela é o do cliente a que pertence, como em
 * `org_tasks` e `org_projects` (ver `src/lib/ambienteScope.ts`). Como toda
 * leitura aqui é POR UM CLIENTE já escolhido na tela, e a tela só oferece cliente
 * do ambiente corrente, o recorte já aconteceu antes de chegar aqui. Uma lista
 * global de órgãos, se um dia existir, precisará juntar com `cliente` e filtrar.
 *
 * EXCLUSÃO É SOFT, por `excluido`. O DELETE físico existe na RLS para sublíder ou
 * acima, mas a tela não usa: apagar órgão que já é coluna de uma Matriz assinada
 * apagaria história.
 */

type OrgaoRow = Database['public']['Tables']['orgao_governanca']['Row'];

/**
 * O ÓRGÃO COMO A TELA O LÊ: a linha do banco, com `genero` estreitado.
 *
 * As seis colunas da migration `20260911201231` eram declaradas à mão aqui,
 * porque o `types.ts` da develop estava atrasado e não as conhecia. Ele foi
 * regenerado em `33ed57a8` e agora traz as seis — então a declaração paralela
 * saiu, como o comentário antigo mandava. Cinco delas vêm do banco com o tipo
 * certo e não precisam de nada.
 *
 * `genero` é a exceção, e por isso sobra uma linha em vez de nenhuma: a coluna é
 * `text` no Postgres, então o gerador a descreve como `string | null` e o banco
 * não tem como dizer que só 'M' e 'F' valem. O modal
 * (`OrgaoGovernancaModal.tsx`) guarda o campo como `'M' | 'F' | null` e decide a
 * concordância da cláusula em cima disso; recebendo `string` ele para de
 * compilar. Quem sustenta o par é a escrita, em `OrgaoGovernancaInput`, que só
 * aceita os dois valores.
 *
 * Se um dia a coluna virar enum no banco, esta linha some junto com o `Omit`.
 */
export type OrgaoGovernanca = Omit<OrgaoRow, 'genero'> & { genero: 'M' | 'F' | null };

export interface OrgaoGovernancaInput {
  nome: string;
  entra_no_contrato: boolean;
  ordem?: number;
  vigencia_inicio?: string | null;
  vigencia_fim?: string | null;
  genero?: 'M' | 'F' | null;
  membros_minimo?: number | null;
  membros_maximo?: number | null;
  mandato_anos?: number | null;
  cargos_do_orgao?: string[] | null;
  /**
   * SÓ O BOTÃO DE PADRÕES MANDA ISTO, e só na criação. O modal não oferece o
   * campo, e `atualizar` não o inclui: se incluísse, salvar o órgão pelo modal
   * mandaria `undefined` e apagaria a chave, soltando a trava de ordem e
   * derrubando o vínculo automático da tela Gerar.
   */
  padrao_chave?: string | null;
}

export const orgaosGovernancaQueryKey = (clienteId?: string | null) =>
  ['orgao-governanca', clienteId ?? null] as const;

/** Os órgãos ativos de um cliente, do mais para o menos autoridade. */
async function buscarPorCliente(clienteId: string): Promise<OrgaoGovernanca[]> {
  const { data, error } = await supabase
    .from('orgao_governanca')
    .select('*')
    .eq('cliente_id', clienteId)
    .eq('excluido', false)
    .order('ordem')
    .order('nome');

  if (error) throw error;
  // O estreitamento de `genero` acontece AQUI, na fronteira, e não espalhado
  // pelas telas: a coluna é `text` e o banco não promete os dois valores, mas
  // quem escreve nela é só `OrgaoGovernancaInput`, que promete. Ver o tipo.
  return (data ?? []) as OrgaoGovernanca[];
}

export function useOrgaosGovernanca(clienteId?: string | null) {
  return useQuery<OrgaoGovernanca[]>({
    queryKey: orgaosGovernancaQueryKey(clienteId),
    enabled: !!clienteId,
    queryFn: () => buscarPorCliente(clienteId as string),
  });
}

/**
 * Criar, editar e excluir, com auditoria em toda operação.
 *
 * O `changed_fields` do update sai de um diff campo a campo contra a linha atual,
 * e não do formulário inteiro: sem isso a auditoria registraria como alteração
 * todo campo que a pessoa apenas viu.
 */
export function useOrgaoGovernancaMutations(clienteId?: string | null) {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();
  const { user } = useAuth();

  const invalidar = () =>
    queryClient.invalidateQueries({ queryKey: orgaosGovernancaQueryKey(clienteId) });

  /**
   * O insert em si, sem toast.
   *
   * Separado do `criar` porque o botão de padrões cadastra três de uma vez: usando
   * a mutation, sairiam quatro avisos empilhados na tela, um por órgão mais o do
   * botão. A auditoria fica aqui, e por isso vale para os dois caminhos.
   */
  const inserir = async (input: OrgaoGovernancaInput) => {
      if (!clienteId) throw new Error('Selecione um cliente antes de cadastrar o órgão.');

      const novo = {
        cliente_id: clienteId,
        nome: input.nome.trim(),
        entra_no_contrato: input.entra_no_contrato,
        ordem: input.ordem ?? 0,
        vigencia_inicio: input.vigencia_inicio ?? null,
        vigencia_fim: input.vigencia_fim ?? null,
        genero: input.genero ?? null,
        membros_minimo: input.membros_minimo ?? null,
        membros_maximo: input.membros_maximo ?? null,
        mandato_anos: input.mandato_anos ?? null,
        cargos_do_orgao: input.cargos_do_orgao ?? null,
        padrao_chave: input.padrao_chave ?? null,
        created_by: user?.id ?? null,
        updated_by: user?.id ?? null,
      };

      // As colunas de parametrização são novas: o `types.ts` autogerado ainda
      // não as conhece até alguém regerar. Mesmo contorno de `useDomainBacklog`.
      const { data, error } = await supabase
        .from('orgao_governanca')
        .insert(novo as typeof novo & Record<string, unknown>)
        .select()
        .single();

      if (error) throw error;

      await logAction({
        area: 'osg',
        entity_type: 'orgao_governanca',
        entity_id: data.id,
        entity_name: data.nome,
        action: 'created',
      });

      return data;
  };

  const criar = useMutation({
    mutationFn: inserir,
    onSuccess: () => {
      invalidar();
      toast.success('Órgão cadastrado');
    },
    onError: (error: unknown) => toast.error(erroDeOrgaoGovernanca(error)),
  });

  const atualizar = useMutation({
    mutationFn: async ({ id, ...input }: OrgaoGovernancaInput & { id: string }) => {
      const { data: atual, error: erroLeitura } = await supabase
        .from('orgao_governanca')
        .select('*')
        .eq('id', id)
        .single();
      if (erroLeitura) throw erroLeitura;

      // `padrao_chave` NÃO entra aqui de propósito: ver o comentário no campo,
      // em `OrgaoGovernancaInput`. Salvar pelo modal apagaria a chave.
      const novo = {
        nome: input.nome.trim(),
        entra_no_contrato: input.entra_no_contrato,
        ordem: input.ordem ?? atual.ordem,
        vigencia_inicio: input.vigencia_inicio ?? null,
        vigencia_fim: input.vigencia_fim ?? null,
        genero: input.genero ?? null,
        membros_minimo: input.membros_minimo ?? null,
        membros_maximo: input.membros_maximo ?? null,
        mandato_anos: input.mandato_anos ?? null,
        cargos_do_orgao: input.cargos_do_orgao ?? null,
      };

      const mudou: Record<string, { old: unknown; new: unknown }> = {};
      for (const [campo, valor] of Object.entries(novo)) {
        const anterior = (atual as Record<string, unknown>)[campo];
        if (JSON.stringify(anterior ?? null) !== JSON.stringify(valor ?? null)) {
          mudou[campo] = { old: anterior ?? null, new: valor ?? null };
        }
      }

      // Nada mudou: não grava nem audita, para o histórico não encher de linha
      // vazia de quem só abriu e fechou o modal.
      if (Object.keys(mudou).length === 0) return atual;

      const alteracao = { ...novo, updated_by: user?.id ?? null };
      const { data, error } = await supabase
        .from('orgao_governanca')
        // Mesmo motivo do insert: colunas novas, `types.ts` atrasado.
        .update(alteracao as typeof alteracao & Record<string, unknown>)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      await logAction({
        area: 'osg',
        entity_type: 'orgao_governanca',
        entity_id: data.id,
        entity_name: data.nome,
        action: 'updated',
        changed_fields: mudou,
      });

      return data;
    },
    onSuccess: () => {
      invalidar();
      toast.success('Órgão atualizado');
    },
    onError: (error: unknown) => toast.error(erroDeOrgaoGovernanca(error)),
  });

  const excluir = useMutation({
    mutationFn: async (orgao: Pick<OrgaoGovernanca, 'id' | 'nome'>) => {
      const { error } = await supabase
        .from('orgao_governanca')
        .update({ excluido: true, updated_by: user?.id ?? null })
        .eq('id', orgao.id);
      if (error) throw error;

      await logAction({
        area: 'osg',
        entity_type: 'orgao_governanca',
        entity_id: orgao.id,
        entity_name: orgao.nome,
        action: 'deleted',
      });
    },
    onSuccess: () => {
      invalidar();
      toast.success('Órgão excluído');
    },
    onError: (error: unknown) => toast.error(erroDeOrgaoGovernanca(error)),
  });

  /**
   * Grava a ordem de uma lista inteira, numerando de 0 a n-1.
   *
   * `upsert` com array é UMA instrução, então as linhas mudam juntas ou nenhuma
   * muda. Dois `update` seguidos deixariam duas linhas com o mesmo número se o
   * segundo falhasse, e aí a hierarquia ficaria ambígua.
   *
   * `cliente_id` e `nome` vão no payload porque são NOT NULL e o upsert precisa
   * da linha inteira; os valores são os que já estão lá, não há alteração.
   */
  const gravarOrdem = async (lista: OrgaoGovernanca[]) => {
    const { error } = await supabase.from('orgao_governanca').upsert(
      // A LINHA INTEIRA, e nao so `id` e `ordem`. Upsert e INSERT com ON CONFLICT,
      // e mandar payload parcial deixa o resultado dos campos ausentes na mao do
      // PostgREST. Se ele os tratar como padrao no caminho do UPDATE, mover um
      // orgao zeraria `entra_no_contrato`, que e o campo que decide se ele ganha
      // clausula no contrato social. Espalhar a linha existente custa nada e tira
      // a duvida: os outros campos vao com o valor que ja tinham.
      lista.map((o, indice) => ({ ...o, ordem: indice, updated_by: user?.id ?? null })),
    );
    if (error) throw error;
  };

  /**
   * Sobe ou desce um órgão na hierarquia.
   *
   * A ordem NÃO é arranjo visual: ela diz quem tem mais autoridade, e é o que a
   * Matriz de Alçadas usa para saber para onde a decisão sobe quando o valor
   * estoura a alçada ("acima disso, o Conselho").
   *
   * SEM AUDITORIA, por decisão de 03/09/2026: um registro por clique de seta
   * encheria o histórico de ruído. Criar, editar e excluir seguem auditados.
   */
  const mover = useMutation({
    mutationFn: async ({ lista, indice, direcao }:
      { lista: OrgaoGovernanca[]; indice: number; direcao: 'cima' | 'baixo' }) => {
      const alvo = direcao === 'cima' ? indice - 1 : indice + 1;
      if (alvo < 0 || alvo >= lista.length) return;

      const nova = [...lista];
      [nova[indice], nova[alvo]] = [nova[alvo], nova[indice]];
      await gravarOrdem(nova);
    },
    onSuccess: () => invalidar(),
    onError: (error: unknown) => toast.error(erroDeOrgaoGovernanca(error)),
  });

  /**
   * O botão "usar os padrões da OSG".
   *
   * Acrescenta só o que falta, então continua útil depois da primeira vez e
   * clicar duas vezes não duplica. Passa pelo MESMO `criar` de qualquer órgão, e
   * por isso a auditoria registra cada um sem tratamento especial.
   */
  const semear = useMutation({
    mutationFn: async (atuais: OrgaoGovernanca[]) => {
      const faltam = padroesFaltando(atuais);
      for (const padrao of faltam) {
        /*
         * O GÊNERO E A CHAVE VÊM DO CATÁLOGO, e por muito tempo não vinham.
         * Os dois estão em `ORGAOS_GOVERNANCA_PADRAO` desde 11/09 e este laço
         * passava só nome e `entraNoContrato`, então todo cliente semeado pelo
         * botão nascia com os dois nulos. Duas consequências silenciosas: o
         * vínculo automático da tela Gerar, que procura por `padrao_chave`, não
         * achava nada e voltava a perguntar "qual dos seus órgãos é o Conselho
         * de Administração?"; e a cláusula saía "A Diretoria Executiva será
         * compostO", porque gênero nulo cai em masculino na concordância.
         * Medido no sandbox em 14/09: 3 de 25 órgãos tinham chave.
         */
        await inserir({
          nome: padrao.nome,
          entra_no_contrato: padrao.entraNoContrato,
          genero: padrao.genero,
          padrao_chave: padrao.chave,
        });
      }
      if (faltam.length === 0) return 0;

      // OS PADRÕES VÃO PARA O TOPO, e não para o fim da lista. A ordem é
      // hierarquia: um cliente que cadastrou "Gerentes corporativos" antes de
      // clicar aqui ficaria com os gerentes acima da Reunião de Sócios, e o
      // escalonamento da Matriz apontaria para o lugar errado.
      const depois = await buscarPorCliente(clienteId as string);
      // Pela CHAVE, e não pelo nome: órgão padrão renomeado continua no topo.
      const ehPadrao = (o: OrgaoGovernanca) =>
        ORGAOS_GOVERNANCA_PADRAO.some((p) => ehEstePadrao(o, p));

      const padroesNaOrdemOficial = ORGAOS_GOVERNANCA_PADRAO
        .map((p) => depois.find((o) => ehEstePadrao(o, p)))
        .filter((o): o is OrgaoGovernanca => !!o);
      const doCliente = depois.filter((o) => !ehPadrao(o));

      await gravarOrdem([...padroesNaOrdemOficial, ...doCliente]);
      return faltam.length;
    },
    onSuccess: (quantos) => {
      invalidar();
      if (quantos === 0) toast.info('Os três órgãos padrão já estão cadastrados');
      else toast.success(`${quantos} órgão(s) padrão adicionado(s)`);
    },
    onError: (error: unknown) => toast.error(erroDeOrgaoGovernanca(error)),
  });

  return { criar, atualizar, excluir, semear, mover };
}
