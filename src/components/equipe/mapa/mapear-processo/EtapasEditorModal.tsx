import { Layers } from 'lucide-react';
import Modal from '@/components/equipe/mapa/Modal';
import FormField from '@/components/equipe/mapa/FormField';
import ChipSelector from '@/components/equipe/mapa/ChipSelector';
import DecimalInput from '@/components/equipe/mapa/DecimalInput';
import Select from '@/components/equipe/mapa/Select';
import EmptyStateCadastro from '@/components/equipe/mapa/cadastro/EmptyStateCadastro';
import { Tooltip } from '@/components/equipe/mapa/Tooltip';
import type { DocRef, ResponsavelEtapa } from '@/types';
import { cleanEtapaName } from '@/utils/etapaEditor';
import { formatDecimal } from '@/utils/format';
import { dica } from '@/utils/tooltips';
import { sumHorasEtapa } from '@/lib/mapearProcessoModel';
import type { EtapasEditorController } from '@/components/equipe/mapa/mapear-processo/useEtapasEditor';

const EXECUCAO_OPCOES = [
  { value: 'manual', label: 'Manual' },
  { value: 'semi_automatica', label: 'Semi-Automática' },
  { value: 'automatica', label: 'Automática' },
];

interface Props {
  editor: EtapasEditorController;
  docNames: string[];
  sisNames: string[];
  respNames: string[];
}

export function EtapasEditorModal({ editor, docNames, sisNames, respNames }: Props) {
  const active = editor.list[editor.activeIndex];
  const isFicou = editor.mode === 'ficou';
  const podeMexerEstrutura = !isFicou || editor.usarListaFicou;
  return (
    <Modal isOpen={editor.open} onClose={editor.requestClose}>
      {!active ? (
        <div className="modal-etapas edit-modal" style={{ position: 'relative' }}>
          <div className="modal-header"><h2>{isFicou ? 'Editar Etapas — Como Ficou' : 'Editar Etapas — Como Era'}</h2></div>
          <EmptyStateCadastro icone={<Layers size={28} strokeWidth={1.8} />} titulo="Nenhuma etapa ainda"
            texto={isFicou ? 'Mapeie o "Como era" primeiro para depois projetar o "Como ficou".' : 'Adicione a primeira etapa para começar a mapear como o processo funciona hoje.'}
            ctaLabel={isFicou ? undefined : 'Adicionar primeira etapa'} onCta={isFicou ? undefined : editor.add} />
        </div>
      ) : (
        <div className="modal-etapas edit-modal" style={{ position: 'relative' }}>
          {editor.pendingDraft && <div className="mapear-rascunho-banner"><span><strong>Rascunho recuperado</strong> — você tem alterações não salvas deste mapeamento. Pode não refletir mudanças recentes no banco.</span><span style={{ display: 'flex', gap: 8, flexShrink: 0 }}><button type="button" className="btn-save" onClick={editor.useDraft}>Usar rascunho</button><button type="button" className="btn-cancel" onClick={editor.discardDraft}>Descartar</button></span></div>}
          <div className="modal-header"><h2>{isFicou ? 'Editar Etapas — Como Ficou' : 'Editar Etapas — Como Era'}</h2><span className="etapas-count" aria-label={`${editor.list.length} etapas`}>{editor.list.length} {editor.list.length === 1 ? 'etapa' : 'etapas'}</span></div>
          <div className="etapas-layout">
            <aside className="etapas-sidebar" aria-label="Lista de etapas do processo">
              <div className="etapas-sidebar-header">Etapas do processo</div>
              <ol className="etapas-sidebar-list">
                {editor.list.map((etapa, index) => {
                  const rotulo = cleanEtapaName(etapa.name) || 'Nova etapa';
                  return <li key={etapa.id} draggable={!isFicou} className={`etapas-sidebar-item${index === editor.activeIndex ? ' active' : ''}${editor.draggedIndex === index ? ' dragging' : ''}`}
                    onClick={() => editor.setActiveIndex(index)} onDragStart={() => editor.dragStart(index)} onDragOver={event => editor.dragOver(event, index)} onDrop={editor.drop} onDragEnd={editor.drop}
                    title={!isFicou ? 'Arraste para reordenar' : rotulo} role="button" tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); editor.setActiveIndex(index); } }}>
                    {!isFicou && <span className="etapas-sidebar-handle" aria-hidden="true" title="Arraste para reordenar"><svg width="10" height="14" viewBox="0 0 10 14" fill="none"><circle cx="2" cy="3" r="1.2" fill="currentColor"/><circle cx="2" cy="7" r="1.2" fill="currentColor"/><circle cx="2" cy="11" r="1.2" fill="currentColor"/><circle cx="8" cy="3" r="1.2" fill="currentColor"/><circle cx="8" cy="7" r="1.2" fill="currentColor"/><circle cx="8" cy="11" r="1.2" fill="currentColor"/></svg></span>}
                    <span className="etapas-sidebar-num">{index + 1}</span><span className="etapas-sidebar-name">{rotulo}</span>
                  </li>;
                })}
              </ol>
              {podeMexerEstrutura && <button className="etapas-sidebar-add" onClick={editor.add} title="Adicionar nova etapa ao final"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Adicionar etapa</button>}
            </aside>
            <div className="etapas-form-area">
              <div className="modal-section">
                <div className="modal-section-title"><Tooltip text={dica('mapear.secao.identificacao')}>Identificação</Tooltip></div>
                <div className="form-row"><FormField label="Nome" required compact tooltip={dica('mapear.etapa.nome')}><input type="text" value={active.name} onChange={event => editor.updateField(editor.activeIndex, 'name', event.target.value)} /></FormField><FormField label="Execução" compact tooltip={dica('mapear.etapa.execution')}><Select value={active.execution || ''} onChange={value => editor.updateField(editor.activeIndex, 'execution', value)} options={EXECUCAO_OPCOES} placeholder="Selecione..." compact /></FormField></div>
                <FormField label="Descrição" compact tooltip={dica('mapear.etapa.descricao')}><textarea value={active.description} onChange={event => editor.updateField(editor.activeIndex, 'description', event.target.value)} /></FormField>
              </div>
              <div className="modal-section">
                <div className="modal-section-title"><Tooltip text={dica('mapear.secao.documentos')}>Documentos</Tooltip></div><div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 6 }}>O número ao lado de cada documento indica o <strong>volume por execução</strong>.</div>
                <FormField label="Docs Entrada" compact tooltip={dica('mapear.etapa.docsEntrada')}><ChipSelector options={docNames} value={active.docsEntrada || []} onChange={value => editor.updateField(editor.activeIndex, 'docsEntrada', value as DocRef[])} withVolume compact onAddNew={() => { editor.setQuickAddCampo('docsEntrada'); editor.setCadastroRapido('documento'); }} addNewLabel="Cadastrar novo documento" /></FormField>
                <FormField label="Docs Saída" compact tooltip={dica('mapear.etapa.docsSaida')}><ChipSelector options={docNames} value={active.docsSaida || []} onChange={value => editor.updateField(editor.activeIndex, 'docsSaida', value as DocRef[])} withVolume compact onAddNew={() => { editor.setQuickAddCampo('docsSaida'); editor.setCadastroRapido('documento'); }} addNewLabel="Cadastrar novo documento" /></FormField>
              </div>
              <div className="modal-section">
                <div className="modal-section-title"><Tooltip text={dica('mapear.secao.equipe')}>Equipe — horas por pessoa</Tooltip></div>
                <FormField label="Executado por" compact tooltip={dica('mapear.etapa.executadoPor')}><ChipSelector options={respNames} value={active.executadoPor || []} onChange={value => editor.updateField(editor.activeIndex, 'executadoPor', value as ResponsavelEtapa[])} withHours compact addLabel="Adicionar executor" onAddNew={() => { editor.setQuickAddCampo('executadoPor'); editor.setCadastroRapido('responsavel'); }} addNewLabel="Cadastrar novo responsável" /></FormField>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>Horas gasta por projeto: <strong>{formatDecimal(sumHorasEtapa(active, isFicou), 'h')}</strong></div>
              </div>
              <div className="modal-section">
                <div className="modal-section-title"><Tooltip text={dica('mapear.secao.metricas')}>Métricas</Tooltip></div>
                <div className="form-row"><FormField label="Volume por processo" compact tooltip={dica('mapear.etapa.volume_per_process')}><DecimalInput value={active.volume_per_process || 0} onChange={value => editor.updateField(editor.activeIndex, 'volume_per_process', value)} min={0} /></FormField><FormField label="Taxa Erros (%)" compact tooltip={dica('mapear.etapa.error_rate')}><DecimalInput value={(active.error_rate ?? 0) * 100} onChange={value => editor.updateField(editor.activeIndex, 'error_rate', value / 100)} min={0} max={100} placeholder="Ex: 5" /></FormField></div>
                <FormField label="Taxa Retrabalho (%)" compact tooltip={dica('mapear.etapa.rework_rate')}><DecimalInput value={(active.rework_rate || 0) * 100} onChange={value => editor.updateField(editor.activeIndex, 'rework_rate', value / 100)} min={0} max={100} placeholder="Ex: 15" /></FormField>
              </div>
              <div className="modal-section"><div className="modal-section-title"><Tooltip text={dica('mapear.secao.sistemas')}>Sistemas</Tooltip></div><FormField label="Sistemas" compact tooltip={dica('mapear.etapa.sistemas')}><ChipSelector options={sisNames} value={active.sistemas || []} onChange={value => editor.updateField(editor.activeIndex, 'sistemas', value as string[])} compact onAddNew={() => { editor.setQuickAddCampo('sistemas'); editor.setCadastroRapido('sistema'); }} addNewLabel="Cadastrar novo sistema" /></FormField>{(active.sistemas || []).filter(Boolean).length > 0 && <div style={{ marginTop: 6, fontSize: '0.78rem', color: '#64748b' }}>O rateio (%) do custo por cluster é configurado em <strong>Sistemas → editar sistema → Rateio por cluster</strong>.</div>}</div>
            </div>
          </div>
          <div className="modal-footer">{podeMexerEstrutura ? <button className="btn-delete-etapa" onClick={() => editor.remove(editor.activeIndex)} disabled={editor.list.length <= 1} title={editor.list.length <= 1 ? 'O processo precisa de ao menos uma etapa' : 'Excluir esta etapa'}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>Excluir esta etapa</button> : <span />}<div className="modal-footer-actions"><button className="btn-cancel" onClick={editor.requestClose}>Cancelar</button><button className="btn-save" onClick={editor.save} disabled={editor.saving}>{editor.saving ? 'Salvando...' : 'Salvar todas'}</button></div></div>
          {editor.confirmClose && <div className="mapear-confirm-sair" role="alertdialog" aria-modal="true"><div className="mapear-confirm-card"><h3>Sair sem salvar?</h3><p>Há alterações não salvas neste mapeamento. Elas ficam guardadas como rascunho para a próxima vez, mas não vão para o banco até você clicar em <strong>"Salvar todas"</strong>.</p><div className="modal-actions"><button type="button" className="btn-cancel" onClick={() => editor.setConfirmClose(false)}>Continuar editando</button><button type="button" className="btn-save" onClick={editor.leaveWithoutSaving}>Sair sem salvar</button></div></div></div>}
        </div>
      )}
    </Modal>
  );
}
