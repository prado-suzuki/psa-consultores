import React from 'react';
import { BoardCard } from './ui/BoardCard';
import type { MixProjetosAtivos } from '@/lib/boardDiretoria';

interface BoardMixProjetosProps {
  mix: MixProjetosAtivos;
  janelaLabel: string;
  onFechar: () => void;
}

const Linha: React.FC<{
  rotulo: string;
  valor: number | null;
  motivo?: string;
  destaque?: boolean;
}> = ({ rotulo, valor, motivo, destaque }) => (
  <div style={{
    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
    gap: 16, padding: '9px 0', borderBottom: '1px solid var(--bd-line2)',
  }}>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 12.5, color: 'var(--bd-ink)' }}>{rotulo}</div>
      {motivo && <div style={{ fontSize: 10.5, color: 'var(--bd-ink3)', marginTop: 2 }}>{motivo}</div>}
    </div>
    <div style={{
      fontFamily: "'Instrument Sans', sans-serif", fontSize: 20, fontWeight: 700,
      letterSpacing: '-.03em', fontVariantNumeric: 'tabular-nums',
      color: valor === null ? 'var(--bd-ink3)' : destaque ? 'var(--bd-accent)' : 'var(--bd-ink)',
    }}>
      {valor ?? '—'}
    </div>
  </div>
);

/**
 * O MIX por trás de "projetos ativos" — a resposta para "mais projeto é bom?".
 *
 * Não é: só é bom quando é CLIENTE NOVO (carteira crescendo) ou ADITIVO de
 * contrato existente (cliente comprando mais). Entrega já planejada/paga é
 * trabalho que a casa já vendeu — entra na contagem de projeto e não entra na
 * conta de crescimento, e é exatamente aí que o número solto engana.
 *
 * Só aparece ao clicar no cartão da faixa: é detalhamento, não bloco fixo, e
 * a grade da diretoria não comporta um card a mais em repouso.
 */
export const BoardMixProjetos: React.FC<BoardMixProjetosProps> = ({ mix, janelaLabel, onFechar }) => (
  <BoardCard
    title="Mix dos projetos iniciados"
    subtitle={`${mix.iniciadosJanela} projetos · ${janelaLabel}`}
    actions={
      <button
        type="button"
        onClick={onFechar}
        style={{
          fontSize: 11, color: 'var(--bd-ink3)', background: 'transparent',
          border: '1px solid var(--bd-line2)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
        }}
      >
        fechar
      </button>
    }
    note={`Classificação pela primeira OS do cliente no cadastro. ${mix.motivos.planejadaPaga}.`}
  >
    <Linha rotulo="Cliente novo" valor={mix.clienteNovo} destaque motivo="primeira OS do cliente no cadastro" />
    <Linha rotulo="Aditivo de contrato existente" valor={mix.aditivo} motivo="cliente que já tinha OS anterior" />
    <Linha
      rotulo="Entrega já planejada/paga"
      valor={mix.planejadaPaga}
      motivo={mix.motivos.planejadaPaga}
    />
    <Linha
      rotulo="Ativos sem classificação"
      valor={mix.semClassificacao}
      motivo={mix.motivos.semClassificacao}
    />
  </BoardCard>
);
