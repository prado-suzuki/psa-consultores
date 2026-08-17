import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Plus, RefreshCw } from 'lucide-react';
import { RequiredMark } from '@/components/ui/required-mark';
import { Checkbox } from '@/components/ui/checkbox';
import { useCentroCustoList } from '@/hooks/useCategorias';
import EmpresaPicker from '@/components/equipe/empresas/EmpresaPicker';
import { encontrarEmpresa, listarEmpresasCadastradas } from '@/lib/empresasFaturamento';
import { useEstruturaClusters, useEstruturaMutations, type Cluster } from '@/hooks/useEstruturaManager';

const FORM_VAZIO = { name: '', nome_empresa: '', cnpj: '', cost_center_id: '', is_active: true };

/**
 * Cadastro de empresas de faturamento. Cada empresa é um registro de
 * `estrutura_clusters` (a tabela `empresas_faturamento` foi mesclada nela), os
 * mesmos clusters da aba Cadastros Estrutura — aqui a visão é pela empresa:
 * razão social, CNPJ e centro de custo.
 *
 * A exclusão fica de fora de propósito: apagar o registro derruba as áreas e
 * equipes vinculadas, e isso só deve ser feito de onde a árvore está visível.
 */
export default function EmpresasTab() {
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Cluster | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [propagar, setPropagar] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const { data: clusters = [], isLoading } = useEstruturaClusters();
  const { data: centrosCusto = [] } = useCentroCustoList();
  const { saveCluster, aplicarEmpresaEmClusters } = useEstruturaMutations();

  const centroCustoPorId = useMemo(
    () => new Map(centrosCusto.map(cc => [cc.id, `${cc.codigo} - ${cc.nome}`])),
    [centrosCusto],
  );

  // Ativas primeiro; dentro disso, ordem alfabética pelo nome da empresa/cluster.
  const empresas = useMemo(() => [...clusters].sort((a, b) => (
    Number(b.is_active) - Number(a.is_active)
    || (a.nome_empresa || a.name).localeCompare(b.nome_empresa || b.name, 'pt-BR')
  )), [clusters]);

  // Outros clusters que faturam pela MESMA empresa gravada hoje neste registro:
  // como a empresa vive nas colunas do cluster, editá-la aqui pode (e deve)
  // atualizar os irmãos, senão eles ficam com a razão social antiga.
  const outrosClustersDaEmpresa = useMemo(() => {
    if (!editando) return [];
    const original = encontrarEmpresa(listarEmpresasCadastradas(clusters), editando.nome_empresa);
    if (!original) return [];
    const ids = new Set(original.clusters.map(c => c.id));
    return clusters.filter(c => ids.has(c.id) && c.id !== editando.id);
  }, [editando, clusters]);

  const abrirCriacao = () => { setEditando(null); setForm(FORM_VAZIO); setPropagar(true); setAberto(true); };

  const abrirEdicao = (empresa: Cluster) => {
    setEditando(empresa);
    setPropagar(true);
    setForm({
      name: empresa.name,
      nome_empresa: empresa.nome_empresa || '',
      cnpj: empresa.cnpj || '',
      cost_center_id: empresa.cost_center_id || '',
      is_active: empresa.is_active,
    });
    setAberto(true);
  };

  const salvar = async () => {
    const nomeEmpresa = form.nome_empresa.trim() || null;
    const cnpj = form.cnpj.trim() || null;
    setSalvando(true);
    try {
      await saveCluster({
        name: form.name,
        nome_empresa: nomeEmpresa,
        cost_center_id: form.cost_center_id || null,
        cnpj,
        is_active: form.is_active,
      }, editando);
      if (propagar && outrosClustersDaEmpresa.length > 0) {
        await aplicarEmpresaEmClusters(outrosClustersDaEmpresa, { nome_empresa: nomeEmpresa, cnpj });
      }
      setAberto(false);
    } finally {
      setSalvando(false);
    }
  };

  const alternarAtivo = (empresa: Cluster) => saveCluster({
    name: empresa.name,
    nome_empresa: empresa.nome_empresa,
    cnpj: empresa.cnpj,
    cost_center_id: empresa.cost_center_id,
    is_active: !empresa.is_active,
  }, empresa);

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{empresas.length} empresas cadastradas</p>
          <p className="text-xs text-slate-400">
            Cada empresa é um cluster de faturamento — os mesmos registros da aba Cadastros Estrutura.
          </p>
        </div>
        <Button size="sm" onClick={abrirCriacao}><Plus className="mr-1 h-4 w-4" />Adicionar</Button>
      </div>

      <Card className="border-slate-200/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead className="w-40">Cluster</TableHead>
              <TableHead className="w-44">CNPJ</TableHead>
              <TableHead>Centro de custo</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-16">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center">
                  <RefreshCw className="mx-auto h-5 w-5 animate-spin text-slate-400" />
                </TableCell>
              </TableRow>
            ) : empresas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-slate-400">Nenhuma empresa</TableCell>
              </TableRow>
            ) : empresas.map(empresa => (
              <TableRow key={empresa.id} className={empresa.is_active ? undefined : 'text-slate-400'}>
                <TableCell className="font-medium">
                  {empresa.nome_empresa || <span className="text-slate-400">(sem razão social)</span>}
                </TableCell>
                <TableCell><Badge variant="secondary">{empresa.name}</Badge></TableCell>
                <TableCell className="font-mono text-xs">{empresa.cnpj || '—'}</TableCell>
                <TableCell className="text-sm">
                  {empresa.cost_center_id
                    ? centroCustoPorId.get(empresa.cost_center_id) || '—'
                    : <span className="text-slate-400">—</span>}
                </TableCell>
                <TableCell>
                  <Switch checked={empresa.is_active} onCheckedChange={() => alternarAtivo(empresa)} />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => abrirEdicao(empresa)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Cluster de faturamento <RequiredMark /></Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Tax, OSG..."
              />
              <p className="mt-1 text-xs text-slate-400">
                Nome curto usado para agrupar produtos, serviços, áreas e equipes.
              </p>
            </div>
            <EmpresaPicker
              value={{ nome: form.nome_empresa, cnpj: form.cnpj }}
              onChange={empresa => setForm(f => ({ ...f, nome_empresa: empresa.nome, cnpj: empresa.cnpj }))}
              clusterAtualId={editando?.id ?? null}
            />

            {editando && outrosClustersDaEmpresa.length > 0 && (
              <label className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 bg-slate-50/60 px-3 py-2.5">
                <Checkbox
                  checked={propagar}
                  onCheckedChange={marcado => setPropagar(marcado === true)}
                  className="mt-0.5"
                />
                <span className="text-xs text-slate-600">
                  Aplicar razão social e CNPJ também aos outros {outrosClustersDaEmpresa.length} cluster(s)
                  desta empresa ({outrosClustersDaEmpresa.map(c => c.name).join(', ')}).
                </span>
              </label>
            )}
            <div>
              <Label>Centro de custo</Label>
              <Select
                value={form.cost_center_id || '_none'}
                onValueChange={valor => setForm(f => ({ ...f, cost_center_id: valor === '_none' ? '' : valor }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecionar centro de custo..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Nenhum</SelectItem>
                  {centrosCusto.filter(cc => cc.is_active).map(cc => (
                    <SelectItem key={cc.id} value={cc.id}>{cc.codigo} - {cc.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editando && (
              <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50/60 px-3 py-2.5">
                <Label htmlFor="empresa-ativa" className="cursor-pointer">
                  {form.is_active ? 'Empresa ativa' : 'Empresa inativa'}
                </Label>
                <Switch
                  id="empresa-ativa"
                  checked={form.is_active}
                  onCheckedChange={checked => setForm(f => ({ ...f, is_active: checked }))}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
