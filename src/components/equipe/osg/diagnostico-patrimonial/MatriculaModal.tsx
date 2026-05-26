import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { RequiredMark } from '@/components/ui/required-mark';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, Plus, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { UF_STATES } from '@/components/equipe/client-form/constants';
import DateFieldWithInput from '@/components/equipe/client-form/DateFieldWithInput';
import { CartorioSelect } from './CartorioSelect';
import {
  useUpsertMatricula,
  useTitularidadesByMatricula,
  useUpsertTitularidade,
  useDeleteTitularidade,
  useImpedimentosByMatricula,
  useUpsertImpedimento,
  useDeleteImpedimento,
  type MatriculaRow,
  type TitularidadeRow,
  type TitularidadeEnriched,
  type ImpedimentoRow,
  type ImpedimentoEnriched,
  type TitularInicial,
} from '@/hooks/useDiagnosticoPatrimonial';
import type { PessoaRow } from '@/hooks/useQuadroSocietario';

const TIPO_TITULARIDADE_OPTIONS = [
  { value: 'FATO', label: 'Posse de fato' },
  { value: 'DIREITO', label: 'Propriedade plena' },
  { value: 'USUFRUTO', label: 'Usufruto' },
  { value: 'NUE_PROP', label: 'Nua propriedade' },
];

const TIPO_IMPEDIMENTO_OPTIONS = [
  'Hipoteca', 'Penhora', 'Arrolamento Fiscal', 'Indisponibilidade',
  'Servidão', 'Reserva Legal', 'APP', 'Usufruto', 'Cláusula de Inalienabilidade',
  'Cessão Fiduciária', 'Outro',
];

const TIPO_EXPLORACAO_OPTIONS = [
  'Exploração Direta', 'Arrendamento', 'Parceria', 'Comodato', 'Posse', 'Outro',
];

const GEORREFERENCIAMENTO_OPTIONS = [
  'Sim', 'Não', 'Parcial', 'Em processo',
];

const UNIDADE_AREA_OPTIONS = ['ha', 'm²'];

interface MatriculaModalProps {
  open: boolean;
  // Quando null, a matrícula é cadastrada avulsa (órfã) a partir do Controle de Matrículas.
  bemId: string | null;
  // Tipo do bem para condicionar campos de imóvel rural. null = origem avulsa (mostra todos).
  bemTipo: string | null;
  matricula: MatriculaRow | null;
  pessoasCliente: PessoaRow[];
  matriculasDoBem: MatriculaRow[];
  onClose: () => void;
}

type DraftMatricula = {
  numero: string;
  matricula_anterior_id: string;
  matricula_anterior_texto: string;
  livro: string;
  folha: string;
  data_matricula: string;
  cartorio_id: string;
  municipio_imovel: string;
  uf_imovel: string;
  area_documento: string;
  area_real: string;
  area_explorada: string;
  area_unidade: string;
  georreferenciado: string;
  georref_prejudica_transferencia: boolean;
  tipo_exploracao_posse: string;
  descricao_psa_completa: string;
  confrontacoes_texto: string;
  origem_descricao: string;
};

const emptyDraft = (): DraftMatricula => ({
  numero: '',
  matricula_anterior_id: '',
  matricula_anterior_texto: '',
  livro: '',
  folha: '',
  data_matricula: '',
  cartorio_id: '',
  municipio_imovel: '',
  uf_imovel: '',
  area_documento: '',
  area_real: '',
  area_explorada: '',
  area_unidade: 'ha',
  georreferenciado: '',
  georref_prejudica_transferencia: false,
  tipo_exploracao_posse: '',
  descricao_psa_completa: '',
  confrontacoes_texto: '',
  origem_descricao: '',
});

const fromMatricula = (m: MatriculaRow): DraftMatricula => ({
  numero: m.numero ?? '',
  matricula_anterior_id: m.matricula_anterior_id ?? '',
  matricula_anterior_texto: m.matricula_anterior_texto ?? '',
  livro: m.livro ?? '',
  folha: m.folha ?? '',
  data_matricula: m.data_matricula ?? '',
  cartorio_id: m.cartorio_id ?? '',
  municipio_imovel: m.municipio_imovel ?? '',
  uf_imovel: m.uf_imovel ?? '',
  area_documento: m.area_documento != null ? String(m.area_documento) : '',
  area_real: m.area_real != null ? String(m.area_real) : '',
  area_explorada: m.area_explorada != null ? String(m.area_explorada) : '',
  area_unidade: m.area_unidade ?? 'ha',
  georreferenciado: m.georreferenciado ?? '',
  georref_prejudica_transferencia: m.georref_prejudica_transferencia ?? false,
  tipo_exploracao_posse: m.tipo_exploracao_posse ?? '',
  descricao_psa_completa: m.descricao_psa_completa ?? '',
  confrontacoes_texto: m.confrontacoes_texto ?? '',
  origem_descricao: m.origem_descricao ?? '',
});

export function MatriculaModal({
  open, bemId, bemTipo, matricula, pessoasCliente, matriculasDoBem, onClose,
}: MatriculaModalProps) {
  const [draft, setDraft] = useState<DraftMatricula>(emptyDraft);
  const [titularInicial, setTitularInicial] = useState<{ titular_pessoa_id: string; tipo: string; fracao: string }>({
    titular_pessoa_id: '', tipo: 'DIREITO', fracao: '',
  });
  const upsert = useUpsertMatricula();
  const isEdit = !!matricula?.id;
  // Sem bem definido (cadastro avulso) mostramos os campos rurais — não há tipo para ocultá-los.
  const isImovelRural = bemTipo === 'IR' || bemTipo == null;
  const semPessoas = pessoasCliente.length === 0;

  useEffect(() => {
    if (!open) return;
    setDraft(matricula ? fromMatricula(matricula) : emptyDraft());
    setTitularInicial({ titular_pessoa_id: '', tipo: 'DIREITO', fracao: '' });
  }, [open, matricula]);

  const setField = <K extends keyof DraftMatricula>(field: K, value: DraftMatricula[K]) => {
    setDraft((p) => ({ ...p, [field]: value }));
  };

  const handleSave = () => {
    if (!draft.numero.trim()) {
      toast.error('Número da matrícula é obrigatório');
      return;
    }
    if (!draft.cartorio_id) {
      toast.error('Selecione o cartório');
      return;
    }
    if (!draft.municipio_imovel.trim()) {
      toast.error('Município do imóvel é obrigatório');
      return;
    }
    if (!draft.uf_imovel) {
      toast.error('UF do imóvel é obrigatória');
      return;
    }
    if (!draft.area_documento.trim() || isNaN(Number(draft.area_documento))) {
      toast.error('Área do documento é obrigatória');
      return;
    }
    if (!draft.area_real.trim() || isNaN(Number(draft.area_real))) {
      toast.error('Área real é obrigatória');
      return;
    }

    const nullify = (v: string) => (v.trim() ? v : null);
    const toNum = (v: string) => (v.trim() && !isNaN(Number(v)) ? Number(v) : null);

    const values = {
      bem_id: bemId ?? (matricula?.bem_id ?? null),
      numero: draft.numero.trim(),
      matricula_anterior_id: draft.matricula_anterior_id || null,
      matricula_anterior_texto: nullify(draft.matricula_anterior_texto),
      livro: nullify(draft.livro),
      folha: nullify(draft.folha),
      data_matricula: nullify(draft.data_matricula),
      cartorio_id: draft.cartorio_id,
      municipio_imovel: draft.municipio_imovel.trim(),
      uf_imovel: draft.uf_imovel,
      area_documento: Number(draft.area_documento),
      area_real: Number(draft.area_real),
      area_explorada: isImovelRural ? toNum(draft.area_explorada) : null,
      area_unidade: draft.area_unidade,
      georreferenciado: isImovelRural ? nullify(draft.georreferenciado) : null,
      georref_prejudica_transferencia: isImovelRural ? draft.georref_prejudica_transferencia : null,
      tipo_exploracao_posse: nullify(draft.tipo_exploracao_posse),
      descricao_psa_completa: nullify(draft.descricao_psa_completa),
      confrontacoes_texto: nullify(draft.confrontacoes_texto),
      origem_descricao: nullify(draft.origem_descricao),
    };

    let titular: TitularInicial | undefined;
    if (!isEdit) {
      if (!titularInicial.titular_pessoa_id) {
        toast.error('Selecione o titular inicial da matrícula');
        return;
      }
      let fracaoNum: number | null = null;
      if (titularInicial.fracao.trim()) {
        const parsed = Number(titularInicial.fracao);
        if (isNaN(parsed) || parsed <= 0 || parsed > 100) {
          toast.error('Fração do titular deve estar entre 0 e 100');
          return;
        }
        fracaoNum = parsed;
      }
      titular = {
        titular_pessoa_id: titularInicial.titular_pessoa_id,
        tipo: titularInicial.tipo,
        fracao: fracaoNum,
      };
    }

    upsert.mutate(
      { values, original: matricula, titular },
      { onSuccess: () => onClose() },
    );
  };

  const matriculasAnterioresPossiveis = matriculasDoBem.filter((m) => m.id !== matricula?.id);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Editar matrícula ${matricula?.numero}` : 'Nova matrícula'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="dados" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="titulares" disabled={!isEdit}>
              Titularidade
            </TabsTrigger>
            <TabsTrigger value="impedimentos" disabled={!isEdit}>
              Impedimentos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Nº da matrícula<RequiredMark />
                </Label>
                <Input
                  value={draft.numero}
                  onChange={(e) => setField('numero', e.target.value)}
                  className="h-9 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Livro</Label>
                <Input
                  value={draft.livro}
                  onChange={(e) => setField('livro', e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Folha</Label>
                <Input
                  value={draft.folha}
                  onChange={(e) => setField('folha', e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Data</Label>
                <DateFieldWithInput
                  value={draft.data_matricula}
                  onChange={(v) => setField('data_matricula', v)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Cartório<RequiredMark />
              </Label>
              <CartorioSelect
                value={draft.cartorio_id}
                onChange={(v) => setField('cartorio_id', v)}
              />
            </div>

            {!isEdit && (
              <>
                <Separator />
                <div>
                  <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">
                    Titular inicial<RequiredMark />
                  </h4>
                  {semPessoas ? (
                    <p className="text-xs text-amber-600">
                      Nenhuma pessoa disponível. Cadastre o titular no Quadro Societário (ou selecione
                      um cliente) antes de criar a matrícula.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">Titular</Label>
                        <Select
                          value={titularInicial.titular_pessoa_id || undefined}
                          onValueChange={(v) => setTitularInicial((p) => ({ ...p, titular_pessoa_id: v }))}
                        >
                          <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {pessoasCliente.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.denominacao} <span className="text-xs text-muted-foreground">({p.tipo_pessoa})</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">Tipo</Label>
                        <Select
                          value={titularInicial.tipo}
                          onValueChange={(v) => setTitularInicial((p) => ({ ...p, tipo: v }))}
                        >
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TIPO_TITULARIDADE_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">Fração (%) — opcional</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={titularInicial.fracao}
                          onChange={(e) => setTitularInicial((p) => ({ ...p, fracao: e.target.value }))}
                          placeholder="ex: 50"
                          className="h-9 font-mono"
                        />
                      </div>
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Toda matrícula precisa de ao menos um titular — é ele que define o cliente.
                    Outros titulares podem ser adicionados depois de salvar.
                  </p>
                </div>
              </>
            )}

            <Separator />

            <div>
              <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Localização do imóvel</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Município<RequiredMark />
                  </Label>
                  <Input
                    value={draft.municipio_imovel}
                    onChange={(e) => setField('municipio_imovel', e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    UF<RequiredMark />
                  </Label>
                  <Select value={draft.uf_imovel || undefined} onValueChange={(v) => setField('uf_imovel', v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {UF_STATES.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Áreas</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Unidade</Label>
                  <Select value={draft.area_unidade} onValueChange={(v) => setField('area_unidade', v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UNIDADE_AREA_OPTIONS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Área documento<RequiredMark />
                  </Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={draft.area_documento}
                    onChange={(e) => setField('area_documento', e.target.value)}
                    className="h-9 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Área real<RequiredMark />
                  </Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={draft.area_real}
                    onChange={(e) => setField('area_real', e.target.value)}
                    className="h-9 font-mono"
                  />
                </div>
                {isImovelRural && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Área explorada</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={draft.area_explorada}
                      onChange={(e) => setField('area_explorada', e.target.value)}
                      className="h-9 font-mono"
                    />
                  </div>
                )}
              </div>
            </div>

            {isImovelRural && (
              <>
                <Separator />
                <div>
                  <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Georreferenciamento</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Status</Label>
                      <Select
                        value={draft.georreferenciado || undefined}
                        onValueChange={(v) => setField('georreferenciado', v)}
                      >
                        <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {GEORREFERENCIAMENTO_OPTIONS.map((o) => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 pb-2">
                      <Switch
                        checked={draft.georref_prejudica_transferencia}
                        onCheckedChange={(v) => setField('georref_prejudica_transferencia', v)}
                      />
                      <Label className="text-sm">Prejudica transferência</Label>
                    </div>
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Tipo de exploração/posse</Label>
                <Select
                  value={draft.tipo_exploracao_posse || undefined}
                  onValueChange={(v) => setField('tipo_exploracao_posse', v)}
                >
                  <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {TIPO_EXPLORACAO_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Matrícula anterior</Label>
                <Select
                  value={draft.matricula_anterior_id || undefined}
                  onValueChange={(v) => setField('matricula_anterior_id', v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={matriculasAnterioresPossiveis.length ? 'Selecione...' : 'Nenhuma'} />
                  </SelectTrigger>
                  <SelectContent>
                    {matriculasAnterioresPossiveis.map((m) => (
                      <SelectItem key={m.id} value={m.id}>Matrícula {m.numero}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Texto da matrícula anterior (caso não esteja cadastrada)
                </Label>
                <Input
                  value={draft.matricula_anterior_texto}
                  onChange={(e) => setField('matricula_anterior_texto', e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Origem (descrição)</Label>
                <Input
                  value={draft.origem_descricao}
                  onChange={(e) => setField('origem_descricao', e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Confrontações</Label>
                <Textarea
                  value={draft.confrontacoes_texto}
                  onChange={(e) => setField('confrontacoes_texto', e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Descrição PSA (completa)</Label>
                <Textarea
                  value={draft.descricao_psa_completa}
                  onChange={(e) => setField('descricao_psa_completa', e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="titulares" className="pt-4">
            {isEdit && matricula && (
              <TitularidadesPanel
                matriculaId={matricula.id}
                pessoasCliente={pessoasCliente}
              />
            )}
          </TabsContent>

          <TabsContent value="impedimentos" className="pt-4">
            {isEdit && matricula && (
              <ImpedimentosPanel
                matriculaId={matricula.id}
                areaUnidade={matricula.area_unidade}
                pessoasCliente={pessoasCliente}
              />
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={upsert.isPending}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={upsert.isPending || (!isEdit && semPessoas)}
            className="gap-1.5"
          >
            {upsert.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEdit ? 'Salvar alterações' : 'Cadastrar matrícula'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Titularidades
// =============================================================================

interface TitularidadesPanelProps {
  matriculaId: string;
  pessoasCliente: PessoaRow[];
}

function TitularidadesPanel({ matriculaId, pessoasCliente }: TitularidadesPanelProps) {
  const { data: titularidades = [], isLoading } = useTitularidadesByMatricula(matriculaId);
  const upsert = useUpsertTitularidade();
  const deleteMutation = useDeleteTitularidade();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ titular_pessoa_id: string; tipo: string; fracao: string }>({
    titular_pessoa_id: '', tipo: 'DIREITO', fracao: '',
  });

  const startEdit = (t: TitularidadeRow) => {
    setEditingId(t.id);
    setDraft({
      titular_pessoa_id: t.titular_pessoa_id,
      tipo: t.tipo,
      fracao: t.fracao != null ? String(t.fracao) : '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({ titular_pessoa_id: '', tipo: 'DIREITO', fracao: '' });
  };

  const handleSave = () => {
    if (!draft.titular_pessoa_id) {
      toast.error('Selecione o titular');
      return;
    }
    let fracaoNum: number | null = null;
    if (draft.fracao.trim()) {
      const parsed = Number(draft.fracao);
      if (isNaN(parsed)) {
        toast.error('Fração inválida');
        return;
      }
      if (parsed <= 0 || parsed > 100) {
        toast.error('Fração deve estar entre 0 e 100');
        return;
      }
      fracaoNum = parsed;
    }

    const original = editingId ? titularidades.find((t) => t.id === editingId) ?? null : null;

    upsert.mutate(
      {
        values: {
          matricula_id: matriculaId,
          titular_pessoa_id: draft.titular_pessoa_id,
          tipo: draft.tipo,
          fracao: fracaoNum,
        },
        original,
      },
      { onSuccess: cancelEdit },
    );
  };

  const totalFracao = titularidades
    .filter((t) => (t.tipo === 'DIREITO' || t.tipo === 'FATO') && t.fracao != null)
    .reduce((sum, t) => sum + Number(t.fracao), 0);

  return (
    <div className="space-y-3">
      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
      ) : titularidades.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhuma titularidade cadastrada para esta matrícula.
        </p>
      ) : (
        <div className="space-y-1.5">
          {titularidades.map((t) => (
            <TitularidadeRowItem
              key={t.id}
              titularidade={t}
              isEditing={editingId === t.id}
              canDelete={titularidades.length > 1}
              onEdit={() => startEdit(t)}
              onDelete={() => deleteMutation.mutate(t)}
            />
          ))}
          <p className="text-xs text-muted-foreground pt-2">
            Total fração (FATO + DIREITO): <span className="font-semibold">{totalFracao}%</span>
            {totalFracao > 100 && <span className="text-destructive ml-2">⚠ Excede 100%</span>}
          </p>
        </div>
      )}

      <div className="rounded-md border border-dashed p-3 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground">
          {editingId ? 'Editar titularidade' : 'Nova titularidade'}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Titular</Label>
            <Select
              value={draft.titular_pessoa_id || undefined}
              onValueChange={(v) => setDraft((p) => ({ ...p, titular_pessoa_id: v }))}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder={pessoasCliente.length ? 'Selecione...' : 'Cadastre uma pessoa no Quadro Societário'} />
              </SelectTrigger>
              <SelectContent>
                {pessoasCliente.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.denominacao} <span className="text-xs text-muted-foreground">({p.tipo_pessoa})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Tipo</Label>
            <Select
              value={draft.tipo}
              onValueChange={(v) => setDraft((p) => ({ ...p, tipo: v }))}
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPO_TITULARIDADE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Fração (%) — opcional</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={draft.fracao}
              onChange={(e) => setDraft((p) => ({ ...p, fracao: e.target.value }))}
              placeholder="ex: 50 (deixe vazio se composse indefinida)"
              className="h-9 font-mono"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          {editingId && (
            <Button type="button" size="sm" variant="ghost" onClick={cancelEdit}>
              Cancelar
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
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
    </div>
  );
}

interface TitularidadeRowItemProps {
  titularidade: TitularidadeEnriched;
  isEditing: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function TitularidadeRowItem({ titularidade, isEditing, canDelete, onEdit, onDelete }: TitularidadeRowItemProps) {
  const tipoLabel = TIPO_TITULARIDADE_OPTIONS.find((o) => o.value === titularidade.tipo)?.label ?? titularidade.tipo;
  return (
    <div
      className={`flex items-center gap-2 rounded-md border px-3 py-2 ${isEditing ? 'bg-osg-50 border-osg-200' : 'bg-muted/30'}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{titularidade.titular_denominacao}</span>
          {titularidade.titular_tipo && (
            <Badge variant="outline" className="text-[10px]">{titularidade.titular_tipo}</Badge>
          )}
        </div>
        <div className="flex gap-1.5 mt-0.5">
          <Badge variant="secondary" className="text-[10px]">{tipoLabel}</Badge>
          <Badge variant="outline" className="text-[10px] font-mono">
            {titularidade.fracao != null ? `${titularidade.fracao}%` : 'sem fração'}
          </Badge>
        </div>
      </div>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      {!canDelete ? (
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground"
          disabled
          title="A matrícula precisa de ao menos um titular"
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
              Remover {titularidade.titular_denominacao} ({tipoLabel}
              {titularidade.fracao != null ? `, ${titularidade.fracao}%` : ''}) desta matrícula.
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
  );
}

// =============================================================================
// Impedimentos
// =============================================================================

interface ImpedimentosPanelProps {
  matriculaId: string;
  areaUnidade: string;
  pessoasCliente: PessoaRow[];
}

function ImpedimentosPanel({ matriculaId, areaUnidade, pessoasCliente }: ImpedimentosPanelProps) {
  const { data: impedimentos = [], isLoading } = useImpedimentosByMatricula(matriculaId);
  const upsert = useUpsertImpedimento();
  const deleteMutation = useDeleteImpedimento();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    tipo: string; referencia: string; descricao: string;
    credor_pessoa_id: string; credor_nome: string;
    data_constituicao: string; data_validade: string;
    vlr: string; area_afetada: string;
    impede_transferencia: boolean; cancelado: boolean;
  }>({
    tipo: 'Hipoteca', referencia: '', descricao: '',
    credor_pessoa_id: '', credor_nome: '',
    data_constituicao: '', data_validade: '',
    vlr: '', area_afetada: '',
    impede_transferencia: false, cancelado: false,
  });

  const startEdit = (i: ImpedimentoRow) => {
    setEditingId(i.id);
    setDraft({
      tipo: i.tipo,
      referencia: i.referencia ?? '',
      descricao: i.descricao ?? '',
      credor_pessoa_id: i.credor_pessoa_id ?? '',
      credor_nome: i.credor_nome ?? '',
      data_constituicao: i.data_constituicao ?? '',
      data_validade: i.data_validade ?? '',
      vlr: i.vlr != null ? String(i.vlr) : '',
      area_afetada: i.area_afetada != null ? String(i.area_afetada) : '',
      impede_transferencia: i.impede_transferencia,
      cancelado: i.cancelado,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({
      tipo: 'Hipoteca', referencia: '', descricao: '',
      credor_pessoa_id: '', credor_nome: '',
      data_constituicao: '', data_validade: '',
      vlr: '', area_afetada: '',
      impede_transferencia: false, cancelado: false,
    });
  };

  const handleSave = () => {
    if (!draft.tipo.trim()) {
      toast.error('Selecione o tipo');
      return;
    }
    const nullify = (v: string) => (v.trim() ? v : null);
    const toNum = (v: string) => (v.trim() && !isNaN(Number(v)) ? Number(v) : null);

    const original = editingId ? impedimentos.find((i) => i.id === editingId) ?? null : null;

    upsert.mutate(
      {
        values: {
          matricula_id: matriculaId,
          tipo: draft.tipo,
          referencia: nullify(draft.referencia),
          descricao: nullify(draft.descricao),
          credor_pessoa_id: draft.credor_pessoa_id || null,
          credor_nome: nullify(draft.credor_nome),
          data_constituicao: nullify(draft.data_constituicao),
          data_validade: nullify(draft.data_validade),
          vlr: toNum(draft.vlr),
          area_afetada: toNum(draft.area_afetada),
          impede_transferencia: draft.impede_transferencia,
          cancelado: draft.cancelado,
        },
        original,
      },
      { onSuccess: cancelEdit },
    );
  };

  return (
    <div className="space-y-3">
      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
      ) : impedimentos.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum impedimento cadastrado para esta matrícula.
        </p>
      ) : (
        <div className="space-y-1.5">
          {impedimentos.map((i) => (
            <ImpedimentoRowItem
              key={i.id}
              impedimento={i}
              areaUnidade={areaUnidade}
              isEditing={editingId === i.id}
              onEdit={() => startEdit(i)}
              onDelete={() => deleteMutation.mutate(i)}
            />
          ))}
        </div>
      )}

      <div className="rounded-md border border-dashed p-3 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground">
          {editingId ? 'Editar impedimento' : 'Novo impedimento'}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              Tipo<RequiredMark />
            </Label>
            <Select value={draft.tipo} onValueChange={(v) => setDraft((p) => ({ ...p, tipo: v }))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPO_IMPEDIMENTO_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Referência</Label>
            <Input
              value={draft.referencia}
              onChange={(e) => setDraft((p) => ({ ...p, referencia: e.target.value }))}
              placeholder="R-X/Av-Y"
              className="h-9 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Valor (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={draft.vlr}
              onChange={(e) => setDraft((p) => ({ ...p, vlr: e.target.value }))}
              className="h-9 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Credor (PSA)</Label>
            <Select
              value={draft.credor_pessoa_id || undefined}
              onValueChange={(v) => setDraft((p) => ({ ...p, credor_pessoa_id: v }))}
            >
              <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {pessoasCliente.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.denominacao}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Credor (texto livre)</Label>
            <Input
              value={draft.credor_nome}
              onChange={(e) => setDraft((p) => ({ ...p, credor_nome: e.target.value }))}
              placeholder="Quando o credor não estiver cadastrado"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Data constituição</Label>
            <DateFieldWithInput
              value={draft.data_constituicao}
              onChange={(v) => setDraft((p) => ({ ...p, data_constituicao: v }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Data validade</Label>
            <DateFieldWithInput
              value={draft.data_validade}
              onChange={(v) => setDraft((p) => ({ ...p, data_validade: v }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Área afetada ({areaUnidade})</Label>
            <Input
              type="number"
              step="0.0001"
              value={draft.area_afetada}
              onChange={(e) => setDraft((p) => ({ ...p, area_afetada: e.target.value }))}
              className="h-9 font-mono"
            />
          </div>
          <div className="md:col-span-3 space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Descrição</Label>
            <Textarea
              value={draft.descricao}
              onChange={(e) => setDraft((p) => ({ ...p, descricao: e.target.value }))}
              className="min-h-[60px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={draft.impede_transferencia}
              onCheckedChange={(v) => setDraft((p) => ({ ...p, impede_transferencia: v }))}
            />
            <Label className="text-sm">Impede transferência</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={draft.cancelado}
              onCheckedChange={(v) => setDraft((p) => ({ ...p, cancelado: v }))}
            />
            <Label className="text-sm">Cancelado</Label>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          {editingId && (
            <Button type="button" size="sm" variant="ghost" onClick={cancelEdit}>
              Cancelar
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
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
    </div>
  );
}

interface ImpedimentoRowItemProps {
  impedimento: ImpedimentoEnriched;
  areaUnidade: string;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function ImpedimentoRowItem({ impedimento, areaUnidade, isEditing, onEdit, onDelete }: ImpedimentoRowItemProps) {
  const formatVlr = (v: number | null) =>
    v == null ? null : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div
      className={`rounded-md border px-3 py-2 ${isEditing ? 'bg-osg-50 border-osg-200' : 'bg-muted/30'} ${impedimento.cancelado ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="default" className="text-[10px]">{impedimento.tipo}</Badge>
            {impedimento.referencia && (
              <Badge variant="outline" className="text-[10px] font-mono">{impedimento.referencia}</Badge>
            )}
            {impedimento.impede_transferencia && (
              <Badge variant="destructive" className="text-[10px]">Impede transferência</Badge>
            )}
            {impedimento.cancelado && (
              <Badge variant="secondary" className="text-[10px]">Cancelado</Badge>
            )}
          </div>
          {impedimento.credor_denominacao && (
            <p className="text-xs">
              <span className="text-muted-foreground">Credor:</span>{' '}
              <span className="font-medium">{impedimento.credor_denominacao}</span>
            </p>
          )}
          {impedimento.descricao && (
            <p className="text-xs text-muted-foreground line-clamp-2">{impedimento.descricao}</p>
          )}
          <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
            {impedimento.vlr != null && <span>Valor: <span className="font-mono">{formatVlr(impedimento.vlr)}</span></span>}
            {impedimento.area_afetada != null && (
              <span>Área: <span className="font-mono">{impedimento.area_afetada} {areaUnidade}</span></span>
            )}
            {impedimento.data_constituicao && (
              <span>Constituído: {new Date(impedimento.data_constituicao).toLocaleDateString('pt-BR')}</span>
            )}
            {impedimento.data_validade && (
              <span>Validade: {new Date(impedimento.data_validade).toLocaleDateString('pt-BR')}</span>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover impedimento?</AlertDialogTitle>
                <AlertDialogDescription>
                  Remover este impedimento ({impedimento.tipo}) da matrícula.
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
        </div>
      </div>
    </div>
  );
}
