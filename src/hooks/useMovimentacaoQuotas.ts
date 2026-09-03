import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/useAuditLog';
import type { AporteProposto, LancamentoDoAumento } from '@/lib/osg/aporteInicial';
import {
  capitalDoMovimento,
  colunasDoPagamento,
  FORMAS_MOVIMENTO,
  problemaDoPagamento,
  type MovimentoDeQuotas,
} from '@/lib/osg/movimentoQuotas';
import {
  movimentoDaLinha,
  type AtoParaProcedencia,
  type LinhaCrua,
  type MovimentoDoLedger,
} from '@/lib/osg/projecaoQuadro';
import type { PlanoDaSubida } from '@/lib/osg/subidaDeQuotas';
import { avaliarTravaDaSubida, type EmpresaDaSubida } from '@/lib/osg/travaDaSubida';
import { avaliarTravaDoIngresso } from '@/lib/osg/travaDoIngresso';

// Camada de dados do livro de movimentos de quota (`movimentacao_quotas`) e do
// quadro societário que sai dele (`v_quadro_societario`). Uma fonte só para a
// empresa Proprietária e para a Controladora: o quadro é o acumulado dos
// movimentos, entradas menos saídas, e sócio de saldo zero fica de fora.

export interface SocioDoQuadro {
  pessoaId: string;
  denominacao: string;
  tipoPessoa: string | null;
  cpfCnpj: string | null;
  quotas: number;
  vlrTotal: number;
  /** created_at do PRIMEIRO movimento do sócio: a ordem do preâmbulo. */
  ordem: string | null;
  /** Movimentos que compõem o saldo (alimentam a notificação de variável). */
  movimentoIds: string[];
}

/**
 * Quadro societário da empresa, na ordem em que os sócios saem no preâmbulo.
 *
 * São DUAS leituras, e não um embed: o PostgREST só infere relacionamento de
 * view quando a coluna vem direto da tabela base, e `pessoa_id` aqui nasce de um
 * `union all` com `group by`. Ou seja, `socio:pessoa_id (*)` não existe em
 * v_quadro_societario, então quem precisa da pessoa busca e costura, como aqui.
 */
export function useQuadroDaEmpresa(empresaPessoaId: string | null) {
  return useQuery<SocioDoQuadro[]>({
    queryKey: ['quadro-da-empresa', empresaPessoaId],
    enabled: !!empresaPessoaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_quadro_societario')
        .select('pessoa_id, quotas, vlr_total, ordem, movimento_ids')
        .eq('empresa_pessoa_id', empresaPessoaId!)
        .order('ordem');
      if (error) throw error;

      const linhas = (data ?? []).filter((l) => l.pessoa_id);
      if (linhas.length === 0) return [];

      const { data: pessoas, error: errPessoas } = await supabase
        .from('pessoa')
        .select('id, denominacao, tipo_pessoa, cpf_cnpj')
        .in('id', linhas.map((l) => l.pessoa_id!));
      if (errPessoas) throw errPessoas;
      const porId = new Map((pessoas ?? []).map((p) => [p.id, p]));

      return linhas.map((l) => {
        const p = porId.get(l.pessoa_id!);
        return {
          pessoaId: l.pessoa_id!,
          denominacao: p?.denominacao ?? '—',
          tipoPessoa: p?.tipo_pessoa ?? null,
          cpfCnpj: p?.cpf_cnpj ?? null,
          quotas: Number(l.quotas ?? 0),
          vlrTotal: Number(l.vlr_total ?? 0),
          ordem: l.ordem,
          movimentoIds: l.movimento_ids ?? [],
        };
      });
    },
  });
}

/**
 * Grava a proposta de aporte inicial da empresa Proprietária: um movimento de
 * aporte por (sócio, bem), na ordem de participação decrescente.
 *
 * `created_at` vai EXPLÍCITO e escalonado de um milissegundo por linha, e não
 * pelo default da coluna: `now()` é o timestamp da TRANSAÇÃO, então um insert em
 * lote carimbaria o mesmo instante em todas as linhas, o `ordem` da view viraria
 * empate e a ordem dos sócios no preâmbulo do contrato ficaria indeterminada.
 */
export function useGravarAporteInicial() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({
      clienteId,
      empresaPessoaId,
      aportes,
    }: {
      clienteId: string;
      empresaPessoaId: string;
      aportes: AporteProposto[];
    }) => {
      if (aportes.length === 0) throw new Error('Nada a gravar: a proposta está vazia.');

      const base = Date.now();
      const { data, error } = await supabase
        .from('movimentacao_quotas')
        .insert(
          aportes.map((a, i) => ({
            cliente_id: clienteId,
            tipo: 'aporte',
            empresa_pessoa_id: empresaPessoaId,
            destino_pessoa_id: a.pessoaId,
            quotas: a.quotas,
            bem_id: a.bemId,
            vlr_capital_arredondado: a.valor,
            created_at: new Date(base + i).toISOString(),
          })),
        )
        .select('id, destino_pessoa_id');
      if (error) throw error;
      return { linhas: data ?? [], aportes, empresaPessoaId };
    },
    onSuccess: async ({ linhas, aportes, empresaPessoaId }) => {
      queryClient.invalidateQueries({ queryKey: ['quadro-da-empresa', empresaPessoaId] });
      queryClient.invalidateQueries({ queryKey: ['socios-geracao', empresaPessoaId] });
      // O LIVRO também, e não só o saldo. Quando este hook nasceu, a tela do
      // Quadro Societário não lia os movimentos, e faltar esta chave não tinha
      // efeito visível. Passou a ter: o card dos imóveis fora do capital deriva
      // `bensNoLivro` daqui, então com o saldo fresco e o livro velho a tela
      // dizia que os bens recém-integralizados estavam fora do capital, no
      // instante seguinte ao clique que os pôs dentro.
      queryClient.invalidateQueries({ queryKey: ['movimentos-da-empresa', empresaPessoaId] });
      // Os aportes de constituição nascem pendentes e são as alíneas que a tela
      // Gerar imprime: sem isto ela seguiria lendo a lista vazia de antes.
      queryClient.invalidateQueries({ queryKey: ['aportes-do-livro', empresaPessoaId] });
      queryClient.invalidateQueries({ queryKey: ['relatorio-societario'] });

      const nomePorPessoa = new Map(aportes.map((a) => [a.pessoaId, a.denominacao]));
      for (const linha of linhas) {
        await logAction({
          area: 'osg',
          entity_type: 'movimentacao_quotas',
          entity_id: linha.id,
          entity_name: nomePorPessoa.get(linha.destino_pessoa_id ?? '') ?? 'Sócio',
          action: 'created',
        });
      }

      const socios = new Set(aportes.map((a) => a.pessoaId)).size;
      toast({
        title: 'Quadro societário gravado',
        description: `${aportes.length} aporte(s) de ${socios} sócio(s).`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao gravar o quadro societário',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Grava UM movimento de quota: um gesto do consultor, uma linha no livro.
 *
 * É o que substituiu o CRUD do quadro. Antes, editar o quadro fazia `update` na
 * linha do sócio e remover sócio fazia `delete` físico. O quadro só sabia o
 * estado de hoje, e o de ontem era apagado. Agora "vincular sócio" é um aporte,
 * "aumentar quotas" é outro aporte, "diminuir" é uma redução e "remover" é a
 * cessão (ou doação) das quotas para quem as recebeu. O saldo continua sendo o
 * que a tela mostra, mas ele passa a ser CONSEQUÊNCIA, e o histórico existe.
 *
 * O valor não vem do formulário: é `capitalDoMovimento(quotas)`. `vlr_total` do
 * quadro é a soma de `vlr_capital_arredondado`, e gravar ali o preço pago numa
 * cessão acima do par corromperia o capital da sociedade.
 */
export function useRegistrarMovimento() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({
      clienteId,
      empresaPessoaId,
      movimento,
    }: {
      clienteId: string;
      empresaPessoaId: string;
      movimento: MovimentoDeQuotas;
      /** Nome de quem entra no log (o adquirente, ou o cedente na redução). */
      entityName: string;
    }) => {
      const { data, error } = await supabase
        .from('movimentacao_quotas')
        .insert({
          cliente_id: clienteId,
          tipo: movimento.tipo,
          empresa_pessoa_id: empresaPessoaId,
          origem_pessoa_id: movimento.origemPessoaId,
          destino_pessoa_id: movimento.destinoPessoaId,
          quotas: movimento.quotas,
          vlr_capital_arredondado: capitalDoMovimento(movimento.quotas),
          data_movimento: movimento.dataMovimento,
          ato_id: movimento.atoId ?? null,
          sequencia: movimento.sequencia ?? null,
          // As quatro colunas de pagamento saem juntas de um lugar só: moeda
          // corrente é os quatro nulos, e é fácil errar isso à mão.
          ...colunasDoPagamento(movimento.pagamento),
        })
        .select('id')
        .single();
      if (error) throw error;
      return { id: data.id, empresaPessoaId };
    },
    onSuccess: async ({ id, empresaPessoaId }, { movimento, entityName }) => {
      queryClient.invalidateQueries({ queryKey: ['quadro-da-empresa', empresaPessoaId] });
      // A tela Gerar lê o quadro pela mesma view, com outra key.
      queryClient.invalidateQueries({ queryKey: ['socios-geracao', empresaPessoaId] });
      queryClient.invalidateQueries({ queryKey: ['relatorio-societario'] });

      const forma = FORMAS_MOVIMENTO[movimento.tipo];
      await logAction({
        area: 'osg',
        entity_type: 'movimentacao_quotas',
        entity_id: id,
        entity_name: entityName,
        action: 'created',
      });

      toast({
        title: `${forma.label} registrada`,
        description: `${movimento.quotas.toLocaleString('pt-BR')} quota(s) · ${entityName}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao registrar o movimento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// --- O livro cru, e o ato que agrupa lançamentos --------------------------

/**
 * As linhas do livro desta empresa, com o ato de cada uma, cruas.
 *
 * A view continua sendo o ponto de leitura do SALDO. Isto aqui é outra coisa: a
 * sequência dos movimentos, que é o que permite projetar o quadro num ponto
 * INTERMEDIÁRIO (a cláusula que publica o quadro no meio da peça), mostrar a
 * procedência de cada linha e saber quais eventos ainda não foram formalizados
 * por documento nenhum.
 */
export function useMovimentosDaEmpresa(empresaPessoaId: string | null) {
  return useQuery({
    queryKey: ['movimentos-da-empresa', empresaPessoaId],
    enabled: !!empresaPessoaId,
    queryFn: async (): Promise<{
      movimentos: MovimentoDoLedger[];
      atos: AtoParaProcedencia[];
    }> => {
      const { data, error } = await supabase
        .from('movimentacao_quotas')
        .select(
          'id, empresa_pessoa_id, tipo, origem_pessoa_id, destino_pessoa_id, quotas,' +
            ' vlr_capital_arredondado, created_at, data_movimento, ato_id, sequencia,' +
            ' documento_gerado_id, bem_id, pago_com_empresa_pessoa_id, pago_com_quotas,' +
            ' pago_com_valor, ato:ato_id (id, data, descricao)',
        )
        .eq('empresa_pessoa_id', empresaPessoaId!)
        .order('created_at');
      if (error) throw error;

      const linhas = (data ?? []) as unknown as Array<
        LinhaCrua & { ato: AtoParaProcedencia | null }
      >;
      const atos = new Map<string, AtoParaProcedencia>();
      for (const l of linhas) if (l.ato) atos.set(l.ato.id, l.ato);

      return {
        movimentos: linhas.map(movimentoDaLinha),
        atos: [...atos.values()],
      };
    },
  });
}

/**
 * Grava o ato da SUBIDA DAS QUOTAS: as cessões na proprietária e os aportes
 * espelhados na controladora, num ato só.
 *
 * Duas empresas, um gesto. O ato nasce primeiro para os lançamentos poderem
 * apontar para ele; se o insert dos lançamentos falhar, o ato é apagado na
 * volta, senão sobraria um ato vazio que a tela ofereceria reverter sem ter o
 * que reverter. (Não há transação: o PostgREST não expõe uma, e a alternativa
 * seria uma RPC só para isto.)
 *
 * `created_at` vai EXPLÍCITO e escalonado, pelo mesmo motivo de
 * `useGravarAporteInicial`: `now()` é o timestamp da transação, e um insert em
 * lote empataria o carimbo de todas as linhas. Aqui isso importa duas vezes,
 * porque a ordem DENTRO do ato é o que separa o quadro de antes da cessão do
 * quadro de depois dela.
 */
export function useSubirQuotas() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({
      clienteId,
      proprietariaPessoaId,
      plano,
      empresas,
      descricao,
      dataMovimento,
    }: {
      clienteId: string;
      /** De onde as quotas saem: a empresa cujo quadro a trava do ingresso lê. */
      proprietariaPessoaId: string;
      plano: PlanoDaSubida;
      /**
       * As duas pontas do ato. Só os NOMES vêm daqui, para a mensagem de erro
       * ficar legível: o fato que decide a trava (quem tem constitutivo
       * registrado) é relido do banco logo abaixo, e não aceito da tela.
       */
      empresas: EmpresaDaSubida[];
      /** Frase que nomeia o ato para o consultor. */
      descricao: string;
      dataMovimento: string | null;
    }) => {
      if (plano.problema) throw new Error(plano.problema);
      if (plano.lancamentos.length === 0) throw new Error('Nada a gravar: o plano está vazio.');

      // Segunda leitura da regra de pagamento, sobre os lançamentos que ESTE
      // gesto grava. O `plano` chega pronto da tela, e uma tela velha traz o
      // problema junto; o macro é justamente o caminho que não passa pelo
      // formulário, e por isso `problemaDoPagamento` existe separada.
      for (const l of plano.lancamentos) {
        const problema = problemaDoPagamento(l.movimento, l.empresaPessoaId);
        if (problema) throw new Error(problema);
      }

      // A trava das duas pontas é relida AQUI, e não só na tela, pela mesma razão
      // que a guarda do documento em useReverterAto: a tela pode estar com dado
      // velho (o modal aberto numa aba enquanto o contrato é registrado, ou não,
      // em outra), e este é o gesto que grava o ato.
      const { data: constitutivos, error: erroConstitutivos } = await supabase
        .from('documento_gerado')
        .select('pj_pessoa_id')
        .eq('cliente_id', clienteId)
        .eq('papel', 'constitutivo')
        .eq('status', 'registrado');
      if (erroConstitutivos) throw erroConstitutivos;
      const trava = avaliarTravaDaSubida(
        empresas,
        new Set((constitutivos ?? []).map((d) => d.pj_pessoa_id).filter((id): id is string => !!id)),
      );
      if (!trava.liberado) throw new Error(trava.motivo!);

      // E o LIVRO da Proprietária, pela mesma razão e no mesmo instante: sócio
      // que entrou no quadro por ato ainda não registrado faria esta cessão
      // nascer numa alteração contratual que o descreve entrando e saindo de
      // uma vez. A tela já confere, e pode estar com dado velho: o modal fica
      // aberto numa aba enquanto a alteração é registrada em outra.
      const { data: linhasDoLivro, error: erroLivro } = await supabase
        .from('movimentacao_quotas')
        .select('empresa_pessoa_id, origem_pessoa_id, destino_pessoa_id, quotas, documento_gerado_id')
        .eq('empresa_pessoa_id', proprietariaPessoaId);
      if (erroLivro) throw erroLivro;

      const doLivro = (linhasDoLivro ?? []).map((l) => ({
        empresaPessoaId: l.empresa_pessoa_id,
        origemPessoaId: l.origem_pessoa_id,
        destinoPessoaId: l.destino_pessoa_id,
        quotas: Number(l.quotas ?? 0),
        documentoGeradoId: l.documento_gerado_id,
      }));
      // Só os adquirentes dos movimentos PENDENTES podem ser nomeados na frase,
      // e são poucos: buscar o nome de todo mundo do livro seria uma leitura
      // maior para dizer a mesma coisa. Quem decide se algum deles é ingresso
      // continua sendo a função pura.
      const candidatos = [
        ...new Set(
          doLivro.filter((m) => !m.documentoGeradoId && m.destinoPessoaId).map((m) => m.destinoPessoaId!),
        ),
      ];
      const nomePorPessoa = new Map<string, string>();
      if (candidatos.length > 0) {
        const { data: pessoas, error: erroPessoas } = await supabase
          .from('pessoa')
          .select('id, denominacao')
          .in('id', candidatos);
        if (erroPessoas) throw erroPessoas;
        for (const p of pessoas ?? []) if (p.denominacao) nomePorPessoa.set(p.id, p.denominacao);
      }

      const travaIngresso = avaliarTravaDoIngresso(doLivro, proprietariaPessoaId, nomePorPessoa);
      if (!travaIngresso.liberado) throw new Error(travaIngresso.motivo!);

      const { data: ato, error: erroAto } = await supabase
        .from('ato_societario')
        .insert({ cliente_id: clienteId, data: dataMovimento, descricao })
        .select('id')
        .single();
      if (erroAto) throw erroAto;

      const base = Date.now();
      const { data, error } = await supabase
        .from('movimentacao_quotas')
        .insert(
          plano.lancamentos.map((l, i) => ({
            cliente_id: clienteId,
            tipo: l.movimento.tipo,
            empresa_pessoa_id: l.empresaPessoaId,
            origem_pessoa_id: l.movimento.origemPessoaId,
            destino_pessoa_id: l.movimento.destinoPessoaId,
            quotas: l.movimento.quotas,
            vlr_capital_arredondado: capitalDoMovimento(l.movimento.quotas),
            data_movimento: l.movimento.dataMovimento,
            ato_id: ato.id,
            sequencia: l.movimento.sequencia ?? i + 1,
            created_at: new Date(base + i).toISOString(),
            ...colunasDoPagamento(l.movimento.pagamento),
          })),
        )
        .select('id');
      if (error) {
        // Ato sem lançamento nenhum é lixo que a tela ofereceria reverter.
        await supabase.from('ato_societario').delete().eq('id', ato.id);
        throw error;
      }
      return { atoId: ato.id, linhas: data ?? [], plano, descricao };
    },
    onSuccess: async ({ atoId, plano, descricao }) => {
      for (const l of plano.lancamentos) {
        queryClient.invalidateQueries({ queryKey: ['quadro-da-empresa', l.empresaPessoaId] });
        queryClient.invalidateQueries({ queryKey: ['socios-geracao', l.empresaPessoaId] });
        queryClient.invalidateQueries({ queryKey: ['movimentos-da-empresa', l.empresaPessoaId] });
      }
      queryClient.invalidateQueries({ queryKey: ['relatorio-societario'] });

      await logAction({
        area: 'osg',
        entity_type: 'ato_societario',
        entity_id: atoId,
        entity_name: descricao,
        action: 'created',
      });

      toast({
        title: 'Quotas transferidas para a controladora',
        description: `${plano.lancamentos.length} lançamento(s) em um ato.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao transferir as quotas',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Grava o ato do AUMENTO DE CAPITAL: os imóveis aprovados depois da constituição
 * mais a parcela em moeda corrente, num ato só.
 *
 * É o elo que faltava. Sem ele o imóvel aprovado depois do registro do contrato
 * social não vira aporte nenhum, a alteração contratual seguinte não tem
 * movimento pendente de que derivar o evento, e o bem fica `Aprovado` para
 * sempre. Daqui para a frente tudo já é código em produção: o assistente acende
 * porque o aporte pendente passou a existir, as alíneas saem de
 * `useAportesDoLivro` e o registro da peça carimba `documento_gerado_id` e vira
 * os bens para `Integralizado`.
 *
 * O lançamento nasce sob um `ato_societario`, no molde de `useSubirQuotas`, e o
 * `ato_id` não é enfeite: `procedenciaDosMovimentos` rotula como "Constituição"
 * o PREFIXO de aportes sem ato, então numa PR cuja história é só aportes um
 * aumento solto entraria nesse prefixo e a tela chamaria o aumento de capital de
 * abertura. O ato também é o que dá reversão pelo card de Atos Societários e o
 * nome legível ao lado do sócio.
 *
 * `created_at` e `sequencia` vão os DOIS, explícitos e escalonados: `now()` é o
 * timestamp da TRANSAÇÃO e empataria todas as linhas, e `useAportesDoLivro` lê
 * por `created_at` e depois `sequencia` — é essa ordem que as alíneas do
 * instrumento imprimem.
 */
export function useGravarAumentoDeCapital() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({
      clienteId,
      empresaPessoaId,
      lancamentos,
      descricao,
      dataDoAto,
    }: {
      clienteId: string;
      empresaPessoaId: string;
      /** Na ordem de `proporAumentoDeCapital`, que é a ordem das alíneas. */
      lancamentos: LancamentoDoAumento[];
      /** Frase que nomeia o ato para o consultor (vira a procedência na tabela). */
      descricao: string;
      dataDoAto: string | null;
    }) => {
      if (lancamentos.length === 0) throw new Error('Nada a gravar: a proposta está vazia.');

      const { data: ato, error: erroAto } = await supabase
        .from('ato_societario')
        .insert({ cliente_id: clienteId, data: dataDoAto, descricao })
        .select('id')
        .single();
      if (erroAto) throw erroAto;

      const base = Date.now();
      const { error } = await supabase
        .from('movimentacao_quotas')
        .insert(
          lancamentos.map((l, i) => ({
            cliente_id: clienteId,
            tipo: 'aporte',
            empresa_pessoa_id: empresaPessoaId,
            destino_pessoa_id: l.pessoaId,
            quotas: l.quotas,
            vlr_capital_arredondado: capitalDoMovimento(l.quotas),
            data_movimento: dataDoAto,
            ato_id: ato.id,
            sequencia: i + 1,
            created_at: new Date(base + i).toISOString(),
            // O único ponto que decide qual alínea o instrumento imprime: bem_id
            // no imóvel, os quatro nulos na moeda corrente.
            ...colunasDoPagamento(l.pagamento),
          })),
        )
        .select('id');
      if (error) {
        // Ato sem lançamento nenhum é lixo que a tela ofereceria reverter.
        await supabase.from('ato_societario').delete().eq('id', ato.id);
        throw error;
      }
      return { atoId: ato.id, lancamentos, descricao, empresaPessoaId };
    },
    onSuccess: async ({ atoId, lancamentos, descricao, empresaPessoaId }) => {
      queryClient.invalidateQueries({ queryKey: ['quadro-da-empresa', empresaPessoaId] });
      queryClient.invalidateQueries({ queryKey: ['socios-geracao', empresaPessoaId] });
      queryClient.invalidateQueries({ queryKey: ['movimentos-da-empresa', empresaPessoaId] });
      // A tela Gerar lê os aportes pendentes e os bens elegíveis por estas duas:
      // sem invalidá-las o assistente continuaria mostrando a lista de antes.
      queryClient.invalidateQueries({ queryKey: ['aportes-do-livro', empresaPessoaId] });
      queryClient.invalidateQueries({ queryKey: ['integralizacoes-geracao', empresaPessoaId] });
      queryClient.invalidateQueries({ queryKey: ['relatorio-societario'] });

      await logAction({
        area: 'osg',
        entity_type: 'ato_societario',
        entity_id: atoId,
        entity_name: descricao,
        action: 'created',
      });

      const socios = new Set(lancamentos.map((l) => l.pessoaId)).size;
      toast({
        title: 'Aumento de capital gravado',
        description: `${lancamentos.length} lançamento(s) de ${socios} sócio(s) em um ato.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao gravar o aumento de capital',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Desfaz um ato inteiro, enquanto nenhum documento o formalizou.
 *
 * O delete do ato leva os lançamentos junto (ON DELETE CASCADE): reverter meio
 * par espelhado deixaria o quadro de uma das duas empresas sem contrapartida. A
 * guarda do documento é lida aqui, e não só na tela, porque a tela pode estar
 * com dado velho e a peça já ter sido validada em outra aba.
 */
export function useReverterAto() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ atoId, descricao }: { atoId: string; descricao: string }) => {
      const { data: formalizados, error: erroBusca } = await supabase
        .from('movimentacao_quotas')
        .select('id, empresa_pessoa_id, documento_gerado_id')
        .eq('ato_id', atoId);
      if (erroBusca) throw erroBusca;

      if ((formalizados ?? []).some((l) => l.documento_gerado_id)) {
        throw new Error(
          'Este ato já foi formalizado por um documento: para desfazê-lo, é preciso desfazer a peça que o registrou.',
        );
      }

      const { error } = await supabase.from('ato_societario').delete().eq('id', atoId);
      if (error) throw error;
      return {
        atoId,
        descricao,
        empresas: [...new Set((formalizados ?? []).map((l) => l.empresa_pessoa_id))],
      };
    },
    onSuccess: async ({ atoId, descricao, empresas }) => {
      for (const empresaPessoaId of empresas) {
        queryClient.invalidateQueries({ queryKey: ['quadro-da-empresa', empresaPessoaId] });
        queryClient.invalidateQueries({ queryKey: ['socios-geracao', empresaPessoaId] });
        queryClient.invalidateQueries({ queryKey: ['movimentos-da-empresa', empresaPessoaId] });
      }
      queryClient.invalidateQueries({ queryKey: ['relatorio-societario'] });

      await logAction({
        area: 'osg',
        entity_type: 'ato_societario',
        entity_id: atoId,
        entity_name: descricao,
        action: 'deleted',
      });

      toast({ title: 'Ato desfeito', description: descricao });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao desfazer o ato', description: error.message, variant: 'destructive' });
    },
  });
}
