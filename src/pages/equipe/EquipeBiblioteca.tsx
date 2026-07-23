import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useDomainEquipeBiblioteca,
  type ProjectDocument,
} from '@/hooks/useDomainEquipeBiblioteca';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Upload, FileText, Download, Trash2, Search, Plus, File, FileSpreadsheet, FileImage, Eye } from 'lucide-react';

const CATEGORIES = [
  { value: 'roadmap', label: 'Roadmap' },
  { value: 'relatorio', label: 'Relatório' },
  { value: 'manual', label: 'Manual' },
  { value: 'template', label: 'Template' },
  { value: 'documentacao', label: 'Documentação' },
  { value: 'general', label: 'Geral' },
];

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (fileType: string | null) => {
  if (!fileType) return <File className="h-5 w-5" />;
  if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
  if (fileType.includes('sheet') || fileType.includes('excel')) return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
  if (fileType.includes('image')) return <FileImage className="h-5 w-5 text-blue-500" />;
  if (fileType.includes('markdown') || fileType.includes('text')) return <FileText className="h-5 w-5 text-gray-500" />;
  return <File className="h-5 w-5" />;
};

export default function EquipeBiblioteca() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSprint, setFilterSprint] = useState<string>('all');
  const [filterProcess, setFilterProcess] = useState<string>('all');
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [sprintId, setSprintId] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('general');
    setSprintId('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const {
    documents,
    processesList,
    sprints,
    isLoading,
    uploadMutation,
    deleteMutation,
    downloadMutation,
    previewMutation,
  } = useDomainEquipeBiblioteca({
    onUploadStart: () => setUploading(true),
    onUploadSuccess: () => {
      resetForm();
      setIsUploadOpen(false);
    },
    onUploadSettled: () => setUploading(false),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleDownload = async (doc: ProjectDocument) => {
    let data: Blob;
    try {
      data = await downloadMutation.mutateAsync(doc);
    } catch {
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.file_name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePreview = async (doc: ProjectDocument) => {
    if (!doc.file_type?.includes('text') && !doc.file_type?.includes('markdown') && !doc.file_name.endsWith('.md')) {
      toast.info('Visualização disponível apenas para arquivos de texto/markdown');
      return;
    }

    let data: Blob;
    try {
      data = await previewMutation.mutateAsync(doc);
    } catch {
      return;
    }

    const text = await data.text();
    setPreviewContent(text);
    setPreviewTitle(doc.title);
    setIsPreviewOpen(true);
  };

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
    const matchesSprint = filterSprint === 'all' || doc.sprint_id === filterSprint;
    const matchesProcess = filterProcess === 'all' || doc.process_id === filterProcess;
    return matchesSearch && matchesCategory && matchesSprint && matchesProcess;
  });

  return (
    <EquipeLayout title="Biblioteca" subtitle="Documentos do Projeto Digital PSA">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar documentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={filterSprint} onValueChange={setFilterSprint}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Sprint" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas sprints</SelectItem>
            {sprints.map(sprint => (
              <SelectItem key={sprint.id} value={sprint.id}>{sprint.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={filterProcess} onValueChange={setFilterProcess}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Processo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos processos</SelectItem>
            {processesList.map(proc => (
              <SelectItem key={proc.id} value={proc.id}>
                {proc.code ? `${proc.code} - ` : ''}{proc.name.length > 25 ? proc.name.slice(0, 25) + '...' : proc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Documento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Enviar Documento</DialogTitle>
              <DialogDescription>
                Adicione um documento à biblioteca do projeto
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="file">Arquivo *</Label>
                <Input
                  id="file"
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept=".md,.txt,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.zip"
                />
                {selectedFile && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nome do documento"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição opcional"
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="sprint">Sprint</Label>
                  <Select value={sprintId} onValueChange={setSprintId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      {sprints.map(sprint => (
                        <SelectItem key={sprint.id} value={sprint.id}>{sprint.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button 
                className="w-full gap-2" 
                onClick={() => uploadMutation.mutate({
                  file: selectedFile,
                  userId: user?.id,
                  title,
                  description,
                  category,
                  sprintId,
                })}
                disabled={!selectedFile || !title || uploading}
              >
                <Upload className="h-4 w-4" />
                {uploading ? 'Enviando...' : 'Enviar Documento'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Documents Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : filteredDocuments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum documento encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Processo</TableHead>
                  <TableHead>Sprint</TableHead>
                  <TableHead>Enviado por</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>{getFileIcon(doc.file_type)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">{doc.file_name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {CATEGORIES.find(c => c.value === doc.category)?.label || doc.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {doc.processes ? (
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                          {doc.processes.code || doc.processes.name.slice(0, 15)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {doc.sprints?.name ? (
                        <Badge variant="secondary" className="text-xs">
                          {doc.sprints.name.replace('Sprint ', 'S')}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {doc.profiles ? `${doc.profiles.first_name} ${doc.profiles.last_name}` : '-'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(doc.created_at), "dd/MM/yy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {(doc.file_type?.includes('text') || doc.file_type?.includes('markdown') || doc.file_name.endsWith('.md')) && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handlePreview(doc)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleDownload(doc)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O documento "{doc.title}" será excluído permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(doc)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{previewTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded-lg">
              {previewContent}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </EquipeLayout>
  );
}
