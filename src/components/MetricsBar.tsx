import { motion } from "framer-motion";

const metrics = [
  { value: "20+", label: "Anos de Experiência" },
  { value: "R$ 1 Bi", label: "Recuperados em Créditos" },
  { value: "+500", label: "Clientes Atendidos" },
  { value: "+110", label: "Profissionais" },
];

export const MetricsBar = () => {
  return (
    <section className="relative -mt-16 z-20 pb-16">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 md:p-8"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {metrics.map((metric, index) => (
              <div key={index} className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-gray-900">
                  {metric.value}
                </p>
                <p className="text-sm text-gray-600">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
