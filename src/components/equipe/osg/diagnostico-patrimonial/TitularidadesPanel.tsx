import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, Plus, Pencil, X, Copy, Star } from 'lucide-react';
import { toast } from 'sonner';
import { FRACAO_STEP, clampFracaoInput } from '@/components/equipe/osg/diagnostico-patrimonial/fracaoUtils';
import { validarFormulario } from '@/lib/osg/validacaoFormulario';
import { fieldCls, FieldSection } from '@/components/equipe/osg/formKit';
import {
  useTitularidadesByMatricula,
  useTitularidadesByBem,
  useUpsertTitularidade,
  useDeleteTitularidade,
  useSetIntegralizador,
  titularidadeAnchorValues,
  type TitularidadeAnchor,
  type TitularidadeRow,
  type TitularidadeEnriched,
} from '@/hooks/useDiagnosticoPatrimonial';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';

type TipoTitularidade = 'FATO' | 'DIREITO';

const TIPO_TITULARIDADE: Record<TipoTitularidade, { code: string; label: string }> = {
  FATO: { code: 'FT', label: 'Propriedade de Fato' },
  DIREITO: { code: 'DT', label: 'Propriedade de Direito' },
};

interface TitularidadesPanelProps {
  anchor: TitularidadeAnchor;
  pessoasCliente: PessoaRow[];
  // Quando true, impede remover o último titular (regra da matrícula: o titular
  // define o cliente). Para titularidade ancorada em bem é dispensável — o bem
  // já tem cliente próprio.
  requireAtLeastOne?: boolean;
}

export function TitularidadesPanel({ anchor, pessoasCliente, requireAtLeastOne = false }: TitularidadesPanelProps) {
  const matriculaQuery = useTitularidadesByMatricula(anchor.kind === 'matricula' ? anchor.id : null);
  const bemQuery = useTitularidadesByBem(anchor.kind === 'bem' ? anchor.id : null);
  const { data: titularidades = [], isLoading } = anchor.kind === 'matricula' ? matriculaQuery : bemQuery;
  const setIntegralizador = useSetIntegralizador();

  if (isLoading) {
    return <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>;
  }

  const fato = titularidades.filter((t) => t.tipo === 'FATO');
  const direito = titularidades.filter((t) => t.tipo !== 'FATO');
  const totalTitulares = titularidades.length;

  // Integralizador é "um por imóvel" (entre FATO e DIREITO): alterna o alvo e a
  // mutation limpa os demais da âncora. Só faz sentido com mais de um titular.
  const toggleIntegralizador = (t: TitularidadeRow) =>
    setIntegralizador.mutate({ anchor, titularidadeId: t.id, value: !t.integralizador });

  return (
    <div>
      <TitularBucket
        number="01"
        anchor={anchor}
        tipo="FATO"
        titularidades={fato}
        pessoasCliente={pessoasCliente}
        totalTitulares={totalTitulares}
        requireAtLeastOne={requireAtLeastOne}
        onToggleIntegralizador={toggleIntegralizador}
        integralizadorPending={setIntegralizador.isPending}
      />
      <TitularBucket
        number="02"
        anchor={anchor}
        tipo="DIREITO"
        titularidades={direito}
        pessoasCliente={pessoasCliente}
        totalTitulares={totalTitulares}
        requireAtLeastOne={requireAtLeastOne}
        copySource={fato}
        onToggleIntegralizador={toggleIntegralizador}
        integralizadorPending={setIntegralizador.isPending}
      />
    </div>
  );
}

interface TitularBucketProps {
  number: string;
  anchor: TitularidadeAnchor;
  tipo: TipoTitularidade;
  titularidades: TitularidadeEnriched[];
  pessoasCliente: PessoaRow[];
  totalTitulares: number;
  requireAtLeastOne: boolean;
  // Quando presente (seção PD), habilita o botão de copiar titulares da PT.
  copySource?: TitularidadeEnriched[];
  onToggleIntegralizador: (t: TitularidadeRow) => void;
  integralizadorPending: boolean;
}

function TitularBucket({
  number, anchor, tipo, titularidades, pessoasCliente, totalTitulares, requireAtLeastOne, copySource,
  onToggleIntegralizador, integralizadorPending,
}: TitularBucketProps) {
  const upsert = useUpsertTitularidade();
  const deleteMutation = useDeleteTitularidade();
  const { code, label } = TIPO_TITULARIDADE[tipo];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<{ titular_pessoa_id: string; fracao: string }>({
    titular_pessoa_id: '', fracao: '',
  });

  const startEdit = (t: TitularidadeRow) => {
    setAdding(false);
    setEditingId(t.id);
    setDraft({
      titular_pessoa_id: t.titular_pessoa_id,
      fracao: t.fracao != null ? String(t.fracao) : '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAdding(false);
    setDraft({ titular_pessoa_id: '', fracao: '' });
  };

  const handleSave = () => {
    const fracaoDigitada = draft.fracao.trim();
    const fracaoParsed = fracaoDigitada ? Number(fracaoDigitada) : null;
    // Mesma trilha de falha dos modais do módulo (@/lib/osg/validacaoFormulario):
    // avisa o que falta e leva o foco ao campo, em vez de só piscar um toast.
    const ok = validarFormulario([
      { invalido: !draft.titular_pessoa_id, mensagem: 'Selecione o titular.', campo: 'titularidade_titular' },
      { invalido: fracaoParsed != null && Number.isNaN(fracaoParsed), mensagem: 'A fração digitada não é um número.', campo: 'titularidade_fracao' },
      { invalido: fracaoParsed != null && !Number.isNaN(fracaoParsed) && (fracaoParsed <= 0 || fracaoParsed > 100), mensagem: 'A fração deve estar entre 0 e 100.', campo: 'titularidade_fracao' },
    ]);
    if (!ok) return;
    const fracaoNum: number | null = fracaoParsed;

    const original = editingId ? titularidades.find((t) => t.id === editingId) ?? null : null;

    upsert.mutate(
      {
        values: {
          ...titularidadeAnchorValues(anchor),
          titular_pessoa_id: draft.titular_pessoa_id,
          tipo,
          fracao: fracaoNum,
        },
        original,
      },
      { onSuccess: cancelEdit },
    );
  };

  const handleCopyFromPT = async () => {
    if (!copySource) return;
    const jaPresentes = new Set(titularidades.map((t) => t.titular_pessoa_id));
    const aCopiar = copySource.filter((t) => !jaPresentes.has(t.titular_pessoa_id));
    if (aCopiar.length === 0) {
      toast.info('Nenhum titular novo da FT para copiar.');
      return;
    }
    try {
      for (const t of aCopiar) {
        await upsert.mutateAsync({
          values: {
            ...titularidadeAnchorValues(anchor),
            titular_pessoa_id: t.titular_pessoa_id,
            tipo,
            fracao: t.fracao,
          },
        });
      }
    } catch {
      // Erros individuais já são notificados pelo hook.
    }
  };

  const comFracao = titularidades.filter((t) => t.fracao != null);
  const totalFracao = comFracao.reduce((sum, t) => sum + Number(t.fracao), 0);
  const formOpen = adding || editingId != null;
  // Só protege o último titular quando a âncora exige ao menos um (matrícula).
  const canDelete = !requireAtLeastOne || totalTitulares > 1;

  return (
    <FieldSection
      number={number}
      title={label}
      badge={
        <span className="inline-flex h-5 items-center rounded bg-osg-500 px-1.5 text-[10px] font-bold font-mono text-white">
          {code}
        </span>
      }
      hint={comFracao.length > 0 ? (
        <span className={totalFracao > 100 ? 'tabular-nums text-destructive' : 'tabular-nums'}>
          {totalFracao}%{totalFracao > 100 && ' • excede 100%'}
        </span>
      ) : undefined}
      actions={copySource ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 gap-1.5 text-xs text-osg-moss bg-osg-moss/10 hover:bg-osg-moss/15"
          onClick={handleCopyFromPT}
          disabled={upsert.isPending || copySource.length === 0}
        >
          <Copy className="h-3.5 w-3.5" />
          Copiar da FT
        </Button>
      ) : undefined}
    >
      <div className="space-y-2.5">
        {titularidades.length === 0 && !formOpen ? (
          <p className="text-sm text-muted-foreground">Nenhum titular.</p>
        ) : (
          <div className="space-y-1">
            {titularidades.map((t) => (
              <TitularidadeRowItem
                key={t.id}
                titularidade={t}
                isEditing={editingId === t.id}
                canDelete={canDelete}
                showIntegralizador={totalTitulares > 1}
                integralizadorPending={integralizadorPending}
                onToggleIntegralizador={() => onToggleIntegralizador(t)}
                onEdit={() => startEdit(t)}
                onDelete={() => deleteMutation.mutate(t)}
              />
            ))}
          </div>
        )}

        {formOpen ? (
          <div className="rounded-md border border-osg-moss/20 bg-osg-moss/[0.04] p-3 space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select
                value={draft.titular_pessoa_id || undefined}
                onValueChange={(v) => setDraft((p) => ({ ...p, titular_pessoa_id: v }))}
              >
                <SelectTrigger data-campo="titularidade_titular" className={`${fieldCls} flex-1`}>
                  <SelectValue placeholder={pessoasCliente.length ? 'Selecione o titular...' : 'Cadastre uma pessoa na Qualificação das Partes'} />
                </SelectTrigger>
                <SelectContent>
                  {pessoasCliente.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.denominacao} <span className="text-xs text-muted-foreground">({p.tipo_pessoa})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                data-campo="titularidade_fracao"
                type="number"
                step={FRACAO_STEP}
                min="0"
                max="100"
                value={draft.fracao}
                onChange={(e) => setDraft((p) => ({ ...p, fracao: clampFracaoInput(e.target.value) }))}
                placeholder="Fração %"
                className={`${fieldCls} font-mono sm:w-28`}
              />
              <div className="flex gap-1.5">
                <Button type="button" size="sm" variant="ghost" className="h-9" onClick={cancelEdit}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-9 gap-1.5 bg-osg-moss text-white hover:bg-osg-moss/90"
                  onClick={handleSave}
                  disabled={upsert.isPending}
                >
                  {upsert.isPending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Plus className="h-3.5 w-3.5" />}
                  {editingId ? 'Salvar' : 'Adicionar'}
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Deixe a fração vazia quando a composse for indefinida.
            </p>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-full justify-start gap-1.5 border border-dashed border-osg-200 text-muted-foreground hover:text-osg-700"
            onClick={() => { setEditingId(null); setDraft({ titular_pessoa_id: '', fracao: '' }); setAdding(true); }}
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar titular
          </Button>
        )}
      </div>
    </FieldSection>
  );
}

interface TitularidadeRowItemProps {
  titularidade: TitularidadeEnriched;
  isEditing: boolean;
  canDelete: boolean;
  // Só mostra a estrela de integralizador quando há mais de um titular no imóvel.
  showIntegralizador: boolean;
  integralizadorPending: boolean;
  onToggleIntegralizador: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function TitularidadeRowItem({
  titularidade, isEditing, canDelete, showIntegralizador, integralizadorPending,
  onToggleIntegralizador, onEdit, onDelete,
}: TitularidadeRowItemProps) {
  const isIntegralizador = titularidade.integralizador;
  return (
    <div
      className={`group flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${isEditing ? 'bg-osg-50 border-osg-200' : 'bg-card hover:bg-muted/40'}`}
    >
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <span className="text-sm font-medium truncate">{titularidade.titular_denominacao}</span>
        {titularidade.titular_tipo && (
          <span className="shrink-0 text-[11px] text-muted-foreground">{titularidade.titular_tipo}</span>
        )}
        {isIntegralizador && (
          <span className="shrink-0 rounded bg-osg-moss/10 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-osg-moss">
            Integralizador
          </span>
        )}
      </div>
      {showIntegralizador && (
        <Button
          size="icon"
          variant="ghost"
          className={`h-7 w-7 shrink-0 transition-opacity ${isIntegralizador ? 'text-osg-moss' : 'text-muted-foreground/40 opacity-0 group-hover:opacity-100 focus-within:opacity-100'}`}
          disabled={integralizadorPending}
          title={isIntegralizador
            ? 'Integralizador (lidera a descrição do imóvel) — clique para desmarcar'
            : 'Marcar como integralizador (lidera a descrição; os demais viram a área remanescente)'}
          onClick={onToggleIntegralizador}
        >
          <Star className={`h-3.5 w-3.5 ${isIntegralizador ? 'fill-osg-moss' : ''}`} />
        </Button>
      )}
      <span
        className={`shrink-0 text-sm font-mono tabular-nums ${titularidade.fracao != null ? 'font-medium text-foreground' : 'text-muted-foreground/60'}`}
      >
        {titularidade.fracao != null ? `${titularidade.fracao}%` : '—'}
      </span>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        {!canDelete ? (
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground"
          disabled
          title="Precisa de ao menos um titular"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      ) : (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
            <X className="h-3.5 w-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover titularidade?</AlertDialogTitle>
            <AlertDialogDescription>
              Remover {titularidade.titular_denominacao} ({TIPO_TITULARIDADE[titularidade.tipo as TipoTitularidade]?.code ?? titularidade.tipo}
              {titularidade.fracao != null ? `, ${titularidade.fracao}%` : ''}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={onDelete}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      )}
      </div>
    </div>
  );
}
