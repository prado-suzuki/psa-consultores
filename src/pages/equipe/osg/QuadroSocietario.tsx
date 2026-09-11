import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, PieChart } from 'lucide-react';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { osgTabsListCls, osgTabTriggerCls } from '@/components/equipe/osg/formKit';
import { usePessoasByCliente, type PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import { QuadroEmpresaControladora } from '@/components/equipe/osg/quadro-societario/QuadroEmpresaControladora';
import { QuadroEmpresaProprietaria } from '@/components/equipe/osg/quadro-societario/QuadroEmpresaProprietaria';

// Só PJs Proprietária (PR) e Controladora (CN) têm quadro societário nesta tela.
const TIPOS_EMPRESA_ELEGIVEIS = ['PR', 'CN'] as const;
const TIPO_EMPRESA_LABELS: Record<string, string> = {
  PR: 'Proprietária',
  CN: 'Controladora',
};

// Quadro societário de uma empresa. Nos dois casos ele é o mesmo objeto, o
// acumulado dos movimentos de quota (`v_quadro_societario`), e o que muda é o
// que a tela oferece: a Proprietária (PR) ainda sem movimentação PROPÕE o quadro
// de constituição, calculado dos bens; as demais registram movimento.
//
// As duas NÃO têm o mesmo catálogo de gestos: a PR nunca montou os três botões
// da CN, e igualá-las aqui criaria capacidade nova por acidente.
const QuadroEmpresa = ({ empresa, pessoasCliente }: {
  empresa: PessoaRow;
  pessoasCliente: PessoaRow[];
}) => {
  if (empresa.tipo_empresa === 'PR') {
    return <QuadroEmpresaProprietaria empresa={empresa} pessoasCliente={pessoasCliente} />;
  }
  return <QuadroEmpresaControladora empresa={empresa} pessoasCliente={pessoasCliente} />;
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
