import { useId } from 'react';
import type { ReactNode } from 'react';
import { DicaIcon } from './Tooltip';

interface FormFieldProps {
  label: string;
  compact?: boolean;
  error?: string;
  required?: boolean;
  id?: string;
  tooltip?: string;
  children: ReactNode;
}

export default function FormField({ label, compact, error, required, id: propId, tooltip, children }: FormFieldProps) {
  const generatedId = useId();
  const fieldId = propId || generatedId;

  return (
    <div className={`form-group${compact ? ' compact' : ''}${error ? ' has-error' : ''}`}>
      <label htmlFor={fieldId}>
        {label}
        {required && <span style={{ color: 'var(--danger-color)', marginLeft: 4 }}>*</span>}
        {tooltip && <DicaIcon text={tooltip} />}
      </label>
      <div>
        {Array.isArray(children)
          ? children.map((c) => {
              if (c && typeof c === 'object' && 'props' in c) {
                const child = c as { props: { id?: string } };
                if (!child.props.id) return { ...c, props: { ...child.props, id: fieldId } };
              }
              return c;
            })
          : children && typeof children === 'object' && 'props' in children
            ? !(children as { props: { id?: string } }).props?.id
              ? { ...children, props: { ...(children as { props: Record<string, unknown> }).props, id: fieldId } }
              : children
            : children}
        {error && <span className="error-msg">{error}</span>}
      </div>
    </div>
  );
}
