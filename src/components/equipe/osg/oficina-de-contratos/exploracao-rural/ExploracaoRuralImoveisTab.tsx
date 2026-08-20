import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fieldCls } from '@/components/equipe/osg/formKit';
import { formGridCls, formSpanCls } from '@/lib/osgFormGrid';
import { AlertTriangle, Plus, X } from 'lucide-react';
import type { MatriculaRow } from '@/hooks/useDiagnosticoPatrimonial';
import {
  emptyOrigemExterna, TIPOS_INSTRUMENTO_ORIGEM,
  type ExploracaoImovelDraft, type OrigemExternaDraft, type TipoExploracao,
} from '@/previews/contratosExploracaoModel';
import { Field, Wide } from './SeloCampo';

// Aba "Imóveis e origens": um cartão por matrícula dentro do instrumento —
// achado real em `[BV-COM]` (15 imóveis, 6 instrumentos de origem distintos, um
// único contrato de composse). É a ÚNICA fonte de imóvel/matrícula do cadastro
// — não existe campo de "imóvel principal" na aba Dados (consolidado em
// 14/08/2026). "Situação da origem" é estado COMPUTADO (a Parceria de origem
// ainda vigora ou já encerrou), não um campo digitado — ver Cláusula Quarta,
// Parágrafo Único do `[BV-COM]`: quando a origem encerra, o imóvel sai da
// composse sem precisar de aditivo.
//
// Tipo/Instrumento de origem só aparecem quando `tipo === 'composse'` —
// CONFIRMADO em reunião de validação com a OSG (Luana, 19/08/2026): numa
// Parceria a origem é sempre a própria matrícula, nunca outro instrumento
// (parceria não pode vir de outra parceria nem de uma composse).
//
// Enxugado em 19/08/2026: o cartão exibia 8 leituras da matrícula (nome do imóvel,
// município/UF, proprietário, cartório, área documento, área real,
// georreferenciamento, confrontações). Todas saíram — cada uma já tem tela de
// cadastro própria (Modal de Matrícula, Modal de Bem, aba Titularidade, cadastro
// de Cartório) e repetir aqui só polui o que o tech lead precisa ver: o que **falta
// tela** para cadastrar. Restam os campos próprios da relação instrumento × imóvel:
// letra do item, qual matrícula, área explorada e, na Composse, a origem.

interface Props {
  tipo: TipoExploracao;
  imoveis: ExploracaoImovelDraft[];
  onChange: (imoveis: ExploracaoImovelDraft[]) => void;
  matriculas: MatriculaRow[];
  instrumentosDeOrigem: { ref: string; label: string }[];
  /** Checado por cartão, já excluindo o próprio registro: se a matrícula escolhida já está em outra Parceria ativa, e com quanto %. */
  avisoParaMatricula?: (matriculaId: string) => { percentualUsado: number; detalhe: string } | null;
}

/** "234,0000" (vírgula, padrão dos campos digitados aqui) → 234. */
function paraNumero(valor: string): number {
  const n = Number(valor.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/** Valores sentinela do select de origem — não são refs de instrumento. */
const ORIGEM_SEM_ANTERIOR = '__none__';
const ORIGEM_EXTERNA = '__externa__';

export function ExploracaoRuralImoveisTab({ tipo, imoveis, onChange, matriculas, instrumentosDeOrigem, avisoParaMatricula }: Props) {
  const isComposse = tipo === 'composse';
  const update = (id: string, patch: Partial<ExploracaoImovelDraft>) =>
    onChange(imoveis.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const remove = (id: string) => onChange(imoveis.filter((item) => item.id !== id));
  const add = () => {
    const proximaLetra = String.fromCharCode('a'.charCodeAt(0) + imoveis.length);
    onChange([...imoveis, { id: `imv-${Date.now()}-${imoveis.length}`, ref: proximaLetra, matriculaId: null, areaExplorada: '', tipoInstrumentoOrigem: TIPOS_INSTRUMENTO_ORIGEM[0], instrumentoOrigemRef: null, origemExterna: null, situacaoOrigem: 'vigente' }]);
  };

  const escolherOrigem = (item: ExploracaoImovelDraft, valor: string) => {
    if (valor === ORIGEM_EXTERNA) return update(item.id, { instrumentoOrigemRef: null, origemExterna: item.origemExterna ?? emptyOrigemExterna() });
    if (valor === ORIGEM_SEM_ANTERIOR) return update(item.id, { instrumentoOrigemRef: null, origemExterna: null });
    return update(item.id, { instrumentoOrigemRef: valor, origemExterna: null });
  };
  const atualizarOrigemExterna = (item: ExploracaoImovelDraft, patch: Partial<OrigemExternaDraft>) =>
    update(item.id, { origemExterna: { ...(item.origemExterna ?? emptyOrigemExterna()), ...patch } });

  return (
    <div>
      <p className="mb-3 text-[11px] text-muted-foreground">
        Um cartão por matrícula. Nome do imóvel, município, áreas, cartório, proprietário e confrontações não
        aparecem aqui: já vêm da matrícula e do bem, que têm cadastro próprio.
        {isComposse ? ' "Situação da origem" é computada, não digitada.' : ' Numa Parceria a origem é sempre a própria matrícula.'}
      </p>
      <div className="space-y-3">
        {imoveis.map((item, indice) => {
          const matricula = matriculas.find((m) => m.id === item.matriculaId) ?? null;
          const aviso = item.matriculaId ? avisoParaMatricula?.(item.matriculaId) ?? null : null;
          const percentualDisponivel = aviso ? 100 - aviso.percentualUsado : null;
          const areaDisponivel = aviso && matricula ? (matricula.area_documento * (100 - aviso.percentualUsado)) / 100 : null;
          const percentualDesteImovel = matricula ? (paraNumero(item.areaExplorada) / matricula.area_documento) * 100 : 0;
          const excedeODisponivel = percentualDisponivel != null && percentualDesteImovel > percentualDisponivel;
          return (
            <div key={item.id} className="rounded-lg border border-osg-200/70 bg-background p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {/* A letra do item (alínea do Anexo Único) é derivada da ordem, não digitada — o
                      sistema numera sozinho, como no [BV-COM] ("alíneas 'a' à 'o'"). */}
                  <span className="font-mono text-xs font-bold text-osg-moss">Imóvel {String.fromCharCode(97 + indice)}</span>
                  {item.situacaoOrigem === 'vigente' ? (
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">origem vigente</Badge>
                  ) : (
                    <Badge variant="outline" className="border-osg-red/30 bg-osg-red/10 text-osg-red">origem encerrada</Badge>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => remove(item.id)}><X className="h-3.5 w-3.5" /></Button>
              </div>

              <div className={`${formGridCls(4)} gap-3`}>
                <Wide label="Imóvel / matrícula" hint="Seleciona matrícula já cadastrada. Município, áreas, cartório, proprietário, georreferenciamento e confrontações vêm dela e por isso não são repetidos aqui.">
                  <Select value={item.matriculaId ?? undefined} onValueChange={(v) => update(item.id, { matriculaId: v })}>
                    <SelectTrigger className={fieldCls}><SelectValue placeholder="Selecionar matrícula…" /></SelectTrigger>
                    <SelectContent>{matriculas.map((m) => <SelectItem key={m.id} value={m.id}>Matrícula {m.numero} — {m.municipio_imovel}</SelectItem>)}</SelectContent>
                  </Select>
                  {aviso && (
                    <p className={`mt-1 flex items-start gap-1 text-[10px] leading-snug ${excedeODisponivel ? 'text-osg-red' : 'text-amber-800'}`}>
                      <AlertTriangle className="mt-px h-2.5 w-2.5 shrink-0" />
                      <span>
                        Já em outra Parceria ({aviso.detalhe}, {aviso.percentualUsado}%). Resta {percentualDisponivel}%
                        {areaDisponivel != null && matricula ? ` (${areaDisponivel.toFixed(4)} ${matricula.area_unidade})` : ''}
                        {excedeODisponivel ? ' — a área informada ultrapassa o disponível.' : '.'}
                      </span>
                    </p>
                  )}
                </Wide>
                <Field label="Área explorada" hint="Por instrumento × imóvel. matricula.area_explorada é 1 valor por matrícula — grão diferente, não serve de fonte: a mesma matrícula pode estar em duas Parcerias com áreas distintas.">
                  <Input value={item.areaExplorada} onChange={(e) => update(item.id, { areaExplorada: e.target.value })} className={`${fieldCls} font-mono`} />
                </Field>

                {isComposse && (
                  <>
                    <Field label="Tipo da origem" hint="Só existe na Composse (OSG, 19/08): numa Parceria a origem é sempre a própria matrícula. “Composse” não é valor válido — trava na composse. “Exploração própria” é o nome que a consultora deu ao caso sem contrato de cessão por trás.">
                      <Select value={item.tipoInstrumentoOrigem} onValueChange={(v) => update(item.id, { tipoInstrumentoOrigem: v })}>
                        <SelectTrigger className={fieldCls}><SelectValue /></SelectTrigger>
                        <SelectContent>{TIPOS_INSTRUMENTO_ORIGEM.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </Field>
                    <Wide label="Instrumento de origem" hint="Aponta o elo anterior da cadeia. No [BV-COM], 5 das 6 origens são contratos com terceiros que não são clientes da PSA — para esses use “Origem fora do sistema”, senão o Considerando V não pode ser montado.">
                      <Select
                        value={item.origemExterna ? ORIGEM_EXTERNA : item.instrumentoOrigemRef ?? ORIGEM_SEM_ANTERIOR}
                        onValueChange={(v) => escolherOrigem(item, v)}
                      >
                        <SelectTrigger className={fieldCls}><SelectValue placeholder="Sem origem anterior" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ORIGEM_SEM_ANTERIOR}>Sem origem anterior (imóvel entra direto por este instrumento)</SelectItem>
                          {instrumentosDeOrigem.map((i) => <SelectItem key={i.ref} value={i.ref}>{i.label}</SelectItem>)}
                          <SelectItem value={ORIGEM_EXTERNA}>Origem fora do sistema (digitar as partes)</SelectItem>
                        </SelectContent>
                      </Select>
                    </Wide>

                    {item.origemExterna && (
                      <div className={`${formSpanCls(4)} rounded-md border border-dashed border-osg-200 bg-osg-50/40 p-3`}>
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-osg-700">Origem fora do sistema</p>
                        <div className={`${formGridCls(4)} gap-3`}>
                          <Wide label="Título do instrumento" hint="Varia muito: o [BV-COM] usa três nomes diferentes — “Instrumento Particular de Parceria”, “Contrato de Parceria Agrícola e Outras Avenças” e “Instrumento Particular de Exploração de Atividade Rural”.">
                            <Input value={item.origemExterna.tituloInstrumento} onChange={(e) => atualizarOrigemExterna(item, { tituloInstrumento: e.target.value })} className={fieldCls} />
                          </Wide>
                          <Field label="Data da origem">
                            <Input type="date" value={item.origemExterna.dataAssinatura} onChange={(e) => atualizarOrigemExterna(item, { dataAssinatura: e.target.value })} className={fieldCls} />
                          </Field>
                          <Field label="CPF/CNPJ da origem">
                            <Input value={item.origemExterna.outorganteCpfCnpj} onChange={(e) => atualizarOrigemExterna(item, { outorganteCpfCnpj: e.target.value })} className={`${fieldCls} font-mono`} />
                          </Field>
                          <Wide label="Outorgante da origem" hint="Quem cedeu a posse na origem — não é o outorgante deste instrumento.">
                            <Input value={item.origemExterna.outorganteNome} onChange={(e) => atualizarOrigemExterna(item, { outorganteNome: e.target.value })} className={fieldCls} />
                          </Wide>
                          <Field label="Sede — município">
                            <Input value={item.origemExterna.outorganteMunicipio} onChange={(e) => atualizarOrigemExterna(item, { outorganteMunicipio: e.target.value })} className={fieldCls} />
                          </Field>
                          <Field label="Sede — UF">
                            <Input value={item.origemExterna.outorganteUf} onChange={(e) => atualizarOrigemExterna(item, { outorganteUf: e.target.value })} className={fieldCls} maxLength={2} />
                          </Field>
                          <Field label="NIRE" hint="Exigência literal do template oficial: a qualificação da empresa de origem deve conter NIRE, capital social na data da assinatura e administradores.">
                            <Input value={item.origemExterna.outorganteNire} onChange={(e) => atualizarOrigemExterna(item, { outorganteNire: e.target.value })} className={`${fieldCls} font-mono`} />
                          </Field>
                          <Field label="Capital social na assinatura" hint="Valor histórico, da data em que a origem foi assinada — não é o capital atual, então não sai de v_quadro_societario nem quando a empresa é cliente.">
                            <Input value={item.origemExterna.outorganteCapitalSocialNaAssinatura} onChange={(e) => atualizarOrigemExterna(item, { outorganteCapitalSocialNaAssinatura: e.target.value })} className={`${fieldCls} font-mono`} placeholder="ex: R$ 1.687.870,00" />
                          </Field>
                          <Wide label="Administradores da origem" hint="Quem representou a outorgante na assinatura da origem. Texto livre: a empresa da origem normalmente não é cliente, então não há administracao cadastrada.">
                            <Input value={item.origemExterna.outorganteAdministradores} onChange={(e) => atualizarOrigemExterna(item, { outorganteAdministradores: e.target.value })} className={fieldCls} />
                          </Wide>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <Button variant="outline" size="sm" className="mt-3 gap-1.5 border-dashed" onClick={add}><Plus className="h-3.5 w-3.5" />Selecionar outro imóvel</Button>
    </div>
  );
}
