import { motion } from "framer-motion";
import { Calendar, TrendingUp, Users, Briefcase } from "lucide-react";

const metrics = [
  {
    icon: Calendar,
    value: "20+",
    label: "Anos de Experiência",
  },
  {
    icon: TrendingUp,
    value: "R$ 1 Bi",
    label: "Recuperados em Créditos",
  },
  {
    icon: Users,
    value: "+500",
    label: "Clientes Atendidos",
  },
  {
    icon: Briefcase,
    value: "+110",
    label: "Profissionais",
  },
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
          className="bg-background rounded-lg shadow-lg border border-border p-6 md:p-8"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {metrics.map((metric, index) => (
              <div key={index} className="flex items-center gap-4">
                <metric.icon className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-2xl md:text-3xl font-bold text-foreground">
                    {metric.value}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {metric.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
