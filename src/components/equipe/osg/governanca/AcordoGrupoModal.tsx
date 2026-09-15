import { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { AjudaDoCampo } from '@/components/equipe/osg/ComAjuda';
import { FieldSection } from '@/components/equipe/osg/formKit';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { MultiSelectCombobox, type ComboOption } from '@/components/ui/MultiSelectCombobox';
import { SingleSelectCombobox } from '@/components/ui/SingleSelectCombobox';
import { rotuloDoRamo } from '@/lib/acordoQuotistas';
import { expressaoDoQuorum, type BaseQuorum, type TipoQuorum } from '@/lib/acordoQuotistasPadrao';
import { cn } from '@/lib/utils';
import type { CampoDoAcordo, GrupoDoAcordo } from '@/lib/acordoGrupos';

/** O que o modal edita: os campos do cabeçalho mais as três listas. */
export interface ValoresDoAcordo extends Record<string, unknown> {
  quoruns: { materia: string; chave?: string | null; tipo: TipoQuorum; percentual?: number | null; base: BaseQuorum }[];
  ramos: { nome: string }[];
  ordemPreferencia: string[];
  signatarios: string[];
  sociedades: string[];
}

/*
 * O QUE IMPEDE DE SALVAR, e por que a checagem mora aqui.
 *
 * O banco já recusa linha vazia: `acordo_quorum_materia_ck` e
 * `acordo_ramo_nome_ck` exigem texto. Só que a recusa chega como mensagem do
 * Postgres num toast vermelho, sem dizer qual linha era, depois de a pessoa ter
 * clicado em Salvar. Aqui ela chega antes, com o número da linha, e o modal
 * continua aberto no campo que falta.
 *
 * Nada mais é obrigatório de propósito: acordo sem prazo de sigilo, sem opção
 * de compra e sem cláusula de não concorrência existe no acervo, e travar o
 * salvamento neles obrigaria a inventar resposta. O que se cobra é só o que o
 * banco recusaria e o documento escreveria torto.
 */
function oQueFalta(v: ValoresDoAcordo): string | null {
  const semAssunto = v.quoruns.findIndex((q) => q.materia.trim() === '');
  if (semAssunto >= 0) {
    return `O quórum da linha ${semAssunto + 1} está sem assunto. Escreva sobre o que ele decide, `
      + 'como "Alterar o contrato social", ou tire a linha.';
  }

  const semNumero = v.quoruns.findIndex(
    (q) => q.tipo === 'percentual' && !(q.percentual && q.percentual > 0),
  );
  if (semNumero >= 0) {
    return `O quórum "${v.quoruns[semNumero].materia.trim()}" é por percentual e está sem o número.`;
  }

  const ramoSemNome = v.ramos.findIndex((r) => r.nome.trim() === '');
  if (ramoSemNome >= 0) {
    return `O ramo da linha ${ramoSemNome + 1} está sem nome. O rótulo do documento se monta com `
      + 'ele, e sairia "DESCENDENTES DE " no acordo.';
  }

  return null;
}

/** Uma pessoa do cliente, como o seletor a mostra. */
export interface PessoaParaEscolher {
  id: string;
  denominacao: string;
  tipo_pessoa: string | null;
  cpf_cnpj: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grupo: GrupoDoAcordo;
  valores: ValoresDoAcordo;
  /** As pessoas já cadastradas do cliente. A tela busca, o modal só desenha. */
  pessoas: PessoaParaEscolher[];
  onSalvar: (valores: ValoresDoAcordo) => Promise<unknown>;
  salvando: boolean;
}

const ROTULO = 'flex h-5 items-center gap-1.5';

/** Pessoa vira opção de lista, com o documento como texto de busca. */
function comoOpcao(p: PessoaParaEscolher): ComboOption {
  const doc = (p.cpf_cnpj ?? '').trim();
  return {
    value: p.id,
    label: p.denominacao,
    hint: doc || undefined,
    // Sem pontuação também: quem digita o CNPJ raramente digita os pontos.
    keywords: doc ? [doc, doc.replace(/\D/g, '')] : undefined,
  };
}

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
 * frase que vai sair, "75% (setenta e cinco por cento) dos presentes", enquanto o consultor
 * escolhe o tipo e a base.
 */
export function AcordoGrupoModal({
  open, onOpenChange, grupo, valores, pessoas, onSalvar, salvando,
}: Props) {
  const [form, setForm] = useState<ValoresDoAcordo>(valores);

  useEffect(() => {
    if (open) setForm(valores);
  }, [open, valores]);

  const mexer = (campo: string, valor: unknown) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  const visivel = (c: CampoDoAcordo) => !c.dependeDe || form[c.dependeDe] === true;

  const opcoesDePessoa = useMemo(() => pessoas.map(comoOpcao), [pessoas]);
  // Sociedade relacionada é empresa, então a lista só oferece pessoa jurídica.
  const opcoesDeEmpresa = useMemo(
    () => pessoas.filter((p) => p.tipo_pessoa === 'PJ').map(comoOpcao),
    [pessoas],
  );

  /*
   * Os campos em BLOCOS, na ordem em que foram declarados.
   *
   * Só o "Saída de sócio e preferência" tem mais de um: ele sozinho cobre três
   * assuntos e quinze campos, e sem a divisão o modal dele vira a parede de
   * campos que a crítica ao mockup apontou. Os outros sete grupos caem num bloco
   * único, que recebe o título do próprio grupo em vez de um subtítulo repetido.
   */
  const blocos = useMemo(() => {
    const ordem: (string | undefined)[] = [];
    const porSecao = new Map<string | undefined, CampoDoAcordo[]>();
    for (const c of grupo.campos.filter(visivel)) {
      if (!porSecao.has(c.secao)) {
        porSecao.set(c.secao, []);
        ordem.push(c.secao);
      }
      porSecao.get(c.secao)!.push(c);
    }
    return ordem.map((titulo) => ({ titulo, campos: porSecao.get(titulo)! }));
    // `form` entra porque `visivel` lê os interruptores: ligar a não concorrência
    // faz quatro campos aparecerem, e o bloco tem de crescer junto.
  }, [grupo, form]); // eslint-disable-line react-hooks/exhaustive-deps

  const salvar = async () => {
    const falta = oQueFalta(form);
    if (falta) {
      toast.error(falta);
      return;
    }
    await onSalvar(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{grupo.titulo}</DialogTitle>
          {/*
            `DialogDescription` e não `<p>`: o Radix procura um elemento descritor
            para ligar em `aria-describedby`, e sem ele avisa no console a cada
            abertura. Era um aviso por modal aberto, medido no QA.
          */}
          <DialogDescription>{grupo.resumo}</DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {blocos.map((b, i) => (
            <FieldSection
              key={b.titulo ?? 'unico'}
              number={String(i + 1).padStart(2, '0')}
              title={b.titulo ?? grupo.titulo}
            >
              <div className="space-y-5">
                {b.campos.map((c) => (
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

              {(c.tipo === 'texto' || c.tipo === 'numero' || c.tipo === 'data') && (
                <Input
                  id={`ac-${c.campo}`}
                  type={c.tipo === 'numero' ? 'number' : c.tipo === 'data' ? 'date' : 'text'}
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
                <div
                  className={cn(
                    'rounded-md border p-3',
                    // Opção com explicação ocupa a linha inteira; sem ela, as
                    // opções cabem lado a lado e a caixa não vira uma coluna longa.
                    c.opcoes?.some((o) => o.descricao)
                      ? 'space-y-2.5'
                      : 'flex flex-wrap gap-x-4 gap-y-2',
                  )}
                >
                  {c.opcoes?.map((o) => {
                    const marcados = (form[c.campo] as string[] | null) ?? [];
                    /*
                     * A OPÇÃO ESPELHADA MOSTRA, MAS NÃO PERGUNTA.
                     *
                     * Quatro dos dez mecanismos se respondem noutro bloco, com
                     * os detalhes lá. Aqui eles continuam aparecendo, porque a
                     * lista é o inventário do que o acordo tem, mas sem aceitar
                     * clique e dizendo onde se muda. Duas respostas para o mesmo
                     * fato é cláusula com cabeçalho e corpo em branco.
                     */
                    const espelho = o.espelha;
                    const marcado = espelho ? espelho.ligado(form) : marcados.includes(o.valor);
                    return (
                      <label
                        key={o.valor}
                        className={cn(
                          'flex items-start gap-2 text-sm',
                          espelho && 'cursor-default opacity-70',
                        )}
                      >
                        <Checkbox
                          className="mt-0.5"
                          checked={marcado}
                          disabled={!!espelho}
                          onCheckedChange={(v) => mexer(
                            c.campo,
                            v ? [...marcados, o.valor] : marcados.filter((x) => x !== o.valor),
                          )}
                        />
                        <span>
                          {o.rotulo}
                          {o.descricao && (
                            <span className="block text-xs text-muted-foreground">
                              {o.descricao}
                            </span>
                          )}
                          {espelho && (
                            <span className="block text-xs italic text-muted-foreground">
                              Liga e desliga no bloco &ldquo;{espelho.bloco}&rdquo;, onde ficam os
                              detalhes.
                            </span>
                          )}
                        </span>
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

              {(c.campo === 'signatarios' || c.campo === 'sociedades') && (
                pessoas.length === 0 ? (
                  <SemPessoas />
                ) : (
                  <MultiSelectCombobox
                    options={c.campo === 'sociedades' ? opcoesDeEmpresa : opcoesDePessoa}
                    selected={(form[c.campo] as string[]) ?? []}
                    onChange={(v) => mexer(c.campo, v)}
                    placeholder={c.campo === 'sociedades'
                      ? 'Clique para incluir uma sociedade…'
                      : 'Clique para incluir um signatário…'}
                    addLabel="incluir"
                  />
                )
              )}

              {c.campo === 'representante_pessoa_id' && (
                pessoas.length === 0 ? (
                  <SemPessoas />
                ) : (
                  <SingleSelectCombobox
                    id={`ac-${c.campo}`}
                    options={opcoesDePessoa}
                    value={(form[c.campo] as string | null) ?? null}
                    onChange={(v) => mexer(c.campo, v)}
                    placeholder="Escolha quem representa"
                  />
                )
              )}

            </div>
                ))}
              </div>
            </FieldSection>
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

/** Cliente sem ninguém cadastrado: diz onde cadastrar, em vez de lista vazia. */
function SemPessoas() {
  return (
    <p className="rounded-md border border-dashed border-osg-300 bg-osg-50/40 px-3 py-2.5 text-xs text-muted-foreground">
      Este cliente ainda não tem pessoas cadastradas. Cadastre em Qualificação das
      Partes e volte aqui.
    </p>
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
              placeholder="O assunto, por exemplo: Alterar o contrato social"
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
          {/*
            A frase pronta embaixo de cada linha responde a dúvida antes de ela
            existir: o consultor digita o ASSUNTO, e o sistema escreve o resto.
          */}
          <p className="mt-2 text-xs text-muted-foreground">
            No acordo vai sair:{' '}
            <span className="font-medium text-foreground">
              {q.materia.trim() || 'o assunto'}, {expressaoDoQuorum(q)}
            </span>
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

/*
 * SÓ O NOME SE DIGITA, e o rótulo deixou de ser escolha.
 *
 * Havia um seletor entre "RAMO [nome]" e "DESCENDENTES DE [nome]". Contado nos
 * 14 documentos do acervo, "RAMO [nome]" não aparece em nenhum, e "ramo" já
 * significa ramo de ATIVIDADE em três acordos. O mockup da governança tinha
 * derrubado essa opção com a mesma medição, e ela voltou por eu ter seguido o
 * levantamento de 11/09 em vez do documento.
 *
 * No lugar do seletor entra a prévia: quem digita vê a frase que vai sair.
 */
function ListaDeRamos({
  linhas, mexer,
}: { linhas: ValoresDoAcordo['ramos']; mexer: (l: ValoresDoAcordo['ramos']) => void }) {
  return (
    <div className="space-y-2">
      {linhas.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            className="h-8 flex-1 text-sm" value={r.nome}
            aria-label={`Nome do fundador do ramo ${i + 1}`}
            placeholder="CRISTINA"
            onChange={(e) => {
              const nova = [...linhas];
              nova[i] = { ...nova[i], nome: e.target.value };
              mexer(nova);
            }}
          />
          <span className="w-72 shrink-0 truncate text-xs text-muted-foreground">
            {r.nome.trim()
              ? `${rotuloDoRamo(r)}, formado por ${r.nome.trim().toUpperCase()} e seus `
                + 'descendentes em linha vertical'
              : 'digite o nome do fundador'}
          </span>
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
        onClick={() => mexer([...linhas, { nome: '' }])}
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
