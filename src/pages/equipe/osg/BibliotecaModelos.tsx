import { useMemo, useState } from 'react';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { EditorConteudoModelo } from '@/components/equipe/osg/EditorConteudoModelo';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, FileText, Search, Power, Loader2, Braces, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { extrairCampos, LABEL_TIPO_BLOCO, TIPOS_BLOCO, type TipoBloco } from '@/lib/templates';
import {
  useBlocos,
  useSalvarBloco,
  useToggleBlocoAtivo,
  type BlocoComVersao,
} from '@/hooks/useBibliotecaModelos';

interface FormState {
  id?: string;
  nome: string;
  tipo: TipoBloco;
  categoria: string;
  descricao: string;
  conteudo: string;
  changelog: string;
}

const FORM_VAZIO: FormState = { nome: '', tipo: 'livre', categoria: '', descricao: '', conteudo: '', changelog: '' };

// Sugestões de categoria (livre): espelham as do modelo de composição documental.
const CATEGORIAS_SUGERIDAS = ['preambulo', 'capital', 'administracao', 'cessao', 'causa_mortis', 'descricao_imovel', 'outros'];

// O que escrever no conteúdo conforme o tipo — a numeração é resolvida na composição.
const DICA_POR_TIPO: Record<TipoBloco, string | null> = {
  capitulo: 'Escreva só o título do capítulo — "CAPÍTULO I/II/…" entra automaticamente pela posição no documento.',
  clausula: 'Escreva só o caput, sem "CLÁUSULA …:" — a numeração é automática pela ordem no documento.',
  paragrafo: 'Escreva só o texto, sem "Parágrafo …:" — vira "Parágrafo Único" ou recebe o ordinal conforme a composição.',
  livre: null,
};

const BibliotecaModelos = () => {
  const { data: blocos = [], isLoading } = useBlocos();
  const salvar = useSalvarBloco();
  const toggleAtivo = useToggleBlocoAtivo();

  const [busca, setBusca] = useState('');
  const [dialog, setDialog] = useState<{ open: boolean; form: FormState }>({ open: false, form: FORM_VAZIO });
  const [conteudoExpandido, setConteudoExpandido] = useState(false);

  const blocosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return blocos;
    return blocos.filter(
      (b) =>
        b.nome.toLowerCase().includes(q) ||
        (b.categoria ?? '').toLowerCase().includes(q) ||
        (b.versao_atual?.conteudo ?? '').toLowerCase().includes(q),
    );
  }, [blocos, busca]);

  const abrirNovo = () => {
    setConteudoExpandido(false);
    setDialog({ open: true, form: FORM_VAZIO });
  };

  const abrirEdicao = (b: BlocoComVersao) => {
    setConteudoExpandido(false);
    setDialog({
      open: true,
      form: {
        id: b.id,
        nome: b.nome,
        tipo: (b.tipo as TipoBloco) ?? 'livre',
        categoria: b.categoria ?? '',
        descricao: b.descricao ?? '',
        conteudo: b.versao_atual?.conteudo ?? '',
        changelog: '',
      },
    });
  };

  const setCampo = <K extends keyof FormState>(chave: K, valor: FormState[K]) =>
    setDialog((d) => ({ ...d, form: { ...d.form, [chave]: valor } }));

  const camposDetectados = useMemo(() => extrairCampos(dialog.form.conteudo), [dialog.form.conteudo]);
  const podeSalvar = dialog.form.nome.trim().length > 0 && dialog.form.conteudo.trim().length > 0;

  const handleSalvar = async () => {
    const f = dialog.form;
    await salvar.mutateAsync({
      id: f.id,
      nome: f.nome.trim(),
      tipo: f.tipo,
      categoria: f.categoria.trim() || null,
      descricao: f.descricao.trim() || null,
      conteudo: f.conteudo,
      changelog: f.changelog.trim() || null,
    });
    setDialog({ open: false, form: FORM_VAZIO });
  };

  return (
    <OsgLayout
      title="Biblioteca de Modelos"
      subtitle="Blocos de texto reutilizáveis com campos — as peças que compõem os documentos"
      headerActions={
        <Button size="sm" onClick={abrirNovo} className="bg-osg-600 hover:bg-osg-700">
          <Plus className="h-4 w-4 mr-1.5" />
          Novo bloco
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, categoria ou conteúdo"
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando blocos…
          </div>
        ) : blocosFiltrados.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-3 opacity-40" />
              {blocos.length === 0
                ? 'Nenhum bloco ainda. Crie o primeiro com "Novo bloco".'
                : 'Nenhum bloco corresponde à busca.'}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {blocosFiltrados.map((b) => {
              const campos = extrairCampos(b.versao_atual?.conteudo ?? '');
              return (
                <Card key={b.id} className={b.ativo ? '' : 'opacity-60'}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-semibold leading-tight">{b.nome}</CardTitle>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrirEdicao(b)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title={b.ativo ? 'Desativar' : 'Ativar'}
                          onClick={() => toggleAtivo.mutate({ id: b.id, ativo: !b.ativo })}
                        >
                          <Power className={`h-3.5 w-3.5 ${b.ativo ? 'text-osg-600' : 'text-muted-foreground'}`} />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {b.tipo !== 'livre' && (
                        <Badge className="text-[10px] bg-osg-100 text-osg-700 hover:bg-osg-100">
                          {LABEL_TIPO_BLOCO[(b.tipo as TipoBloco) ?? 'livre']}
                        </Badge>
                      )}
                      {b.categoria && <Badge variant="secondary" className="text-[10px]">{b.categoria}</Badge>}
                      <Badge variant="outline" className="text-[10px]">v{b.versao_atual?.numero_versao ?? '—'}</Badge>
                      {!b.ativo && <Badge variant="outline" className="text-[10px]">inativo</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {b.versao_atual?.conteudo || <span className="italic">sem conteúdo</span>}
                    </p>
                    {campos.length > 0 && (
                      <div className="mt-2 flex items-center gap-1 flex-wrap">
                        <Braces className="h-3 w-3 text-osg-600" />
                        {campos.map((c) => (
                          <code key={c} className="text-[10px] bg-osg-50 text-osg-700 rounded px-1 py-0.5">{c}</code>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog
        open={dialog.open}
        onOpenChange={(open) => {
          if (!open) setConteudoExpandido(false);
          setDialog((d) => ({ ...d, open }));
        }}
      >
        <DialogContent
          className={cn(
            'overflow-y-auto transition-all duration-300',
            conteudoExpandido ? 'max-w-[95vw] w-[95vw] h-[90vh] max-h-[90vh]' : 'max-w-2xl max-h-[90vh]',
          )}
        >
          <DialogHeader>
            <DialogTitle>{dialog.form.id ? 'Editar bloco' : 'Novo bloco'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Nome *</Label>
                <Input
                  value={dialog.form.nome}
                  onChange={(e) => setCampo('nome', e.target.value)}
                  placeholder="ex: Descrição de imóvel — propriedade exclusiva"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Tipo</Label>
                <Select value={dialog.form.tipo} onValueChange={(v) => setCampo('tipo', v as TipoBloco)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_BLOCO.map((t) => (
                      <SelectItem key={t} value={t}>
                        {LABEL_TIPO_BLOCO[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {DICA_POR_TIPO[dialog.form.tipo] && (
              <p className="text-xs text-osg-700 bg-osg-50 rounded-md px-2.5 py-1.5 -mt-2">
                {DICA_POR_TIPO[dialog.form.tipo]}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Categoria</Label>
                <Input
                  value={dialog.form.categoria}
                  onChange={(e) => setCampo('categoria', e.target.value)}
                  placeholder="ex: descricao_imovel"
                  list="categorias-sugeridas"
                />
                <datalist id="categorias-sugeridas">
                  {CATEGORIAS_SUGERIDAS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Descrição</Label>
                <Input
                  value={dialog.form.descricao}
                  onChange={(e) => setCampo('descricao', e.target.value)}
                  placeholder="Quando usar este bloco"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Conteúdo * — use {'{{ campo }}'} para as variáveis
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-osg-700"
                  onClick={() => setConteudoExpandido((v) => !v)}
                >
                  {conteudoExpandido ? (
                    <>
                      <Minimize2 className="h-3.5 w-3.5 mr-1" />
                      Recolher
                    </>
                  ) : (
                    <>
                      <Maximize2 className="h-3.5 w-3.5 mr-1" />
                      Expandir
                    </>
                  )}
                </Button>
              </div>
              <EditorConteudoModelo
                value={dialog.form.conteudo}
                onChange={(v) => setCampo('conteudo', v)}
                minHeight={conteudoExpandido ? '60vh' : '11rem'}
                maxHeight={conteudoExpandido ? '70vh' : '24rem'}
                className="transition-all duration-300"
                placeholder="Um imóvel rural com área de {{ area }} ({{ areaExtenso }}), denominado {{ denominacao }}…"
              />
              <div className="flex items-center gap-1 flex-wrap min-h-[20px]">
                {camposDetectados.length > 0 ? (
                  <>
                    <span className="text-[10px] text-muted-foreground">Campos detectados:</span>
                    {camposDetectados.map((c) => (
                      <code key={c} className="text-[10px] bg-osg-50 text-osg-700 rounded px-1 py-0.5">{c}</code>
                    ))}
                  </>
                ) : (
                  <span className="text-[10px] text-muted-foreground italic">
                    Nenhum campo ainda — escreva {'{{ nome_do_campo }}'} para inserir variáveis.
                  </span>
                )}
              </div>
            </div>

            {dialog.form.id && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Motivo da alteração (registrado se o conteúdo mudar)
                </Label>
                <Input
                  value={dialog.form.changelog}
                  onChange={(e) => setCampo('changelog', e.target.value)}
                  placeholder="ex: ajuste de redação da cláusula de valor"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialog({ open: false, form: FORM_VAZIO })}>
                Cancelar
              </Button>
              <Button
                onClick={handleSalvar}
                disabled={!podeSalvar || salvar.isPending}
                className="bg-osg-600 hover:bg-osg-700"
              >
                {salvar.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                {dialog.form.id ? 'Salvar' : 'Criar bloco'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </OsgLayout>
  );
};

export default BibliotecaModelos;
