import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import {
  type BeneficiarioDoProtocolo,
  type SecaoDaGrade,
  type CelulaEditada,
  type LinhaComItem,
  type RegraDoProtocolo,
  regrasParaSalvar,
} from '@/lib/protocoloRemuneracao';

/**
 * Camada de dados do Protocolo de Remuneração (GOV-F).
 *
 * O protocolo é uma grade: TEMA e ITEM em linha, BENEFICIÁRIO em coluna, e na
 * célula a regra escrita. As linhas vêm de dois catálogos compartilhados,
 * semeados com os 13 temas e 52 itens do modelo da casa; as colunas são do
 * próprio protocolo.
 *
 * **A leitura é uma só.** A tela precisa da grade inteira de uma vez: o modelo
 * tem 52 linhas e o Toqueto VF tem 3 colunas, o que dá 156 células. Uma consulta
 * por célula seriam 156 idas ao banco. Por isso `useProtocoloDoCliente` traz
 * protocolo, colunas, linhas e regras num aninhamento só, e a grade é montada em
 * memória pelo `montarGrade`.
 *
 * **A escrita é por LINHA, e não por célula.** Quem preenche pensa por item, que
 * é como a planilha é organizada: decide "veículo" para todos os beneficiários
 * de uma vez, e não "veículo do fundador" e depois "veículo do sucessor".
 *
 * **Salvar uma linha faz upsert e delete, e não apaga tudo para regravar.** A
 * Matriz de Alçadas apaga e regrava porque cada célula dela tem uma tabela filha
 * de papéis, que sairia por cascade de qualquer jeito. Aqui a célula é uma linha
 * só, o índice único `protocolo_regra_uq (linha_id, beneficiario_id)` deixa o
 * upsert natural, e assim a célula que ninguém tocou preserva o `created_at`
 * original. Num documento que é versionado e vira anexo de contrato, saber
 * quando aquela regra foi escrita pela primeira vez tem valor.
 *
 * SEM FILTRO DE `ambiente`, pelo mesmo motivo da GOV-01 e da GOV-02: nenhuma
 * destas tabelas tem a coluna, o ambiente é o do cliente, e a tela só oferece
 * cliente do ambiente corrente.
 */

type ProtocoloRow = Database['public']['Tables']['protocolo_remuneracao']['Row'];
type TemaRow = Database['public']['Tables']['protocolo_tema_governanca']['Row'];
type ItemRow = Database['public']['Tables']['protocolo_item_governanca']['Row'];

export type TemaDoCatalogo = TemaRow;
export type ItemDoCatalogo = ItemRow;

export interface ProtocoloDoCliente {
  protocolo: ProtocoloRow;
  /** O nome do cliente, só para nomear o arquivo gerado. */
  cliente: string;
  beneficiarios: BeneficiarioDoProtocolo[];
  linhas: LinhaComItem[];
  regras: RegraDoProtocolo[];
}

export const protocoloQueryKey = (clienteId?: string | null) =>
  ['protocolo-remuneracao', clienteId ?? null] as const;

export const catalogoTemasQueryKey = (clienteId?: string | null) =>
  ['protocolo-temas-catalogo', clienteId ?? null] as const;

export const catalogoItensQueryKey = (clienteId?: string | null) =>
  ['protocolo-itens-catalogo', clienteId ?? null] as const;

export const versoesQueryKey = (clienteId?: string | null) =>
  ['protocolo-versoes', clienteId ?? null] as const;

export interface VersaoDoProtocolo {
  id: string;
  versao: number;
  created_at: string;
}

/**
 * As versões do protocolo deste cliente, da mais nova para a mais velha.
 *
 * **Versão é coisa medida, e não precaução.** O Toqueto tem V1 e VF do mesmo
 * protocolo, e elas não diferem por detalhe: as colunas mudaram por inteiro
 * ("Sócios Fundadores" e "Familiares Gestores" viraram "Gestores", "Fundadores"
 * e "Sócios/Filhos 1a geração"), os itens passaram de 51 para 46, e dos textos
 * que existiam nos itens comuns só 2 seguiram idênticos contra 12 reescritos.
 * A prática da casa confirma: o sufixo `VF` (versão final) aparece em sete
 * arquivos do acervo de governança, sempre depois de uma `V1`.
 */
export function useVersoesDoProtocolo(clienteId?: string | null) {
  return useQuery<VersaoDoProtocolo[]>({
    queryKey: versoesQueryKey(clienteId),
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('protocolo_remuneracao')
        .select('id, versao, created_at')
        .eq('cliente_id', clienteId as string)
        .eq('excluido', false)
        .order('versao', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─── Catálogos ────────────────────────────────────────────────────────────────

/**
 * Os temas disponíveis: os padrão da OSG mais os que este cliente criou.
 *
 * O `or` com `is.null` traz as duas famílias numa consulta. A RLS já garante que
 * o de outro cliente não vem junto.
 */
export function useCatalogoDeTemas(clienteId?: string | null) {
  return useQuery<TemaDoCatalogo[]>({
    queryKey: catalogoTemasQueryKey(clienteId),
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('protocolo_tema_governanca')
        .select('*')
        .or(`cliente_id.is.null,cliente_id.eq.${clienteId}`)
        .eq('excluido', false)
        .order('ordem')
        .order('nome');
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Os itens disponíveis: os padrão da OSG mais os que este cliente criou. */
export function useCatalogoDeItens(clienteId?: string | null) {
  return useQuery<ItemDoCatalogo[]>({
    queryKey: catalogoItensQueryKey(clienteId),
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('protocolo_item_governanca')
        .select('*')
        .or(`cliente_id.is.null,cliente_id.eq.${clienteId}`)
        .eq('excluido', false)
        .order('ordem')
        .order('nome');
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─── Leitura da grade ─────────────────────────────────────────────────────────

/**
 * O protocolo vigente do cliente, inteiro.
 *
 * Traz a maior `versao` e não a mais recente por data: o Toqueto tem V1 e VF, e
 * é a versão que diz qual vale, não o carimbo de quando alguém mexeu por último.
 */
export function useProtocoloDoCliente(clienteId?: string | null, protocoloId?: string | null) {
  return useQuery<ProtocoloDoCliente | null>({
    queryKey: [...protocoloQueryKey(clienteId), protocoloId ?? 'vigente'],
    enabled: !!clienteId,
    queryFn: async () => {
      const consulta = supabase
        .from('protocolo_remuneracao')
        .select(
          `*,
           cliente ( nome ),
           protocolo_beneficiario ( id, nome, ordem, excluido ),
           protocolo_linha (
             id, ordem,
             protocolo_item_governanca (
               id, nome, ordem,
               protocolo_tema_governanca ( id, nome, ordem )
             ),
             protocolo_regra ( linha_id, beneficiario_id, texto )
           )`,
        )
        .eq('cliente_id', clienteId as string)
        .eq('excluido', false);

      /* Sem versão escolhida, abre a mais nova. É o que a pessoa quer em 9 de
         cada 10 vezes, e é como a tela se comportava antes de haver versão. */
      const { data, error } = protocoloId
        ? await consulta.eq('id', protocoloId).maybeSingle()
        : await consulta.order('versao', { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const linhasBrutas = data.protocolo_linha ?? [];

      return {
        protocolo: data as unknown as ProtocoloRow,
        cliente: (data.cliente as { nome: string } | null)?.nome ?? '',

        /*
         * Só as colunas DESTE protocolo vêm no aninhamento, porque o padrão da
         * casa tem `protocolo_id` nulo e não pendura em protocolo nenhum. É o que
         * se quer: o padrão é molde, não coluna.
         */
        beneficiarios: (data.protocolo_beneficiario ?? [])
          .filter((b) => !b.excluido)
          .map((b) => ({ id: b.id, nome: b.nome, ordem: b.ordem })),

        linhas: linhasBrutas.flatMap((l): LinhaComItem[] => {
          const item = l.protocolo_item_governanca;
          const tema = item?.protocolo_tema_governanca;
          /* Sem item ou sem tema a linha não sabe onde ficar; melhor sumir do que
             desenhar uma seção órfã. O `RESTRICT` no catálogo torna isto raro. */
          if (!item || !tema) return [];
          return [
            {
              id: l.id,
              ordem: l.ordem,
              item: {
                id: item.id,
                nome: item.nome,
                ordem: item.ordem,
                tema: { id: tema.id, nome: tema.nome, ordem: tema.ordem },
              },
            },
          ];
        }),

        regras: linhasBrutas.flatMap((l) => l.protocolo_regra ?? []),
      };
    },
  });
}

// ─── Escrita ──────────────────────────────────────────────────────────────────

export function useProtocoloMutations(clienteId?: string | null) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { logAction } = useAuditLog();

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: protocoloQueryKey(clienteId) });
    queryClient.invalidateQueries({ queryKey: catalogoTemasQueryKey(clienteId) });
    queryClient.invalidateQueries({ queryKey: catalogoItensQueryKey(clienteId) });
    queryClient.invalidateQueries({ queryKey: versoesQueryKey(clienteId) });
  };

  const autor = () => ({ created_by: user?.id ?? null, updated_by: user?.id ?? null });

  /**
   * Cria o protocolo do cliente, já com as linhas e as colunas do modelo.
   *
   * As 52 linhas entram de uma vez, e não uma a uma, pelo mesmo motivo da Matriz:
   * o modelo tem todas e quem preenche tira o que não se aplica, como faz na
   * planilha. Foi o que o Toqueto VF fez, tirando o tema Aeronave inteiro.
   *
   * **As três colunas padrão são COPIADAS, não apontadas.** Elas são
   * "Fundadores", "Sócios" e "Sócios Gestores", que é como a consultoria chama
   * esses grupos na conversa com o cliente. O padrão mora com `protocolo_id`
   * nulo, e o gatilho
   * `trg_protocolo_regra_beneficiario_do_protocolo` recusa célula presa a ele, de
   * propósito: sem a cópia, dois protocolos gravariam regra no mesmo
   * beneficiário padrão e um leria a do outro.
   */
  const criarProtocolo = useMutation({
    mutationFn: async () => {
      const { data: protocolo, error } = await supabase
        .from('protocolo_remuneracao')
        .insert({ cliente_id: clienteId as string, versao: 1, ...autor() })
        .select()
        .single();
      if (error) throw error;

      const { data: colunasPadrao, error: erroColunas } = await supabase
        .from('protocolo_beneficiario')
        .select('nome, ordem')
        .is('protocolo_id', null)
        .eq('excluido', false)
        .order('ordem');
      if (erroColunas) throw erroColunas;

      if ((colunasPadrao ?? []).length > 0) {
        const { error: erroCopia } = await supabase.from('protocolo_beneficiario').insert(
          (colunasPadrao ?? []).map((b) => ({
            protocolo_id: protocolo.id,
            nome: b.nome,
            ordem: b.ordem,
            ...autor(),
          })),
        );
        if (erroCopia) throw erroCopia;
      }

      const { data: itensPadrao, error: erroItens } = await supabase
        .from('protocolo_item_governanca')
        .select('id, ordem')
        .is('cliente_id', null)
        .eq('excluido', false)
        .order('ordem');
      if (erroItens) throw erroItens;

      if ((itensPadrao ?? []).length > 0) {
        const { error: erroLinhas } = await supabase.from('protocolo_linha').insert(
          (itensPadrao ?? []).map((i) => ({
            protocolo_id: protocolo.id,
            item_id: i.id,
            ordem: i.ordem,
            ...autor(),
          })),
        );
        if (erroLinhas) throw erroLinhas;
      }

      await logAction({
        area: 'osg',
        entity_type: 'protocolo_remuneracao',
        entity_id: protocolo.id,
        entity_name: `Protocolo versão ${protocolo.versao}`,
        action: 'created',
      });

      return protocolo;
    },
    onSuccess: () => {
      invalidar();
      toast.success('Protocolo criado com os itens e as colunas padrão');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Não consegui criar'),
  });

  /**
   * Cria a versão seguinte, COPIANDO a atual inteira.
   *
   * **Copiar, e não recomeçar do modelo, e aqui eu divirjo do Acordo de
   * Quotistas de propósito.** Lá a versão nova nasce da semente, com o argumento
   * de que partir da anterior arrastaria valor que ninguém reviu justamente
   * quando tudo está sendo revisto. O argumento é bom, e não vale aqui por uma
   * diferença de natureza: os campos do acordo são curtos e têm padrão de casa,
   * enquanto a célula do protocolo é parágrafo escrito à mão. Recomeçar do
   * catálogo faria a consultoria redigitar 90 parágrafos, e ninguém faria isso:
   * copiariam do arquivo antigo por fora, que é pior.
   *
   * A medição sustenta os dois lados, e é honesto dizer. No Toqueto, das 16
   * células escritas na V1, 8 reaparecem literalmente na VF; nos itens comuns às
   * duas, 2 textos ficaram idênticos e 12 mudaram. Metade se aproveita, metade
   * se reescreve. Copiando, quem revisa apaga o que não vale; recomeçando, quem
   * revisa redigita o que já valia.
   *
   * A anterior não some: fica com a versão menor, e é o que permite saber qual
   * versão do protocolo virou qual documento assinado.
   */
  const novaVersao = useMutation({
    mutationFn: async (args: { atual: ProtocoloDoCliente }) => {
      if (!clienteId) throw new Error('Selecione um cliente.');

      const { data: novo, error } = await supabase
        .from('protocolo_remuneracao')
        .insert({
          cliente_id: clienteId,
          versao: args.atual.protocolo.versao + 1,
          ...autor(),
        })
        .select()
        .single();
      if (error) throw error;

      /*
       * As colunas e as linhas voltam com id novo, e o `select` traz `nome` e
       * `item_id` junto para eu casar velho com novo por chave de negócio. Casar
       * pela ORDEM de retorno funcionaria hoje e quebraria calado no dia em que o
       * Postgres devolvesse noutra ordem, e o estrago seria a regra do Fundador
       * caindo na coluna do Gestor.
       */
      const { data: colunas, error: erroColunas } = await supabase
        .from('protocolo_beneficiario')
        .insert(
          args.atual.beneficiarios.map((b) => ({
            protocolo_id: novo.id,
            nome: b.nome,
            ordem: b.ordem,
            ...autor(),
          })),
        )
        .select('id, nome');
      if (erroColunas) throw erroColunas;

      const { data: linhas, error: erroLinhas } = await supabase
        .from('protocolo_linha')
        .insert(
          args.atual.linhas.map((l) => ({
            protocolo_id: novo.id,
            item_id: l.item.id,
            ordem: l.ordem,
            ...autor(),
          })),
        )
        .select('id, item_id');
      if (erroLinhas) throw erroLinhas;

      const colunaNova = new Map((colunas ?? []).map((c) => [c.nome, c.id]));
      const linhaNova = new Map((linhas ?? []).map((l) => [l.item_id, l.id]));
      const itemDaLinhaVelha = new Map(args.atual.linhas.map((l) => [l.id, l.item.id]));
      const nomeDaColunaVelha = new Map(args.atual.beneficiarios.map((b) => [b.id, b.nome]));

      const regras = args.atual.regras.flatMap((r) => {
        const itemId = itemDaLinhaVelha.get(r.linha_id);
        const nome = nomeDaColunaVelha.get(r.beneficiario_id);
        const linhaId = itemId ? linhaNova.get(itemId) : undefined;
        const colunaId = nome ? colunaNova.get(nome) : undefined;
        if (!linhaId || !colunaId) return [];
        return [{ linha_id: linhaId, beneficiario_id: colunaId, texto: r.texto, ...autor() }];
      });

      if (regras.length > 0) {
        const { error: erroRegras } = await supabase.from('protocolo_regra').insert(regras);
        if (erroRegras) throw erroRegras;
      }

      await logAction({
        area: 'osg',
        entity_type: 'protocolo_remuneracao',
        entity_id: novo.id,
        entity_name: `Protocolo de Remuneração, versão ${novo.versao}`,
        action: 'created',
      });

      return novo;
    },
    onSuccess: (p) => {
      invalidar();
      queryClient.invalidateQueries({ queryKey: versoesQueryKey(clienteId) });
      toast.success(`Versão ${p.versao} criada como cópia da anterior. Revise item por item.`);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : 'Não consegui criar a versão'),
  });

  /**
   * Registra que a planilha foi gerada.
   *
   * **O arquivo não é guardado, e isso não é omissão minha: nenhum documento
   * deste sistema guarda.** O `caminho_arquivo` de `documento_gerado` existe na
   * tabela e não é escrito por linha de código nenhuma, e não há upload para
   * storage no caminho de geração. O que se guarda é o REGISTRO e o SNAPSHOT, e
   * é o snapshot que permite refazer o arquivo idêntico depois.
   *
   * **`documento_template_id` vai nulo**, porque o protocolo não sai de um
   * `tmpl_documento`: ele é escrito direto pelo `xlsx`. Isso o torna invisível
   * para as consultas da tela Gerar, que filtram por modelo, e visível para as
   * consultas por cliente, que é o que se quer. Em especial o
   * `useClienteTemDocumentoGerado`, que é o que liga o painel de histórico na
   * caixa de editar item.
   *
   * A auditoria usa `created`, porque o vocabulário tem três ações e não existe
   * "gerado". No histórico se lê "Criação, Protocolo de Remuneração, Planilha do
   * Protocolo versão 1", que diz o que aconteceu.
   */
  const registrarGeracao = useMutation({
    mutationFn: async (args: { protocoloId: string; versao: number; grade: SecaoDaGrade[] }) => {
      const { data, error } = await supabase
        .from('documento_gerado')
        .insert({
          cliente_id: clienteId as string,
          documento_template_id: null,
          gerado_em: new Date().toISOString(),
          gerado_por_id: user?.id ?? null,
          observacao: `Protocolo de Remuneração, versão ${args.versao}`,
          snapshot_dados: JSON.parse(
            JSON.stringify({ protocolo_id: args.protocoloId, grade: args.grade }),
          ),
          created_by: user?.id ?? null,
          updated_by: user?.id ?? null,
        })
        .select('id')
        .single();
      if (error) throw error;

      await logAction({
        area: 'osg',
        entity_type: 'protocolo_remuneracao',
        entity_id: args.protocoloId,
        entity_name: `Planilha do Protocolo, versão ${args.versao}`,
        action: 'created',
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cliente-tem-documento-gerado', clienteId] });
    },
    /*
     * A falha aqui NÃO desfaz o download: o arquivo já está na máquina de quem
     * clicou, e dizer "não consegui gerar" seria mentira. O aviso diz o que
     * realmente falhou, que é o registro.
     */
    onError: (e: unknown) =>
      toast.error(
        e instanceof Error
          ? `A planilha foi baixada, mas não consegui registrar a geração: ${e.message}`
          : 'A planilha foi baixada, mas não consegui registrar a geração',
      ),
  });

  /**
   * Substitui as regras de UMA linha.
   *
   * O `regrasParaSalvar` decide o que é gravação e o que é apagamento: célula em
   * branco é a ausência da regra, e mandar string vazia estouraria o
   * `CHECK (btrim(texto) <> '')` da tabela.
   */
  const salvarLinha = useMutation({
    mutationFn: async (args: {
      linhaId: string;
      celulas: CelulaEditada[];
      rotulo: string;
      /** O que mudou, célula a célula, já em nome de gente. Ver `lib/protocoloRemuneracao`. */
      diff: Record<string, { old: string; new: string }>;
    }) => {
      const { paraGravar, paraApagar } = regrasParaSalvar(args.celulas);

      if (paraApagar.length > 0) {
        const { error } = await supabase
          .from('protocolo_regra')
          .delete()
          .eq('linha_id', args.linhaId)
          .in('beneficiario_id', paraApagar);
        if (error) throw error;
      }

      if (paraGravar.length > 0) {
        const { error } = await supabase.from('protocolo_regra').upsert(
          paraGravar.map((c) => ({
            linha_id: args.linhaId,
            beneficiario_id: c.beneficiario_id,
            texto: c.texto,
            ...autor(),
          })),
          { onConflict: 'linha_id,beneficiario_id' },
        );
        if (error) throw error;
      }

      /*
       * Nada mudou, nada se audita: senão o histórico enche de linha de quem só
       * abriu a caixa e fechou. Mesma regra da GOV-01 e da GOV-02.
       */
      if (Object.keys(args.diff).length > 0) {
        await logAction({
          area: 'osg',
          entity_type: 'protocolo_linha',
          entity_id: args.linhaId,
          entity_name: args.rotulo,
          action: 'updated',
          changed_fields: args.diff,
        });
      }
    },
    onSuccess: () => {
      invalidar();
      toast.success('Linha salva');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Não consegui salvar'),
  });

  /**
   * Tira um item do protocolo. As regras dele caem por cascade; o catálogo não é
   * tocado, então o item pode voltar depois.
   */
  const removerLinha = useMutation({
    mutationFn: async (args: { linhaId: string; rotulo: string }) => {
      const { error } = await supabase.from('protocolo_linha').delete().eq('id', args.linhaId);
      if (error) throw error;
      await logAction({
        area: 'osg',
        entity_type: 'protocolo_linha',
        entity_id: args.linhaId,
        entity_name: args.rotulo,
        action: 'deleted',
      });
    },
    onSuccess: () => {
      invalidar();
      toast.success('Item tirado do protocolo');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Não consegui tirar'),
  });

  /** Traz de volta, ou acrescenta pela primeira vez, itens do catálogo. */
  const adicionarItens = useMutation({
    mutationFn: async (args: { protocoloId: string; itemIds: string[]; ordemBase: number }) => {
      const { error } = await supabase.from('protocolo_linha').insert(
        args.itemIds.map((id, i) => ({
          protocolo_id: args.protocoloId,
          item_id: id,
          ordem: args.ordemBase + (i + 1) * 10,
          ...autor(),
        })),
      );
      if (error) throw error;
    },
    onSuccess: () => {
      invalidar();
      toast.success('Item acrescentado');
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : 'Não consegui acrescentar'),
  });

  /**
   * Cria um tema que só existe neste cliente.
   *
   * Os 13 padrão cobrem o modelo e quase todos os clientes medidos, mas o
   * catálogo nasce aberto de propósito: o Jacobowski tem "Regime de casamento
   * e/ou união estável", que o modelo não tem.
   */
  const criarTemaDoCliente = useMutation({
    mutationFn: async (args: { nome: string; ordemBase: number }) => {
      const { data, error } = await supabase
        .from('protocolo_tema_governanca')
        .insert({
          cliente_id: clienteId as string,
          nome: args.nome,
          ordem: args.ordemBase + 10,
          ...autor(),
        })
        .select()
        .single();
      if (error) throw error;

      await logAction({
        area: 'osg',
        entity_type: 'protocolo_tema_governanca',
        entity_id: data.id,
        entity_name: data.nome,
        action: 'created',
      });
      return data;
    },
    onSuccess: () => {
      invalidar();
      toast.success('Tema criado');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Não consegui criar'),
  });

  /**
   * Cria um item que só existe neste cliente, dentro de um tema, e já o põe no
   * protocolo. É a metade do catálogo que o padrão não cobre: o Potrich escreve
   * "Tratamento odontológico, oftmológicos, psicológicos etc." onde o modelo diz
   * só "Tratamento odontológico".
   */
  const criarItemDoCliente = useMutation({
    mutationFn: async (args: {
      protocoloId: string;
      temaId: string;
      nome: string;
      ordemBase: number;
    }) => {
      const { data: item, error } = await supabase
        .from('protocolo_item_governanca')
        .insert({
          cliente_id: clienteId as string,
          tema_id: args.temaId,
          nome: args.nome,
          ordem: args.ordemBase + 10,
          ...autor(),
        })
        .select()
        .single();
      if (error) throw error;

      const { error: erroLinha } = await supabase.from('protocolo_linha').insert({
        protocolo_id: args.protocoloId,
        item_id: item.id,
        ordem: args.ordemBase + 10,
        ...autor(),
      });
      if (erroLinha) throw erroLinha;

      await logAction({
        area: 'osg',
        entity_type: 'protocolo_item_governanca',
        entity_id: item.id,
        entity_name: item.nome,
        action: 'created',
      });
      return item;
    },
    onSuccess: () => {
      invalidar();
      toast.success('Item criado e posto no protocolo');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Não consegui criar'),
  });

  /**
   * As colunas do protocolo.
   *
   * A coluna não deriva de cadastro nenhum: é título combinado na conversa com o
   * cliente, só para diferenciar quem recebe o que. Por isso o padrão é ponto de
   * partida e não lista fechada, e por isso são três operações. Nos arquivos
   * reais: Potrich tem "Sócios Fundadores" e "Sucessores na Gestão"; Toqueto V1
   * tem "Sócios Fundadores" e "Familiares Gestores"; Toqueto VF tem "Gestores",
   * "Fundadores" e "Sócios/Filhos 1a geração".
   */
  const adicionarBeneficiario = useMutation({
    mutationFn: async (args: { protocoloId: string; nome: string; ordemBase: number }) => {
      const { data, error } = await supabase
        .from('protocolo_beneficiario')
        .insert({
          protocolo_id: args.protocoloId,
          nome: args.nome,
          ordem: args.ordemBase + 10,
          ...autor(),
        })
        .select()
        .single();
      if (error) throw error;

      await logAction({
        area: 'osg',
        entity_type: 'protocolo_beneficiario',
        entity_id: data.id,
        entity_name: data.nome,
        action: 'created',
      });
      return data;
    },
    onSuccess: () => {
      invalidar();
      toast.success('Coluna acrescentada');
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : 'Não consegui acrescentar'),
  });

  const renomearBeneficiario = useMutation({
    mutationFn: async (args: { id: string; de: string; para: string }) => {
      const { error } = await supabase
        .from('protocolo_beneficiario')
        .update({ nome: args.para, updated_by: user?.id ?? null })
        .eq('id', args.id);
      if (error) throw error;

      await logAction({
        area: 'osg',
        entity_type: 'protocolo_beneficiario',
        entity_id: args.id,
        entity_name: args.para,
        action: 'updated',
        changed_fields: { nome: { old: args.de, new: args.para } },
      });
    },
    onSuccess: () => {
      invalidar();
      toast.success('Coluna renomeada');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Não consegui renomear'),
  });

  /**
   * Tira uma coluna. As regras dela caem por cascade, então some a coluna inteira
   * da grade, e é por isso que a tela precisa avisar antes: diferente de tirar um
   * item, aqui o texto escrito se perde.
   */
  const removerBeneficiario = useMutation({
    mutationFn: async (args: { id: string; nome: string }) => {
      const { error } = await supabase.from('protocolo_beneficiario').delete().eq('id', args.id);
      if (error) throw error;

      await logAction({
        area: 'osg',
        entity_type: 'protocolo_beneficiario',
        entity_id: args.id,
        entity_name: args.nome,
        action: 'deleted',
      });
    },
    onSuccess: () => {
      invalidar();
      toast.success('Coluna tirada do protocolo');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Não consegui tirar'),
  });

  return {
    criarProtocolo,
    novaVersao,
    registrarGeracao,
    salvarLinha,
    removerLinha,
    adicionarItens,
    criarTemaDoCliente,
    criarItemDoCliente,
    adicionarBeneficiario,
    renomearBeneficiario,
    removerBeneficiario,
  };
}
