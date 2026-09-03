import { useMemo, useState } from 'react';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { AlertTriangle, Loader2, Pencil, Plus, Search, Sprout, Trash2 } from 'lucide-react';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { rowActivateProps } from '@/hooks/rowActivateProps';
import {
  useDeleteExploracaoRural,
  useExploracaoRural,
  type ExploracaoRuralEnriched,
} from '@/hooks/useExploracaoRural';
import { ExploracaoRuralModal } from '@/components/equipe/osg/diagnostico-patrimonial/ExploracaoRuralModal';
import { TIPOS_EXPLORACAO_OPCOES } from '@/lib/exploracaoRuralModalModels';

const TODOS = '__todos__';

const fmtData = (v: string | null): string =>
  v ? v.split('-').reverse().join('/') : '—';

/** Área cedida somada, em ha — item em m² converte antes de entrar na conta. */
const areaCedida = (row: ExploracaoRuralEnriched): number =>
  row.imoveis.reduce((soma, item) => {
    const valor = Number(item.area_explorada) || 0;
    return soma + (item.area_unidade === 'm2' ? valor / 10000 : valor);
  }, 0);

const rotuloDoTipo = (tipo: string): string =>
  TIPOS_EXPLORACAO_OPCOES.find((t) => t.valor === tipo)?.rotulo ?? tipo;

/** Quem explora: outorgados na parceria, compossuidores na composse. */
const partesQueExploram = (row: ExploracaoRuralEnriched): string[] => {
  const papel = row.tipo_exploracao === 'composse' ? 'compossuidor' : 'explorador';
  return row.partes
    .filter((p) => p.papel === papel)
    .sort((a, b) => a.ordem - b.ordem)
    .map((p) => p.pessoa?.denominacao)
    .filter((n): n is string => !!n);
};

const ExploracaoRural = () => {
  const { clienteId } = useOsgWork();
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState(TODOS);
  const [modal, setModal] = useState<{ open: boolean; exploracao: ExploracaoRuralEnriched | null }>({
    open: false,
    exploracao: null,
  });
  const [aExcluir, setAExcluir] = useState<ExploracaoRuralEnriched | null>(null);

  const { data: exploracoes = [], isLoading, error } = useExploracaoRural(clienteId || null);
  const excluir = useDeleteExploracaoRural();

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return exploracoes.filter((row) => {
      if (filtroTipo !== TODOS && row.tipo_exploracao !== filtroTipo) return false;
      if (!q) return true;
      const alvos = [
        row.referencia ?? '',
        row.outorgante?.denominacao ?? '',
        ...partesQueExploram(row),
        ...row.imoveis.map((i) => i.matricula?.numero ?? ''),
      ];
      return alvos.some((alvo) => alvo.toLowerCase().includes(q));
    });
  }, [exploracoes, busca, filtroTipo]);

  const totalImoveis = filtradas.reduce((s, r) => s + r.imoveis.length, 0);
  const totalArea = filtradas.reduce((s, r) => s + areaCedida(r), 0);

  return (
    <OsgLayout
      title="Exploração Rural"
      subtitle="Instrumentos de parceria e composse: partes, imóveis e origens da posse"
    >
      <div className="space-y-4">
        {!clienteId ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Sprout className="mx-auto mb-3 h-10 w-10 opacity-50" />
              <p className="text-sm">
                Selecione um cliente na barra acima para ver e gerenciar as explorações rurais.
              </p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p className="text-sm">Carregando…</p>
            </CardContent>
          </Card>
        ) : error ? (
          /* Falha na consulta NÃO é lista vazia. Tratar as duas igual foi o que
             escondeu um embed ambíguo do PostgREST: a tela dizia "nenhuma
             exploração cadastrada" para um cliente que tinha duas, e o erro só
             apareceu quando alguém foi ler o SQL. */
          <Card className="border-destructive/40">
            <CardContent className="py-12 text-center">
              <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-destructive/70" />
              <p className="text-sm font-medium text-destructive">
                Não foi possível carregar as explorações rurais deste cliente.
              </p>
              <p className="mx-auto mt-2 max-w-xl text-xs text-muted-foreground">
                {error instanceof Error ? error.message : String(error)}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Filtros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3 md:flex-row md:items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Buscar</Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="Referência, parte ou nº de matrícula"
                        className="h-9 pl-8"
                      />
                    </div>
                  </div>
                  <div className="w-full space-y-1.5 md:w-56">
                    <Label className="text-xs font-semibold text-muted-foreground">Tipo</Label>
                    <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={TODOS}>Todos</SelectItem>
                        {TIPOS_EXPLORACAO_OPCOES.map((t) => (
                          <SelectItem key={t.valor} value={t.valor}>{t.rotulo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="gap-1.5"
                    onClick={() => setModal({ open: true, exploracao: null })}
                  >
                    <Plus className="h-4 w-4" />
                    Nova exploração rural
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">
                  {filtradas.length} instrumento{filtradas.length === 1 ? '' : 's'}
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  {totalImoveis} imóve{totalImoveis === 1 ? 'l' : 'is'} ·{' '}
                  {totalArea.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} ha cedidos
                </span>
              </CardHeader>
              <CardContent className="p-0">
                {filtradas.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    {exploracoes.length === 0
                      ? 'Nenhuma exploração rural cadastrada para este cliente.'
                      : 'Nenhum instrumento corresponde ao filtro.'}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Referência</TableHead>
                          <TableHead>Outorgante</TableHead>
                          <TableHead>Explorador / Compossuidor</TableHead>
                          <TableHead className="text-right">Imóveis</TableHead>
                          <TableHead className="text-right">Área cedida</TableHead>
                          <TableHead>Assinatura</TableHead>
                          <TableHead className="w-20" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtradas.map((row) => {
                          const partes = partesQueExploram(row);
                          return (
                            <TableRow
                              key={row.id}
                              className="group"
                              {...rowActivateProps(() => setModal({ open: true, exploracao: row }))}
                            >
                              <TableCell>
                                <Badge variant="outline" className="border-osg-200 bg-osg-50 text-osg-700">
                                  {rotuloDoTipo(row.tipo_exploracao)}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">{row.referencia || '—'}</TableCell>
                              <TableCell>{row.outorgante?.denominacao ?? '—'}</TableCell>
                              <TableCell className="max-w-xs truncate">
                                {partes.length ? partes.join('; ') : '—'}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {row.imoveis.length}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {areaCedida(row) > 0
                                  ? `${areaCedida(row).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ha`
                                  : '—'}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">{fmtData(row.data_assinatura)}</TableCell>
                              <TableCell>
                                {/* Ações reveladas no hover, como o resto da OSG.
                                    `focus-within` mantém a linha operável por teclado. */}
                                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={() => setModal({ open: true, exploracao: row })}
                                    aria-label="Editar exploração rural"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    onClick={() => setAExcluir(row)}
                                    aria-label="Excluir exploração rural"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {clienteId && (
        <ExploracaoRuralModal
          open={modal.open}
          clienteId={clienteId}
          exploracao={modal.exploracao}
          onClose={() => setModal({ open: false, exploracao: null })}
        />
      )}

      <Dialog open={!!aExcluir} onOpenChange={(v) => !v && setAExcluir(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir exploração rural</DialogTitle>
            {/* Diz o que vai embora junto: as três filhas saem por cascade, e o
                consultor não tem como saber isso pela tela. */}
            <DialogDescription>
              {aExcluir && (
                <>
                  Isto apaga o instrumento{' '}
                  <b>{aExcluir.referencia || rotuloDoTipo(aExcluir.tipo_exploracao)}</b> e, com ele,{' '}
                  {aExcluir.partes.length} parte{aExcluir.partes.length === 1 ? '' : 's'},{' '}
                  {aExcluir.imoveis.length} imóve{aExcluir.imoveis.length === 1 ? 'l' : 'is'} e{' '}
                  {aExcluir.origens.length} origem
                  {aExcluir.origens.length === 1 ? '' : 'ns'} externa
                  {aExcluir.origens.length === 1 ? '' : 's'}. As matrículas e as pessoas
                  continuam cadastradas.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAExcluir(null)} disabled={excluir.isPending}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="gap-1.5"
              disabled={excluir.isPending}
              onClick={() => {
                if (!aExcluir) return;
                excluir.mutate(aExcluir, { onSuccess: () => setAExcluir(null) });
              }}
            >
              {excluir.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OsgLayout>
  );
};

export default ExploracaoRural;
