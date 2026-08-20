import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { apararSegmentos, gerarComposicao, type BlocoGerado } from '@/lib/templates';
import { useAdministracaoByPj } from '@/hooks/useQualificacaoDasPartes';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import { useQuadroSocietarioByEmpresa } from '@/hooks/useQuadroSocietario';
import type { MatriculaEnriched } from '@/hooks/useDiagnosticoPatrimonial';
import type { AdministradorParaMapear, CapitalSociedade } from '@/lib/templates/mapeadores';
import { FieldSection, fieldCls } from '@/components/equipe/osg/formKit';
import { formGridCls, formSpanCls } from '@/lib/osgFormGrid';
import { TEMPLATE_COMPOSSE, TEMPLATE_PARCERIA } from '@/previews/contratoRuralBlocos';
import { montarContextoComposse, montarContextoParceria } from '@/previews/contratoRuralContexto';
import { ADMINISTRADORES_FIXTURE_POR_PJ, CAPITAL_SOCIAL_FIXTURE_POR_PJ, type ExploracaoRuralDraft } from '@/previews/contratosExploracaoModel';
import { Field, Full, SubCampo } from './SeloCampo';
import { TextoComProveniencia } from './TextoComProveniencia';

// Aba "Preview do contrato": monta o contexto do rascunho e chama o MOTOR REAL da
// Oficina de Contratos (`gerarComposicao`/`TEMPLATE_PARCERIA`/`TEMPLATE_COMPOSSE`)
// — não um renderer paralelo. Numeração de cláusula/capítulo e descarte de bloco
// vazio (penhor desligado, sem exploradores ainda…) vêm de lá de graça. Mostra o
// documento como sairia HOJE, com o que o rascunho já tem — não é um preview de
// como o formulário ficaria depois de preenchido, é o texto de verdade.
//
// Desde 20/08/2026 (docs/osg/contratos_exploracao/13-auditoria-cadastro-vs-modelo.md)
// esta aba replica a mesma ordem da tela real "Gerar Documento" da Oficina de
// Contratos: um resumo só-leitura do que já veio das outras abas ("Vem do
// cadastro" — equivalente a "Conferência dos dados"), depois os campos que não
// têm cadastro nenhum atrás ("Preencher à mão" — os `CAMPOS_MANUAIS`, movidos de
// dentro da aba "Dados"), e só então o texto gerado. Nenhum é campo NOVO: os cinco
// de "Preencher à mão" só mudaram de aba, mantendo o mesmo `trecho` de tooltip.

interface Props {
  draft: ExploracaoRuralDraft;
  onChange: (draft: ExploracaoRuralDraft) => void;
  pessoas: PessoaRow[];
  matriculas: MatriculaEnriched[];
  instrumentosDeOrigem: { ref: string; label: string; outorganteId?: string; dataAssinatura?: string }[];
  /** Se true, os administradores/capital social do outorgante vêm do banco (hooks); senão, das fixtures. */
  usandoBanco: boolean;
}

export function ExploracaoRuralPreviewTab({ draft, onChange, pessoas, matriculas, instrumentosDeOrigem, usandoBanco }: Props) {
  const set = <K extends keyof ExploracaoRuralDraft>(key: K, value: ExploracaoRuralDraft[K]) => onChange({ ...draft, [key]: value });
  const pjId = usandoBanco ? draft.outorganteId : null;
  const { data: administracaoBanco = [] } = useAdministracaoByPj(pjId);
  const { data: quadroBanco = [] } = useQuadroSocietarioByEmpresa(pjId);

  const administradoresOutorgante = useMemo((): AdministradorParaMapear[] => {
    if (usandoBanco) {
      return administracaoBanco.map((a) => ({
        pessoa: { id: a.administrador_pessoa_id, denominacao: a.administrador_denominacao } as PessoaRow,
        cargo: a.cargo,
      }));
    }
    const nomes = draft.outorganteId ? ADMINISTRADORES_FIXTURE_POR_PJ[draft.outorganteId] ?? [] : [];
    return nomes.map((nome, i) => ({ pessoa: { id: `fx-adm-${i}`, denominacao: nome } as PessoaRow, cargo: null }));
  }, [usandoBanco, administracaoBanco, draft.outorganteId]);

  const capitalSocialOutorgante = useMemo((): CapitalSociedade | null => {
    if (usandoBanco) {
      if (quadroBanco.length === 0) return null;
      return {
        capitalValor: quadroBanco.reduce((soma, r) => soma + (r.vlr_total ?? 0), 0),
        totalQuotas: quadroBanco.reduce((soma, r) => soma + (r.quotas ?? 0), 0),
      };
    }
    const valor = draft.outorganteId ? CAPITAL_SOCIAL_FIXTURE_POR_PJ[draft.outorganteId] : undefined;
    return valor != null ? { capitalValor: valor, totalQuotas: null } : null;
  }, [usandoBanco, quadroBanco, draft.outorganteId]);

  const resolverInstrumentoOrigem = useMemo(
    () => (ref: string) => {
      const encontrado = instrumentosDeOrigem.find((i) => i.ref === ref);
      return encontrado ? { outorganteId: encontrado.outorganteId ?? null, dataAssinatura: encontrado.dataAssinatura ?? '' } : null;
    },
    [instrumentosDeOrigem],
  );

  const recursos = { administradoresOutorgante, capitalSocialOutorgante, pessoas, matriculas, resolverInstrumentoOrigem };

  const isComposse = draft.tipo === 'composse';
  const nomeDaPessoa = (id: string | null) => pessoas.find((p) => p.id === id)?.denominacao ?? null;
  const outorganteNome = nomeDaPessoa(draft.outorganteId);
  const exploradoresResumo = draft.exploradores.map((e) => nomeDaPessoa(e.pessoaId)).filter((n): n is string => !!n);
  const compossuidoresResumo = draft.compossuidores
    .map((c) => { const nome = nomeDaPessoa(c.pessoaId); return nome ? `${nome} (${c.fracao || '0'}%)` : null; })
    .filter((n): n is string => !!n);
  const administradoresNomeadosResumo = draft.administradoresNomeados.map((a) => nomeDaPessoa(a.pessoaId)).filter((n): n is string => !!n);
  const imoveisResumo = draft.imoveis
    .map((item) => {
      const matricula = matriculas.find((m) => m.id === item.matriculaId);
      if (!matricula) return null;
      const nomeImovel = matricula.bem_denominacao ?? `Matrícula ${matricula.numero}`;
      return `${nomeImovel} — Mat. ${matricula.numero}${item.areaExplorada ? ` (${item.areaExplorada} ha)` : ''}`;
    })
    .filter((n): n is string => !!n);

  const composicao = useMemo((): { ok: true; blocos: BlocoGerado[] } | { ok: false; erro: string } => {
    try {
      const contexto = draft.tipo === 'composse' ? montarContextoComposse(draft, recursos) : montarContextoParceria(draft, recursos);
      const template = draft.tipo === 'composse' ? TEMPLATE_COMPOSSE : TEMPLATE_PARCERIA;
      return { ok: true, blocos: gerarComposicao(template, contexto).blocos };
    } catch (erro) {
      return { ok: false, erro: erro instanceof Error ? erro.message : String(erro) };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `recursos` é um objeto novo por render; o que importa é o conteúdo, coberto pelas deps abaixo.
  }, [draft, pessoas, matriculas, administradoresOutorgante, capitalSocialOutorgante, resolverInstrumentoOrigem]);

  return (
    <div className="space-y-6">
      <FieldSection number="01" title="Vem do cadastro" hint="confira nas abas Dados / Imóveis e origens — aqui é só o resumo do que já foi escolhido">
        <div className={`${formGridCls(4)} gap-3`}>
          {!isComposse ? (
            <>
              <ResumoItem label="Outorgante" value={outorganteNome ?? '—'} />
              <ResumoItem label="Exploradores" value={exploradoresResumo.length ? exploradoresResumo.join('; ') : '—'} />
              <ResumoItem
                label="Percentual"
                value={draft.percentualOutorgante || draft.percentualExplorador
                  ? `Outorgante ${draft.percentualOutorgante || '—'} / Explorador ${draft.percentualExplorador || '—'}`
                  : '—'}
              />
            </>
          ) : (
            <>
              <ResumoItem wide label="Compossuidores" value={compossuidoresResumo.length ? compossuidoresResumo.join('; ') : '—'} />
              <ResumoItem label="Regra de administração" value={draft.regraAdministracao === 'nomeados' ? 'Administradores nomeados' : 'Maioria dos percentuais'} />
              {draft.regraAdministracao === 'nomeados' && (
                <ResumoItem label="Administradores nomeados" value={administradoresNomeadosResumo.length ? administradoresNomeadosResumo.join('; ') : '—'} />
              )}
            </>
          )}
          <ResumoItem wide label="Imóveis selecionados" value={imoveisResumo.length ? imoveisResumo.join(' · ') : 'nenhum imóvel selecionado ainda'} />
        </div>
      </FieldSection>

      <FieldSection number="02" title="Preencher à mão" hint="nenhum destes tem coluna no banco; todo contrato real traz os cinco">
        <div className={`${formGridCls(4)} gap-3`}>
          <Field label="Foro — comarca" trecho={{ tipo: draft.tipo, campo: 'foroComarca' }}><Input className={fieldCls} value={draft.foroComarca} onChange={(e) => set('foroComarca', e.target.value)} /></Field>
          <Field label="Foro — UF" trecho={{ tipo: draft.tipo, campo: 'foroUf' }}><Input className={fieldCls} value={draft.foroUf} onChange={(e) => set('foroUf', e.target.value)} maxLength={2} /></Field>
          <Field label="Número de vias" trecho={{ tipo: draft.tipo, campo: 'numeroVias' }}><Input className={`${fieldCls} font-mono`} value={draft.numeroVias} onChange={(e) => set('numeroVias', e.target.value)} placeholder="ex: 3" /></Field>
          <Full label="Testemunha 1" trecho={{ tipo: draft.tipo, campo: 'testemunhaNome' }}>
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
          <Full label="Testemunha 2" trecho={{ tipo: draft.tipo, campo: 'testemunhaNome' }}>
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

      <FieldSection number="03" title="Prévia do documento">
        <div className="space-y-3">
          <p className="text-[11px] text-muted-foreground">
            Texto gerado agora pelo motor real da Oficina de Contratos (<code>gerarComposicao</code> +{' '}
            <code>{draft.tipo === 'composse' ? 'TEMPLATE_COMPOSSE' : 'TEMPLATE_PARCERIA'}</code>) sobre os dados atuais deste
            rascunho — não é simulação. Campo vazio aparece em branco; bloco condicional sem dado (penhor desligado, sem
            exploradores ainda) some sozinho, sem buraco na numeração. Todo trecho em <mark className="rounded-[2px] bg-osg-highlighter/35 px-0.5 text-inherit">amarelo</mark>{' '}
            veio de uma variável do cadastro — passe o mouse pra ver de qual campo.
          </p>
          {!composicao.ok ? (
            <div className="flex items-start gap-2 rounded-md border border-osg-red/30 bg-osg-red/10 p-4 text-sm text-osg-red">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">O motor recusou renderizar — placeholder sem dado que o template exige.</p>
                <p className="mt-1 font-mono text-xs">{composicao.erro}</p>
              </div>
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-lg border border-osg-200/70 bg-white p-6 font-serif text-sm leading-relaxed text-slate-900">
              {composicao.blocos.map((bloco, i) => (
                <div key={bloco.id} className={i === 0 ? undefined : bloco.tipo === 'paragrafo' ? 'mt-1' : 'mt-4'}>
                  <TextoComProveniencia segmentos={apararSegmentos(bloco.segmentos)} />
                </div>
              ))}
            </div>
          )}
        </div>
      </FieldSection>
    </div>
  );
}

/** Linha só-leitura do resumo "Vem do cadastro" — espelha o que já foi escolhido nas abas Dados/Imóveis, sem reabrir campo de digitação. */
function ResumoItem({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? formSpanCls(4) : undefined}>
      <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value}</span>
    </div>
  );
}
