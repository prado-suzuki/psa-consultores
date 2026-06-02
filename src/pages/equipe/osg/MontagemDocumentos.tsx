import { useMemo, useState } from 'react';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/equipe/osg/OsgDialog';
import {
  Plus, Pencil, Power, ArrowUp, ArrowDown, Trash2, Search, Loader2,
  FileStack, Lock, LockOpen, AlertTriangle, Layers,
} from 'lucide-react';
import { useBlocos } from '@/hooks/useBibliotecaModelos';
import {
  useModelos, useModeloBlocos, useSalvarModelo, useToggleModeloAtivo,
  useAdicionarBloco, useRemoverDocumentoBloco, useAtualizarDocumentoBloco, useReordenarBlocos,
  type ModeloComContagem,
} from '@/hooks/useModelosDocumento';

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
  const [addBlocoOpen, setAddBlocoOpen] = useState(false);

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
      subtitle="Componha um modelo de documento como uma sequência ordenada de blocos da Biblioteca"
      headerActions={
        <Button size="sm" className="bg-osg-600 hover:bg-osg-700" onClick={() => setModeloDialog({ open: true, form: MODELO_VAZIO })}>
          <Plus className="h-4 w-4 mr-1.5" />
          Novo modelo
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* Lista de modelos */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : modelos.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                <FileStack className="h-7 w-7 mx-auto mb-2 opacity-40" />
                Nenhum modelo. Crie o primeiro com "Novo modelo".
              </CardContent>
            </Card>
          ) : (
            modelos.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedId(m.id)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  selectedId === m.id ? 'border-osg-300 bg-osg-50' : 'border-border hover:bg-muted/50'
                } ${m.ativo ? '' : 'opacity-60'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold leading-tight">{m.nome}</span>
                  <Badge variant="outline" className="text-[10px] shrink-0">{m.num_blocos} bloco{m.num_blocos === 1 ? '' : 's'}</Badge>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  {m.tipo && <Badge variant="secondary" className="text-[10px]">{m.tipo}</Badge>}
                  {!m.ativo && <Badge variant="outline" className="text-[10px]">inativo</Badge>}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Editor do modelo selecionado */}
        {selecionado ? (
          <EditorModelo
            modelo={selecionado}
            onEditarMeta={() =>
              setModeloDialog({
                open: true,
                form: { id: selecionado.id, nome: selecionado.nome, tipo: selecionado.tipo ?? '', descricao: selecionado.descricao ?? '' },
              })
            }
            onToggleAtivo={() => toggleAtivo.mutate({ id: selecionado.id, ativo: !selecionado.ativo })}
            onAddBloco={() => setAddBlocoOpen(true)}
          />
        ) : (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Layers className="h-8 w-8 mx-auto mb-3 opacity-40" />
              Selecione um modelo à esquerda para montar sua sequência de blocos.
            </CardContent>
          </Card>
        )}
      </div>

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
                {salvarModelo.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                {modeloDialog.form.id ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: adicionar bloco */}
      {selecionado && (
        <AdicionarBlocoDialog open={addBlocoOpen} onOpenChange={setAddBlocoOpen} documentoId={selecionado.id} />
      )}
    </OsgLayout>
  );
};

// ---------------------------------------------------------------------------

function EditorModelo({
  modelo,
  onEditarMeta,
  onToggleAtivo,
  onAddBloco,
}: {
  modelo: ModeloComContagem;
  onEditarMeta: () => void;
  onToggleAtivo: () => void;
  onAddBloco: () => void;
}) {
  const { data: docBlocos = [], isLoading } = useModeloBlocos(modelo.id);
  const remover = useRemoverDocumentoBloco();
  const atualizar = useAtualizarDocumentoBloco();
  const reordenar = useReordenarBlocos();

  const mover = (index: number, dir: -1 | 1) => {
    const ids = docBlocos.map((b) => b.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    reordenar.mutate({ documentoId: modelo.id, idsOrdenados: ids });
  };

  const estrutura = useMemo(
    () => docBlocos.map((b) => b.bloco?.conteudo ?? '').filter(Boolean).join(' '),
    [docBlocos],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-base">{modelo.nome}</CardTitle>
            <div className="flex items-center gap-1.5 mt-1">
              {modelo.tipo && <Badge variant="secondary" className="text-[10px]">{modelo.tipo}</Badge>}
              {!modelo.ativo && <Badge variant="outline" className="text-[10px]">inativo</Badge>}
            </div>
            {modelo.descricao && <p className="text-xs text-muted-foreground mt-2">{modelo.descricao}</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEditarMeta} title="Editar dados">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleAtivo} title={modelo.ativo ? 'Desativar' : 'Ativar'}>
              <Power className={`h-4 w-4 ${modelo.ativo ? 'text-osg-600' : 'text-muted-foreground'}`} />
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Sequência de blocos</CardTitle>
          <Button variant="outline" size="sm" onClick={onAddBloco}>
            <Plus className="h-4 w-4 mr-1.5" /> Adicionar bloco
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando blocos…
            </div>
          ) : docBlocos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhum bloco. Use "Adicionar bloco" para montar a sequência.
            </p>
          ) : (
            <div className="space-y-2">
              {docBlocos.map((db, i) => (
                <div key={db.id} className="flex items-start gap-2 rounded-lg border p-2.5">
                  <div className="flex flex-col">
                    <Button variant="ghost" size="icon" className="h-5 w-6" disabled={i === 0} onClick={() => mover(i, -1)}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-5 w-6" disabled={i === docBlocos.length - 1} onClick={() => mover(i, 1)}>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground pt-1.5 w-5 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium">{db.bloco?.nome ?? '— bloco removido —'}</span>
                      {db.bloco?.categoria && <Badge variant="secondary" className="text-[10px]">{db.bloco.categoria}</Badge>}
                      {db.bloco && <Badge variant="outline" className="text-[10px]">v{db.bloco.numero_versao ?? '—'}</Badge>}
                      {db.bloco && !db.bloco.ativo && (
                        <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                          <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> inativo
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{db.bloco?.conteudo}</p>
                    <Input
                      defaultValue={db.observacao ?? ''}
                      placeholder="observação (opcional)"
                      className="h-7 text-xs mt-1.5"
                      onBlur={(e) => {
                        const v = e.target.value.trim() || null;
                        if (v !== (db.observacao ?? null)) {
                          atualizar.mutate({ id: db.id, documentoId: modelo.id, patch: { observacao: v } });
                        }
                      }}
                    />
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Button
                      variant={db.obrigatorio ? 'default' : 'outline'}
                      size="sm"
                      className={`h-7 text-[11px] px-2 ${db.obrigatorio ? 'bg-osg-600 hover:bg-osg-700' : ''}`}
                      title={db.obrigatorio ? 'Sempre incluído (ignora flags)' : 'Incluído conforme as flags do bloco'}
                      onClick={() => atualizar.mutate({ id: db.id, documentoId: modelo.id, patch: { obrigatorio: !db.obrigatorio } })}
                    >
                      {db.obrigatorio ? <Lock className="h-3 w-3 mr-1" /> : <LockOpen className="h-3 w-3 mr-1" />}
                      {db.obrigatorio ? 'Obrigatório' : 'Condicional'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => remover.mutate({ id: db.id, documentoId: modelo.id })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {docBlocos.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Estrutura do documento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-justify text-slate-800 whitespace-pre-wrap">{estrutura}</p>
            <p className="mt-3 text-xs text-muted-foreground border-t pt-2">
              Prévia da estrutura com os campos ({'{{ }}'}) ainda não preenchidos. O preenchimento dos campos
              acontece na geração do documento para um cliente (próxima etapa).
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function AdicionarBlocoDialog({
  open,
  onOpenChange,
  documentoId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentoId: string;
}) {
  const { data: blocos = [] } = useBlocos();
  const { data: jaNoModelo = [] } = useModeloBlocos(documentoId);
  const adicionar = useAdicionarBloco();
  const [busca, setBusca] = useState('');

  const idsNoModelo = new Set(jaNoModelo.map((b) => b.bloco_id));
  const disponiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return blocos
      .filter((b) => b.ativo)
      .filter((b) => !q || b.nome.toLowerCase().includes(q) || (b.categoria ?? '').toLowerCase().includes(q));
  }, [blocos, busca]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Adicionar bloco</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar bloco" className="pl-9" />
        </div>
        <div className="space-y-2 overflow-y-auto mt-3 pr-1">
          {disponiveis.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum bloco ativo disponível.</p>
          ) : (
            disponiveis.map((b) => {
              const adicionado = idsNoModelo.has(b.id);
              return (
                <div key={b.id} className="flex items-center justify-between gap-2 rounded-lg border p-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">{b.nome}</span>
                      {b.categoria && <Badge variant="secondary" className="text-[10px]">{b.categoria}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{b.versao_atual?.conteudo}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={adicionado ? 'outline' : 'default'}
                    disabled={adicionado || adicionar.isPending}
                    className={adicionado ? '' : 'bg-osg-600 hover:bg-osg-700'}
                    onClick={() => adicionar.mutate({ documentoId, blocoId: b.id })}
                  >
                    {adicionado ? 'Já adicionado' : 'Adicionar'}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default MontagemDocumentos;
