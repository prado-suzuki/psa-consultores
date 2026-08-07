import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { FieldSection } from '@/components/equipe/osg/formKit';
import { FileText, Link2, Pencil, Plus, Trash2, Unlink } from 'lucide-react';
import type { MatriculaRow } from '@/hooks/useDiagnosticoPatrimonial';
import { formatArea } from '@/components/equipe/osg/diagnostico-patrimonial/areaUtils';

interface MatriculasSectionProps {
  // Vem de quem monta o formulário: a última seção do bem, cuja ordem depende de
  // quantas seções o tipo de bem mostrou antes (urbano tem a de endereço).
  number: string;
  isEdit: boolean; loading: boolean; matriculas: MatriculaRow[];
  onAdd: () => void; onLink: () => void; onEdit: (matricula: MatriculaRow) => void;
  onUnlink: (matricula: MatriculaRow) => void; onDelete: (matricula: MatriculaRow) => void;
}

export function MatriculasSection(props: MatriculasSectionProps) {
  const { number, isEdit, loading, matriculas } = props;
  return (
    <FieldSection number={number} title="Matrículas" hint={isEdit && matriculas.length ? `${matriculas.length} registro(s)` : undefined}
      actions={<div className="flex gap-1.5">
        <Button type="button" size="sm" variant="outline" className="h-7 gap-1.5" disabled={!isEdit} onClick={props.onLink}><Link2 className="h-3.5 w-3.5" /> Vincular existente</Button>
        <Button type="button" size="sm" className="h-7 gap-1.5 bg-osg-moss text-white hover:bg-osg-moss/90" disabled={!isEdit} onClick={props.onAdd}><Plus className="h-3.5 w-3.5" /> Nova matrícula</Button>
      </div>}>
      {!isEdit ? <p className="text-xs italic text-muted-foreground">Salve o bem primeiro para cadastrar matrículas.</p>
        : loading ? <p className="text-xs text-muted-foreground">Carregando...</p>
        : matriculas.length === 0 ? <Card><CardContent className="py-6 text-center text-sm text-muted-foreground"><FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />Nenhuma matrícula cadastrada.</CardContent></Card>
        : <div className="space-y-1.5">{matriculas.map((matricula) => <MatriculaCard key={matricula.id} matricula={matricula} {...props} />)}</div>}
    </FieldSection>
  );
}

function MatriculaCard({ matricula, onEdit, onUnlink, onDelete }: Pick<MatriculasSectionProps, 'onEdit' | 'onUnlink' | 'onDelete'> & { matricula: MatriculaRow }) {
  return <div className="flex items-start gap-2 rounded-md border bg-muted/30 px-3 py-2">
    <div className="min-w-0 flex-1 space-y-1"><div className="flex flex-wrap items-center gap-2">
      <Badge variant="default" className="text-[10px] font-mono">Mat. {matricula.numero}</Badge>
      <span className="text-sm text-muted-foreground">{matricula.municipio_imovel}/{matricula.uf_imovel}</span>
    </div><div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
      <span>Área doc: <span className="font-mono">{formatArea(matricula.area_documento, matricula.area_unidade)}</span></span>
      {matricula.area_real != null && <span>Área real: <span className="font-mono">{formatArea(matricula.area_real, matricula.area_unidade)}</span></span>}
      {matricula.georreferenciado && <span>Georref: <span className="font-medium">{matricula.georreferenciado}</span></span>}
    </div></div>
    <div className="flex gap-1"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(matricula)}><Pencil className="h-3.5 w-3.5" /></Button>
      <ConfirmAction triggerTitle="Desvincular do bem" title="Desvincular matrícula?" description={`A matrícula ${matricula.numero} será desvinculada deste bem e voltará ao estado órfã (sem bem). Ela não será excluída — titulares e impedimentos são preservados.`} action="Desvincular" icon={<Unlink className="h-3.5 w-3.5" />} onAction={() => onUnlink(matricula)} />
      <ConfirmAction destructive title="Remover matrícula?" description={`Remover a matrícula ${matricula.numero}? Os titulares e impedimentos vinculados também serão removidos.`} action="Remover" icon={<Trash2 className="h-3.5 w-3.5" />} onAction={() => onDelete(matricula)} />
    </div>
  </div>;
}

function ConfirmAction({ title, description, action, icon, onAction, destructive = false, triggerTitle }: { title: string; description: string; action: string; icon: React.ReactNode; onAction: () => void; destructive?: boolean; triggerTitle?: string }) {
  return <AlertDialog><AlertDialogTrigger asChild><Button size="icon" variant="ghost" title={triggerTitle} className={`h-7 w-7 ${destructive ? 'text-destructive' : ''}`}>{icon}</Button></AlertDialogTrigger>
    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className={destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined} onClick={onAction}>{action}</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent></AlertDialog>;
}
