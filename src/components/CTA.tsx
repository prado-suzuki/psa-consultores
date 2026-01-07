import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowRight, Mail, Phone, MapPin } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(100, "Nome deve ter no máximo 100 caracteres"),
  email: z.string().trim().min(1, "E-mail é obrigatório").email("E-mail inválido").max(255, "E-mail deve ter no máximo 255 caracteres"),
  phone: z.string().trim().min(1, "Telefone é obrigatório").max(20, "Telefone inválido"),
  company: z.string().trim().min(1, "Empresa é obrigatória").max(100, "Nome da empresa deve ter no máximo 100 caracteres"),
  subject: z.string().trim().min(1, "Assunto é obrigatório").max(150, "Assunto deve ter no máximo 150 caracteres"),
  message: z.string().trim().min(1, "Mensagem é obrigatória").max(1000, "Mensagem deve ter no máximo 1000 caracteres"),
});

type ContactFormData = z.infer<typeof contactSchema>;

export const CTA = () => {
  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      subject: "",
      message: "",
    },
  });

  const onSubmit = (data: ContactFormData) => {
    console.log("Form submitted:", data);
    toast({
      title: "Solicitação enviada!",
      description: "Entraremos em contato em até 24h.",
    });
    form.reset();
  };

  return (
    <section 
      id="contato" 
      className="pt-32 pb-20 md:pt-36 md:pb-32 bg-gray-900"
    >
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-50 leading-tight">
              Transformamos Complexidade em <span className="text-primary">Vantagem Competitiva</span>
            </h2>
            <p className="text-lg text-gray-300 leading-relaxed">
              Agende uma reunião gratuita com nossos especialistas e descubra como podemos otimizar sua carga tributária e proteger seu patrimônio.
            </p>

            <div className="flex items-center gap-4 pt-4">
              <Mail className="h-6 w-6 text-primary flex-shrink-0" />
              <div>
                <div className="text-sm text-gray-400">E-mail</div>
                <div className="font-semibold text-gray-50">contato@psaconsultores.com.br</div>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <MapPin className="h-6 w-6 text-primary flex-shrink-0" />
              <div>
                <div className="text-sm text-gray-400">Sede</div>
                <div className="font-semibold text-gray-50">Cuiabá/MT</div>
                <div className="text-sm text-gray-400">Rua Des. José Barros do Vale, 03 – Bairro Duque de Caxias, CEP 78043-292</div>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <Phone className="h-6 w-6 text-primary flex-shrink-0" />
              <div>
                <div className="text-sm text-gray-400">Telefone</div>
                <div className="font-semibold text-gray-50">+55 (65) 3622-2426</div>
              </div>
            </div>
          </div>

          <Card className="h-auto p-8 md:p-10 border-0 shadow-xl bg-white">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-8">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Solicite uma Proposta</h3>
                  <p className="text-gray-600">Preencha o formulário e entraremos em contato em até 24h.</p>
                </div>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo *</FormLabel>
                        <FormControl>
                          <Input placeholder="Seu nome" className="h-12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail Corporativo *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="seu@email.com" className="h-12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone *</FormLabel>
                        <FormControl>
                          <Input placeholder="(11) 99999-9999" className="h-12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Empresa *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome da empresa" className="h-12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assunto *</FormLabel>
                        <FormControl>
                          <Input placeholder="Assunto do contato" className="h-12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Como podemos ajudar? *</FormLabel>
                        <FormControl>
                          <textarea 
                            rows={4}
                            placeholder="Conte-nos sobre seus desafios..."
                            className="w-full px-4 py-3 rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground group">
                  Enviar Solicitação
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Ao enviar, você concorda com nossa política de privacidade.
                </p>
              </form>
            </Form>
          </Card>
        </div>
      </div>
      
    </section>
  );
};
