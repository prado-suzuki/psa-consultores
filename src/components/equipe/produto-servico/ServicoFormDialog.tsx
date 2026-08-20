import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RequiredMark } from '@/components/ui/required-mark';
import ClusterSelect from '@/components/equipe/produto-servico/ClusterSelect';
import { useServicosPrestadosSave, type ServicoPrestado } from '@/hooks/useCategorias';

interface ServicoFormDialogProps {
  aberto: boolean;
  /** Serviço em edição; `null` cria um novo. */
  servico: ServicoPrestado | null;
  /** Cluster pré-selecionado ao criar (o do produto selecionado na tela). */
  clusterPadrao?: string | null;
  onFechar: () => void;
  /** Chamado com o serviço recém-criado, para já vinculá-lo ao produto. */
  onCriado?: (servicoId: string, nome: string) => void;
}

export default function ServicoFormDialog({
  aberto, servico, clusterPadrao, onFechar, onCriado,
}: ServicoFormDialogProps) {
  const { save } = useServicosPrestadosSave();
  const [nome, setNome] = useState('');
  const [clusterId, setClusterId] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Recarrega o formulário a cada abertura — o diálogo é reaproveitado entre itens.
  useEffect(() => {
    if (!aberto) return;
    setNome(servico?.nome || '');
    setClusterId(servico?.cluster_id || (servico ? '' : clusterPadrao || ''));
  }, [aberto, servico, clusterPadrao]);

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      const id = await save(servico?.id ?? null, nome, clusterId || null);
      if (!servico && id) onCriado?.(id, nome.trim());
      onFechar();
    } catch {
      // erros de validação são tratados no hook
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={valor => { if (!valor) onFechar(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{servico ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome <RequiredMark /></Label>
            <Input
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: 1.1.Apoio no fechamento contábil"
            />
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
