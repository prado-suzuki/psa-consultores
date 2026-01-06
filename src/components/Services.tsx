import { ReactNode } from "react";
import { ServiceCarouselCard } from "@/components/ui/service-carousel-card";

// Import service images
import imgConsultoriaTributaria from "@/assets/services/consultoria-tributaria.jpg";
import imgReestruturacaoSocietaria from "@/assets/services/reestruturacao-societaria.jpg";
import imgConsultoriaContabil from "@/assets/services/consultoria-contabil.jpg";
import imgConsultoriaPessoaFisica from "@/assets/services/consultoria-pessoa-fisica.jpg";
import imgConsultoriaPrevidenciaria from "@/assets/services/consultoria-previdenciaria.jpg";
import imgBusinessIntelligence from "@/assets/services/business-intelligence.jpg";

interface ServiceData {
  id: number;
  title: ReactNode;
  description: string;
  imgUrl: string;
}

export const Services = () => {
const services: ServiceData[] = [
    {
      id: 1,
      title: "Consultoria Tributária",
      description: "Apoio técnico e estratégico para otimização fiscal, mitigação de riscos e cumprimento eficiente das obrigações tributárias. Atuação preventiva, corretiva e estratégica em tributos diretos, indiretos e aduaneiros.",
      imgUrl: imgConsultoriaTributaria,
    },
    {
      id: 2,
      title: "Recuperação e Ressarcimento Tributário",
      description: "Identificação e recuperação administrativa de créditos tributários, com análise detalhada de PIS, COFINS, ICMS, IPI, subvenções e incentivos fiscais para empresas do agronegócio.",
      imgUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=600&fit=crop",
    },
    {
      id: 3,
      title: "Reestruturação Societária",
      description: "Assessoria na reorganização societária para otimização fiscal, governança corporativa e proteção patrimonial.",
      imgUrl: imgReestruturacaoSocietaria,
    },
    {
      id: 4,
      title: "Implantação de Benefícios Fiscais",
      description: "Assessoria completa na identificação, análise de viabilidade e implantação de incentivos fiscais estaduais e federais aplicáveis ao setor do agronegócio.",
      imgUrl: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=600&fit=crop",
    },
    {
      id: 5,
      title: "Consultoria Previdenciária",
      description: "Atuação especializada em revisão, planejamento e regularização previdenciária patronal, mitigando riscos e recuperando créditos.",
      imgUrl: imgConsultoriaPrevidenciaria,
    },
    {
      id: 6,
      title: "Consultoria Contábil e Controladoria",
      description: "Apoio estratégico na gestão contábil, financeira e de controladoria, promovendo governança e transparência.",
      imgUrl: imgConsultoriaContabil,
    },
    {
      id: 7,
      title: "Consultoria para Pessoa Física",
      description: "Gestão tributária, sucessória e patrimonial para pessoas físicas e grupos familiares.",
      imgUrl: imgConsultoriaPessoaFisica,
    },
    {
      id: 8,
      title: "Antecipação de Provas",
      description: "Estratégia jurídica preventiva para levantamento de provas documentais e técnicas antes de litígios, reduzindo riscos processuais e financeiros.",
      imgUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&h=600&fit=crop",
    },
    {
      id: 9,
      title: <>Data Analysis<br />Fiscal e Financeiro</>,
      description: "Desenvolvimento de soluções personalizadas de BI com foco tributário, contábil e financeiro.",
      imgUrl: imgBusinessIntelligence,
    },
  ];

  return (
    <section 
      id="servicos" 
      className="pt-32 pb-20 md:pt-36 md:pb-32 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-100"
    >
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="max-w-4xl text-left mb-10 space-y-4">
          <h2 className="text-3xl md:text-5xl font-bold text-gray-50">
            Proteja Seu <span className="text-primary">Patrimônio</span>.<br />
            Perpetue Seu <span className="text-primary">Legado</span>.
          </h2>
          <p className="text-lg text-gray-300">
            Estratégias tributárias, societárias e de governança especializadas para empresas familiares do agronegócio.
          </p>
        </div>

        <ServiceCarouselCard data={services} />
      </div>
    </section>
  );
};
