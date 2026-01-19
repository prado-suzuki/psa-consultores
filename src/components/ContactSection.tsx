import { useState } from "react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
import logoPsa from "@/assets/logo-psa.png";

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
        mensagem: null,
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
    <section id="contato" className="py-20 md:py-28 bg-gray-50 overflow-hidden relative">
      {/* Background Logo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <img 
          src={logoPsa} 
          alt="" 
          className="w-[600px] md:w-[800px] opacity-5"
        />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Coluna Esquerda - Texto Explicativo */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col justify-center"
          >
            <h3 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-6">
              Fale com nossa equipe
            </h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Preencha o formulário ao lado e nossa equipe de especialistas 
              entrará em contato para entender suas necessidades e apresentar 
              as melhores soluções para o seu negócio.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              Atendemos empresas de todos os portes, com foco especial no 
              agronegócio e empresas familiares.
            </p>
            <p className="text-sm text-lime-600 font-medium">
              Retorno em até 24 horas.
            </p>
          </motion.div>

          {/* Coluna Direita - Formulário */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >

            <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 md:p-8 space-y-5 border border-border/50">
              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="nome_completo" className="text-foreground font-medium">
                  Nome Completo *
                </Label>
                <Input
                  id="nome_completo"
                  name="nome_completo"
                  type="text"
                  placeholder="Seu nome"
                  value={formData.nome_completo}
                  onChange={handleChange}
                  className={`bg-background ${errors.nome_completo ? 'border-destructive' : ''}`}
                />
                {errors.nome_completo && (
                  <p className="text-sm text-destructive">{errors.nome_completo}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-medium">
                  Email *
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  className={`bg-background ${errors.email ? 'border-destructive' : ''}`}
                />
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
                  <Input
                    id="telefone"
                    name="telefone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={formData.telefone}
                    onChange={handleChange}
                    className={`bg-background ${errors.telefone ? 'border-destructive' : ''}`}
                  />
                  {errors.telefone && (
                    <p className="text-sm text-destructive">{errors.telefone}</p>
                  )}
                </div>

                {/* Empresa */}
                <div className="space-y-2">
                  <Label htmlFor="empresa" className="text-foreground font-medium">
                    Empresa
                  </Label>
                  <Input
                    id="empresa"
                    name="empresa"
                    type="text"
                    placeholder="Nome da empresa"
                    value={formData.empresa}
                    onChange={handleChange}
                    className={`bg-background ${errors.empresa ? 'border-destructive' : ''}`}
                  />
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
                  <SelectTrigger className={`w-full bg-background ${errors.servico_interesse ? 'border-destructive' : ''}`}>
                    <SelectValue placeholder="Selecione o serviço" />
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
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder="Selecione" />
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
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder="Selecione" />
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

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-lime-500 hover:bg-lime-600 text-white font-semibold py-3"
              >
                {isSubmitting ? "Enviando..." : "Enviar Mensagem"}
              </Button>

            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
