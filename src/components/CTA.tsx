import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowRight, Mail, Phone, MapPin } from "lucide-react";

export const CTA = () => {
  return (
    <section id="contato" className="pt-32 pb-20 md:pt-36 md:pb-32 bg-[#f5f5f5]">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground leading-tight">
              Pronto para Transformar Seu Negócio?
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Agende uma reunião estratégica gratuita com nossos especialistas e descubra como podemos acelerar seus resultados.
            </p>

            <div className="flex items-center gap-4 pt-4">
              <Mail className="h-6 w-6 text-primary flex-shrink-0" />
              <div>
                <div className="text-sm text-muted-foreground">E-mail</div>
                <div className="font-semibold text-foreground">contato@psaconsultores.com.br</div>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <MapPin className="h-6 w-6 text-primary flex-shrink-0" />
              <div>
                <div className="text-sm text-muted-foreground">Sede</div>
                <div className="font-semibold text-foreground">Cuiabá/MT</div>
                <div className="text-sm text-muted-foreground">Rua Des. José Barros do Vale, 03 – Bairro Duque de Caxias, CEP 78043-292</div>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <Phone className="h-6 w-6 text-primary flex-shrink-0" />
              <div>
                <div className="text-sm text-muted-foreground">Telefone</div>
                <div className="font-semibold text-foreground">+55 (65) 3622-2426</div>
              </div>
            </div>
          </div>

          <Card className="h-auto p-8 md:p-10 border-2 shadow-xl">
            <form className="space-y-6 pb-8">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-2">Solicite uma Proposta</h3>
                <p className="text-muted-foreground">Preencha o formulário e entraremos em contato em até 24h.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Nome Completo</label>
                  <Input placeholder="Seu nome" className="h-12" />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">E-mail Corporativo</label>
                  <Input type="email" placeholder="seu@email.com" className="h-12" />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Telefone</label>
                  <Input placeholder="(11) 99999-9999" className="h-12" />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Empresa</label>
                  <Input placeholder="Nome da empresa" className="h-12" />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Assunto</label>
                  <Input placeholder="Assunto do contato" className="h-12" />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Como podemos ajudar?</label>
                  <textarea 
                    rows={4}
                    placeholder="Conte-nos sobre seus desafios..."
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <Button size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground group">
                Enviar Solicitação
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Ao enviar, você concorda com nossa política de privacidade.
              </p>
            </form>
          </Card>
        </div>
      </div>
      
    </section>
  );
};
