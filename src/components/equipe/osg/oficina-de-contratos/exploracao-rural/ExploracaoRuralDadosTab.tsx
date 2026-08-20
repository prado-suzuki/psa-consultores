import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DateFieldWithInput from '@/components/equipe/client-form/DateFieldWithInput';
import { FieldSection, fieldCls, switchBoxCls } from '@/components/equipe/osg/formKit';
import { formGridCls } from '@/lib/osgFormGrid';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import { AlertTriangle, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Full, ListaLabel, SubCampo, Wide } from './SeloCampo';
import {
  camposFaltandoNaQualificacao, nomeComposseDe, TIPOS_EXPLORACAO_DO_BANCO, UNIDADES_DE_PRAZO,
  type CompossuidorDraft, type ExploracaoRuralDraft,
  type ParteSimplesDraft, type TipoExploracao, type UnidadeDePrazo,
} from '@/previews/contratosExploracaoModel';

// Aba "Dados" do cadastro de exploração rural — mesma densidade de
// MatriculaDadosTab.tsx (FieldSection + formGridCls(4) + gap-3 + space-y-1.5 nos
// campos), que é o padrão dos modais da OSG Work. Componente puro: nada aqui
// consulta o banco.
//
// Regra de layout (19/08/2026, depois de comparar com os modais existentes): a
// justificativa de cada campo não é texto sob o campo — os modais da OSG não têm
// nenhum, e a explicação inline esticava o formulário. Ela virou **tooltip** no ícone
// ao lado do rótulo (ver `SeloCampo.tsx`), e a nota de seção virou uma linha no
// cabeçalho (`FieldSection hint`). Detalhe completo em
// docs/osg/levantamento-contratos-rurais.md.
//
// Enxugado na mesma data: "Administradores" (vinha de `administracao`) e "Capital
// social" (derivado de `v_quadro_societario`) saíram — os dois já têm tela de
// cadastro própria e o gerador lê de lá. "Declarado no IRPF" também saiu: não serve
// ao contrato, quem consome é o `FiscalReport.tsx`.
//
// Imóveis (matrícula, área, origem) não têm campo aqui — moram só na aba "Imóveis e
// origens", ver ExploracaoRuralImoveisTab.tsx.

// "Outras partes" (anuente/interveniente/garantidor) foi REMOVIDA em 19/08/2026.
// Procedência não se sustentou: nenhum dos 5 contratos reais transcritos em
// docs/notebooklm/ cita esses papéis (grep: zero ocorrências); a fonte era uma célula
// da planilha de Diagnóstico Patrimonial do Nodari, não texto de contrato. E na reunião
// de validação a consultora foi direta: "isso daí não precisaria, a gente não tá
// colocando mais". O que existe no contrato real é a cláusula "DA ANUÊNCIA" do
// [BV-PAR] — a própria outorgante autorizando penhor, não uma terceira parte.
// `partesExtras` segue no rascunho, sem campo, até alguém achar contrato que use.

interface Props {
  draft: ExploracaoRuralDraft;
  onChange: (draft: ExploracaoRuralDraft) => void;
  pessoas: PessoaRow[];
}

export function ExploracaoRuralDadosTab({ draft, onChange, pessoas }: Props) {
  const set = <K extends keyof ExploracaoRuralDraft>(key: K, value: ExploracaoRuralDraft[K]) => onChange({ ...draft, [key]: value });
  const isComposse = draft.tipo === 'composse';
  let number = 0;
  const next = () => String((number += 1)).padStart(2, '0');

  const outorgante = pessoas.find((p) => p.id === draft.outorganteId) ?? null;

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

  return (
    <>
      <FieldSection number={next()} title="Instrumento">
        <div className={`${formGridCls(4)} gap-3`}>
          <Field label="Tipo de exploração" required hint="Só existe modelo de cláusula pra Parceria e Composse — os demais valores do enum osg_tipo_exploracao (arrendamento, comodato, condomínio, exploração própria) não entram nesta tela.">
            <Select value={draft.tipo} onValueChange={(v: TipoExploracao) => set('tipo', v)}>
              <SelectTrigger className={fieldCls}><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS_EXPLORACAO_DO_BANCO.map((t) => (
                  <SelectItem key={t.valor} value={t.valor}>{t.rotulo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Data da assinatura" trecho={{ tipo: draft.tipo, campo: 'dataAssinatura' }}><DateFieldWithInput value={draft.dataAssinatura} onChange={(v) => set('dataAssinatura', v)} /></Field>
          {/* Encerramento e prorrogação são exclusivos da Parceria: a Cláusula Segunda dela tem
              vigência com data final ("findará em"), e a Composse não expira — o que ela tem é
              prazo de indivisão (Cláusula Quarta), que renova até alguém pedir a divisão. */}
          {!isComposse && (
            <>
              <Field label="Data de encerramento" trecho={{ tipo: 'parceria', campo: 'dataEncerramento' }}><DateFieldWithInput value={draft.dataEncerramento} onChange={(v) => set('dataEncerramento', v)} /></Field>
              <Field label="Vigência prorrogável" trecho={{ tipo: 'parceria', campo: 'vigenciaProrrogavel' }}>
                <div className={switchBoxCls}><Switch checked={draft.vigenciaProrrogavel} onCheckedChange={(v) => set('vigenciaProrrogavel', v)} /><Label className="text-sm">sim</Label></div>
              </Field>
              <Field label="Prazo de renovação" trecho={{ tipo: 'parceria', campo: 'prazoRenovacaoVigencia' }}>
                <Input disabled={!draft.vigenciaProrrogavel} value={draft.prazoRenovacaoVigencia} onChange={(e) => set('prazoRenovacaoVigencia', e.target.value)} className={fieldCls} placeholder="ex: períodos iguais ao original" />
              </Field>
            </>
          )}
        </div>
      </FieldSection>

      <FieldSection
        number={next()}
        title="Partes"
        hint={isComposse ? 'frações somam 100% dos frutos deste instrumento' : 'outorgante único; exploradores sem fração individual'}
      >
        {!isComposse ? (
          <div className="space-y-3">
            <div className={`${formGridCls(2)} gap-3`}>
              <Field label="Outorgante" trecho={{ tipo: 'parceria', campo: 'outorgante' }}>
                <PessoaSelect value={draft.outorganteId} onChange={(v) => set('outorganteId', v)} pessoas={pessoas} placeholder="Selecionar outorgante…" />
                <AvisoQualificacao pessoa={outorgante} />
              </Field>
            </div>
            <div>
              <ListaLabel label="Exploradores" trecho={{ tipo: 'parceria', campo: 'exploradores' }} />
              <PartesFracaoList
                items={draft.exploradores}
                pessoas={pessoas}
                onAdd={addExplorador}
                onChange={setExplorador}
                onRemove={removeExplorador}
                addLabel="Adicionar explorador"
                semFracao
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <ListaLabel label="Compossuidores e distribuição interna" trecho={{ tipo: 'composse', campo: 'compossuidores' }} />
              <PartesFracaoList
                items={draft.compossuidores}
                pessoas={pessoas}
                onAdd={addCompossuidor}
                onChange={setCompossuidor}
                onRemove={removeCompossuidor}
                addLabel="Adicionar compossuidor"
              />
            </div>
            {/* Derivado (1º compossuidor + "E OUTROS"), nunca digitado — mas leva selo
                porque cadastro nenhum produz esse nome hoje. */}
            <div className={`${formGridCls(2)} gap-3`}>
              <Field label="Nome da composse" trecho={{ tipo: 'composse', campo: 'nomeComposse' }}>
                <Input disabled className={fieldCls} value={nomeComposseDe(draft.compossuidores, pessoas) || '—'} />
              </Field>
            </div>
          </div>
        )}

      </FieldSection>

      <FieldSection
        number={next()}
        title={isComposse ? 'Exploração' : 'Percentual e exploração'}
        hint={isComposse ? 'a partilha vem das frações dos compossuidores, não daqui' : 'mudança de percentual exige Termo Aditivo'}
      >
        <div className={`${formGridCls(4)} gap-3`}>
          {/* Percentual só existe na Parceria: é o corte outorgante x outorgados da Cláusula
              Quinta. Na Composse os frutos se repartem pelas frações dos compossuidores
              (Cláusula Segunda), e a partilha com quem cedeu a terra pertence à Parceria de
              origem — não a este instrumento. */}
          {!isComposse && (
            <>
              <Field label="Percentual do outorgante" trecho={{ tipo: 'parceria', campo: 'percentualOutorgante' }}><Input className={`${fieldCls} font-mono`} value={draft.percentualOutorgante} onChange={(e) => set('percentualOutorgante', e.target.value)} placeholder="ex: 30,000%" /></Field>
              <Field label="Percentual do explorador" trecho={{ tipo: 'parceria', campo: 'percentualExplorador' }}><Input className={`${fieldCls} font-mono`} value={draft.percentualExplorador} onChange={(e) => set('percentualExplorador', e.target.value)} placeholder="ex: 70,000%" /></Field>
              <Field label="Inclui pecuária?" trecho={{ tipo: 'parceria', campo: 'naturezaExploracao' }}>
                <div className={switchBoxCls}><Switch checked={draft.incluiPecuaria} onCheckedChange={(v) => set('incluiPecuaria', v)} /><Label className="text-sm">sim</Label></div>
              </Field>
            </>
          )}
          <Wide label="Culturas/atividades permitidas" trecho={{ tipo: draft.tipo, campo: 'culturas' }}><Input className={fieldCls} value={draft.culturas} onChange={(e) => set('culturas', e.target.value)} placeholder="soja; milho; algodão; pecuária" /></Wide>
          <Field label="Permite penhor / financiamento" trecho={{ tipo: draft.tipo, campo: 'permitePenhor' }}><div className={switchBoxCls}><Switch checked={draft.permitePenhor} onCheckedChange={(v) => set('permitePenhor', v)} /><Label className="text-sm">sim</Label></div></Field>
        </div>
      </FieldSection>

      {isComposse && (
        <FieldSection number={next()} title="Indivisão e administração" hint="[BV-COM] usa maioria e 60× mensal; [ROS-COM], nomeados e 10× anual">
          <div className="space-y-3">
            <div className={`${formGridCls(4)} items-end gap-3`}>
              <Field label="Prazo de indivisão" trecho={{ tipo: 'composse', campo: 'prazoIndivisao' }}>
                <div className="flex gap-2">
                  <Input className={`${fieldCls} w-20 font-mono`} value={draft.prazoIndivisaoQuantidade} onChange={(e) => set('prazoIndivisaoQuantidade', e.target.value)} />
                  <Select value={draft.prazoIndivisaoUnidade} onValueChange={(v: UnidadeDePrazo) => set('prazoIndivisaoUnidade', v)}>
                    <SelectTrigger className={`${fieldCls} flex-1`}><SelectValue /></SelectTrigger>
                    <SelectContent>{UNIDADES_DE_PRAZO.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </Field>
              <Field label="Indivisão prorrogável" trecho={{ tipo: 'composse', campo: 'indivisaoProrrogavel' }}><div className={switchBoxCls}><Switch checked={draft.indivisaoProrrogavel} onCheckedChange={(v) => set('indivisaoProrrogavel', v)} /><Label className="text-sm">sim</Label></div></Field>
              <Field label="Aviso prévio para não renovar" trecho={{ tipo: 'composse', campo: 'indivisaoAvisoPrazo' }}>
                <div className="flex gap-2">
                  <Input disabled={!draft.indivisaoProrrogavel} className={`${fieldCls} w-20 font-mono`} value={draft.indivisaoAvisoQuantidade} onChange={(e) => set('indivisaoAvisoQuantidade', e.target.value)} />
                  <Select value={draft.indivisaoAvisoUnidade} onValueChange={(v: UnidadeDePrazo) => set('indivisaoAvisoUnidade', v)} disabled={!draft.indivisaoProrrogavel}>
                    <SelectTrigger className={`${fieldCls} flex-1`}><SelectValue /></SelectTrigger>
                    <SelectContent>{UNIDADES_DE_PRAZO.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </Field>
              <Field label="Regra de administração" trecho={{ tipo: 'composse', campo: 'regraAdministracao' }}>
                <Select value={draft.regraAdministracao} onValueChange={(v: 'maioria' | 'nomeados') => set('regraAdministracao', v)}>
                  <SelectTrigger className={fieldCls}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maioria">Maioria dos percentuais</SelectItem>
                    <SelectItem value="nomeados">Administradores nomeados</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Periodicidade da liquidação" trecho={{ tipo: 'composse', campo: 'liquidacaoPeriodicidade' }}>
                <Select value={draft.liquidacaoPeriodicidade} onValueChange={(v: 'mensal' | 'anual') => set('liquidacaoPeriodicidade', v)}>
                  <SelectTrigger className={fieldCls}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Número de parcelas" trecho={{ tipo: 'composse', campo: 'liquidacaoNumeroParcelas' }}><Input className={`${fieldCls} font-mono`} value={draft.liquidacaoNumeroParcelas} onChange={(e) => set('liquidacaoNumeroParcelas', e.target.value)} /></Field>
            </div>
            {draft.regraAdministracao === 'nomeados' && (
              <div>
                <ListaLabel label="Administradores nomeados" trecho={{ tipo: 'composse', campo: 'administradoresNomeados' }} />
                <PartesFracaoList
                  items={draft.administradoresNomeados}
                  pessoas={pessoas}
                  onAdd={addAdministradorNomeado}
                  onChange={setAdministradorNomeado}
                  onRemove={removeAdministradorNomeado}
                  addLabel="Adicionar administrador"
                  semFracao
                  semAviso
                />
              </div>
            )}
          </div>
        </FieldSection>
      )}

      <FieldSection number={next()} title="Assinatura" hint="nenhum destes tem coluna no banco; todo contrato real traz os cinco">
        <div className={`${formGridCls(4)} gap-3`}>
          <Field label="Foro — comarca" trecho={{ tipo: draft.tipo, campo: 'foroComarca' }}><Input className={fieldCls} value={draft.foroComarca} onChange={(e) => set('foroComarca', e.target.value)} /></Field>
          <Field label="Foro — UF" trecho={{ tipo: draft.tipo, campo: 'foroUf' }}><Input className={fieldCls} value={draft.foroUf} onChange={(e) => set('foroUf', e.target.value)} maxLength={2} /></Field>
          <Field label="Número de vias" trecho={{ tipo: draft.tipo, campo: 'numeroVias' }}><Input className={`${fieldCls} font-mono`} value={draft.numeroVias} onChange={(e) => set('numeroVias', e.target.value)} placeholder="ex: 3" /></Field>
          <Full label="Testemunha 1">
            <div className="space-y-2">
              <SubCampo label="Nome" trecho={{ tipo: draft.tipo, campo: 'testemunhaNome' }}>
                <Input className={fieldCls} value={draft.testemunha1Nome} onChange={(e) => set('testemunha1Nome', e.target.value)} placeholder="Nome completo" />
              </SubCampo>
              <div className="grid grid-cols-2 gap-2">
                <SubCampo label="CPF" trecho={{ tipo: draft.tipo, campo: 'testemunhaCpf' }}>
                  <Input className={`${fieldCls} font-mono`} value={draft.testemunha1Cpf} onChange={(e) => set('testemunha1Cpf', e.target.value)} placeholder="CPF" />
                </SubCampo>
                <SubCampo label="RG" trecho={{ tipo: draft.tipo, campo: 'testemunhaRg' }}>
                  <Input className={`${fieldCls} font-mono`} value={draft.testemunha1Rg} onChange={(e) => set('testemunha1Rg', e.target.value)} placeholder="RG" />
                </SubCampo>
              </div>
            </div>
          </Full>
          <Full label="Testemunha 2">
            <div className="space-y-2">
              <SubCampo label="Nome" trecho={{ tipo: draft.tipo, campo: 'testemunhaNome' }}>
                <Input className={fieldCls} value={draft.testemunha2Nome} onChange={(e) => set('testemunha2Nome', e.target.value)} placeholder="Nome completo" />
              </SubCampo>
              <div className="grid grid-cols-2 gap-2">
                <SubCampo label="CPF" trecho={{ tipo: draft.tipo, campo: 'testemunhaCpf' }}>
                  <Input className={`${fieldCls} font-mono`} value={draft.testemunha2Cpf} onChange={(e) => set('testemunha2Cpf', e.target.value)} placeholder="CPF" />
                </SubCampo>
                <SubCampo label="RG" trecho={{ tipo: draft.tipo, campo: 'testemunhaRg' }}>
                  <Input className={`${fieldCls} font-mono`} value={draft.testemunha2Rg} onChange={(e) => set('testemunha2Rg', e.target.value)} placeholder="RG" />
                </SubCampo>
              </div>
            </div>
          </Full>
        </div>
      </FieldSection>

      {/* Fora do contrato — referência de arquivo (Documentos do Cliente), não é citada em
          nenhum bloco do modelo (ver tooltip do próprio campo). Por isso fica separada,
          depois de tudo que o texto do contrato de fato usa. */}
      <FieldSection number={next()} title="Documento de origem" hint="tipo e instrumento de origem ficam por imóvel, na outra aba">
        <div className={`${formGridCls(2)} gap-3`}>
          {!isComposse ? (
            <Field label="Estudo fiscal" trecho={{ tipo: 'parceria', campo: 'estudoFiscal' }}><Input className={fieldCls} placeholder="Estudo de Cálculo da Parceria — 12/03/2025" disabled /></Field>
          ) : (
            <Field label="Documento comprobatório" trecho={{ tipo: 'composse', campo: 'documentoComprobatorio' }}><Input className={fieldCls} placeholder="Contrato de Parceria Rural registrado — 10/10/2022" disabled /></Field>
          )}
        </div>
      </FieldSection>
    </>
  );
}

/**
 * Lista de pessoas reutilizada por compossuidores, exploradores e administradores
 * nomeados. `semFracao` desliga o percentual e a checagem de soma 100% — só a
 * composse tem fração por pessoa (OSG, 19/08/2026). `semAviso` desliga o alerta de
 * qualificação: administrador nomeado entra no contrato só pelo nome.
 */
function PartesFracaoList({
  items, pessoas, onAdd, onChange, onRemove, addLabel, semFracao, semAviso,
}: {
  items: { id: string; pessoaId: string | null; fracao?: string }[];
  pessoas: PessoaRow[];
  onAdd: () => void;
  onChange: (id: string, patch: { pessoaId?: string | null; fracao?: string }) => void;
  onRemove: (id: string) => void;
  addLabel: string;
  semFracao?: boolean;
  semAviso?: boolean;
}) {
  const soma = items.reduce((acc, c) => acc + (Number(c.fracao) || 0), 0);
  const fechou = Math.abs(soma - 100) < 0.01;
  return (
    <>
      <div className="space-y-1.5">
        {items.map((c) => (
          <div key={c.id} className="rounded-md border border-osg-200/80 bg-background p-1.5">
            <div className="flex items-center gap-2">
              <div className="flex-1"><PessoaSelect value={c.pessoaId} onChange={(v) => onChange(c.id, { pessoaId: v })} pessoas={pessoas} placeholder="Selecionar pessoa qualificada…" /></div>
              {!semFracao && (
                <>
                  <Input type="number" value={c.fracao ?? '0'} onChange={(e) => onChange(c.id, { fracao: e.target.value })} className={`${fieldCls} w-20 text-right font-mono`} />
                  <span className="text-xs text-muted-foreground">%</span>
                </>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => onRemove(c.id)}><X className="h-3.5 w-3.5" /></Button>
            </div>
            {!semAviso && <AvisoQualificacao pessoa={pessoas.find((p) => p.id === c.pessoaId) ?? null} parteExploradora />}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex items-center gap-3">
        <Button variant="outline" size="sm" className="gap-1.5 border-dashed" onClick={onAdd}><Plus className="h-3.5 w-3.5" />{addLabel}</Button>
        {!semFracao && items.length > 0 && (
          <span className={`text-xs font-semibold ${fechou ? 'text-emerald-700' : 'text-osg-red'}`}>
            {fechou ? '✓ soma 100%' : `✕ soma ${soma}% — precisa fechar em 100%`}
          </span>
        )}
      </div>
    </>
  );
}

/**
 * Avisa que a pessoa escolhida não tem, no cadastro de Pessoa, tudo o que o preâmbulo
 * do contrato exige dela — sem isso o documento sai com lacuna no meio da frase e
 * ninguém descobre antes de gerar. Não bloqueia: a qualificação se resolve em
 * Qualificação das Partes, não aqui.
 */
function AvisoQualificacao({ pessoa, parteExploradora }: { pessoa: PessoaRow | null; parteExploradora?: boolean }) {
  const faltando = camposFaltandoNaQualificacao(pessoa, { parteExploradora });
  if (!pessoa || faltando.length === 0) return null;
  return (
    <p className="mt-1 flex items-start gap-1 text-[10px] leading-snug text-amber-800">
      <AlertTriangle className="mt-px h-2.5 w-2.5 shrink-0" />
      <span>Qualificação incompleta para o contrato: falta {faltando.join(', ')}.</span>
    </p>
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
