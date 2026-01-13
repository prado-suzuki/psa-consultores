import { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Phone, ArrowRight, Building2, MessageSquare, Briefcase, BarChart3, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const servicoOptions = [
  { value: "consultoria_tributaria", label: "Consultoria Tributária" },
  { value: "beneficios_fiscais", label: "Benefícios Fiscais" },
  { value: "recuperacao_tributaria", label: "Recuperação Tributária" },
  { value: "reestruturacao_societaria", label: "Reestruturação Societária" },
  { value: "pessoa_fisica", label: "Pessoa Física" },
  { value: "consultoria_previdenciaria", label: "Consultoria Previdenciária" },
  { value: "consultoria_contabil", label: "Consultoria Contábil" },
  { value: "business_intelligence", label: "Business Intelligence" },
  { value: "juridico_preventivo", label: "Jurídico Preventivo" },
  { value: "outros", label: "Outros" },
];

const porteOptions = [
  { value: "mei", label: "MEI" },
  { value: "micro", label: "Micro Empresa" },
  { value: "pequena", label: "Pequena Empresa" },
  { value: "media", label: "Média Empresa" },
  { value: "grande", label: "Grande Empresa" },
];

const comoConheceuOptions = [
  { value: "indicacao", label: "Indicação" },
  { value: "google", label: "Busca no Google" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "evento", label: "Evento" },
  { value: "outros", label: "Outros" },
];

const contactSchema = z.object({
  nome_completo: z.string()
    .trim()
    .min(2, "Nome é obrigatório")
    .max(100, "Nome muito longo"),
  email: z.string()
    .trim()
    .email("Email inválido")
    .max(255, "Email muito longo"),
  telefone: z.string()
    .trim()
    .max(20, "Telefone muito longo")
    .optional()
    .or(z.literal('')),
  empresa: z.string()
    .trim()
    .max(100, "Nome da empresa muito longo")
    .optional()
    .or(z.literal('')),
  servico_interesse: z.string()
    .min(1, "Selecione um serviço"),
  porte_empresa: z.string()
    .optional()
    .or(z.literal('')),
  como_conheceu: z.string()
    .optional()
    .or(z.literal('')),
  mensagem: z.string()
    .trim()
    .max(500, "Mensagem muito longa")
    .optional()
    .or(z.literal('')),
});

type ContactFormData = z.infer<typeof contactSchema>;

export const ContactSection = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ContactFormData>({
    nome_completo: "",
    email: "",
    telefone: "",
    empresa: "",
    servico_interesse: "",
    porte_empresa: "",
    como_conheceu: "",
    mensagem: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormData, string>>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof ContactFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSelectChange = (name: keyof ContactFormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = contactSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ContactFormData, string>> = {};
      result.error.errors.forEach(err => {
        const field = err.path[0] as keyof ContactFormData;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("contatos").insert({
        nome_completo: result.data.nome_completo,
        email: result.data.email,
        telefone: result.data.telefone || null,
        empresa: result.data.empresa || null,
        servico_interesse: result.data.servico_interesse,
        porte_empresa: result.data.porte_empresa || null,
        como_conheceu: result.data.como_conheceu || null,
        mensagem: result.data.mensagem || null,
      });

      if (error) throw error;

      toast({
        title: "Mensagem enviada!",
        description: "Entraremos em contato em breve.",
      });

      setFormData({
        nome_completo: "",
        email: "",
        telefone: "",
        empresa: "",
        servico_interesse: "",
        porte_empresa: "",
        como_conheceu: "",
        mensagem: "",
      });
    } catch (error) {
      console.error("Error submitting contact form:", error);
      toast({
        title: "Erro ao enviar",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contato" className="relative py-20 md:py-28 bg-gray-50 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/4 w-full h-full bg-gradient-to-bl from-primary/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/4 w-full h-full bg-gradient-to-tr from-secondary/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Entre em Contato
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Vamos Conversar
          </h2>
          <p className="text-muted-foreground">
            Preencha o formulário abaixo e nossa equipe entrará em contato para entender como podemos ajudar sua empresa.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-xl mx-auto"
        >
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 md:p-8 space-y-5">
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="nome_completo" className="text-foreground font-medium">
                Nome Completo *
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="nome_completo"
                  name="nome_completo"
                  type="text"
                  placeholder="Seu nome"
                  value={formData.nome_completo}
                  onChange={handleChange}
                  className={`pl-10 ${errors.nome_completo ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.nome_completo && (
                <p className="text-sm text-destructive">{errors.nome_completo}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-medium">
                Email *
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            {/* Telefone e Empresa em grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Telefone */}
              <div className="space-y-2">
                <Label htmlFor="telefone" className="text-foreground font-medium">
                  Telefone
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="telefone"
                    name="telefone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={formData.telefone}
                    onChange={handleChange}
                    className={`pl-10 ${errors.telefone ? 'border-destructive' : ''}`}
                  />
                </div>
                {errors.telefone && (
                  <p className="text-sm text-destructive">{errors.telefone}</p>
                )}
              </div>

              {/* Empresa */}
              <div className="space-y-2">
                <Label htmlFor="empresa" className="text-foreground font-medium">
                  Empresa
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="empresa"
                    name="empresa"
                    type="text"
                    placeholder="Nome da empresa"
                    value={formData.empresa}
                    onChange={handleChange}
                    className={`pl-10 ${errors.empresa ? 'border-destructive' : ''}`}
                  />
                </div>
                {errors.empresa && (
                  <p className="text-sm text-destructive">{errors.empresa}</p>
                )}
              </div>
            </div>

            {/* Serviço de Interesse */}
            <div className="space-y-2">
              <Label className="text-foreground font-medium">
                Serviço de Interesse *
              </Label>
              <Select
                value={formData.servico_interesse}
                onValueChange={(value) => handleSelectChange("servico_interesse", value)}
              >
                <SelectTrigger className={`w-full ${errors.servico_interesse ? 'border-destructive' : ''}`}>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Selecione o serviço" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {servicoOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.servico_interesse && (
                <p className="text-sm text-destructive">{errors.servico_interesse}</p>
              )}
            </div>

            {/* Porte da Empresa e Como nos conheceu em grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Porte da Empresa */}
              <div className="space-y-2">
                <Label className="text-foreground font-medium">
                  Porte da Empresa
                </Label>
                <Select
                  value={formData.porte_empresa}
                  onValueChange={(value) => handleSelectChange("porte_empresa", value)}
                >
                  <SelectTrigger className="w-full">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Selecione" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {porteOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Como nos conheceu */}
              <div className="space-y-2">
                <Label className="text-foreground font-medium">
                  Como nos conheceu?
                </Label>
                <Select
                  value={formData.como_conheceu}
                  onValueChange={(value) => handleSelectChange("como_conheceu", value)}
                >
                  <SelectTrigger className="w-full">
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Selecione" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {comoConheceuOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Mensagem */}
            <div className="space-y-2">
              <Label htmlFor="mensagem" className="text-foreground font-medium">
                Observações <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Textarea
                  id="mensagem"
                  name="mensagem"
                  placeholder="Alguma informação adicional?"
                  value={formData.mensagem}
                  onChange={handleChange}
                  rows={2}
                  className={`pl-10 resize-none ${errors.mensagem ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.mensagem && (
                <p className="text-sm text-destructive">{errors.mensagem}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 group"
            >
              {isSubmitting ? (
                "Enviando..."
              ) : (
                <>
                  Enviar Mensagem
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Ao enviar, você concorda com nossa política de privacidade.
            </p>
          </form>
        </motion.div>
      </div>
    </section>
  );
};