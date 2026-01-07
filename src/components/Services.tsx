import { motion } from "framer-motion";

const services = [
  {
    title: "Consultoria Tributária",
    description: "Apoio técnico e estratégico para otimização fiscal, mitigação de riscos e cumprimento eficiente das obrigações tributárias em tributos diretos, indiretos e aduaneiros.",
  },
  {
    title: "Consultoria Previdenciária",
    description: "Atuação especializada em revisão, planejamento e regularização previdenciária patronal, mitigando riscos e recuperando créditos.",
  },
  {
    title: "Reestruturação Societária",
    description: "Assessoria na reorganização societária para otimização fiscal, governança corporativa e proteção patrimonial. Estruturação de Holdings.",
  },
  {
    title: "Benefícios Fiscais",
    description: "Consultoria para identificação, viabilização e implementação de incentivos fiscais regionais, setoriais e específicos.",
  },
  {
    title: "Consultoria Contábil",
    description: "Apoio estratégico na gestão contábil, financeira e de controladoria, promovendo governança e transparência.",
  },
  {
    title: "Pessoa Física",
    description: "Gestão tributária, sucessória e patrimonial para pessoas físicas e grupos familiares. Planejamento sucessório e proteção patrimonial.",
  },
  {
    title: "Recuperação Tributária",
    description: "Atuação administrativa para recuperação de créditos tributários e ressarcimentos. Diagnóstico, levantamento e pedido de ressarcimento.",
  },
  {
    title: "Antecipação de Provas",
    description: "Estratégia jurídica preventiva para levantamento de provas antes de litígios, reduzindo riscos processuais e financeiros.",
  },
  {
    title: "Business Intelligence",
    description: "Desenvolvimento de soluções personalizadas de BI com foco tributário, contábil e financeiro. Dashboards e relatórios automatizados.",
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
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Nossos Serviços
          </h2>
          <p className="text-gray-600 text-lg">
            Estratégias especializadas em tributação, governança e gestão patrimonial para empresas do agronegócio.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="group p-6 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300"
            >
              <span className="text-2xl font-bold text-primary mb-4 block">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {service.title}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {service.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
