import { motion } from "framer-motion";

const milestones = [
  { year: "1990", title: "Fundação" },
  { year: "2004", title: "Expansão Bahia" },
  { year: "2012", title: "Prado Consultores" },
  { year: "2022", title: "Rede PSA" },
  { year: "2024", title: "Governança Corporativa" },
];

export const TimelineSection = () => {
  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Nossa História
          </h2>
          <p className="text-muted-foreground">
            Uma trajetória de crescimento e inovação no setor tributário.
          </p>
        </motion.div>

        <div className="flex flex-wrap justify-between gap-8">
          {milestones.map((milestone, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="text-center"
            >
              <p className="text-3xl md:text-4xl font-bold text-primary">
                {milestone.year}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {milestone.title}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
