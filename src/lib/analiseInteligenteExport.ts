import logoPsa from '@/assets/logo-psa-dark.png';
import type { AnaliseInteligenteAnalysis, AnaliseInteligenteKpis } from '@/lib/analiseInteligente';

export async function loadAnaliseInteligenteLogo(onLoad: (dataUrl: string) => void): Promise<void> {
  const response = await fetch(logoPsa);
  const blob = await response.blob();
  const reader = new FileReader();
  reader.onloadend = () => onLoad(reader.result as string);
  reader.readAsDataURL(blob);
}

interface ExportAnaliseInteligenteInput {
  analise: AnaliseInteligenteAnalysis | null;
  kpis: AnaliseInteligenteKpis;
  logoBase64: string;
  startDate: string;
  endDate: string;
  scoreBg: string;
}

export function exportAnaliseInteligentePdf({
  analise,
  kpis,
  logoBase64,
  startDate,
  endDate,
  scoreBg,
}: ExportAnaliseInteligenteInput): boolean {
  const popup = window.open('', '_blank');
  if (!popup) return false;

  const nivelRiscoColor =
    analise?.nivel_risco === 'baixo'
      ? '#10b981'
      : analise?.nivel_risco === 'medio'
        ? '#f59e0b'
        : '#ef4444';
  const periodo = `${startDate || 'Início'} a ${endDate || 'Hoje'}`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Análise Inteligente — Sprints & Dailys</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #1e293b; background: white; font-size: 10px; line-height: 1.4; padding: 8px; }
  .page { max-width: 100%; }
  .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 3px solid #0d9488; margin-bottom: 10px; }
  .header h1 { font-size: 18px; color: #0d9488; font-weight: 700; }
  .header .subtitle { font-size: 10px; color: #64748b; margin-top: 2px; }
  .header .logo { height: 40px; }
  .grid-kpi { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; margin-bottom: 10px; }
  .kpi { border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; background: #f8fafc; }
  .kpi-label { font-size: 8px; color: #64748b; text-transform: uppercase; letter-spacing: 0.3px; }
  .kpi-value { font-size: 14px; font-weight: 700; color: #0d9488; margin-top: 2px; }
  .kpi-sub { font-size: 8px; color: #94a3b8; }
  .section { margin-bottom: 8px; }
  .section-title { font-size: 11px; font-weight: 600; color: #0d9488; margin-bottom: 4px; padding-bottom: 2px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 4px; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .three-col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
  .card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; background: white; }
  .card-title { font-size: 9px; font-weight: 600; color: #334155; margin-bottom: 3px; }
  .card-text { font-size: 9px; color: #475569; line-height: 1.45; }
  .list { list-style: none; }
  .list li { padding: 2px 0; font-size: 9px; color: #475569; padding-left: 10px; position: relative; }
  .list li:before { content: '•'; color: #0d9488; position: absolute; left: 2px; font-weight: bold; }
  .risk-badge { display: inline-block; padding: 2px 6px; border-radius: 8px; font-size: 8px; font-weight: 600; text-transform: uppercase; color: white; background: ${nivelRiscoColor}; }
  .score-big { font-size: 28px; font-weight: 700; color: ${scoreBg}; }
  .score-bar { height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; margin-top: 4px; }
  .score-fill { height: 100%; width: ${kpis.score}%; background: ${scoreBg}; }
  .footer { margin-top: 10px; padding-top: 6px; border-top: 1px solid #e2e8f0; font-size: 7px; color: #94a3b8; text-align: center; }
  .sintese { padding: 8px; background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%); border-left: 3px solid #0d9488; border-radius: 4px; font-size: 9.5px; color: #0f766e; font-weight: 500; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <h1>Análise Inteligente — Sprints & Dailys</h1>
      <div class="subtitle">PSA Consultores · Digital Rotina · Período: ${periodo}</div>
    </div>
    ${logoBase64 ? `<img src="${logoBase64}" class="logo" alt="PSA" />` : ''}
  </div>

  <div class="grid-kpi">
    <div class="kpi"><div class="kpi-label">Score Saúde</div><div class="kpi-value" style="color:${scoreBg}">${kpis.score}/100</div><div class="kpi-sub">Sprint + Projeto</div></div>
    <div class="kpi"><div class="kpi-label">Taxa Entrega</div><div class="kpi-value">${kpis.rate}%</div><div class="kpi-sub">${kpis.completed}/${kpis.totalDel} entregues</div></div>
    <div class="kpi"><div class="kpi-label">Atrasados</div><div class="kpi-value" style="color:#ef4444">${kpis.overdue}</div><div class="kpi-sub">Itens vencidos</div></div>
    <div class="kpi"><div class="kpi-label">Bloqueios</div><div class="kpi-value" style="color:#f59e0b">${kpis.blockers}</div><div class="kpi-sub">Em ${kpis.totalDailys} dailys</div></div>
    <div class="kpi"><div class="kpi-label">Scope Creep</div><div class="kpi-value">${kpis.scopeCreep}</div><div class="kpi-sub">Itens fora do escopo inicial</div></div>
    <div class="kpi"><div class="kpi-label">Gasto Extra</div><div class="kpi-value" style="color:#ef4444">R$ ${kpis.extraCost.toLocaleString('pt-BR')}</div><div class="kpi-sub">Estimado</div></div>
  </div>

  ${
    analise
      ? `
  <div class="section">
    <div class="sintese"><strong>Síntese Executiva:</strong> ${analise.sintese_executiva}</div>
  </div>

  <div class="section">
    <div class="three-col">
      <div class="card">
        <div class="card-title">📈 Evolução das Entregas</div>
        <div class="card-text">${analise.evolucao_entregas}</div>
      </div>
      <div class="card">
        <div class="card-title">⏱️ Tempo vs Resultado</div>
        <div class="card-text">${analise.tempo_vs_resultado}</div>
      </div>
      <div class="card">
        <div class="card-title">💚 Saudabilidade</div>
        <div class="card-text">${analise.saudabilidade_sprint}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="two-col">
      <div class="card">
        <div class="card-title">🎯 Aderência ao Escopo</div>
        <div class="card-text">${analise.aderencia_escopo}</div>
      </div>
      <div class="card">
        <div class="card-title">💸 Gastos Extras</div>
        <div class="card-text">${analise.gastos_extras}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="three-col">
      <div class="card">
        <div class="card-title" style="color:#ef4444">⚠️ Riscos <span class="risk-badge">${analise.nivel_risco}</span></div>
        <ul class="list">${analise.riscos
          .slice(0, 4)
          .map((risk) => `<li>${risk}</li>`)
          .join('')}</ul>
      </div>
      <div class="card">
        <div class="card-title" style="color:#f59e0b">💡 Oportunidades</div>
        <ul class="list">${analise.oportunidades
          .slice(0, 4)
          .map((opportunity) => `<li>${opportunity}</li>`)
          .join('')}</ul>
      </div>
      <div class="card">
        <div class="card-title" style="color:#0d9488">✅ Recomendações</div>
        <ul class="list">${analise.recomendacoes
          .slice(0, 5)
          .map((recommendation) => `<li>${recommendation}</li>`)
          .join('')}</ul>
      </div>
    </div>
  </div>
  `
      : `<div class="section"><div class="card"><div class="card-text" style="text-align:center;color:#94a3b8;padding:10px">Clique em "Gerar Análise IA" no dashboard para incluir a análise estratégica neste relatório.</div></div></div>`
  }

  <div class="footer">
    Gerado em ${new Date().toLocaleString('pt-BR')} · PSA Consultores · Digital Rotina · Análise alimentada por Claude AI
  </div>
</div>
<script>window.onload = () => setTimeout(() => window.print(), 300);</script>
</body>
</html>`;

  popup.document.write(html);
  popup.document.close();
  return true;
}
