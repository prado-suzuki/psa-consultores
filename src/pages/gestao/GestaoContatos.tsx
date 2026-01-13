import { useState, useEffect } from "react";
import { GestaoLayout } from "@/components/gestao/GestaoLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Eye, Mail, Phone, Building2, Calendar, User, MessageSquare, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Contato {
  id: string;
  nome_completo: string;
  email: string;
  telefone: string | null;
  empresa: string | null;
  mensagem: string | null;
  servico_interesse: string | null;
  porte_empresa: string | null;
  como_conheceu: string | null;
  status: string;
  notas_internas: string | null;
  atendido_por: string | null;
  created_at: string;
  updated_at: string;
}

const servicoLabels: Record<string, string> = {
  consultoria_tributaria: "Consultoria Tributária",
  beneficios_fiscais: "Benefícios Fiscais",
  recuperacao_tributaria: "Recuperação Tributária",
  reestruturacao_societaria: "Reestruturação Societária",
  pessoa_fisica: "Pessoa Física",
  consultoria_previdenciaria: "Consultoria Previdenciária",
  consultoria_contabil: "Consultoria Contábil",
  business_intelligence: "Business Intelligence",
  juridico_preventivo: "Jurídico Preventivo",
  outros: "Outros",
};

const porteLabels: Record<string, string> = {
  mei: "MEI",
  micro: "Micro Empresa",
  pequena: "Pequena Empresa",
  media: "Média Empresa",
  grande: "Grande Empresa",
};

const comoConheceuLabels: Record<string, string> = {
  indicacao: "Indicação",
  google: "Busca no Google",
  linkedin: "LinkedIn",
  evento: "Evento",
  outros: "Outros",
};

const statusOptions = [
  { value: "novo", label: "Novo", color: "bg-blue-500" },
  { value: "em_andamento", label: "Em Andamento", color: "bg-yellow-500" },
  { value: "convertido", label: "Convertido", color: "bg-green-500" },
  { value: "arquivado", label: "Arquivado", color: "bg-gray-500" },
];

const getStatusBadge = (status: string) => {
  const statusInfo = statusOptions.find((s) => s.value === status) || statusOptions[0];
  return (
    <Badge className={`${statusInfo.color} text-white hover:${statusInfo.color}`}>
      {statusInfo.label}
    </Badge>
  );
};

const GestaoContatos = () => {
  const { toast } = useToast();
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [selectedContato, setSelectedContato] = useState<Contato | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [notasInternas, setNotasInternas] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchContatos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("contatos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setContatos(data || []);
    } catch (error) {
      console.error("Error fetching contatos:", error);
      toast({
        title: "Erro ao carregar contatos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContatos();
  }, []);

  const filteredContatos = contatos.filter((contato) => {
    const matchesSearch =
      contato.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contato.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contato.empresa?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    const matchesStatus =
      statusFilter === "todos" || contato.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleOpenDetails = (contato: Contato) => {
    setSelectedContato(contato);
    setNotasInternas(contato.notas_internas || "");
    setSelectedStatus(contato.status);
    setIsDialogOpen(true);
  };

  const handleSaveChanges = async () => {
    if (!selectedContato) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("contatos")
        .update({
          status: selectedStatus,
          notas_internas: notasInternas,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedContato.id);

      if (error) throw error;

      toast({
        title: "Contato atualizado",
        description: "As alterações foram salvas com sucesso.",
      });

      setIsDialogOpen(false);
      fetchContatos();
    } catch (error) {
      console.error("Error updating contato:", error);
      toast({
        title: "Erro ao salvar",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const newContactsCount = contatos.filter((c) => c.status === "novo").length;

  return (
    <GestaoLayout
      title="Contatos"
      subtitle={`${newContactsCount} ${newContactsCount === 1 ? "novo lead" : "novos leads"}`}
      headerActions={
        <Button variant="outline" size="sm" onClick={fetchContatos} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      }
    >
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {statusOptions.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="hidden md:table-cell">Empresa</TableHead>
              <TableHead className="hidden md:table-cell">Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filteredContatos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum contato encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredContatos.map((contato) => (
                <TableRow
                  key={contato.id}
                  className={contato.status === "novo" ? "bg-blue-50/50" : ""}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {contato.status === "novo" && (
                        <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                      )}
                      {contato.nome_completo}
                    </div>
                  </TableCell>
                  <TableCell>{contato.email}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {contato.empresa || "-"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {format(new Date(contato.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell>{getStatusBadge(contato.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDetails(contato)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Detalhes do Contato
            </DialogTitle>
          </DialogHeader>

          {selectedContato && (
            <div className="space-y-6">
              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" /> Nome
                  </label>
                  <p className="font-medium">{selectedContato.nome_completo}</p>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Email
                  </label>
                  <a
                    href={`mailto:${selectedContato.email}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {selectedContato.email}
                  </a>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Phone className="h-4 w-4" /> Telefone
                  </label>
                  {selectedContato.telefone ? (
                    <a
                      href={`tel:${selectedContato.telefone}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {selectedContato.telefone}
                    </a>
                  ) : (
                    <p className="text-muted-foreground">Não informado</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> Empresa
                  </label>
                  <p className={selectedContato.empresa ? "font-medium" : "text-muted-foreground"}>
                    {selectedContato.empresa || "Não informado"}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Data do Contato
                  </label>
                  <p className="font-medium">
                    {format(new Date(selectedContato.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>

              {/* Serviço de Interesse */}
              {selectedContato.servico_interesse && (
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Serviço de Interesse
                  </label>
                  <p className="font-medium">
                    {servicoLabels[selectedContato.servico_interesse] || selectedContato.servico_interesse}
                  </p>
                </div>
              )}

              {/* Porte da Empresa */}
              {selectedContato.porte_empresa && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    Porte da Empresa
                  </label>
                  <p className="font-medium">
                    {porteLabels[selectedContato.porte_empresa] || selectedContato.porte_empresa}
                  </p>
                </div>
              )}

              {/* Como nos conheceu */}
              {selectedContato.como_conheceu && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    Como nos conheceu
                  </label>
                  <p className="font-medium">
                    {comoConheceuLabels[selectedContato.como_conheceu] || selectedContato.como_conheceu}
                  </p>
                </div>
              )}

              {/* Message */}
              {selectedContato.mensagem && (
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" /> Observações
                  </label>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="whitespace-pre-wrap">{selectedContato.mensagem}</p>
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Internal Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Notas Internas
                </label>
                <Textarea
                  placeholder="Adicione observações sobre este contato..."
                  value={notasInternas}
                  onChange={(e) => setNotasInternas(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveChanges} disabled={isSaving}>
                  {isSaving ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </GestaoLayout>
  );
};

export default GestaoContatos;
