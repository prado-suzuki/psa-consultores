import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { FRACAO_STEP, clampFracaoInput } from '@/components/equipe/osg/diagnostico-patrimonial/fracaoUtils';
import { validarFormulario } from '@/lib/osg/validacaoFormulario';
import { CurrencyInput } from '@/components/equipe/osg/CurrencyInput';
import { Campo, fieldCls, FieldSection } from '@/components/equipe/osg/formKit';
import { TitularidadeLinha } from '@/components/equipe/osg/diagnostico-patrimonial/titularidade/TitularidadeLinha';
import {
  brl, campoInvalido, campoParaValor, fechamentoDasFracoes, formatarFracao, valorParaCampo,
} from '@/components/equipe/osg/diagnostico-patrimonial/titularidade/valoresDoTitular';
import {
  aderenciaPorPessoa,
  ehEspecieDeDireito,
  somaAIntegralizarDosTitulares,
  somaContabilDosTitulares,
  titularesEfetivos,
  type LinhaDeTitularidade,
} from '@/lib/osg/integralizacaoDaMatricula';
import {
  useTitularidadesByMatricula,
  useTitularidadesByBem,
  useUpsertTitularidade,
  useDeleteTitularidade,
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

  // O valor é da MATRÍCULA: bem sem matrícula (veículo, quotas de outra
  // empresa) segue com o valor no próprio bem, e a decisão 4 do plano o deixou
  // de fora desta frente.
  const ancoradoEmMatricula = anchor.kind === 'matricula';

  const efetivos = useMemo(
    () => titularesEfetivos(titularidades as unknown as LinhaDeTitularidade[]),
    [titularidades],
  );
  const aderencias = useMemo(() => aderenciaPorPessoa(efetivos), [efetivos]);
  const somaContabil = somaContabilDosTitulares(efetivos);
  const somaIntegralizar = somaAIntegralizarDosTitulares(efetivos);

  // Quem tem linha de direito edita os valores NELA. Quem só tem linha de fato
  // edita na de fato: deixá-la sem os campos tiraria essa pessoa da
  // integralização sem que a tela dissesse por quê.
  const pessoasComDireito = useMemo(
    () => new Set(titularidades.filter((t) => ehEspecieDeDireito(t.tipo)).map((t) => t.titular_pessoa_id)),
    [titularidades],
  );
  const editaValores = (tipo: string, pessoaId: string) =>
    ancoradoEmMatricula && (ehEspecieDeDireito(tipo) || !pessoasComDireito.has(pessoaId));

  if (isLoading) {
    return <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>;
  }

  const fato = titularidades.filter((t) => t.tipo === 'FATO');
  const direito = titularidades.filter((t) => t.tipo !== 'FATO');
  const totalTitulares = titularidades.length;

  const comum = {
    anchor,
    pessoasCliente,
    totalTitulares,
    requireAtLeastOne,
    aderencias,
    editaValores,
  };

  return (
    <div>
      <TitularBucket {...comum} number="01" tipo="FATO" titularidades={fato} />
      <TitularBucket {...comum} number="02" tipo="DIREITO" titularidades={direito} copySource={fato} />
      {ancoradoEmMatricula && (somaContabil != null || somaIntegralizar != null) && (
        <SomaDaMatricula contabil={somaContabil} integralizar={somaIntegralizar} />
      )}
    </div>
  );
}

/**
 * O TOTAL DO IMÓVEL, que é a soma dos titulares e não mais um campo digitado.
 *
 * Os dois números divergem de propósito quando alguém fica de fora: o contábil
 * é o imóvel inteiro (como a DIRPF o conta) e o a integralizar é o que entra na
 * sociedade. A diferença é dita com todas as letras, porque ver "R$ 300.000,00"
 * e "R$ 100.000,00" lado a lado sem explicação parece erro de cadastro.
 */
function SomaDaMatricula({ contabil, integralizar }: { contabil: number | null; integralizar: number | null }) {
  const diferenca = contabil != null && integralizar != null ? contabil - integralizar : 0;
  const parcial = Math.abs(diferenca) > 0.005;
  return (
    <div className="mt-6 rounded-lg border border-osg-200/60 bg-osg-50/60 px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
        <Total rotulo="Contábil declarado" valor={contabil} />
        <Total rotulo="A integralizar" valor={integralizar} destaque />
      </div>
      {parcial && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {diferenca > 0
            ? `${brl.format(diferenca)} ficam de fora da integralização: é o que os titulares sem valor a integralizar seguram.`
            : `${brl.format(-diferenca)} a mais do que o contábil declarado pelos titulares.`}
        </p>
      )}
    </div>
  );
}

function Total({ rotulo, valor, destaque }: { rotulo: string; valor: number | null; destaque?: boolean }) {
  return (
    <div className="space-y-0.5">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {rotulo}
      </span>
      <span className={`block font-mono tabular-nums ${destaque ? 'text-base font-semibold text-osg-moss' : 'text-base font-medium text-osg-700'}`}>
        {valor != null ? brl.format(valor) : '—'}
      </span>
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
  aderencias: ReturnType<typeof aderenciaPorPessoa>;
  editaValores: (tipo: string, pessoaId: string) => boolean;
}

interface DraftTitular {
  titular_pessoa_id: string;
  fracao: string;
  vlr_contabil: string;
  vlr_integralizar: string;
}

const DRAFT_VAZIO: DraftTitular = {
  titular_pessoa_id: '', fracao: '', vlr_contabil: '', vlr_integralizar: '',
};

function TitularBucket({
  number, anchor, tipo, titularidades, pessoasCliente, totalTitulares, requireAtLeastOne, copySource,
  aderencias, editaValores,
}: TitularBucketProps) {
  const upsert = useUpsertTitularidade();
  const deleteMutation = useDeleteTitularidade();
  const { code, label } = TIPO_TITULARIDADE[tipo];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<DraftTitular>(DRAFT_VAZIO);

  const startEdit = (t: TitularidadeRow) => {
    setAdding(false);
    setEditingId(t.id);
    setDraft({
      titular_pessoa_id: t.titular_pessoa_id,
      fracao: t.fracao != null ? String(t.fracao) : '',
      vlr_contabil: valorParaCampo(t.vlr_contabil),
      vlr_integralizar: valorParaCampo(t.vlr_integralizar),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAdding(false);
    setDraft(DRAFT_VAZIO);
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
      { invalido: campoInvalido(draft.vlr_contabil), mensagem: 'O valor contábil digitado não é um número.', campo: 'titularidade_vlr_contabil' },
      { invalido: campoInvalido(draft.vlr_integralizar), mensagem: 'O valor a integralizar digitado não é um número.', campo: 'titularidade_vlr_integralizar' },
    ]);
    if (!ok) return;
    const fracaoNum: number | null = fracaoParsed;

    const original = editingId ? titularidades.find((t) => t.id === editingId) ?? null : null;
    // Linha que não edita valores (a de fato de quem também consta no registro)
    // não os envia: eles pertencem à linha de direito, e mandar null daqui
    // apagaria o que o formulário de lá gravou.
    const valores = editaValores(tipo, draft.titular_pessoa_id)
      ? {
          vlr_contabil: campoParaValor(draft.vlr_contabil),
          vlr_integralizar: campoParaValor(draft.vlr_integralizar),
        }
      : {};

    upsert.mutate(
      {
        values: {
          ...titularidadeAnchorValues(anchor),
          titular_pessoa_id: draft.titular_pessoa_id,
          tipo,
          fracao: fracaoNum,
          ...valores,
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
        // Os valores vêm junto: a linha de direito passa a ser a que os carrega
        // (ver `titularesEfetivos`), e deixá-los para trás tiraria a pessoa da
        // integralização no gesto que só queria repetir a lista.
        await upsert.mutateAsync({
          values: {
            ...titularidadeAnchorValues(anchor),
            titular_pessoa_id: t.titular_pessoa_id,
            tipo,
            fracao: t.fracao,
            vlr_contabil: t.vlr_contabil,
            vlr_integralizar: t.vlr_integralizar,
          },
        });
      }
    } catch {
      // Erros individuais já são notificados pelo hook.
    }
  };

  const comFracao = titularidades.filter((t) => t.fracao != null);
  const totalFracao = comFracao.reduce((sum, t) => sum + Number(t.fracao), 0);
  const fechamento = fechamentoDasFracoes(totalFracao);
  const formOpen = adding || editingId != null;
  // Só protege o último titular quando a âncora exige ao menos um (matrícula).
  const canDelete = !requireAtLeastOne || totalTitulares > 1;
  const valoresNoFormulario = editaValores(tipo, draft.titular_pessoa_id);

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
        // Passar de 100% é erro de cadastro; ficar ABAIXO é informação, não
        // erro: com integralização parcial o cadastro legítimo tem titular que
        // não integraliza, e pintar isso de vermelho ensinaria a ignorar o aviso
        // que importa.
        <span className={fechamento === 'excede' ? 'tabular-nums text-destructive' : 'tabular-nums'}>
          {formatarFracao(totalFracao)}%
          {fechamento === 'excede' && ' • excede 100%'}
          {fechamento === 'abaixo' && ' • abaixo de 100%'}
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
              <TitularidadeLinha
                key={t.id}
                titularidade={t}
                isEditing={editingId === t.id}
                canDelete={canDelete}
                mostrarValores={editaValores(t.tipo, t.titular_pessoa_id)}
                aderencia={aderencias.get(t.titular_pessoa_id)}
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
                  className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
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
            {valoresNoFormulario && (
              <div className="grid gap-2 sm:grid-cols-2">
                <Campo rotulo="Vlr. contábil declarado (DIRPF)" campo="titularidade_vlr_contabil">
                  <CurrencyInput
                    value={draft.vlr_contabil}
                    onChange={(v) => setDraft((p) => ({ ...p, vlr_contabil: v }))}
                    className={`${fieldCls} font-mono`}
                  />
                </Campo>
                <Campo rotulo="Vlr. a integralizar" campo="titularidade_vlr_integralizar">
                  <CurrencyInput
                    value={draft.vlr_integralizar}
                    onChange={(v) => setDraft((p) => ({ ...p, vlr_integralizar: v }))}
                    className={`${fieldCls} font-mono`}
                  />
                </Campo>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Deixe a fração vazia quando a composse for indefinida.
              {valoresNoFormulario && ' Deixe "a integralizar" vazio quando este titular NÃO integraliza: a parte dele fica fora do capital e aparece no contrato como área remanescente.'}
            </p>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-full justify-start gap-1.5 border border-dashed border-osg-200 text-muted-foreground hover:text-osg-700"
            onClick={() => { setEditingId(null); setDraft(DRAFT_VAZIO); setAdding(true); }}
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar titular
          </Button>
        )}
      </div>
    </FieldSection>
  );
}
