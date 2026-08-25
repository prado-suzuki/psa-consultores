import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { BoardChip } from './BoardChip';
import { BoardCard, BoardCardEmpty } from './ui/BoardCard';
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

/** Vermelho quando há lacuna, cinza neutro quando zerado -- nunca verde "elogio". */
const corLacuna = (total: number | null) =>
  total === null ? 'var(--bd-ink3)' : total > 0 ? 'var(--bd-risk-d)' : 'var(--bd-ink3)';

/**
 * Uma célula de lacuna nomeável: número (ou alerta de falha), com tooltip
 * listando os nomes afetados -- "quais são os 18?" sem precisar clicar.
 */
const CelulaLacuna: React.FC<{ l: { total: number | null; nomes: string[] } }> = ({ l }) => {
  if (l.total === null) {
    return (
      <span
        style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--bd-risk)' }}
        title={tituloLacuna(l)}
      >
        <AlertTriangle style={{ width: 12, height: 12 }} />
        <span style={{ fontSize: 11 }}>—</span>
      </span>
    );
  }
  return (
    <span
      style={{ fontWeight: 600, color: corLacuna(l.total) }}
      title={tituloLacuna(l, 'Nenhum -- tudo cadastrado')}
    >
      {l.total}
    </span>
  );
};

const LinhaArea: React.FC<{ linha: LinhaPreenchimentoArea }> = ({ linha }) => {
  const semArea = linha.id === SEM_AREA_ID;
  return (
    <tr>
      <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {semArea
          ? <BoardChip variant="warn">{linha.label}</BoardChip>
          : linha.label}
      </td>
      <td className="num">
        {linha.projetos === null ? (
          <span
            style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--bd-risk)' }}
            title="Não foi possível medir -- a consulta de projetos falhou."
          >
            <AlertTriangle style={{ width: 12, height: 12 }} />
          </span>
        ) : (
          <span style={{ fontWeight: 600, color: 'var(--bd-ink)' }}>{linha.projetos}</span>
        )}
      </td>
      <td className="num"><CelulaLacuna l={linha.semResponsavel} /></td>
      <td className="num"><CelulaLacuna l={linha.semEquipe} /></td>
      <td className="num"><CelulaLacuna l={linha.semData} /></td>
      <td className="num"><CelulaLacuna l={linha.semOs} /></td>
      <td>
        {semArea ? (
          <span style={{ color: 'var(--bd-ink3)', fontSize: 11 }}>não se aplica</span>
        ) : (
          <BoardChip variant={linha.centroCustoFaltando ? 'risk' : 'go'}>
            {linha.centroCustoFaltando ? 'FALTANDO' : 'cadastrado'}
          </BoardChip>
        )}
      </td>
    </tr>
  );
};

/** Uma linha da faixa "empresa inteira": número absoluto sobre o total, sem nota ou score. */
const LinhaFaixaEmpresa: React.FC<{ label: string; efeito: string; m: MetricaFaixaEmpresa }> = ({ label, efeito, m }) => (
  <div className="v4-mrow" style={{ flexWrap: 'wrap' }}>
    <div style={{ minWidth: 186, fontSize: 12, color: 'var(--bd-ink)', fontWeight: 500 }}>{label}</div>
    {m.comLacuna === null ? (
      <span
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--bd-risk-d)', fontSize: 12.5, fontWeight: 700 }}
        title="Não foi possível medir -- a consulta falhou."
      >
        <AlertTriangle style={{ width: 13, height: 13 }} /> não foi possível medir
      </span>
    ) : (
      <span
        style={{ fontSize: 13.5, fontWeight: 700, color: corLacuna(m.comLacuna), fontVariantNumeric: 'tabular-nums' }}
        title={tituloLacuna(m, 'Nenhum -- tudo cadastrado')}
      >
        {m.comLacuna} de {m.total}
      </span>
    )}
    <span style={{ fontSize: 11, color: 'var(--bd-ink3)', flex: 1, minWidth: 160 }}>— {efeito}</span>
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
 *
 * ── Grade → tabela ───────────────────────────────────────────────────
 * As linhas eram `display: grid` com sete larguras cravadas numa constante
 * (`GRID_COLS`), e o cabeçalho era outro grid com as MESMAS sete larguras
 * repetidas — desalinhar era questão de tempo. Virou `<table className="v4-tbl">`:
 * a largura passa a ser problema do navegador, o cabeçalho gruda na rolagem e
 * o leitor de tela finalmente anuncia "coluna Sem responsável".
 */
export const BoardPreenchimentoSistema: React.FC<BoardPreenchimentoSistemaProps> = ({
  areas, semArea, faixa, falhaAreas, falhas,
}) => {
  const linhas = semArea ? [...areas, semArea] : areas;

  return (
    <BoardCard
      title="Preenchimento do sistema"
      subtitle="O que falta cadastrar, por área — não é entrega, é o que cobrar de quem alimenta o sistema."
    >
      {/* Mesmo padrão visual do banner de falha da tela (ver PerformanceDashboard):
          nunca deixar dado ausente virar número -- aqui, virar CÉLULA. */}
      {falhas.length > 0 && (
        <div role="alert" className="v4-alert v4-alert-r" style={{ marginBottom: 14 }}>
          <AlertTriangle style={{ width: 15, height: 15, flexShrink: 0, color: 'var(--bd-risk)', marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--bd-risk-d)' }}>
              Preenchimento incompleto — parte dos números abaixo não pôde ser medida
            </div>
            <div style={{ fontSize: 11, color: 'var(--bd-ink2)', marginTop: 2 }}>
              Falha ao carregar: {falhas.join(', ')}. As células afetadas mostram um alerta, nunca um zero.
            </div>
          </div>
        </div>
      )}

      {falhaAreas ? (
        <div className="v4-alert v4-alert-r">
          <AlertTriangle style={{ width: 15, height: 15, flexShrink: 0, color: 'var(--bd-risk)', marginTop: 1 }} />
          <div style={{ fontSize: 12, color: 'var(--bd-risk-d)' }}>
            Não foi possível carregar as áreas do cadastro — a lista abaixo não pode ser mostrada.
          </div>
        </div>
      ) : linhas.length === 0 ? (
        <BoardCardEmpty>Nenhuma área ativa cadastrada.</BoardCardEmpty>
      ) : (
        <div className="v4-tbl-wrap">
          <table className="v4-tbl" style={{ minWidth: 660 }}>
            <thead>
              <tr>
                <th>Área</th>
                <th className="num">Projetos</th>
                <th className="num">Sem resp.</th>
                <th className="num">Sem equipe</th>
                <th className="num">Sem data</th>
                <th className="num">Sem OS</th>
                <th>Centro de custo</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => <LinhaArea key={l.id} linha={l} />)}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--bd-line2)' }}>
        <div className="v4-slabel">Empresa inteira — o que não é por área</div>
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
    </BoardCard>
  );
};
