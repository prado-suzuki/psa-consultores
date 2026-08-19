import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DateFieldWithInput from '@/components/equipe/client-form/DateFieldWithInput';
import { FieldSection, fieldCls, labelCls, switchBoxCls } from '@/components/equipe/osg/formKit';
import { formGridCls } from '@/lib/osgFormGrid';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Selo, Wide } from './SeloCampo';
import { nomeComposseDe, type AdministradorFixture, type CompossuidorDraft, type ExploracaoRuralDraft, type ParteExtraDraft, type ParteSimplesDraft } from '@/previews/contratosExploracaoModel';

// Aba "Dados" do cadastro de exploração rural — cópia do padrão de
// MatriculaDadosTab.tsx (mesmo FieldSection, mesmo formGridCls, mesmos campos de
// formulário reais). Ver docs/osg/levantamento-contratos-rurais.md, seção 2,
// para a origem/pendência de cada campo. Componente puro: nada aqui consulta o
// banco — quem popula `pessoas` decide isso por fora (na próxima sprint, um
// hook real; neste preview, um fixture). Os imóveis (matrícula, área, origem)
// não têm campo aqui — moram só na aba "Imóveis e origens", ver
// ExploracaoRuralImoveisTab.tsx; consolidado em 14/08/2026 porque havia um
// campo de matrícula única aqui, desconectado da lista, duplicando a mesma
// informação sem sincronia.

// Sem "Outorgante/Explorador adicional" aqui: explorador já é lista própria
// (ver PartesFracaoList) e outorgante é sempre único, confirmado em reunião de
// validação (19/08/2026) — esta lista ad hoc ficou só para papéis sem
// participação nos frutos.
const PAPEIS_PARTE_EXTRA = ['Anuente', 'Interveniente', 'Garantidor', 'Outro (definir com Bernardo)'];

interface Props {
  draft: ExploracaoRuralDraft;
  onChange: (draft: ExploracaoRuralDraft) => void;
  pessoas: PessoaRow[];
  /** Espelha `administracao` — leitura do cadastro, não digitação (ver `administracaoFixture`). */
  administracao: AdministradorFixture[];
}

export function ExploracaoRuralDadosTab({ draft, onChange, pessoas, administracao }: Props) {
  const set = <K extends keyof ExploracaoRuralDraft>(key: K, value: ExploracaoRuralDraft[K]) => onChange({ ...draft, [key]: value });
  const isComposse = draft.tipo === 'composse';
  let number = 0;
  const next = () => String((number += 1)).padStart(2, '0');

  const outorgante = pessoas.find((p) => p.id === draft.outorganteId) ?? null;
  const administradoresDoOutorgante = draft.outorganteId
    ? administracao.filter((a) => a.pjPessoaId === draft.outorganteId).map((a) => pessoas.find((p) => p.id === a.administradorPessoaId)?.denominacao).filter(Boolean)
    : [];

  const setAdministradorNomeado = (id: string, patch: Partial<ParteSimplesDraft>) =>
    set('administradoresNomeados', draft.administradoresNomeados.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const addAdministradorNomeado = () =>
    set('administradoresNomeados', [...draft.administradoresNomeados, { id: `adm-nom-${Date.now()}-${draft.administradoresNomeados.length}`, pessoaId: null }]);
  const removeAdministradorNomeado = (id: string) => set('administradoresNomeados', draft.administradoresNomeados.filter((a) => a.id !== id));

  const setCompossuidor = (id: string, patch: Partial<CompossuidorDraft>) =>
    set('compossuidores', draft.compossuidores.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const addCompossuidor = () =>
    set('compossuidores', [...draft.compossuidores, { id: `comp-${Date.now()}-${draft.compossuidores.length}`, pessoaId: null, fracao: '0' }]);
  const removeCompossuidor = (id: string) => set('compossuidores', draft.compossuidores.filter((c) => c.id !== id));

  const setExplorador = (id: string, patch: Partial<ParteSimplesDraft>) =>
    set('exploradores', draft.exploradores.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const addExplorador = () =>
    set('exploradores', [...draft.exploradores, { id: `exp-${Date.now()}-${draft.exploradores.length}`, pessoaId: null }]);
  const removeExplorador = (id: string) => set('exploradores', draft.exploradores.filter((e) => e.id !== id));

  const setParteExtra = (id: string, patch: Partial<ParteExtraDraft>) =>
    set('partesExtras', draft.partesExtras.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const addParteExtra = () =>
    set('partesExtras', [...draft.partesExtras, { id: `pex-${Date.now()}-${draft.partesExtras.length}`, papel: PAPEIS_PARTE_EXTRA[0], pessoaId: null }]);
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
          <Field label="Vigência prorrogável" selo="novo">
            <div className={switchBoxCls}><Switch checked={draft.vigenciaProrrogavel} onCheckedChange={(v) => set('vigenciaProrrogavel', v)} /><Label className="text-sm">sim</Label></div>
          </Field>
          <Field label="Prazo de renovação" selo="novo" hint="sem contrato real com esta cláusula ainda — confirmar se é sempre igual ao prazo original">
            <Input disabled={!draft.vigenciaProrrogavel} value={draft.prazoRenovacaoVigencia} onChange={(e) => set('prazoRenovacaoVigencia', e.target.value)} className={fieldCls} placeholder="ex: por períodos iguais ao prazo original" />
          </Field>
        </div>
      </FieldSection>

      <FieldSection number={next()} title="Partes">
        {!isComposse ? (
          <div className="space-y-4">
            <div className={`${formGridCls(2)} gap-3`}>
              <Field label="Outorgante" selo="existe">
                <PessoaSelect value={draft.outorganteId} onChange={(v) => set('outorganteId', v)} pessoas={pessoas} placeholder="Selecionar outorgante…" />
              </Field>
              {outorgante?.tipo_pessoa === 'PJ' && (
                <Field label="Administradores" selo="existe" hint="lido de administracao — mesma tabela usada em Qualificação das Partes">
                  <Input disabled className={fieldCls} value={administradoresDoOutorgante.length ? administradoresDoOutorgante.join(', ') : 'Nenhum administrador cadastrado'} />
                </Field>
              )}
              {outorgante?.tipo_pessoa === 'PJ' && (
                <Field label="Capital social" selo="novo" hint="sem coluna em pessoa nem em quadro_societario — confirmar se dá pra derivar de quadro_societario.vlr_total antes de tratar como digitação livre">
                  <Input className={`${fieldCls} font-mono`} value={draft.capitalSocialOutorgante} onChange={(e) => set('capitalSocialOutorgante', e.target.value)} placeholder="ex: R$ 8.050.169,00" />
                </Field>
              )}
            </div>
            <div>
              <Label className={`${labelCls} mb-2 flex items-center gap-1.5`}>Exploradores <Selo tipo="existe" /></Label>
              <PartesFracaoList
                items={draft.exploradores}
                pessoas={pessoas}
                onAdd={addExplorador}
                onChange={setExplorador}
                onRemove={removeExplorador}
                addLabel="Adicionar explorador"
                semFracao
              />
              <p className="mt-1 text-[11px] text-muted-foreground">na UI: Explorador; no gerador: papel outorgado, a confirmar com Bernardo</p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Confirmado em reunião de validação com a OSG (19/08/2026): a parceria sempre tem um único outorgante — se
              duas empresas diferentes cedem, são duas parcerias separadas. Pode ter vários outorgados (<code>[BV-PAR]</code>:
              3 outorgados numa parceria só), mas sem percentual individual aqui — o percentual de cada pessoa só existe
              na composse; na parceria só o agregado outorgante × outorgados (seção 03).
            </p>
          </div>
        ) : (
          <div>
            <Label className={`${labelCls} mb-2 flex items-center gap-1.5`}>Compossuidores e distribuição interna <Selo tipo="novo" /></Label>
            <PartesFracaoList
              items={draft.compossuidores}
              pessoas={pessoas}
              onAdd={addCompossuidor}
              onChange={setCompossuidor}
              onRemove={removeCompossuidor}
              addLabel="Adicionar compossuidor"
              confirmadoTexto="confirmado com a OSG: sem cobertura parcial nos frutos deste instrumento"
              faltaTexto="a OSG confirmou que a distribuição precisa fechar em 100%"
            />
            <Field label="Nome da composse" selo="novo" hint="derivado, não digitado — 1º compossuidor + 'E OUTROS', confirmado em [BV-COM] e [ROS-COM]">
              <Input disabled className={`${fieldCls} mt-2`} value={nomeComposseDe(draft.compossuidores, pessoas) || '—'} />
            </Field>
          </div>
        )}

        <div className="mt-4">
          <Label className={`${labelCls} mb-2 flex items-center gap-1.5`}>Outras partes (anuente, interveniente, garantidor — sem participação nos frutos) <Selo tipo="novo" /></Label>
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
          <div className={`${formGridCls(3)} mt-4 items-end gap-3`}>
            <Field label="Prazo de indivisão" selo="novo"><Input className={fieldCls} value={draft.prazoIndivisao} onChange={(e) => set('prazoIndivisao', e.target.value)} /></Field>
            <Field label="Indivisão prorrogável" selo="novo"><div className={switchBoxCls}><Switch checked={draft.indivisaoProrrogavel} onCheckedChange={(v) => set('indivisaoProrrogavel', v)} /><Label className="text-sm">sim</Label></div></Field>
            <Field label="Aviso prévio para não renovar" selo="novo" hint="CONFIRMADO em [BV-COM]: renova por período igual ao prazo de indivisão acima, salvo pedido escrito até este prazo antes do vencimento">
              <Input disabled={!draft.indivisaoProrrogavel} className={fieldCls} value={draft.indivisaoAvisoPrazo} onChange={(e) => set('indivisaoAvisoPrazo', e.target.value)} />
            </Field>
          </div>
        )}

        {isComposse && (
          <div className="mt-4 space-y-4">
            <div>
              <Label className={`${labelCls} mb-2 flex items-center gap-1.5`}>Regra de administração <Selo tipo="novo" /></Label>
              <div className={`${formGridCls(2)} gap-3`}>
                <Select value={draft.regraAdministracao} onValueChange={(v: 'maioria' | 'nomeados') => set('regraAdministracao', v)}>
                  <SelectTrigger className={fieldCls}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maioria">Maioria dos percentuais</SelectItem>
                    <SelectItem value="nomeados">Administradores nomeados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {draft.regraAdministracao === 'nomeados' && (
                <div className="mt-2">
                  <PartesFracaoList
                    items={draft.administradoresNomeados}
                    pessoas={pessoas}
                    onAdd={addAdministradorNomeado}
                    onChange={setAdministradorNomeado}
                    onRemove={removeAdministradorNomeado}
                    addLabel="Adicionar administrador"
                    semFracao
                  />
                </div>
              )}
              <p className="mt-1 text-[11px] text-muted-foreground">
                Achado ao escrever o modelo de contrato: <code>[BV-COM]</code> usa "maioria dos percentuais";{' '}
                <code>[ROS-COM]</code> nomeia 2 compossuidores fixos. Sem regra padrão única entre os dois exemplos reais.
              </p>
            </div>
            <div className={`${formGridCls(2)} gap-3`}>
              <Field label="Periodicidade da liquidação de haveres" selo="novo">
                <Select value={draft.liquidacaoPeriodicidade} onValueChange={(v: 'mensal' | 'anual') => set('liquidacaoPeriodicidade', v)}>
                  <SelectTrigger className={fieldCls}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Número de parcelas" selo="novo" hint="[BV-COM]: 60 mensais. [ROS-COM]: 10 anuais.">
                <Input className={`${fieldCls} font-mono`} value={draft.liquidacaoNumeroParcelas} onChange={(e) => set('liquidacaoNumeroParcelas', e.target.value)} />
              </Field>
            </div>
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
            <Wide label="Documento comprobatório" selo="existe"><Input className={fieldCls} placeholder="Contrato de Parceria Rural registrado — 10/10/2022" disabled /></Wide>
          </div>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">
          O tipo e a referência do instrumento de origem <strong>não ficam aqui</strong>: uma composse pode reunir
          várias origens diferentes (<code>[BV-COM]</code>: 15 imóveis, 6 instrumentos de origem distintos) —
          confirmado pela OSG, a composse é sempre resultado da Parceria, nunca o contrário. Por isso cada imóvel
          declara sua própria origem na aba "Imóveis e origens", não o instrumento como um todo.
        </p>
      </FieldSection>

      <FieldSection number={next()} title="Assinatura">
        <div className={`${formGridCls(4)} gap-3`}>
          <Field label="Foro — comarca" selo="novo"><Input className={fieldCls} value={draft.foroComarca} onChange={(e) => set('foroComarca', e.target.value)} /></Field>
          <Field label="Foro — UF" selo="novo"><Input className={fieldCls} value={draft.foroUf} onChange={(e) => set('foroUf', e.target.value)} maxLength={2} /></Field>
          <Field label="Testemunha 1" selo="novo"><Input className={fieldCls} value={draft.testemunha1Nome} onChange={(e) => set('testemunha1Nome', e.target.value)} /></Field>
          <Field label="Testemunha 2" selo="novo"><Input className={fieldCls} value={draft.testemunha2Nome} onChange={(e) => set('testemunha2Nome', e.target.value)} /></Field>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Achado ao escrever o modelo de contrato (<code>docs/osg/contratos_exploracao/05-</code> e{' '}
          <code>06-modelo-*-rural.md</code>): nenhum dos dois campos tem coluna em lugar nenhum do banco — confirmado
          por consulta ao schema em 19/08/2026. Todo contrato real lido tem os dois preenchidos.
        </p>
      </FieldSection>
    </>
  );
}

/**
 * Lista de pessoas reutilizada por compossuidores e exploradores — mesmo padrão de edição.
 * `semFracao` desliga o campo de percentual e a checagem de soma 100%: usado pelos
 * exploradores da Parceria, onde não existe percentual individual (confirmado em reunião
 * de validação com a OSG, 19/08/2026) — só a composse tem fração por pessoa.
 */
function PartesFracaoList({
  items, pessoas, onAdd, onChange, onRemove, addLabel, confirmadoTexto, faltaTexto, semFracao,
}: {
  items: { id: string; pessoaId: string | null; fracao?: string }[];
  pessoas: PessoaRow[];
  onAdd: () => void;
  onChange: (id: string, patch: { pessoaId?: string | null; fracao?: string }) => void;
  onRemove: (id: string) => void;
  addLabel: string;
  confirmadoTexto?: string;
  faltaTexto?: string;
  semFracao?: boolean;
}) {
  const soma = items.reduce((acc, c) => acc + (Number(c.fracao) || 0), 0);
  const fechou = Math.abs(soma - 100) < 0.01;
  return (
    <>
      <div className="space-y-2">
        {items.map((c) => (
          <div key={c.id} className="flex items-center gap-2 rounded-md border border-osg-200/80 bg-background p-2">
            <div className="flex-1"><PessoaSelect value={c.pessoaId} onChange={(v) => onChange(c.id, { pessoaId: v })} pessoas={pessoas} placeholder="Selecionar pessoa qualificada…" /></div>
            {!semFracao && (
              <>
                <Input type="number" value={c.fracao ?? '0'} onChange={(e) => onChange(c.id, { fracao: e.target.value })} className={`${fieldCls} w-24 text-right font-mono`} />
                <span className="text-xs text-muted-foreground">%</span>
              </>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => onRemove(c.id)}><X className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" className="mt-2 gap-1.5 border-dashed" onClick={onAdd}><Plus className="h-3.5 w-3.5" />{addLabel}</Button>
      {!semFracao && items.length > 0 && (
        <p className={`mt-2 text-xs font-semibold ${fechou ? 'text-emerald-700' : 'text-osg-red'}`}>
          {fechou ? `✓ soma 100%${confirmadoTexto ? ` — ${confirmadoTexto}` : ''}` : `✕ soma ${soma}%${faltaTexto ? ` — ${faltaTexto}` : ' — precisa fechar em 100%'}`}
        </p>
      )}
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
