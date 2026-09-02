/**
 * Subabas internas do Board. Não é menu — só parte o diagnóstico da tela.
 */
export function BoardAbas<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { id: T; label: string }[];
}) {
  return (
    <div className="v3-segs" role="tablist" style={{ marginBottom: 16 }}>
      {items.map((i) => (
        <button
          key={i.id}
          type="button"
          role="tab"
          aria-selected={value === i.id}
          className={`v3-seg ${value === i.id ? 'on' : ''}`}
          onClick={() => onChange(i.id)}
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}
