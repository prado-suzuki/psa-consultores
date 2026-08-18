import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fieldCls } from '@/components/equipe/osg/formKit';
import { formGridCls } from '@/lib/osgFormGrid';
import { AlertTriangle, Plus, X } from 'lucide-react';
import type { MatriculaRow } from '@/hooks/useDiagnosticoPatrimonial';
import { TIPOS_INSTRUMENTO_ORIGEM, type ExploracaoImovelDraft } from '@/previews/contratosExploracaoModel';
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
// Layout em cartão, não em tabela larga: são 8 campos por imóvel (matrícula,
// 4 leituras da matrícula, área explorada, tipo e referência da origem) — numa
// tabela isso vira 8+ colunas com scroll horizontal dentro de um modal, ilegível.
// Um cartão por imóvel, com a mesma grade (`formGridCls`) da aba Dados, deixa
// tudo visível de uma vez e com a mesma cara do resto do formulário.

interface Props {
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

export function ExploracaoRuralImoveisTab({ imoveis, onChange, matriculas, instrumentosDeOrigem, avisoParaMatricula }: Props) {
  const update = (id: string, patch: Partial<ExploracaoImovelDraft>) =>
    onChange(imoveis.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const remove = (id: string) => onChange(imoveis.filter((item) => item.id !== id));
  const add = () => {
    const proximaLetra = String.fromCharCode('a'.charCodeAt(0) + imoveis.length);
    onChange([...imoveis, { id: `imv-${Date.now()}-${imoveis.length}`, ref: proximaLetra, matriculaId: null, areaExplorada: '', tipoInstrumentoOrigem: TIPOS_INSTRUMENTO_ORIGEM[0], instrumentoOrigemRef: null, situacaoOrigem: 'vigente' }]);
  };

  return (
    <div>
      <p className="mb-3 text-[11px] text-muted-foreground">
        Um cartão por matrícula dentro do instrumento. Os dados cartoriais são lidos do cadastro; somente a área
        explorada e a origem são próprios da relação. "Situação da origem" é um estado computado — confirmado em{' '}
        <code>[BV-COM]</code>: quando a Parceria de origem encerra, o imóvel sai da composse sem precisar de aditivo;
        não é um campo digitado.
      </p>
      <div className="space-y-3">
        {imoveis.map((item) => {
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
                  <span className="font-mono text-xs font-bold text-osg-moss">Imóvel {item.ref || '—'}</span>
                  {item.situacaoOrigem === 'vigente' ? (
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">origem vigente</Badge>
                  ) : (
                    <Badge variant="outline" className="border-osg-red/30 bg-osg-red/10 text-osg-red">origem encerrada</Badge>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => remove(item.id)}><X className="h-3.5 w-3.5" /></Button>
              </div>

              <div className={`${formGridCls(4)} gap-3`}>
                <Field label="Ref." selo="existe"><Input value={item.ref} onChange={(e) => update(item.id, { ref: e.target.value })} className={`${fieldCls} font-mono`} /></Field>
                <Wide label="Imóvel / matrícula" selo="existe">
                  <Select value={item.matriculaId ?? undefined} onValueChange={(v) => update(item.id, { matriculaId: v })}>
                    <SelectTrigger className={fieldCls}><SelectValue placeholder="Selecionar matrícula…" /></SelectTrigger>
                    <SelectContent>{matriculas.map((m) => <SelectItem key={m.id} value={m.id}>Matrícula {m.numero} — {m.municipio_imovel}</SelectItem>)}</SelectContent>
                  </Select>
                  {aviso && (
                    <div
                      className={`mt-1.5 flex items-start gap-1.5 rounded-md border px-2 py-1.5 text-[11px] ${
                        excedeODisponivel
                          ? 'border-osg-red/40 bg-osg-red/10 text-osg-red'
                          : 'border-osg-highlighter bg-osg-highlighter/10 text-amber-900'
                      }`}
                    >
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                      <div>
                        <p>
                          Esta matrícula já está em outra Parceria ativa: {aviso.detalhe}, {aviso.percentualUsado}% da
                          área. Confirmado com a OSG (13/08/2026): duas Parcerias concorrentes na mesma matrícula são
                          válidas se cobrirem fração distinta da área/percentual, com outorgados diferentes — o
                          cadastro não bloqueia, só avisa.
                        </p>
                        <p className="mt-1 font-semibold">
                          Resta {percentualDisponivel}% livre nesta matrícula
                          {areaDisponivel != null && matricula ? ` (${areaDisponivel.toFixed(4)} ${matricula.area_unidade})` : ''}.
                          {excedeODisponivel && (
                            <> A área explorada informada aqui ({item.areaExplorada || '0'} {matricula?.area_unidade},{' '}
                            {percentualDesteImovel.toFixed(1)}%) ultrapassa o que resta.</>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </Wide>
                <Field label="Município / UF" selo="existe"><Input disabled value={matricula ? `${matricula.municipio_imovel} / ${matricula.uf_imovel}` : '—'} className={fieldCls} /></Field>

                <Field label="Área documento" selo="existe"><Input disabled value={matricula ? `${matricula.area_documento} ${matricula.area_unidade}` : '—'} className={`${fieldCls} font-mono`} /></Field>
                <Field label="Área real" selo="existe"><Input disabled value={matricula?.area_real != null ? `${matricula.area_real} ${matricula.area_unidade}` : '—'} className={`${fieldCls} font-mono`} /></Field>
                <Field label="Área explorada" selo="existe"><Input value={item.areaExplorada} onChange={(e) => update(item.id, { areaExplorada: e.target.value })} className={`${fieldCls} font-mono`} /></Field>
                <Field label="Georreferenciamento" selo="existe"><Input disabled value={matricula?.georreferenciado ?? '—'} className={fieldCls} /></Field>

                <Field label="Tipo da origem" selo="novo">
                  <Select value={item.tipoInstrumentoOrigem} onValueChange={(v) => update(item.id, { tipoInstrumentoOrigem: v })}>
                    <SelectTrigger className={fieldCls}><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS_INSTRUMENTO_ORIGEM.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Wide label="Instrumento de origem" selo="novo">
                  <Select value={item.instrumentoOrigemRef ?? undefined} onValueChange={(v) => update(item.id, { instrumentoOrigemRef: v })}>
                    <SelectTrigger className={fieldCls}><SelectValue placeholder="Sem origem anterior" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sem origem anterior (imóvel entra direto por este instrumento)</SelectItem>
                      {instrumentosDeOrigem.map((i) => <SelectItem key={i.ref} value={i.ref}>{i.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Wide>
              </div>
            </div>
          );
        })}
      </div>
      <Button variant="outline" size="sm" className="mt-3 gap-1.5 border-dashed" onClick={add}><Plus className="h-3.5 w-3.5" />Selecionar outro imóvel</Button>
    </div>
  );
}
