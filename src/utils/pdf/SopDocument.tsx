// SOP simples — Cenário Atual (As-Is) OU Cenário Otimizado (To-Be).
// Substitui o gerador legado em sopGenerator.ts (html2canvas + jsPDF) por
// React-PDF. Estrutura:
//   - Capa
//   - Identificação do processo
//   - Etapas (uma seção por etapa)
//   - Sistemas, Documentos, Responsáveis, Gargalos, Melhorias (quando aplicável)

import { Document, Page, Text, View } from '@react-pdf/renderer';
import type {
  Processo, Etapa, Documento, Sistema, Responsavel, Gargalo, Melhoria,
} from '@/types';
import { styles, PDF_COLORS } from './theme';
import { fmtPercent, joinDocs, joinPeople, todayBR, pad2 } from './helpers';

export type SOPMode = 'era' | 'ficou';

export interface SopDocumentProps {
  processo: Processo;
  etapas: Etapa[];
  documentos: Documento[];
  sistemas: Sistema[];
  responsaveis: Responsavel[];
  gargalos: Gargalo[];
  melhorias?: Melhoria[];
  mode: SOPMode;
}

function PageHeader({ processo, scenarioLabel }: { processo: Processo; scenarioLabel: string }) {
  return (
    <View style={styles.pageHeader} fixed>
      <View>
        <Text style={styles.pageHeaderTitle}>{processo.nome}</Text>
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
  const { processo, etapas, documentos, sistemas, responsaveis, gargalos, melhorias = [], mode } = props;
  const isFicou = mode === 'ficou';
  const scenarioLabel = isFicou ? 'Cenário Otimizado · As-If' : 'Cenário Atual · As-Is';
  const data = todayBR();

  // Cross-cuts — replicar lógica do sopHtmlTemplate em forma funcional simples
  const gargalosDoProcesso = gargalos.filter(g => (g.processos || []).includes(processo.id));
  const melhoriaIdsViaGargalos = new Set(
    gargalosDoProcesso.filter(g => g.melhoriaId).map(g => g.melhoriaId as string),
  );
  const procMelhorias = isFicou
    ? melhorias.filter(m =>
        (m.processos || []).includes(processo.id) ||
        melhoriaIdsViaGargalos.has(m.id),
      )
    : [];

  // Sistemas/documentos do cenário
  const sisOf = (e: Etapa) => ((isFicou ? (e.ficou?.sistemas ?? e.sistemas) : e.sistemas) || []);
  const docsEntOf = (e: Etapa) => ((isFicou ? (e.ficou?.docsEntrada ?? e.docsEntrada) : e.docsEntrada) || []);
  const docsSaiOf = (e: Etapa) => ((isFicou ? (e.ficou?.docsSaida ?? e.docsSaida) : e.docsSaida) || []);

  const docEntradaNames = new Set<string>();
  etapas.forEach(e =>
    docsEntOf(e).forEach(d => docEntradaNames.add(typeof d === 'string' ? d : d.nome)),
  );
  const docsEntrada = documentos.filter(d => docEntradaNames.has(d.nome));

  const docSaidaNames = new Set<string>();
  etapas.forEach(e =>
    docsSaiOf(e).forEach(d => docSaidaNames.add(typeof d === 'string' ? d : d.nome)),
  );
  const docsSaida = documentos.filter(d => docSaidaNames.has(d.nome));

  const sisKeys = new Set<string>();
  etapas.forEach(e => sisOf(e).forEach(s => sisKeys.add(s)));
  const sisList = sistemas.filter(s => sisKeys.has(s.id) || sisKeys.has(s.nome));

  const respNames = new Set<string>();
  etapas.forEach(e => {
    const exec = (isFicou ? (e.ficou?.executadoPor ?? e.executadoPor) : e.executadoPor) || [];
    exec.forEach(r => r.nome && respNames.add(r.nome));
  });
  const respList = responsaveis.filter(r => respNames.has(r.nome));

  let sectionNum = 0;
  const nextNum = () => ++sectionNum;

  return (
    <Document title={`SOP - ${processo.nome}`} author="PSA Consultores">
      {/* CAPA */}
      <Page size="A4" style={styles.coverPage}>
        <Text style={styles.coverEyebrow}>SOP · PROCEDIMENTO OPERACIONAL</Text>
        <Text style={styles.coverTitle}>{processo.nome}</Text>
        <Text style={styles.coverSub}>{scenarioLabel}</Text>
        <Text style={styles.coverMeta}>Emissão · {data}</Text>
      </Page>

      {/* CONTEÚDO */}
      <Page size="A4" style={styles.page}>
        <PageHeader processo={processo} scenarioLabel={scenarioLabel} />

        {/* Identificação */}
        <View style={styles.section}>
          <SectionHeader num={nextNum()} title="Identificação" />
          <InfoRow label="Nome" value={processo.nome} />
          <InfoRow label="Descrição" value={processo.descricao || ''} />
          <InfoRow label="Entregável" value={processo.entregavel || ''} />
          <InfoRow label="Frequência" value={processo.frequencia || ''} />
          <InfoRow label="Complexidade" value={processo.complexidade || ''} />
        </View>

        {/* Etapas */}
        <View style={styles.section}>
          <SectionHeader num={nextNum()} title={`Etapas (${etapas.length})`} />
          {etapas.length === 0 && (
            <Text style={[styles.small, styles.muted]}>Nenhuma etapa cadastrada.</Text>
          )}
          {etapas.map((e, i) => {
            const f = isFicou ? e.ficou : null;
            const descricao = (isFicou ? (f?.descricao ?? e.descricao) : e.descricao) || '';
            const execucao = (isFicou ? (f?.execucao ?? e.execucao) : e.execucao) || '';
            const exec = (isFicou ? (f?.executadoPor ?? e.executadoPor) : e.executadoPor) || [];
            const sisEtapa = sisOf(e);
            const docsE = docsEntOf(e);
            const docsS = docsSaiOf(e);
            const taxa = (isFicou ? (f?.taxaRetrabalho ?? e.taxaRetrabalho) : e.taxaRetrabalho) ?? 0;
            return (
              <View key={e.id} style={styles.card} wrap={false}>
                <Text style={styles.cardTitle}>{i + 1}. {e.nome}</Text>
                {!!descricao && (
                  <Text style={[styles.small, { marginBottom: 4 }]}>{descricao}</Text>
                )}
                <InfoRow label="Execução" value={execucao} />
                <InfoRow label="Executado por" value={joinPeople(exec)} />
                <InfoRow label="Sistemas" value={sisEtapa.map(s => sistemas.find(x => x.id === s || x.nome === s)?.nome ?? s).join(' · ') || '—'} />
                <InfoRow label="Docs entrada" value={joinDocs(docsE)} />
                <InfoRow label="Docs saída" value={joinDocs(docsS)} />
                <InfoRow label="Taxa retrabalho" value={fmtPercent(taxa)} />
              </View>
            );
          })}
        </View>

        {/* Sistemas */}
        {sisList.length > 0 && (
          <View style={styles.section} wrap={false}>
            <SectionHeader num={nextNum()} title="Sistemas" />
            <View style={styles.table}>
              <View style={styles.trHeader}>
                <Text style={[styles.th, { width: '40%' }]}>Sistema</Text>
                <Text style={[styles.th, { flex: 1 }]}>Descrição</Text>
              </View>
              {sisList.map(s => (
                <View key={s.id} style={styles.tr}>
                  <Text style={[styles.td, { width: '40%' }]}>{s.nome}</Text>
                  <Text style={[styles.td, { flex: 1 }]}>{s.descricao || '—'}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Documentos entrada */}
        {docsEntrada.length > 0 && (
          <View style={styles.section} wrap={false}>
            <SectionHeader num={nextNum()} title="Documentos · Entrada" />
            <View style={styles.table}>
              <View style={styles.trHeader}>
                <Text style={[styles.th, { width: '40%' }]}>Nome</Text>
                <Text style={[styles.th, { width: '20%' }]}>Tipo</Text>
                <Text style={[styles.th, { flex: 1 }]}>Origem</Text>
              </View>
              {docsEntrada.map(d => (
                <View key={d.id} style={styles.tr}>
                  <Text style={[styles.td, { width: '40%' }]}>{d.nome}</Text>
                  <Text style={[styles.td, { width: '20%' }]}>{d.tipo || '—'}</Text>
                  <Text style={[styles.td, { flex: 1 }]}>{d.origem || '—'}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Documentos saída */}
        {docsSaida.length > 0 && (
          <View style={styles.section} wrap={false}>
            <SectionHeader num={nextNum()} title="Documentos · Saída" />
            <View style={styles.table}>
              <View style={styles.trHeader}>
                <Text style={[styles.th, { width: '40%' }]}>Nome</Text>
                <Text style={[styles.th, { width: '20%' }]}>Tipo</Text>
                <Text style={[styles.th, { flex: 1 }]}>Origem</Text>
              </View>
              {docsSaida.map(d => (
                <View key={d.id} style={styles.tr}>
                  <Text style={[styles.td, { width: '40%' }]}>{d.nome}</Text>
                  <Text style={[styles.td, { width: '20%' }]}>{d.tipo || '—'}</Text>
                  <Text style={[styles.td, { flex: 1 }]}>{d.origem || '—'}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Responsáveis */}
        {respList.length > 0 && (
          <View style={styles.section} wrap={false}>
            <SectionHeader num={nextNum()} title="Responsáveis" />
            <View style={styles.table}>
              <View style={styles.trHeader}>
                <Text style={[styles.th, { width: '40%' }]}>Nome</Text>
                <Text style={[styles.th, { width: '30%' }]}>Cargo</Text>
                <Text style={[styles.th, { flex: 1 }]}>Custo/hora</Text>
              </View>
              {respList.map(r => (
                <View key={r.id} style={styles.tr}>
                  <Text style={[styles.td, { width: '40%' }]}>{r.nome}</Text>
                  <Text style={[styles.td, { width: '30%' }]}>{r.cargo || '—'}</Text>
                  <Text style={[styles.td, { flex: 1 }]}>
                    {r.custoHora ? `R$ ${r.custoHora.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Gargalos (As-Is) ou Melhorias (To-Be) */}
        {!isFicou && gargalosDoProcesso.length > 0 && (
          <View style={styles.section} wrap={false}>
            <SectionHeader num={nextNum()} title={`Gargalos identificados (${gargalosDoProcesso.length})`} />
            {gargalosDoProcesso.map(g => (
              <View key={g.id} style={styles.card}>
                <Text style={styles.cardTitle}>{g.nome}</Text>
                {!!g.descricao && <Text style={[styles.small, { marginBottom: 2 }]}>{g.descricao}</Text>}
                {!!g.origem && (
                  <Text style={[styles.small, styles.muted]}>Origem: {g.origem}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {isFicou && procMelhorias.length > 0 && (
          <View style={styles.section} wrap={false}>
            <SectionHeader num={nextNum()} title={`Melhorias projetadas (${procMelhorias.length})`} />
            {procMelhorias.map(m => (
              <View key={m.id} style={[styles.card, { borderLeftWidth: 3, borderLeftColor: PDF_COLORS.accentSoft }]}>
                <Text style={styles.cardTitle}>{m.nome}</Text>
                {!!m.descricao && <Text style={[styles.small, { marginBottom: 2 }]}>{m.descricao}</Text>}
                {!!m.status && (
                  <Text style={[styles.small, styles.muted]}>Status: {m.status}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        <PageFooter />
      </Page>
    </Document>
  );
}
