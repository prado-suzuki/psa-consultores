import { format } from 'date-fns';
import { Calendar, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { parseDate } from '@/lib/dateUtils';
import { useProjetosCadastro } from '@/components/equipe/projetos-cadastro/ProjetosCadastroContext';

function OsStatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  if (status === 'em_andamento') return <Badge className="bg-info/10 text-info border-info/20 text-xs">Em Andamento</Badge>;
  if (status === 'concluida') return <Badge className="bg-success/10 text-success border-success/20 text-xs">Concluída</Badge>;
  if (status === 'pendente') return <Badge className="bg-warning/10 text-warning border-warning/20 text-xs">Pendente</Badge>;
  if (status === 'cancelada') return <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">Cancelada</Badge>;
  return <Badge variant="outline" className="text-xs">{status}</Badge>;
}

export function ProjetoOsProdutoFields() {
  const {
    formData, setFormData, clienteOS, osProdutosByOs, selectedOsId, setSelectedOsId,
    selectedOsProdutos, selectedProdutoId, setSelectedProdutoId,
  } = useProjetosCadastro();
  return <>
    {formData.external_client_id && <div className="space-y-2">
      <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" />Ordens de Serviço Vinculadas</Label>
      {clienteOS.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma OS encontrada para este cliente.</p> : <div className="space-y-2">
        {clienteOS.map(os => {
          const products = osProdutosByOs[os.id] || [];
          const productLabel = products.length ? products.map(product => [product.produto_codigo, product.produto_nome].filter(Boolean).join(' — ')).join(', ') : null;
          return <div key={os.id} onClick={() => setSelectedOsId(os.id)} className={`border rounded-lg p-3 cursor-pointer transition-colors ${selectedOsId === os.id ? 'border-info bg-info/10 ring-1 ring-info/20' : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'}`}>
            <div className="flex items-center justify-between mb-1.5"><span className="font-medium text-sm">{productLabel ? `OS: ${os.numero_os || 'Sem número'} — ${productLabel}` : `OS: ${os.numero_os || 'Sem número'}`}</span><OsStatusBadge status={os.situacao} /></div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {os.data_emissao && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Emissão: {format(parseDate(os.data_emissao), 'dd/MM/yyyy')}</span>}
              {os.data_inicio && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Início: {format(parseDate(os.data_inicio), 'dd/MM/yyyy')}</span>}
              {os.data_fim && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Fim: {format(parseDate(os.data_fim), 'dd/MM/yyyy')}</span>}
            </div>
          </div>;
        })}
        <p className="text-xs text-muted-foreground">{clienteOS.length > 1 ? `Este cliente possui ${clienteOS.length} ordens de serviço. Clique em uma OS para preencher as datas automaticamente.` : 'OS única selecionada automaticamente — datas de início e término preenchidas.'}</p>
      </div>}
    </div>}
    {selectedOsId && selectedOsProdutos.length >= 1 && <div>
      <Label>Produto Contratado *</Label>
      <Select value={selectedProdutoId || '_none'} onValueChange={value => {
        setSelectedProdutoId(value === '_none' ? null : value);
      }}>
        <SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
        <SelectContent><SelectItem value="_none">Selecione...</SelectItem>{selectedOsProdutos.map(product => <SelectItem key={product.produto_segmento_id} value={product.produto_segmento_id}>{product.produto_codigo} — {product.produto_nome}</SelectItem>)}</SelectContent>
      </Select>
    </div>}
  </>;
}
