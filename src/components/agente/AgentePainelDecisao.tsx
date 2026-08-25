/**
 * "Exige decisão" e "Avisos desta tela" DENTRO do painel do agente.
 *
 * Este bloco é o destino do que saiu das telas do Board: a faixa de alertas e o
 * banner de falha de carregamento deixaram de ocupar cartão no meio do
 * conteúdo e passaram a viver aqui, atrás do ícone ao lado do título.
 *
 * A informação NÃO foi descartada, e isso é o ponto: alerta é fato com número
 * (`alertasEstrategicos`), aviso é a lista das consultas que falharam. Some da
 * grade, continua a um clique — e o ponto colorido no ícone é o que garante que
 * "a um clique" não vire "ninguém nunca viu".
 */
import { AlertTriangle, CircleAlert, Info } from 'lucide-react';
import { contarRiscos, type ItemDecisao } from '@/lib/agenteDecisao';

const RISCO = 'var(--agente-risk)';
const WARN = 'var(--agente-warn)';
const INK = 'var(--agente-ink)';
const INK2 = 'var(--agente-ink2)';
const INK3 = 'var(--agente-ink3)';
const LINHA = 'var(--agente-line, rgba(255,255,255,.10))';

const rotulo = (n: number, um: string, muitos: string) => `${n} ${n === 1 ? um : muitos}`;

export function AgentePainelDecisao({
  itens, avisos,
}: {
  itens: ItemDecisao[];
  avisos?: string[];
}) {
  if (itens.length === 0 && !avisos?.length) return null;

  const riscos = contarRiscos(itens);

  return (
    <div style={{ borderBottom: `1px solid ${LINHA}`, padding: '10px 14px 12px' }}>
      {itens.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{
              fontSize: 9.5, fontWeight: 700, letterSpacing: '.11em',
              textTransform: 'uppercase', color: INK3,
            }}>
              Exige decisão
            </span>
            <span style={{ fontSize: 10.5, color: riscos > 0 ? RISCO : WARN, fontWeight: 600 }}>
              {riscos > 0
                ? rotulo(riscos, 'risco', 'riscos')
                : rotulo(itens.length, 'ponto de atenção', 'pontos de atenção')}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {itens.map((item, i) => {
              const risco = item.severidade === 'risco';
              const Icone = risco ? AlertTriangle : CircleAlert;
              const cor = risco ? RISCO : WARN;
              return (
                <div key={`${item.alerta}-${i}`} style={{ display: 'flex', gap: 7 }}>
                  <Icone style={{ width: 13, height: 13, color: cor, flexShrink: 0, marginTop: 2 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: INK, lineHeight: 1.35 }}>
                      {item.alerta}
                      {item.valor && (
                        <span style={{ color: cor, fontWeight: 700 }}> · {item.valor}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: INK2, lineHeight: 1.45, marginTop: 1 }}>
                      {item.evidencia}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* O aviso de falha de carregamento fica DEPOIS dos alertas e com ícone
          próprio: ele não é um alerta de negócio, é a tela dizendo que um
          número dela pode estar errado. Confundir os dois seria pior que não
          mostrar nenhum. */}
      {!!avisos?.length && (
        <div
          role="alert"
          style={{
            marginTop: itens.length > 0 ? 10 : 0,
            display: 'flex', gap: 7, alignItems: 'flex-start',
          }}
        >
          <Info style={{ width: 13, height: 13, color: WARN, flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: WARN }}>
              Dados incompletos — números desta tela podem estar errados
            </div>
            <div style={{ fontSize: 11, color: INK2, lineHeight: 1.45, marginTop: 1 }}>
              {avisos.join(' · ')}. Atualize a página para tentar de novo.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AgentePainelDecisao;
