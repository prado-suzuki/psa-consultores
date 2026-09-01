import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeftRight, Building2, ChartPie, Landmark, PieChart, Plus, Tag, Users } from 'lucide-react';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { useCountUp } from '@/hooks/useCountUp';
import { osgTabsListCls, osgTabTriggerCls } from '@/components/equipe/osg/formKit';
import { usePessoasByCliente, type PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import { useMovimentosDaEmpresa, useQuadroDaEmpresa } from '@/hooks/useMovimentacaoQuotas';
import { procedenciaDosMovimentos } from '@/lib/osg/projecaoQuadro';
import { AtosSocietarios } from '@/components/equipe/osg/quadro-societario/AtosSocietarios';
import { MovimentoModal } from '@/components/equipe/osg/quadro-societario/MovimentoModal';
import { QuadroEmpresaProprietaria } from '@/components/equipe/osg/quadro-societario/QuadroEmpresaProprietaria';
import { TabelaSocios, type LinhaSocio } from '@/components/equipe/osg/quadro-societario/TabelaSocios';
import { fmtBRL, fmtInt } from '@/components/equipe/osg/quadro-societario/quadroFmt';
import { KpiCard } from '@/components/equipe/osg/quadro-societario/quadroKit';

// Só PJs Proprietária (PR) e Controladora (CN) têm quadro societário nesta tela.
const TIPOS_EMPRESA_ELEGIVEIS = ['PR', 'CN'] as const;
const TIPO_EMPRESA_LABELS: Record<string, string> = {
  PR: 'Proprietária',
  CN: 'Controladora',
};

interface QuadroEmpresaProps {
  empresa: PessoaRow;
  pessoasCliente: PessoaRow[];
}

// Quadro societário de uma empresa. Nos dois casos ele é o mesmo objeto, o
// acumulado dos movimentos de quota (`v_quadro_societario`), e o que muda é o
// que a tela oferece: a Proprietária (PR) ainda sem movimentação PROPÕE o quadro
// de constituição, calculado dos bens; as demais registram movimento.
const QuadroEmpresa = ({ empresa, pessoasCliente }: QuadroEmpresaProps) => {
  if (empresa.tipo_empresa === 'PR') {
    return <QuadroEmpresaProprietaria empresa={empresa} pessoasCliente={pessoasCliente} />;
  }
  return <QuadroEmpresaManual empresa={empresa} pessoasCliente={pessoasCliente} />;
};

/**
 * Quadro societário da Controladora (CN) e demais: o saldo, e o gesto de
 * registrar o movimento que o muda.
 *
 * Antes daqui a tela era um CRUD da tabela `quadro_societario`: "vincular sócio"
 * inseria uma linha, o lápis editava quotas e valor, e a lixeira fazia DELETE
 * físico. O quadro só sabia o estado de hoje, e o de ontem era apagado: a
 * cessão de quotas, que é o fato que a alteração contratual descreve, não tinha
 * como ser expressa. Agora cada gesto é um movimento no livro (aporte, cessão,
 * doação, redução) e o saldo é consequência: não há o que editar numa soma, e
 * remover sócio é registrar para quem as quotas foram.
 *
 * O corpo da tabela é o SALDO, com a procedência de cada linha ao lado do nome
 * (constituição, ou o ato que a produziu). Abrir o histórico completo dos
 * movimentos como painel próprio segue sendo decisão aberta do Bernardo, e a
 * tela não a antecipa.
 */
const QuadroEmpresaManual = ({ empresa, pessoasCliente }: QuadroEmpresaProps) => {
  const navigate = useNavigate();
  const [movimento, setMovimento] = useState<{ open: boolean; origem: string | null }>({
    open: false, origem: null,
  });

  const { data: quadro = [], isLoading } = useQuadroDaEmpresa(empresa.id);
  const { data: livro } = useMovimentosDaEmpresa(empresa.id);

  const totalQuotas = quadro.reduce((acc, s) => acc + s.quotas, 0);
  const capitalTotal = quadro.reduce((acc, s) => acc + s.vlrTotal, 0);
  const valorNominal = totalQuotas > 0 ? capitalTotal / totalQuotas : null;

  // Count-up dos KPIs: conta de 0 ao valor na montagem (e a troca de empresa
  // remonta o componente via key, reiniciando a contagem).
  const capitalAnimado = useCountUp(capitalTotal);
  const quotasAnimadas = useCountUp(totalQuotas);
  const nominalAnimado = useCountUp(valorNominal ?? 0);

  // De onde vem o saldo de cada sócio: "Constituição", ou o ato que o produziu.
  const procedencia = useMemo(
    () => procedenciaDosMovimentos(livro?.movimentos ?? [], empresa.id, livro?.atos ?? []),
    [livro, empresa.id],
  );

  const linhas = useMemo<LinhaSocio[]>(
    () => quadro.map((s) => ({
      pessoaId: s.pessoaId,
      denominacao: s.denominacao,
      tipoPessoa: s.tipoPessoa,
      cpfCnpj: s.cpfCnpj,
      quotas: s.quotas,
      valor: s.vlrTotal,
      percentual: totalQuotas > 0 ? (s.quotas / totalQuotas) * 100 : 0,
      procedencia: [...new Set(s.movimentoIds.map((id) => procedencia.get(id)).filter(Boolean))] as string[],
    })),
    [quadro, totalQuotas, procedencia],
  );

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
        <KpiCard
          delay={120}
          icone={<Tag className="h-4 w-4" />}
          titulo="Valor Nominal"
          valor={valorNominal != null ? fmtBRL.format(nominalAnimado) : '—'}
        />
      </div>

      <Card
        className="animate-osg-rise motion-reduce:animate-none"
        style={{ animationDelay: '180ms' }}
      >
        <CardHeader className="pb-3 space-y-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Lista de Sócios ({quadro.length})
            </CardTitle>
            <Button
              size="sm"
              className="gap-1.5 bg-osg-moss text-white hover:bg-osg-moss/90"
              onClick={() => setMovimento({ open: true, origem: null })}
            >
              <Plus className="h-3.5 w-3.5" /> Registrar movimento
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            O quadro é o acumulado dos movimentos de quota desta empresa: aporte, cessão, doação e
            redução. Para alterá-lo, registre o movimento que aconteceu.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
          ) : (
            <TabelaSocios
              linhas={linhas}
              totalQuotas={totalQuotas}
              capital={capitalTotal}
              acaoDoSocio={(l) => (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  title="Movimentar as quotas deste sócio"
                  onClick={() => setMovimento({ open: true, origem: l.pessoaId })}
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                </Button>
              )}
              vazio={
                <div className="py-8 text-center text-muted-foreground">
                  <p className="text-sm mb-4">
                    Nenhum sócio nesta empresa. O quadro começa com o aporte de constituição:
                    registre quem entrou e com quantas quotas.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/equipe/osg/work/qualificacao-das-partes')}
                  >
                    Ir para Qualificação das Partes
                  </Button>
                </div>
              }
            />
          )}
        </CardContent>
      </Card>

      <AtosSocietarios movimentos={livro?.movimentos ?? []} atos={livro?.atos ?? []} />

      <MovimentoModal
        open={movimento.open}
        empresa={empresa}
        quadro={quadro}
        pessoasCliente={pessoasCliente}
        origemInicial={movimento.origem}
        onClose={() => setMovimento({ open: false, origem: null })}
      />
    </div>
  );
};

const QuadroSocietario = () => {
  const { clienteId } = useOsgWork();
  const navigate = useNavigate();
  const [empresaSel, setEmpresaSel] = useState<string | null>(null);

  const { data: pessoas = [], isLoading } = usePessoasByCliente(clienteId || null);

  // Controladoras primeiro, depois Proprietárias; ordem alfabética dentro do tipo.
  const empresas = useMemo(
    () =>
      pessoas
        .filter(
          (p) =>
            p.tipo_pessoa === 'PJ' &&
            (TIPOS_EMPRESA_ELEGIVEIS as readonly string[]).includes(p.tipo_empresa ?? ''),
        )
        .sort(
          (a, b) =>
            (a.tipo_empresa === 'CN' ? 0 : 1) - (b.tipo_empresa === 'CN' ? 0 : 1) ||
            (a.denominacao ?? '').localeCompare(b.denominacao ?? ''),
        ),
    [pessoas],
  );

  // Seleção efetiva: a escolhida (se ainda existe) ou a primeira da lista —
  // que, pela ordenação, é uma CN quando houver. Sem useEffect: a derivação
  // já cobre troca de cliente e exclusão da empresa selecionada.
  const empresaAtiva =
    empresas.find((e) => e.id === empresaSel) ?? empresas[0] ?? null;

  return (
    <OsgLayout
      title="Quadro Societário"
      subtitle="Distribuição de quotas e participação dos sócios por empresa"
    >
      <div className="space-y-4">
        {!clienteId ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <PieChart className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Selecione um cliente na barra acima para visualizar e gerenciar o quadro societário.</p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p className="text-sm">Carregando...</p>
            </CardContent>
          </Card>
        ) : empresas.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm mb-4">
                Este cliente não possui empresas Proprietária (PR) ou Controladora (CN) cadastradas.
              </p>
              <Button
                variant="outline"
                onClick={() => navigate('/equipe/osg/work/qualificacao-das-partes')}
              >
                Ir para Qualificação das Partes
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Tabs value={empresaAtiva!.id} onValueChange={setEmpresaSel}>
              <TabsList className={osgTabsListCls}>
                {empresas.map((e) => (
                  <TabsTrigger key={e.id} value={e.id} className={osgTabTriggerCls}>
                    <span className="flex items-center gap-2">
                      {e.denominacao}
                      <span className="rounded-md bg-osg-100 px-1.5 py-0.5 text-[10px] font-semibold text-osg-700">
                        {TIPO_EMPRESA_LABELS[e.tipo_empresa ?? ''] ?? e.tipo_empresa}
                      </span>
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {empresaAtiva && (
              <QuadroEmpresa
                key={empresaAtiva.id}
                empresa={empresaAtiva}
                pessoasCliente={pessoas}
              />
            )}
          </>
        )}
      </div>
    </OsgLayout>
  );
};

export default QuadroSocietario;
