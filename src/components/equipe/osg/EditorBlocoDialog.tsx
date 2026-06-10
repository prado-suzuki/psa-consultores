import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/equipe/osg/OsgDialog';
import { EditorConteudoModelo } from '@/components/equipe/osg/EditorConteudoModelo';
import { Loader2, Maximize2, Minimize2, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { extrairCampos, LABEL_TIPO_BLOCO, TIPOS_BLOCO, type TipoBloco } from '@/lib/templates';
import { useFlags, useSalvarBloco, type BlocoComVersao } from '@/hooks/useBibliotecaModelos';

interface FormState {
  id?: string;
  nome: string;
  tipo: TipoBloco;
  categoria: string;
  descricao: string;
  conteudo: string;
  changelog: string;
  flagIds: string[];
}

const FORM_VAZIO: FormState = { nome: '', tipo: 'livre', categoria: '', descricao: '', conteudo: '', changelog: '', flagIds: [] };

// Sugestões de categoria (livre): espelham as do modelo de composição documental.
const CATEGORIAS_SUGERIDAS = ['preambulo', 'capital', 'administracao', 'cessao', 'causa_mortis', 'descricao_imovel', 'outros'];

// O que escrever no conteúdo conforme o tipo — a numeração é resolvida na composição.
const DICA_POR_TIPO: Record<TipoBloco, string | null> = {
  capitulo: 'Escreva só o título do capítulo — "CAPÍTULO I/II/…" entra automaticamente pela posição no documento.',
  clausula: 'Escreva só o caput, sem "CLÁUSULA …:" — a numeração é automática pela ordem no documento.',
  paragrafo: 'Escreva só o texto, sem "Parágrafo …:" — vira "Parágrafo Único" ou recebe o ordinal conforme a composição.',
  livre: null,
};

function formDeBloco(b: BlocoComVersao): FormState {
  return {
    id: b.id,
    nome: b.nome,
    tipo: (b.tipo as TipoBloco) ?? 'livre',
    categoria: b.categoria ?? '',
    descricao: b.descricao ?? '',
    conteudo: b.versao_atual?.conteudo ?? '',
    changelog: '',
    flagIds: b.flag_ids,
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Quando informado, o dialog abre em modo edição; senão, criação. */
  bloco?: BlocoComVersao | null;
  /** Chamado após salvar com sucesso, com o id do bloco. */
  onSaved?: (blocoId: string) => void;
}

/** Dialog de criação/edição de um bloco da Biblioteca — reutilizável entre telas. */
export function EditorBlocoDialog({ open, onOpenChange, bloco, onSaved }: Props) {
  const { data: flags = [] } = useFlags();
  const salvar = useSalvarBloco();
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [conteudoExpandido, setConteudoExpandido] = useState(false);

  // Reinicia o formulário ao (re)abrir, conforme o bloco em edição (ou vazio).
  useEffect(() => {
    if (open) {
      setForm(bloco ? formDeBloco(bloco) : FORM_VAZIO);
      setConteudoExpandido(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bloco?.id]);

  const setCampo = <K extends keyof FormState>(chave: K, valor: FormState[K]) =>
    setForm((f) => ({ ...f, [chave]: valor }));

  const alternarFlag = (flagId: string) =>
    setForm((f) => ({
      ...f,
      flagIds: f.flagIds.includes(flagId) ? f.flagIds.filter((id) => id !== flagId) : [...f.flagIds, flagId],
    }));

  const camposDetectados = useMemo(() => extrairCampos(form.conteudo), [form.conteudo]);
  const podeSalvar = form.nome.trim().length > 0 && form.conteudo.trim().length > 0;

  const handleSalvar = async () => {
    const { bloco: salvo } = await salvar.mutateAsync({
      id: form.id,
      nome: form.nome.trim(),
      tipo: form.tipo,
      categoria: form.categoria.trim() || null,
      descricao: form.descricao.trim() || null,
      conteudo: form.conteudo,
      changelog: form.changelog.trim() || null,
      flagIds: form.flagIds,
    });
    onOpenChange(false);
    onSaved?.(salvo.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'overflow-y-auto transition-all duration-300',
          conteudoExpandido ? 'max-w-[95vw] w-[95vw] h-[90vh] max-h-[90vh]' : 'max-w-2xl max-h-[90vh]',
        )}
      >
        <DialogHeader>
          <DialogTitle>{form.id ? 'Editar bloco' : 'Novo bloco'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Nome *</Label>
              <Input
                value={form.nome}
                onChange={(e) => setCampo('nome', e.target.value)}
                placeholder="ex: Descrição de imóvel — propriedade exclusiva"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setCampo('tipo', v as TipoBloco)}>
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
          {DICA_POR_TIPO[form.tipo] && (
            <p className="text-xs text-osg-700 bg-osg-50 rounded-md px-2.5 py-1.5 -mt-2">
              {DICA_POR_TIPO[form.tipo]}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Categoria</Label>
              <Input
                value={form.categoria}
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
                value={form.descricao}
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
              value={form.conteudo}
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

          {flags.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Flag className="h-3 w-3" /> Flags de composição
              </Label>
              <p className="text-[11px] text-muted-foreground -mt-0.5">
                Com flags marcadas, o bloco só entra no documento quando TODAS estiverem ativas na
                geração (ex.: tipo da empresa selecionada). Sem flags, vale o obrigatório do modelo.
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {flags.map((f) => {
                  const marcada = form.flagIds.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      title={f.descricao ?? undefined}
                      onClick={() => alternarFlag(f.id)}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                        marcada
                          ? 'border-osg-600 bg-osg-100 text-osg-700'
                          : 'border-border bg-background text-muted-foreground hover:border-osg-300 hover:text-osg-700',
                      )}
                    >
                      {f.nome}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {form.id && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Motivo da alteração (registrado se o conteúdo mudar)
              </Label>
              <Input
                value={form.changelog}
                onChange={(e) => setCampo('changelog', e.target.value)}
                placeholder="ex: ajuste de redação da cláusula de valor"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSalvar}
              disabled={!podeSalvar || salvar.isPending}
              className="bg-osg-600 hover:bg-osg-700"
            >
              {salvar.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {form.id ? 'Salvar' : 'Criar bloco'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
