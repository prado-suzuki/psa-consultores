import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Link2, Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { formScopeCls } from '@/lib/osgFormGrid';
import { PessoaDadosTab, type ParentescoDraft } from '@/components/equipe/osg/qualificacao-das-partes/pessoa/PessoaDadosTab';
import { VinculoSelect } from '@/components/equipe/osg/documentos/VinculoSelect';
import type { EntidadeOpcao } from '@/components/equipe/osg/documentos/DocUploadDialog';
import { FormBem, FormMatricula } from '@/components/equipe/osg/documentos/classificar/FichaFormularios';
import type { BemRow } from '@/hooks/useDiagnosticoPatrimonial';
import type { DocumentoArquivoRow } from '@/hooks/useDocumentoArquivo';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import {
  camposComProcedencia, ROTULOS_BEM, ROTULOS_MATRICULA, ROTULOS_PESSOA,
  validarBem, validarMatricula, validarPessoa,
  type NovoCadastro, type TipoFicha,
} from '@/lib/classificarFicha';
import {
  bemDraftToValues, emptyBemDraft, emptyMatriculaDraft, emptyTitularInicial, matriculaDraftToValues,
  parseTitularInicial, type DraftBem, type DraftMatricula, type TitularInicialDraft,
} from '@/lib/diagnosticoPatrimonialModalModels';
import { buildPessoaPayload, emptyPessoaDraft, type PessoaDraft } from '@/lib/pessoaModalModel';
import { cn } from '@/lib/utils';

interface Props {
  doc: DocumentoArquivoRow | null;
  clienteId: string;
  pessoasCliente: PessoaRow[];
  imoveis: BemRow[];
  opcoes: { pessoas: EntidadeOpcao[]; bens: EntidadeOpcao[]; matriculas: EntidadeOpcao[] };
  salvando: boolean;
  /** Entidade cadastrada por último — vira a sugestão para o próximo arquivo do balde. */
  sugestao: { valor: string; label: string } | null;
  onCadastrar: (novo: NovoCadastro) => void;
  onVincular: (valor: string) => void;
  onLimpar: () => void;
}

const TIPOS: { value: TipoFicha; label: string }[] = [
  { value: 'PF', label: 'Pessoa Física' },
  { value: 'PJ', label: 'Pessoa Jurídica' },
  { value: 'bem', label: 'Bem' },
  { value: 'matricula', label: 'Matrícula' },
];

/**
 * Coluna da ficha: 384px fixos, uma coluna de campos, rolagem própria. É o
 * formulário real de cadastro — o mesmo dos modais — montado ao lado do
 * documento. Criar do zero e apontar para quem já existe ficam no mesmo lugar,
 * a um clique de distância (§5, regra 1).
 */
export function FichaColuna({
  doc, clienteId, pessoasCliente, imoveis, opcoes, salvando, sugestao,
  onCadastrar, onVincular, onLimpar,
}: Props) {
  const [modo, setModo] = useState<'novo' | 'existente'>(sugestao ? 'existente' : 'novo');
  const [tipo, setTipo] = useState<TipoFicha>('PF');
  const [alvoExistente, setAlvoExistente] = useState(sugestao?.valor ?? '');

  const [pessoa, setPessoa] = useState<PessoaDraft>(() => ({ ...emptyPessoaDraft(), tipo_pessoa: 'PF' }));
  const [parentesco, setParentesco] = useState<ParentescoDraft>({ parenteId: '', tipo: '', natureza: '' });
  const [bem, setBem] = useState<DraftBem>(emptyBemDraft);
  const [matricula, setMatricula] = useState<DraftMatricula>(() => emptyMatriculaDraft());
  const [titular, setTitular] = useState<TitularInicialDraft>(emptyTitularInicial);
  const [bemIdMatricula, setBemIdMatricula] = useState('');

  const rolagem = useRef<HTMLDivElement>(null);
  const [secoes, setSecoes] = useState<string[]>([]);

  // Índice de seções: sem ele os ~28 campos da pessoa viram rolagem cega numa
  // coluna de 384px. Lido do próprio formulário, então não desatualiza.
  useEffect(() => {
    const alvo = rolagem.current;
    if (!alvo) return;
    const titulos = Array.from(alvo.querySelectorAll('section h4')).map((no) => no.textContent?.trim() ?? '');
    setSecoes(titulos.filter(Boolean));
  }, [tipo, modo, doc?.id, bem.tipo_bem, matricula.tipo_bem, pessoa.estado_civil]);

  const irParaSecao = (indice: number) => {
    const alvo = rolagem.current?.querySelectorAll('section');
    alvo?.[indice]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const trocarTipo = (proximo: TipoFicha) => {
    setTipo(proximo);
    if (proximo === 'PF' || proximo === 'PJ') {
      setPessoa((atual) => ({ ...atual, tipo_pessoa: proximo }));
    }
  };

  // Procedência da sessão: campos preenchidos com ESTE documento aberto. Nada
  // disso é gravado (questão aberta nº 3 do plano).
  const procedencia =
    tipo === 'bem'
      ? camposComProcedencia(emptyBemDraft(), bem, ROTULOS_BEM)
      : tipo === 'matricula'
        ? camposComProcedencia(emptyMatriculaDraft(), matricula, ROTULOS_MATRICULA)
        : camposComProcedencia({ ...emptyPessoaDraft(), tipo_pessoa: pessoa.tipo_pessoa }, pessoa, ROTULOS_PESSOA);

  const salvar = () => {
    if (!doc) {
      toast.error('Abra um arquivo do balde antes de salvar.');
      return;
    }
    if (modo === 'existente') {
      if (!alvoExistente) {
        toast.error('Escolha a quem este arquivo pertence');
        return;
      }
      onVincular(alvoExistente);
      return;
    }
    if (tipo === 'PF' || tipo === 'PJ') {
      const erro = validarPessoa(pessoa);
      if (erro) {
        toast.error(erro);
        return;
      }
      onCadastrar({ tipo: 'pessoa', values: buildPessoaPayload(pessoa, clienteId), parentesco });
      return;
    }
    if (tipo === 'bem') {
      const erro = validarBem(bem, titular);
      if (erro) {
        toast.error(erro);
        return;
      }
      onCadastrar({
        tipo: 'bem',
        values: bemDraftToValues(bem, clienteId),
        titular: parseTitularInicial(titular) ?? undefined,
      });
      return;
    }
    const erro = validarMatricula(matricula, titular, bemIdMatricula);
    if (erro) {
      toast.error(erro);
      return;
    }
    const bemTipo = imoveis.find((item) => item.id === bemIdMatricula)?.tipo_bem ?? null;
    onCadastrar({
      tipo: 'matricula',
      values: matriculaDraftToValues(matricula, bemIdMatricula, null, bemTipo),
      titular: parseTitularInicial(titular) ?? undefined,
    });
  };

  const pessoaCandidates = pessoasCliente.filter((item) => item.tipo_pessoa === 'PF');
  const parenteCandidates = pessoaCandidates.filter(
    (item) => item.is_fundador || item.id === parentesco.parenteId,
  );
  const rotuloAcao = modo === 'existente' ? 'Vincular e voltar ao balde' : 'Cadastrar e voltar ao balde';

  return (
    <section
      aria-label="Ficha do cadastro"
      className="flex w-[384px] min-w-0 shrink-0 flex-col overflow-hidden rounded-xl border border-osg-300/60 bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-14px_hsl(var(--osg-700)/0.20)]"
    >
      <div className="border-b border-osg-100 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          {modo === 'novo' ? (
            <UserPlus className="h-4 w-4 shrink-0 text-osg-600" aria-hidden />
          ) : (
            <Link2 className="h-4 w-4 shrink-0 text-osg-600" aria-hidden />
          )}
          <h3 className="min-w-0 truncate text-[13px] font-semibold text-osg-700">
            {modo === 'novo' ? 'Cadastrar a partir deste documento' : 'É de quem eu já cadastrei'}
          </h3>
        </div>
        {/* Criar do zero e apontar para quem já existe, lado a lado e do mesmo tamanho. */}
        <div role="group" aria-label="Destino do arquivo" className="mt-2 flex gap-1 rounded-md border border-osg-200 bg-osg-50/60 p-1">
          {([
            { value: 'novo' as const, label: 'Cadastrar novo' },
            { value: 'existente' as const, label: 'Já cadastrado' },
          ]).map((opcao) => (
            <button
              key={opcao.value}
              type="button"
              onClick={() => setModo(opcao.value)}
              aria-pressed={modo === opcao.value}
              className={cn(
                'flex-1 rounded px-2 py-1.5 text-[11.5px] font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-osg-moss',
                modo === opcao.value ? 'bg-white text-osg-700 shadow-sm' : 'text-muted-foreground hover:text-osg-700',
              )}
            >
              {opcao.label}
            </button>
          ))}
        </div>
      </div>

      {modo === 'novo' && (
        <>
          <div className="border-b border-osg-100 px-3.5 py-2">
            <div role="group" aria-label="Tipo de ficha" className="flex flex-wrap gap-1">
              {TIPOS.map((opcao) => (
                <button
                  key={opcao.value}
                  type="button"
                  onClick={() => trocarTipo(opcao.value)}
                  aria-pressed={tipo === opcao.value}
                  className={cn(
                    'rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-osg-moss',
                    tipo === opcao.value ? 'bg-osg-moss text-white' : 'text-osg-600 hover:bg-osg-50',
                  )}
                >
                  {opcao.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-b border-osg-100 bg-osg-moss/[0.04] px-3.5 py-2">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-osg-moss">
              <Link2 className="h-3 w-3 shrink-0" aria-hidden />
              Procedência · {procedencia.length}{' '}
              {procedencia.length === 1 ? 'campo deste documento' : 'campos deste documento'}
            </p>
            {procedencia.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {procedencia.map((campo) => (
                  <span
                    key={campo}
                    className="inline-flex items-center rounded-full border border-osg-moss/25 bg-card px-1.5 py-0.5 text-[10px] text-osg-700"
                  >
                    {campo}
                  </span>
                ))}
              </div>
            )}
          </div>

          {secoes.length > 1 && (
            <nav aria-label="Seções da ficha" className="flex gap-1 overflow-x-auto border-b border-osg-100 px-2.5 py-1.5">
              {secoes.map((secao, indice) => (
                <button
                  key={`${secao}-${indice}`}
                  type="button"
                  onClick={() => irParaSecao(indice)}
                  className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-osg-600 transition-colors hover:bg-osg-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-osg-moss"
                >
                  {secao}
                </button>
              ))}
            </nav>
          )}
        </>
      )}

      <div ref={rolagem} className={cn('min-h-0 flex-1 overflow-y-auto px-3.5 py-3.5', formScopeCls)}>
        {modo === 'existente' ? (
          <div className="space-y-3">
            <div role="group" aria-label="A quem este arquivo pertence" className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">A quem este arquivo pertence</Label>
              <VinculoSelect
                value={alvoExistente}
                onChange={setAlvoExistente}
                mostrarSemVinculo={false}
                placeholder="Escolha a pessoa, o bem ou a matrícula"
                pessoasPF={opcoes.pessoas.filter((item) => item.tipo !== 'PJ')}
                pessoasPJ={opcoes.pessoas.filter((item) => item.tipo === 'PJ')}
                bens={opcoes.bens}
                matriculas={opcoes.matriculas}
              />
            </div>
            {sugestao && (
              <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                Último cadastro desta sessão: <span className="font-medium text-osg-700">{sugestao.label}</span>. É a
                sugestão para varrer o balde recrutando o resto dos arquivos dela.
              </p>
            )}
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Um arquivo tem um dono só: ao vincular, ele sai do balde.
            </p>
          </div>
        ) : tipo === 'bem' ? (
          <FormBem draft={bem} onChange={setBem} pessoas={pessoasCliente} titular={titular} onTitular={setTitular} />
        ) : tipo === 'matricula' ? (
          <FormMatricula
            draft={matricula}
            onChange={setMatricula}
            pessoas={pessoasCliente}
            imoveis={imoveis}
            bemId={bemIdMatricula}
            onBemId={setBemIdMatricula}
            titular={titular}
            onTitular={setTitular}
          />
        ) : (
          <PessoaDadosTab
            draft={pessoa}
            setDraft={setPessoa}
            pessoaCandidates={pessoaCandidates.filter((item) => item.id !== parentesco.parenteId)}
            parenteCandidates={parenteCandidates}
            parentesco={parentesco}
            setParentesco={setParentesco}
          />
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-osg-100 px-3.5 py-2.5">
        <Button type="button" variant="outline" size="sm" onClick={onLimpar} disabled={salvando}>
          Limpar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={salvar}
          disabled={salvando || !doc}
          className="ml-auto min-w-0 gap-1.5 bg-osg-moss text-white hover:bg-osg-moss/90"
        >
          {salvando && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />}
          <span className="truncate">{rotuloAcao}</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
        </Button>
      </div>
    </section>
  );
}
