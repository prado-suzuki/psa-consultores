import { motion } from "framer-motion";
import {
  Scale,
  Building2,
  ShieldCheck,
  BarChart3,
  Gavel,
} from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { PilarCard } from "@/components/services/PilarCard";

import consultoriaTributaria from "@/assets/services/consultoria-tributaria.jpg";
import reestruturacaoSocietaria from "@/assets/services/reestruturacao-societaria.jpg";
import consultoriaPrevidenciaria from "@/assets/services/consultoria-previdenciaria.jpg";
import businessIntelligence from "@/assets/services/business-intelligence.jpg";
import consultoriaContabil from "@/assets/services/consultoria-contabil.jpg";

const pilares = [
  {
    id: "tributario",
    titulo: "Tributário e Fiscal",
    descricao: "Estratégias para otimização fiscal e conformidade tributária",
    imagem: consultoriaTributaria,
    icone: Scale,
    servicos: [
      {
        nome: "Consultoria Tributária",
        descricao:
          "Apoio técnico e estratégico para otimização fiscal, mitigação de riscos e cumprimento eficiente das obrigações tributárias em tributos diretos, indiretos e aduaneiros.",
      },
      {
        nome: "Benefícios Fiscais",
        descricao:
          "Consultoria para identificação, viabilização e implementação de incentivos fiscais regionais, setoriais e específicos.",
      },
      {
        nome: "Recuperação Tributária",
        descricao:
          "Atuação administrativa para recuperação de créditos tributários e ressarcimentos. Diagnóstico, levantamento e pedido de ressarcimento.",
      },
    ],
  },
  {
    id: "societario",
    titulo: "Societário e Patrimonial",
    descricao: "Proteção patrimonial e estruturação empresarial",
    imagem: reestruturacaoSocietaria,
    icone: Building2,
    servicos: [
      {
        nome: "Reestruturação Societária",
        descricao:
          "Assessoria na reorganização societária para otimização fiscal, governança corporativa e proteção patrimonial. Estruturação de Holdings.",
      },
      {
        nome: "Pessoa Física",
        descricao:
          "Gestão tributária, sucessória e patrimonial para pessoas físicas e grupos familiares. Planejamento sucessório e proteção patrimonial.",
      },
    ],
  },
  {
    id: "previdenciario",
    titulo: "Previdenciário",
    descricao: "Gestão e planejamento previdenciário patronal",
    imagem: consultoriaPrevidenciaria,
    icone: ShieldCheck,
    servicos: [
      {
        nome: "Consultoria Previdenciária",
        descricao:
          "Atuação especializada em revisão, planejamento e regularização previdenciária patronal, mitigando riscos e recuperando créditos.",
      },
    ],
  },
  {
    id: "contabil",
    titulo: "Contábil e Inteligência",
    descricao: "Gestão contábil e soluções de dados para decisões estratégicas",
    imagem: businessIntelligence,
    icone: BarChart3,
    servicos: [
      {
        nome: "Consultoria Contábil",
        descricao:
          "Apoio estratégico na gestão contábil, financeira e de controladoria, promovendo governança e transparência.",
      },
      {
        nome: "Business Intelligence",
        descricao:
          "Desenvolvimento de soluções personalizadas de BI com foco tributário, contábil e financeiro. Dashboards e relatórios automatizados.",
      },
    ],
  },
  {
    id: "juridico",
    titulo: "Antecipação de Provas",
    descricao: "Estratégias preventivas para redução de riscos processuais",
    imagem: consultoriaContabil,
    icone: Gavel,
    servicos: [
      {
        nome: "Antecipação de Provas",
        descricao:
          "Estratégia jurídica preventiva para levantamento de provas antes de litígios, reduzindo riscos processuais e financeiros.",
      },
    ],
  },
];

export const Services = () => {
  return (
    <section id="servicos" className="py-24 md:py-32 bg-gray-50">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-left max-w-3xl mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Nossos Serviços
          </h2>
          <p className="text-gray-600 text-lg">
            Estratégias especializadas em tributação, governança e gestão
            patrimonial para empresas do agronegócio, organizadas por pilares de
            atuação.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="px-12"
        >
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {pilares.map((pilar) => (
                <CarouselItem
                  key={pilar.id}
                  className="pl-4 basis-full md:basis-1/2 lg:basis-1/3"
                >
                  <PilarCard
                    titulo={pilar.titulo}
                    descricao={pilar.descricao}
                    imagem={pilar.imagem}
                    servicos={pilar.servicos}
                    icone={pilar.icone}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground" />
            <CarouselNext className="border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground" />
          </Carousel>
        </motion.div>
      </div>
    </section>
  );
};
