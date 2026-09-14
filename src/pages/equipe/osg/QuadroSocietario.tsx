import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { TELAS_OSG_WORK } from '@/lib/navegacaoOsgWork';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, PieChart } from 'lucide-react';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { usePessoasByCliente, type PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import { BarraDeEmpresas } from '@/components/equipe/osg/quadro-societario/BarraDeEmpresas';
import { cardDoQuadroCls } from '@/components/equipe/osg/quadro-societario/quadroKit';
import { QuadroEmpresaControladora } from '@/components/equipe/osg/quadro-societario/QuadroEmpresaControladora';
import { QuadroEmpresaProprietaria } from '@/components/equipe/osg/quadro-societario/QuadroEmpresaProprietaria';
import { cn } from '@/lib/utils';

// Só PJs Proprietária (PR) e Controladora (CN) têm quadro societário nesta tela.
const TIPOS_EMPRESA_ELEGIVEIS = ['PR', 'CN'] as const;

/**
 * O card de quando não há quadro a mostrar — sem cliente, ou sem empresa
 * elegível. O ícone vem dentro de um disco bege com um halo que pulsa devagar:
 * a tela vazia continua sendo a tela vazia, mas deixa de ser um retângulo de
 * canvas com uma frase solta no meio.
 */
const CardDeEspera = ({ icone, children }: { icone: ReactNode; children: ReactNode }) => (
  <Card className={cn(cardDoQuadroCls, 'animate-osg-rise motion-reduce:animate-none')}>
    <CardContent className="flex flex-col items-center px-6 py-14 text-center text-muted-foreground">
      <span className="relative mb-4 flex h-16 w-16 items-center justify-center">
        <span
          aria-hidden
          className="absolute inset-0 animate-ping rounded-full bg-osg-100/60 [animation-duration:3.5s] motion-reduce:animate-none"
        />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full border border-osg-200/70 bg-osg-50 text-osg-moss">
          {icone}
        </span>
      </span>
      {children}
    </CardContent>
  </Card>
);

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
      title={TELAS_OSG_WORK.quadroSocietario.label}
      subtitle={TELAS_OSG_WORK.quadroSocietario.descricao}
    >
      <div className="space-y-4">
        {!clienteId ? (
          <CardDeEspera icone={<PieChart className="h-7 w-7" />}>
            <p className="max-w-md text-sm">
              Selecione um cliente na barra acima para visualizar e gerenciar o quadro societário.
            </p>
          </CardDeEspera>
        ) : isLoading ? (
          <CardDeEspera icone={<Building2 className="h-7 w-7 animate-pulse" />}>
            <p className="text-sm">Carregando as empresas deste cliente...</p>
          </CardDeEspera>
        ) : empresas.length === 0 ? (
          <CardDeEspera icone={<Building2 className="h-7 w-7" />}>
            <p className="mb-4 max-w-md text-sm">
              Este cliente não possui empresas Proprietária (PR) ou Controladora (CN) cadastradas.
            </p>
            <Button
              variant="outline"
              onClick={() => navigate('/equipe/osg/work/qualificacao-das-partes')}
            >
              Ir para Qualificação das Partes
            </Button>
          </CardDeEspera>
        ) : (
          <>
            <div className="animate-osg-rise motion-reduce:animate-none">
              <BarraDeEmpresas
                empresas={empresas}
                ativa={empresaAtiva!.id}
                onEscolher={setEmpresaSel}
              />
            </div>

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
