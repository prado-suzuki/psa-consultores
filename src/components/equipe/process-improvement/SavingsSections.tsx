import type { ComponentType } from 'react';
import type { SavingsItem, SavingsType } from '@/lib/processImprovement';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ChevronRight, Monitor, Plus, ShoppingCart, Sparkles, Trash2 } from 'lucide-react';

interface SavingsSectionProps {
  type: SavingsType;
  title: string;
  hint: string;
  addLabel: string;
  descriptionPlaceholder: string;
  icon: ComponentType<{ className?: string }>;
  items: SavingsItem[];
  total: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: () => void;
  onUpdate: (index: number, item: SavingsItem) => void;
  onRemove: (index: number) => void;
}

function SavingsSection({
  type,
  title,
  hint,
  addLabel,
  descriptionPlaceholder,
  icon: Icon,
  items,
  total,
  open,
  onOpenChange,
  onAdd,
  onUpdate,
  onRemove,
}: SavingsSectionProps) {
  const isOther = type === 'other';
  const grid = isOther ? 'grid-cols-[1fr_120px_32px]' : 'grid-cols-[1fr_100px_100px_90px_32px]';
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-3 hover:bg-blue-100/50 rounded cursor-pointer border border-blue-200/50">
          <div className="flex items-center gap-2">
            <ChevronRight className={cn('h-4 w-4 transition-transform text-blue-600', open && 'rotate-90')} />
            <Icon className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-sm">{title}</span>
            <span className="text-xs text-muted-foreground">{hint}</span>
          </div>
          {total > 0 && (
            <Badge variant="outline" className="text-green-600 border-green-300">
              R$ {total.toLocaleString('pt-BR')}{type === 'build_vs_buy' ? '' : '/mês'}
            </Badge>
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-6 pr-2 pb-3 pt-2 space-y-2 border-l-2 border-blue-200 ml-2">
          {items.length > 0 && (
            <div className={`grid ${grid} gap-2 text-xs font-medium text-muted-foreground px-2`}>
              <span>{isOther ? 'Descrição' : type === 'system' ? 'Sistema/Ferramenta' : 'Item/Solução'}</span>
              {isOther ? (
                <span className="text-right">Valor/mês</span>
              ) : (
                <>
                  <span>{type === 'system' ? 'Custo Antes' : 'Preço Mercado'}</span>
                  <span>{type === 'system' ? 'Custo Depois' : 'Custo Interno'}</span>
                  <span className="text-right">Economia</span>
                </>
              )}
              <span />
            </div>
          )}
          {items.map((item, index) => (
            <div key={index} className={`grid ${grid} gap-2 items-center`}>
              <Input
                placeholder={descriptionPlaceholder}
                value={item.description}
                onChange={event => onUpdate(index, { ...item, description: event.target.value })}
                className="h-9"
              />
              {isOther ? (
                <Input
                  type="number"
                  placeholder="R$/mês"
                  value={item.savings_value || ''}
                  onChange={event => onUpdate(index, {
                    ...item,
                    savings_value: parseFloat(event.target.value) || 0,
                  })}
                  className="h-9"
                />
              ) : (
                <>
                  <Input
                    type="number"
                    placeholder="R$"
                    value={item.cost_before || ''}
                    onChange={event => {
                      const before = parseFloat(event.target.value) || 0;
                      onUpdate(index, { ...item, cost_before: before, savings_value: before - item.cost_after });
                    }}
                    className="h-9"
                  />
                  <Input
                    type="number"
                    placeholder="R$"
                    value={item.cost_after || ''}
                    onChange={event => {
                      const after = parseFloat(event.target.value) || 0;
                      onUpdate(index, { ...item, cost_after: after, savings_value: item.cost_before - after });
                    }}
                    className="h-9"
                  />
                  <div className="text-right font-medium text-green-600 text-sm">
                    R$ {(item.savings_value || 0).toLocaleString('pt-BR')}
                  </div>
                </>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRemove(index)}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={onAdd} className="w-full border-dashed border mt-2">
            <Plus className="h-4 w-4 mr-2" />
            {addLabel}
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface SavingsSectionsProps {
  system: SavingsItem[];
  buildVsBuy: SavingsItem[];
  other: SavingsItem[];
  totals: { system: number; buildVsBuy: number; other: number };
  openSections: Record<SavingsType, boolean>;
  onOpenChange: (type: SavingsType, open: boolean) => void;
  onAdd: (type: SavingsType) => void;
  onUpdate: (type: SavingsType, index: number, item: SavingsItem) => void;
  onRemove: (type: SavingsType, index: number) => void;
}

export function SavingsSections(props: SavingsSectionsProps) {
  const total = props.totals.system + props.totals.buildVsBuy + props.totals.other;
  const sections = [
    { type: 'system' as const, title: 'Economia com Sistemas', hint: '(licenças, softwares)', addLabel: 'Adicionar Sistema', placeholder: 'Nome do sistema', icon: Monitor, items: props.system, total: props.totals.system },
    { type: 'build_vs_buy' as const, title: 'Construir vs Comprar', hint: '(economia única)', addLabel: 'Adicionar Item', placeholder: 'Nome da solução', icon: ShoppingCart, items: props.buildVsBuy, total: props.totals.buildVsBuy },
    { type: 'other' as const, title: 'Outras Economias', hint: '(ganhos recorrentes)', addLabel: 'Adicionar Economia', placeholder: 'Descrição da economia', icon: Sparkles, items: props.other, total: props.totals.other },
  ];

  return (
    <Card className="bg-muted/40">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-foreground">Economias Adicionais (opcional)</h4>
          {total > 0 && <Badge className="bg-success/20 text-foreground border-success/40">Total: R$ {total.toLocaleString('pt-BR')}</Badge>}
        </div>
        <div className="space-y-2">
          {sections.map(section => (
            <SavingsSection
              key={section.type}
              type={section.type}
              title={section.title}
              hint={section.hint}
              addLabel={section.addLabel}
              descriptionPlaceholder={section.placeholder}
              icon={section.icon}
              items={section.items}
              total={section.total}
              open={props.openSections[section.type]}
              onOpenChange={open => props.onOpenChange(section.type, open)}
              onAdd={() => props.onAdd(section.type)}
              onUpdate={(index, item) => props.onUpdate(section.type, index, item)}
              onRemove={index => props.onRemove(section.type, index)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
