import { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export const Services = () => {
  const services: { title: ReactNode; description: string }[] = [
    {
      title: "Consultoria Tributária",
      description: "Apoio técnico e estratégico para otimização fiscal, mitigação de riscos e cumprimento eficiente das obrigações tributárias. Atuação preventiva, corretiva e estratégica em tributos diretos, indiretos e aduaneiros.",
    },
    {
      title: "Reestruturação Societária",
      description: "Assessoria na reorganização societária para otimização fiscal, governança corporativa e proteção patrimonial.",
    },
    {
      title: "Consultoria Contábil e Controladoria",
      description: "Apoio estratégico na gestão contábil, financeira e de controladoria, promovendo governança e transparência.",
    },
    {
      title: "Consultoria para Pessoa Física",
      description: "Gestão tributária, sucessória e patrimonial para pessoas físicas e grupos familiares.",
    },
    {
      title: "Consultoria Previdenciária",
      description: "Atuação especializada em revisão, planejamento e regularização previdenciária patronal, mitigando riscos e recuperando créditos.",
    },
    {
      title: <>Business Intelligence (BI)<br />Fiscal e Financeiro</>,
      description: "Desenvolvimento de soluções personalizadas de BI com foco tributário, contábil e financeiro.",
    },
  ];

  return (
    <section id="servicos" className="py-20 md:py-32 bg-[#f5f5f5]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-4">
            Nossas Soluções
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground">
            Serviços de Consultoria Especializada
          </h2>
          <p className="text-lg text-muted-foreground">
            Oferecemos soluções completas e integradas para transformar desafios em oportunidades de crescimento.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {services.map((service, index) => (
            <Card 
              key={index} 
              className="p-6 md:p-8 border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group bg-card"
            >
              <h3 className="text-xl font-semibold mb-3 text-foreground group-hover:text-primary transition-colors">
                {service.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {service.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
