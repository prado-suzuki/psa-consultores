import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { BoardChip } from './BoardChip';
import {
  tituloLacuna,
  SEM_AREA_ID,
  type LinhaPreenchimentoArea,
  type FaixaEmpresaPreenchimento,
  type MetricaFaixaEmpresa,
} from '@/lib/preenchimentoSistema';

interface BoardPreenchimentoSistemaProps {
  /** Uma linha por área ATIVA do cadastro -- sempre vem de `estrutura_areas`. */
  areas: LinhaPreenchimentoArea[];
  /** Residual: projetos sem `estrutura_area_id`. `null` = nada a mostrar (ver `linhaSemArea`). */
  semArea: LinhaPreenchimentoArea | null;
  faixa: FaixaEmpresaPreenchimento;
  /** `estrutura_areas` falhou -- sem ela não há lista nenhuma pra mostrar. */
  falhaAreas: boolean;
  /** Rótulos das fontes que falharam (`listarFalhas`), para o banner do bloco. */
  falhas: string[];
}

const GRID_COLS = '1fr 76px 108px 96px 84px 84px 118px';

/** Vermelho quando há lacuna, cinza neutro quando zerado -- nunca verde "elogio". */
const corLacuna = (total: number | null) =>
  total === null ? 'var(--board-v4-ink3)' : total > 0 ? 'var(--board-v4-risk)' : 'var(--board-v4-ink3)';

/**
 * Uma célula de lacuna nomeável: número (ou alerta de falha), com tooltip
 * listando os nomes afetados -- "quais são os 18?" sem precisar clicar.
 */
const CelulaLacuna: React.FC<{ l: { total: number | null; nomes: string[] } }> = ({ l }) => {
  if (l.total === null) {
    return (
      <span
        style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--board-v4-risk)' }}
        title={tituloLacuna(l)}
      >
        <AlertTriangle style={{ width: 11, height: 11 }} />
        <span style={{ fontSize: 11 }}>—</span>
      </span>
    );
  }
  return (
    <span
      style={{ fontWeight: 600, fontSize: 12.5, color: corLacuna(l.total) }}
      title={tituloLacuna(l, 'Nenhum -- tudo cadastrado')}
    >
      {l.total}
    </span>
  );
};

const LinhaArea: React.FC<{ linha: LinhaPreenchimentoArea }> = ({ linha }) => {
  const semArea = linha.id === SEM_AREA_ID;
  return (
    <div
      style={{
        display: 'grid', gridTemplateColumns: GRID_COLS, alignItems: 'center', gap: 8,
        padding: '7px 0', borderBottom: '1px solid var(--board-v4-line2)', fontSize: 12,
      }}
    >
      <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {semArea
          ? <BoardChip variant="warn">{linha.label}</BoardChip>
          : <span style={{ color: 'var(--board-v4-ink)', fontWeight: 500 }}>{linha.label}</span>}
      </div>
      <div>
        {linha.projetos === null ? (
          <span
            style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--board-v4-risk)' }}
            title="Não foi possível medir -- a consulta de projetos falhou."
          >
            <AlertTriangle style={{ width: 11, height: 11 }} />
          </span>
        ) : (
          <span style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--board-v4-ink)' }}>{linha.projetos}</span>
        )}
      </div>
      <div><CelulaLacuna l={linha.semResponsavel} /></div>
      <div><CelulaLacuna l={linha.semEquipe} /></div>
      <div><CelulaLacuna l={linha.semData} /></div>
      <div><CelulaLacuna l={linha.semOs} /></div>
      <div>
        {semArea ? (
          <span style={{ color: 'var(--board-v4-ink3)', fontSize: 11 }}>não se aplica</span>
        ) : (
          <BoardChip variant={linha.centroCustoFaltando ? 'risk' : 'go'}>
            {linha.centroCustoFaltando ? 'FALTANDO' : 'cadastrado'}
          </BoardChip>
        )}
      </div>
    </div>
  );
};

/** Uma linha da faixa "empresa inteira": número absoluto sobre o total, sem nota ou score. */
const LinhaFaixaEmpresa: React.FC<{ label: string; efeito: string; m: MetricaFaixaEmpresa }> = ({ label, efeito, m }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '6px 0', flexWrap: 'wrap' }}>
    <div style={{ minWidth: 180, fontSize: 12, color: 'var(--board-v4-ink)', fontWeight: 500 }}>{label}</div>
    {m.comLacuna === null ? (
      <span
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--board-v4-risk)', fontSize: 12.5, fontWeight: 700 }}
        title="Não foi possível medir -- a consulta falhou."
      >
        <AlertTriangle style={{ width: 12, height: 12 }} /> não foi possível medir
      </span>
    ) : (
      <span
        style={{ fontSize: 13.5, fontWeight: 700, color: corLacuna(m.comLacuna) }}
        title={tituloLacuna(m, 'Nenhum -- tudo cadastrado')}
      >
        {m.comLacuna} de {m.total}
      </span>
    )}
    <span style={{ fontSize: 11, color: 'var(--board-v4-ink3)' }}>— {efeito}</span>
  </div>
);

/**
 * "Preenchimento do sistema" — o INVERSO dos outros blocos do Estratégico:
 * não mostra resultado de trabalho, mostra o que falta CADASTRAR, por área,
 * com nome e número, para o dono cobrar quem tem que alimentar o sistema.
 *
 * Nunca mostra `0` quando a consulta falhou (ver `preenchimentoSistema.ts`):
 * zero aqui é elogio indevido, ou uma cobrança injusta a uma área cuja
 * consulta só falhou. Toda contagem tem um `title` com os nomes afetados —
 * o dono pergunta "quais são os 18?" e a resposta já está na tela.
 */
export const BoardPreenchimentoSistema: React.FC<BoardPreenchimentoSistemaProps> = ({
  areas, semArea, faixa, falhaAreas, falhas,
}) => {
  const linhas = semArea ? [...areas, semArea] : areas;

  return (
    <div className="v4-card" data-reveal>
      <div className="v4-card-title" style={{ marginBottom: 4 }}>Preenchimento do sistema</div>
      <div style={{ fontSize: 11, color: 'var(--board-v4-ink3)', marginBottom: 12 }}>
        O que falta cadastrar, por área — não é entrega, é o que cobrar de quem alimenta o sistema.
      </div>

      {/* Mesmo padrão visual do banner de falha da tela (ver PerformanceDashboard):
          nunca deixar dado ausente virar número -- aqui, virar CÉLULA. */}
      {falhas.length > 0 && (
        <div
          role="alert"
          style={{
            marginBottom: 12, borderLeft: '3px solid var(--board-v4-risk)', display: 'flex', gap: 8,
            padding: '8px 10px', background: 'var(--board-v4-risk-t)', borderRadius: 6,
          }}
        >
          <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0, color: 'var(--board-v4-risk)', marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--board-v4-risk)' }}>
              Preenchimento incompleto — parte dos números abaixo não pôde ser medida
            </div>
            <div style={{ fontSize: 11, color: 'var(--board-v4-ink3)', marginTop: 2 }}>
              Falha ao carregar: {falhas.join(', ')}. As células afetadas mostram um alerta, nunca um zero.
            </div>
          </div>
        </div>
      )}

      {falhaAreas ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 0' }}>
          <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0, color: 'var(--board-v4-risk)', marginTop: 1 }} />
          <div style={{ fontSize: 12, color: 'var(--board-v4-risk)' }}>
            Não foi possível carregar as áreas do cadastro — a lista abaixo não pode ser mostrada.
          </div>
        </div>
      ) : linhas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--board-v4-ink3)', fontSize: 12 }}>
          Nenhuma área ativa cadastrada.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 640 }}>
            <div
              style={{
                display: 'grid', gridTemplateColumns: GRID_COLS, gap: 8, padding: '0 0 6px',
                fontSize: 10, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase',
                color: 'var(--board-v4-ink4)', borderBottom: '1px solid var(--board-v4-line2)',
              }}
            >
              <div>Área</div>
              <div>Projetos</div>
              <div>Sem resp.</div>
              <div>Sem equipe</div>
              <div>Sem data</div>
              <div>Sem OS</div>
              <div>Centro de custo</div>
            </div>
            {linhas.map((l) => <LinhaArea key={l.id} linha={l} />)}
          </div>
        </div>
      )}

      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--board-v4-line2)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--board-v4-ink4)', marginBottom: 6 }}>
          Empresa inteira — o que não é por área
        </div>
        <LinhaFaixaEmpresa
          label="OS sem data de início"
          efeito='é isso que aparece como "sem data" na tela Projetos'
          m={faixa.osSemDataInicio}
        />
        <LinhaFaixaEmpresa
          label="Clientes sem UF"
          efeito="é por isso que o mapa de calor de Clientes fica quase vazio"
          m={faixa.clientesSemUf}
        />
        <LinhaFaixaEmpresa
          label="Clientes sem categoria"
          efeito="afeta os cortes por categoria nos relatórios de Clientes"
          m={faixa.clientesSemCategoria}
        />
      </div>
    </div>
  );
};
