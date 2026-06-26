// Tokens visuais e StyleSheet base compartilhado pelos documentos PDF do MAPA.
// Espelha as cores institucionais usadas no app (teal #0d9488 + slate).

import { StyleSheet } from '@react-pdf/renderer';

export const PDF_COLORS = {
  primary: '#0f172a',     // slate-900
  primaryDeep: '#134e4a', // teal-900
  accent: '#0d9488',      // teal-600
  accentSoft: '#8bc63f',  // verde PSA
  ficou: '#0d9488',
  warning: '#b45309',
  bg: '#f8fafc',
  bgSubtle: '#f1f5f9',
  white: '#ffffff',
  text: '#1e293b',
  textMuted: '#64748b',
  textSubtle: '#94a3b8',
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',
  ok: '#15803d',
  bad: '#b91c1c',
} as const;

export const PDF_FONT_SIZE = {
  xs: 7,
  sm: 8,
  base: 9,
  md: 10,
  lg: 12,
  xl: 14,
  h2: 16,
  h1: 20,
  display: 26,
} as const;

export const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 40,
    paddingHorizontal: 36,
    fontSize: PDF_FONT_SIZE.base,
    color: PDF_COLORS.text,
    fontFamily: 'Helvetica',
    backgroundColor: PDF_COLORS.white,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: PDF_COLORS.accent,
  },
  pageHeaderTitle: {
    fontSize: PDF_FONT_SIZE.md,
    fontFamily: 'Helvetica-Bold',
    color: PDF_COLORS.primary,
  },
  pageHeaderSub: {
    fontSize: PDF_FONT_SIZE.sm,
    color: PDF_COLORS.textMuted,
  },
  pageFooter: {
    position: 'absolute',
    bottom: 18,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: PDF_FONT_SIZE.xs,
    color: PDF_COLORS.textMuted,
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.border,
    paddingTop: 6,
  },
  // Seções
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  sectionNum: {
    fontSize: PDF_FONT_SIZE.sm,
    fontFamily: 'Helvetica-Bold',
    color: PDF_COLORS.white,
    backgroundColor: PDF_COLORS.accent,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
  },
  sectionName: {
    fontSize: PDF_FONT_SIZE.lg,
    fontFamily: 'Helvetica-Bold',
    color: PDF_COLORS.primary,
  },
  // Capa
  coverPage: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 50,
    paddingVertical: 72,
    backgroundColor: PDF_COLORS.primary,
    color: PDF_COLORS.white,
  },
  coverLogo: {
    width: 150,
    height: 84,
    objectFit: 'contain',
  },
  coverCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverProject: {
    fontSize: PDF_FONT_SIZE.sm,
    color: '#cbd5e1',
    textAlign: 'center',
    marginTop: 18,
  },
  coverEyebrow: {
    fontSize: PDF_FONT_SIZE.sm,
    letterSpacing: 4,
    color: PDF_COLORS.accentSoft,
    marginBottom: 16,
    fontFamily: 'Helvetica-Bold',
  },
  coverTitle: {
    fontSize: PDF_FONT_SIZE.display,
    fontFamily: 'Helvetica-Bold',
    color: PDF_COLORS.white,
    textAlign: 'center',
    marginBottom: 14,
  },
  coverSub: {
    fontSize: PDF_FONT_SIZE.lg,
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 30,
  },
  coverMeta: {
    fontSize: PDF_FONT_SIZE.sm,
    color: '#94a3b8',
    textAlign: 'center',
  },
  // Tabela
  table: {
    flexDirection: 'column',
    borderTopWidth: 1,
    borderColor: PDF_COLORS.border,
  },
  tr: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: PDF_COLORS.border,
    minHeight: 18,
  },
  trHeader: {
    flexDirection: 'row',
    backgroundColor: PDF_COLORS.bgSubtle,
    borderBottomWidth: 1,
    borderColor: PDF_COLORS.borderStrong,
  },
  th: {
    fontSize: PDF_FONT_SIZE.sm,
    fontFamily: 'Helvetica-Bold',
    color: PDF_COLORS.primary,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  td: {
    fontSize: PDF_FONT_SIZE.sm,
    color: PDF_COLORS.text,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  // Cards / chips
  chip: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: PDF_COLORS.bgSubtle,
    color: PDF_COLORS.text,
    borderRadius: 3,
    fontSize: PDF_FONT_SIZE.xs,
    marginRight: 4,
    marginBottom: 4,
  },
  chipAccent: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: PDF_COLORS.accent,
    color: PDF_COLORS.white,
    borderRadius: 3,
    fontSize: PDF_FONT_SIZE.xs,
    marginRight: 4,
    marginBottom: 4,
  },
  card: {
    borderWidth: 1,
    borderColor: PDF_COLORS.border,
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: PDF_FONT_SIZE.md,
    fontFamily: 'Helvetica-Bold',
    color: PDF_COLORS.primary,
    marginBottom: 4,
  },
  // KPI
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  kpi: {
    width: '32%',
    borderWidth: 1,
    borderColor: PDF_COLORS.border,
    borderLeftWidth: 3,
    borderLeftColor: PDF_COLORS.accent,
    padding: 8,
    backgroundColor: PDF_COLORS.bg,
  },
  kpiLabel: {
    fontSize: PDF_FONT_SIZE.xs,
    color: PDF_COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: PDF_FONT_SIZE.h2,
    fontFamily: 'Helvetica-Bold',
    color: PDF_COLORS.primary,
    marginTop: 2,
  },
  kpiSub: {
    fontSize: PDF_FONT_SIZE.xs,
    color: PDF_COLORS.textMuted,
    marginTop: 1,
  },
  // Texto comum
  muted: { color: PDF_COLORS.textMuted },
  bold: { fontFamily: 'Helvetica-Bold' },
  small: { fontSize: PDF_FONT_SIZE.sm },
  ok: { color: PDF_COLORS.ok },
  bad: { color: PDF_COLORS.bad },
  // Layout helpers
  row: { flexDirection: 'row' },
  col: { flexDirection: 'column' },
  flex1: { flex: 1 },
  // Comparativo (lado a lado)
  cmpRow: { flexDirection: 'row', gap: 10 },
  cmpCol: {
    flex: 1,
    borderWidth: 1,
    borderColor: PDF_COLORS.border,
    padding: 8,
    borderRadius: 3,
  },
  cmpColEra: {
    flex: 1,
    borderWidth: 1,
    borderColor: PDF_COLORS.border,
    borderTopWidth: 3,
    borderTopColor: PDF_COLORS.textMuted,
    padding: 8,
    borderRadius: 3,
  },
  cmpColFicou: {
    flex: 1,
    borderWidth: 1,
    borderColor: PDF_COLORS.border,
    borderTopWidth: 3,
    borderTopColor: PDF_COLORS.accentSoft,
    padding: 8,
    borderRadius: 3,
  },
  cmpHeader: {
    fontSize: PDF_FONT_SIZE.xs,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
});
