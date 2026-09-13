import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, ChevronDown, FileStack, Loader2, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { cn } from '@/lib/utils';
import type { FlagRow } from '@/hooks/useBibliotecaModelos';
import { FLAG_QUALIFICACAO, FLAG_SEDE, type CandidatoAC, type CausaQualificacao, type CausaSede } from '@/lib/osg/alteracaoPorEventos';
import { ComparacaoAntesDepois, type LinhaDaComparacao } from '@/components/equipe/osg/gerar/ComparacaoAntesDepois';

interface AlteracaoContratualDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Nome do documento registrado de que esta alteração parte. */
  documentoDeOrigem: string;
  /** Empresa cujo contrato está sendo alterado. */
  empresaLabel?: string;
  /** Flags de evento que ESTE modelo referencia. */
  flags: FlagRow[];
  /**
   * A prova de cada evento derivado, por `tmpl_flag.nome`. Flag sem evidência é
   * evento que o cadastro NÃO sustenta: continua na lista, desligado, porque o
   * consultor pode saber de algo que o cadastro ainda não sabe.
   */
  evidenciaPorFlagNome?: Map<string, string>;
  /**
   * A sede comparada campo a campo entre o instrumento registrado e o cadastro:
   * antes/depois, elegibilidade e o que falta. Null quando a sede não mudou.
   */
  candidatoSede?: CandidatoAC | null;
  /**
   * Os endereços de sócio comparados, um candidato por pessoa. O interruptor é um
   * só e vale para os elegíveis; o que estiver travado aparece na tabela com o
   * motivo e fica de fora da peça.
   */
  candidatosEndereco?: CandidatoAC[];
  /** Divergências detectadas que NÃO viram evento gerável, e o que falta na base. */
  pendencias?: string[];
  causaSede: CausaSede;
  onCausaSede: (causa: CausaSede) => void;
  causaQualificacao: CausaQualificacao;
  onCausaQualificacao: (causa: CausaQualificacao) => void;
  /** Rascunho local das respostas, por flag_id. */
  respostas: Record<string, boolean>;
  onAlternar: (flagId: string, valor: boolean) => void;
  onConfirmar: () => void;
  salvando: boolean;
}

const ROTULO_SEDE: Record<string, string> = {
  sede: 'Endereço completo',
  sedeEndereco: 'Logradouro e número',
  sedeLogradouro: 'Logradouro',
  sedeNumero: 'Número',
  sedeComplemento: 'Complemento',
  sedeBairro: 'Bairro',
  sedeMunicipio: 'Município',
  sedeUf: 'UF',
  sedeUfExtenso: 'Estado',
  sedeCep: 'CEP',
};

const CAUSAS: Array<{ valor: CausaSede; rotulo: string; nota: string; homologada: boolean }> = [
  {
    valor: 'mudanca_fisica',
    rotulo: 'Mudança física da sede',
    nota: 'A sociedade passou a funcionar em outro endereço, no mesmo município e UF.',
    homologada: true,
  },
  {
    valor: 'atualizacao_postal',
    rotulo: 'Atualização postal',
    nota: 'CEP, nomenclatura ou numeração mudaram sem a sociedade mudar de lugar. Tratamento jurídico ainda não homologado: a geração fica bloqueada.',
    homologada: false,
  },
  {
    valor: 'erro_material',
    rotulo: 'Correção de erro do instrumento anterior',
    nota: 'O endereço registrado saiu errado. Exige retificação com alvo histórico, ainda não homologada: a geração fica bloqueada.',
    homologada: false,
  },
];

const CAUSAS_QUALIFICACAO: Array<{ valor: CausaQualificacao; rotulo: string; nota: string; homologada: boolean }> = [
  {
    valor: 'mudanca_de_domicilio',
    rotulo: 'Mudança de domicílio',
    nota: 'O sócio passou a residir em outro endereço.',
    homologada: true,
  },
  {
    valor: 'atualizacao_postal',
    rotulo: 'Atualização postal (CEP, nomenclatura, numeração)',
    nota: 'O endereço mudou no registro postal sem o sócio mudar de lugar. A resolução abre dizendo isso, como nos instrumentos registrados.',
    homologada: true,
  },
  {
    valor: 'erro_material',
    rotulo: 'Correção de erro do instrumento anterior',
    nota: 'O endereço registrado saiu errado. Exige retificação com alvo histórico, ainda não homologada: a geração fica bloqueada.',
    homologada: false,
  },
];

/**
 * Assistente de ALTERAÇÃO CONTRATUAL.
 *
 * Por que é um modal na folha, e não um passo do assistente de geração: a
 * alteração é o diff sobre um contrato que JÁ VALEU. Perguntar "houve aumento de
 * capital?" antes de existir contrato registrado é perguntar sobre um documento
 * que ainda não produziu efeito nenhum — e num modelo de constituição a pergunta
 * não tem resposta possível. Aqui ela chega no momento certo: o consultor está
 * olhando a peça registrada e diz o que mudou depois dela.
 *
 * O primeiro passo é CONFERÊNCIA, não pergunta. O livro de movimentos e a
 * comparação do snapshot registrado com o cadastro de hoje já dizem o que
 * aconteceu: cada evento chega marcado, com a evidência que o sustenta, e o
 * consultor desmarca o que não quer nesta peça. Pré-marcação não é aprovação:
 * a aprovação é o "Confirmar" do fim.
 *
 * O que NÃO está homologado (CPF corrigido, profissão, estado civil, atualização
 * postal DA SEDE) aparece como PENDÊNCIA, visível e sem interruptor: detectar não
 * autoriza gerar. Desmarcar um evento significa só "não entra nesta AC"; a
 * divergência continua lá e volta a ser sugerida na próxima peça.
 *
 * Da qualificação, só o ENDEREÇO de sócio pessoa física tem interruptor. É a
 * matéria com modelo e causa homologados; o resto da qualificação da mesma
 * pessoa segue como pendência, e o consolidado mantém o que foi registrado.
 */
export const AlteracaoContratualDialog = ({
  open,
  onOpenChange,
  documentoDeOrigem,
  empresaLabel,
  flags,
  evidenciaPorFlagNome,
  candidatoSede = null,
  candidatosEndereco = [],
  pendencias = [],
  causaSede,
  onCausaSede,
  causaQualificacao,
  onCausaQualificacao,
  respostas,
  onAlternar,
  onConfirmar,
  salvando,
}: AlteracaoContratualDialogProps) => {
  const [passo, setPasso] = useState<1 | 2>(1);
  // Reabrir sempre começa do primeiro passo, também quando é o CONTROLLER que
  // abre (o componente fica montado com `open=false`, e o passo 2 sobrevivia à
  // reabertura: "Rever os eventos" caía direto na confirmação, sem a lista).
  useEffect(() => {
    if (open) setPasso(1);
  }, [open]);
  const marcadas = flags.filter((f) => respostas[f.id] === true);
  const sedeMarcada = flags.some((f) => f.nome === FLAG_SEDE && respostas[f.id] === true);
  const qualificacaoMarcada = flags.some((f) => f.nome === FLAG_QUALIFICACAO && respostas[f.id] === true);
  const enderecosElegiveis = candidatosEndereco.filter((c) => c.elegivel);
  const causaEscolhida = CAUSAS.find((c) => c.valor === causaSede);
  const causaQualEscolhida = CAUSAS_QUALIFICACAO.find((c) => c.valor === causaQualificacao);
  // Quem decide se dá para confirmar é o controller (a regra mora no domínio);
  // aqui só se antecipa a frase, para o botão não prometer o que vai falhar.
  const bloqueioSede = sedeMarcada
    ? !candidatoSede
      ? 'Nada no cadastro registra mudança de sede: desmarque a sede, ou atualize o endereço da sociedade antes.'
      : !candidatoSede.elegivel
        ? `A sede não pode ser gerada: ${candidatoSede.pendencias.join(' ')}`
        : causaEscolhida && !causaEscolhida.homologada
          ? `${causaEscolhida.rotulo}: caso não homologado. Só a mudança física está aprovada para geração.`
          : null
    : null;
  const bloqueioQualificacao = qualificacaoMarcada
    ? enderecosElegiveis.length === 0
      ? (candidatosEndereco.length > 0
        ? `Nenhum endereço de sócio pode ser gerado: ${candidatosEndereco.flatMap((c) => c.pendencias).join(' ')}`
        : 'Nada no cadastro registra mudança de endereço de sócio: desmarque a qualificação, ou atualize o endereço do sócio antes.')
      : causaQualEscolhida && !causaQualEscolhida.homologada
        ? `${causaQualEscolhida.rotulo}: caso não homologado para a qualificação.`
        : null
    : null;
  const bloqueio = bloqueioSede ?? bloqueioQualificacao;

  // Reabrir sempre começa do primeiro passo: o modal é curto e voltar ao meio
  // dele obrigaria a lembrar onde parou.
  const abrirFechar = (aberto: boolean) => {
    if (aberto) setPasso(1);
    onOpenChange(aberto);
  };

  const linhasDaSede: LinhaDaComparacao[] = candidatoSede
    ? Object.keys(ROTULO_SEDE)
      .filter((k) => k in candidatoSede.antes || k in candidatoSede.depois)
      .map((k) => ({
        chave: k,
        rotulo: ROTULO_SEDE[k],
        antes: candidatoSede.antes[k] ?? null,
        depois: candidatoSede.depois[k] ?? null,
      }))
    : [];
  // Uma linha por sócio, e o rótulo é o nome — a evidência do candidato já vem
  // com ele ("Endereço de Ana: … -> …"), e é dela que o nome sai sem exigir um
  // campo novo no candidato só para a tela.
  const linhasDosEnderecos: LinhaDaComparacao[] = candidatosEndereco.map((c) => ({
    chave: c.id,
    rotulo: c.evidencia.replace(/^Endereço de /, '').split(':')[0],
    antes: c.antes.endereco ?? null,
    depois: c.depois.endereco ?? null,
    impedimento: c.elegivel ? undefined : 'não entra nesta peça',
  }));

  return (
    <Dialog open={open} onOpenChange={abrirFechar}>
      <DialogContent className="grid-rows-[auto_minmax(0,1fr)_auto] max-h-[90vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileStack className="h-4 w-4 text-osg-moss" />
            Gerar alteração contratual
          </DialogTitle>
          <DialogDescription>
            A partir de <span className="font-medium text-foreground">{documentoDeOrigem}</span>
            {empresaLabel ? <> · {empresaLabel}</> : null}
          </DialogDescription>
        </DialogHeader>

        {passo === 1 && (
          <div className="space-y-4 overflow-y-auto pr-1">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">O que mudou desde o registro</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                A lista compara o instrumento registrado com o cadastro de hoje: o livro de movimentos
                de quota, a sede e a administração. Confira, e desmarque o que não deve entrar nesta
                peça. Cada evento marcado traz a resolução dele; o que ficar desmarcado permanece como
                está no instrumento registrado.
              </p>
            </div>

            <div className="space-y-2.5">
              {flags.map((flag, i) => {
                const ligada = respostas[flag.id] === true;
                const ehSede = flag.nome === FLAG_SEDE;
                const evidencia = evidenciaPorFlagNome?.get(flag.nome);
                // A sede sem candidato elegível fica visível e desligada, com o
                // motivo: ambiguidade não vira evento gerável.
                const ehQualificacao = flag.nome === FLAG_QUALIFICACAO;
                // Travada quando a divergência existe e NENHUMA ponta dela é
                // gerável. Endereço parcialmente gerável não trava: os elegíveis
                // entram, e a tabela diz quem ficou de fora.
                const travada = (ehSede && !!candidatoSede && !candidatoSede.elegivel)
                  || (ehQualificacao && candidatosEndereco.length > 0
                    && candidatosEndereco.every((c) => !c.elegivel));
                const motivoTravada = ehSede
                  ? candidatoSede?.pendencias.join(' ')
                  : candidatosEndereco.flatMap((c) => c.pendencias).join(' ');
                return (
                  <div
                    key={flag.id}
                    className={cn(
                      'rounded-md border bg-superficie-cartao p-3 pl-4 transition-colors duration-200 animate-osg-card-in motion-reduce:animate-none',
                      ligada ? 'border-osg-moss/50 bg-osg-moss/[0.04]' : 'border-osg-200/80',
                    )}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <ToggleRight
                        aria-hidden
                        className={cn('h-4 w-4 shrink-0', ligada ? 'text-osg-moss' : 'text-muted-foreground/40')}
                      />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <Label
                          htmlFor={`evento-${flag.id}`}
                          className="block cursor-pointer text-sm font-medium text-foreground"
                        >
                          {flag.descricao || flag.nome}
                        </Label>
                        {/* A evidência é o que substitui a pergunta: em vez de
                            "houve aumento de capital?", os números que provam que
                            houve. Sem evidência, o cadastro não sustenta o evento.
                            Fora do <Label> de propósito: ela é a prova, não o nome
                            do interruptor, e no nome acessível só atrapalharia. */}
                        <p className={cn('text-xs', evidencia ? 'text-osg-700' : 'text-muted-foreground')}>
                          {evidencia ?? 'nada no cadastro registra este evento'}
                        </p>
                        {travada && (
                          <p className="flex items-start gap-1 text-xs text-warning">
                            <AlertTriangle aria-hidden className="mt-0.5 h-3 w-3 shrink-0" />
                            <span>{motivoTravada}</span>
                          </p>
                        )}
                      </div>
                      <Switch
                        id={`evento-${flag.id}`}
                        checked={ligada}
                        disabled={salvando || travada}
                        onCheckedChange={(v) => onAlternar(flag.id, v)}
                      />
                    </div>

                    {ehSede && candidatoSede && (
                      <Collapsible className="mt-2 pl-7">
                        <CollapsibleTrigger className="flex items-center gap-1 text-xs text-osg-600 hover:text-osg-700 [&[data-state=open]>svg]:rotate-180">
                          <ChevronDown className="h-3 w-3 transition-transform" />
                          Ver antes e depois, campo a campo
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="mt-2">
                            <ComparacaoAntesDepois linhas={linhasDaSede} />
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {ehQualificacao && candidatosEndereco.length > 0 && (
                      <Collapsible className="mt-2 pl-7">
                        <CollapsibleTrigger className="flex items-center gap-1 text-xs text-osg-600 hover:text-osg-700 [&[data-state=open]>svg]:rotate-180">
                          <ChevronDown className="h-3 w-3 transition-transform" />
                          Ver antes e depois, sócio a sócio
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="mt-2">
                            <ComparacaoAntesDepois linhas={linhasDosEnderecos} />
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {ehQualificacao && ligada && enderecosElegiveis.length > 0 && (
                      <div className="mt-3 space-y-2 pl-7">
                        <p className="text-xs font-medium text-foreground">Por que o endereço mudou?</p>
                        <RadioGroup
                          value={causaQualificacao}
                          onValueChange={(v) => onCausaQualificacao(v as CausaQualificacao)}
                          disabled={salvando}
                          className="gap-1.5"
                        >
                          {CAUSAS_QUALIFICACAO.map((c) => (
                            <label key={c.valor} className="flex cursor-pointer items-start gap-2 text-xs">
                              <RadioGroupItem value={c.valor} id={`causa-qual-${c.valor}`} className="mt-0.5" />
                              <span>
                                <span className={cn('font-medium', c.homologada ? 'text-foreground' : 'text-muted-foreground')}>
                                  {c.rotulo}
                                </span>
                                <span className="block text-muted-foreground">{c.nota}</span>
                              </span>
                            </label>
                          ))}
                        </RadioGroup>
                      </div>
                    )}

                    {ehSede && ligada && candidatoSede?.elegivel && (
                      <div className="mt-3 space-y-2 pl-7">
                        <p className="text-xs font-medium text-foreground">Por que a sede mudou?</p>
                        <RadioGroup
                          value={causaSede}
                          onValueChange={(v) => onCausaSede(v as CausaSede)}
                          disabled={salvando}
                          className="gap-1.5"
                        >
                          {CAUSAS.map((c) => (
                            <label key={c.valor} className="flex cursor-pointer items-start gap-2 text-xs">
                              <RadioGroupItem value={c.valor} id={`causa-${c.valor}`} className="mt-0.5" />
                              <span>
                                <span className={cn('font-medium', c.homologada ? 'text-foreground' : 'text-muted-foreground')}>
                                  {c.rotulo}
                                </span>
                                <span className="block text-muted-foreground">{c.nota}</span>
                              </span>
                            </label>
                          ))}
                        </RadioGroup>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {pendencias.length > 0 && (
              <div className="space-y-1.5 rounded-md border border-warning/40 bg-warning/10 p-3">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-warning">
                  <AlertTriangle aria-hidden className="h-3.5 w-3.5" />
                  Divergências que não viram evento nesta peça
                </p>
                <p className="text-xs leading-relaxed text-warning">
                  Detectadas, mas sem modelo ou decisão jurídica homologados, ou sem base suficiente. O
                  instrumento mantém o que foi registrado; elas continuam pendentes.
                </p>
                <ul className="list-disc space-y-0.5 pl-5 text-xs text-warning">
                  {pendencias.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {passo === 2 && (
          <div className="space-y-4 overflow-y-auto pr-1">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">
                {marcadas.length === 0
                  ? 'Nenhum evento marcado'
                  : `${marcadas.length} evento${marcadas.length === 1 ? '' : 's'} nesta alteração`}
              </p>
              {marcadas.length > 0 && (
                <ul className="space-y-1.5 rounded-md border border-osg-300/60 bg-osg-50/50 p-3">
                  {marcadas.map((f) => (
                    <li key={f.id} className="flex gap-2 text-sm text-foreground">
                      <span aria-hidden className="text-osg-moss">
                        •
                      </span>
                      <span>
                        {f.descricao || f.nome}
                        {f.nome === FLAG_SEDE && candidatoSede ? (
                          <span className="block text-xs text-muted-foreground">
                            {candidatoSede.antes.sede} → {candidatoSede.depois.sede}
                          </span>
                        ) : null}
                        {f.nome === FLAG_QUALIFICACAO && enderecosElegiveis.length > 0 ? (
                          <span className="block text-xs text-muted-foreground">
                            {enderecosElegiveis.map((c) => c.evidencia).join(' · ')}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* O que a confirmação faz: a regra base + eventos, dita antes do gesto. */}
            <div className="space-y-1.5 rounded-md border border-osg-moss/30 bg-osg-moss/[0.06] p-3">
              <p className="text-sm font-semibold text-osg-700">
                O consolidado nasce do instrumento registrado mais os eventos marcados
              </p>
              <p className="text-xs leading-relaxed text-osg-700/90">
                Quadro societário e capital saem do livro de movimentos quando um evento de quota está
                marcado. Sede, administração e o resto do instrumento só mudam pelo evento correspondente;
                o que não foi marcado permanece exatamente como registrado, mesmo que o cadastro já
                esteja diferente. Confirmar grava esta seleção e cria a alteração como rascunho; o texto
                é selado no "Validar versão".
              </p>
            </div>

            {bloqueio && (
              <p className="flex items-start gap-1.5 text-xs text-destructive">
                <AlertTriangle aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{bloqueio}</span>
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {passo === 1 ? (
            <>
              <Button variant="ghost" onClick={() => abrirFechar(false)} disabled={salvando}>
                Cancelar
              </Button>
              <Button onClick={() => setPasso(2)} disabled={salvando}>
                Continuar
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setPasso(1)} disabled={salvando}>
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Voltar
              </Button>
              <Button onClick={onConfirmar} disabled={salvando || !!bloqueio}>
                {salvando && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Confirmar alteração contratual
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
