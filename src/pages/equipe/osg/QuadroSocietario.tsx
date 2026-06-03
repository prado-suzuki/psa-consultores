import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Building2, ChartPie, Landmark, Pencil, PieChart, Plus, Search, Tag, Trash2, Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { rowActivateProps } from '@/hooks/rowActivateProps';
import { useCountUp } from '@/hooks/useCountUp';
import { osgTabsListCls, osgTabTriggerCls } from '@/components/equipe/osg/formKit';
import { usePessoasByCliente, type PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import {
  useDeleteSocio,
  useQuadroSocietarioByEmpresa,
  type SocioEnriched,
} from '@/hooks/useQuadroSocietario';
import { SocioModal } from '@/components/equipe/osg/quadro-societario/SocioModal';

// Só PJs Proprietária (PR) e Controladora (CN) têm quadro societário nesta tela.
const TIPOS_EMPRESA_ELEGIVEIS = ['PR', 'CN'] as const;
const TIPO_EMPRESA_LABELS: Record<string, string> = {
  PR: 'Proprietária',
  CN: 'Controladora',
};

const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtInt = new Intl.NumberFormat('pt-BR');
const fmtPct = (v: number) =>
  `${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

// Iniciais para o avatar do sócio (duas primeiras palavras, ex.: "AB").
const iniciais = (denominacao: string) =>
  denominacao
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '—';

interface KpiCardProps {
  icone: React.ReactNode;
  titulo: string;
  valor: string;
  destaque?: boolean;
  // Atraso da entrada (ms) — cascata: KPIs primeiro, tabela depois.
  delay?: number;
}

// Cartão indicador no topo: o primeiro (Capital Social Total) ganha fundo
// verde-musgo de destaque, os demais ficam na superfície padrão.
const KpiCard = ({ icone, titulo, valor, destaque, delay = 0 }: KpiCardProps) => (
  <Card
    className={cn(
      'animate-osg-rise motion-reduce:animate-none',
      destaque && 'border-osg-moss bg-osg-moss text-white',
    )}
    style={{ animationDelay: `${delay}ms` }}
  >
    <CardContent className="p-4">
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
            destaque ? 'bg-white/15 text-white' : 'bg-osg-100 text-osg-600',
          )}
        >
          {icone}
        </div>
        <p
          className={cn(
            'text-[11px] font-bold uppercase tracking-[0.14em]',
            destaque ? 'text-white/80' : 'text-slate-500',
          )}
        >
          {titulo}
        </p>
      </div>
      <p className={cn('mt-4 text-xl font-bold tabular-nums', destaque ? 'text-white' : 'text-osg-700')}>
        {valor}
      </p>
    </CardContent>
  </Card>
);

interface QuadroEmpresaProps {
  empresa: PessoaRow;
  pessoasCliente: PessoaRow[];
}

// Quadro societário de uma empresa: KPIs + lista de sócios com participação
// derivada de quotas/Σquotas (percentual e data_referencia não são usados).
const QuadroEmpresa = ({ empresa, pessoasCliente }: QuadroEmpresaProps) => {
  const [busca, setBusca] = useState('');
  const [socioModal, setSocioModal] = useState<{ open: boolean; socio: SocioEnriched | null }>({
    open: false, socio: null,
  });

  const { data: socios = [], isLoading } = useQuadroSocietarioByEmpresa(empresa.id);
  const deleteSocio = useDeleteSocio();

  const totalQuotas = socios.reduce((acc, s) => acc + (s.quotas ?? 0), 0);
  const capitalTotal = socios.reduce((acc, s) => acc + (s.vlr_total ?? 0), 0);
  const valorNominal = totalQuotas > 0 ? capitalTotal / totalQuotas : null;

  // Count-up dos KPIs: conta de 0 ao valor na montagem (e a troca de empresa
  // remonta o componente via key, reiniciando a contagem).
  const capitalAnimado = useCountUp(capitalTotal);
  const quotasAnimadas = useCountUp(totalQuotas);
  const nominalAnimado = useCountUp(valorNominal ?? 0);

  const sociosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return socios;
    return socios.filter(
      (s) =>
        s.socio_denominacao.toLowerCase().includes(q) ||
        (s.socio_cpf_cnpj ?? '').toLowerCase().includes(q),
    );
  }, [socios, busca]);

  const buscaAtiva = busca.trim().length > 0;
  const participacao = (s: SocioEnriched) =>
    totalQuotas > 0 && s.quotas != null ? (s.quotas / totalQuotas) * 100 : null;

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
        <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0 gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" />
            Lista de Sócios ({socios.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar sócio..."
                className="h-9 pl-8 w-56"
              />
            </div>
            <Button
              size="sm"
              className="gap-1.5 bg-osg-moss text-white hover:bg-osg-moss/90"
              onClick={() => setSocioModal({ open: true, socio: null })}
            >
              <Plus className="h-3.5 w-3.5" /> Vincular Sócio
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
          ) : sociosFiltrados.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {buscaAtiva
                ? 'Nenhum sócio encontrado.'
                : 'Nenhum sócio vinculado a esta empresa.'}
            </p>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sócio</TableHead>
                    <TableHead className="text-right">Quotas</TableHead>
                    <TableHead className="text-right">Valor (R$)</TableHead>
                    <TableHead className="w-44">Participação</TableHead>
                    <TableHead className="w-24 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sociosFiltrados.map((s, i) => {
                    const pct = participacao(s);
                    // Stagger limitado: depois da 15ª linha entram todas juntas.
                    const delay = Math.min(i, 15) * 30;
                    return (
                      <TableRow
                        key={s.id}
                        className="animate-osg-rise motion-reduce:animate-none"
                        style={{ animationDelay: `${delay}ms` }}
                        {...rowActivateProps(() => setSocioModal({ open: true, socio: s }))}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-md bg-osg-100 flex items-center justify-center shrink-0 text-[11px] font-bold text-osg-700">
                              {iniciais(s.socio_denominacao)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{s.socio_denominacao}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {s.socio_tipo_pessoa ?? '—'}{s.socio_cpf_cnpj ? ` · ${s.socio_cpf_cnpj}` : ''}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {s.quotas != null ? fmtInt.format(s.quotas) : '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {s.vlr_total != null ? fmtBRL.format(s.vlr_total) : '—'}
                        </TableCell>
                        <TableCell>
                          {pct != null ? (
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 rounded-full bg-osg-100 overflow-hidden shrink-0">
                                <div
                                  className="h-full rounded-full bg-osg-moss origin-left animate-osg-bar-grow motion-reduce:animate-none"
                                  style={{
                                    width: `${Math.min(pct, 100)}%`,
                                    // Barra cresce logo depois da linha assentar.
                                    animationDelay: `${delay + 120}ms`,
                                  }}
                                />
                              </div>
                              <span className="rounded-md bg-osg-50 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-osg-700">
                                {fmtPct(pct)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => setSocioModal({ open: true, socio: s })}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Desvincular sócio</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Remover "{s.socio_denominacao}" do quadro societário de{' '}
                                    {empresa.denominacao}?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() =>
                                      deleteSocio.mutate({ row: s, entityName: s.socio_denominacao })}
                                  >
                                    Desvincular
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                {!buscaAtiva && (
                  <TableFooter>
                    <TableRow>
                      <TableCell className="font-semibold">Total</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {fmtInt.format(totalQuotas)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {fmtBRL.format(capitalTotal)}
                      </TableCell>
                      <TableCell className="font-semibold tabular-nums">
                        {totalQuotas > 0 ? fmtPct(100) : '—'}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <SocioModal
        open={socioModal.open}
        empresaPessoaId={empresa.id}
        empresaDenominacao={empresa.denominacao ?? '—'}
        socio={socioModal.socio}
        pessoasCliente={pessoasCliente}
        sociosExistentes={socios}
        onClose={() => setSocioModal({ open: false, socio: null })}
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
