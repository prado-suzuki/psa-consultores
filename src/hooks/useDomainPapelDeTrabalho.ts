import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApiAuth } from '@/hooks/useApiAuth';
import { useAuditLog } from '@/hooks/useAuditLog';
import { subirArquivoGcs } from '@/hooks/useDocumentoArquivo';
import { supabase } from '@/integrations/supabase/client';
import { crc32cBase64 } from '@/lib/planejamento-tributario/crc32c';
import type { Json } from '@/integrations/supabase/types';
import type { Analise } from '@/hooks/usePapelDeTrabalhoController';

/**
 * A gravação da importação do papel de trabalho.
 *
 * É o único lugar que conhece a ORDEM das etapas: sobe o arquivo para o GCS, monta
 * o conteúdo, chama a RPC que grava tudo numa transação, e registra na auditoria.
 * A leitura e a decisão acontecem antes, no `usePapelDeTrabalhoController`, que é
 * puro e roda no navegador.
 *
 * **A recusa nunca chega aqui.** A tela só habilita o botão quando a decisão
 * aceita, e este hook confere de novo: um arquivo recusado não deve ocupar o
 * bucket nem virar linha no banco.
 *
 * ## O que a RPC faz e este hook não precisa fazer
 *
 * `importar_wp` é transacional: acha ou cria o estudo, calcula a próxima versão
 * sob `lock`, grava os sete blocos e devolve o que gravou. Se qualquer parte
 * falhar, nada entra. O número da versão sai de lá, e não daqui, porque duas abas
 * abertas leriam o mesmo `max(versao)` e empatariam.
 *
 * **Nada é sobrescrito, nunca.** Cada importação é uma versão nova, e não existe
 * policy de UPDATE de conteúdo em `wp_importacao` nem em `wp_valor`. É o que
 * atende o "não sobrescrever revisão já usada em apresentação" do enunciado, sem
 * depender da PT-03 existir para saber se foi usada.
 */

/** O que a RPC devolve, e a tela mostra depois de gravar. */
export interface RevisaoGravada {
  estudo_id: string;
  importacao_id: string;
  versao: number;
  gravados: Record<string, number>;
}

export interface EstudoDoCliente {
  id: string;
  cliente_id: string;
  ordem_servico_id: string | null;
  descricao: string | null;
  created_at: string;
}

export interface RevisaoDoEstudo {
  id: string;
  versao: number;
  nome_original: string | null;
  cliente_no_wp: string | null;
  ano_inicial: number | null;
  ano_final: number | null;
  versao_do_mapa: string;
  /** Quantos problemas a leitura anotou. Zero é revisão limpa. */
  problemas: number;
  created_at: string;
}

/**
 * O conteúdo que a RPC recebe, um bloco por tabela.
 *
 * Sai da leitura sem transformação: os nomes de campo aqui são os que a função
 * lê do jsonb, e é por isso que este objeto é montado num lugar só. O `cast` para
 * `Json` no fim é o mesmo que o resto da casa faz com argumento jsonb, e não é
 * contorno de tipo: `Json` é o tipo do parâmetro.
 */
function montaConteudo(analise: Analise) {
  const { leitura } = analise;
  return {
    cabecalho: leitura.cabecalho,
    valores: leitura.valores,
    farol: leitura.farol,
    comentarios: leitura.comentarios,
    bens: leitura.bens,
    dividas: leitura.dividas,
    problemas: [...analise.decisao.impedimentos, ...analise.decisao.avisos],
  };
}

export function useEstudosDoCliente(clienteId: string | null) {
  return useQuery({
    queryKey: ['wp_estudo', clienteId],
    enabled: !!clienteId,
    queryFn: async (): Promise<EstudoDoCliente[]> => {
      const { data, error } = await supabase
        .from('wp_estudo')
        .select('id, cliente_id, ordem_servico_id, descricao, created_at')
        .eq('cliente_id', clienteId as string)
        .eq('excluido', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * As revisões de um estudo, da mais nova para a mais velha.
 *
 * É o histórico que a tela mostra: quais WPs já foram importados, em que versão e
 * com que régua. `problemas` vem contado aqui e não na tela, porque a coluna é
 * `jsonb` e contar no cliente obrigaria a trazer o conteúdo inteiro de cada uma.
 */
export function useRevisoesDoEstudo(estudoId: string | null) {
  return useQuery({
    queryKey: ['wp_importacao', estudoId],
    enabled: !!estudoId,
    queryFn: async (): Promise<RevisaoDoEstudo[]> => {
      const { data, error } = await supabase
        .from('wp_importacao')
        .select(
          'id, versao, nome_original, cliente_no_wp, ano_inicial, ano_final, versao_do_mapa, problemas, created_at',
        )
        .eq('estudo_id', estudoId as string)
        .eq('excluido', false)
        .order('versao', { ascending: false });
      if (error) throw error;

      return (data ?? []).map((linha) => ({
        ...linha,
        problemas: Array.isArray(linha.problemas) ? linha.problemas.length : 0,
      }));
    },
  });
}

/** Uma OS do cliente, para o seletor. */
export interface OrdemDeServicoDoCliente {
  id: string;
  numero_os: string | null;
  situacao: string | null;
  data_inicio: string | null;
  data_fim: string | null;
}

/**
 * As OS de um cliente, as em andamento primeiro.
 *
 * **Traz todas, inclusive suspensa e concluída.** Filtrar só as ativas deixaria
 * sem porta de entrada o estudo cuja OS já encerrou: ele continua no banco, com
 * as revisões, e a tela não teria como chegar nele. Hoje são 15 OS fora de
 * andamento em 153, então a lista não cresce a ponto de atrapalhar, e a situação
 * aparece escrita ao lado para o engano ficar visível.
 */
export function useOrdensDeServicoDoCliente(clienteId: string | null) {
  return useQuery({
    queryKey: ['ordem_servico_do_cliente', clienteId],
    enabled: !!clienteId,
    queryFn: async (): Promise<OrdemDeServicoDoCliente[]> => {
      const { data, error } = await supabase
        .from('ordem_servico')
        .select('id, numero_os, situacao, data_inicio, data_fim')
        .eq('id_cliente', clienteId as string)
        .eq('excluido', false);
      if (error) throw error;

      const peso = (s: string | null) => (s === 'em_andamento' ? 0 : s === 'suspenso' ? 1 : 2);
      return (data ?? []).sort(
        (a, b) =>
          peso(a.situacao) - peso(b.situacao) ||
          (b.numero_os ?? '').localeCompare(a.numero_os ?? ''),
      );
    },
  });
}

/**
 * Marca uma revisão como descartada. Só admin, e nunca apaga.
 *
 * **É marca e não exclusão**, e a policy do banco só permite isso: importação é
 * retrato, e o retrato de que alguém subiu o arquivo errado é justamente o que a
 * auditoria existe para guardar. A revisão sai da lista e continua consultável
 * por quem for investigar.
 *
 * **Duas coisas que o descarte NÃO desfaz**, e é bom saber antes de usar. O
 * arquivo continua no bucket, porque apagar binário é irreversível e ninguém
 * pediu isso. E o checksum continua ocupado pelo índice único de
 * `(estudo_id, checksum)`, então subir o MESMO arquivo de novo é recusado: para
 * reimportar, o arquivo precisa ter mudado, o que é a regra de versionamento
 * funcionando e não um efeito colateral.
 */
export function useDescartarRevisao() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (args: { importacaoId: string; estudoId: string; versao: number }) => {
      const { error } = await supabase
        .from('wp_importacao')
        .update({ excluido: true })
        .eq('id', args.importacaoId);
      if (error) throw error;
      return args;
    },

    onSuccess: async (args) => {
      await logAction({
        area: 'dev',
        entity_type: 'wp_importacao',
        entity_id: args.importacaoId,
        entity_name: `revisão ${args.versao}`,
        action: 'deleted',
        details: 'Revisão descartada. O conteúdo continua no banco, fora da lista.',
      });
      await queryClient.invalidateQueries({ queryKey: ['wp_importacao', args.estudoId] });
    },
  });
}

export interface ArgsDaImportacao {
  clienteId: string;
  ordemServicoId: string;
  arquivo: File;
  analise: Analise;
  descricao?: string;
}

export function useImportarPapelDeTrabalho() {
  const queryClient = useQueryClient();
  const { fetchWithAuth } = useApiAuth();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (args: ArgsDaImportacao): Promise<RevisaoGravada> => {
      const { clienteId, ordemServicoId, arquivo, analise, descricao } = args;

      if (analise.decisao.veredito === 'recusa') {
        throw new Error(
          'Este arquivo tem impedimento e não pode ser gravado. Corrija a planilha e escolha de novo.',
        );
      }

      /*
       * A conferência do arquivo repetido acontece ANTES de subir.
       *
       * A RPC também recusa, e é ela que garante a regra sob concorrência. Mas
       * quando a recusa vem de lá o binário já está no bucket, e vira lixo que
       * ninguém apaga: o endpoint de exclusão do backend apaga por
       * `documento_id`, e o WP não cria linha em `documento_arquivo`. O enunciado
       * pede justamente para evitar arquivo órfão quando o banco recusa.
       *
       * O checksum é o `crc32c` que o GCS calcula, e `crc32cBase64` reproduz o
       * mesmo número aqui. Se um dia divergir, esta conferência deixa de achar o
       * repetido e a importação segue para a RPC, que recusa igual: perde-se o
       * ganho, não a proteção.
       */
      const checksumLocal = crc32cBase64(new Uint8Array(await arquivo.arrayBuffer()));
      const { data: estudoExistente } = await supabase
        .from('wp_estudo')
        .select('id')
        .eq('cliente_id', clienteId)
        .eq('ordem_servico_id', ordemServicoId)
        .eq('excluido', false)
        .maybeSingle();

      if (estudoExistente) {
        const { data: repetida } = await supabase
          .from('wp_importacao')
          .select('versao')
          .eq('estudo_id', estudoExistente.id)
          .eq('checksum', checksumLocal)
          .eq('excluido', false)
          .maybeSingle();

        if (repetida) {
          throw new Error(
            `Este arquivo já foi importado neste estudo, na revisão ${repetida.versao}. ` +
              'Para gerar uma revisão nova, altere a planilha e suba de novo.',
          );
        }
      }

      /*
       * O binário vai para o bucket da OSG, mas NÃO vira linha em
       * `documento_arquivo`: aquela tabela é listada sem filtro de área nas telas
       * de documento do cliente, e o WP apareceria no explorador junto com RG e
       * matrícula. O que se reusa é o mecanismo, e o `finalize` devolve o
       * checksum que impede subir o mesmo arquivo duas vezes.
       */
      const gcs = await subirArquivoGcs(fetchWithAuth, {
        clienteId,
        file: arquivo,
        categoria: 'outros',
      });

      const { data, error } = await supabase.rpc('importar_wp', {
        _cliente_id: clienteId,
        _ordem_servico_id: ordemServicoId,
        _gcs_uri: gcs.gcs_uri,
        _nome_original: arquivo.name,
        _mime: gcs.mime ?? arquivo.type,
        _tamanho: gcs.tamanho,
        _checksum: gcs.checksum,
        _versao_do_mapa: analise.versaoDoMapa,
        _conteudo: montaConteudo(analise) as unknown as Json,
        ...(descricao ? { _descricao: descricao } : {}),
      });
      if (error) throw error;

      return data as unknown as RevisaoGravada;
    },

    onSuccess: async (revisao, args) => {
      /*
       * A auditoria registra a IMPORTAÇÃO, e não os milhares de valores: um
       * registro por linha afogaria o log e ninguém leria nenhum. O que interessa
       * rastrear é quem trouxe qual arquivo, em que versão e com que régua.
       */
      await logAction({
        area: 'dev',
        entity_type: 'wp_importacao',
        entity_id: revisao.importacao_id,
        entity_name: `${args.arquivo.name} (versão ${revisao.versao})`,
        action: 'created',
        details:
          `Papel de trabalho importado com o mapa ${args.analise.versaoDoMapa}. ` +
          `Gravados: ${Object.entries(revisao.gravados)
            .map(([bloco, n]) => `${n} de ${bloco}`)
            .join(', ')}.` +
          (args.analise.decisao.avisos.length
            ? ` Entrou com ${args.analise.decisao.avisos.length} aviso(s).`
            : ''),
      });

      await queryClient.invalidateQueries({ queryKey: ['wp_estudo', args.clienteId] });
      await queryClient.invalidateQueries({ queryKey: ['wp_importacao', revisao.estudo_id] });
    },
  });
}
