import type { ReactNode } from 'react';
import { Icon } from '@/components/icons/RoiIcons';
import { PASSOS } from '@/components/equipe/mapa/wizard-roi/constants';
import type { Passo } from '@/components/equipe/mapa/wizard-roi/types';

export function WizardHeader({ processoNome, passo }: { processoNome: string; passo: Passo }) {
  return (
    <div className="roi-config-header">
      <div><span className="roi-config-eyebrow">Configurar ROI · {processoNome}</span><h2>Diagnóstico e baseline do retorno do processo</h2></div>
      <div className="roi-config-meta"><span>Passo <strong>{passo}</strong> de <strong>{PASSOS.length}</strong></span><span>{PASSOS[passo - 1].label}</span></div>
    </div>
  );
}

export function WizardProgress({ progresso }: { progresso: number }) {
  const cls = progresso >= 100 ? '' : progresso >= 50 ? 'is-warn' : 'is-crit';
  return (
    <div className="roi-progress">
      <div className="roi-progress-head"><span className="roi-progress-label">Preenchimento de dados</span><span className="roi-progress-value">{progresso}%</span></div>
      <div className="roi-progress-track"><div className={`roi-progress-fill ${cls}`} style={{ width: `${progresso}%` }} /></div>
    </div>
  );
}

export function WizardStepper({ passo, irPara }: { passo: Passo; irPara: (passo: Passo) => void }) {
  return (
    <nav className="roi-stepper" aria-label="Passos do wizard">
      {PASSOS.map((item, index) => {
        const ativo = item.id === passo;
        const feito = item.id < passo;
        return (
          <div key={item.id} className={`roi-stepper-item${ativo ? ' is-active' : ''}${feito ? ' is-done' : ''}`}>
            <button type="button" className="roi-stepper-node" onClick={() => irPara(item.id)} aria-current={ativo ? 'step' : undefined} aria-label={`Ir para o passo ${item.id}: ${item.label}`}>
              <span className="roi-stepper-circle">{feito ? <Icon name="check" size={14} strokeWidth={2.4} /> : item.id}</span>
              <span className="roi-stepper-label">{item.label}</span>
            </button>
            {index < PASSOS.length - 1 && <span className="roi-stepper-line" />}
          </div>
        );
      })}
    </nav>
  );
}

export function WizardBody({ children }: { children: ReactNode }) {
  return <div className="roi-config-body">{children}</div>;
}

export function WizardFooter({ passo, irPara, salvando, visualizandoHistorico, podeCalcular, onSalvar }: { passo: Passo; irPara: (passo: Passo) => void; salvando: boolean; visualizandoHistorico: boolean; podeCalcular: boolean; onSalvar: () => void }) {
  return (
    <div className="roi-config-footer">
      <button type="button" className="btn-cancel" onClick={() => irPara(Math.max(1, passo - 1) as Passo)} disabled={passo === 1}><Icon name="chevronLeft" size={14} />Voltar</button>
      {passo < PASSOS.length ? (
        <button type="button" className="btn-save" onClick={() => irPara((passo + 1) as Passo)}>Próximo<Icon name="chevronRight" size={14} /></button>
      ) : (
        <button type="button" className="btn-save" onClick={onSalvar} disabled={salvando || visualizandoHistorico} title={visualizandoHistorico ? 'Volte para "Ao vivo" antes de salvar uma nova mensuração' : !podeCalcular ? 'Preencha os campos faltantes antes de salvar' : ''}>{salvando ? 'Salvando...' : 'Salvar mensuração'}</button>
      )}
    </div>
  );
}
