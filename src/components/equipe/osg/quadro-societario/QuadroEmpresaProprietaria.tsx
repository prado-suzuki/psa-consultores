import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Calculator, Landmark, Loader2, Plus, TrendingUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIntegralizacoesAprovadas } from '@/hooks/useGeracaoDocumento';
import { useConstitutivosRegistrados } from '@/hooks/useDocumentoGerado';
import {
  useGravarAporteInicial,
  useMovimentosDaEmpresa,
  useQuadroDaEmpresa,
} from '@/hooks/useMovimentacaoQuotas';
import { contarImoveis, matriculasForaDoLivro, proporAportesIniciais } from '@/lib/osg/aporteInicial';
import { avaliarTravaDaSubida } from '@/lib/osg/travaDaSubida';
import { avaliarTravaDoIngresso } from '@/lib/osg/travaDoIngresso';
import { procedenciaDosMovimentos } from '@/lib/osg/projecaoQuadro';
import { capitalDeQuotas } from '@/lib/templates/capital';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import { AjudaSocietaria } from './AjudaSocietaria';
import { AtosSocietarios } from './AtosSocietarios';
import { AumentoDeCapitalDialog } from './AumentoDeCapitalDialog';
import { EscolherMovimentoDialog } from './EscolherMovimentoDialog';
import { GESTOS_DA_PROPRIETARIA, type GestoDaProprietaria } from './gestosSocietarios';
import { SubirQuotasDialog } from './SubirQuotasDialog';
import { fmtBRL, fmtInt } from './quadroFmt';
import { CabecalhoDoCard, cardDoQuadroCls, FaixaDeResumo } from './quadroKit';
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
  const [porta, setPorta] = useState(false);
  const [subirAberto, setSubirAberto] = useState(false);
  const [aumentoAberto, setAumentoAberto] = useState(false);

  const { data: matriculas = [], isLoading: carregandoBens } = useIntegralizacoesAprovadas(empresa.id);
  const { data: quadro = [], isLoading: carregandoQuadro } = useQuadroDaEmpresa(empresa.id);
  const { data: livro, isPending: carregandoLivro } = useMovimentosDaEmpresa(empresa.id);
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

  // Os bens que JÁ estão no capital: qualquer linha do livro desta empresa paga
  // com bem. É o critério do aumento, e ele se autocorrige sem depender de data —
  // cobre tanto o imóvel adquirido depois da constituição quanto o que ficou de
  // fora dela por atraso de matrícula (ver `matriculasForaDoLivro`).
  const bensNoLivro = useMemo(() => {
    const ids = new Set<string>();
    for (const m of livro?.movimentos ?? []) {
      if (m.pagamento.tipo === 'bem') ids.add(m.pagamento.bemId);
    }
    return ids;
  }, [livro]);
  // Só depois que o LIVRO chegou: com ele vazio por carregamento, `bensNoLivro`
  // sai vazio e todo imóvel da constituição pareceria estar fora do capital.
  const imoveisForaDoCapital = useMemo(
    () => (livro ? matriculasForaDoLivro(matriculas, bensNoLivro) : []),
    [livro, matriculas, bensNoLivro],
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

  const carregando = carregandoQuadro || carregandoBens;
  const travadoPorLegado = proposta.titularesLegados.length > 0;

  // A subida exige que esta Proprietária já exista na junta. A controladora é
  // conferida depois, no modal, porque é lá que ela é escolhida.
  const travaDaSubida = avaliarTravaDaSubida(
    [{ pessoaId: empresa.id, denominacao: empresa.denominacao }],
    constitutivosRegistrados ?? new Set<string>(),
  );

  // Os nomes que a frase do ingresso vai usar. Vêm das duas fontes que a tela já
  // tem: o quadro nomeia quem está nele, e as pessoas do cliente alcançam quem
  // entrou e saiu no mesmo par de lançamentos pendentes e por isso não aparece
  // no saldo.
  const nomePorPessoa = useMemo(() => {
    const nomes = new Map<string, string>();
    for (const p of pessoasCliente) if (p.denominacao) nomes.set(p.id, p.denominacao);
    for (const s of quadro) nomes.set(s.pessoaId, s.denominacao);
    return nomes;
  }, [pessoasCliente, quadro]);

  // E exige que ninguém tenha entrado no quadro por ato ainda não registrado:
  // a alteração que narrasse esta cessão descreveria esse sócio entrando e
  // saindo de uma vez (ver travaDoIngresso).
  const travaDoIngresso = useMemo(
    () => avaliarTravaDoIngresso(livro?.movimentos ?? [], empresa.id, nomePorPessoa),
    [livro, empresa.id, nomePorPessoa],
  );

  // A ordem das duas é a ordem do fluxo: sem sociedade na junta não há o que
  // perguntar sobre o quadro dela.
  const motivoDaSubida = travaDaSubida.motivo ?? travaDoIngresso.motivo;

  // As travas que a PR já tinha, agora ditas por extenso na porta em vez de
  // escondidas num `title` de botão desabilitado. Carregando não vira "não
  // pode": vira "ainda não sei".
  const indisponibilidadeDaPR: Partial<Record<GestoDaProprietaria, string | null>> = {
    aumento: carregandoBens || carregandoLivro
      ? 'Lendo os bens aprovados desta empresa.'
      : imoveisForaDoCapital.length === 0
        ? 'Nenhum imóvel aprovado fora do capital. O aumento em moeda corrente não passa por aqui.'
        : null,
    subida: carregandoRegistros || carregandoLivro
      ? 'Lendo o registro dos atos constitutivos.'
      : motivoDaSubida,
  };

  return (
    <div className="space-y-4">
      {!gravado && travadoPorLegado && (
        <div
          className="rounded-lg border border-warning/40 bg-warning/10 p-3 animate-osg-rise motion-reduce:animate-none"
          style={{ animationDelay: '150ms' }}
        >
          <div className="flex items-start gap-2 text-xs text-warning">
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
              <li key={nome} className="text-xs font-medium text-warning">
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
      {gravado && !carregandoRegistros && !carregandoLivro && motivoDaSubida && (
        <div
          className="rounded-lg border border-warning/40 bg-warning/10 p-3 animate-osg-rise motion-reduce:animate-none"
          style={{ animationDelay: '150ms' }}
        >
          <div className="flex items-start gap-2 text-xs text-warning">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{motivoDaSubida}</span>
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

      {/* O segundo estado da tela. Gravado o quadro, ela passa a mostrar o
          acumulado do livro e nunca mais olha o Diagnóstico Patrimonial — o que
          está certo para o capital e deixava o imóvel novo sem porta de entrada.
          Este é o gesto que a abre, e ele só existe quando há imóvel pendente:
          card sempre presente pediria atenção sem ter nada a dizer, e aumento
          puramente em dinheiro continua no movimento avulso. */}
      {gravado && !carregandoBens && !carregandoLivro && imoveisForaDoCapital.length > 0 && (
        <div
          className="flex flex-col gap-3 rounded-lg border border-osg-300/60 bg-osg-50/50 p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] animate-osg-rise motion-reduce:animate-none sm:flex-row sm:items-center sm:justify-between"
          style={{ animationDelay: '160ms' }}
        >
          <div className="flex items-start gap-2">
            <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-osg-moss" />
            <div className="text-xs text-foreground">
              <p className="text-sm font-semibold text-osg-700">
                {contarImoveis(imoveisForaDoCapital)} imóvel(is) aprovado(s) fora do capital
              </p>
              {/* O aviso informa; o gesto mora na porta única, junto do outro
                  que a PR tem. Um botão primário aqui e outro no cabeçalho
                  dariam dois comandos de registro na mesma tela. */}
              <p className="mt-0.5">
                Aprovados no Diagnóstico Patrimonial depois da constituição, eles ainda não
                entraram no capital desta empresa. O aumento está em Registrar movimento, para que
                a próxima alteração contratual o publique.
              </p>
            </div>
          </div>
        </div>
      )}

      <Card
        className={cn(cardDoQuadroCls, 'animate-osg-rise motion-reduce:animate-none')}
        style={{ animationDelay: '180ms' }}
      >
        <CabecalhoDoCard
          icone={<Users className="h-4 w-4 text-muted-foreground" />}
          titulo={`${gravado ? 'Lista de Sócios' : 'Quadro proposto'} (${linhas.length})`}
          acoes={
            gravado ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-osg-50 px-2 py-1.5 text-[11px] font-semibold text-osg-700">
                  <Landmark className="h-3.5 w-3.5" />
                  Quadro registrado
                </span>
                {/* UM comando, com o catálogo da PR: o aumento por
                    integralização e a subida das quotas, cada um com a trava
                    que já tinha. Os seis gestos da Controladora NÃO aparecem
                    aqui: a PR nunca os ofereceu, e reunir as entradas não é
                    criar capacidade nova. */}
                <Button
                  size="sm"
                  className="h-9 gap-1.5 bg-osg-moss text-white hover:bg-osg-moss/90"
                  onClick={() => setPorta(true)}
                >
                  <Plus className="h-3.5 w-3.5" /> Registrar movimento
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-warning/10 px-2 py-1.5 text-[11px] font-semibold text-warning">
                  <Calculator className="h-3.5 w-3.5" />
                  Proposta não gravada
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
            )
          }
          apoio={
            <FaixaDeResumo
              itens={[
                { rotulo: 'Capital social', valor: fmtBRL.format(capital) },
                { rotulo: 'Quotas', valor: fmtInt.format(totalQuotas) },
                // Quota a R$ 1,00 por definição na PR — não é capital ÷ quotas.
                {
                  rotulo: 'Valor nominal',
                  valor: fmtBRL.format(1),
                  ajuda: <AjudaSocietaria chave="valorNominal" rotulo="valor nominal" />,
                },
              ]}
              nota={
                gravado
                  ? 'Saldo apurado da movimentação de quotas.'
                  : 'Proposta calculada dos bens aprovados no Diagnóstico Patrimonial, rateada pelas frações de titularidade. Confira e grave: nada existe no cadastro até então.'
              }
            />
          }
        />
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

      <EscolherMovimentoDialog
        open={porta}
        empresa={empresa}
        opcoes={GESTOS_DA_PROPRIETARIA}
        indisponibilidade={indisponibilidadeDaPR}
        onEscolher={(escolhido: GestoDaProprietaria) => {
          setPorta(false);
          if (escolhido === 'aumento') setAumentoAberto(true);
          else setSubirAberto(true);
        }}
        onClose={() => setPorta(false)}
      />

      <AumentoDeCapitalDialog
        open={aumentoAberto}
        onOpenChange={setAumentoAberto}
        empresa={empresa}
        matriculas={matriculas}
        bensNoLivro={bensNoLivro}
        quadro={quadro}
      />

      <SubirQuotasDialog
        open={subirAberto}
        onOpenChange={setSubirAberto}
        proprietaria={empresa}
        quadro={quadro}
        controladoras={controladoras}
        travaDoIngresso={travaDoIngresso}
      />
    </div>
  );
};
