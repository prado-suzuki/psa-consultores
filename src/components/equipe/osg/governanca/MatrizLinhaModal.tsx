import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Plus, Trash2, X } from 'lucide-react';

import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { AjudaDoCampo } from '@/components/equipe/osg/ComAjuda';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { OrgaoGovernanca } from '@/hooks/useDomainOrgaoGovernanca';
import type {
  CompetenciaInput, LinhaDaMatriz, PapelDeGovernanca,
} from '@/hooks/useDomainMatrizAlcadas';

/**
 * Preenche UMA atividade da Matriz, com todos os órgãos de uma vez.
 *
 * **Por linha, e não por célula.** Quem preenche pensa por atividade: a planilha
 * é organizada assim e a entrevista de diagnóstico anda assim, assunto por
 * assunto. Uma caixa por célula seriam 115 aberturas num cliente de cinco órgãos;
 * por linha são 23, e a cadeia de escalonamento aparece de pé, que é justamente
 * o que o consultor está desenhando.
 */

/** As bases de cálculo que o modelo de contrato usa. O banco só aceita estas. */
const BASES = [
  { valor: 'orcamento_aprovado', rotulo: 'do orçamento aprovado' },
  { valor: 'faturamento_ano_anterior', rotulo: 'do faturamento do ano anterior' },
];

/*
 * A EXCEÇÃO É UM CAMPO SÓ NA TELA, e grava dois no banco.
 *
 * O banco aceita dois motivos, `fora_da_politica` e `acima_da_alcada`. O segundo
 * seria dizer de novo o que a alçada mais o "sobe para" já dizem, e duas formas
 * de escrever a mesma regra é como o dado fica inconsistente entre um consultor
 * e outro. Então a tela oferece só a ressalva de política, e o motivo vai fixo.
 *
 * Uma pergunta "tem exceção?" seguida de "de que tipo?" e "para quem?" eram três
 * decisões para uma regra só. Escolher o órgão já diz tudo: escolheu, tem
 * ressalva; não escolheu, não tem.
 */

const NENHUM = '__nenhum__';

/**
 * O valor da alçada, escrito como a pessoa escreve.
 *
 * **Em reais, mostra formatado quando sai do campo**: 2000000 vira 2.000.000,00.
 * Digitar com ponto e vírgula no meio atrapalha; ler sem eles atrapalha mais,
 * porque "2000000" e "20000000" são indistinguíveis de relance, e é justamente
 * num campo de limite que errar uma casa custa caro.
 *
 * Em percentual não formata: o número é pequeno e "10" já se lê.
 */
function ValorDaAlcada({
  valor,
  unidade,
  onChange,
}: {
  valor: number | null;
  unidade: 'moeda' | 'percentual' | null;
  onChange: (n: number | null) => void;
}) {
  const [focado, setFocado] = useState(false);
  const [rascunho, setRascunho] = useState('');

  const mostrado = focado
    ? rascunho
    : valor === null
      ? ''
      : unidade === 'moeda'
        ? valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : String(valor);

  return (
    <Input
      inputMode="decimal"
      value={mostrado}
      placeholder="sem limite"
      onFocus={() => {
        setRascunho(valor === null ? '' : String(valor));
        setFocado(true);
      }}
      onBlur={() => setFocado(false)}
      onChange={(e) => {
        const cru = e.target.value;
        setRascunho(cru);
        if (cru.trim() === '') {
          onChange(null);
          return;
        }
        /* Aceita 1.234,56 e 1234.56: quem digita não sabe qual o campo espera. */
        const n = Number(cru.replace(/\./g, '').replace(',', '.'));
        if (!Number.isNaN(n)) onChange(n);
      }}
    />
  );
}

function vazia(orgaoId: string, entraNoContrato: boolean): CelulaNaTela {
  return {
    orgao_id: orgaoId,
    entraNoContrato,
    nao_participa: false,
    papeis: [],
    sobe_para_orgao_id: null,
    alcada_valor: null,
    alcada_unidade: null,
    alcada_base: null,
    fora_da_politica: false,
  };
}

/** A célula em edição, mais o que a tela sabe do órgão dela. */
type CelulaNaTela = CompetenciaInput & { entraNoContrato: boolean };

export function MatrizLinhaModal({
  open,
  onOpenChange,
  atividade,
  linha,
  orgaos,
  papeis,
  salvando,
  onSalvar,
  onTirarDaMatriz,
  onProxima,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  atividade: string;
  linha: LinhaDaMatriz | null;
  orgaos: OrgaoGovernanca[];
  papeis: PapelDeGovernanca[];
  salvando: boolean;
  onSalvar: (detalhamento: string | null, competencias: CompetenciaInput[]) => Promise<unknown>;
  onTirarDaMatriz: () => void;
  /** Ausente na última linha da matriz. */
  onProxima?: () => void;
}) {
  const [detalhamento, setDetalhamento] = useState('');
  const [mostrarDetalhe, setMostrarDetalhe] = useState(false);
  const [celulas, setCelulas] = useState<CelulaNaTela[]>([]);

  /* Reabrir a caixa recomeça do que está gravado, e não do que ficou na tela. */
  useEffect(() => {
    if (!open || !linha) return;
    setDetalhamento(linha.detalhamento ?? '');
    setMostrarDetalhe(false);
    setCelulas(
      orgaos.map((o) => {
        const gravada = linha.competencias.find((c) => c.orgao_id === o.id);
        if (!gravada) return vazia(o.id, o.entra_no_contrato);
        return {
          orgao_id: o.id,
          entraNoContrato: o.entra_no_contrato,
          nao_participa: gravada.nao_participa,
          papeis: gravada.papeis,
          sobe_para_orgao_id: gravada.sobe_para_orgao_id,
          alcada_valor: gravada.alcada_valor === null ? null : Number(gravada.alcada_valor),
          alcada_unidade: (gravada.alcada_unidade as 'moeda' | 'percentual' | null) ?? null,
          alcada_base: gravada.alcada_base,
          fora_da_politica: gravada.fora_da_politica,
        };
      }),
    );
  }, [open, linha, orgaos]);

  const porGrupo = useMemo(() => {
    const mapa = new Map<string, PapelDeGovernanca[]>();
    for (const p of papeis) {
      const g = p.grupo ?? 'Outros';
      mapa.set(g, [...(mapa.get(g) ?? []), p]);
    }
    return [...mapa.entries()];
  }, [papeis]);

  const nomeDoPapel = (id: string) => papeis.find((p) => p.id === id)?.nome ?? '?';

  const mexer = (orgaoId: string, mudanca: Partial<CelulaNaTela>) =>
    setCelulas((atual) =>
      atual.map((c) => (c.orgao_id === orgaoId ? { ...c, ...mudanca } : c)),
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="pr-8">{atividade}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {celulas.map((c) => {
            const orgao = orgaos.find((o) => o.id === c.orgao_id);
            if (!orgao) return null;
            const outros = orgaos.filter((o) => o.id !== c.orgao_id);

            return (
              <div key={c.orgao_id} className="space-y-3 rounded-lg border border-osg-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-osg-moss">{orgao.nome}</span>
                  {!c.entraNoContrato && (
                    <span className="text-[11px] text-muted-foreground">
                      não recebe cláusula no contrato
                    </span>
                  )}
                </div>

                {/*
                  Marcado "não participa", os campos somem em vez de ficarem
                  desabilitados: o banco recusa a combinação, e mostrar campo que
                  não pode ser preenchido só convida a tentar.
                */}
                {/*
                  O marcador encosta no campo com que ele conversa, e não no
                  canto do bloco: ou a pessoa diz o que o órgão faz, ou diz que
                  ele não faz nada aqui. Separados, a relação entre os dois some.

                  E ele é MARCA e não papel, porque "este órgão participa?" tem
                  de se responder sem abrir a lista: um quarto das células reais
                  é isto, e é o que separa matriz pronta de matriz pela metade.
                */}
                <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={c.nao_participa}
                    onCheckedChange={(v) =>
                      mexer(c.orgao_id, {
                        nao_participa: v === true,
                        ...(v === true
                          ? {
                            papeis: [],
                            sobe_para_orgao_id: null,
                            alcada_valor: null,
                            alcada_unidade: null,
                            alcada_base: null,
                            fora_da_politica: false,
                          }
                          : {}),
                      })
                    }
                  />
                  Não participa desta atividade
                </label>

                {!c.nao_participa && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5">
                        O que faz aqui
                        <AjudaDoCampo texto="A participação deste órgão nesta atividade. Pode ter mais de uma: no modelo, a Diretoria define a estratégia, participa da negociação e delibera o fechamento, tudo na mesma atividade." />
                      </Label>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {c.papeis.map((id) => (
                          <Badge key={id} variant="secondary" className="gap-1 pr-1">
                            {nomeDoPapel(id)}
                            <button
                              type="button"
                              aria-label={`Tirar ${nomeDoPapel(id)}`}
                              className="rounded-sm hover:bg-background/60"
                              onClick={() =>
                                mexer(c.orgao_id, { papeis: c.papeis.filter((p) => p !== id) })
                              }
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                        <Select
                          value=""
                          onValueChange={(v) =>
                            !c.papeis.includes(v) && mexer(c.orgao_id, { papeis: [...c.papeis, v] })
                          }
                        >
                          <SelectTrigger
                            className={cn(
                              'h-7 w-auto gap-1 border-dashed px-2 text-xs',
                              c.papeis.length === 0 && 'text-muted-foreground',
                            )}
                          >
                            <Plus className="h-3 w-3" />
                            {c.papeis.length === 0 ? 'Escolher o que faz' : 'Mais um'}
                          </SelectTrigger>
                          <SelectContent>
                            {porGrupo.map(([grupo, lista]) => (
                              <SelectGroup key={grupo}>
                                <SelectLabel>{grupo}</SelectLabel>
                                {lista
                                  .filter((p) => !c.papeis.includes(p.id))
                                  .map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.nome}
                                    </SelectItem>
                                  ))}
                              </SelectGroup>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {c.papeis.length > 1 && (
                        <p className="text-[11px] text-muted-foreground">
                          Na ordem em que você escolheu, que é a ordem da frase.
                        </p>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5">
                          Depois disso, vai para
                          <AjudaDoCampo texto="Para onde o assunto segue depois que este órgão faz a parte dele. É daqui que sai o Encaminhar à Reunião de Sócios das cláusulas do contrato. Deixe em Ninguém quando a palavra final é deste órgão mesmo." />
                        </Label>
                        <Select
                          value={c.sobe_para_orgao_id ?? NENHUM}
                          onValueChange={(v) =>
                            mexer(c.orgao_id, { sobe_para_orgao_id: v === NENHUM ? null : v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NENHUM}>Ninguém, a decisão termina aqui</SelectItem>
                            {outros.map((o) => (
                              <SelectItem key={o.id} value={o.id}>
                                {o.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5">
                          Decide sozinho até
                          <AjudaDoCampo texto="O limite até onde este órgão resolve sem consultar ninguém. Acima dele a decisão vai para o órgão do campo ao lado. Pode ser em reais ou em percentual de uma base: no modelo de contrato, dois dos cinco limites são percentuais." />
                        </Label>
                        <div className="flex gap-1.5">
                          <ValorDaAlcada
                            valor={c.alcada_valor}
                            unidade={c.alcada_unidade}
                            onChange={(n) =>
                              mexer(c.orgao_id, {
                                alcada_valor: n,
                                alcada_unidade: n === null ? null : (c.alcada_unidade ?? 'moeda'),
                                alcada_base: n === null ? null : c.alcada_base,
                              })
                            }
                          />
                          <Select
                            value={c.alcada_unidade ?? 'moeda'}
                            onValueChange={(v) =>
                              mexer(c.orgao_id, {
                                alcada_unidade: v as 'moeda' | 'percentual',
                                alcada_base: v === 'moeda' ? null : c.alcada_base,
                              })
                            }
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="moeda">R$</SelectItem>
                              <SelectItem value="percentual">%</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {c.alcada_unidade === 'percentual' && c.alcada_valor !== null && (
                          <Select
                            value={c.alcada_base ?? NENHUM}
                            onValueChange={(v) =>
                              mexer(c.orgao_id, { alcada_base: v === NENHUM ? null : v })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="por cento do quê" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NENHUM}>sem base definida</SelectItem>
                              {BASES.map((b) => (
                                <SelectItem key={b.valor} value={b.valor}>
                                  {b.rotulo}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>

                    {/*
                      A ressalva é MARCA e não lista de órgãos. Ela já foi um
                      par motivo + destino, e o destino não variava: nas 48
                      células medidas em cinco matrizes reais, o que foge da
                      política vai sempre para o mesmo órgão do "vai para".
                      Pedir o endereço duas vezes era o defeito do
                      `acima_da_alcada`, que saiu daqui pelo mesmo motivo.

                      O texto de apoio muda com o "vai para" porque a frase no
                      contrato muda: quem manda escreve "submete ao Conselho o
                      que estiver fora da política", quem recebe escreve
                      "autorizar os atos não previstos nestas políticas" (a
                      segunda é literal do contrato do Mattei).
                    */}
                    <div className="space-y-1">
                      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                          checked={c.fora_da_politica}
                          onCheckedChange={(v) =>
                            mexer(c.orgao_id, { fora_da_politica: v === true })
                          }
                        />
                        Também o que foge da política ou do orçamento
                        <AjudaDoCampo texto="Marque quando este órgão, além do que já está escrito acima, também trata do caso que a política ou o orçamento não previram. Na maioria das linhas fica desmarcado." />
                      </label>
                      {c.fora_da_politica && (
                        <p className="pl-6 text-xs text-muted-foreground">
                          {c.sobe_para_orgao_id
                            ? `Sobe para ${orgaos.find((o) => o.id === c.sobe_para_orgao_id)?.nome} também nesse caso.`
                            : 'Este órgão autoriza os casos fora da política.'}
                        </p>
                      )}
                    </div>

                  </>
                )}
              </div>
            );
          })}
        </div>

        {/*
          O detalhamento fica NO FIM e fechado, e não no topo.
          Ele vale para umas seis das 23 atividades, as de nome genérico, e
          estando em primeiro lugar parecia obrigatório e travava quem abria a
          caixa pela primeira vez. Agora quem precisa vai atrás.
        */}
        <div className="pt-1">
          {mostrarDetalhe || detalhamento ? (
            <div className="space-y-1.5 rounded-lg border border-dashed border-osg-200 p-3">
              <Label htmlFor="mz-detalhe" className="flex items-center gap-1.5">
                O que entra nesta atividade, neste cliente
              </Label>
              <Input
                id="mz-detalhe"
                value={detalhamento}
                onChange={(e) => setDetalhamento(e.target.value)}
                placeholder="de auditoria externa e de governança"
                autoFocus
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Isto entra na cláusula do contrato, logo depois do nome da atividade.
                <br />
                Sem preencher: <span className="italic">Autorizar a contratação de prestadores de
                serviços</span>.
                <br />
                Preenchido: <span className="italic">Autorizar a contratação de prestadores de
                serviços, de auditoria externa e de governança</span>.
              </p>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => setMostrarDetalhe(true)}
            >
              <Plus className="mr-1.5 h-3 w-3" /> Detalhar o que entra nesta atividade
            </Button>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          {/*
            Tirar da matriz mora aqui, e não numa lixeira na grade: é ação rara e
            de linha inteira, e a grade já tem 24 linhas clicáveis. Encostada à
            esquerda, longe do botão de salvar.
          */}
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={salvando}
            onClick={() => {
              onTirarDaMatriz();
              onOpenChange(false);
            }}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Tirar esta atividade da matriz
          </Button>
          <div className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            variant={onProxima ? 'outline' : 'default'}
            disabled={salvando}
            onClick={async () => {
              await onSalvar(detalhamento.trim() || null, celulas);
              onOpenChange(false);
            }}
          >
            {salvando ? 'Salvando…' : 'Salvar e fechar'}
          </Button>
          {/*
            A entrevista de diagnóstico anda de cima para baixo, assunto por
            assunto, e a tela tinha de andar junto: sem isto são 23 aberturas e
            23 fechamentos, e quem preenche perde o fio entre uma linha e outra.
          */}
          {onProxima && (
            <Button
              disabled={salvando}
              onClick={async () => {
                await onSalvar(detalhamento.trim() || null, celulas);
                onProxima();
              }}
            >
              {salvando ? 'Salvando…' : 'Salvar e próxima'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
