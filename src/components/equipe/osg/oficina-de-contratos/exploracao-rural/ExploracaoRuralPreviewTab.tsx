import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { apararSegmentos, gerarComposicao, type BlocoGerado } from '@/lib/templates';
import { useAdministracaoByPj } from '@/hooks/useQualificacaoDasPartes';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import { useQuadroSocietarioByEmpresa } from '@/hooks/useQuadroSocietario';
import type { MatriculaEnriched } from '@/hooks/useDiagnosticoPatrimonial';
import type { AdministradorParaMapear, CapitalSociedade } from '@/lib/templates/mapeadores';
import { TEMPLATE_COMPOSSE, TEMPLATE_PARCERIA } from '@/previews/contratoRuralBlocos';
import { montarContextoComposse, montarContextoParceria } from '@/previews/contratoRuralContexto';
import { ADMINISTRADORES_FIXTURE_POR_PJ, CAPITAL_SOCIAL_FIXTURE_POR_PJ, type ExploracaoRuralDraft } from '@/previews/contratosExploracaoModel';
import { TextoComProveniencia } from './TextoComProveniencia';

// Aba "Preview do contrato": monta o contexto do rascunho e chama o MOTOR REAL da
// Oficina de Contratos (`gerarComposicao`/`TEMPLATE_PARCERIA`/`TEMPLATE_COMPOSSE`)
// — não um renderer paralelo. Numeração de cláusula/capítulo e descarte de bloco
// vazio (penhor desligado, sem exploradores ainda…) vêm de lá de graça. Mostra o
// documento como sairia HOJE, com o que o rascunho já tem — não é um preview de
// como o formulário ficaria depois de preenchido, é o texto de verdade.

interface Props {
  draft: ExploracaoRuralDraft;
  pessoas: PessoaRow[];
  matriculas: MatriculaEnriched[];
  instrumentosDeOrigem: { ref: string; label: string; outorganteId?: string; dataAssinatura?: string }[];
  /** Se true, os administradores/capital social do outorgante vêm do banco (hooks); senão, das fixtures. */
  usandoBanco: boolean;
}

export function ExploracaoRuralPreviewTab({ draft, pessoas, matriculas, instrumentosDeOrigem, usandoBanco }: Props) {
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
  );
}
