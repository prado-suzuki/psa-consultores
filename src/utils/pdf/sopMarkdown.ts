// SOP em Markdown — MESMO texto e valores do SOP em PDF (ambos consomem
// `buildSopModel`). Pensado para refinar o mapeamento (descrições de processo e
// etapas) fora do app e reimportar depois.

import { buildSopModel, type SopModelInput } from './sopModel';

/** Escapa o pipe para não quebrar células de tabela markdown. */
const cell = (s: string): string => (s ?? '').replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim() || '—';

export function buildSopMarkdown(input: SopModelInput): string {
  const m = buildSopModel(input);
  const id = m.identificacao;
  const out: string[] = [];

  // Cabeçalho
  out.push(`# SOP — ${id.nome}`);
  out.push('');
  out.push(`**${m.scenarioLabel}**`);
  const meta: string[] = [];
  if (m.projetoNome) meta.push(`Projeto: ${m.projetoNome}`);
  if (m.clusterNome) meta.push(`Cluster: ${m.clusterNome}`);
  meta.push(`Emissão: ${m.data}`);
  out.push('');
  out.push(meta.join(' · '));
  out.push('');

  let num = 0;
  const sec = (title: string) => `## ${String(++num).padStart(2, '0')} ${title}`;

  // 01 Identificação
  out.push(sec('Identificação'));
  out.push('');
  const chips: string[] = [];
  if (id.frequencia) chips.push(`**Frequência:** ${id.frequencia}`);
  if (id.complexidade) chips.push(`**Complexidade:** ${id.complexidade}`);
  if (chips.length) { out.push(chips.join(' · ')); out.push(''); }
  if (id.descricao) {
    out.push('**Descrição**');
    out.push('');
    out.push(id.descricao);
    out.push('');
  }
  if (id.entregavel) {
    out.push('**Entregável**');
    out.push('');
    out.push(id.entregavel);
    out.push('');
  }

  // 02 Etapas
  out.push(sec(`Etapas (${m.etapas.length})`));
  out.push('');
  if (m.etapas.length === 0) {
    out.push('_Nenhuma etapa cadastrada._');
    out.push('');
  }
  for (const e of m.etapas) {
    out.push(`### ${e.ordem}. ${e.nome}`);
    out.push('');
    if (e.descricao) { out.push(e.descricao); out.push(''); }
    out.push(`- **Execução:** ${e.execucao}`);
    out.push(`- **Executado por:** ${e.executadoPor}`);
    out.push(`- **Sistemas:** ${e.sistemas}`);
    out.push(`- **Docs entrada:** ${e.docsEntrada}`);
    out.push(`- **Docs saída:** ${e.docsSaida}`);
    out.push(`- **Taxa retrabalho:** ${e.taxaRetrabalho}`);
    if (e.gargalos.length) {
      out.push('');
      out.push('**Gargalos desta etapa**');
      out.push('');
      for (const g of e.gargalos) {
        out.push(`- ${g.nome}${g.descricao ? ` — ${g.descricao}` : ''}${g.origem ? ` (${g.origem})` : ''}`);
      }
    }
    out.push('');
  }

  // Sistemas
  if (m.sistemas.length) {
    out.push(sec('Sistemas'));
    out.push('');
    out.push('| Sistema | Descrição |');
    out.push('| --- | --- |');
    for (const s of m.sistemas) out.push(`| ${cell(s.nome)} | ${cell(s.descricao)} |`);
    out.push('');
  }

  // Documentos entrada
  if (m.docsEntrada.length) {
    out.push(sec('Documentos · Entrada'));
    out.push('');
    out.push('| Nome | Tipo | Origem |');
    out.push('| --- | --- | --- |');
    for (const d of m.docsEntrada) out.push(`| ${cell(d.nome)} | ${cell(d.tipo)} | ${cell(d.origem)} |`);
    out.push('');
  }

  // Documentos saída
  if (m.docsSaida.length) {
    out.push(sec('Documentos · Saída'));
    out.push('');
    out.push('| Nome | Tipo | Origem |');
    out.push('| --- | --- | --- |');
    for (const d of m.docsSaida) out.push(`| ${cell(d.nome)} | ${cell(d.tipo)} | ${cell(d.origem)} |`);
    out.push('');
  }

  // Responsáveis
  if (m.responsaveis.length) {
    out.push(sec('Responsáveis'));
    out.push('');
    out.push('| Nome | Cargo | Custo/hora |');
    out.push('| --- | --- | --- |');
    for (const r of m.responsaveis) out.push(`| ${cell(r.nome)} | ${cell(r.cargo)} | ${cell(r.custoHora)} |`);
    out.push('');
  }

  // Gargalos do processo (As-Is)
  if (!m.isFicou && m.gargalos.length) {
    out.push(sec(`Gargalos identificados (${m.gargalos.length})`));
    out.push('');
    for (const g of m.gargalos) {
      out.push(`### ${g.nome}`);
      out.push('');
      if (g.descricao) { out.push(g.descricao); out.push(''); }
      if (g.origem) { out.push(`_Origem: ${g.origem}_`); out.push(''); }
    }
  }

  // Melhorias projetadas (To-Be)
  if (m.isFicou && m.melhorias.length) {
    out.push(sec(`Melhorias projetadas (${m.melhorias.length})`));
    out.push('');
    for (const mel of m.melhorias) {
      out.push(`### ${mel.titulo}`);
      out.push('');
      if (mel.status) out.push(`- **Status:** ${mel.status}`);
      if (mel.acoes) out.push(`- **Ações:** ${mel.acoes}`);
      out.push('');
    }
  }

  // normaliza linhas em branco múltiplas e fecha com newline
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}
