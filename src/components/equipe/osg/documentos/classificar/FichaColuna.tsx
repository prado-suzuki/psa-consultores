import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, Link2, Loader2, Maximize2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { formScopeCls } from '@/lib/osgFormGrid';
import { PessoaDadosTab, type ParentescoDraft } from '@/components/equipe/osg/qualificacao-das-partes/pessoa/PessoaDadosTab';
import type { EntidadeOpcao } from '@/components/equipe/osg/documentos/DocUploadDialog';
import { FormBem, FormMatricula } from '@/components/equipe/osg/documentos/classificar/FichaFormularios';
import { FichaPopout } from '@/components/equipe/osg/documentos/classificar/FichaPopout';
import type { BemRow } from '@/hooks/useDiagnosticoPatrimonial';
import type { DocumentoArquivoRow } from '@/hooks/useDocumentoArquivo';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import {
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
  /** Quantos arquivos do balde vão ser gravados quando o consultor salvar. */
  naLeva: number;
  clienteId: string;
  pessoasCliente: PessoaRow[];
  imoveis: BemRow[];
  opcoes: { pessoas: EntidadeOpcao[]; bens: EntidadeOpcao[]; matriculas: EntidadeOpcao[] };
  salvando: boolean;
  /** Entidade cadastrada por último — vira a sugestão para o próximo arquivo do balde. */
  sugestao: { valor: string; label: string } | null;
  /** Cadastrar x Vincular vive fora daqui: a coluna é remontada a cada arquivo
   *  aberto, e trocar de arquivo não pode tirar o consultor da aba em que está. */
  modo: 'novo' | 'existente';
  onModo: (modo: 'novo' | 'existente') => void;
  /** Alvo escolhido em Vincular ("pessoa:<id>" | "bem:<id>" | "matricula:<id>").
   *  Também vive fora: a varredura do balde aponta vários arquivos seguidos para
   *  a mesma entidade, então a escolha atravessa a troca de arquivo. */
  alvo: string;
  onAlvo: (valor: string) => void;
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
  doc, naLeva, clienteId, pessoasCliente, imoveis, opcoes, salvando, sugestao, modo, onModo,
  alvo: alvoExistente, onAlvo: setAlvoExistente,
  onCadastrar, onVincular, onLimpar,
}: Props) {
  // A categoria de um alvo já escolhido ("pessoa:<id>" → PF ou PJ, conforme o
  // cadastro). Serve para abrir a aba Vincular já na categoria certa.
  const categoriaDoValor = (valor: string): TipoFicha | null => {
    const [especie, id] = valor.split(':');
    if (especie === 'bem') return 'bem';
    if (especie === 'matricula') return 'matricula';
    if (especie === 'pessoa') {
      return opcoes.pessoas.find((item) => item.id === id)?.tipo === 'PJ' ? 'PJ' : 'PF';
    }
    return null;
  };

  // A categoria abre na do alvo já escolhido — senão a seleção que atravessou a
  // troca de arquivo ficaria marcada numa lista fora de vista.
  const [tipo, setTipo] = useState<TipoFicha>(
    () => (alvoExistente ? categoriaDoValor(alvoExistente) : null) ?? 'PF',
  );

  const [pessoa, setPessoa] = useState<PessoaDraft>(() => ({ ...emptyPessoaDraft(), tipo_pessoa: 'PF' }));
  const [parentesco, setParentesco] = useState<ParentescoDraft>({ parenteId: '', tipo: '', natureza: '' });
  const [bem, setBem] = useState<DraftBem>(emptyBemDraft);
  const [matricula, setMatricula] = useState<DraftMatricula>(() => emptyMatriculaDraft());
  const [titular, setTitular] = useState<TitularInicialDraft>(emptyTitularInicial);
  const [bemIdMatricula, setBemIdMatricula] = useState('');

  // Expandir abre o modal de cadastro de verdade — o mesmo das outras telas —
  // com este rascunho dentro, e fechar traz de volta o que foi mexido lá. A
  // coluna continua montada atrás: o modal é uma folga para ler os campos, não
  // outro lugar onde o trabalho passa a morar.
  const [expandido, setExpandido] = useState(false);

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
    // Escolha de outra categoria não pode ficar selecionada fora de vista — o
    // botão de vincular gravaria um alvo que o consultor não está mais vendo.
    if (alvoExistente && categoriaDoValor(alvoExistente) !== proximo) setAlvoExistente('');
  };

  // Cadastros da categoria aberta, já com o value codificado que o vínculo usa.
  const itensDaCategoria = useMemo(() => {
    if (tipo === 'bem') return opcoes.bens.map((item) => ({ ...item, valor: `bem:${item.id}` }));
    if (tipo === 'matricula') {
      return opcoes.matriculas.map((item) => ({ ...item, valor: `matricula:${item.id}` }));
    }
    const querPJ = tipo === 'PJ';
    return opcoes.pessoas
      .filter((item) => (querPJ ? item.tipo === 'PJ' : item.tipo !== 'PJ'))
      .map((item) => ({ ...item, valor: `pessoa:${item.id}` }));
  }, [tipo, opcoes]);

  /** Sem leva não há o que gravar: é ela que diz quais arquivos vão junto. */
  const semLeva = () => {
    if (naLeva > 0) return false;
    toast.error('Marque no balde ao menos um arquivo desta entidade.');
    return true;
  };

  const salvar = () => {
    if (semLeva()) return;
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
  // O rótulo conta os arquivos: é o que diz ao consultor que a leva marcada no
  // balde vai junto, e não só o arquivo que está aberto no visualizador.
  const arquivos = `${naLeva} ${naLeva === 1 ? 'arquivo' : 'arquivos'}`;
  const rotuloAcao = modo === 'existente'
    ? `Vincular ${arquivos}`
    : `Cadastrar e vincular ${arquivos}`;
  const titulo = modo === 'novo' ? 'Cadastrar a partir deste documento' : 'É de quem eu já cadastrei';
  // Matrícula é a única ficha com um campo que o modal não tem (o imóvel a que
  // ela pertence, que lá vem de fora). Expandir antes de escolhê-lo levaria o
  // consultor a um formulário sem como consertar isso.
  const faltaImovel = tipo === 'matricula' && !bemIdMatricula;

  /* Criar do zero e apontar para quem já existe, lado a lado e do mesmo tamanho. */
  const abasModo = (
    <div role="group" aria-label="Destino do arquivo" className="flex gap-1 rounded-md border border-osg-200 bg-osg-50/60 p-1">
      {([
        { value: 'novo' as const, label: 'Cadastrar' },
        { value: 'existente' as const, label: 'Vincular' },
      ]).map((opcao) => (
        <button
          key={opcao.value}
          type="button"
          onClick={() => onModo(opcao.value)}
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
  );

  /* Categorias — as mesmas nos dois modos: em "Cadastrar" dizem que ficha
     abrir, em "Vincular" dizem que lista de cadastros mostrar. */
  const categorias = (
    <div className="border-b border-osg-100 px-3.5 py-2">
      <div
        role="group"
        aria-label={modo === 'novo' ? 'Tipo de ficha' : 'Categoria do cadastro'}
        className="flex flex-wrap gap-1"
      >
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
  );

  const navSecoes = modo === 'novo' && secoes.length > 1 && (
    <nav
      aria-label="Seções da ficha"
      className="flex gap-1 overflow-x-auto border-b border-osg-100 px-2.5 py-1.5"
    >
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
  );

  const acoes = (
    <div className="flex items-center gap-2 border-t border-osg-100 px-3.5 py-2.5">
      <Button type="button" variant="outline" size="sm" onClick={onLimpar} disabled={salvando}>
        Limpar
      </Button>
      <Button
        type="button"
        size="sm"
        onClick={salvar}
        disabled={salvando || naLeva === 0}
        className="ml-auto min-w-0 gap-1.5 bg-osg-moss text-white hover:bg-osg-moss/90"
      >
        {salvando && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />}
        <span className="truncate">{rotuloAcao}</span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
      </Button>
    </div>
  );

  /* O miolo da coluna: categorias, índice de seções, formulário e ações. */
  const corpo = (
    <>
      {categorias}
      {navSecoes}
      <div ref={rolagem} className={cn('min-h-0 flex-1 overflow-y-auto px-3.5 py-3.5', formScopeCls)}>
        {modo === 'existente' ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">A quem este arquivo pertence</Label>
              {itensDaCategoria.length === 0 ? (
                <p className="rounded-lg border border-dashed border-osg-200 px-3 py-4 text-center text-[11.5px] text-muted-foreground">
                  Nenhum cadastro nesta categoria ainda. Use a aba Cadastrar para criar a partir
                  deste documento.
                </p>
              ) : (
                <div role="radiogroup" aria-label="A quem este arquivo pertence" className="space-y-1">
                  {itensDaCategoria.map((item) => {
                    const escolhido = alvoExistente === item.valor;
                    return (
                      <button
                        key={item.valor}
                        type="button"
                        role="radio"
                        aria-checked={escolhido}
                        onClick={() => setAlvoExistente(item.valor)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-osg-moss',
                          escolhido
                            ? 'border-osg-moss bg-osg-moss/[0.06]'
                            : 'border-osg-200 bg-card hover:border-osg-300 hover:bg-osg-50',
                        )}
                      >
                        <span
                          className={cn(
                            'min-w-0 flex-1 truncate text-[12px] font-medium',
                            escolhido ? 'text-osg-700' : 'text-foreground',
                          )}
                        >
                          {item.label}
                        </span>
                        {escolhido && <Check className="h-3.5 w-3.5 shrink-0 text-osg-moss" aria-hidden />}
                      </button>
                    );
                  })}
                </div>
              )}
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
      {acoes}
    </>
  );

  return (
    <>
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
            <h3 className="min-w-0 flex-1 truncate text-[13px] font-semibold text-osg-700">{titulo}</h3>
            {/* Só em Cadastrar: em Vincular a coluna é uma lista de cadastros,
                não tem formulário para levar a tela cheia. */}
            {modo === 'novo' && (
              <button
                type="button"
                onClick={() => setExpandido(true)}
                disabled={faltaImovel}
                aria-label="Abrir o formulário em tela cheia"
                title={faltaImovel
                  ? 'Escolha primeiro o imóvel a que a matrícula pertence'
                  : 'Abrir o formulário em tela cheia'}
                className="shrink-0 rounded-md p-1 text-osg-600 transition-colors hover:bg-osg-50 hover:text-osg-700 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-osg-moss"
              >
                <Maximize2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
          </div>
          <div className="mt-2">{abasModo}</div>
        </div>

        {corpo}
      </section>

      {/* Tela cheia é o modal de cadastro de verdade, com este rascunho dentro. */}
      <FichaPopout
        aberto={expandido}
        tipo={tipo}
        clienteId={clienteId}
        pessoasCliente={pessoasCliente}
        imoveis={imoveis}
        rascunho={{ pessoa, parentesco, bem, matricula, titular, bemIdMatricula }}
        rotuloSalvar={rotuloAcao}
        onDevolver={(patch) => {
          if (patch.pessoa) setPessoa(patch.pessoa);
          if (patch.parentesco) setParentesco(patch.parentesco);
          if (patch.bem) setBem(patch.bem);
          if (patch.matricula) setMatricula(patch.matricula);
          if (patch.titular) setTitular(patch.titular);
        }}
        onFechar={() => setExpandido(false)}
        onCadastrar={(novo) => {
          if (semLeva()) return;
          onCadastrar(novo);
        }}
      />
    </>
  );
}
