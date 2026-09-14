import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';

import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { AjudaDoCampo } from '@/components/equipe/osg/ComAjuda';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { expressaoDoQuorum, type BaseQuorum, type TipoQuorum } from '@/lib/acordoQuotistasPadrao';
import type { CampoDoAcordo, GrupoDoAcordo } from '@/lib/acordoGrupos';

/** O que o modal edita: os campos do cabeçalho mais as três listas. */
export interface ValoresDoAcordo extends Record<string, unknown> {
  quoruns: { materia: string; chave?: string | null; tipo: TipoQuorum; percentual?: number | null; base: BaseQuorum }[];
  ramos: { nome: string; rotulo: 'ramo' | 'descendentes' }[];
  ordemPreferencia: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grupo: GrupoDoAcordo;
  valores: ValoresDoAcordo;
  onSalvar: (valores: ValoresDoAcordo) => Promise<unknown>;
  salvando: boolean;
}

const ROTULO = 'flex h-5 items-center gap-1.5';

/** Fora dos três controles próprios, o modal ainda não desenha estes. */
const ESPERANDO_SELETOR_DE_PESSOA = ['signatarios', 'sociedades', 'representante_pessoa_id'];

/**
 * Um grupo do Acordo de Quotistas, aberto para edição.
 *
 * LISTA MAIS MODAL, e não formulário corrido: é o modelo de interface decidido
 * para a governança, e a crítica ao mockup foi exatamente essa, que ele parecia
 * um formulário de 32 campos com títulos no meio. Aqui o consultor fecha um
 * assunto de cada vez, como fecha uma cláusula de cada vez no documento.
 *
 * A PRÉVIA DA CLÁUSULA fica dentro do grupo que a alimenta, e não numa segunda
 * coluna: é onde ela muda decisão. No grupo dos quóruns, cada linha mostra a
 * frase que vai sair, "¾ (três quartos) dos presentes", enquanto o consultor
 * escolhe o tipo e a base.
 */
export function AcordoGrupoModal({
  open, onOpenChange, grupo, valores, onSalvar, salvando,
}: Props) {
  const [form, setForm] = useState<ValoresDoAcordo>(valores);

  useEffect(() => {
    if (open) setForm(valores);
  }, [open, valores]);

  const mexer = (campo: string, valor: unknown) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  const visivel = (c: CampoDoAcordo) => !c.dependeDe || form[c.dependeDe] === true;

  const salvar = async () => {
    await onSalvar(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{grupo.titulo}</DialogTitle>
          <p className="text-sm text-muted-foreground">{grupo.resumo}</p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {grupo.campos.filter(visivel).map((c) => (
            <div key={c.campo} className="space-y-1.5">
              <Label htmlFor={`ac-${c.campo}`} className={ROTULO}>
                {c.rotulo}
                {c.desceAoContrato && (
                  <Badge variant="outline" className="border-osg-200 bg-osg-50 text-[10px] text-osg-700">
                    também no contrato
                  </Badge>
                )}
                {c.ajuda && <AjudaDoCampo texto={c.ajuda} />}
              </Label>

              {c.tipo === 'booleano' && (
                <div className="flex h-9 items-center">
                  <Switch
                    id={`ac-${c.campo}`}
                    checked={form[c.campo] === true}
                    onCheckedChange={(v) => mexer(c.campo, v)}
                  />
                </div>
              )}

              {(c.tipo === 'texto' || c.tipo === 'numero') && (
                <Input
                  id={`ac-${c.campo}`}
                  type={c.tipo === 'numero' ? 'number' : 'text'}
                  min={c.tipo === 'numero' ? 1 : undefined}
                  value={(form[c.campo] as string | number | null) ?? ''}
                  onChange={(e) => mexer(
                    c.campo,
                    c.tipo === 'numero'
                      ? (e.target.value === '' ? null : Number(e.target.value))
                      : e.target.value,
                  )}
                />
              )}

              {c.tipo === 'escolha' && (
                <Select
                  value={(form[c.campo] as string) ?? ''}
                  onValueChange={(v) => mexer(c.campo, v)}
                >
                  <SelectTrigger id={`ac-${c.campo}`} aria-label={c.rotulo}>
                    <SelectValue placeholder="Escolha" />
                  </SelectTrigger>
                  <SelectContent>
                    {c.opcoes?.map((o) => (
                      <SelectItem key={o.valor} value={o.valor}>{o.rotulo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {c.tipo === 'multi' && (
                <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-md border p-3">
                  {c.opcoes?.map((o) => {
                    const marcados = (form[c.campo] as string[] | null) ?? [];
                    return (
                      <label key={o.valor} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={marcados.includes(o.valor)}
                          onCheckedChange={(v) => mexer(
                            c.campo,
                            v ? [...marcados, o.valor] : marcados.filter((x) => x !== o.valor),
                          )}
                        />
                        {o.rotulo}
                      </label>
                    );
                  })}
                </div>
              )}

              {c.campo === 'quoruns' && (
                <ListaDeQuoruns
                  linhas={form.quoruns}
                  mexer={(linhas) => mexer('quoruns', linhas)}
                />
              )}

              {c.campo === 'ramos' && (
                <ListaDeRamos linhas={form.ramos} mexer={(l) => mexer('ramos', l)} />
              )}

              {c.campo === 'ordemPreferencia' && (
                <ListaOrdenada
                  itens={form.ordemPreferencia}
                  mexer={(l) => mexer('ordemPreferencia', l)}
                  exemplo="Holding, descendentes dos signatários, demais quotistas"
                />
              )}

              {ESPERANDO_SELETOR_DE_PESSOA.includes(c.campo) && (
                <p className="rounded-md border border-dashed border-osg-300 bg-osg-50/40 px-3 py-2.5 text-xs text-muted-foreground">
                  Este campo aponta para pessoas já cadastradas, e o seletor entra na
                  próxima etapa. O resto do grupo já salva.
                </p>
              )}

              {c.campo === 'usufruto' && (
                <p className="rounded-md border border-dashed border-osg-300 bg-osg-50/40 px-3 py-2.5 text-xs text-muted-foreground">
                  A marcação é quota a quota, no quadro societário do cliente, e entra
                  junto do seletor de pessoas.
                </p>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* --- Os três controles próprios --------------------------------------------- */

const TIPOS: { valor: TipoQuorum; rotulo: string }[] = [
  { valor: 'maioria', rotulo: 'Maioria' },
  { valor: 'percentual', rotulo: 'Percentual' },
  { valor: 'unanimidade', rotulo: 'Todos' },
];

const BASES: { valor: BaseQuorum; rotulo: string }[] = [
  { valor: 'presentes', rotulo: 'dos presentes' },
  { valor: 'capital', rotulo: 'do capital' },
];

function ListaDeQuoruns({
  linhas, mexer,
}: { linhas: ValoresDoAcordo['quoruns']; mexer: (l: ValoresDoAcordo['quoruns']) => void }) {
  const trocar = (i: number, campo: string, valor: unknown) => {
    const nova = [...linhas];
    nova[i] = { ...nova[i], [campo]: valor };
    // O CHECK da tabela recusa percentual em maioria e unanimidade. Limpar aqui
    // evita que o consultor monte um estado que o banco vai devolver como erro.
    if (campo === 'tipo' && valor !== 'percentual') nova[i].percentual = null;
    mexer(nova);
  };

  return (
    <div className="space-y-2">
      {linhas.map((q, i) => (
        <div key={q.chave ?? `${q.materia}-${i}`} className="rounded-md border p-3">
          <div className="flex items-start justify-between gap-2">
            <Input
              className="h-8 flex-1 text-sm"
              value={q.materia}
              aria-label={`Matéria do quórum ${i + 1}`}
              onChange={(e) => trocar(i, 'materia', e.target.value)}
            />
            {!q.chave && (
              <Button
                size="icon" variant="ghost" className="h-8 w-8"
                aria-label={`Tirar ${q.materia || 'quórum'}`}
                onClick={() => mexer(linhas.filter((_, x) => x !== i))}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Select value={q.tipo} onValueChange={(v) => trocar(i, 'tipo', v)}>
              <SelectTrigger className="h-8 w-32 text-sm" aria-label={`Tipo do quórum ${i + 1}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => <SelectItem key={t.valor} value={t.valor}>{t.rotulo}</SelectItem>)}
              </SelectContent>
            </Select>

            {q.tipo === 'percentual' && (
              <Input
                type="number" min={1} max={100} step="0.01"
                className="h-8 w-24 text-sm"
                aria-label={`Percentual do quórum ${i + 1}`}
                value={q.percentual ?? ''}
                onChange={(e) => trocar(i, 'percentual', e.target.value === '' ? null : Number(e.target.value))}
              />
            )}

            <Select value={q.base} onValueChange={(v) => trocar(i, 'base', v)}>
              <SelectTrigger className="h-8 w-36 text-sm" aria-label={`Base do quórum ${i + 1}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BASES.map((b) => <SelectItem key={b.valor} value={b.valor}>{b.rotulo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* A prévia, onde ela muda decisão: a frase que vai sair no documento. */}
          <p className="mt-2 text-xs text-muted-foreground">
            No acordo:{' '}
            <span className="font-medium text-foreground">{expressaoDoQuorum(q)}</span>
          </p>
        </div>
      ))}

      <Button
        variant="ghost" size="sm"
        className="h-8 gap-1 border border-dashed border-border px-2 text-xs font-normal text-osg-700 hover:border-osg-moss hover:bg-osg-50 hover:text-osg-moss"
        onClick={() => mexer([...linhas, { materia: '', tipo: 'maioria', base: 'presentes' }])}
      >
        <Plus className="h-3 w-3" /> Outro quórum
      </Button>
    </div>
  );
}

function ListaDeRamos({
  linhas, mexer,
}: { linhas: ValoresDoAcordo['ramos']; mexer: (l: ValoresDoAcordo['ramos']) => void }) {
  return (
    <div className="space-y-2">
      {linhas.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            className="h-8 flex-1 text-sm" value={r.nome}
            aria-label={`Nome do ramo ${i + 1}`}
            onChange={(e) => {
              const nova = [...linhas];
              nova[i] = { ...nova[i], nome: e.target.value };
              mexer(nova);
            }}
          />
          <Select
            value={r.rotulo}
            onValueChange={(v) => {
              const nova = [...linhas];
              nova[i] = { ...nova[i], rotulo: v as 'ramo' | 'descendentes' };
              mexer(nova);
            }}
          >
            <SelectTrigger className="h-8 w-48 text-sm" aria-label={`Rótulo do ramo ${i + 1}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ramo">RAMO [nome]</SelectItem>
              <SelectItem value="descendentes">DESCENDENTES DE [nome]</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="icon" variant="ghost" className="h-8 w-8"
            aria-label={`Tirar ${r.nome || 'ramo'}`}
            onClick={() => mexer(linhas.filter((_, x) => x !== i))}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button
        variant="ghost" size="sm"
        className="h-8 gap-1 border border-dashed border-border px-2 text-xs font-normal text-osg-700 hover:border-osg-moss hover:bg-osg-50 hover:text-osg-moss"
        onClick={() => mexer([...linhas, { nome: '', rotulo: 'ramo' }])}
      >
        <Plus className="h-3 w-3" /> Outro ramo
      </Button>
    </div>
  );
}

function ListaOrdenada({
  itens, mexer, exemplo,
}: { itens: string[]; mexer: (l: string[]) => void; exemplo: string }) {
  return (
    <div className="space-y-2">
      {itens.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-5 text-right text-xs tabular-nums text-muted-foreground">{i + 1}.</span>
          <Input
            className="h-8 flex-1 text-sm" value={v}
            aria-label={`Posição ${i + 1} da preferência`}
            onChange={(e) => {
              const nova = [...itens];
              nova[i] = e.target.value;
              mexer(nova);
            }}
          />
          <Button
            size="icon" variant="ghost" className="h-8 w-8"
            aria-label={`Tirar posição ${i + 1}`}
            onClick={() => mexer(itens.filter((_, x) => x !== i))}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">Por exemplo: {exemplo}.</p>
      <Button
        variant="ghost" size="sm"
        className="h-8 gap-1 border border-dashed border-border px-2 text-xs font-normal text-osg-700 hover:border-osg-moss hover:bg-osg-50 hover:text-osg-moss"
        onClick={() => mexer([...itens, ''])}
      >
        <Plus className="h-3 w-3" /> Mais uma posição
      </Button>
    </div>
  );
}
