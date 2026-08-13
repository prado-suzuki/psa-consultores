import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DateFieldWithInput from '@/components/equipe/client-form/DateFieldWithInput';
import { FieldSection, fieldCls, labelCls, switchBoxCls } from '@/components/equipe/osg/formKit';
import { formGridCls, formSpanCls } from '@/lib/osgFormGrid';
import type { MatriculaRow } from '@/hooks/useDiagnosticoPatrimonial';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import { AlertTriangle, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Selo } from './SeloCampo';
import type { CompossuidorDraft, ExploracaoRuralDraft, ParteExtraDraft } from '@/previews/contratosExploracaoModel';

// Aba "Dados" do cadastro de exploração rural — cópia do padrão de
// MatriculaDadosTab.tsx (mesmo FieldSection, mesmo formGridCls, mesmos campos de
// formulário reais). Ver docs/osg/levantamento-contratos-rurais.md, seção 2,
// para a origem/pendência de cada campo. Componente puro: nada aqui consulta o
// banco — quem popula `matriculas`/`pessoas` decide isso por fora (na próxima
// sprint, um hook real; neste preview, um fixture).

const PAPEIS_PARTE_EXTRA = ['Outorgante adicional', 'Explorador adicional', 'Anuente', 'Interveniente', 'Garantidor', 'Outro (definir com Bernardo)'];
const TIPOS_INSTRUMENTO_ORIGEM = ['Parceria', 'Arrendamento', 'Herança', 'Outro'];

interface Props {
  draft: ExploracaoRuralDraft;
  onChange: (draft: ExploracaoRuralDraft) => void;
  matriculas: MatriculaRow[];
  pessoas: PessoaRow[];
  instrumentosDeOrigem: { ref: string; label: string }[];
  /** Pré-computado por quem monta a tela: se a matrícula escolhida já está em outra Parceria ativa. */
  avisoMatriculaCompartilhada?: string | null;
}

export function ExploracaoRuralDadosTab({ draft, onChange, matriculas, pessoas, instrumentosDeOrigem, avisoMatriculaCompartilhada }: Props) {
  const set = <K extends keyof ExploracaoRuralDraft>(key: K, value: ExploracaoRuralDraft[K]) => onChange({ ...draft, [key]: value });
  const isComposse = draft.tipo === 'composse';
  const matriculaSelecionada = matriculas.find((m) => m.id === draft.matriculaId) ?? null;
  let number = 0;
  const next = () => String((number += 1)).padStart(2, '0');

  const setCompossuidor = (id: string, patch: Partial<CompossuidorDraft>) =>
    set('compossuidores', draft.compossuidores.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const addCompossuidor = () =>
    set('compossuidores', [...draft.compossuidores, { id: `comp-${Date.now()}-${draft.compossuidores.length}`, pessoaId: null, fracao: '0' }]);
  const removeCompossuidor = (id: string) => set('compossuidores', draft.compossuidores.filter((c) => c.id !== id));
  const somaFracoes = draft.compossuidores.reduce((acc, c) => acc + (Number(c.fracao) || 0), 0);

  const setParteExtra = (id: string, patch: Partial<ParteExtraDraft>) =>
    set('partesExtras', draft.partesExtras.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const addParteExtra = () =>
    set('partesExtras', [...draft.partesExtras, { id: `pex-${Date.now()}-${draft.partesExtras.length}`, papel: PAPEIS_PARTE_EXTRA[2], pessoaId: null }]);
  const removeParteExtra = (id: string) => set('partesExtras', draft.partesExtras.filter((p) => p.id !== id));

  return (
    <>
      <FieldSection number={next()} title="Instrumento">
        <div className={`${formGridCls(4)} gap-3`}>
          <Field label="Referência" required selo="existe"><Input value={draft.referencia} onChange={(e) => set('referencia', e.target.value)} className={`${fieldCls} font-mono`} /></Field>
          <Field label="Tipo de exploração" required selo="existe">
            <Select value={draft.tipo} onValueChange={(v: 'parceria' | 'composse') => set('tipo', v)}>
              <SelectTrigger className={fieldCls}><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="parceria">Parceria</SelectItem><SelectItem value="composse">Composse</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label="Data da assinatura" selo="existe"><DateFieldWithInput value={draft.dataAssinatura} onChange={(v) => set('dataAssinatura', v)} /></Field>
          <Field label="Data de encerramento" selo="existe"><DateFieldWithInput value={draft.dataEncerramento} onChange={(v) => set('dataEncerramento', v)} /></Field>
          <Wide label="Vigência" selo="existe"><Input value={draft.vigencia} onChange={(e) => set('vigencia', e.target.value)} className={fieldCls} placeholder="ex: 3 anos, contados da assinatura" /></Wide>
          <Wide label="Vigência prorrogável" selo="novo">
            <div className={switchBoxCls}><Switch checked={draft.vigenciaProrrogavel} onCheckedChange={(v) => set('vigenciaProrrogavel', v)} /><Label className="text-sm">renova automaticamente, salvo aviso em contrário</Label></div>
          </Wide>
        </div>
      </FieldSection>

      <FieldSection number={next()} title="Imóvel e áreas" hint="dados lidos da matrícula existente">
        <Field label="Imóvel / matrícula" required selo="existe">
          <Select value={draft.matriculaId ?? undefined} onValueChange={(v) => set('matriculaId', v)}>
            <SelectTrigger className={fieldCls}><SelectValue placeholder="Selecionar matrícula cadastrada…" /></SelectTrigger>
            <SelectContent>{matriculas.map((m) => <SelectItem key={m.id} value={m.id}>{m.numero ? `Matrícula ${m.numero}` : m.id} — {m.municipio_imovel}/{m.uf_imovel}</SelectItem>)}</SelectContent>
          </Select>
        </Field>

        {avisoMatriculaCompartilhada && (
          <div className="mt-2 flex items-start gap-2 rounded-md border border-osg-highlighter bg-osg-highlighter/10 px-3 py-2 text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{avisoMatriculaCompartilhada}</span>
          </div>
        )}

        <div className={`${formGridCls(4)} mt-3 gap-3`}>
          <Field label="Município / UF" selo="existe"><Input disabled value={matriculaSelecionada ? `${matriculaSelecionada.municipio_imovel} / ${matriculaSelecionada.uf_imovel}` : '—'} className={fieldCls} /></Field>
          <Field label="Área documento" selo="existe"><Input disabled value={matriculaSelecionada ? `${matriculaSelecionada.area_documento} ${matriculaSelecionada.area_unidade}` : '—'} className={`${fieldCls} font-mono`} /></Field>
          <Field label="Área real" selo="existe"><Input disabled value={matriculaSelecionada?.area_real != null ? `${matriculaSelecionada.area_real} ${matriculaSelecionada.area_unidade}` : '—'} className={`${fieldCls} font-mono`} /></Field>
          <Field label="Área explorada" required selo="existe"><Input value={draft.areaExplorada} onChange={(e) => set('areaExplorada', e.target.value)} className={`${fieldCls} font-mono`} /></Field>
          <Field label="Georreferenciamento" selo="existe"><Input disabled value={matriculaSelecionada?.georreferenciado ?? '—'} className={fieldCls} /></Field>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          O modelo de cabeçalho+detalhes já suporta a mesma matrícula em duas Parcerias diferentes sem tabela nova —
          confirmado com a OSG (13/08/2026). O aviso acima é só informativo nesta versão; falta decidir se soma
          percentuais/áreas automaticamente.
        </p>
      </FieldSection>

      <FieldSection number={next()} title="Partes">
        {!isComposse ? (
          <>
            <div className={`${formGridCls(2)} gap-3`}>
              <Field label="Outorgante" selo="existe">
                <PessoaSelect value={draft.outorganteId} onChange={(v) => set('outorganteId', v)} pessoas={pessoas} placeholder="Selecionar outorgante…" />
              </Field>
              <Field label="Explorador" selo="existe" hint="na UI: Explorador; no gerador: papel outorgado, a confirmar com Bernardo">
                <PessoaSelect value={draft.exploradorId} onChange={(v) => set('exploradorId', v)} pessoas={pessoas} placeholder="Selecionar explorador…" />
              </Field>
            </div>
          </>
        ) : (
          <div>
            <Label className={`${labelCls} mb-2 flex items-center gap-1.5`}>Compossuidores e distribuição interna <Selo tipo="novo" /></Label>
            <div className="space-y-2">
              {draft.compossuidores.map((c) => (
                <div key={c.id} className="flex items-center gap-2 rounded-md border border-osg-200/80 bg-background p-2">
                  <div className="flex-1"><PessoaSelect value={c.pessoaId} onChange={(v) => setCompossuidor(c.id, { pessoaId: v })} pessoas={pessoas} placeholder="Selecionar pessoa qualificada…" /></div>
                  <Input type="number" value={c.fracao} onChange={(e) => setCompossuidor(c.id, { fracao: e.target.value })} className={`${fieldCls} w-24 text-right font-mono`} />
                  <span className="text-xs text-muted-foreground">%</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => removeCompossuidor(c.id)}><X className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-2 gap-1.5 border-dashed" onClick={addCompossuidor}><Plus className="h-3.5 w-3.5" />Adicionar compossuidor</Button>
            <p className={`mt-2 text-xs font-semibold ${Math.abs(somaFracoes - 100) < 0.01 ? 'text-emerald-700' : 'text-osg-red'}`}>
              {Math.abs(somaFracoes - 100) < 0.01
                ? '✓ soma 100% — confirmado com a OSG: sem cobertura parcial nos frutos deste instrumento'
                : `✕ soma ${somaFracoes}% — a OSG confirmou que a distribuição precisa fechar em 100%`}
            </p>
          </div>
        )}

        <div className="mt-4">
          <Label className={`${labelCls} mb-2 flex items-center gap-1.5`}>Outras partes (outorgante/explorador adicional, anuente, interveniente, garantidor) <Selo tipo="novo" /></Label>
          <div className="space-y-2">
            {draft.partesExtras.map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-md border border-osg-200/80 bg-background p-2">
                <Select value={p.papel} onValueChange={(v) => setParteExtra(p.id, { papel: v })}>
                  <SelectTrigger className={`${fieldCls} w-56 shrink-0`}><SelectValue /></SelectTrigger>
                  <SelectContent>{PAPEIS_PARTE_EXTRA.map((papel) => <SelectItem key={papel} value={papel}>{papel}</SelectItem>)}</SelectContent>
                </Select>
                <div className="flex-1"><PessoaSelect value={p.pessoaId} onChange={(v) => setParteExtra(p.id, { pessoaId: v })} pessoas={pessoas} placeholder="Selecionar pessoa qualificada…" /></div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => removeParteExtra(p.id)}><X className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="mt-2 gap-1.5 border-dashed" onClick={addParteExtra}><Plus className="h-3.5 w-3.5" />Adicionar outra parte</Button>
          <p className="mt-2 text-[11px] text-muted-foreground">Achado real em Nodari. Nome exato dos papéis e se persiste no cadastro (ou fica só na renderização ad hoc do gerador) ainda depende do acordo do dia 1 com o Bernardo.</p>
        </div>
      </FieldSection>

      <FieldSection number={next()} title="Percentual e produção">
        <div className={`${formGridCls(4)} gap-3`}>
          <Field label="Percentual do outorgante" selo="novo"><Input className={`${fieldCls} font-mono`} value={draft.percentualOutorgante} onChange={(e) => set('percentualOutorgante', e.target.value)} placeholder="ex: 30,000%" /></Field>
          <Field label="Percentual do explorador" selo="novo"><Input className={`${fieldCls} font-mono`} value={draft.percentualExplorador} onChange={(e) => set('percentualExplorador', e.target.value)} placeholder="ex: 70,000%" /></Field>
          <Field label="Vigência do percentual" selo="novo"><DateFieldWithInput value={draft.percentualVigenteDesde} onChange={(v) => set('percentualVigenteDesde', v)} /></Field>
          <Field label="Termo Aditivo de referência" selo="novo"><Input className={fieldCls} value={draft.termoAditivoReferencia} onChange={(e) => set('termoAditivoReferencia', e.target.value)} placeholder="só se já mudou no meio do prazo" /></Field>
          <Field label="Sacas por hectare" selo="existe"><Input className={`${fieldCls} font-mono`} value={draft.sacasPorHectare} onChange={(e) => set('sacasPorHectare', e.target.value)} placeholder="se aplicável" /></Field>
          <Wide label="Culturas/atividades permitidas" selo="novo"><Input className={fieldCls} value={draft.culturas} onChange={(e) => set('culturas', e.target.value)} placeholder="soja; milho; algodão; pecuária" /></Wide>
          <Field label="Benfeitorias indenizáveis" selo="novo"><div className={switchBoxCls}><Switch checked={draft.benfeitoriasIndenizaveis} onCheckedChange={(v) => set('benfeitoriasIndenizaveis', v)} /><Label className="text-sm">sim</Label></div></Field>
          <Field label="Permite penhor / financiamento" selo="novo"><div className={switchBoxCls}><Switch checked={draft.permitePenhor} onCheckedChange={(v) => set('permitePenhor', v)} /><Label className="text-sm">sim</Label></div></Field>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Entregável confirmado com o Fiscal: relatório/apresentação em PDF, não a planilha WP interna. Confirmado com a
          OSG: o percentual pode mudar no meio do prazo da Parceria e, quando muda, exige Termo Aditivo assinado — a
          vigência não se sincroniza automaticamente com a renovação de 3 anos.
        </p>

        {isComposse && (
          <div className={`${formGridCls(2)} mt-4 items-end gap-3`}>
            <Field label="Prazo de indivisão" selo="novo"><Input className={fieldCls} value={draft.prazoIndivisao} onChange={(e) => set('prazoIndivisao', e.target.value)} /></Field>
            <Field label="Indivisão prorrogável" selo="novo"><div className={switchBoxCls}><Switch checked={draft.indivisaoProrrogavel} onCheckedChange={(v) => set('indivisaoProrrogavel', v)} /><Label className="text-sm">por prazo indeterminado</Label></div></Field>
          </div>
        )}
      </FieldSection>

      <FieldSection number={next()} title="Documento de origem">
        {!isComposse ? (
          <Field label="Estudo fiscal" selo="existe" hint="arquivo já recebido do cliente/Fiscal; digitado, sem importação nesta sprint">
            <Input className={fieldCls} placeholder="Estudo de Cálculo da Parceria na Atividade Pecuária — 12/03/2025" disabled />
          </Field>
        ) : (
          <div className={`${formGridCls(2)} gap-3`}>
            <Field label="Tipo do instrumento de origem" selo="novo">
              <Select value={draft.tipoInstrumentoOrigem} onValueChange={(v) => set('tipoInstrumentoOrigem', v)}>
                <SelectTrigger className={fieldCls}><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS_INSTRUMENTO_ORIGEM.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Instrumento de origem da posse" selo="novo">
              <Select value={draft.instrumentoOrigemRef ?? undefined} onValueChange={(v) => set('instrumentoOrigemRef', v)}>
                <SelectTrigger className={fieldCls}><SelectValue placeholder="Selecionar…" /></SelectTrigger>
                <SelectContent>{instrumentosDeOrigem.map((i) => <SelectItem key={i.ref} value={i.ref}>{i.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Wide label="Documento comprobatório" selo="existe"><Input className={fieldCls} placeholder="Contrato de Parceria Rural registrado — 10/10/2022" disabled /></Wide>
          </div>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">A origem definitiva é vinculada a cada imóvel na aba "Imóveis e origens", pois um contrato de composse pode reunir várias origens — confirmado pela OSG: a composse é sempre resultado da Parceria, nunca o contrário.</p>
      </FieldSection>
    </>
  );
}

function PessoaSelect({ value, onChange, pessoas, placeholder }: { value: string | null; onChange: (value: string) => void; pessoas: PessoaRow[]; placeholder: string }) {
  return (
    <Select value={value ?? undefined} onValueChange={onChange}>
      <SelectTrigger className={fieldCls}><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>{pessoas.map((p) => <SelectItem key={p.id} value={p.id}>{p.denominacao}{p.cpf_cnpj ? ` — ${p.cpf_cnpj}` : ''}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function Field({ label, required, selo, hint, children }: { label: string; required?: boolean; selo: 'existe' | 'novo'; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className={`${labelCls} flex items-center gap-1.5`}>{label}{required && <span className="text-osg-red">*</span>}<Selo tipo={selo} /></Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Wide({ label, selo, children }: { label: string; selo: 'existe' | 'novo'; children: ReactNode }) {
  return (
    <div className={`space-y-1.5 ${formSpanCls(2)}`}>
      <Label className={`${labelCls} flex items-center gap-1.5`}>{label}<Selo tipo={selo} /></Label>
      {children}
    </div>
  );
}
