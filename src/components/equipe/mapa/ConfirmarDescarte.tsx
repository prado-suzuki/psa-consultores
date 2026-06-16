// Overlay de confirmação "sair sem salvar" — reaproveitado pelos modais de
// cadastro do MAPA. Position:fixed (cobre a viewport, acima do modal-overlay);
// estilos em styles/cadastro.css (.mapear-confirm-sair / .mapear-confirm-card).

interface Props {
  open: boolean;
  onContinuar: () => void;
  onDescartar: () => void;
  titulo?: string;
  mensagem?: string;
}

export default function ConfirmarDescarte({
  open,
  onContinuar,
  onDescartar,
  titulo = 'Sair sem salvar?',
  mensagem = 'Há alterações não salvas neste cadastro. Se sair agora, elas serão descartadas.',
}: Props) {
  if (!open) return null;
  return (
    <div className="mapear-confirm-sair" role="alertdialog" aria-modal="true">
      <div className="mapear-confirm-card">
        <h3>{titulo}</h3>
        <p>{mensagem}</p>
        <div className="modal-actions">
          <button type="button" className="btn-cancel" onClick={onContinuar}>Continuar editando</button>
          <button type="button" className="btn-save" onClick={onDescartar}>Sair sem salvar</button>
        </div>
      </div>
    </div>
  );
}
