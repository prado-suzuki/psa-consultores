import { motion } from "framer-motion";

const offices = [
  {
    city: "Cuiabá",
    state: "MT",
    type: "Matriz",
    address: "Rua Des. José Barros do Vale, 03",
  },
  {
    city: "Barreiras",
    state: "BA",
    type: "Filial",
    address: "Centro Empresarial",
  },
  {
    city: "Curitiba",
    state: "PR",
    type: "Filial",
    address: "Centro Empresarial",
  },
];

export const LocationsSection = () => {
  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Onde Estamos
          </h2>
          <p className="text-muted-foreground">
            Presença estratégica nas principais regiões do agronegócio brasileiro.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-6">
          {offices.map((office, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="p-6 bg-background rounded-lg border border-border"
            >
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-semibold text-foreground">
                  {office.city}
                </h3>
                {office.type === "Matriz" && (
                  <span className="text-xs font-medium px-2 py-0.5 bg-primary/10 text-primary rounded">
                    {office.type}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{office.state}</p>
              <p className="text-sm text-muted-foreground mt-2">{office.address}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
