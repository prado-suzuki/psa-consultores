/**
 * Controles da barra de filtros do dashboard Clientes e OS — usando os
 * componentes de UI do projeto (shadcn), não os nativos do browser.
 */
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const fieldLabelCss: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase',
  color: 'var(--board-v4-ink3)', marginBottom: 5, display: 'block',
};

export const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column' }}>
    <span style={fieldLabelCss}>{label}</span>
    {children}
  </div>
);

export const DateField = ({ value, onChange, placeholder }: {
  value?: Date; onChange: (d?: Date) => void; placeholder: string;
}) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" size="sm" className={cn('h-9 justify-start text-sm font-normal', !value && 'text-muted-foreground')}>
        <CalendarIcon className="mr-2 h-4 w-4" />
        {value ? format(value, 'dd/MM/yyyy', { locale: ptBR }) : placeholder}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="start">
      <Calendar selected={value} onSelect={onChange} />
    </PopoverContent>
  </Popover>
);

export const SelectFilter = ({ value, onChange, options, width }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; width: number;
}) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className="h-9 text-sm" style={{ width }}>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
    </SelectContent>
  </Select>
);
