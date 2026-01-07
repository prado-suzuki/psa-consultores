import { motion } from "framer-motion";
import { 
  FileText, 
  RefreshCw, 
  Building2, 
  Gift, 
  Shield, 
  Calculator, 
  User, 
  Scale, 
  BarChart3 
} from "lucide-react";

const services = [
  {
    icon: FileText,
    title: "Consultoria Tributária",
    description: "Otimização fiscal e mitigação de riscos em tributos diretos, indiretos e aduaneiros.",
  },
  {
    icon: RefreshCw,
    title: "Recuperação Tributária",
    description: "Identificação e recuperação de créditos de PIS, COFINS, ICMS, IPI e subvenções.",
  },
  {
    icon: Building2,
    title: "Reestruturação Societária",
    description: "Reorganização para otimização fiscal, governança e proteção patrimonial.",
  },
  {
    icon: Gift,
    title: "Benefícios Fiscais",
    description: "Identificação e implantação de incentivos fiscais regionais e setoriais.",
  },
  {
    icon: Shield,
    title: "Consultoria Previdenciária",
    description: "Revisão, planejamento e regularização previdenciária patronal.",
  },
  {
    icon: Calculator,
    title: "Consultoria Contábil",
    description: "Gestão contábil e de controladoria com foco em governança e transparência.",
  },
  {
    icon: User,
    title: "Pessoa Física",
    description: "Gestão tributária, sucessória e patrimonial para grupos familiares.",
  },
  {
    icon: Scale,
    title: "Antecipação de Provas",
    description: "Estratégia jurídica preventiva para redução de riscos processuais.",
  },
  {
    icon: BarChart3,
    title: "Data Analysis",
    description: "Soluções de BI com foco tributário, contábil e financeiro.",
  },
];

export const Services = () => {
  return (
    <section id="servicos" className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Nossos Serviços
          </h2>
          <p className="text-muted-foreground">
            Estratégias tributárias, societárias e de governança especializadas para empresas do agronegócio.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="group p-6 bg-background rounded-lg border border-border hover:border-primary/30 transition-colors duration-200"
            >
              <service.icon className="h-5 w-5 text-primary mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {service.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {service.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
