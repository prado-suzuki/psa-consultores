import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RequiredMark } from '@/components/ui/required-mark';
import ClusterSelect from '@/components/equipe/produto-servico/ClusterSelect';
import { useProdutoSegmentoSave, type ProdutoSegmento } from '@/hooks/useCategorias';

interface ProdutoFormDialogProps {
  aberto: boolean;
  /** Produto em edição; `null` cria um novo. */
  produto: ProdutoSegmento | null;
  /** Cluster pré-selecionado ao criar (o que estiver filtrado na lista). */
  clusterPadrao?: string | null;
  onFechar: () => void;
  /** Chamado com o id do produto recém-criado, para a tela já selecioná-lo. */
  onCriado?: (produtoId: string) => void;
}

export default function ProdutoFormDialog({
  aberto, produto, clusterPadrao, onFechar, onCriado,
}: ProdutoFormDialogProps) {
  const { save } = useProdutoSegmentoSave();
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [clusterId, setClusterId] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Recarrega o formulário a cada abertura — o diálogo é reaproveitado entre itens.
  useEffect(() => {
    if (!aberto) return;
    setCodigo(produto?.codigo || '');
    setNome(produto?.nome || '');
    setClusterId(produto?.cluster_id || (produto ? '' : clusterPadrao || ''));
  }, [aberto, produto, clusterPadrao]);

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      const id = await save(produto?.id ?? null, codigo, nome, clusterId || null);
      if (!produto && id) onCriado?.(id);
      onFechar();
    } catch {
      // erros (validação/duplicidade) são tratados no hook
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={valor => { if (!valor) onFechar(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{produto ? 'Editar Produto/Segmento' : 'Novo Produto/Segmento'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Código <RequiredMark /></Label>
            <Input
              value={codigo}
              onChange={e => setCodigo(e.target.value)}
              placeholder="Ex: 02-ES"
              maxLength={10}
              className="font-mono uppercase"
            />
          </div>
          <div>
            <Label>Nome <RequiredMark /></Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Estruturação Societária" />
          </div>
          <div>
            <Label>Cluster</Label>
            <ClusterSelect value={clusterId} onChange={setClusterId} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={salvando}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
