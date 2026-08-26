import { useMemo, useState } from 'react';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { useBensByCliente, type BemComValores } from '@/hooks/useDiagnosticoPatrimonial';
import { useQuadroSocietarioByEmpresa } from '@/hooks/useQuadroSocietario';
import { useParentescosByCliente, usePessoasByCliente } from '@/hooks/useQualificacaoDasPartes';
import { totalizarAcervo, type ImovelDoAcervo } from '@/lib/osg/acervoItcmd';
import { competenciasDisponiveis } from '@/lib/osg/itcmd/faixas';
import { calcularLegitima, type Distribuicao } from '@/lib/osg/itcmd/legitima';
import { simular, type SaidaSimulacao } from '@/lib/osg/itcmd/simulacao';
import {
  candidatosADoador,
  candidatosADonatario,
  type CandidatoADoador,
} from '@/lib/osg/participantesItcmd';

/**
 * Estado e derivações da Calculadora de ITCD. Fica em hook controlador porque a
 * página é uma cadeia de seis passos e o estado de um passo é entrada do
 * seguinte; deixar tudo no `.tsx` estouraria o teto de linhas do AGENTS.md.
 *
 * Sem persistência nesta etapa: o estado é React e morre com a navegação. Salvar,
 * revisar e aprovar são etapa seguinte — e é justamente por isso que a simulação
 * exibe a UPF que usou (SPEC §3.1: UPF nova não recalcula simulação emitida).
 */

/** Só imóvel entra no acervo doado. */
const TIPOS_IMOVEL = ['IR', 'IB'];

/** Empresas que têm quadro societário, como no Quadro Societário. */
const TIPOS_EMPRESA_ELEGIVEIS = ['PR', 'CN'];

export interface DonatarioNaTela {
  pessoaId: string;
  denominacao: string;
  origem: 'parentesco' | 'filiacao' | 'ambos';
  /** Quotas da legítima (calculadas) + da disponível (distribuídas). */
  quotas: bigint;
  disponivel: bigint;
  doacaoAnterior: string;
}

export function useCalculadoraItcmdController() {
  const { clienteId } = useOsgWork();

  const bens = useBensByCliente(clienteId || null);
  const pessoas = usePessoasByCliente(clienteId || null);
  const parentescos = useParentescosByCliente(clienteId || null);

  const [empresaEscolhida, setEmpresaEscolhida] = useState<string | null>(null);
  const [doadorOverride, setDoadorOverride] = useState<Record<string, boolean>>({});
  const [donatarioOverride, setDonatarioOverride] = useState<Record<string, boolean>>({});
  const [doacaoAnterior, setDoacaoAnterior] = useState<Record<string, string>>({});
  const [disponivelPorDonatario, setDisponivelPorDonatario] = useState<Record<string, string>>({});
  const [competencia, setCompetencia] = useState<string>(() => competenciaInicial());

  // ── Passo 1: imóveis e totais por cenário ────────────────────────────────
  const imoveis = useMemo<ImovelDoAcervo[]>(
    () => (bens.data ?? [])
      .filter((b) => TIPOS_IMOVEL.includes(b.tipo_bem) && b.participa_estruturacao)
      .map(paraImovelDoAcervo),
    [bens.data],
  );
  const acervo = useMemo(() => totalizarAcervo(imoveis), [imoveis]);
  // Bens fora do acervo aparecem contados, não desaparecidos: o total tem de
  // poder ser conferido contra a lista do Diagnóstico Patrimonial.
  const bensForaDoAcervo = (bens.data ?? []).length - imoveis.length;

  // ── Passo 2: a sociedade cujas quotas serão doadas ───────────────────────
  const empresas = useMemo(
    () => (pessoas.data ?? [])
      .filter((p) => p.tipo_pessoa === 'PJ'
        && TIPOS_EMPRESA_ELEGIVEIS.includes(p.tipo_empresa ?? ''))
      .sort((a, b) => (a.denominacao ?? '').localeCompare(b.denominacao ?? '')),
    [pessoas.data],
  );
  const empresa = empresas.find((e) => e.id === empresaEscolhida) ?? empresas[0] ?? null;
  const socios = useQuadroSocietarioByEmpresa(empresa?.id ?? null);
  const totalDeQuotas = (socios.data ?? []).reduce((acc, s) => acc + BigInt(s.quotas ?? 0), 0n);

  // ── Passo 3: participantes propostos pelo cadastro, confirmados pelo analista
  const candidatosDoador = useMemo(
    () => candidatosADoador(socios.data ?? [], pessoas.data ?? []),
    [socios.data, pessoas.data],
  );
  const doadorMarcado = (c: CandidatoADoador) =>
    doadorOverride[c.pessoaId] ?? c.propostoPorFundador;
  const doadores = candidatosDoador.filter(doadorMarcado);

  // `doadores` é derivado a cada render; a chave estável do memo é a lista de ids.
  const idsDosDoadores = doadores.map((d) => d.pessoaId).join('|');
  const candidatosDonatario = useMemo(
    () => candidatosADonatario(
      idsDosDoadores === '' ? [] : idsDosDoadores.split('|'),
      pessoas.data ?? [],
      parentescos.data ?? [],
    ),
    [idsDosDoadores, pessoas.data, parentescos.data],
  );
  const donatariosConfirmados = candidatosDonatario
    .filter((c) => donatarioOverride[c.pessoaId] ?? true);

  // ── Passo 5: legítima calculada, disponível distribuída pelo analista ─────
  const distribuicao: Distribuicao | null = doadores.length > 0 && donatariosConfirmados.length > 0
    ? calcularLegitima(
      doadores.map((d) => ({ doadorId: d.pessoaId, quotas: d.quotas })),
      donatariosConfirmados.length,
    )
    : null;

  const nomePorId = useMemo(
    () => new Map((pessoas.data ?? []).map((p) => [p.id, p.denominacao])),
    [pessoas.data],
  );

  const donatarios: DonatarioNaTela[] = donatariosConfirmados.map((c) => {
    const disponivel = inteiroOuZero(disponivelPorDonatario[c.pessoaId]);
    return {
      pessoaId: c.pessoaId,
      denominacao: nomePorId.get(c.pessoaId) ?? '—',
      origem: c.origem,
      disponivel,
      quotas: (distribuicao?.legitimaPorHerdeiro ?? 0n) + disponivel,
      doacaoAnterior: doacaoAnterior[c.pessoaId] ?? '',
    };
  });

  const disponivelDistribuida = donatarios.reduce((acc, d) => acc + d.disponivel, 0n);
  const disponivelTotal = distribuicao?.disponivelTotal ?? 0n;
  const disponivelRestante = disponivelTotal - disponivelDistribuida;
  const distribuicaoFecha = distribuicao != null && disponivelRestante === 0n;

  // ── Passos 4 e 6: doação anterior declarada e competência da UPF ──────────
  const competencias = competenciasDisponiveis();
  const competenciaDoMesCorrente = mesCorrente();
  const upfDoMesCorrenteAusente = !competencias.includes(competenciaDoMesCorrente);

  // ── Passo 7: o quadro de saída ───────────────────────────────────────────
  // `donatarios` é derivado a cada render (bigint dentro), então a dependência do
  // memo é a assinatura textual do que muda o resultado: quem recebe, quanto, e
  // quanto já recebeu antes.
  const assinaturaDosDonatarios = donatarios
    .map((d) => `${d.pessoaId}:${d.quotas}:${d.doacaoAnterior}`)
    .join('|');

  const { saida, erro } = useMemo<{ saida: SaidaSimulacao | null; erro: string | null }>(() => {
    if (!distribuicaoFecha || donatarios.length === 0 || totalDeQuotas <= 0n) {
      return { saida: null, erro: null };
    }
    try {
      return {
        saida: simular({
          competencia,
          totalDeQuotas: totalDeQuotas.toString(),
          totaisDoAcervo: {
            contabil: acervo.contabil.total,
            itr: acervo.itr.total,
            mercado: acervo.mercado.total,
          },
          donatarios: donatarios.map((d) => ({
            donatarioId: d.pessoaId,
            nome: d.denominacao,
            quotasRecebidas: d.quotas.toString(),
            doacaoAnterior: d.doacaoAnterior.trim() === '' ? null : d.doacaoAnterior.trim(),
          })),
        }),
        erro: null,
      };
    } catch (e) {
      // Sem fallback silencioso: a mensagem sobe para a tela em vez de virar
      // um quadro de zeros.
      return { saida: null, erro: e instanceof Error ? e.message : String(e) };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    competencia, distribuicaoFecha, totalDeQuotas,
    acervo.contabil.total, acervo.itr.total, acervo.mercado.total,
    assinaturaDosDonatarios,
  ]);

  return {
    clienteId,
    carregando: bens.isLoading || pessoas.isLoading,
    erroDeConsulta: bens.error ?? pessoas.error ?? parentescos.error ?? socios.error ?? null,

    imoveis,
    acervo,
    bensForaDoAcervo,

    empresas,
    empresa,
    setEmpresaEscolhida,
    socios: socios.data ?? [],
    totalDeQuotas,

    candidatosDoador,
    doadorMarcado,
    alternarDoador: (pessoaId: string, valor: boolean) =>
      setDoadorOverride((o) => ({ ...o, [pessoaId]: valor })),
    doadores,

    candidatosDonatario,
    nomeDaPessoa: (pessoaId: string) => nomePorId.get(pessoaId) ?? pessoaId,
    donatarioMarcado: (pessoaId: string) => donatarioOverride[pessoaId] ?? true,
    alternarDonatario: (pessoaId: string, valor: boolean) =>
      setDonatarioOverride((o) => ({ ...o, [pessoaId]: valor })),
    donatarios,

    distribuicao,
    disponivelTotal,
    disponivelDistribuida,
    disponivelRestante,
    distribuicaoFecha,
    disponivelDigitada: (pessoaId: string) => disponivelPorDonatario[pessoaId] ?? '',
    setDisponivel: (pessoaId: string, valor: string) =>
      setDisponivelPorDonatario((o) => ({ ...o, [pessoaId]: valor })),
    setDoacaoAnterior: (pessoaId: string, valor: string) =>
      setDoacaoAnterior((o) => ({ ...o, [pessoaId]: valor })),

    competencia,
    setCompetencia,
    competencias,
    upfDoMesCorrenteAusente,
    competenciaDoMesCorrente,

    saida,
    erro,
  };
}

function paraImovelDoAcervo(b: BemComValores): ImovelDoAcervo {
  return {
    id: b.id,
    referencia: b.referencia_dp,
    denominacao: b.denominacao,
    valores: b.valores,
    // Único campo de ITR/IPTU que existe: `matricula.vlr_itr_iptu` não existe no
    // schema (CADASTRO-para-calculadora.md §3.1).
    vlr_itr_iptu: b.vlr_itr_iptu,
  };
}

/** Quotas digitadas pelo analista; vazio conta como zero distribuído. */
function inteiroOuZero(valor: string | undefined): bigint {
  const texto = (valor ?? '').trim();
  if (texto === '' || !/^\d+$/.test(texto)) return 0n;
  return BigInt(texto);
}

const mesCorrente = () => new Date().toISOString().slice(0, 7);

/**
 * A UPF aplicável é a do mês em que a simulação é feita (SPEC §3.1). Se o mês
 * corrente não tem UPF publicada, a tela abre na competência mais recente E
 * avisa — extrapolar a série é o erro que a especificação proíbe (§3.2).
 */
function competenciaInicial(): string {
  const disponiveis = competenciasDisponiveis();
  const corrente = mesCorrente();
  return disponiveis.includes(corrente) ? corrente : disponiveis[0];
}

export type CalculadoraItcmd = ReturnType<typeof useCalculadoraItcmdController>;
