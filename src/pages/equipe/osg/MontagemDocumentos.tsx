import { useState } from 'react';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/equipe/osg/OsgDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { GaleriaModelos } from '@/components/equipe/osg/montagem/GaleriaModelos';
import { MontadorWorkbench } from '@/components/equipe/osg/montagem/MontadorWorkbench';
import { useModelos, useSalvarModelo, useToggleModeloAtivo, useDuplicarModelo } from '@/hooks/useModelosDocumento';
import { useTelaDeTrabalhoLargo } from '@/hooks/useSidebarRecolhimentoController';

interface ModeloForm {
  id?: string;
  nome: string;
  tipo: string;
  descricao: string;
  /** id do modelo de origem para copiar os blocos (vazio = em branco). */
  baseId: string;
}

const EM_BRANCO = '__em_branco__';
const MODELO_VAZIO: ModeloForm = { nome: '', tipo: '', descricao: '', baseId: '' };
const TIPOS_SUGERIDOS = ['contrato_social', 'alteracao_contratual', 'doacao_quotas', 'descricao_imovel', 'parceria', 'composse', 'outros'];

const MontagemDocumentos = () => {
  const { data: modelos = [], isLoading } = useModelos();
  const salvarModelo = useSalvarModelo();
  const toggleAtivo = useToggleModeloAtivo();
  const duplicarModelo = useDuplicarModelo();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modeloDialog, setModeloDialog] = useState<{ open: boolean; form: ModeloForm }>({ open: false, form: MODELO_VAZIO });

  const selecionado = modelos.find((m) => m.id === selectedId) ?? null;
  // A bancada de montagem (canvas de blocos + paleta de altura cheia) só abre
  // com um modelo escolhido — antes disso é a galeria, que não pede espaço.
  useTelaDeTrabalhoLargo(Boolean(selecionado));

  const handleSalvarModelo = async () => {
    const f = modeloDialog.form;
    const { modelo } = await salvarModelo.mutateAsync({
      id: f.id,
      nome: f.nome.trim(),
      tipo: f.tipo.trim() || null,
      descricao: f.descricao.trim() || null,
      baseId: !f.id && f.baseId ? f.baseId : null,
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
              form: { id: selecionado.id, nome: selecionado.nome, tipo: selecionado.tipo ?? '', descricao: selecionado.descricao ?? '', baseId: '' },
            })
          }
          onToggleAtivo={() => toggleAtivo.mutate({ id: selecionado.id, ativo: !selecionado.ativo })}
          onDuplicar={async () => {
            const novo = await duplicarModelo.mutateAsync(selecionado.id);
            setSelectedId(novo.id);
          }}
          duplicando={duplicarModelo.isPending}
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
            {!modeloDialog.form.id && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Criar a partir de</Label>
                <Select
                  value={modeloDialog.form.baseId || EM_BRANCO}
                  onValueChange={(v) =>
                    setModeloDialog((d) => {
                      const baseId = v === EM_BRANCO ? '' : v;
                      const base = modelos.find((m) => m.id === baseId);
                      // Pré-preenche nome/tipo a partir do modelo base, quando ainda em branco.
                      return {
                        ...d,
                        form: {
                          ...d.form,
                          baseId,
                          nome: d.form.nome || (base ? `${base.nome} (cópia)` : ''),
                          tipo: d.form.tipo || (base?.tipo ?? ''),
                        },
                      };
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Modelo em branco" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EM_BRANCO}>Modelo em branco</SelectItem>
                    {modelos.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nome} ({m.num_blocos} bloco{m.num_blocos === 1 ? '' : 's'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Copia todos os blocos e a ordem do modelo escolhido. Os blocos continuam compartilhados com a Biblioteca.
                </p>
              </div>
            )}
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
