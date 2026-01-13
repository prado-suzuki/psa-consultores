import { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Phone, ArrowRight, Building2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

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
  mensagem: z.string()
    .trim()
    .min(10, "Mensagem deve ter pelo menos 10 caracteres")
    .max(1000, "Mensagem muito longa"),
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
    mensagem: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormData, string>>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name as keyof ContactFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate form data
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
        mensagem: result.data.mensagem,
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
          <p className="mt-2 text-sm text-muted-foreground">
            Ou envie um email diretamente para{" "}
            <a 
              href="mailto:contato@psa.com.br" 
              className="text-primary hover:underline font-medium"
            >
              contato@psa.com.br
            </a>
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

            {/* Mensagem */}
            <div className="space-y-2">
              <Label htmlFor="mensagem" className="text-foreground font-medium">
                Mensagem *
              </Label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Textarea
                  id="mensagem"
                  name="mensagem"
                  placeholder="Como podemos ajudar sua empresa?"
                  value={formData.mensagem}
                  onChange={handleChange}
                  rows={4}
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
