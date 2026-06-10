import { useState } from 'react';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/equipe/osg/OsgDialog';
import { Plus, Loader2 } from 'lucide-react';
import { GaleriaModelos } from '@/components/equipe/osg/montagem/GaleriaModelos';
import { MontadorWorkbench } from '@/components/equipe/osg/montagem/MontadorWorkbench';
import { useModelos, useSalvarModelo, useToggleModeloAtivo } from '@/hooks/useModelosDocumento';

interface ModeloForm {
  id?: string;
  nome: string;
  tipo: string;
  descricao: string;
}

const MODELO_VAZIO: ModeloForm = { nome: '', tipo: '', descricao: '' };
const TIPOS_SUGERIDOS = ['contrato_social', 'alteracao_contratual', 'doacao_quotas', 'descricao_imovel', 'parceria', 'composse', 'outros'];

const MontagemDocumentos = () => {
  const { data: modelos = [], isLoading } = useModelos();
  const salvarModelo = useSalvarModelo();
  const toggleAtivo = useToggleModeloAtivo();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modeloDialog, setModeloDialog] = useState<{ open: boolean; form: ModeloForm }>({ open: false, form: MODELO_VAZIO });

  const selecionado = modelos.find((m) => m.id === selectedId) ?? null;

  const handleSalvarModelo = async () => {
    const f = modeloDialog.form;
    const { modelo } = await salvarModelo.mutateAsync({
      id: f.id,
      nome: f.nome.trim(),
      tipo: f.tipo.trim() || null,
      descricao: f.descricao.trim() || null,
    });
    setModeloDialog({ open: false, form: MODELO_VAZIO });
    setSelectedId(modelo.id);
  };

  return (
    <OsgLayout
      title="Montagem de Documentos"
      subtitle="Monte um modelo como um lego de contrato: arraste blocos da Biblioteca e organize a sequência"
      headerActions={
        selecionado ? undefined : (
          <Button size="sm" className="bg-osg-600 hover:bg-osg-700" onClick={() => setModeloDialog({ open: true, form: MODELO_VAZIO })}>
            <Plus className="mr-1.5 h-4 w-4" />
            Novo modelo
          </Button>
        )
      }
    >
      {selecionado ? (
        <MontadorWorkbench
          modelo={selecionado}
          modelos={modelos}
          onVoltar={() => setSelectedId(null)}
          onSelectModelo={setSelectedId}
          onEditarMeta={() =>
            setModeloDialog({
              open: true,
              form: { id: selecionado.id, nome: selecionado.nome, tipo: selecionado.tipo ?? '', descricao: selecionado.descricao ?? '' },
            })
          }
          onToggleAtivo={() => toggleAtivo.mutate({ id: selecionado.id, ativo: !selecionado.ativo })}
        />
      ) : (
        <GaleriaModelos
          modelos={modelos}
          isLoading={isLoading}
          onSelect={setSelectedId}
          onNovo={() => setModeloDialog({ open: true, form: MODELO_VAZIO })}
        />
      )}

      {/* Dialog: criar/editar metadados do modelo */}
      <Dialog open={modeloDialog.open} onOpenChange={(open) => setModeloDialog((d) => ({ ...d, open }))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{modeloDialog.form.id ? 'Editar modelo' : 'Novo modelo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Nome *</Label>
              <Input
                value={modeloDialog.form.nome}
                onChange={(e) => setModeloDialog((d) => ({ ...d, form: { ...d.form, nome: e.target.value } }))}
                placeholder="ex: Descrição de Imóvel Rural"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Tipo</Label>
              <Input
                value={modeloDialog.form.tipo}
                onChange={(e) => setModeloDialog((d) => ({ ...d, form: { ...d.form, tipo: e.target.value } }))}
                placeholder="ex: descricao_imovel"
                list="tipos-modelo"
              />
              <datalist id="tipos-modelo">
                {TIPOS_SUGERIDOS.map((t) => <option key={t} value={t} />)}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Descrição</Label>
              <Input
                value={modeloDialog.form.descricao}
                onChange={(e) => setModeloDialog((d) => ({ ...d, form: { ...d.form, descricao: e.target.value } }))}
                placeholder="Quando usar este modelo"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModeloDialog({ open: false, form: MODELO_VAZIO })}>Cancelar</Button>
              <Button
                onClick={handleSalvarModelo}
                disabled={!modeloDialog.form.nome.trim() || salvarModelo.isPending}
                className="bg-osg-600 hover:bg-osg-700"
              >
                {salvarModelo.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                {modeloDialog.form.id ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </OsgLayout>
  );
};

export default MontagemDocumentos;
