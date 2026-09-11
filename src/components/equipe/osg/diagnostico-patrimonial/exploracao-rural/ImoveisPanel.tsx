import { useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, Pencil, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { FieldSection, fieldCls } from '@/components/equipe/osg/formKit';
import { formGridCls } from '@/lib/osgFormGrid';
import {
  Campo, ValorDerivado,
} from '@/components/equipe/osg/diagnostico-patrimonial/exploracao-rural/CampoComDica';
import {
  AREA_STEP, clampAreaInput, formatArea, formatAreaUnidade,
} from '@/components/equipe/osg/diagnostico-patrimonial/areaUtils';
import { letraAlinea } from '@/lib/templates/extenso';
import type { MatriculaEnriched } from '@/hooks/useDiagnosticoPatrimonial';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import {
  imoveisComAreaExcedida,
  nomeDaOrigem,
  novoImovel,
  ORIGEM_TIPO_OPCOES,
  type DraftExploracaoRural,
  type ImovelDraft,
  type OrigemExternaDraft,
  type OrigemTipo,
} from '@/lib/exploracaoRuralModalModels';
import { OrigemExternaDialog } from '@/components/equipe/osg/diagnostico-patrimonial/exploracao-rural/OrigemExternaDialog';

/**
 * Aba "Imóveis e origens": os itens do Anexo Único.
 *
 * Três decisões desta tela vêm direto dos contratos reais:
 *
 * 1. **A origem é POR IMÓVEL, não pelo instrumento.** O `[BV-COM]` reúne 15 imóveis
 *    vindos de 6 origens distintas numa composse só.
 * 2. **A origem externa é cadastrada UMA VEZ e reusada.** Daqueles 15 imóveis, os
 *    itens (a)-(f) vêm todos da mesma Agro Aliança. É por isso que o campo oferece
 *    "reusar origem já cadastrada" antes de "cadastrar nova": digitar NIRE, capital e
 *    administradores seis vezes produziria seis cópias que divergem na primeira
 *    correção.
 * 3. **A área cedida NÃO é a área do imóvel.** No Anexo do `[BV-COM]` a cedida é
 *    sempre menor que a total da mesma linha — 234 ha cedidos de um imóvel de
 *    295,86 ha. A tela mostra as duas lado a lado, e avisa quando a cedida passa da
 *    área da matrícula (validação de aplicação: `CHECK` não enxerga outra tabela).
 *
 * Ordenação por setas, não por arraste: não há biblioteca de arraste no projeto, e
 * trazer uma para ordenar até 15 itens é peso de bundle e dívida de acessibilidade
 * por conveniência. Setas funcionam com teclado de graça.
 */
interface Props {
  draft: DraftExploracaoRural;
  onChange: (draft: DraftExploracaoRural) => void;
  matriculas: MatriculaEnriched[];
  pessoas: PessoaRow[];
  /** Outros instrumentos do mesmo cliente, para a origem interna. */
  instrumentos: { id: string; rotulo: string; vigente: boolean }[];
  /** Area (m2) que outros instrumentos ativos ja tomam de cada matricula. */
  cedidaPorOutros: Map<string, number>;
}

const SEM_VALOR = '__nenhum__';
const UNIDADES = [
  { value: 'ha', label: 'ha' },
  { value: 'm2', label: 'm²' },
];

// Os dois caminhos de origem convivem numa lista só, então o valor carrega de qual
// grupo ele veio: sem o prefixo, um uuid de instrumento e um id local de origem
// externa seriam indistinguíveis na volta.
const PREFIXO_INTERNA = 'int:';
const PREFIXO_EXTERNA = 'ext:';

const GRADE_4 = `${formGridCls(4)} items-end gap-3`;
const TRIGGER_FLEX = `${fieldCls} min-w-0 flex-1`;

/**
 * Origem que aponta para alguém.
 *
 * Exploração própria e herança não têm contraparte: na primeira a posse é do próprio
 * cliente, na segunda vem de um espólio, não de um contrato cedido por outra parte.
 * Perguntar "de onde veio" nesses dois casos é campo que só pode ficar vazio.
 */
const exigeContraparte = (tipo: OrigemTipo | ''): boolean =>
  tipo !== '' && tipo !== 'propria' && tipo !== 'heranca';

const temOrigem = (item: ImovelDraft): boolean =>
  !!item.origem_exploracao_rural_id || !!item.origem_externa_local_id;

const valorDaOrigem = (item: ImovelDraft): string => {
  if (item.origem_exploracao_rural_id) return PREFIXO_INTERNA + item.origem_exploracao_rural_id;
  if (item.origem_externa_local_id) return PREFIXO_EXTERNA + item.origem_externa_local_id;
  return SEM_VALOR;
};

export function ImoveisPanel({ draft, onChange, matriculas, pessoas, instrumentos, cedidaPorOutros }: Props) {
  // `imovelDestino`: qual imóvel pediu a origem nova, para ela nascer vinculada a ele.
  const [dialogo, setDialogo] = useState<{
    open: boolean;
    origem: OrigemExternaDraft | null;
    imovelDestino: string | null;
  }>({ open: false, origem: null, imovelDestino: null });

  const excedidos = imoveisComAreaExcedida(draft.imoveis, matriculas, cedidaPorOutros);
  const excedidoPorImovel = new Map(excedidos.map((e) => [e.imovelLocalId, e]));

  const setImoveis = (imoveis: ImovelDraft[]) => onChange({ ...draft, imoveis });

  const adicionar = () => setImoveis([...draft.imoveis, novoImovel(draft.imoveis.length)]);

  const alterar = (id: string, patch: Partial<ImovelDraft>) =>
    setImoveis(draft.imoveis.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const remover = (id: string) =>
    setImoveis(draft.imoveis.filter((i) => i.id !== id).map((i, indice) => ({ ...i, ordem: indice })));

  /** Troca com o vizinho e renumera — a ordem é o que o Anexo imprime. */
  const mover = (indice: number, direcao: -1 | 1) => {
    const destino = indice + direcao;
    if (destino < 0 || destino >= draft.imoveis.length) return;
    const copia = [...draft.imoveis];
    [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
    setImoveis(copia.map((i, pos) => ({ ...i, ordem: pos })));
  };

  /**
   * Grava a origem e, quando ela é NOVA, já a vincula ao imóvel que a pediu.
   *
   * Num `onChange` só, de propósito: `draft` é a prop desta renderização, então duas
   * chamadas seguidas fariam a segunda partir do estado velho e perder a primeira.
   *
   * `imovelDestino` é decidido no clique do botão "+", não aqui — sem isso a origem
   * nova cairia no primeiro imóvel sem origem, que nem sempre é o que está na frente
   * do consultor.
   */
  const salvarOrigem = (origem: OrigemExternaDraft, imovelDestino: string | null) => {
    const existe = draft.origens.some((o) => o.id === origem.id);
    const origens = existe
      ? draft.origens.map((o) => (o.id === origem.id ? origem : o))
      : [...draft.origens, origem];
    const imoveis = imovelDestino
      ? draft.imoveis.map((i) =>
          i.id === imovelDestino
            ? { ...i, origem_externa_local_id: origem.id, origem_exploracao_rural_id: null }
            : i,
        )
      : draft.imoveis;
    onChange({ ...draft, origens, imoveis });
  };

  const usosDaOrigem = (localId: string) =>
    draft.imoveis.filter((i) => i.origem_externa_local_id === localId).length;

  const composse = draft.tipo_exploracao === 'composse';

  /** Escolher um caminho de origem limpa o outro — eles são mutuamente exclusivos. */
  const escolherOrigem = (item: ImovelDraft, valor: string) => {
    if (valor === SEM_VALOR) {
      alterar(item.id, { origem_exploracao_rural_id: null, origem_externa_local_id: null });
      return;
    }
    const id = valor.slice(valor.indexOf(':') + 1);
    alterar(item.id, {
      origem_exploracao_rural_id: valor.startsWith(PREFIXO_INTERNA) ? id : null,
      origem_externa_local_id: valor.startsWith(PREFIXO_EXTERNA) ? id : null,
    });
  };

  // Matrícula já usada em outro item: a UNIQUE (exploracao_rural_id, matricula_id)
  // recusaria, então tirar da lista evita o erro em vez de traduzi-lo depois.
  const matriculasDisponiveis = (atual: string | null) => {
    const usadas = new Set(
      draft.imoveis.map((i) => i.matricula_id).filter((id): id is string => !!id && id !== atual),
    );
    return matriculas.filter((m) => !usadas.has(m.id));
  };

  return (
    <>
      <FieldSection
        number="01"
        title="Imóveis do Anexo"
        hint={
          draft.imoveis.length > 0
            ? `${draft.imoveis.length} ${draft.imoveis.length === 1 ? 'item' : 'itens'}`
            : 'a ordem aqui é a ordem do Anexo'
        }
        actions={
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 gap-1.5 text-xs"
            onClick={adicionar}
            disabled={matriculas.length === 0}
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar imóvel
          </Button>
        }
      >
        {matriculas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Este cliente não tem matrícula cadastrada. O item do Anexo exige uma matrícula — cadastre
            em Diagnóstico Patrimonial primeiro.
          </p>
        ) : draft.imoveis.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum imóvel neste instrumento. O contrato pode ser gravado assim, mas o Anexo Único
            sai vazio.
          </p>
        ) : (
          <div className="space-y-2">
            {draft.imoveis.map((item, indice) => {
              const matricula = matriculas.find((m) => m.id === item.matricula_id) ?? null;
              const excedido = excedidoPorImovel.get(item.id);
              const origemVinculada = draft.origens.find((o) => o.id === item.origem_externa_local_id) ?? null;
              return (
                <div
                  key={item.id}
                  className="group space-y-3 rounded-lg border border-osg-200/70 bg-card p-3 transition-colors hover:bg-muted/20"
                >
                  {/* Cabeçalho do item: letra da alínea + resumo + ações. A letra e as
                      setas saíram de DENTRO da grade — antes elas roubavam largura da
                      primeira linha de campos, e as duas grades do cartão (campos do
                      imóvel e campos de origem) ficavam com larguras diferentes, cada
                      coluna desalinhada da de baixo. */}
                  <div className="flex items-center gap-2 border-b border-osg-100 pb-2">
                    {/* Letra, não número: o Anexo Único lista os imóveis por alínea —
                        (a), (b), (c) — e é assim que o Considerando do contrato os
                        referencia. */}
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-osg-100 font-mono text-[10px] font-bold text-osg-700">
                      {/* `letraAlinea` é 1-based e recusa 0 — o índice do array não
                          serve cru. */}
                      {letraAlinea(indice + 1)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                      {matricula
                        ? `Mat. ${matricula.numero}${matricula.bem_denominacao ? ` · ${matricula.bem_denominacao}` : ''}`
                        : 'imóvel ainda não escolhido'}
                    </span>
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <Button
                        type="button" size="icon" variant="ghost" className="h-6 w-6"
                        onClick={() => mover(indice, -1)} disabled={indice === 0}
                        aria-label="Mover imóvel para cima"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button" size="icon" variant="ghost" className="h-6 w-6"
                        onClick={() => mover(indice, 1)} disabled={indice === draft.imoveis.length - 1}
                        aria-label="Mover imóvel para baixo"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button" size="icon" variant="ghost"
                        className="h-6 w-6 text-muted-foreground/50 hover:text-destructive"
                        onClick={() => remover(item.id)}
                        aria-label="Remover imóvel"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className={`${formGridCls(4)} items-end gap-3`}>
                      <Campo
                        label="Matrícula"
                        required
                        campo={`imovel_matricula_${indice}`}
                        dica="Qual imóvel entra neste instrumento. Só aparecem matrículas já cadastradas para este cliente e ainda não usadas em outro item."
                      >
                        <Select
                          value={item.matricula_id ?? SEM_VALOR}
                          onValueChange={(v) =>
                            alterar(item.id, { matricula_id: v === SEM_VALOR ? null : v })
                          }
                        >
                          <SelectTrigger className={fieldCls}>
                            <SelectValue placeholder="Selecionar…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={SEM_VALOR}>— selecionar —</SelectItem>
                            {matriculasDisponiveis(item.matricula_id).map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                <span className="mr-2 font-mono">{m.numero}</span>
                                {m.bem_denominacao ?? ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Campo>

                      <Campo
                        label="Área cedida"
                        dica="Quanto da área do imóvel entra neste instrumento. Não é a área total: costuma ser menor, e não pode passar dela."
                      >
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            step={AREA_STEP}
                            min={0}
                            value={item.area_explorada}
                            onChange={(e) =>
                              alterar(item.id, { area_explorada: clampAreaInput(e.target.value) })
                            }
                            className={`${fieldCls} font-mono`}
                          />
                          <Select
                            value={item.area_unidade}
                            onValueChange={(v) => alterar(item.id, { area_unidade: v })}
                          >
                            <SelectTrigger className={`${fieldCls} w-20 shrink-0`}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {UNIDADES.map((u) => (
                                <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </Campo>

                      {/* Área do imóvel, só leitura: é dado da matrícula, e mostrá-la
                          ao lado é o que deixa claro que a cedida é outra coisa. */}
                      <Campo
                        label="Área do imóvel"
                        dica="Área que consta na matrícula. Vem do cadastro do imóvel e não se edita aqui."
                      >
                        <ValorDerivado>
                          <span className="truncate font-mono">
                            {matricula?.area_documento != null
                              ? formatArea(matricula.area_documento, matricula.area_unidade)
                              : '—'}
                          </span>
                        </ValorDerivado>
                      </Campo>

                      <Campo label="Município / UF" dica="Vem da matrícula selecionada.">
                        <ValorDerivado>
                          {/* `truncate` + `title`: "Lucas do Rio Verde/MT" não cabe na
                              coluna e quebrava a caixa de altura fixa em duas linhas,
                              desalinhando a grade. */}
                          <span
                            className="truncate"
                            title={
                              matricula
                                ? [matricula.municipio_imovel, matricula.uf_imovel].filter(Boolean).join('/')
                                : undefined
                            }
                          >
                            {matricula
                              ? [matricula.municipio_imovel, matricula.uf_imovel].filter(Boolean).join('/') || '—'
                              : '—'}
                          </span>
                        </ValorDerivado>
                      </Campo>
                  </div>

                  {/* Duas causas, duas frases: "voce digitou demais" e "a area ja esta
                      comprometida com outro contrato" pedem acoes diferentes. */}
                  {excedido && (
                    <p className="flex items-start gap-1.5 text-[11px] leading-snug text-destructive">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                      {excedido.causa === 'sozinho' ? (
                        <span>
                          A área cedida (
                          {formatArea(excedido.cedidaNaUnidadeDaMatricula, excedido.unidadeDaMatricula)}) é maior
                          que a área do próprio imóvel (
                          {formatArea(excedido.areaDaMatricula, excedido.unidadeDaMatricula)}). Comparado em{' '}
                          {formatAreaUnidade(excedido.unidadeDaMatricula)}.
                        </span>
                      ) : (
                        <span>
                          Outro instrumento ativo já cede{' '}
                          {formatArea(excedido.cedidaPorOutros, excedido.unidadeDaMatricula)} deste imóvel. Com os{' '}
                          {formatArea(excedido.cedidaNaUnidadeDaMatricula, excedido.unidadeDaMatricula)} daqui, a
                          soma passa da área total (
                          {formatArea(excedido.areaDaMatricula, excedido.unidadeDaMatricula)}).
                        </span>
                      )}
                    </p>
                  )}

                  {/* ORIGEM SO NA COMPOSSE.
                      Reuniao de 19/08/2026 com a OSG, sobre este mesmo campo:
                        - "Esse campo faz sentido?"
                        - "Pra parceria nao, so pra composse."
                      O motivo esta na natureza da parceria: ela recai sobre os imoveis
                      da propria outorgante, que ja e quem tem a posse — nao ha de onde
                      a posse "vir". Na composse e o contrario: cada imovel entra por um
                      caminho diferente (parceria, arrendamento, exploracao propria) e o
                      contrato precisa dizer qual, imovel a imovel. */}
                  {composse && (
                    <div className="rounded-md border border-osg-100 bg-osg-50/40 p-2.5">
                      <div className={GRADE_4}>
                        <Campo
                          label="Tipo de origem"
                          dica="Por qual caminho a posse deste imovel entrou na composse. Cada imovel pode ter vindo de um jeito diferente."
                        >
                          <Select
                            value={item.origem_tipo || SEM_VALOR}
                            onValueChange={(v) =>
                              alterar(item.id, { origem_tipo: v === SEM_VALOR ? '' : (v as OrigemTipo) })
                            }
                          >
                            <SelectTrigger className={fieldCls}>
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={SEM_VALOR}>— nenhum —</SelectItem>
                              {ORIGEM_TIPO_OPCOES.map((o) => (
                                <SelectItem key={o.valor} value={o.valor}>{o.rotulo}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Campo>

                        {/* UM campo, nao tres. Antes eram "Origem interna", "Origem
                            externa" e o botao de cadastrar lado a lado, desabilitando-se
                            mutuamente — quatro controles para responder uma pergunta so.
                            Agora e uma lista com dois grupos, e escolher um item ja
                            exclui o outro caminho por construcao (o CHECK
                            `origem_exclusiva` do banco, virado em UI). Some quando a
                            origem e propria ou heranca: ai nao existe contraparte. */}
                        {exigeContraparte(item.origem_tipo) && (
                          <Campo
                            label="De onde veio"
                            colunas={2}
                            dica="Quem cedeu a posse. Instrumento ja cadastrado deste cliente aparece na lista; se for de terceiro, cadastre pelo botao ao lado — a mesma origem serve a varios imoveis."
                          >
                            <div className="flex gap-1.5">
                              <Select value={valorDaOrigem(item)} onValueChange={(v) => escolherOrigem(item, v)}>
                                <SelectTrigger className={TRIGGER_FLEX}>
                                  <SelectValue placeholder="—" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={SEM_VALOR}>— nenhuma —</SelectItem>
                                  {instrumentos.length > 0 && (
                                    <SelectGroup>
                                      <SelectLabel>Instrumentos deste cliente</SelectLabel>
                                      {instrumentos.map((i) => (
                                        <SelectItem key={i.id} value={PREFIXO_INTERNA + i.id}>
                                          {i.rotulo}
                                          {!i.vigente && (
                                            <span className="ml-2 text-[10px] text-muted-foreground">encerrado</span>
                                          )}
                                        </SelectItem>
                                      ))}
                                    </SelectGroup>
                                  )}
                                  {draft.origens.length > 0 && (
                                    <SelectGroup>
                                      <SelectLabel>Origens de terceiros</SelectLabel>
                                      {draft.origens.map((o) => (
                                        <SelectItem key={o.id} value={PREFIXO_EXTERNA + o.id}>
                                          {nomeDaOrigem(o, pessoas)}
                                          {usosDaOrigem(o.id) > 1 && (
                                            <span className="ml-2 text-[10px] text-muted-foreground">
                                              {usosDaOrigem(o.id)} imoveis
                                            </span>
                                          )}
                                        </SelectItem>
                                      ))}
                                    </SelectGroup>
                                  )}
                                </SelectContent>
                              </Select>
                              {origemVinculada ? (
                                <Button
                                  type="button" size="icon" variant="outline" className="h-9 w-9 shrink-0"
                                  onClick={() => setDialogo({ open: true, origem: origemVinculada, imovelDestino: null })}
                                  aria-label="Editar dados da origem de terceiro"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              ) : (
                                <Button
                                  type="button" size="icon" variant="outline" className="h-9 w-9 shrink-0"
                                  onClick={() => setDialogo({ open: true, origem: null, imovelDestino: item.id })}
                                  aria-label="Cadastrar origem de terceiro"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </Campo>
                        )}

                        {/* So aparece depois de a origem existir: contraparte sem origem
                            nao quer dizer nada. */}
                        {temOrigem(item) && (
                          <Campo
                            label="Contraparte"
                            dica="Preencha quando a outra parte daquele contrato de origem foi uma pessoa especifica, e nao o conjunto dos envolvidos."
                          >
                            <Select
                              value={item.origem_contraparte_pessoa_id ?? SEM_VALOR}
                              onValueChange={(v) =>
                                alterar(item.id, { origem_contraparte_pessoa_id: v === SEM_VALOR ? null : v })
                              }
                            >
                              <SelectTrigger className={fieldCls}><SelectValue placeholder="—" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value={SEM_VALOR}>— nenhuma —</SelectItem>
                                {pessoas.map((pessoa) => (
                                  <SelectItem key={pessoa.id} value={pessoa.id}>{pessoa.denominacao}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Campo>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </FieldSection>

      <OrigemExternaDialog
        open={dialogo.open}
        origem={dialogo.origem}
        imoveisQueUsam={dialogo.origem ? usosDaOrigem(dialogo.origem.id) : 0}
        pessoas={pessoas}
        onSalvar={(origem) => salvarOrigem(origem, dialogo.imovelDestino)}
        onClose={() => setDialogo({ open: false, origem: null, imovelDestino: null })}
      />
    </>
  );
}
