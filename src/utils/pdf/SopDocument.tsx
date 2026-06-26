// SOP simples — Cenário Atual (As-Is) OU Cenário Otimizado (To-Be).
// Renderiza em React-PDF a partir do modelo PURO `buildSopModel` — a MESMA
// fonte de texto/valores usada pelo Markdown (sopMarkdown) e pelo script de
// extração. Assim PDF e MD ficam idênticos por construção.
//
// Estrutura: Capa · Identificação · Etapas · Sistemas · Documentos ·
// Responsáveis · Gargalos (As-Is) / Melhorias (To-Be).

import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import type {
  Processo, Projeto, Etapa, Documento, Sistema, Responsavel, Gargalo, Melhoria,
} from '@/types';
import logoPsaWhite from '@/assets/logo-psa.png';
import { styles, PDF_COLORS } from './theme';
import { pad2 } from './helpers';
import { buildSopModel, type SOPMode } from './sopModel';

export type { SOPMode };

export interface SopDocumentProps {
  processo: Processo;
  etapas: Etapa[];
  documentos: Documento[];
  sistemas: Sistema[];
  responsaveis: Responsavel[];
  gargalos: Gargalo[];
  melhorias?: Melhoria[];
  /** Projeto do processo — usado na capa (nome + cluster). Opcional. */
  projeto?: Projeto | null;
  mode: SOPMode;
}

function PageHeader({ titulo, scenarioLabel }: { titulo: string; scenarioLabel: string }) {
  return (
    <View style={styles.pageHeader} fixed>
      <View>
        <Text style={styles.pageHeaderTitle}>{titulo}</Text>
        <Text style={styles.pageHeaderSub}>{scenarioLabel}</Text>
      </View>
      <Text style={styles.pageHeaderSub}>PSA Consultores · MAPA</Text>
    </View>
  );
}

function PageFooter() {
  return (
    <View style={styles.pageFooter} fixed>
      <Text>PSA Consultores</Text>
      <Text
        render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
      />
    </View>
  );
}

function SectionHeader({ num, title }: { num: number; title: string }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionNum}>{pad2(num)}</Text>
      <Text style={styles.sectionName}>{title}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={[styles.row, { marginBottom: 3 }]}>
      <Text style={[styles.small, styles.muted, { width: 110 }]}>{label}</Text>
      <Text style={[styles.small, { flex: 1 }]}>{value || '—'}</Text>
    </View>
  );
}

export function SopDocument(props: SopDocumentProps) {
  const m = buildSopModel(props);
  const { identificacao: id } = m;
  let sectionNum = 0;
  const nextNum = () => ++sectionNum;
  const projetoLinha = [m.projetoNome, m.clusterNome].filter(Boolean).join('   ·   ');

  return (
    <Document title={`SOP - ${id.nome}`} author="PSA Consultores">
      {/* CAPA */}
      <Page size="A4" style={styles.coverPage}>
        <Image src={logoPsaWhite} style={styles.coverLogo} />
        <View style={styles.coverCenter}>
          <Text style={styles.coverEyebrow}>SOP · PROCEDIMENTO OPERACIONAL</Text>
          <Text style={styles.coverTitle}>{id.nome}</Text>
          <Text style={styles.coverSub}>{m.scenarioLabel}</Text>
          {!!projetoLinha && <Text style={styles.coverProject}>{projetoLinha}</Text>}
        </View>
        <Text style={styles.coverMeta}>Emissão · {m.data}</Text>
      </Page>

      {/* CONTEÚDO */}
      <Page size="A4" style={styles.page}>
        <PageHeader titulo={id.nome} scenarioLabel={m.scenarioLabel} />

        {/* Identificação — ficha */}
        <View style={styles.section}>
          <SectionHeader num={nextNum()} title="Identificação" />
          {(!!id.frequencia || !!id.complexidade) && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
              {!!id.frequencia && <Text style={styles.chip}>Frequência · {id.frequencia}</Text>}
              {!!id.complexidade && <Text style={styles.chip}>Complexidade · {id.complexidade}</Text>}
            </View>
          )}
          {!!id.descricao && (
            <View style={{ marginBottom: 6 }}>
              <Text style={[styles.small, styles.muted, { marginBottom: 1 }]}>Descrição</Text>
              <Text style={[styles.small, { lineHeight: 1.4 }]}>{id.descricao}</Text>
            </View>
          )}
          {!!id.entregavel && (
            <View>
              <Text style={[styles.small, styles.muted, { marginBottom: 1 }]}>Entregável</Text>
              <Text style={[styles.small, { lineHeight: 1.4 }]}>{id.entregavel}</Text>
            </View>
          )}
        </View>

        {/* Etapas */}
        <View style={styles.section}>
          <SectionHeader num={nextNum()} title={`Etapas (${m.etapas.length})`} />
          {m.etapas.length === 0 && (
            <Text style={[styles.small, styles.muted]}>Nenhuma etapa cadastrada.</Text>
          )}
          {m.etapas.map((e, i) => (
            <View key={i} style={styles.card} wrap={false}>
              <Text style={styles.cardTitle}>{e.ordem}. {e.nome}</Text>
              {!!e.descricao && (
                <Text style={[styles.small, { marginBottom: 4 }]}>{e.descricao}</Text>
              )}
              <InfoRow label="Execução" value={e.execucao} />
              <InfoRow label="Executado por" value={e.executadoPor} />
              <InfoRow label="Sistemas" value={e.sistemas} />
              <InfoRow label="Docs entrada" value={e.docsEntrada} />
              <InfoRow label="Docs saída" value={e.docsSaida} />
              <InfoRow label="Taxa retrabalho" value={e.taxaRetrabalho} />
              {e.gargalos.length > 0 && (
                <View style={{ marginTop: 4 }}>
                  <Text style={[styles.small, styles.muted, { marginBottom: 1 }]}>Gargalos desta etapa</Text>
                  {e.gargalos.map((g, gi) => (
                    <Text key={gi} style={styles.small}>
                      • {g.nome}{g.descricao ? ` — ${g.descricao}` : ''}{g.origem ? ` (${g.origem})` : ''}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Sistemas */}
        {m.sistemas.length > 0 && (
          <View style={styles.section}>
            <SectionHeader num={nextNum()} title="Sistemas" />
            <View style={styles.table}>
              <View style={styles.trHeader}>
                <Text style={[styles.th, { width: '40%' }]}>Sistema</Text>
                <Text style={[styles.th, { flex: 1 }]}>Descrição</Text>
              </View>
              {m.sistemas.map((s, i) => (
                <View key={i} style={styles.tr}>
                  <Text style={[styles.td, { width: '40%' }]}>{s.nome}</Text>
                  <Text style={[styles.td, { flex: 1 }]}>{s.descricao}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Documentos entrada */}
        {m.docsEntrada.length > 0 && (
          <View style={styles.section}>
            <SectionHeader num={nextNum()} title="Documentos · Entrada" />
            <View style={styles.table}>
              <View style={styles.trHeader}>
                <Text style={[styles.th, { width: '40%' }]}>Nome</Text>
                <Text style={[styles.th, { width: '20%' }]}>Tipo</Text>
                <Text style={[styles.th, { flex: 1 }]}>Origem</Text>
              </View>
              {m.docsEntrada.map((d, i) => (
                <View key={i} style={styles.tr}>
                  <Text style={[styles.td, { width: '40%' }]}>{d.nome}</Text>
                  <Text style={[styles.td, { width: '20%' }]}>{d.tipo}</Text>
                  <Text style={[styles.td, { flex: 1 }]}>{d.origem}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Documentos saída */}
        {m.docsSaida.length > 0 && (
          <View style={styles.section}>
            <SectionHeader num={nextNum()} title="Documentos · Saída" />
            <View style={styles.table}>
              <View style={styles.trHeader}>
                <Text style={[styles.th, { width: '40%' }]}>Nome</Text>
                <Text style={[styles.th, { width: '20%' }]}>Tipo</Text>
                <Text style={[styles.th, { flex: 1 }]}>Origem</Text>
              </View>
              {m.docsSaida.map((d, i) => (
                <View key={i} style={styles.tr}>
                  <Text style={[styles.td, { width: '40%' }]}>{d.nome}</Text>
                  <Text style={[styles.td, { width: '20%' }]}>{d.tipo}</Text>
                  <Text style={[styles.td, { flex: 1 }]}>{d.origem}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Responsáveis */}
        {m.responsaveis.length > 0 && (
          <View style={styles.section}>
            <SectionHeader num={nextNum()} title="Responsáveis" />
            <View style={styles.table}>
              <View style={styles.trHeader}>
                <Text style={[styles.th, { width: '40%' }]}>Nome</Text>
                <Text style={[styles.th, { width: '30%' }]}>Cargo</Text>
                <Text style={[styles.th, { flex: 1 }]}>Custo/hora</Text>
              </View>
              {m.responsaveis.map((r, i) => (
                <View key={i} style={styles.tr}>
                  <Text style={[styles.td, { width: '40%' }]}>{r.nome}</Text>
                  <Text style={[styles.td, { width: '30%' }]}>{r.cargo}</Text>
                  <Text style={[styles.td, { flex: 1 }]}>{r.custoHora}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Gargalos do processo (As-Is) — mesma fonte do diagrama. */}
        {!m.isFicou && m.gargalos.length > 0 && (
          <View style={styles.section}>
            <SectionHeader num={nextNum()} title={`Gargalos identificados (${m.gargalos.length})`} />
            {m.gargalos.map((g, i) => (
              <View key={i} wrap={false} style={[styles.card, { borderLeftWidth: 3, borderLeftColor: PDF_COLORS.warning }]}>
                <Text style={styles.cardTitle}>{g.nome}</Text>
                {!!g.descricao && <Text style={[styles.small, { marginBottom: 2 }]}>{g.descricao}</Text>}
                {!!g.origem && <Text style={[styles.small, styles.muted]}>Origem: {g.origem}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* No To-Be, listamos as melhorias projetadas. */}
        {m.isFicou && m.melhorias.length > 0 && (
          <View style={styles.section}>
            <SectionHeader num={nextNum()} title={`Melhorias projetadas (${m.melhorias.length})`} />
            {m.melhorias.map((mel, i) => (
              <View key={i} wrap={false} style={[styles.card, { borderLeftWidth: 3, borderLeftColor: PDF_COLORS.accentSoft }]}>
                <Text style={styles.cardTitle}>{mel.titulo}</Text>
                {!!mel.status && <Text style={[styles.small, styles.muted]}>Status: {mel.status}</Text>}
                {!!mel.acoes && <Text style={[styles.small, styles.muted]}>Ações: {mel.acoes}</Text>}
              </View>
            ))}
          </View>
        )}

        <PageFooter />
      </Page>
    </Document>
  );
}
