// Comprovante de recebimento de documentos — a peça que a área entrega quando
// alguém pergunta o que o cliente enviou e quando.
//
// Renderiza em React-PDF a partir do modelo PURO `montarComprovante`, a MESMA
// fonte de texto e números usada pelo teste. Assim o que o PDF mostra e o que o
// teste afirma não podem divergir.
//
// Molde: `SopDocument.tsx`. Reusa a espinha genérica dele (cabeçalho de página,
// rodapé com página sobre total, cabeçalho de seção e linha de informação) e os
// estilos de `theme.ts`. NENHUMA folha de estilo nova: o tema já traz capa,
// logotipo, título, seção, tabela, texto pequeno, apagado e etiqueta.
//
// Estrutura: Capa · Resumo · uma seção por grupo de documentos.

import { Document, Image, Page, Text, View } from '@react-pdf/renderer';

import logoPsaWhite from '@/assets/logo-psa.png';
import { montarComprovante, type ComprovanteInput } from '@/lib/comprovanteRecebimento';
import { pad2 } from './helpers';
import { styles } from './theme';

export type ComprovanteDocumentProps = ComprovanteInput;

function PageHeader({ cliente }: { cliente: string }) {
  return (
    <View style={styles.pageHeader} fixed>
      <View>
        <Text style={styles.pageHeaderTitle}>Comprovante de recebimento</Text>
        <Text style={styles.pageHeaderSub}>{cliente}</Text>
      </View>
      <Text style={styles.pageHeaderSub}>PSA Consultores · OSG</Text>
    </View>
  );
}

function PageFooter() {
  return (
    <View style={styles.pageFooter} fixed>
      <Text>PSA Consultores · OSG</Text>
      <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
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
      <Text style={[styles.small, styles.muted, { width: 130 }]}>{label}</Text>
      <Text style={[styles.small, { flex: 1 }]}>{value || '—'}</Text>
    </View>
  );
}

export function ComprovanteDocument(props: ComprovanteDocumentProps) {
  const m = montarComprovante(props);
  let secao = 0;
  const proxima = () => ++secao;
  const temSolicitacao = !!m.solicitacaoEnviadaEm;

  return (
    <Document title={`Comprovante de recebimento - ${m.clienteNome}`} author="PSA Consultores">
      {/* CAPA */}
      <Page size="A4" style={styles.coverPage}>
        <Image src={logoPsaWhite} style={styles.coverLogo} />
        <View style={styles.coverCenter}>
          <Text style={styles.coverEyebrow}>COMPROVANTE DE RECEBIMENTO</Text>
          <Text style={styles.coverTitle}>{m.clienteNome}</Text>
          <Text style={styles.coverSub}>
            {m.total === 1 ? '1 documento recebido' : `${m.total} documentos recebidos`}
          </Text>
        </View>
        <Text style={styles.coverMeta}>Emissão · {m.emitidoEm}</Text>
      </Page>

      {/* CONTEÚDO */}
      <Page size="A4" style={styles.page}>
        <PageHeader cliente={m.clienteNome} />
        <PageFooter />

        <View style={styles.section}>
          <SectionHeader num={proxima()} title="Resumo" />
          <InfoRow label="Cliente" value={m.clienteNome} />
          <InfoRow label="Documentos recebidos" value={String(m.total)} />
          {temSolicitacao && <InfoRow label="Solicitação enviada em" value={m.solicitacaoEnviadaEm} />}
          {temSolicitacao && <InfoRow label="Solicitação encerrada em" value={m.solicitacaoEncerradaEm} />}
          <InfoRow label="Emitido em" value={m.emitidoEm} />
          <Text style={[styles.small, styles.muted, { marginTop: 6, lineHeight: 1.4 }]}>
            Este comprovante lista os arquivos enviados pelo cliente e a data em que chegaram.
            Não inclui documentos produzidos pela PSA nem documentos arquivados, e não indica o
            que ainda falta.
          </Text>
        </View>

        {m.grupos.length === 0 && (
          <View style={styles.section}>
            <Text style={[styles.small, styles.muted]}>Nenhum documento recebido até a emissão.</Text>
          </View>
        )}

        {m.grupos.map((g) => (
          <View key={g.key} style={styles.section}>
            <SectionHeader num={proxima()} title={`${g.titulo} (${g.itens.length})`} />
            <Text style={[styles.small, styles.muted, { marginBottom: 4 }]}>{g.subtitulo}</Text>

            <View style={styles.table}>
              <View style={[styles.tr, styles.trHeader]} fixed>
                <Text style={[styles.th, { width: 26 }]}>#</Text>
                <Text style={[styles.th, { flex: 1 }]}>Arquivo</Text>
                <Text style={[styles.th, { width: 120 }]}>Recebido em</Text>
                <Text style={[styles.th, { width: 110 }]}>Enviado por</Text>
              </View>
              {g.itens.map((it) => (
                <View key={`${g.key}-${it.ordem}`} style={styles.tr} wrap={false}>
                  <Text style={[styles.td, { width: 26 }]}>{it.ordem}</Text>
                  <Text style={[styles.td, { flex: 1 }]}>{it.arquivo}</Text>
                  <Text style={[styles.td, { width: 120 }]}>{it.recebidoEm}</Text>
                  <Text style={[styles.td, { width: 110 }]}>{it.enviadoPor}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </Page>
    </Document>
  );
}

export default ComprovanteDocument;
