import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, ArrowUpFromLine, Calculator, ChartPie, Landmark, Loader2, Tag, Users } from 'lucide-react';
import { useCountUp } from '@/hooks/useCountUp';
import { useIntegralizacoesAprovadas } from '@/hooks/useGeracaoDocumento';
import { useConstitutivosRegistrados } from '@/hooks/useDocumentoGerado';
import {
  useGravarAporteInicial,
  useMovimentosDaEmpresa,
  useQuadroDaEmpresa,
} from '@/hooks/useMovimentacaoQuotas';
import { proporAportesIniciais } from '@/lib/osg/aporteInicial';
import { avaliarTravaDaSubida } from '@/lib/osg/travaDaSubida';
import { procedenciaDosMovimentos } from '@/lib/osg/projecaoQuadro';
import { capitalDeQuotas } from '@/lib/templates/capital';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import { AtosSocietarios } from './AtosSocietarios';
import { SubirQuotasDialog } from './SubirQuotasDialog';
import { fmtBRL, fmtInt } from './quadroFmt';
import { KpiCard } from './quadroKit';
import { TabelaSocios, type LinhaSocio } from './TabelaSocios';

interface QuadroEmpresaProprietariaProps {
  empresa: PessoaRow;
  /** Pessoas do cliente: de onde saem as candidatas a controladora. */
  pessoasCliente: PessoaRow[];
}

/**
 * Quadro societário da empresa Proprietária (PR), em dois estados.
 *
 * **Sem movimentação gravada:** a tela PROPÕE o quadro de constituição,
 * calculado dos bens aprovados para integralização com destino a esta empresa,
 * rateado pela fração de titularidade das matrículas. É proposta, não quadro:
 * nada existe no banco até o consultor gravar.
 *
 * **Com movimentação gravada:** a tela mostra o quadro de verdade, que é o
 * acumulado dos movimentos de quota (`v_quadro_societario`). Daí em diante o
 * quadro não segue mais o Diagnóstico Patrimonial: corrigir o valor contábil de
 * um bem não mexe no capital sozinho, porque capital registrado só muda por
 * alteração contratual. O aviso de variável alterada, na tela Gerar, é quem
 * chama a atenção para a divergência.
 *
 * Antes disto a tela era derivada em caráter permanente e não gravava nada, e o
 * quadro da PR só existia em memória. Isso respondia "quem entrou com o quê",
 * não "quem tem quantas quotas hoje" — as duas coisas coincidem na constituição
 * e divergem na primeira cessão.
 */
export const QuadroEmpresaProprietaria = ({ empresa, pessoasCliente }: QuadroEmpresaProprietariaProps) => {
  const navigate = useNavigate();
  const [subirAberto, setSubirAberto] = useState(false);

  const { data: matriculas = [], isLoading: carregandoBens } = useIntegralizacoesAprovadas(empresa.id);
  const { data: quadro = [], isLoading: carregandoQuadro } = useQuadroDaEmpresa(empresa.id);
  const { data: livro } = useMovimentosDaEmpresa(empresa.id);
  const { data: constitutivosRegistrados, isLoading: carregandoRegistros } =
    useConstitutivosRegistrados(empresa.cliente_id ?? null);
  const gravar = useGravarAporteInicial();

  const proposta = useMemo(() => proporAportesIniciais(matriculas), [matriculas]);
  const gravado = quadro.length > 0;

  const controladoras = useMemo(
    () => pessoasCliente.filter((p) => p.tipo_pessoa === 'PJ' && p.tipo_empresa === 'CN'),
    [pessoasCliente],
  );
  // De onde vem o saldo de cada sócio: "Constituição", ou o ato que o produziu.
  const procedencia = useMemo(
    () => procedenciaDosMovimentos(livro?.movimentos ?? [], empresa.id, livro?.atos ?? []),
    [livro, empresa.id],
  );

  // A tabela é a mesma nos dois estados; muda a origem das linhas.
  const linhas = useMemo<LinhaSocio[]>(() => {
    if (gravado) {
      const total = quadro.reduce((s, l) => s + l.quotas, 0);
      return quadro.map((l) => ({
        pessoaId: l.pessoaId,
        denominacao: l.denominacao,
        tipoPessoa: l.tipoPessoa,
        cpfCnpj: l.cpfCnpj,
        quotas: l.quotas,
        valor: l.vlrTotal,
        percentual: total > 0 ? (l.quotas / total) * 100 : 0,
        procedencia: [...new Set(l.movimentoIds.map((id) => procedencia.get(id)).filter(Boolean))] as string[],
      }));
    }
    // Proposta: um aporte por (sócio, bem) agregado de volta por sócio, na
    // ordem em que os movimentos serão gravados.
    const porPessoa = new Map<string, LinhaSocio>();
    for (const a of proposta.aportes) {
      const atual = porPessoa.get(a.pessoaId);
      if (atual) {
        atual.quotas += a.quotas;
        atual.valor += a.valor;
      } else {
        porPessoa.set(a.pessoaId, {
          pessoaId: a.pessoaId,
          denominacao: a.denominacao,
          tipoPessoa: null,
          cpfCnpj: null,
          quotas: a.quotas,
          valor: a.valor,
          percentual: 0,
        });
      }
    }
    const linhasProposta = [...porPessoa.values()];
    const total = linhasProposta.reduce((s, l) => s + l.quotas, 0);
    for (const l of linhasProposta) l.percentual = total > 0 ? (l.quotas / total) * 100 : 0;
    return linhasProposta;
  }, [gravado, quadro, proposta.aportes, procedencia]);

  const totalQuotas = linhas.reduce((s, l) => s + l.quotas, 0);
  const capital = gravado ? linhas.reduce((s, l) => s + l.valor, 0) : capitalDeQuotas(totalQuotas);

  // Count-up dos KPIs: conta de 0 ao valor na montagem (e a troca de empresa
  // remonta o componente via key, reiniciando a contagem).
  const capitalAnimado = useCountUp(capital);
  const quotasAnimadas = useCountUp(totalQuotas);

  const carregando = carregandoQuadro || carregandoBens;
  const travadoPorLegado = proposta.titularesLegados.length > 0;

  // A subida exige que esta Proprietária já exista na junta. A controladora é
  // conferida depois, no modal, porque é lá que ela é escolhida.
  const travaDaSubida = avaliarTravaDaSubida(
    [{ pessoaId: empresa.id, denominacao: empresa.denominacao }],
    constitutivosRegistrados ?? new Set<string>(),
  );
  const subidaLiberada = !carregandoRegistros && travaDaSubida.liberado;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          destaque
          icone={<Landmark className="h-4 w-4" />}
          titulo="Capital Social Total"
          valor={fmtBRL.format(capitalAnimado)}
        />
        <KpiCard
          delay={60}
          icone={<ChartPie className="h-4 w-4" />}
          titulo="Total de Quotas"
          valor={fmtInt.format(Math.round(quotasAnimadas))}
        />
        {/* Quota a R$ 1,00 por definição na PR — não é capital ÷ quotas. */}
        <KpiCard
          delay={120}
          icone={<Tag className="h-4 w-4" />}
          titulo="Valor Nominal"
          valor={fmtBRL.format(1)}
        />
      </div>

      {!gravado && travadoPorLegado && (
        <div
          className="rounded-lg border border-amber-300 bg-amber-50/60 p-3 animate-osg-rise motion-reduce:animate-none"
          style={{ animationDelay: '150ms' }}
        >
          <div className="flex items-start gap-2 text-xs text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              O quadro não pode ser gravado enquanto houver titular sem pessoa cadastrada:
              o sócio precisa existir no cadastro para receber as quotas. Cadastre e vincule{' '}
              {proposta.titularesLegados.length === 1 ? 'o titular' : 'os titulares'} abaixo na
              titularidade da matrícula, no Diagnóstico Patrimonial.
            </span>
          </div>
          <ul className="mt-2 space-y-1">
            {proposta.titularesLegados.map((nome) => (
              <li key={nome} className="text-xs font-medium text-amber-900">
                {nome}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Mesmo lugar e mesmo desenho do aviso de titular sem cadastro logo
          acima: é a segunda razão pela qual o quadro não anda, e o consultor
          lê as duas na mesma moldura. O botão fica visível e travado, e não
          escondido: escondê-lo faria procurar um gesto que existe. */}
      {gravado && !carregandoRegistros && !travaDaSubida.liberado && (
        <div
          className="rounded-lg border border-amber-300 bg-amber-50/60 p-3 animate-osg-rise motion-reduce:animate-none"
          style={{ animationDelay: '150ms' }}
        >
          <div className="flex items-start gap-2 text-xs text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{travaDaSubida.motivo}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 h-8 text-xs"
            onClick={() => navigate('/equipe/osg/work/gerar-documento')}
          >
            Ir para Gerar Documento
          </Button>
        </div>
      )}

      <Card
        className="animate-osg-rise motion-reduce:animate-none"
        style={{ animationDelay: '180ms' }}
      >
        <CardHeader className="pb-3 space-y-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-500" />
              {gravado ? 'Lista de Sócios' : 'Quadro proposto'} ({linhas.length})
            </CardTitle>
            {gravado ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-osg-50 px-2 py-1.5 text-[11px] font-semibold text-osg-700">
                  <Landmark className="h-3.5 w-3.5" />
                  Quadro registrado, apurado da movimentação de quotas
                </span>
                {/* O macro da subida: um gesto, o par espelhado nas duas
                    empresas. Só faz sentido com quadro gravado, porque é o
                    quadro que diz quem sobe e com quanto, e só depois que a
                    sociedade existe na junta, porque é o registro que a faz
                    existir perante terceiros (ver travaDaSubida). */}
                <Button
                  size="sm"
                  className="h-9 gap-1.5 bg-osg-moss text-white hover:bg-osg-moss/90"
                  onClick={() => setSubirAberto(true)}
                  disabled={!subidaLiberada}
                  title={travaDaSubida.motivo ?? undefined}
                >
                  <ArrowUpFromLine className="h-3.5 w-3.5" />
                  Transferir quotas para a controladora
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1.5 text-[11px] font-semibold text-amber-800">
                  <Calculator className="h-3.5 w-3.5" />
                  Ainda não gravado
                </span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      className="h-9"
                      disabled={travadoPorLegado || linhas.length === 0 || gravar.isPending}
                    >
                      {gravar.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                      Gravar quadro societário
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Gravar o quadro de constituição</AlertDialogTitle>
                      <AlertDialogDescription>
                        {linhas.length} sócio(s) e {fmtInt.format(totalQuotas)} quotas
                        ({fmtBRL.format(capital)}) entram como aporte de constituição de{' '}
                        {empresa.denominacao}, um movimento por bem integralizado.
                        <br />
                        <br />
                        A partir daí o quadro passa a ser o registrado, e deixa de acompanhar
                        sozinho o Diagnóstico Patrimonial: mudar o valor de um bem não muda mais o
                        capital, como acontece na sociedade de verdade.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() =>
                          gravar.mutate({
                            clienteId: empresa.cliente_id!,
                            empresaPessoaId: empresa.id,
                            aportes: proposta.aportes,
                          })}
                      >
                        Gravar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {gravado
              ? 'O quadro é o acumulado dos movimentos de quota desta empresa: aporte, cessão, doação e redução. Para alterá-lo, registre o movimento que aconteceu.'
              : 'Proposta calculada dos bens aprovados no Diagnóstico Patrimonial, rateada pelas frações de titularidade. Confira e grave: nada existe no cadastro até então.'}
          </p>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
          ) : (
            <TabelaSocios
              linhas={linhas}
              totalQuotas={totalQuotas}
              capital={capital}
              vazio={
                <div className="py-8 text-center text-muted-foreground">
                  <p className="text-sm mb-4">
                    {travadoPorLegado
                      ? 'A proposta fica em branco enquanto houver titular sem pessoa cadastrada.'
                      : 'Nenhum bem aprovado para integralização com destino a esta empresa.'}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/equipe/osg/work/diagnostico-patrimonial')}
                  >
                    Ir para o Diagnóstico Patrimonial
                  </Button>
                </div>
              }
            />
          )}
        </CardContent>
      </Card>

      <AtosSocietarios movimentos={livro?.movimentos ?? []} atos={livro?.atos ?? []} />

      <SubirQuotasDialog
        open={subirAberto}
        onOpenChange={setSubirAberto}
        proprietaria={empresa}
        quadro={quadro}
        controladoras={controladoras}
      />
    </div>
  );
};
